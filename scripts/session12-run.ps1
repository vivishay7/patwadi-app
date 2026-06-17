$DumpPath = "E:\PatwadiApp\patwadi\patwadi-app\patwadi\ui_dump.xml"

function Tap([int]$x, [int]$y) { adb shell input tap $x $y | Out-Null; Write-Host "tap $x,$y" }
function Wait([int]$s, [string]$m = "") { if ($m) { Write-Host ">> $m ($s s)" }; Start-Sleep -Seconds $s }
function DumpUi { adb shell uiautomator dump /sdcard/ui.xml 2>$null | Out-Null; adb pull /sdcard/ui.xml $DumpPath 2>$null | Out-Null; return [xml](Get-Content $DumpPath) }
function Center($bounds) {
  if ($bounds -match '\[(\d+),(\d+)\]\[(\d+),(\d+)\]') {
    $x = ([int]$matches[1] + [int]$matches[3]) / 2
    $y = ([int]$matches[2] + [int]$matches[4]) / 2
    return @([int]$x, [int]$y)
  }
}
function TapText([string]$pat, [xml]$x, [switch]$Exact) {
  foreach ($n in $x.SelectNodes('//node')) {
    if (-not $n.text) { continue }
    $ok = if ($Exact) { $n.text -eq $pat } else { $n.text -like "*$pat*" }
    if (-not $ok) { continue }
    $t = $n
    if ($n.clickable -ne "true") {
      $p = $n.ParentNode
      while ($p -and $p.clickable -ne "true") { $p = $p.ParentNode }
      if ($p) { $t = $p }
    }
    $c = Center $t.bounds
    if ($c) { Write-Host "Tap '$($n.text)'"; Tap $c[0] $c[1]; return $true }
  }
  Write-Host "MISS '$pat'"
  return $false
}
function TapEdit([int]$i, [xml]$x) {
  $eds = $x.SelectNodes('//node[@class="android.widget.EditText"]')
  if ($eds.Count -le $i) { return $false }
  $c = Center $eds[$i].bounds
  if ($c) { Tap $c[0] $c[1]; return $true }
}
function TypeText([string]$t) { adb shell input text ($t -replace ' ', '%s') | Out-Null }
function HideKb { adb shell input keyevent 4 | Out-Null; Start-Sleep -Milliseconds 400 }
function Scroll { adb shell input swipe 360 1100 360 450 350 | Out-Null }
function Texts([xml]$x) { $x.SelectNodes('//node[@text!=""]') | ForEach-Object { $_.text } | Select-Object -First 20 }

# Ensure app + metro
adb reverse tcp:8081 tcp:8081 | Out-Null
adb shell am force-stop com.anonymous.patwadi
adb shell am start -n com.anonymous.patwadi/.MainActivity | Out-Null
Wait 4
$x = DumpUi
if (TapText "8081" $x) { Wait 28 "bundle" } else { Tap 360 563; Wait 28 "bundle" }

# LOGIN
$x = DumpUi
Texts $x
TapText "Log in" $x | Out-Null
Wait 2
1..3 | ForEach-Object { $x = DumpUi; TapText "Sign in" $x -Exact | Out-Null; Wait 0.4 }
Wait 1
$x = DumpUi
TapText "Sign in" $x -Exact | Out-Null
Wait 7 "auth"

# HOME -> Send Parcel
$x = DumpUi
Texts $x
if (-not (TapText "Send Parcel" $x)) { TapText "Send a Parcel" $x | Out-Null }
Wait 2

# PACKAGE INFO
$x = DumpUi
TapText "Document" $x | Out-Null
Wait 1
TapEdit 0 $x | Out-Null; TypeText "Testbooks"; HideKb
$x = DumpUi; TapEdit 1 $x | Out-Null; TypeText "500"; HideKb
foreach ($i in 0..3) {
  $x = DumpUi; TapEdit (2+$i) $x | Out-Null; TypeText (@("30","20","10","2")[$i]); HideKb
}
Scroll; Wait 1
$x = DumpUi; TapText "I confirm" $x | Out-Null
Scroll; Wait 1
$x = DumpUi; TapText "Next" $x | Out-Null
Wait 3

# PICKUP
$x = DumpUi; Texts $x
TapEdit 0 $x | Out-Null; TypeText "Delhi"; Wait 5
HideKb
$x = DumpUi
TapText "Delhi" $x | Out-Null
Wait 2
$x = DumpUi
TapEdit 1 $x | Out-Null; TypeText "9876543210"; HideKb
$x = DumpUi; TapEdit 2 $x | Out-Null; TypeText "MainRoad"; HideKb
$x = DumpUi; TapEdit 3 $x | Out-Null; TypeText "Apt1"; HideKb
Scroll
$x = DumpUi; TapText "Next" $x | Out-Null
Wait 3

# DROPOFF
$x = DumpUi; Texts $x
TapEdit 0 $x | Out-Null; TypeText "Chandigarh"; Wait 5
HideKb
$x = DumpUi
TapText "Chandigarh" $x | Out-Null
Wait 2
$x = DumpUi
TapEdit 1 $x | Out-Null; TypeText "9876543210"; HideKb
$x = DumpUi; TapEdit 2 $x | Out-Null; TypeText "Sector17"; HideKb
$x = DumpUi; TapEdit 3 $x | Out-Null; TypeText "Apt2"; HideKb
Scroll
$x = DumpUi; TapText "Next" $x | Out-Null
Wait 4

# PRICE + CONFIRM
$x = DumpUi; Texts $x
TapText "Continue to confirmation" $x | Out-Null
Wait 3
$x = DumpUi; Texts $x
TapText "Confirm & pay" $x | Out-Null
Wait 10 "razorpay"

$x = DumpUi
Write-Host "`n=== AT PAYMENT ==="
Texts $x
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png "E:\PatwadiApp\patwadi\patwadi-app\patwadi\device_screen.png" 2>$null
Write-Host "Done Part A - complete UPI manually"

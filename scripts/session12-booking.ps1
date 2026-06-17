$Dump = "E:\PatwadiApp\patwadi\patwadi-app\patwadi\ui_dump.xml"
function Tap($x,$y){ adb shell input tap $x $y | Out-Null; Write-Host "tap $x,$y" }
function Wait($s,$m=""){ if($m){Write-Host ">> $m"}; Start-Sleep -Seconds $s }
function Dump(){ adb shell uiautomator dump /sdcard/ui.xml 2>$null|Out-Null; adb pull /sdcard/ui.xml $Dump 2>$null|Out-Null; return [xml](Get-Content $Dump) }
function Texts($x){ $x.SelectNodes('//node[@text!=""]')|%{ $_.text }|Select -First 18 }
function TapPat($pat,$x){
  foreach($n in $x.SelectNodes('//node')){
    if(-not $n.text -or $n.text -notlike "*$pat*"){continue}
    $t=$n; if($n.clickable-ne"true"){ $p=$n.ParentNode; while($p -and $p.clickable-ne"true"){$p=$p.ParentNode}; if($p){$t=$p}}
    if($t.bounds -match '\[(\d+),(\d+)\]\[(\d+),(\d+)\]'){
      $cx=([int]$matches[1]+[int]$matches[3])/2; $cy=([int]$matches[2]+[int]$matches[4])/2
      Write-Host "Tap '$($n.text)'"; Tap $cx $cy; return $true
    }
  }
  Write-Host "MISS $pat"; return $false
}
function TapEd($i,$x){
  $e=$x.SelectNodes('//node[@class="android.widget.EditText"]')
  if($e.Count -le $i){return $false}
  if($e[$i].bounds -match '\[(\d+),(\d+)\]\[(\d+),(\d+)\]'){
    Tap (([int]$matches[1]+[int]$matches[3])/2) (([int]$matches[2]+[int]$matches[4])/2); return $true
  }
}
function AdbType($t){ adb shell input text ($t -replace ' ','%s') | Out-Null }
function KbOff(){ adb shell input keyevent 4 | Out-Null; Start-Sleep -Milliseconds 400 }
function Scroll(){ adb shell input swipe 360 1100 360 450 350 | Out-Null }

adb reverse tcp:8081 tcp:8081 | Out-Null
adb shell am start -n com.anonymous.patwadi/.MainActivity | Out-Null
Wait 3
$x=Dump
if (TapPat "8081" $x) { Wait 25 "bundle" } else { Tap 360 563; Wait 25 "bundle" }

$x=Dump
if (TapPat "Log in" $x) { Wait 2 }
Tap 360 462; Wait 0.4; Tap 360 462; Wait 0.4; Tap 360 462; Wait 1
Tap 360 876; Wait 8
$x=Dump
if ((Texts $x) -match "Almost there") {
  TapEd 0 $x | Out-Null; AdbType "Test%sCustomer"; KbOff
  Tap 360 943; Wait 8
}

Tap 360 313; Wait 2
$x=Dump; TapPat "Document" $x|Out-Null; Wait 1
TapEd 0 $x|Out-Null; AdbType "Books"; KbOff
$x=Dump; TapEd 1 $x|Out-Null; AdbType "500"; KbOff
foreach($i in 0..3){ $x=Dump; TapEd (2+$i) $x|Out-Null; AdbType (@("30","20","10","2")[$i]); KbOff }
Scroll; Wait 1
$x=Dump; TapPat "I confirm" $x|Out-Null
Scroll; $x=Dump; TapPat "Next" $x|Out-Null; Wait 3

$x=Dump; TapEd 0 $x|Out-Null; AdbType "Delhi"; Wait 5
KbOff; $x=Dump; TapPat "Delhi" $x|Out-Null; Wait 2
$x=Dump; TapEd 1 $x|Out-Null; AdbType "9876543210"; KbOff
$x=Dump; TapEd 2 $x|Out-Null; AdbType "MainRoad"; KbOff
$x=Dump; TapEd 3 $x|Out-Null; AdbType "Apt1"; KbOff
Scroll; $x=Dump; TapPat "Next" $x|Out-Null; Wait 3

$x=Dump; TapEd 0 $x|Out-Null; AdbType "Chandigarh"; Wait 5
KbOff; $x=Dump; TapPat "Chandigarh" $x|Out-Null; Wait 2
$x=Dump; TapEd 1 $x|Out-Null; AdbType "9876543210"; KbOff
$x=Dump; TapEd 2 $x|Out-Null; AdbType "Sector17"; KbOff
$x=Dump; TapEd 3 $x|Out-Null; AdbType "Apt2"; KbOff
Scroll; $x=Dump; TapPat "Next" $x|Out-Null; Wait 4

$x=Dump; TapPat "Continue to confirmation" $x|Out-Null; Wait 3
$x=Dump; TapPat "Confirm" $x|Out-Null; Wait 10 "razorpay"
$x=Dump; Write-Host "`n=== PAYMENT ==="; Texts $x
adb shell screencap -p /sdcard/screen.png; adb pull /sdcard/screen.png "E:\PatwadiApp\patwadi\patwadi-app\patwadi\device_screen.png" 2>$null

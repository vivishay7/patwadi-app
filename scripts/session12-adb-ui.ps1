$ErrorActionPreference = "Continue"
$DumpPath = Join-Path $PSScriptRoot "..\ui_dump.xml"

function Invoke-AdbTap([int]$x, [int]$y) {
  adb shell input tap $x $y | Out-Null
  Write-Host "  tap ($x,$y)"
}

function Get-Center([string]$bounds) {
  if ($bounds -match '\[(\d+),(\d+)\]\[(\d+),(\d+)\]') {
  return @(
    [int](([int]$matches[1] + [int]$matches[3]) / 2),
    [int](([int]$matches[2] + [int]$matches[4]) / 2)
  )
  }
  return $null
}

function Update-UiDump {
  adb shell uiautomator dump /sdcard/ui.xml 2>$null | Out-Null
  adb pull /sdcard/ui.xml $DumpPath 2>$null | Out-Null
  [xml]$script:UiXml = Get-Content $DumpPath
}

function Get-UiLines {
  Update-UiDump
  $script:UiXml.SelectNodes('//node[@text!=""]') | ForEach-Object {
    [PSCustomObject]@{ Text = $_.text; Bounds = $_.bounds; Clickable = $_.clickable }
  }
}

function Show-Ui([int]$n = 25) {
  Get-UiLines | Select-Object -First $n | ForEach-Object { Write-Host "$($_.Text) | $($_.Bounds) | c=$($_.Clickable)" }
}

function Tap-Text([string]$pattern, [switch]$Exact, [switch]$Any) {
  Update-UiDump
  $nodes = $script:UiXml.SelectNodes('//node')
  foreach ($node in $nodes) {
    $text = $node.text
    if (-not $text) { continue }
    $match = if ($Exact) { $text -eq $pattern } else { $text -like "*$pattern*" }
    if (-not $match) { continue }

    $target = $node
    if ($node.clickable -ne "true" -and -not $Any) {
      $p = $node.ParentNode
      while ($p -and $p.clickable -ne "true") { $p = $p.ParentNode }
      if ($p) { $target = $p }
    }

    $center = Get-Center $target.bounds
    if ($center) {
      Write-Host "Tap-Text '$text' => $($target.bounds)"
      Invoke-AdbTap $center[0] $center[1]
      return $true
    }
  }
  Write-Host "Tap-Text MISS: $pattern"
  return $false
}

function Tap-EditText([int]$index = 0) {
  Update-UiDump
  $edits = $script:UiXml.SelectNodes('//node[@class="android.widget.EditText"]')
  if ($edits.Count -le $index) { Write-Host "No EditText at index $index"; return $false }
  $center = Get-Center $edits[$index].bounds
  Invoke-AdbTap $center[0] $center[1]
  return $true
}

function Send-AdbText([string]$text) {
  $escaped = $text -replace ' ', '%s'
  adb shell input text $escaped | Out-Null
  Write-Host "  typed: $text"
}

function Wait-Sec([int]$s, [string]$why = "") {
  if ($why) { Write-Host "wait ${s}s - $why" }
  Start-Sleep -Seconds $s
}

function Scroll-Down {
  adb shell input swipe 360 1200 360 500 400 | Out-Null
}

function Ensure-DevServer {
  adb reverse tcp:8082 tcp:8082 | Out-Null
  adb reverse tcp:8081 tcp:8081 | Out-Null
  adb shell am start -n com.anonymous.patwadi/.MainActivity | Out-Null
  Wait-Sec 3 "dev launcher"
  Update-UiDump
  $lines = Get-UiLines
  if ($lines.Text -match "8082") {
    if (-not (Tap-Text "127.0.0.1:8082")) { Tap-Text "localhost:8082" | Out-Null }
    Wait-Sec 15 "bundle load"
  } else {
    Write-Host "Dev server list not shown — assuming app already connected"
    Wait-Sec 3
  }
}

function Ensure-CustomerLogin {
  Show-Ui 15
  if (Tap-Text "Send Parcel" -ErrorAction SilentlyContinue) { return }
  if (Tap-Text "My Packages" -ErrorAction SilentlyContinue) { adb shell input keyevent KEYCODE_BACK; Wait-Sec 1 }

  if (Tap-Text "Sign in") {
    1..3 | ForEach-Object { Tap-Text "Sign in" -Exact; Wait-Sec 0.4 }
    Wait-Sec 1
    Tap-Text "Sign in" -Exact
    Wait-Sec 6 "auth"
    return
  }

  if (Tap-Text "Continue as guest") {
    Wait-Sec 2
    Tap-Text "Sign in" | Out-Null
    1..3 | ForEach-Object { Tap-Text "Sign in" -Exact; Wait-Sec 0.4 }
    Wait-Sec 1
    Tap-Text "Sign in" -Exact
    Wait-Sec 6 "auth"
  }
}

function Fill-PackageInfo {
  Write-Host "`n=== Package Info ==="
  Tap-Text "Send a Parcel" | Out-Null
  if (-not (Tap-Text "Document")) { Tap-Text "Send a Parcel" | Out-Null; Wait-Sec 1; Tap-Text "Document" }
  Wait-Sec 1

  # contents
  Tap-EditText 0 | Out-Null
  Send-AdbText "Test books"
  adb shell input keyevent KEYCODE_BACK | Out-Null
  Wait-Sec 0.5

  # value
  Tap-EditText 1 | Out-Null
  Send-AdbText "500"
  adb shell input keyevent KEYCODE_BACK | Out-Null

  # L W H - indices 2,3,4
  foreach ($dim in @("30","20","10")) {
    Tap-EditText 2 | Out-Null
    adb shell input keyevent KEYCODE_CTRL_A 2>$null
    Send-AdbText $dim
    # advance field by tapping next - crude: use tab or next edit index
  }
  # simpler: tap each dimension field by scrolling and using hints
  Update-UiDump
  $edits = $script:UiXml.SelectNodes('//node[@class="android.widget.EditText"]')
  $vals = @("30","20","10","2")
  for ($i = 0; $i -lt [Math]::Min($edits.Count, 7); $i++) {
    if ($i -ge 2) {
      $vi = $i - 2
      if ($vi -lt $vals.Count) {
        $c = Get-Center $edits[$i].bounds
        Invoke-AdbTap $c[0] $c[1]
        adb shell input keyevent 123 2>$null # move cursor end
        Send-AdbText $vals[$vi]
      }
    }
  }
  adb shell input keyevent KEYCODE_BACK | Out-Null

  Scroll-Down
  Wait-Sec 1
  Tap-Text "I confirm my package" | Out-Null
  Wait-Sec 1
  Scroll-Down
  Tap-Text "Next" | Out-Null
  Wait-Sec 2
}

function Fill-LocationScreen([string]$city) {
  Write-Host "`n=== Location: $city ==="
  Tap-EditText 0 | Out-Null
  Send-AdbText $city
  Wait-Sec 4 "mapbox suggestions"
  if (-not (Tap-Text $city -Any)) {
    Tap-Text "Delhi" | Out-Null
  }
  Wait-Sec 2

  # phone
  $idx = 1
  Tap-EditText $idx | Out-Null
  Send-AdbText "9876543210"
  adb shell input keyevent KEYCODE_BACK | Out-Null

  # street
  Tap-EditText 2 | Out-Null
  Send-AdbText "Main Road"
  adb shell input keyevent KEYCODE_BACK | Out-Null

  # apartment
  Tap-EditText 3 | Out-Null
  Send-AdbText "Apt 1"
  adb shell input keyevent KEYCODE_BACK | Out-Null

  Scroll-Down
  Wait-Sec 1
  Tap-Text "Next" | Out-Null
  Wait-Sec 3
}

Write-Host "Session 12 Part A - adb UI automation"
Ensure-DevServer
Ensure-CustomerLogin
Show-Ui 20

if (-not (Tap-Text "Send Parcel")) {
  Tap-Text "Send a Parcel" | Out-Null
}
Wait-Sec 2

Fill-PackageInfo
Show-Ui 15
Fill-LocationScreen "Delhi"
Show-Ui 15
Fill-LocationScreen "Chandigarh"
Show-Ui 15

Write-Host "`n=== Price estimate ==="
Scroll-Down
Tap-Text "Continue to confirmation" | Out-Null
Wait-Sec 3
Show-Ui 20

Write-Host "`n=== Confirm order ==="
Tap-Text "Confirm & pay" | Out-Null
Wait-Sec 8 "razorpay sheet"
Show-Ui 30

Write-Host "`nDONE Part A - stopped at payment (check for Razorpay UI)"

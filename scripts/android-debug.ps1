param(
  [switch]$SkipBuild,
  [int]$Port = 9333
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21.0.11"
$env:ANDROID_HOME = "D:\dev\tools\android-sdk"
$adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"

if (-not (Test-Path $adb)) {
  throw "adb not found: $adb"
}

if (-not $SkipBuild) {
  Push-Location $root
  try {
    Write-Host "[MoRead] Syncing renderer into the Android project..."
    npm run android:sync
    if ($LASTEXITCODE -ne 0) { throw "npm run android:sync failed: $LASTEXITCODE" }
    Push-Location (Join-Path $root "android")
    try {
      Write-Host "[MoRead] Building debug APK with JDK 21..."
      .\gradlew.bat assembleDebug
      if ($LASTEXITCODE -ne 0) { throw "gradlew assembleDebug failed: $LASTEXITCODE" }
    } finally {
      Pop-Location
    }
  } finally {
    Pop-Location
  }
}

$apk = Join-Path $root "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apk)) { throw "debug APK not found: $apk" }

& $adb wait-for-device
& $adb install -r $apk
if ($LASTEXITCODE -ne 0) { throw "adb install failed: $LASTEXITCODE" }

& $adb shell input keyevent KEYCODE_WAKEUP | Out-Null
& $adb shell wm dismiss-keyguard | Out-Null
& $adb shell am force-stop com.moread.markdown
& $adb shell am start -n com.moread.markdown/.MainActivity | Out-Null
Start-Sleep -Seconds 4

try { & $adb forward --remove "tcp:$Port" 2>$null | Out-Null } catch { }
$socketLines = & $adb shell cat /proc/net/unix | Select-String "webview_devtools_remote"
$socket = [regex]::Match(($socketLines -join "`n"), "webview_devtools_remote_\d+")
if (-not $socket.Success) {
  throw "WebView devtools socket not found. Make sure the debug build is running and WebView debugging is enabled."
}
& $adb forward "tcp:$Port" "localabstract:$($socket.Value)"

Write-Host ""
Write-Host "[MoRead] adb debug is ready."
Write-Host "  DevTools JSON : http://127.0.0.1:$Port/json"
Write-Host "  Chrome        : open chrome://inspect and add 127.0.0.1:$Port"
Write-Host "  Socket        : $($socket.Value)"
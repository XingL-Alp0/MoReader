# Render theme-pack preview HTML into PNG with headless Microsoft Edge.
# (Electron/Chromium needs named pipes; under the DSH file sandbox that fails,
#  so this script is run once with wider permissions.)
# The DSH file sandbox blocks Chromium's named pipes, so this script is run outside it.
# Edge prints importer/sync noise on stderr, so native-call errors are not terminating here.
$ErrorActionPreference = "Continue"

$suite = $PSScriptRoot
$shotsFile = Join-Path $suite "_preview\shots.json"
$shots = (Get-Content $shotsFile -Raw | ConvertFrom-Json).shots

$edge = @(
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw "Microsoft Edge not found; cannot render previews." }

$profile = Join-Path $suite "_build\edge-profile"
New-Item -ItemType Directory -Force -Path $profile | Out-Null
$count = 0

foreach ($entry in $shots) {
  foreach ($kind in @("welcome", "welcomeFull", "reading", "readingFull")) {
    $source = $entry.$kind
    $target = $entry.("${kind}Png")
    $url = "file:///" + ($source -replace "\\", "/")
    $height = if ($kind -eq "welcome" -or $kind -eq "reading") { 820 } else { 1560 }
    & $edge --headless=new --no-sandbox --disable-gpu --disable-crash-reporter `
      --no-first-run --hide-scrollbars --force-device-scale-factor=1 `
      --window-size="1280,$height" --virtual-time-budget=1500 `
      --user-data-dir="$profile" --screenshot="$target" $url 2>&1 | Out-Null
    if (-not (Test-Path $target)) { throw "screenshot failed: $target" }
    $count++
    Write-Host ("rendered {0}" -f (Split-Path $target -Leaf))
  }
}

Write-Host ("done: {0} screenshots" -f $count)

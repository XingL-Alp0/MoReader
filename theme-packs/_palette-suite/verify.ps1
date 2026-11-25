# Import every palette theme pack into a real dev instance and screenshot the result.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File verify.ps1 [-Slugs xuancai,moye]
param([string[]]$Slugs)

$ErrorActionPreference = "Continue"

$suite = $PSScriptRoot
$packsRoot = Split-Path $suite -Parent
$root = Split-Path $packsRoot -Parent
$electron = Join-Path $root "node_modules\electron\dist\electron.exe"
$nodeExe = (Get-Command node).Source
$cdp = Join-Path $root "scripts\cdp-eval.js"
$outDir = Join-Path $suite "_build\verify"
$userData = Join-Path $root "tmp\theme-verify"
$port = 9401

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (Test-Path $userData) { Remove-Item -Recurse -Force $userData }

$manifestText = [System.IO.File]::ReadAllText((Join-Path $suite "_build\manifest.json"), [System.Text.Encoding]::UTF8)
$manifest = ($manifestText | ConvertFrom-Json).packs
if ($Slugs) { $manifest = $manifest | Where-Object { $Slugs -contains $_.slug } }

function Get-PageTarget {
  param([int]$Port)
  for ($i = 0; $i -lt 80; $i++) {
    Start-Sleep -Milliseconds 350
    try {
      $targets = Invoke-RestMethod "http://127.0.0.1:$Port/json"
      $page = $targets | Where-Object { $_.type -eq "page" } | Select-Object -First 1
      if ($page -and $page.webSocketDebuggerUrl) { return $page.webSocketDebuggerUrl }
    } catch {
      continue
    }
  }
  return $null
}

$results = @()
foreach ($pack in $manifest) {
  $zip = Join-Path $packsRoot $pack.zip
  if (-not (Test-Path $zip)) { Write-Host "missing zip: $zip"; continue }

  Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
  $arguments = @(
    $root,
    "--user-data-dir=$userData",
    "--remote-debugging-port=$port",
    "--import-theme=$zip"
  )
  $process = Start-Process -FilePath $electron -ArgumentList $arguments -PassThru
  $ws = Get-PageTarget -Port $port
  if (-not $ws) {
    Write-Host "CDP unavailable for $($pack.slug)"
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    continue
  }

  Start-Sleep -Milliseconds 1500
  $clicked = & $nodeExe $cdp $ws eval "(() => { const button = document.querySelector('#confirmActions .btn-primary'); if (!button) return 'no-dialog'; button.click(); return 'clicked'; })()"
  Start-Sleep -Milliseconds 1800

  $probe = @'
JSON.stringify({
  pack: (document.querySelector('#themePackName') || {}).value || null,
  home: !!document.querySelector('.custom-home'),
  homeHasImage: !!document.querySelector('.custom-home img'),
  primary: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  paper: getComputedStyle(document.documentElement).getPropertyValue('--paper').trim(),
  ink: getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(),
  mode: document.documentElement.dataset.theme,
  customCss: !!document.getElementById('appCustomCss'),
  buttons: [...document.querySelectorAll('.custom-dock-button')].map((b) => b.title),
  toast: (document.querySelector('.toast') || {}).textContent || null
})
'@
  $state = (& $nodeExe $cdp $ws eval $probe) -join " "
  $png = Join-Path $outDir "$($pack.slug).png"
  & $nodeExe $cdp $ws shot $png | Out-Null

  $summary = ($state -replace "\s+", " ")
  Write-Host ("{0}: {1}" -f $pack.slug, $summary)
  $results += [pscustomobject]@{ slug = $pack.slug; state = $summary; png = $png }

  Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 1200
}

$json = $results | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText((Join-Path $outDir "verify.json"), $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("done: {0} packs" -f $results.Count)

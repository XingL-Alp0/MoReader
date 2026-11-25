param(
  [string]$AppPath,
  [switch]$Unregister
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$flag = if ($Unregister) { "--unregister-associations" } else { "--register-associations" }

if (-not $AppPath) {
  $packaged = @(
    (Join-Path $root "release\win-unpacked\MoRead.exe"),
    (Join-Path $root "MoRead.exe")
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1

  if ($packaged) {
    $AppPath = $packaged
  } else {
    $electron = Join-Path $root "node_modules\electron\dist\electron.exe"
    if (-not (Test-Path $electron)) {
      throw "找不到已打包的 MoRead.exe，也未找到 Electron 开发运行时。"
    }
    $env:ELECTRON_RUN_AS_NODE = $null
    $process = Start-Process -FilePath $electron -ArgumentList @($root, $flag) -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "注册命令退出码：$($process.ExitCode)" }
    Write-Host "已执行墨阅文件关联命令（开发模式）。"
    exit 0
  }
}

if (-not (Test-Path $AppPath)) { throw "找不到应用：$AppPath" }
$process = Start-Process -FilePath $AppPath -ArgumentList $flag -Wait -PassThru
if ($process.ExitCode -ne 0) { throw "注册命令退出码：$($process.ExitCode)" }
Write-Host "已执行墨阅文件关联命令：$AppPath"

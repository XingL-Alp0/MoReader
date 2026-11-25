param(
  [string]$File,
  [int]$DebugPort = 0,
  [switch]$SkipBuild,
  [switch]$Log,
  [string]$UserDataDir,
  [string]$ImportTheme
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$electron = Join-Path $root "node_modules\electron\dist\electron.exe"

if (-not (Test-Path $electron)) {
  throw "未找到 Electron 开发运行时：$electron。请先运行 npm install。"
}

Push-Location $root
try {
  if (-not $SkipBuild) {
    Write-Host "[MoRead] 构建渲染器与静态资源（不打包）..."
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build 失败，退出码：$LASTEXITCODE" }
  }

  # DSH 所在的终端环境可能带有 ELECTRON_RUN_AS_NODE=1；
  # 该变量会让 Electron 以 Node 模式启动，必须仅在本进程内移除。
  Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
  if ($Log) { $env:ELECTRON_ENABLE_LOGGING = "1" }

  $arguments = @($root)
  if ($File) {
    $resolved = Resolve-Path -LiteralPath $File -ErrorAction Stop
    $arguments += $resolved.Path
  }
  if ($DebugPort -gt 0) {
    $arguments += "--remote-debugging-port=$DebugPort"
  }
  if ($UserDataDir) {
    $arguments += "--user-data-dir=$UserDataDir"
  }
  if ($ImportTheme) {
    $arguments += "--import-theme=$ImportTheme"
  }

  Write-Host "[MoRead] 启动开发版：$electron"
  Write-Host "[MoRead] 按 Ctrl+C 停止。"
  & $electron @arguments
} finally {
  Pop-Location
}

# PixWave — 一键启动脚本 (Windows PowerShell)
# 用法: .\start.ps1  或  右键 → 使用 PowerShell 运行

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PixWave — AI 音乐电台" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $projectRoot "server"
$clientDir = Join-Path $projectRoot "client"

# ── 检查 Node.js ──────────────────────────────────────────
try {
    $nodeVersion = node -v
    Write-Host "[OK] Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] 未找到 Node.js，请先安装: https://nodejs.org" -ForegroundColor Red
    pause
    exit 1
}

# ── 安装依赖（如需要）─────────────────────────────────────
if (-not (Test-Path (Join-Path $serverDir "node_modules"))) {
    Write-Host "[...] 安装后端依赖..." -ForegroundColor Yellow
    Set-Location $serverDir
    npm install
    Set-Location $projectRoot
}

if (-not (Test-Path (Join-Path $clientDir "node_modules"))) {
    Write-Host "[...] 安装前端依赖..." -ForegroundColor Yellow
    Set-Location $clientDir
    npm install
    Set-Location $projectRoot
}

# ── 检查 .env ─────────────────────────────────────────────
$envFile = Join-Path $serverDir ".env"
$envExample = Join-Path $serverDir ".env.example"

if (-not (Test-Path $envFile)) {
    Write-Host "[...] 创建 .env 文件（从 .env.example 复制）" -ForegroundColor Yellow
    Copy-Item $envExample $envFile
    Write-Host "[WARN] 请编辑 server/.env 填入你的 API Keys" -ForegroundColor Yellow
    Write-Host "       未配置的 API 将使用 mock 模式运行" -ForegroundColor DarkYellow
}

# ── 启动后端 ──────────────────────────────────────────────
Write-Host ""
Write-Host ">>> 启动后端服务器..." -ForegroundColor Cyan

$serverJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    node src/index.js 2>&1 | ForEach-Object {
        $line = "$_"
        Write-Output "[server] $line"
    }
} -ArgumentList $serverDir

# 等待后端就绪
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "[OK] 后端已就绪 (port 3000)" -ForegroundColor Green
        $ready = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $ready) {
    Write-Host "[ERROR] 后端启动超时" -ForegroundColor Red
    Stop-Job $serverJob
    pause
    exit 1
}

# ── 启动前端 ──────────────────────────────────────────────
Write-Host ">>> 启动前端开发服务器..." -ForegroundColor Cyan

$clientJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npx vite --port 5173 --strictPort 2>&1 | ForEach-Object {
        $line = "$_"
        Write-Output "[client] $line"
    }
} -ArgumentList $clientDir

# 等待前端就绪
Start-Sleep -Seconds 3
Write-Host "[OK] 前端已就绪 (port 5173)" -ForegroundColor Green

# ── 打开浏览器 ────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PixWave 已启动!" -ForegroundColor Magenta
Write-Host "  前端: http://localhost:5173" -ForegroundColor White
Write-Host "  后端: http://localhost:3000" -ForegroundColor White
Write-Host "  API:  http://localhost:3000/api/health" -ForegroundColor DarkGray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 停止所有服务" -ForegroundColor Yellow
Write-Host ""

Start-Process "http://localhost:5173"

# ── 等待用户终止 ──────────────────────────────────────────
try {
    while ($true) {
        Receive-Job $serverJob | ForEach-Object { Write-Host $_ }
        Receive-Job $clientJob | ForEach-Object { Write-Host $_ }
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host ""
    Write-Host "[...] 正在停止服务..." -ForegroundColor Yellow
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Stop-Job $clientJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $clientJob -ErrorAction SilentlyContinue
    Write-Host "[OK] 服务已停止" -ForegroundColor Green
    pause
}

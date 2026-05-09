@echo off
chcp 65001 >nul
title PixWave — AI 音乐电台

echo ========================================
echo   PixWave — AI 音乐电台
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] 未找到 Node.js，请先安装: https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js ready

:: 安装依赖
if not exist "server\node_modules" (
    echo [...] 安装后端依赖...
    cd server
    call npm install
    cd ..
)

if not exist "client\node_modules" (
    echo [...] 安装前端依赖...
    cd client
    call npm install
    cd ..
)

:: 检查 .env
if not exist "server\.env" (
    copy "server\.env.example" "server\.env" >nul
    echo [WARN] 已创建 server\.env，请编辑填入 API Keys
)

:: 启动后端
echo.
echo ^>^>^> 启动后端...
start "PixWave-Server" cmd /c "cd server && node src\index.js"

:: 等待后端就绪
echo [...] 等待后端就绪...
for /l %%i in (1,1,15) do (
    curl -s http://localhost:3000/api/health >nul 2>nul && goto :backend_ok
    timeout /t 1 >nul
)
echo [ERROR] 后端启动超时
pause
exit /b 1

:backend_ok
echo [OK] 后端已就绪 (port 3000)

:: 启动前端
echo ^>^>^> 启动前端...
start "PixWave-Client" cmd /c "cd client && npx vite --port 5173 --strictPort"
timeout /t 3 >nul
echo [OK] 前端已就绪 (port 5173)

:: 打开浏览器
start http://localhost:5173

echo.
echo ========================================
echo   PixWave 已启动!
echo   前端: http://localhost:5173
echo   后端: http://localhost:3000
echo ========================================
echo.
echo 关闭此窗口不会停止服务。
echo 请手动关闭 PixWave-Server 和 PixWave-Client 窗口。
echo.

pause

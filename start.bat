@echo off
echo Starting 5Rivers Apps...

echo [1/3] Starting Server (port 4000)...
start "5Rivers Server" cmd /k "cd /d %~dp0\5rivers.server && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/3] Starting UI (port 5173)...
start "5Rivers UI" cmd /k "cd /d %~dp0\5rivers.app.ui && npm run dev"

echo [3/3] Starting Agent CLI...
start "5Rivers Agent" cmd /k "cd /d %~dp0\5rivers.app.agent && npm run cli"

echo.
echo All apps started in separate windows.
echo   Server:  http://localhost:4000
echo   UI:      http://localhost:5173
echo   Agent:   see Agent window

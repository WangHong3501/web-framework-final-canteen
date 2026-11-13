@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0web"
set "SHIGUANG_NODE=%ProgramFiles%\nodejs\node.exe"
set "SHIGUANG_NPM=%ProgramFiles%\nodejs\node_modules\npm\bin\npm-cli.js"
if not exist "%SHIGUANG_NODE%" (
  echo 未找到 Node.js，请先安装 Node.js 22.12 或更高版本。
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo 首次启动，正在按 package-lock.json 安装依赖，请稍候...
  "%SHIGUANG_NODE%" "%SHIGUANG_NPM%" ci
  if errorlevel 1 goto failed
)
echo.
echo 食光校园启动后，请打开 http://127.0.0.1:5173/#/login
echo 请保持此窗口运行；按 Ctrl+C 可停止。
echo.
"%SHIGUANG_NODE%" scripts\dev.mjs
if errorlevel 1 goto failed
exit /b 0
:failed
echo.
echo 启动未完成，请查看上方错误，检查网络、依赖或端口占用后重试。
pause
exit /b 1

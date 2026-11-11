@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PORT=8010
echo 正在启动 Momolab 本地服务...
start "" "http://127.0.0.1:%PORT%/"
where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server %PORT%
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    py -3 -m http.server %PORT%
  ) else (
    echo 没有找到 Python，请直接双击 index.html 游玩（拍照功能会不可用）。
    pause
  )
)
@echo off
chcp 65001 >nul
cd /d "D:\momolab"

echo [1/2] 启动本地服务 8010 ...
powershell -NoProfile -Command "try{ (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8010/ -TimeoutSec 3).StatusCode | Out-Null; Write-Host 'already running' }catch{ Start-Process python -ArgumentList 'tools\devserver.py' -WorkingDirectory 'D:\momolab' -WindowStyle Hidden; Start-Sleep -Seconds 2; Write-Host 'started' }"

echo [2/2] 开公网隧道 ...
if exist "tools\tunnel.log" del /q "tools\tunnel.log"
start "" /b "tools\cloudflared.exe" tunnel --url http://127.0.0.1:8010 --no-autoupdate --logfile "tools\tunnel.log"
timeout /t 12 /nobreak >nul
findstr /C:"https://" "tools\tunnel.log" | findstr /C:"trycloudflare.com"
echo.
echo 上面的 https://xxx.trycloudflare.com 就是公网链接，关掉这个窗口不影响（进程在后台）。
pause

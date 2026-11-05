@echo off
setlocal EnableExtensions
title Stop Infinyty Hub
echo Stopping Infinyty Hub...
powershell -NoProfile -Command "foreach($port in 3100,3200,8001){ Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { taskkill /PID $_.OwningProcess /T /F | Out-Null } }"
echo Done. The portal, CRM website and CRM API are stopped.
timeout /t 3 >nul

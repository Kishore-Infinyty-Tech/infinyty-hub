@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Infinyty Hub launcher
cd /d "%~dp0"
set "ROOT=%~dp0"
set "NODE_NO_WARNINGS=1"

echo.
echo  ==========================================
echo    Infinyty Hub  -  starting up
echo  ==========================================
echo.

rem ---------- 1. Python 3.10 or newer (the CRM API needs it) ----------
set "PY="
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>&1
if not errorlevel 1 set "PY=py -3"
if not defined PY (
  python -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>&1
  if not errorlevel 1 set "PY=python"
)
if not defined PY goto :install_python

rem ---------- 2. Node.js 20 or newer ----------
set "NODE_OK="
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" >nul 2>&1
if not errorlevel 1 set "NODE_OK=1"
if not defined NODE_OK goto :install_node

rem ---------- 3. CRM API: virtual environment and packages ----------
cd /d "%ROOT%crm-website\backend"
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" -c "import sys" >nul 2>&1
  if errorlevel 1 rmdir /s /q ".venv"
)
if not exist ".venv\Scripts\python.exe" (
  echo [1/5] Creating the Python environment...
  %PY% -m venv .venv
  if errorlevel 1 goto :fail
)
echo [1/5] Installing CRM API packages...
".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -q -r requirements.txt
if errorlevel 1 goto :fail
if not exist ".env" (
  echo.
  echo  The CRM needs its own database settings.
  echo  Paste the PostgreSQL connection string for the CRM ^(it starts with postgresql://^) and press Enter.
  set "DBURL="
  set /p "DBURL=CRM DATABASE_URL: "
  if not defined DBURL goto :fail
  > ".env" echo DATABASE_URL=!DBURL!
  >> ".env" echo DEBUG=1
  >> ".env" echo APP_URL=http://localhost:3200
  echo  Saved to crm-website\backend\.env
)

rem ---------- 4. Portal: packages, settings and database ----------
cd /d "%ROOT%portal"
echo [2/5] Installing portal packages. The first run can take a few minutes...
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 goto :fail
echo [3/5] Checking portal settings and database...
node scripts\ensure-setup.mjs
if errorlevel 1 goto :fail

rem ---------- 5. CRM website packages ----------
cd /d "%ROOT%crm-website\frontend"
echo [4/5] Installing CRM website packages...
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 goto :fail

rem ---------- 6. Start the three servers (each in its own minimized window) ----------
echo [5/5] Starting the servers...
netstat -ano | findstr /R /C:":8001 .*LISTENING" >nul
if errorlevel 1 (
  start "Infinyty CRM - API" /D "%ROOT%crm-website\backend" /min cmd /k ".venv\Scripts\python.exe manage.py runserver 127.0.0.1:8001 --noreload"
) else (
  echo      CRM API is already running.
)
netstat -ano | findstr /R /C:":3200 .*LISTENING" >nul
if errorlevel 1 (
  start "Infinyty CRM - Website" /D "%ROOT%crm-website\frontend" /min cmd /k "npm run dev -- -p 3200"
) else (
  echo      CRM website is already running.
)
netstat -ano | findstr /R /C:":3100 .*LISTENING" >nul
if errorlevel 1 (
  start "Infinyty Hub - Portal" /D "%ROOT%portal" /min cmd /k "npm run dev"
) else (
  echo      Portal is already running.
)

rem ---------- 7. Wait until the portal answers, then open it ----------
echo.
echo  Waiting for the portal to be ready. The very first page can take a minute...
powershell -NoProfile -Command "$u='http://127.0.0.1:3100/login'; for($i=0;$i -lt 120;$i++){ try{ Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 20 | Out-Null; exit 0 } catch { Start-Sleep -Seconds 2 } }; exit 1"
if errorlevel 1 goto :slow

if not defined NO_BROWSER start "" http://localhost:3100
echo.
echo  ==========================================
echo    Infinyty Hub is open:  http://localhost:3100
echo  ==========================================
echo.
echo  Keep the three minimized windows open while you use it.
echo  To stop everything, run stop.bat.
echo.
timeout /t 8 >nul
exit /b 0

:install_python
echo  Python 3.10 or newer was not found.
where winget >nul 2>&1
if errorlevel 1 (
  echo  Please install Python from https://www.python.org/downloads/
  echo  Tick "Add python.exe to PATH" during setup, then run start.bat again.
  start "" https://www.python.org/downloads/
  pause
  exit /b 1
)
echo  Installing Python with winget. Accept any prompt that appears...
winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
echo.
echo  Python is installed. Close this window and run start.bat again.
pause
exit /b 0

:install_node
echo  Node.js 20 or newer was not found.
where winget >nul 2>&1
if errorlevel 1 (
  echo  Please install the LTS version from https://nodejs.org/
  echo  then run start.bat again.
  start "" https://nodejs.org/
  pause
  exit /b 1
)
echo  Installing Node.js with winget. Accept any prompt that appears...
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
echo.
echo  Node.js is installed. Close this window and run start.bat again.
pause
exit /b 0

:slow
echo.
echo  The portal is taking longer than expected. Look at the minimized
echo  "Infinyty Hub - Portal" window for errors, then try http://localhost:3100
pause
exit /b 1

:fail
echo.
echo  Something went wrong while setting up. Read the message above,
echo  fix it, and run start.bat again.
pause
exit /b 1

@echo off
cd /d "%~dp0"
echo Starting Frontend V2 on http://localhost:8443
call npm.cmd run dev
pause

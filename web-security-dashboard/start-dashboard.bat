@echo off
title Web Security Shield — Central Console & AI Session Hub
echo ========================================================
echo   Web Security Shield — Central Security Console
echo ========================================================
echo.
echo Starting dashboard server on http://localhost:3000 ...
echo.
cd /d "%~dp0"
node server.js
pause

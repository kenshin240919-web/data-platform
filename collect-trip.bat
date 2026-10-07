@echo off
cd /d "%~dp0"
".venv\Scripts\python.exe" -m services.api.app.trip100 --target 200
pause

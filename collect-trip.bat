@echo off
cd /d "%~dp0"
rem 공개 데이터를 목표 건수까지 늘립니다. 하루 호출 한도에 닿으면 멈추고, 다음 날 같은 목표로 다시 실행하면 이어서 수집합니다.
set TARGET=
set /p TARGET=총 몇 건까지 늘릴까요? (예: 1000, 최대 3000) : 
if "%TARGET%"=="" (echo 건수를 입력하지 않아 종료합니다. & pause & exit /b 1)
".venv\Scripts\python.exe" scripts\local-postgres.py setup || (echo 로컬 DB를 시작하지 못했습니다. & pause & exit /b 1)
".venv\Scripts\python.exe" -m services.api.app.trip100 --target %TARGET%
rem 창을 닫기 전에 DB를 정상 종료합니다(강제 종료로 인한 손상 방지).
".venv\Scripts\python.exe" scripts\local-postgres.py stop >nul 2>&1
echo.
echo 웹사이트에 반영하려면 export-site.bat을 실행하세요.
pause

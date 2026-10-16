@echo off
cd /d "%~dp0"
rem 공개 데이터를 목표 건수까지 늘립니다. 하루 호출 한도에 닿으면 멈추고, 다음 날 같은 목표로 다시 실행하면 이어서 수집합니다.
set TARGET=
set /p TARGET=총 몇 건까지 늘릴까요? (예: 10000, 최대 100000 · 1만 건씩 늘리기 권장) : 
if "%TARGET%"=="" (echo 건수를 입력하지 않아 종료합니다. & pause & exit /b 1)
rem 맛집(음식점)·숙소(숙박)까지 받으려면 y. 그냥 Enter면 관광지·문화시설·레포츠·축제만 받습니다.
set ALLTYPES=
set /p ALLTYPES=맛집·숙소도 함께 받을까요? (y/N) : 
if /i "%ALLTYPES%"=="y" (set TOURAPI_TYPES=12,14,28,15,39,32) else (set TOURAPI_TYPES=12,14,28,15)
".venv\Scripts\python.exe" scripts\local-postgres.py setup || (echo 로컬 DB를 시작하지 못했습니다. & pause & exit /b 1)
".venv\Scripts\python.exe" -m services.api.app.trip100 --target %TARGET%
rem 창을 닫기 전에 DB를 정상 종료합니다(강제 종료로 인한 손상 방지).
".venv\Scripts\python.exe" scripts\local-postgres.py stop >nul 2>&1
echo.
echo 웹사이트에 반영하려면 export-site.bat을 실행하세요.
pause

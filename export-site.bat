@echo off
cd /d "%~dp0"
rem 공개 데이터를 정적 사이트용으로 내보내고 GitHub에 올립니다 (Cloudflare가 자동 배포).
".venv\Scripts\python.exe" scripts\local-postgres.py setup || goto :fail
pushd services\api
"..\..\.venv\Scripts\python.exe" -m app.export_static || (popd & goto :fail)
popd
git add apps/trip/data/trip.json
git diff --cached --quiet && (".venv\Scripts\python.exe" scripts\local-postgres.py stop >nul 2>&1 & echo 바뀐 데이터가 없습니다. & pause & exit /b 0)
git commit -m "Update trip site data" || goto :fail
git push || goto :fail
".venv\Scripts\python.exe" scripts\local-postgres.py stop >nul 2>&1
echo 완료: Cloudflare가 몇 분 안에 새 데이터로 배포합니다.
pause
exit /b 0
:fail
".venv\Scripts\python.exe" scripts\local-postgres.py stop >nul 2>&1
echo 실패했습니다. 위 메시지를 확인하세요.
pause
exit /b 1

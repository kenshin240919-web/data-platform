@echo off
cd /d "%~dp0"
rem 공개 데이터를 정적 사이트용으로 내보내고 GitHub에 올립니다 (Cloudflare가 자동 배포).
".venv\Scripts\python.exe" scripts\local-postgres.py setup || goto :fail
pushd services\api
"..\..\.venv\Scripts\python.exe" -m app.export_static || (popd & goto :fail)
popd
git add apps/trip/data/trip.json
rem 데이터가 바뀌었을 때만 커밋합니다. 바뀐 게 없어도 이 컴퓨터의 다른 커밋은 아래에서 함께 올립니다.
git diff --cached --quiet || git commit -m "Update trip site data" || goto :fail
rem 휴대폰·웹에서 올린 커밋이 있으면 먼저 받아 그 위에 얹습니다(충돌하면 되돌리고 멈춤).
git pull --rebase --autostash origin main || (git rebase --abort >nul 2>&1 & echo GitHub의 다른 변경과 충돌했습니다. Claude에게 이 화면을 보여 주세요. & goto :fail)
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

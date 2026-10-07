@echo off
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
  echo README.md의 최초 설치 단계를 실행하세요.
  pause
  exit /b 1
)
rem 로컬 PostgreSQL을 쓰는 경우 API보다 먼저 켭니다 (꺼져 있으면 API가 시작되지 않음).
if exist .env.postgres-local (
  ".venv\Scripts\python.exe" scripts\local-postgres.py setup || (echo 로컬 DB를 시작하지 못했습니다. & pause & exit /b 1)
)
npm run dev

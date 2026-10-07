@echo off
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
  echo README.md의 최초 설치 단계를 실행하세요.
  pause
  exit /b 1
)
npm run dev

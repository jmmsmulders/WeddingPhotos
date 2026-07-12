@echo off
setlocal

if "%~1"=="" (
  echo Usage: make-qr.cmd https://your-project.pages.dev
  exit /b 1
)

set "NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE%" set "NODE=node"

"%NODE%" "%~dp0scripts\generate-qr.js" "%~1"

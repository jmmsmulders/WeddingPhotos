@echo off
setlocal

set "NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE%" set "NODE=node"

"%NODE%" "%~dp0scripts\local-server.mjs"

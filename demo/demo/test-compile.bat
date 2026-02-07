@echo off
echo Testing Java compilation...
cd /d "%~dp0"
call mvnw.cmd compile
echo Compilation test complete.
pause
@echo off
REM Double-click me after editing esp32_multi.ino to refresh the .bin used for OTA.
REM Optional: drag a board name in, or run  build.bat mod1  to build AND upload.
REM Just a wrapper around build.sh (Git Bash ships with Git for Windows).

setlocal
set BASH=C:\Program Files\Git\bin\bash.exe
if not exist "%BASH%" set BASH=C:\Program Files (x86)\Git\bin\bash.exe
if not exist "%BASH%" (
  echo Could not find Git Bash. Install Git for Windows, or run build.sh yourself.
  pause
  exit /b 1
)

"%BASH%" -lc "cd \"$(cygpath '%~dp0')\" && ./build.sh %*"

echo.
pause

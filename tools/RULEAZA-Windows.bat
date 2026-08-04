@echo off
chcp 65001 >nul
REM ====================================================
REM  PlayArcadeX - Generator surse jocuri (Windows)
REM  Dublu-click pe acest fisier ca sa rulezi scriptul.
REM  Daca apare "Access is denied", click-dreapta pe acest
REM  fisier -> "Run as administrator".
REM ====================================================
cd /d "%~dp0"
echo Pornesc generatorul de surse...
echo Folder script: %~dp0
echo.

python generate_sources.py %*
if %errorlevel% neq 0 (
    echo.
    echo [Scriptul a returnat o eroare - vezi mesajul de mai sus]
    echo Daca e "Access is denied": click-dreapta pe acest .bat -^> Run as administrator
)

echo.
echo ====================================================
pause

@echo off
chcp 65001 > nul
echo.
echo  ============================================
echo   德州哲学家 · Texas Philosopher
echo  ============================================
echo.
echo  正在用默认浏览器打开...
echo.
start "" "%~dp0index.html"
echo  如果浏览器没有自动打开, 请手动双击 index.html
echo.
pause

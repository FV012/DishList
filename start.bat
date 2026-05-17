@echo off
echo Запуск приложения "Каталог кулинарных рецептов"
echo.

echo [1/2] Запуск сервера (backend)...
start "Backend" cmd /k "cd /d %~dp0server && node index.js"

echo [2/2] Запуск клиента (frontend)...
timeout /t 2 /nobreak >nul
start "Frontend" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo Приложение запускается...
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
timeout /t 4 /nobreak >nul
start http://localhost:3000

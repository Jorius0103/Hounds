@echo off
title Hounds - Servidor Local
echo ========================================================
echo    Hounds - Atualizando e Iniciando Servidor Local
echo ========================================================
echo.
echo [1/2] Sincronizando com o GitHub (git pull origin main)...
git pull origin main
echo.
echo [2/2] Iniciando servidor em http://localhost:8000
echo Pressione Ctrl+C para encerrar quando terminar.
echo.
start http://localhost:8000/#mesa
py -m http.server 8000
pause


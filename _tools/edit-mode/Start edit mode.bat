@echo off
rem Starts the local edit mode for the website and opens it in your browser.
rem Close this window to stop it. It only runs on this computer.
rem Opens the browser after a 2-second pause, so the server is ready by the time the page loads.
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start "" http://127.0.0.1:8780/"
rem %~dp0 is this file's own folder, so it works wherever the website folder is.
node "%~dp0server.mjs"

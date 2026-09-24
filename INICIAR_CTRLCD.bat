@echo off
rem CTRL+CD - abre a interface completa: front-end + back-ends (usuarios/registros e Assistente CTRL).
rem Dois cliques neste arquivo. Para encerrar, feche esta janela ou use Ctrl+C.
chcp 65001 >nul
cd /d "%~dp0"

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY goto sempython

if exist ".venv\Scripts\python.exe" goto temvenv
echo Criando o ambiente virtual .venv - so na primeira vez...
%PY% -m venv .venv
if errorlevel 1 goto semvenv

:temvenv
".venv\Scripts\python.exe" -c "import fastapi, uvicorn, requests, dotenv, langchain_core" >nul 2>nul
if not errorlevel 1 goto iniciar
echo Instalando as dependencias do back-end: requirements.txt - so na primeira vez...
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 echo Sem acesso ao PyPI: sera usada a versao do back-end sem dependencias, user_api.py.

:iniciar
".venv\Scripts\python.exe" iniciar_ctrlcd.py %*
pause
exit /b

:semvenv
echo Nao foi possivel criar o .venv; usando o Python do sistema.
%PY% iniciar_ctrlcd.py %*
pause
exit /b

:sempython
echo Python nao encontrado. Instale o Python 3.10 ou mais recente em https://www.python.org/downloads/
echo e marque "Add python.exe to PATH" na instalacao. Depois, rode este arquivo de novo.
pause
exit /b 1

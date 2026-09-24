# Usuarios locais

Este diretório é usado pelo backend local de usuários para persistir o banco SQLite `users.sqlite3`.

Inicie a API pela raiz do projeto com:

```powershell
.\.venv\Scripts\python.exe -m uvicorn fastapi_app:app --host 127.0.0.1 --port 8001
```

A API escuta somente em `http://127.0.0.1:8001`.

Documentação interativa: `http://127.0.0.1:8001/docs`.

O navegador ainda mantém a interface demonstrativa separada. Fotos e outros blobs continuam no IndexedDB do frontend; a API de usuários não recebe arquivos.

Não colocar senhas, tokens ou dados pessoais reais neste diretório.

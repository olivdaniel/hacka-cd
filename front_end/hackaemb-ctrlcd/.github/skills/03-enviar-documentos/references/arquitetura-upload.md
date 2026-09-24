# Arquitetura de upload — Skill 03

## Fluxo

```text
File do navegador
  → POST /api/uploads com bytes crus
  → serve.py grava temporário em blocos
  → agent.py solicita create_presigned_upload
  → agent.py faz PUT para o S3
  → serve.py remove o temporário
  → navegador recebe objectKey
```

## Responsabilidades

### Navegador

- Seleciona arquivos ou uma pasta opcional.
- Consulta a política local.
- Mantém fila e estados visuais.
- Envia um arquivo por requisição.
- Executa um único worker sequencial.
- Continua após erro e permite retry manual.
- Nunca recebe a URL pré-assinada ou a API key.

### `serve.py`

- Valida headers e tamanho antes de ler.
- Recebe o corpo em blocos.
- Grava em arquivo temporário.
- Confirma o tamanho efetivamente recebido.
- Aplica timeout durante a leitura.
- Serializa somente uploads com um semáforo.
- Reutiliza `objectKey` pelo mesmo `X-Upload-Id` enquanto estiver em execução.
- Chama `agent.upload_document`.
- Remove o temporário em `finally`.
- Retorna somente metadados seguros.

### `agent.py`

- Solicita autorização ao Experimental Lab.
- Usa API key apenas nessa chamada.
- Valida a resposta da autorização.
- Faz PUT por uma conexão HTTPS criada e fechada em cada operação.
- Usa `http.client.HTTPSConnection` como implementação de referência.
- Preserva `Host`, `Content-Length`, path, query e headers assinados.
- Envia o arquivo em blocos, sem transferência chunked.
- Não segue redirects e usa timeouts explícitos.
- Mantém TLS do S3 habilitado.
- Retorna apenas o `objectKey`.

### `upload_config.py`

- Centraliza tipos, tamanho, chunk e validações.
- Não conhece URL, API key ou configuração TLS.
- É reutilizado por `serve.py`, `agent.py` e testes.

## Arquivos grandes

O arquivo não atravessa a Lambda. Apenas metadados são enviados para
`create_presigned_upload`.

No servidor local:

```text
socket
  → bloco de 1 MiB
  → arquivo temporário
  → transporte HTTPS exclusivo em blocos
  → S3
```

Não use `request_body = rfile.read(content_length)` para arquivos de até
100 MiB.

## Fila tolerante a falhas

```text
A: Aguardando → Enviando → Concluído
B: Aguardando → Enviando → Erro
C: Aguardando → Enviando → Concluído
                         B → retry manual
```

- O worker usa FIFO.
- Uma exceção pertence ao item atual.
- Itens concluídos não voltam à fila.
- Retry manual reinsere o item no mesmo worker FIFO.
- O mesmo `itemId` produz o mesmo `X-Upload-Id`.
- O arquivo selecionado permanece apenas na sessão atual da página.

## Pasta opcional

`webkitdirectory` fornece `webkitRelativePath`.

Para uma pasta selecionada:

```text
pasta/arquivo.pdf            → incluir
pasta/subpasta/arquivo.pdf   → ignorar
```

Use o caminho apenas para decidir a profundidade. Não o envie ao backend nem o
persista.

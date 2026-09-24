# Contrato de upload — Skill 03

## Limites

O treinamento usa:

```python
MAX_UPLOAD_CONTENT_LENGTH = 100 * 1024 * 1024
```

Valor em bytes:

```text
104857600
```

Esse limite deve estar alinhado entre:

- Lambda;
- OpenAPI e testes da Lambda;
- `upload_config.py`;
- resposta de `GET /api/uploads/config`.

O frontend apenas antecipa o erro. `serve.py` impõe o tamanho efetivamente
recebido. A Lambda limita o `contentLength` declarado antes de autorizar a URL,
mas o PUT atual não vincula sozinho o tamanho real ao valor declarado.

O limite de vetorização é independente e não deve ser elevado automaticamente.

## Formatos

| Extensão | MIME canônico |
| --- | --- |
| `.txt` | `text/plain` |
| `.csv` | `text/csv` |
| `.pdf` | `application/pdf` |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `.png` | `image/png` |

Use a extensão para obter o MIME canônico. Não confie em `File.type`.

## Solicitar URL pré-assinada

Endpoint remoto:

```http
POST {EXPERIMENTAL_LAB_API_URL}
Content-Type: application/json
x-api-key: {EXPERIMENTAL_LAB_API_KEY}
```

Essa chamada autenticada usa o timeout padrão do cliente do Experimental Lab:
`EXPERIMENTAL_LAB_REQUEST_TIMEOUT_SECONDS`, com default de 60 segundos.
O valor não se aplica ao PUT posterior para o S3.

Payload:

```json
{
  "action": "create_presigned_upload",
  "objectKey": "uploads/uuid.pdf",
  "contentType": "application/pdf",
  "contentLength": 12345
}
```

`objectKey`:

- começa com `uploads/`;
- não contém `..`;
- usa UUID gerado no backend;
- preserva somente a extensão normalizada;
- não contém nome ou caminho original.

Sucesso HTTP `201`:

```json
{
  "method": "PUT",
  "url": "https://...",
  "objectKey": "uploads/uuid.pdf",
  "expiresAt": "2026-08-29T10:00:00Z",
  "requiredHeaders": {
    "content-type": "application/pdf"
  }
}
```

Valide todos os campos antes do PUT:

- método `PUT`;
- `objectKey` idêntico ao solicitado;
- HTTPS;
- sem usuário, senha ou fragmento;
- hostname S3 permitido pelo ambiente;
- `content-type` idêntico ao solicitado;
- nenhum `x-api-key`.

A URL expira em 15 minutos.

## PUT para o S3

```http
PUT {url}
content-type: application/pdf

<bytes crus>
```

- Preserve o path e a query assinada sem reencodar.
- Envie `Host`, `Content-Length` e todos os headers obrigatórios.
- Não use transferência chunked.
- Não envie `x-api-key`.
- Não envie JSON, base64 ou multipart.
- Não desative TLS.
- Não registre a URL.
- Não faça retry automático.
- Não siga redirects.
- Use timeouts explícitos de conexão, envio e leitura.
- Aceite como sucesso somente HTTP `200`.
- Feche resposta e conexão em `finally`.

O transporte é definido pelo comportamento. A implementação de referência usa
`http.client.HTTPSConnection`, `ssl.create_default_context()` e envio do arquivo
em blocos. `requests` permanece no cliente autenticado do Experimental Lab.

Rejeite headers obrigatórios que possam alterar framing, destino ou
autenticação: `host`, `content-length`, `transfer-encoding`, `connection`,
`authorization`, `cookie`, `proxy-authorization` e `x-api-key`.

## Smoke test do transporte

Antes de conectar o frontend, envie um TXT pequeno e não confidencial pelo
cliente de backend. O teste passa somente quando o S3 responde HTTP `200`.

Não registre URL, hostname, bucket, query, `objectKey`, nome do arquivo, valores
de headers ou resposta XML.

## Contrato local

Configuração:

```http
GET /api/uploads/config
```

Upload:

```http
POST /api/uploads
Content-Type: <MIME canônico>
X-File-Name: <nome codificado com encodeURIComponent>
X-Upload-Id: <UUID estável do item>
Content-Length: <calculado pelo navegador>

<bytes crus>
```

Sucesso HTTP `201`:

```json
{
  "fileName": "documento.pdf",
  "objectKey": "uploads/uuid.pdf",
  "status": "uploaded"
}
```

Erro:

```json
{
  "error": {
    "code": "UPLOAD_FAILED",
    "message": "Não foi possível enviar o documento."
  }
}
```

Não devolva detalhes remotos, URL pré-assinada ou caminho temporário.

O JavaScript não define manualmente `Content-Length`.

## Erros locais

| HTTP | Código |
| --- | --- |
| `400` | `INVALID_FILE_NAME`, `INVALID_CONTENT_TYPE` ou `INCOMPLETE_BODY` |
| `413` | `FILE_TOO_LARGE` |
| `415` | `UNSUPPORTED_FILE_TYPE` |
| `502` | `UPLOAD_AUTHORIZATION_FAILED` ou `S3_UPLOAD_FAILED` |
| `504` | `UPLOAD_TIMEOUT` |

## Sem polling

Não existe action remota para consultar o status do upload. Um `PUT` concluído
com sucesso finaliza o fluxo desta skill.

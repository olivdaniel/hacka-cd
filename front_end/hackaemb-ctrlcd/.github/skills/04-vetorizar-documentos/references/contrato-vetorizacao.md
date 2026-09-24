# Contrato de vetorização

## Endpoint remoto

```http
POST /aws-bedrock
Content-Type: application/json
x-api-key: <somente no backend>
```

A chamada usa o cliente autenticado compartilhado, com
`EXPERIMENTAL_LAB_REQUEST_TIMEOUT_SECONDS=60` por padrão. Um
`requests.Timeout` é convertido em `VECTORIZATION_TIMEOUT`.

Payload para o índice padrão:

```json
{
  "action": "vectorize",
  "objectKey": "uploads/uuid.pdf"
}
```

Para índice personalizado, acrescente:

```json
{
  "vectorIndexName": "documentos-financeiros"
}
```

Não envie campos extras. Para o padrão, omita a propriedade; não envie `null`,
string vazia ou a legenda `Índice padrão`.

## `objectKey`

O valor:

- é resolvido por `serve.py` a partir do `itemId/X-Upload-Id`;
- começa com `uploads/`;
- não começa com `/`;
- não contém `..`;
- termina em `.txt`, `.csv`, `.pdf`, `.docx`, `.xlsx` ou `.png`;
- não é digitado pelo participante;
- não é usado como texto de interface ou log.

## `vectorIndexName`

O campo é opcional:

- ausente seleciona o índice padrão configurado na Lambda;
- presente seleciona um índice personalizado;
- tem entre 3 e 63 caracteres;
- não contém nenhum caractere de espaço;
- é preservado exatamente;
- diferencia maiúsculas e minúsculas;
- é validado no navegador, em `serve.py` e antes da chamada remota.

Não aplique `trim`, troca de espaços, mudança de caixa ou geração silenciosa de
um nome alternativo.

## Resposta remota

Sucesso HTTP `200`:

```json
{
  "sourceFile": "s3://bucket/uploads/uuid.pdf",
  "fileType": "pdf",
  "totalChunks": 15,
  "totalVectorsStored": 15,
  "vectorBucket": "bucket-vetorial",
  "indexName": "documentos-financeiros",
  "indexCreated": false,
  "embeddingModel": "amazon.titan-embed-text-v2:0",
  "embeddingDimension": 1024
}
```

`agent.py` valida a resposta completa necessária para confiar no resultado, mas
`serve.py` devolve somente a projeção segura.

Valide:

- objeto JSON;
- `fileType` entre os seis formatos;
- `totalChunks` inteiro positivo;
- `totalVectorsStored` inteiro positivo;
- `totalVectorsStored == totalChunks`;
- para personalizado, `indexName` idêntico ao solicitado;
- para padrão, `indexName` válido identifica o índice efetivamente usado;
- `indexCreated` booleano.

Não confie apenas no status HTTP.

## Endpoint local

```http
POST /api/vectorizations
Content-Type: application/json
```

Entrada:

```json
{
  "itemId": "uuid-estável-da-skill-03"
}
```

Aceite `itemId` e o `vectorIndexName` opcional. Se o campo existir, exija uma
string válida. Rejeite `null`, string vazia e campos adicionais.

O servidor resolve:

```text
itemId = X-Upload-Id da Skill 03 → objectKey
```

Se o processo não conhecer o `itemId`, responda com erro seguro. Não gere outro
UUID e não aceite que o navegador forneça uma chave alternativa.

Exija:

- `Content-Type: application/json`;
- `Content-Length` presente, inteiro e positivo;
- corpo de no máximo 1024 bytes;
- JSON válido;
- nenhum campo adicional.

## Resposta local

Sucesso HTTP `200`:

```json
{
  "itemId": "uuid-estável-da-skill-03",
  "status": "vectorized",
  "fileType": "pdf",
  "totalChunks": 15,
  "totalVectorsStored": 15,
  "indexName": "documentos-financeiros",
  "indexCreated": false
}
```

Não inclua:

- `sourceFile`;
- `objectKey`;
- bucket de origem ou vetorial;
- embedding model;
- dimensão;
- payload remoto;
- headers;
- exceção bruta.

## Erros

Use sempre:

```json
{
  "error": {
    "code": "CODIGO_ESTAVEL",
    "message": "Mensagem segura"
  }
}
```

Mapeamento local antes da chamada remota:

| Situação | HTTP | `code` |
| --- | ---: | --- |
| `Content-Length` ausente ou inválido | `411` | `LENGTH_REQUIRED` |
| corpo acima de 1024 bytes | `413` | `REQUEST_TOO_LARGE` |
| `Content-Type` incorreto | `415` | `UNSUPPORTED_MEDIA_TYPE` |
| JSON malformado | `400` | `INVALID_JSON` |
| campos, UUID ou índice inválidos | `400` | `INVALID_VECTORIZATION_REQUEST` |
| `itemId` não conhecido | `404` | `UPLOAD_NOT_FOUND` |

Mapeamento da chamada remota:

| HTTP/código remoto | HTTP local | `code` local |
| --- | ---: | --- |
| `400` | `502` | `UPSTREAM_CONTRACT_ERROR` |
| `401 UNAUTHORIZED` | `502` | `UPSTREAM_AUTHENTICATION_FAILED` |
| `404 STORAGE_RESOURCE_NOT_FOUND` | `404` | `DOCUMENT_NOT_FOUND` |
| `422 EMPTY_FILE` | `422` | `EMPTY_FILE` |
| `422 DOCUMENT_EXTRACTION_FAILED` | `422` | `DOCUMENT_EXTRACTION_FAILED` |
| `422 DOCUMENT_LIMIT_EXCEEDED` | `422` | `DOCUMENT_LIMIT_EXCEEDED` |
| `422 VECTORIZATION_LIMIT_EXCEEDED` | `422` | `VECTORIZATION_LIMIT_EXCEEDED` |
| `429 USAGE_LIMIT_EXCEEDED` | `429` | `USAGE_LIMIT_EXCEEDED` |
| `503 OCR_UNAVAILABLE` | `503` | `OCR_UNAVAILABLE` |
| `503 VECTORIZATION_UNAVAILABLE` | `503` | `VECTORIZATION_UNAVAILABLE` |
| timeout local | `504` | `VECTORIZATION_TIMEOUT` |
| conexão ou TLS | `503` | `VECTORIZATION_UNAVAILABLE` |
| `500`, código desconhecido ou envelope inválido | `502` | `UPSTREAM_ERROR` |

Use mensagens locais fixas. Não mostre a resposta remota ou o texto bruto da
exceção.

Não copie headers remotos por atacado. `USAGE_LIMIT_EXCEEDED` permanece uma
falha do item e exige retry manual.

O frontend pode informar o tempo restante, mas não agenda retry automático.

## Cache local de sucesso

Use a chave:

```text
(itemId, requestedIndexName)
```

`requestedIndexName` é `None` para o padrão e o nome exato para o
personalizado. O nome efetivo retornado fica no resultado, mas não substitui a
identidade da seleção que originou a chamada.

Depois de um sucesso, repetir o mesmo par devolve o resultado sanitizado já
conhecido sem chamar novamente o remoto.

Não armazene falha como sucesso. O retry precisa executar uma nova chamada.

O cache é apenas uma proteção local contra repetição e desaparece ao reiniciar
`serve.py`.

A consulta e a gravação do cache acontecem dentro do mesmo semáforo de
vetorização. Duas requisições simultâneas do mesmo par devem produzir uma única
chamada ao agente.

## Idempotência limitada

A implementação remota usa chaves vetoriais determinísticas por
`objectKey + chunk_index`, mas isso não oferece uma transação completa:

- uma falha pode ocorrer depois de alguns lotes serem gravados;
- retry pode sobrescrever chaves determinísticas;
- mudar o conteúdo sob o mesmo `objectKey` pode produzir outro número de chunks;
- vetores excedentes de uma versão anterior não são necessariamente removidos.

Não prometa rollback ou execução exatamente uma vez.

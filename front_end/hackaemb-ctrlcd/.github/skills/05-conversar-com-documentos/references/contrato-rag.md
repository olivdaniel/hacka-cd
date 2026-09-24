# Contrato do chat unificado

## Endpoint remoto

```http
POST /aws-bedrock
Content-Type: application/json
x-api-key: <somente no backend>
```

Use `EXPERIMENTAL_LAB_REQUEST_TIMEOUT_SECONDS`, com padrão de 60 segundos, em
todas as chamadas. Converta `requests.Timeout` em `CHAT_TIMEOUT` e não faça retry
automático no cliente local.

Payload com índice explícito:

```json
{
  "action": "chat",
  "vectorIndexName": "documentos-treinamento",
  "messages": [
    {
      "role": "user",
      "content": [{"text": "Pergunta"}]
    }
  ],
  "system": [{"text": "Política fixa"}],
  "ragConfig": {
    "source": "s3-vectors",
    "topK": 3
  }
}
```

Para o índice padrão, omita `vectorIndexName`. Não envie `null`.

O navegador representa o padrão por uma opção interna, não pelo nome remoto. O
nome efetivo é conhecido somente pela resposta `indexName`.

## Regras

### `messages`

- ao menos uma mensagem;
- papéis `user` e `assistant`;
- ao menos um bloco `text` não vazio;
- ordem cronológica;
- até seis interações anteriores;
- pergunta atual como última mensagem `user`.

Quando `query` é omitida, somente o primeiro bloco de texto da última mensagem
`user` orienta a busca. A solução local usa um bloco por mensagem.

### `system`

Envie um bloco com a política fixa da skill. Ele:

- não vem do navegador;
- não entra no histórico;
- não é registrado;
- é enviado em todas as chamadas.

### `ragConfig`

Envie:

```json
{
  "source": "s3-vectors",
  "topK": 3
}
```

Não envie `query`.

### Campos ausentes

Não envie `stream`, `inferenceConfig`, campos de upload ou campos extras.

### Modelo de conversa

Por padrão, omita `modelId` para usar o modelo preferido configurado na API.
Não pergunte proativamente sobre modelos.

Somente uma solicitação explícita do participante pode definir em `agent.py`
uma configuração fixa:

| Nome | `modelId` |
| --- | --- |
| Claude Sonnet 4.5 | `us.anthropic.claude-sonnet-4-5-20250929-v1:0` |
| Claude Haiku 4.5 | `us.anthropic.claude-haiku-4-5-20251001-v1:0` |

Quando configurado, inclua o ID exato no payload remoto. A escolha nunca é
campo da rota local, controle da interface ou conteúdo interpretado da
conversa. Nunca envie `modelId: null`, `modelName`, `model`, string vazia ou ID
desconhecido. Rejeite configuração inválida no cliente local antes de invocar
`requests.Session.post`.

## Resposta remota

Além da resposta Converse:

```json
{
  "indexName": "indice-tentado",
  "ragApplied": true,
  "ragFallbackReason": null
}
```

Combinações válidas:

| `ragApplied` | `ragFallbackReason` | Significado |
| --- | --- | --- |
| `true` | `null` | documentos recuperados |
| `false` | `default_index_not_found` | índice padrão ausente |
| `false` | `no_results` | busca sem resultados |

Rejeite qualquer outra combinação.

Quando a requisição contém índice explícito:

- `indexName` deve ser idêntico ao solicitado;
- `default_index_not_found` é inválido;
- valide essas condições antes de gravar a conversa.

Sem índice explícito, aceite o `indexName` efetivamente tentado pela API.

Extraia os textos não vazios de `output.message.content[].text` na ordem.

Não há fontes, IDs, trechos, scores ou citações. `sources` permanece `[]`.

## Endpoint local

```http
POST /api/chats/messages
Content-Type: application/json
```

Sem índice explícito:

```json
{
  "chatId": "local-...",
  "message": "Pergunta"
}
```

Com índice explícito:

```json
{
  "chatId": "local-...",
  "message": "Pergunta",
  "vectorIndexName": "documentos-treinamento"
}
```

Reutilize as validações existentes. `vectorIndexName`, quando presente:

- tem entre 3 e 63 caracteres;
- não contém whitespace;
- não é normalizado;
- precisa estar no cache de sucessos da Skill 04.

## Resposta local

```json
{
  "chatId": "local-...",
  "answer": "Resposta completa",
  "sources": [],
  "indexName": "indice-tentado",
  "ragApplied": true,
  "ragFallbackReason": null
}
```

Use allowlist.

## Erros locais

| Situação | HTTP | `code` |
| --- | ---: | --- |
| requisição inválida | `400` | `INVALID_CHAT_REQUEST` |
| índice explícito sem sucesso local | `400` | `CHAT_INDEX_NOT_AVAILABLE` |
| `chatId` vinculado a outra seleção | `409` | `CHAT_INDEX_MISMATCH` |

## Mapeamento remoto

| HTTP/código remoto | HTTP local | `code` local |
| --- | ---: | --- |
| `400 INVALID_PAYLOAD` | `502` | `UPSTREAM_CONTRACT_ERROR` |
| `401 UNAUTHORIZED` | `502` | `UPSTREAM_AUTHENTICATION_FAILED` |
| `404 VECTOR_INDEX_NOT_FOUND` | `404` | `VECTOR_INDEX_NOT_FOUND` |
| `429 USAGE_LIMIT_EXCEEDED` | `429` | `USAGE_LIMIT_EXCEEDED` |
| `503 RAG_UNAVAILABLE` | `503` | `RAG_UNAVAILABLE` |
| `503 STORAGE_UNAVAILABLE` | `503` | `STORAGE_UNAVAILABLE` |
| `503 AWS_SERVICE_UNAVAILABLE` | `503` | `AWS_SERVICE_UNAVAILABLE` |
| timeout local | `504` | `CHAT_TIMEOUT` |
| conexão ou TLS | `503` | `CHAT_UNAVAILABLE` |
| `500`, desconhecido ou inválido | `502` | `UPSTREAM_ERROR` |

Não copie headers, resposta ou exceção bruta.

## Memória

Associe `chatId` à seleção explícita ou ao marcador interno do índice padrão.
Valide, chame e grave dentro do mesmo lock por conversa.

Adicione pergunta e resposta somente depois de validar toda a resposta.

Em erro:

- preserve o vínculo;
- não acrescente conteúdo ao histórico;
- permita retry manual.

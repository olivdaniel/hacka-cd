# Contrato do mapa mental

## Rota local

```http
POST /api/mind-maps
Content-Type: application/json
```

Corpo máximo: 4096 bytes.

### Entrada padrão

```json
{
  "topic": "Organize os principais conceitos do documento"
}
```

### Entrada com índice explícito

```json
{
  "topic": "Organize os principais conceitos do documento",
  "vectorIndexName": "documentos-financeiros"
}
```

Campos permitidos:

| Campo | Obrigatório | Regra |
| --- | --- | --- |
| `topic` | sim | string de 1 a 500 caracteres após `strip` |
| `vectorIndexName` | não | mesmo contrato da Skill 05 |

Rejeite propriedades adicionais. O contrato local nunca aceita:

- `chatId`;
- `modelId`;
- `modelName`;
- `model`;
- `system`;
- `ragConfig`;
- `inferenceConfig`;
- `stream`.

## Chamada remota

```http
POST /aws-bedrock
Content-Type: application/json
x-api-key: configurada somente no backend
```

Payload padrão:

```json
{
  "action": "chat",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "text": "Organize os principais conceitos do documento"
        }
      ]
    }
  ],
  "system": [
    {
      "text": "política RAG fixa"
    },
    {
      "text": "instrução fixa de formato do mapa"
    }
  ],
  "ragConfig": {
    "source": "s3-vectors",
    "topK": 3
  }
}
```

Inclua `vectorIndexName` somente para índice personalizado. Inclua `modelId`
somente quando `CHAT_MODEL_ID` já possuir um ID permitido.

Nunca envie `chatId`, histórico, `query`, `stream`, `inferenceConfig`,
`modelName` ou `model`.

## Texto esperado do modelo

```json
{
  "label": "Tema central",
  "children": [
    {
      "label": "Ramo principal",
      "children": [
        {
          "label": "Detalhe"
        }
      ]
    }
  ]
}
```

O transporte remoto não garante JSON estruturado. O backend local deve tratar a
resposta como texto não confiável.

## Parse estrito

Antes de `json.loads`:

- concatene somente blocos `text` não vazios na ordem;
- rejeite conteúdo maior que 32768 bytes UTF-8.
- remova somente uma cerca Markdown externa bem-formada, com marcador `json`
  opcional e apenas whitespace fora dela;

No parse:

- permita apenas whitespace antes e depois do objeto JSON;
- rejeite chaves duplicadas com `object_pairs_hook`;
- rejeite cercas malformadas ou qualquer outra forma de Markdown;
- não extraia substring entre chaves;
- não substitua aspas;
- não acrescente propriedades;
- não tente novamente automaticamente.

## Schema local

Cada nó é um objeto com:

```text
label     obrigatório
children  opcional
```

Regras:

- nenhuma outra propriedade;
- `label` é string;
- aplique `strip` e exija de 1 a 120 caracteres;
- `children`, se presente, é lista de nós;
- raiz conta como nível 1;
- profundidade máxima 3;
- raiz possui no máximo cinco filhos;
- árvore inteira possui no máximo 25 nós;
- folhas podem omitir `children` ou usar lista vazia.

Não aceite IDs, URLs, classes, estilos, eventos, fontes ou citações como
propriedades. O conteúdo de `label` aceita qualquer texto dentro do limite; o
frontend deve neutralizá-lo com `textContent`, sem transformar URLs ou marcação
aparente em links ou HTML.

## Resposta local

```json
{
  "mindMap": {
    "label": "Tema central",
    "children": []
  },
  "indexName": "indice-efetivo",
  "ragApplied": true,
  "ragFallbackReason": null
}
```

Campos exatos:

| Campo | Tipo |
| --- | --- |
| `mindMap` | árvore validada |
| `indexName` | string não vazia |
| `ragApplied` | boolean |
| `ragFallbackReason` | `null`, `default_index_not_found` ou `no_results` |

Preserve as combinações válidas da Skill 05.

## Semântica RAG

| Situação | Resultado |
| --- | --- |
| documentos recuperados | `ragApplied=true` |
| índice padrão ausente | sucesso com `default_index_not_found` |
| busca sem resultados | sucesso com `no_results` |
| índice explícito ausente | erro `VECTOR_INDEX_NOT_FOUND` |

O frontend mostra:

```text
ragApplied=true  → Documentos consultados
ragApplied=false → Conhecimento geral
```

Não existem fontes, trechos ou citações no contrato.

## Erros locais

Envelope:

```json
{
  "error": {
    "code": "INVALID_MIND_MAP_RESPONSE",
    "message": "Não foi possível gerar um mapa mental válido."
  }
}
```

| Situação | Status | Código |
| --- | ---: | --- |
| entrada inválida | `400` | `INVALID_REQUEST` |
| índice explícito indisponível | `404` | `VECTOR_INDEX_NOT_FOUND` |
| saída estrutural inválida | `502` | `INVALID_MIND_MAP_RESPONSE` |
| autenticação remota | `502` | `UPSTREAM_AUTHENTICATION_FAILED` |
| limite de uso | `429` | `USAGE_LIMIT_EXCEEDED` |
| indisponibilidade | `503` | código seguro existente |
| timeout | `504` | `MIND_MAP_TIMEOUT` |

Normalize os códigos remotos `RATE_LIMIT_EXCEEDED`,
`TOKEN_QUOTA_EXCEEDED`, `RATE_LIMIT_UNAVAILABLE` e
`USAGE_LIMIT_EXCEEDED` para o erro local `429 USAGE_LIMIT_EXCEEDED`.

Nunca inclua o texto inválido do modelo no erro ou nos logs.

## Contrato com o renderizador

O contrato HTTP termina na árvore JSON acima. Markdown, Mermaid e Markmap não
fazem parte da API.

O frontend converte cada nó validado em:

```javascript
{
  content: escapeHtml(node.label),
  children: node.children.map(toMarkmapNode)
}
```

`escapeHtml` codifica `&`, `<`, `>`, `"` e `'`. Não inclua outros campos,
plugins, links ou HTML.

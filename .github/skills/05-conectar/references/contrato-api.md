# Contrato da API — Skill 02

Este documento contém somente as operações necessárias para conectar e
conversar nesta etapa.

## Endpoint

```http
POST {EXPERIMENTAL_LAB_API_URL}
Content-Type: application/json
x-api-key: {EXPERIMENTAL_LAB_API_KEY}
```

`EXPERIMENTAL_LAB_API_URL` deve ser a URL completa terminando em
`/aws-bedrock`.

O endpoint completo reúne duas partes que precisam estar corretas
independentemente:

- o hostname oficial, que deve corresponder ao certificado TLS;
- o caminho `/aws-bedrock`, que seleciona a rota da API.

Adicionar o caminho correto a um hostname incompatível não corrige o
certificado.

Antes da chamada, valide sem imprimir o valor:

- esquema `https`;
- hostname presente;
- caminho terminando em `/aws-bedrock`;
- ausência de credenciais embutidas;
- ausência de query string e fragmento.

## Timeout

Todas as chamadas autenticadas ao Experimental Lab usam:

```dotenv
EXPERIMENTAL_LAB_REQUEST_TIMEOUT_SECONDS=60
```

- variável ausente: usar `60`;
- valor presente: aceitar somente inteiro decimal positivo;
- passar explicitamente o valor em cada chamada `requests`;
- converter `requests.Timeout` em erro local seguro;
- não repetir automaticamente.

Em `requests`, esse valor limita espera de conexão e períodos sem leitura; não é
uma garantia de duração total rígida.

Não aplique esse valor ao transporte S3 nem à leitura local de arquivos.

## Verificar disponibilidade

Requisição:

```json
{
  "action": "health"
}
```

Sucesso:

```json
{
  "status": "ok"
}
```

## Conversar

Requisição mínima:

```json
{
  "action": "chat",
  "system": [
    {
      "text": "Política fixa de prioridade documental e fallback"
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "text": "Pergunta do participante"
        }
      ]
    }
  ]
}
```

`chat` é a única action de mensagens. Ela sempre tenta recuperação:

- sem `vectorIndexName`, consulta o índice padrão;
- com resultados, responde com contexto documental;
- se o índice padrão não existir ou não retornar resultados, usa conhecimento
  geral;
- a escolha explícita de índice será adicionada na Skill 05.

Com memória ativa, `messages` pode conter:

- até seis interações anteriores completas;
- mensagens alternadas com papel `user` e `assistant`;
- a pergunta atual como última mensagem, com papel `user`.

Exemplo de continuidade:

```json
{
  "action": "chat",
  "system": [
    {
      "text": "Política fixa de prioridade documental e fallback"
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": [{"text": "Explique o conceito A."}]
    },
    {
      "role": "assistant",
      "content": [{"text": "Explicação anterior."}]
    },
    {
      "role": "user",
      "content": [{"text": "Pode dar um exemplo?"}]
    }
  ]
}
```

Nesta etapa:

- use somente os papéis `user` e `assistant`;
- preserve a ordem cronológica;
- não envie mais de seis interações anteriores;
- não envie `stream`;
- omita `modelId` por padrão;
- envie somente o `system` fixo definido pela skill;
- não envie `vectorIndexName`, `ragConfig` ou campos de upload;
- não trate ausência de `ragConfig` como garantia de chat direto.

### Modelo de conversa

O modelo preferido é o default configurado na API. Para usá-lo, não envie
`modelId`.

Não pergunte proativamente sobre modelos. Somente quando o participante pedir
explicitamente uma configuração fixa, `agent.py` pode enviar um destes valores:

| Nome | `modelId` |
| --- | --- |
| Claude Sonnet 4.5 | `us.anthropic.claude-sonnet-4-5-20250929-v1:0` |
| Claude Haiku 4.5 | `us.anthropic.claude-haiku-4-5-20251001-v1:0` |

A escolha não vem do navegador, da rota local nem do texto da conversa. Use
uma constante interna opcional: `None` significa omitir o campo; um ID permitido
significa incluí-lo em todas as chamadas de chat. Nunca envie `modelId: null`,
`modelName`, `model`, `inferenceConfig`, string vazia ou ID desconhecido.

Se o participante solicitar outro modelo, apresente as opções suportadas e não
invoque `requests.Session.post` até que ele escolha uma delas.

## Extrair a resposta

O texto está nos blocos:

```text
output.message.content[].text
```

Concatene apenas os campos `text` não vazios, preservando a ordem.

A resposta também contém:

```json
{
  "indexName": "indice-tentado",
  "ragApplied": true,
  "ragFallbackReason": null
}
```

Valide:

- `ragApplied` como booleano;
- `ragFallbackReason` como `null`, `default_index_not_found` ou `no_results`;
- `ragApplied=true` exige `ragFallbackReason=null`;
- `ragApplied=false` exige um motivo conhecido.

Nesta skill, esses campos ainda não são exibidos. A Skill 05 os usará para
mostrar `Documentos consultados` ou `Conhecimento geral`.

## Erros

Formato:

```json
{
  "error": {
    "code": "CODIGO",
    "message": "Mensagem"
  }
}
```

Estados relevantes:

| HTTP | Tratamento local |
| --- | --- |
| `400` | Requisição inválida |
| `401` ou `403` | Falha de autenticação |
| `422` | Contrato rejeitado |
| `429` | Limite atingido; não repetir automaticamente |
| `500` ou `503` | Serviço indisponível |

Não encaminhe resposta bruta, headers ou detalhes internos ao navegador.

## TLS

A validação TLS permanece obrigatória.

- Não use `verify=False` por padrão.
- Hostname incompatível indica URL incorreta para o certificado apresentado.
- Certificado não confiável indica configuração de confiança do ambiente.
- Não transforme erro TLS em indisponibilidade genérica antes de classificá-lo
  para o diagnóstico local.
- Não deduza a causa exata apenas de `CERTIFICATE_VERIFY_FAILED`; procure uma
  indicação explícita de hostname, cadeia/emissor ou validade.

| Categoria | Indício típico | Correção segura |
| --- | --- | --- |
| Hostname | `hostname mismatch` | Usar o domínio oficial coberto pelo certificado |
| Cadeia de confiança | `unable to get local issuer certificate` | Usar o bundle de CA oficial da organização |
| Validade | `certificate has expired` ou `not yet valid` | Corrigir relógio ou certificado na origem |
| Não classificado | Somente `CERTIFICATE_VERIFY_FAILED` | Solicitar endpoint oficial ou apoio responsável |

DNS interno ou direto de Load Balancer não deve ser tratado automaticamente
como endpoint oficial, mesmo que esteja acessível e tenha `/aws-bedrock`.

### Verificação temporariamente desativada

O cliente pode usar `verify=False` apenas quando
`EXPERIMENTAL_LAB_VERIFY_TLS` for exatamente `false` para o ALB provisório.

Essa exceção:

- não pode ser fallback automático de uma falha TLS;
- não pode desativar `InsecureRequestWarning`;
- não deve criar um estado visual adicional;
- não altera o JSON enviado ao endpoint remoto.

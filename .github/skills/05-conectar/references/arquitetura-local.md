# Arquitetura local — Skill 02

## Componentes

```text
web/app.js
  │ POST /api/chats/messages
  │ JSON
  ▼
serve.py
  │ agent.ask(chat_id, message)
  ▼
agent.py
  │ LangChain Runnable
  │ requests + x-api-key
  ▼
POST /aws-bedrock
```

## Responsabilidades

### `web/app.js`

- Coleta a mensagem.
- Consulta `GET /api/health` ao carregar.
- Atualiza o chip visual de conexão.
- Exibe espera.
- Chama somente o servidor local.
- Recebe JSON completo.
- Atualiza o histórico visual.
- Nunca conhece URL remota ou API key.

### `serve.py`

- Serve `web/`.
- Valida o contrato local.
- Chama `agent.py`.
- Traduz falhas para HTTP seguro.
- Não contém credenciais.

### `agent.py`

- Carrega configuração do ambiente.
- Representa mensagens com LangChain.
- Monta a action unificada `chat`.
- Envia uma política `system` fixa de prioridade documental e fallback.
- Omite `modelId` para usar o default da API ou, somente após solicitação
  explícita do participante, envia um ID suportado como configuração fixa.
- Chama o Experimental Lab com `requests`.
- Extrai e devolve a resposta completa.

O navegador e `serve.py` não recebem configuração de modelo. O texto da
conversa também não altera o modelo escolhido.

Mesmo sem índice explícito, `chat` tenta o índice padrão. Se ele não existir ou
não retornar resultados, a Lambda usa conhecimento geral. A Skill 02 não
oferece seleção de índice nem exibe os metadados de RAG; isso pertence à
Skill 05.

## Papel do LangChain

No checkpoint 4A, a Skill 02 usa uma composição `Runnable` determinística do
pacote oficial `langchain-core`:

```text
texto → HumanMessage → chamada da API → AIMessage → texto
```

Isso é uma fundação para evoluções futuras, mas ainda não é um agente autônomo:

- não há ferramentas;
- ainda não há memória;
- não há decisões em loop;
- não há chamada direta a um provedor de modelo.

Essa distinção deve ser explicada ao participante.

## Memória no checkpoint 4B

A memória é local ao processo Python:

```text
chatId
  → InMemoryChatMessageHistory
  → últimas 6 interações
  → RunnableWithMessageHistory
  → payload da action chat
```

- Cada `chatId` possui contexto isolado.
- Uma interação corresponde a um par `user` + `assistant`.
- O payload contém no máximo seis interações anteriores e a pergunta atual.
- A memória não é persistida e desaparece ao encerrar `serve.py`.
- Uma nova conversa usa outro `chatId` e começa vazia.
- O histórico visual do navegador e a memória do agente são responsabilidades
  diferentes.
- A política `system` é enviada a cada chamada, mas não faz parte da memória.

## Resposta bufferizada

O servidor aguarda a Lambda terminar e devolve um único JSON. Não converta a
resposta em chunks e não use SSE.

## Indicador de conexão

O compositor da página principal apresenta quatro estados:

```text
Local → Verificando conexão... → Experimental Lab conectado
                                  └→ Erro de conexão
```

Esse indicador torna visível a evolução da Skill 02 sem alterar a identidade da
Skill 01. Ele não exibe URL, chave, código de exceção ou detalhes internos.

## Checkpoints visuais

O indicador não deve surgir pronto em uma única edição:

1. **Local:** criado junto com `serve.py`; o participante inicia o servidor e
   confirma o estado.
2. **Verificando:** a função visual é adicionada, mas a chamada ainda não é
   conectada; o participante atualiza a página e observa o estado intermediário.
3. **Resultado real:** `GET /api/health` é conectado e produz `Conectado` ou
   `Erro`.
4. **Recuperação:** se houver erro, o participante corrige `.env`, reinicia
   manualmente e observa `Conectado`.

Entre alterações em Python, o participante encerra o servidor com `Ctrl+C` e o
inicia novamente no terminal integrado. O agente fornece o comando, mas não
mantém o processo em segundo plano.

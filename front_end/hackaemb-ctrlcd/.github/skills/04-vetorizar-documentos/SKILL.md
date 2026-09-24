---
name: 04-vetorizar-documentos
description: Conduz a vetorização dos documentos enviados na Skill 03 em quatro checkpoints para uma prática de aproximadamente uma hora.
---

# 04 — Vetorizar documentos

## Objetivo

Evolua a solução aprovada na Skill 03 para transformar uploads concluídos em
vetores por meio da action `vectorize`.

Ao final, o participante consegue:

- escolher o índice padrão ou informar um índice personalizado;
- escolher os documentos de um lote;
- vetorizar os selecionados em fila;
- continuar quando um item falhar;
- repetir manualmente o par documento–índice com erro;
- vetorizar o mesmo documento em índices diferentes.

A Skill 04 termina na vetorização. A Skill 05 usará a action unificada `chat`
para conversar com os índices.

Leia antes de começar:

- `references/arquitetura-vetorizacao.md`;
- `references/contrato-vetorizacao.md`;
- `references/seguranca-vetorizacao.md`.

As referências são normativas. Consulte a seção necessária durante a
implementação, sem reapresentar todo o conteúdo ao participante.

## Duração e ritmo

Conduza a prática em aproximadamente 60 minutos:

| Etapa | Tempo de referência |
| --- | ---: |
| Preflight | 3 min |
| Checkpoint 1 — Preparar o lote | 10 min |
| Checkpoint 2 — Vetorizar ponta a ponta | 18 min |
| Checkpoint 3 — Processar lote resiliente | 13 min |
| Checkpoint 4 — Múltiplos índices e retry | 15 min |
| Encerramento | 1 min |

Os tempos orientam o ritmo, não justificam pular validações. Evite explicações
longas antes de produzir uma evidência visível.

## Pré-condições

Antes de editar, faça um preflight curto e confirme:

- `serve.py` e `agent.py` existem e compilam;
- health, chat e memória funcionam;
- upload individual, fila, retry e pasta funcionam;
- cada item concluído mantém `itemId` e `objectKey`;
- o `itemId` é o UUID enviado como `X-Upload-Id`;
- `serve.py` mantém `itemId/X-Upload-Id → objectKey` em memória.

Se a Skill 03 estiver incompleta, pare e indique exatamente o checkpoint
pendente. Não gere outro UUID e não aceite um `objectKey` livre do navegador.

Não abra `.env`.

## Invariantes

- Preserve todas as funcionalidades aprovadas nas Skills 01–03.
- Preserve integralmente `#pageHacka/#hackaSlot` e
  `#pageExperiment/#experimentSlot`; vetorização permanece no fluxo principal.
- O navegador chama somente o servidor local.
- A API key permanece somente em `agent.py`.
- Um clique captura o destino — padrão ou personalizado — e uma lista imutável
  de itens.
- O backend resolve o `objectKey` pelo `itemId`.
- Upload e vetorização mantêm estados independentes.
- O histórico usa o par documento–índice.
- A fila é FIFO e mantém uma requisição ativa por vez.
- Falha de um item não interrompe os demais.
- Retry é manual e preserva documento e destino.
- O mesmo documento pode pertencer a índices diferentes.
- O mesmo par concluído não é enviado novamente.
- A chamada é síncrona: não invente percentual, polling ou streaming.
- Vetorização não reenvia bytes do arquivo.
- Não implemente `upload_and_vectorize`, listagem do S3, listagem remota de
  índices ou conversa com documentos.
- Não adicione dependências.
- O participante inicia e reinicia `serve.py`.

## Protocolo de execução

Execute somente um checkpoint por vez.

Antes da aprovação:

1. informe o nome do checkpoint;
2. resuma a entrega em até cinco itens;
3. faça uma única pergunta de aprovação;
4. não edite arquivos.

Depois da aprovação:

1. não reapresente o plano;
2. execute toda a fatia vertical do checkpoint sem novas aprovações internas;
3. leia somente os arquivos envolvidos;
4. altere o código imediatamente;
5. execute as validações;
6. mostre a evidência visível;
7. peça aprovação para o próximo checkpoint e pare.

Se uma validação falhar:

1. permaneça no checkpoint atual;
2. informe uma única causa comprovada;
3. corrija somente o código relacionado;
4. repita a mesma validação;
5. não replaneje a skill nem avance.

Não investigue RAG, recuperação ou citações durante esta skill.

## Resumo ao concluir cada checkpoint

Depois de implementar e validar cada checkpoint, antes da pergunta de aprovação
do próximo, apresente o título `O que alcançamos` seguido de um a cinco tópicos.

- Descreva resultados concretos que já funcionam, não tarefas executadas.
- Use linguagem curta e acessível para iniciantes.
- Inclua evidência de validação quando ela ajudar a confirmar o resultado.
- Não misture pendências, plano futuro ou conteúdo do próximo checkpoint.
- No modo acelerado do instrutor, mostre o mesmo resumo e avance sem aguardar.

## Detecção e retomada

Inspecione somente:

- `serve.py`;
- `agent.py`;
- `upload_config.py`;
- `web/index.html`;
- `web/styles.css`;
- `web/app.js`;
- testes de upload e vetorização.

| Evidência | Próximo checkpoint |
| --- | --- |
| Skill 03 incompleta | parar e concluir a Skill 03 |
| não existe seleção associada ao índice | 1 |
| lote visual existe, mas um TXT ainda não vetoriza | 2 |
| um documento vetoriza, mas a fila resiliente não | 3 |
| fila funciona, mas múltiplos índices ou retry não | 4 |
| jornada completa funciona | encerrar |

Elementos visuais não comprovam integração real. Uma resposta HTTP isolada não
comprova fila, histórico ou retry.

## Validação técnica

Use o mesmo interpretador escolhido na Skill 02. Não misture Python do Windows
e do WSL.

No WSL:

```bash
.venv/bin/python -m py_compile agent.py serve.py
.venv/bin/python -m unittest discover -s tests -p "test_vectorization_*.py"
```

No Windows:

```powershell
.\.venv\Scripts\python.exe -m py_compile agent.py serve.py
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_vectorization_*.py"
```

Execute somente o bloco do ambiente estabelecido. Use:

```text
tests/test_vectorization_agent.py
tests/test_vectorization_server.py
```

Não crie uma ferramenta nova de testes de frontend. Valide os comportamentos
visuais na prática e mantenha as regras puras do backend cobertas por
`unittest`.

## Estados visuais

O estado do upload continua sendo o da Skill 03.

Para cada documento e índice:

| Estado | Texto |
| --- | --- |
| `ready` | `Pronto para vetorizar` |
| `queued` | `Na fila` |
| `vectorizing` | `Vetorizando` |
| `vectorized` | `Vetorizado` |
| `error` | `Erro na vetorização` |

Use texto e `data-status`; cor não pode ser o único indicador.

## Checkpoint 1 — Preparar o lote

### Entrega

Altere somente `web/index.html`, `web/styles.css` e `web/app.js`.

Implemente em uma única etapa:

- seção `Índice de destino`;
- seletor com `Índice padrão` e `Índice personalizado`;
- campo editável com sugestões, visível somente para índice personalizado;
- checkbox por upload concluído;
- seleção automática dos itens elegíveis;
- botão `Vetorizar selecionados (N)`.

Inicie com `Índice padrão`. Nesse modo:

- não solicite nem mostre um nome;
- considere o destino válido;
- represente a seleção com uma constante interna exclusiva;
- não use a string visível `Índice padrão` como nome remoto;
- omita `vectorIndexName` da requisição.

No modo `Índice personalizado`, o nome:

- é preservado exatamente;
- tem de 3 a 63 caracteres;
- não aceita nenhum caractere de espaço;
- diferencia maiúsculas e minúsculas;
- não sofre `trim` ou correção silenciosa.

Modele o histórico de cada item com `Map`. Use uma constante interna como chave
do padrão e o nome exato como chave do personalizado. Não use string vazia,
`null` serializado ou a legenda visível como chave remota. Não use objeto
JavaScript comum para nomes controlados pelo usuário.

Um item é elegível quando:

- o upload está concluído;
- possui o `itemId` original;
- o destino é padrão ou o nome personalizado é válido;
- o mesmo par ainda não foi concluído;
- não está em uma operação ativa.

Itens elegíveis começam marcados, e o participante pode desmarcá-los. Sucesso
em outro índice não remove a elegibilidade.

Crie opções e textos com APIs do DOM, `value` e `textContent`. Não use
`innerHTML` com o índice.

### Evidência e aceite

Sem fazer requisição:

1. confirme `Índice padrão`, sem campo de nome e com itens elegíveis;
2. confirme seleção automática e contador;
3. desmarque um item;
4. escolha `Índice personalizado` e confirme que o campo aparece;
5. confirme rejeição de nome curto, longo e com espaço;
6. informe um nome válido e confirme nova elegibilidade;
7. retorne ao padrão sem precisar digitar um nome.

Explique em até dois minutos a diferença entre upload e índice. Peça aprovação
para o Checkpoint 2 e pare.

## Checkpoint 2 — Vetorizar um documento ponta a ponta

### Entrega

Conecte um TXT pequeno e não confidencial da interface ao Experimental Lab.

Implemente a fatia na ordem abaixo, sem aprovações intermediárias.

#### 1. Cliente remoto

Em `agent.py`, crie uma operação equivalente a:

```python
vectorize_document(
    object_key: str,
    vector_index_name: str | None = None,
)
```

Para o padrão, envie:

```json
{
  "action": "vectorize",
  "objectKey": "uploads/uuid.txt"
}
```

Para o personalizado, acrescente `vectorIndexName`. Nunca envie `null`, string
vazia ou `Índice padrão`.

Valide estritamente a resposta. Para personalizado, `indexName` deve ser
idêntico ao solicitado. Para padrão, aceite o nome efetivo válido retornado.
Reuse o cliente autenticado e a política de TLS do ALB. Não use o transporte S3
e não envie o arquivo. A chamada usa
`EXPERIMENTAL_LAB_REQUEST_TIMEOUT_SECONDS`, com padrão de 60 segundos.

#### 2. Rota local

Em `serve.py`, adicione:

```http
POST /api/vectorizations
Content-Type: application/json
```

Entrada:

```json
{
  "itemId": "mesmo-uuid-usado-em-X-Upload-Id"
}
```

O servidor:

- exige `Content-Type: application/json`;
- exige `Content-Length` entre 1 e 1024 bytes;
- rejeita excesso antes da leitura;
- aceita exatamente `itemId` e o `vectorIndexName` opcional;
- rejeita `vectorIndexName: null`, vazio ou campos extras;
- valida UUID e, quando presente, o índice personalizado;
- resolve o `objectKey` pelo mapa da Skill 03;
- rejeita `itemId` desconhecido;
- chama `agent.vectorize_document`;
- projeta a resposta por allowlist;
- usa o envelope e os erros da referência de contrato.

Use `None` somente internamente para representar o padrão. O payload remoto
omite a propriedade.

Resposta:

```json
{
  "itemId": "mesmo-uuid-usado-em-X-Upload-Id",
  "status": "vectorized",
  "fileType": "txt",
  "totalChunks": 4,
  "totalVectorsStored": 4,
  "indexName": "documentos-treinamento",
  "indexCreated": false
}
```

Não devolva `objectKey`, `sourceFile`, buckets, modelo ou resposta remota bruta.

#### 3. Interface

Com `Índice padrão` e somente o TXT marcado:

- capture o destino e a seleção;
- bloqueie índice, seleção e botão;
- mostre `Na fila` e depois `Vetorizando`;
- chame a rota local;
- registre o resultado na chave interna do padrão;
- mostre `Índice padrão`, o `indexName` efetivo, chunks e vetores;
- desbloqueie a interface em `finally`.

### Testes obrigatórios

Cubra automaticamente:

- payload remoto exato e sem bytes;
- padrão omite `vectorIndexName`;
- personalizado envia `vectorIndexName` exato;
- `null`, vazio e legenda visível nunca são enviados;
- índice e `objectKey` inválidos;
- resposta remota válida e inválida;
- `Content-Type`, `Content-Length`, JSON e campos;
- `itemId` conhecido e desconhecido;
- resolução server-side do `objectKey`;
- projeção da resposta;
- todos os mapeamentos de erro da referência;
- resposta `429 USAGE_LIMIT_EXCEEDED` convertida sem retry automático.
- timeout do ALB usa o padrão de 60 segundos e vira
  `VECTORIZATION_TIMEOUT`.

Execute compilação e testes. Em seguida, reinicie `serve.py`, atualize a página
e faça a primeira vetorização real pela interface. Não execute smoke test
separado.

### Evidência e aceite

Confirme:

- upload continua `Concluído`;
- vetorização mostra `Índice padrão` e o nome efetivo retornado;
- chunks e vetores são positivos e iguais;
- `objectKey`, API key e campos proibidos não aparecem;
- nome de índice com aparência de HTML é exibido literalmente.

Peça aprovação para o Checkpoint 3 e pare.

## Checkpoint 3 — Processar um lote resiliente

### Entrega

Evolua a operação individual para uma fila FIFO.

No frontend:

- capture cópias imutáveis do destino, nome opcional e itens marcados;
- processe com `await` dentro de um laço;
- mantenha no máximo uma requisição ativa;
- use `try/catch` por item;
- continue depois de erro;
- não use `Promise.all`;
- apresente o resumo final.

No backend:

- use um `threading.BoundedSemaphore(1)` exclusivo para vetorização;
- mantenha sucessos por `(itemId, requestedIndexName)`, usando `None`
  internamente para o padrão;
- adquira o semáforo antes de consultar o cache;
- devolva sucesso conhecido ou chame o agente;
- armazene sucesso antes de liberar;
- não armazene falhas como sucesso;
- não bloqueie health, chat, upload ou arquivos estáticos.

O limite remoto varia por ambiente. Ao receber `429`:

- marque somente o item como erro;
- continue a fila;
- não aguarde nem repita automaticamente.

### Testes obrigatórios

Cubra automaticamente:

- cache separado para dois índices;
- repetição de sucesso sem nova chamada;
- falha fora do cache;
- duas chamadas concorrentes do mesmo par geram uma chamada ao agente;
- operações diferentes permanecem serializadas;
- health não depende do semáforo;
- `429` não inicia retry automático.

Valide A conclui, B falha e C conclui com respostas simuladas. Use a interface
real apenas dentro dos limites disponíveis no ambiente; não provoque chamadas
extras para demonstrar um rate limit.

### Evidência e aceite

Confirme visualmente:

```text
A — Vetorizado
B — Erro na vetorização
C — Vetorizado
```

O upload de B permanece concluído e C não é bloqueado. O resumo informa
sucessos e erros. Peça aprovação para o Checkpoint 4 e pare.

## Checkpoint 4 — Múltiplos índices, retry e aceite

### Entrega

Complete a experiência:

- mantenha `Índice padrão` como opção fixa;
- inclua somente nomes personalizados nas sugestões da sessão;
- remova duplicados somente por igualdade exata;
- recalcule e marque elegíveis ao trocar de índice;
- preserve todos os resultados por documento–índice;
- mostre `Tentar novamente` em cada registro com erro;
- reenvie pelo mesmo worker FIFO;
- preserve `itemId` e o destino original no retry;
- incremente `attempts`;
- não dependa do índice atualmente digitado.

Uma chamada pode falhar após trabalho remoto parcial. Não prometa rollback,
transação ou execução exatamente uma vez.

Use `textContent` e `value` em toda renderização de nomes e resultados.

### Jornada final

1. vetorize A e B no padrão sem digitar um nome;
2. escolha personalizado e vetorize A em `indice-um`;
3. confirme os dois resultados de A;
4. volte ao padrão;
5. confirme A e B inelegíveis nesse destino;
6. simule erro de C em `indice-um`;
7. altere o campo para outro nome;
8. use o retry de C;
9. confirme que o retry permaneceu em `indice-um`.

### Aceite final

Confirme também:

- health, chat, memória, upload, retry de upload e pasta continuam funcionando;
- somente itens marcados entram no lote;
- padrão funciona sem nome e omite `vectorIndexName`;
- personalizado continua exigindo nome válido;
- nenhum byte é reenviado na vetorização;
- duas chamadas concorrentes do mesmo par fazem uma chamada remota;
- repetir sucesso não chama o remoto;
- falha não apaga sucesso em outro índice;
- `429` não dispara retry automático;
- índice com aparência de HTML é exibido literalmente;
- logs e UI não expõem dados proibidos;
- não existe polling, paralelismo, `upload_and_vectorize` ou conversa.

Execute compilação e testes uma última vez.

Apresente em até um minuto:

- diferença entre upload e vetorização;
- índices usados;
- estado mantido apenas na página e no processo local;
- Skill 05 usará um desses índices para conversar com os documentos.

Peça aprovação final e pare.

## Limites desta skill

Não implemente:

- listagem de objetos do S3;
- listagem, exclusão ou descoberta remota de índices;
- exclusão de vetores;
- persistência após reiniciar `serve.py` ou atualizar a página;
- progresso percentual;
- cancelamento de chamada em andamento;
- RAG, busca, recuperação ou citações.

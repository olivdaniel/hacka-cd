# Arquitetura da vetorização

## Fluxo

```text
navegador
  → POST /api/vectorizations com itemId + vectorIndexName opcional
  → serve.py resolve itemId/X-Upload-Id → objectKey
  → agent.py envia action=vectorize
  → Experimental Lab lê o objeto do S3
  → Experimental Lab extrai, divide e armazena vetores
  → serve.py reduz a resposta
  → navegador registra o resultado por documento + índice
```

O navegador não envia novamente o arquivo e não chama diretamente o
Experimental Lab.

## Responsabilidades

### Navegador

- escolhe índice padrão ou personalizado;
- valida antecipadamente a experiência;
- sugere índices usados na sessão;
- seleciona documentos elegíveis;
- captura lotes imutáveis;
- mantém a fila FIFO;
- exibe estados e resultados;
- guarda um histórico por documento–índice;
- continua após falhas;
- inicia retry manual.

### `serve.py`

- valida o JSON e o índice opcional;
- resolve `itemId` no estado da Skill 03;
- rejeita uploads desconhecidos;
- serializa vetorizacões sem bloquear outras rotas;
- chama `agent.py`;
- mantém cache de sucessos por upload e índice;
- devolve somente resposta segura.

### `agent.py`

- valida a fronteira remota;
- usa URL, API key e TLS configurados para o Experimental Lab;
- envia `action: vectorize`;
- valida a resposta;
- transforma falhas remotas em erros seguros;
- não conhece seleção, fila ou DOM.

### Experimental Lab

- lê do S3 o objeto indicado;
- extrai conteúdo conforme o formato;
- divide o conteúdo;
- gera embeddings;
- cria o índice quando necessário;
- armazena vetores;
- devolve resultado síncrono.

## Identidades

Há três identidades diferentes:

| Identidade | Escopo |
| --- | --- |
| `itemId` | UUID local enviado como `X-Upload-Id` na Skill 03 |
| `objectKey` | chave remota resolvida somente no backend |
| `requestedIndexName` | `None` para padrão ou nome personalizado |
| `indexName` | nome efetivo devolvido pelo Experimental Lab |

A rota local recebe `itemId`, não um `objectKey` livre. Esse valor é exatamente
o mesmo UUID enviado como `X-Upload-Id` na Skill 03. O backend usa o mapeamento
já criado para encontrar a chave remota. Não existe uma segunda identidade.

## Estado do item

Upload e vetorização são independentes:

```text
item
├── itemId
├── uploadStatus
├── objectKey
└── vectorizations: Map
    ├── DEFAULT_INDEX_KEY → resultado
    └── indice-um → resultado
```

Use uma constante exclusiva como `DEFAULT_INDEX_KEY` e `Map` para nomes
fornecidos pelo usuário. Não use string vazia ou a legenda visível como chave.

Um resultado contém apenas:

```text
status
fileType
totalChunks
totalVectorsStored
indexName
indexCreated
attempts
errorCode
```

`indexName` e `indexCreated` são metadados do resultado. A identidade da seleção
continua sendo `DEFAULT_INDEX_KEY`/`None` para o padrão ou o nome personalizado
solicitado.

## Elegibilidade

Um item é elegível quando:

- o upload está concluído;
- existe `itemId`;
- o destino é padrão ou o nome personalizado é válido;
- não existe sucesso para o mesmo índice;
- não está em uma operação ativa.

Sucesso em outro índice não remove a elegibilidade.

O padrão começa ativo e não exige nome. Quando um destino válido é ativado, os
elegíveis são marcados automaticamente. O participante pode desmarcar itens.

## Lote

O clique em `Vetorizar selecionados` captura:

```text
batchRequestedIndexName
selectedItemIds
```

Esses valores não mudam se o campo for alterado depois. Durante o lote, bloqueie
o campo e as seleções.

A fila usa um laço sequencial. Não use paralelismo:

```text
A → sucesso
B → erro
C → sucesso
```

O erro de B é registrado e C continua.

## Múltiplos índices

O mesmo documento pode ter sucesso em mais de um índice. O resultado deve ser
associado ao par:

```text
(itemId, requestedIndexName)
```

Não use somente `itemId` como chave do cache ou do estado visual.

O payload omite `vectorIndexName` quando `requestedIndexName` representa o
padrão. Para personalizado, envia o nome exato. O resultado sempre preserva o
`indexName` efetivo devolvido.

## Concorrência e cache

O backend usa a mesma ordem para todas as operações:

```text
adquirir semáforo
  → consultar cache do par
  → chamar remoto somente se necessário
  → armazenar sucesso
  → liberar semáforo
```

Consultar o cache antes da exclusão não é suficiente: duas requisições podem
observar ausência simultaneamente. Falhas não entram no cache de sucesso.

O padrão é uma opção fixa. As sugestões personalizadas são apenas os nomes
digitados na página atual; elas não representam índices descobertos na AWS.

## Sincronia

`vectorize` é síncrono. Durante uma chamada, a única observação correta é
`Vetorizando`.

Não invente:

- percentual;
- número parcial de chunks;
- polling;
- job remoto;
- conclusão em segundo plano.

## Limite de requisições

O rate limit pertence ao ambiente remoto e pode mudar por implantação. Não
assuma uma quantidade ou janela fixa no material do participante.

- não use essa quantidade como constante do frontend;
- trate `429 USAGE_LIMIT_EXCEEDED` como falha do item;
- não espere nem repita automaticamente;
- teste tolerância da fila com respostas simuladas;
- no teste real, permita retry manual após a janela informada.

## Estado em memória

Lista de uploads, sugestões, histórico visual e cache local duram somente
enquanto seus respectivos processos permanecem ativos.

- atualizar a página pode perder o estado do navegador;
- reiniciar `serve.py` perde o mapeamento e o cache do backend;
- a Skill 04 não reconstrói estado consultando S3 ou índices.

# Arquitetura do mapa mental

## Fluxo

```text
tema + índice
  → POST /api/mind-maps
  → generate_mind_map()
  → POST /aws-bedrock com action chat
  → texto JSON do modelo
  → parser e validador local
  → árvore por allowlist
  → conversão local com labels escapadas
  → Markmap SVG + árvore textual em #hackaSlot
```

A Lambda não conhece a funcionalidade de mapa mental. Ela continua responsável
por recuperar contexto e conversar com o modelo. O servidor local transforma a
resposta textual em um contrato específico.

## Responsabilidades

### `web/index.html`

- contém o formulário dentro de `#pageHacka`;
- oferece tema, seletor de índice, botão, status e área do mapa;
- não recebe configuração de modelo;
- não contém dados gerados previamente.
- preserva integralmente `#pageExperiment/#experimentSlot`; o mapa mental usa
  somente `#pageHacka/#hackaSlot`.

### `web/styles.css`

- dimensiona o SVG e a barra de controles;
- integra as cores do Markmap ao template;
- estiliza a estrutura textual acessível;
- mantém foco visível e layout responsivo;
- não usa estilos vindos do modelo.

### `web/app.js`

- copia inicialmente o índice ativo do chat;
- mantém seleção, mapa e expansão somente em memória;
- chama `POST /api/mind-maps`;
- converte JSON diretamente em árvore pura do Markmap;
- escapa labels antes de preencher `content`;
- controla zoom, pan, ajuste, expansão e recolhimento;
- mantém uma estrutura textual com DOM e `textContent`;
- preserva o mapa anterior em falha;
- não acessa URL remota ou credenciais.

### `web/vendor`

- contém `d3@7.9.0` e `markmap-view@0.18.12`;
- contém as licenças originais;
- é copiado dos recursos da Skill 06;
- não usa CDN nem package manager no projeto do participante.

### `serve.py`

- limita e valida o corpo;
- aceita somente `topic` e `vectorIndexName`;
- valida índice explícito no cache local;
- chama `generate_mind_map`;
- projeta a resposta por allowlist;
- traduz falhas para códigos seguros.

### `agent.py`

- reutiliza configuração, sessão, TLS e timeout;
- monta uma chamada `chat` stateless;
- preserva a política RAG;
- adiciona a instrução fixa de formato;
- extrai o texto da resposta;
- faz parse e validação estritos;
- devolve somente árvore e metadados aprovados.

### Experimental Lab

- escolhe índice explícito ou padrão;
- recupera até três resultados;
- aplica fallback geral quando permitido;
- executa Converse de forma bufferizada;
- devolve texto livre e metadados RAG.

## Estado

O mapa não usa:

- `chatId`;
- histórico LangChain;
- `Store.chats`;
- `localStorage`;
- `sessionStorage`;
- arquivo ou banco.

O estado JavaScript permanece vivo ao navegar dentro da SPA e é descartado ao
atualizar ou fechar a página.

Além da árvore validada, o frontend mantém somente a instância atual do Markmap
e o estado de visualização. Nada disso é persistido.

## Por que não Markdown

Markmap costuma transformar Markdown, mas esta skill não usa `markmap-lib`.

```text
JSON validado → IPureNode → markmap-view
```

Isso evita uma segunda linguagem de entrada, reduz superfície de parsing e
impede que tema ou documentos forneçam HTML, links, plugins ou diretivas.

Cada nó puro contém somente:

```javascript
{
  content: escapeHtml(label),
  children: []
}
```

O `markmap-view` usa HTML internamente para medir o texto. Por isso `content`
nunca recebe uma label bruta.

## Seleção de índice

O mapa possui seletor próprio.

1. Na primeira inicialização, copie a opção ativa do seletor do chat.
2. Se ela não estiver disponível, use `Índice padrão`.
3. Depois da cópia, as duas seleções são independentes.
4. Atualize as opções a partir da mesma fonte de sucessos da Skill 04.
5. Nunca mantenha uma segunda lista divergente de índices.

Representação:

| Destino | Frontend | Backend remoto |
| --- | --- | --- |
| padrão | `DEFAULT_INDEX_KEY` | omite `vectorIndexName` |
| personalizado | nome exato | envia `vectorIndexName` |

## Geração stateless

Não reutilize `ask()` porque ele incorpora memória por `chatId`. Extraia apenas
helpers compartilháveis, como transporte, validação de envelope e metadados,
sem alterar o comportamento do chat.

Cada geração envia uma única mensagem `user` com o tema. Isso também fornece a
consulta usada na recuperação, pois `ragConfig.query` permanece ausente.

## Modelo

`CHAT_MODEL_ID` continua sendo configuração interna opcional:

- `None`: omite `modelId` e usa o default da API;
- ID permitido: envia o valor exato.

Tema, navegador, rota local e seletor de índice nunca alteram o modelo.

## Falhas

Uma geração é atômica do ponto de vista visual:

- sucesso válido substitui o mapa;
- falha mantém o mapa anterior;
- nenhuma falha altera memória do chat;
- nenhuma falha inicia retry automático.

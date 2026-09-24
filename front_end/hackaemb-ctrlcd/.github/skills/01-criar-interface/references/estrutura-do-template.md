# Estrutura do template — página principal

## Princípio

O template é a base da solução. A Skill 01 deve personalizar a experiência
principal existente, preservando sua arquitetura e aparência.

Existe uma cópia imutável do template completo em `resources/template/web/`,
incluindo HTML, CSS, JavaScript, fontes, logos e ícones. Ela é usada somente
para recuperar partes ausentes, após aprovação do participante.

Estrutura preservada:

```text
resources/template/web/
├── index.html
├── styles.css
├── app.js
└── assets/
    ├── fonts/
    ├── icons/
    └── logo/
```

## `web/index.html`

### Página principal: superfície de trabalho

`#pageChat` contém:

| Elemento | Responsabilidade |
| --- | --- |
| `#welcome` | Boas-vindas antes da primeira mensagem |
| `.welcome__greeting` | Saudação e nome do usuário |
| `.welcome__title` | Nome ou título principal |
| `.welcome__subtitle` | Propósito da solução |
| `.welcome__prompt` | Convite para conversar |
| `.welcome__card` | Quatro perguntas sugeridas |
| `#messages` | Conversa renderizada |
| `#composerBox` | Compositor existente |
| `#input` | Entrada da mensagem |
| `#agentChip` | Identidade do agente |
| `#sendBtn` | Envio |
| `#counter` | Limite de caracteres |

Esses elementos devem ser personalizados sem criar equivalentes paralelos.

### Páginas reservadas

`#pageHacka` e `#hackaSlot` não são o destino da Skill 01. Preserve seu conteúdo
e comportamento para a construção do mapa mental na Skill 06.

O comentário existente nessa página orienta a futura solução customizada. Ele
deve ser ignorado durante a Skill 01.

`#pageExperiment` e `#experimentSlot` formam uma segunda área independente,
identificada pelo ícone de erlenmeyer e pela rota `experiment`. Preserve seu
placeholder para uma solução futura. Não reutilize seus IDs, classes
`.experiment__*` ou estado na página do mapa mental.

## `web/styles.css`

O template já contém tokens, fontes, layout, rail, histórico, welcome, cards,
mensagens e compositor. Os Marcos 1 e 2 devem reutilizar esses estilos e
normalmente não precisam adicionar CSS.

Se um refinamento visual aprovado exigir CSS novo:

- limite-o a `#pageChat`;
- use classes exclusivas somente quando indispensável;
- não redefina tokens ou seletores globais;
- não altere as páginas reservadas.

## `web/app.js`

O arquivo já oferece:

- objeto `API`;
- histórico em `Store`;
- renderização de mensagens;
- função `sendMessage()`;
- eventos dos cards;
- Enter e Shift+Enter;
- contador;
- navegação entre `chat`, `hacka` e `experiment`.

No Marco 1, altere somente textos dinâmicos relacionados à personalização e
faça `API.getUser()` fornecer o perfil mockado local, preservando sua
assinatura. No Marco 2, preserve os comportamentos existentes e personalize
cards e compositor sem executar o envio.

No Marco 3, preserve a superfície pública do objeto `API`, mas substitua
temporariamente sua comunicação de rede por respostas locais compatíveis com os
callbacks existentes.

Durante toda a Skill 01, o modo demonstração não pode executar chamadas de
rede. Upload e drag-and-drop permanecem visualmente presentes, mas
desabilitados, pois serão ativados em etapa posterior.

## Regra de revisão

Antes de concluir qualquer marco, compare visualmente a página principal antes
e depois. A identidade e o conteúdo podem mudar; estrutura, navegação,
componentes e linguagem visual devem continuar reconhecíveis.

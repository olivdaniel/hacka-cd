# Contrato funcional — Skill 01

## Intenção pedagógica

O participante deve aprender a personalizar uma interface existente por meio de
decisões pequenas e verificáveis. A LLM pergunta, implementa um marco, apresenta
o resultado e aguarda aprovação.

Sequência:

1. descoberta sem edição;
2. identidade da página principal;
3. sugestões e compositor principal;
4. resposta simulada;
5. refinamento e aceite.

## Superfície funcional

A experiência acontece em `#pageChat`, que já contém:

- boas-vindas;
- cards de sugestão;
- área de mensagens;
- compositor;
- histórico;
- contador;
- envio e renderização de conversa.

A skill personaliza esses componentes. Ela não cria outra aplicação em
`#pageHacka` nem em `#pageExperiment`.

Fontes, logos e ícones do template permanecem em `web/assets/` e também na
cópia imutável distribuída com a skill.

## Fluxo final

```text
Abrir o template na página principal
  → observar a identidade personalizada
  → escolher uma das quatro sugestões ou escrever uma pergunta
  → enviar
  → exibir a mensagem do usuário
  → exibir estado de espera
  → API.streamMessage usa o mock local
  → exibir resposta simulada
  → liberar novo envio e atualizar o histórico
```

## Fronteira para a Skill 02

O frontend existente depende do objeto:

```javascript
API
```

No fim da Skill 01:

- `API.getUser()` entrega, desde o Marco 1, um perfil local personalizado;
- `API.streamMessage(payload, callbacks, signal)` simula os eventos;
- a assinatura pública continua igual à do template;
- `sendMessage()` e a renderização principal não conhecem a origem da resposta.

Na Skill 02, a implementação de `API` será conectada ao servidor Python sem
reconstruir a página principal.

## Eventos simulados

O mock preserva a ordem:

1. `onMetadata({ chatId, title })`;
2. `onDelta({ message })`;
3. `onComplete({ sources: [] })`.

A resposta deve declarar que é uma simulação e nunca aparentar conhecimento
real do domínio.

## O que não caracteriza conclusão

O marco não está pronto se:

- a solução foi construída em `#pageHacka` ou `#pageExperiment`;
- foi criado outro compositor ou outra área de mensagens;
- a página principal permaneceu genérica enquanto a secundária foi
  personalizada;
- todos os marcos foram executados sem participação do usuário;
- o mock exige servidor ou internet;
- o contrato público de `API` foi removido;
- clicar no anexo ou arrastar um arquivo inicia uma chamada de rede;
- upload, Lambda ou RAG foram implementados antecipadamente.

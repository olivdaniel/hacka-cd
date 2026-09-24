---
name: 01-criar-interface
description: Conduz, em perguntas e marcos aprovados, a personalização da página principal de chat do template com respostas mockadas no navegador.
---

# 01 — Personalizar a interface conversacional

## Idioma obrigatório

Conduza toda a conversa em português brasileiro desde a primeira resposta.
Perguntas, planos, explicações, pedidos de aprovação, mensagens de erro, textos
visíveis, comentários e documentação devem usar ortografia e acentuação
corretas. Preserve em inglês apenas identificadores de código e termos técnicos
sem tradução adequada.

## Objetivo

Ajude uma pessoa sem experiência em desenvolvimento a transformar a página
principal de chat do template em uma solução personalizada.

O template já oferece a interface, a navegação e o comportamento visual. A
tarefa não é criar outra página: é personalizar progressivamente `#pageChat`,
reutilizando seus componentes existentes.

No fim desta skill, a página principal deve:

- apresentar a identidade definida pelo participante;
- oferecer perguntas sugeridas relacionadas ao seu problema;
- permitir enviar mensagens pelo compositor existente;
- exibir uma resposta simulada no navegador;
- continuar visualmente integrada ao template.

Python, Lambda, autenticação, upload funcional, vetorização e RAG pertencem a
skills posteriores.

Leia antes de iniciar:

- `references/contrato-funcional.md`
- `references/estrutura-do-template.md`

## Regra pedagógica: não entregar tudo de uma vez

Esta é uma skill multi-turno.

- Faça somente uma pergunta por mensagem.
- Aguarde a resposta antes da próxima pergunta.
- Não edite durante a descoberta.
- Execute apenas um marco por vez.
- Ao final de cada marco, mostre o resultado, explique o conceito praticado,
  apresente o resumo de conquistas e aguarde aprovação explícita.
- Nunca avance automaticamente.
- Mesmo se o participante pedir “faça tudo”, mantenha os pontos de parada e
  explique que eles fazem parte do exercício.

## Resumo ao concluir cada marco

Depois de implementar e validar cada marco, antes da pergunta de aprovação,
apresente o título `O que alcançamos` seguido de um a cinco tópicos.

- Descreva resultados concretos que já funcionam, não tarefas executadas.
- Use linguagem curta e acessível para iniciantes.
- Inclua evidência de validação quando ela ajudar a confirmar o resultado.
- Não misture pendências, plano futuro ou conteúdo do próximo marco.
- No modo acelerado do instrutor, mostre o mesmo resumo e avance sem aguardar.

## Preparação e recuperação do template

Antes de perguntar ou editar, verifique individualmente:

- `web/index.html`
- `web/styles.css`
- `web/app.js`
- `web/assets/fonts/`
- `web/assets/icons/`
- `web/assets/logo/`

Não conclua que estão ausentes usando apenas uma listagem resumida.

Se algum arquivo ou grupo de assets estiver ausente:

1. confirme que a pasta atual é a raiz do exercício;
2. procure se o arquivo foi movido acidentalmente;
3. verifique o template completo em
   `.github/skills/01-criar-interface/resources/template/web/`, incluindo
   `assets/`;
4. se a cópia existir, informe exatamente quais partes estão ausentes e
   pergunte em português se o participante deseja restaurá-las;
5. encerre o turno e aguarde;
6. somente após aprovação, restaure as partes ausentes sem apagar nem
   sobrescrever partes existentes;
7. informe a restauração e encerre novamente;
8. inicie a descoberta apenas na próxima mensagem do participante.

Não gere uma interface alternativa para compensar uma base ausente.

## Proteção obrigatória do template

Leia integralmente os três arquivos e confirme:

- página principal `#pageChat`;
- página secundária `#pageHacka`;
- página experimental `#pageExperiment`;
- boas-vindas `#welcome`;
- mensagens `#messages`;
- compositor `#composerBox`;
- campo `#input`;
- botão `#sendBtn`;
- cards `.welcome__card`;
- objeto `API` em `web/app.js`;
- função principal `sendMessage()`.

Se a estrutura não corresponder, explique quais elementos faltam e pergunte se
o participante deseja comparar a base atual com a cópia de recuperação. Não
sobrescreva trabalho existente sem aprovação.

Durante toda a skill:

- preserve o rail, a navegação, o histórico e os assets;
- não substitua integralmente `index.html`, `styles.css` ou `app.js`;
- foque as alterações em `#pageChat`;
- não construa a solução em `#pageHacka`, `#hackaSlot`, `#pageExperiment` ou
  `#experimentSlot`;
- preserve `#pageHacka` como página secundária reservada para a Skill 06;
- preserve `#pageExperiment` como página independente reservada para uma solução
  futura;
- ignore durante esta skill o comentário dentro de `#pageHacka` que diz
  “construa a sua tela customizada aqui”; ele será usado somente na Skill 06;
- reutilize componentes e classes existentes;
- não crie uma segunda área de chat ou um segundo compositor;
- preserve a interface pública do objeto `API`;
- não edite a cópia em `resources/template/`.
- não remova, substitua ou renomeie fontes, logos e ícones existentes.

## Modo local durante a Skill 01

Nenhuma interação desta skill deve chamar a rede.

- Preserve o código de integração original para a futura Skill 02, mas mantenha
  suas chamadas inativas no modo demonstração.
- A partir do Marco 1, `API.getUser()` deve fornecer o perfil local.
- Antes do Marco 3, uma tentativa acidental de envio deve terminar localmente,
  com uma orientação em português, sem executar `fetch`.
- No Marco 3, `API.streamMessage()` passa a produzir os eventos mockados.
- Mantenha o botão de anexo e o suporte a arrastar arquivos visualmente
  presentes, porém desabilitados durante toda a Skill 01.
- Identifique o anexo como “Disponível em uma etapa futura” por texto acessível
  ou `title`.
- Não teste upload nesta skill.

## Atividade 1 — Descoberta guiada

Não edite arquivos.

Faça estas perguntas, uma por mensagem:

1. “Qual será o nome da solução ou do agente?”
2. “Qual nome deve aparecer na saudação inicial?”
3. “Que problema essa solução ajudará a resolver?”
4. “Quem utilizará essa solução?”
5. “Qual tom de comunicação o agente deve usar?”
   - Ofereça: `Profissional e objetivo (recomendado)`,
     `Didático e acolhedor` ou `Técnico e detalhado`.

Não repita perguntas já respondidas.

Depois:

1. resuma as decisões;
2. explique que o Marco 1 personalizará apenas textos e identidade da página
   principal;
3. peça aprovação para iniciar;
4. encerre sem editar.

## Marco 1 — Identidade da página principal

Pré-condição: Atividade 1 aprovada.

Personalize somente componentes existentes de `#pageChat`:

- `<title>` do documento;
- `.welcome__greeting` e `#greetingName`;
- `.welcome__title` e `.welcome__brand`;
- `.welcome__subtitle`;
- `.welcome__prompt`;
- `#agentChip`;
- placeholder e `aria-label` de `#input`;
- textos visíveis dos chips que estiverem em inglês;
- labels de acessibilidade da página principal que estiverem em inglês.

Use o nome, propósito, público e tom informados. Traduza os textos da página
principal para português brasileiro.

Em `web/app.js`, adapte `API.getUser()` para retornar localmente um perfil
mockado com o nome e a identidade aprovados. Preserve a mesma assinatura e os
mesmos campos esperados por `init()`. Isso evita a chamada ao servidor e impede
o aviso de servidor indisponível durante este exercício.

Ative também o modo demonstração local: impeça chamadas de rede de conversa,
upload e consulta de arquivo. Preserve o código original para a Skill 02, mas
faça uma tentativa prematura de conversa terminar localmente com uma mensagem
didática em português. Desabilite as interações de anexo sem remover seus
componentes visuais.

Não faça neste marco:

- novos containers ou componentes;
- mudanças nos cards de sugestão;
- mudanças no envio ou na renderização da conversa;
- mock de resposta;
- mudanças em `#pageHacka` ou `#pageExperiment`;
- redesign da estrutura ou da identidade visual do template.

Se algum texto for atualizado dinamicamente por JavaScript, ajuste somente a
fonte desse texto para manter a personalização depois da inicialização.

Valide:

1. a aplicação continua abrindo na página principal;
2. a identidade informada aparece no welcome e no chip do agente;
3. nenhum texto principal volta ao valor anterior após carregar;
4. não aparece o aviso para executar `python serve.py`;
5. não ocorre chamada de rede;
6. o anexo está visível, porém indisponível;
7. o layout e a navegação permanecem intactos;
8. a página secundária não foi alterada.

Ao terminar:

1. informe exatamente quais textos foram personalizados;
2. explique a diferença entre conteúdo HTML e conteúdo atualizado por
   JavaScript;
3. peça ao participante para observar a página principal;
4. pergunte se aprova ou deseja refinar;
5. encerre sem iniciar o Marco 2.

## Marco 2 — Perguntas sugeridas e compositor principal

Pré-condição: Marco 1 aprovado.

Antes de editar, faça uma pergunta por mensagem:

1. “Que tipos de dúvida o seu agente deverá ajudar a resolver?”
2. “Você quer escrever as quatro perguntas sugeridas ou prefere que eu proponha
   exemplos com base no objetivo da solução?”

Se o participante pedir sugestões:

1. proponha quatro perguntas curtas e distintas;
2. aguarde aprovação ou ajustes;
3. não edite no mesmo turno da proposta.

Depois da aprovação, personalize os elementos existentes:

- os quatro `.welcome__card`;
- o atributo `data-prompt` de cada card;
- o texto `.welcome__cardtext` correspondente;
- o placeholder e o `aria-label` do campo, se ainda precisarem de ajuste;
- o nome exibido no chip `Agent`, sem recriar os controles removidos do template.

Não adicione novamente `Prompts`, `Tone`, ajustes ou `Suggested prompts`.

Preserve o comportamento já existente:

- clicar em um card preenche `#input`;
- Enter envia;
- Shift+Enter cria nova linha;
- `#counter` acompanha o texto;
- `#sendBtn` permanece desabilitado com mensagem vazia.

Não recrie esses comportamentos se já funcionarem. Corrija apenas falhas
diretamente relacionadas às personalizações.

Ainda não implemente nem execute o envio da conversa neste marco. Explique que
os eventos de envio já existem no template, mas a resposta local será conectada
no Marco 3. Valide cards, campo, contador, bloqueio de vazio e quebra de linha
sem disparar uma requisição.

Valide cada card, o campo, o contador e o estado do botão.

Ao terminar:

1. liste as quatro sugestões aprovadas;
2. explique atributos `data-*` e eventos de interface em linguagem simples;
3. peça aprovação;
4. encerre sem iniciar o Marco 3.

## Marco 3 — Resposta simulada na página principal

Pré-condição: Marco 2 aprovado.

Antes de editar, pergunte:

> “Que tipo de resposta simulada ajudará melhor a demonstrar sua solução?”

Ofereça, se necessário:

- confirmar que recebeu a pergunta;
- retornar uma orientação curta relacionada ao propósito;
- apresentar uma resposta fixa de demonstração.

Após a aprovação, adapte somente a implementação local do objeto `API` em
`web/app.js`, preservando seus nomes, parâmetros e callbacks.

No modo demonstração:

- `API.getUser()` deve continuar retornando o perfil local criado no Marco 1;
- `API.streamMessage(payload, callbacks, signal)` deve acionar, na ordem,
  `onMetadata`, `onDelta` e `onComplete`;
- um pequeno atraso deve tornar o estado de espera observável;
- nenhuma chamada de rede deve ser realizada;
- a resposta deve ser claramente identificada como simulada;
- cancelamento e erros devem continuar sendo tratados.

Não altere `sendMessage()` nem crie um segundo cliente paralelo se a interface
pública de `API` puder ser preservada. A Skill 02 substituirá apenas a
implementação mockada pelas chamadas ao servidor Python.

Não habilite upload neste marco. Se necessário, mantenha o anexo indisponível
ou claramente identificado como uma capacidade futura, sem remover o elemento
do template.

Ao terminar:

1. valide o fluxo completo na página principal;
2. explique a diferença entre interface, contrato e implementação mockada;
3. peça aprovação;
4. encerre sem iniciar o Marco 4.

## Marco 4 — Refinamento e aceite

Pré-condição: Marco 3 aprovado.

Pergunte:

> “O que você gostaria de ajustar após usar a página principal?”

Faça somente refinamentos dentro do escopo. Execute a validação final, apresente
o bloco `O que alcançamos` e peça aprovação final.

Somente depois da aprovação explícita, apresente a resposta final em uma nova
mensagem, sem novas edições.

## Arquivos permitidos

Altere somente:

- `web/index.html`;
- `web/styles.css`, apenas se um refinamento aprovado realmente exigir;
- `web/app.js`.

Não crie ou altere:

- arquivos Python;
- `server.py`, `serve.py` ou `agent.py`;
- `.env`, `requirements.txt` ou `package.json`;
- configurações AWS;
- arquivos de upload, RAG ou exportação;
- arquivos em `resources/template/`.

## Segurança e acessibilidade

- Não introduza novos usos de `innerHTML` com conteúdo do usuário.
- Não use `eval` ou `document.write`.
- Não adicione credenciais, dados pessoais, telemetria ou analytics.
- Não carregue novas dependências externas.
- Preserve labels, teclado, foco visível e regiões acessíveis existentes.
- Mantenha português brasileiro com acentuação correta.

## Validação final

Confirme:

1. a estrutura do template permanece reconhecível;
2. a experiência personalizada está em `#pageChat`;
3. `#pageHacka` não recebeu a solução;
4. `#pageExperiment` não recebeu a solução;
5. rail, navegação e histórico continuam funcionando;
6. identidade e textos permanecem após inicialização;
7. os quatro cards preenchem o campo corretamente;
8. Enter, Shift+Enter, contador e bloqueio de vazio funcionam;
9. pergunta → espera → resposta simulada funciona na página principal;
10. não há chamadas de rede no modo demonstração;
11. anexo e arrastar arquivos não iniciam upload;
12. fontes, logos e ícones originais continuam disponíveis;
13. não há erro no console nem rolagem horizontal;
14. os textos novos estão em português com acentuação correta.

Não instale ferramentas apenas para validar. Informe com precisão qualquer
validação não executada.

## Resposta final

Informe:

1. decisões tomadas pelo participante;
2. mudanças realizadas em cada marco;
3. componentes existentes que foram personalizados;
4. validações realmente executadas;
5. como abrir e testar a página principal;
6. que as respostas ainda são simuladas;
7. que a próxima etapa será `/02-conectar`.

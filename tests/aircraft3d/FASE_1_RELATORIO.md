# CTRL+CD — Fase 1: carregamento básico do GLB

Data: 23/09/2026.

**Escopo implementado:** canvas, carregamento local do GLB, câmera inicial, iluminação, controles de órbita, estados de carregamento e de erro, botão de redefinir vista e aviso demonstrativo.

**Fora do escopo desta fase:** seleção, hover, tooltip, hierarquia, marcador, snapshot, integração com o formulário e back-end.

## Revisão do relatório da Fase 0

As seções 0, 3, 12 e 14.1 do relatório da Fase 0 pediam três decisões (arquitetura, envio do three.js e comando do servidor), que ficaram sem resposta. Antes de implementar, verifiquei de novo o acesso aos pacotes:
- o registro npm e o GitHub continuam respondendo **403** (política de rede da organização); não tentei contornar o bloqueio;
- não há cópia de `three` neste ambiente nem entre os arquivos enviados.

**Decisão aplicada:** opção **C** do relatório da Fase 0, um visualizador WebGL2 escrito em JavaScript puro, **sem nenhuma dependência nova**. É a única opção que eu consigo compilar e testar aqui, e segue as regras do template (sem `package.json`, sem CDN, sem módulos ES).

**Se você preferir a opção A (Three.js)**, basta enviar a pasta `node_modules/three`. Já deixei preparado o que não depende da biblioteca e poderia ser reaproveitado:
- os mesmos nomes de API (`fitCameraToObject`, `calculateObjectBounds`, `animateCameraToTarget`, `resetCamera`);
- o mesmo contrato público (`CtrlCDAircraft3D.open`);
- os mesmos testes.

Nesse caso, só `renderer.js` e `orbit-controls.js` seriam trocados.

## Antes de alterar

1. **Arquivos exatos**

   | Ação | Arquivo |
   |---|---|
   | alterado | `frontend/index.html`: +1 `<link>` e +6 `<script>`, todos marcados com `CTRL+CD 3D (Fase 1)` |
   | alterado | `frontend/ctrlcd/app.js`: só `LocationSection()`, +10 linhas (botão "Visualizar modelo 3D (prévia)") |
   | criado | `frontend/models/e195-e2-demonstrativo.glb` (cópia; SHA-256 conferido) |
   | criado | `frontend/ctrlcd/aircraft3d/` com `math.js`, `glb-loader.js`, `camera-utils.js`, `renderer.js`, `orbit-controls.js`, `viewer.js`, `aircraft3d.css`, `aircraft3d-types.d.ts` e `README.md` |
   | criado | `tests/aircraft3d/` com `test_fase1.py`, `tsconfig.json`, este relatório e `capturas/`. Fica **fora** de `frontend/` |

2. **Dependências e versões:** **nenhuma.** Nada foi instalado; não foi criado `package.json`, lockfile nem `node_modules`. Usa só APIs do navegador: WebGL 2, Fetch com leitura em fluxo (*streams*), AbortController, ResizeObserver e Pointer Events.
3. **Compatibilidade com React:** não se aplica.
   - O app ativo é JavaScript puro e não usa React.
   - O *scaffold* React (`frontend/src`, `package.json` com versões `"latest"`) **não foi tocado** e continua fora do `index.html`.
   - Nenhuma versão de React, Vite ou TypeScript do projeto foi alterada.
4. **Destino do GLB:** `frontend/models/e195-e2-demonstrativo.glb`.
   - O endereço é calculado com `new URL("models/e195-e2-demonstrativo.glb", document.baseURI)`: é relativo ao documento, sem `localhost`, sem depender da raiz do domínio e sem Base64.
   - O original em `e195-e2-3d/export/` não foi alterado; os dois têm SHA-256 `86db982c…5169`.
5. **Back-end:** não foi alterado. `fastapi_app.py`, `user_api.py`, `usuarios/`, `src/`, `.env` e `requirements.txt` estão idênticos (conferido com `git diff`).
6. **Visualizador antigo:** continua disponível e inalterado.
   - "Selecionar no modelo da aeronave" abre o localizador 2D exatamente como antes, e é ele que confirma a localização.
   - O 3D aparece como **botão adicional**, "Visualizar modelo 3D (prévia)", e tem o botão "Usar vistas técnicas (2D)", que repassa `current`, `onConfirm` e `onClose` sem alteração.
   - `window.CTRLCD_3D_ENABLED = false` esconde o 3D sem editar código.

## Implementado

| Item | Como |
|---|---|
| Canvas | WebGL 2; renderização sob demanda (só quando algo muda); resolução limitada a 2× (1,5× em telas de toque) |
| Carregamento local do GLB | `fetch` do mesmo servidor; progresso por bytes; **Cancelar** interrompe o download; o resultado fica em cache na sessão (1 download em 11 aberturas); o GLB é validado (assinatura, versão, blocos, extensões obrigatórias, Draco, primitivas) |
| Câmera inicial | perspectiva (40°), pela frente e pela esquerda, um pouco acima; enquadrada pela **caixa envolvente** (os 8 cantos cabem na tela com margem), porque a origem do GLB fica na ponta do nariz |
| Iluminação | ambiente em hemisfério, luz principal, luz de preenchimento, brilho especular discreto; cores e rugosidade dos 4 materiais do GLB; saída em sRGB; fundo técnico em gradiente e grade discreta no plano do chão |
| Controles de órbita | arrastar gira; roda ou pinça dá zoom; botão direito, Shift + arrastar ou dois dedos move; com amortecimento; limites de distância, elevação e alvo; a câmera não entra no modelo |
| Estado de carregamento | esqueleto, barra de progresso acessível, "Carregando modelo da aeronave...", Cancelar |
| Estado de erro | "Não foi possível carregar o modelo 3D." + motivo + **Tentar novamente / Usar vistas técnicas / Informar localização manualmente / Fechar**. Cobre arquivo ausente, arquivo corrompido, perda de contexto gráfico, ausência de WebGL 2 e `file://` |
| Redefinir vista | botão e tecla **R**, com transição animada (instantânea com `prefers-reduced-motion`) |
| Aviso demonstrativo | sempre visível no rodapé: "Modelo visual demonstrativo. Não representa geometria CAD oficial ou certificada." |
| Outros | Esc, ×, clique fora fecham e devolvem o foco; o Assistente CTRL fica oculto enquanto o modal está aberto; em celular, tela cheia; ao fechar, libera buffers, programas e o contexto WebGL |

## Verificações executadas

| Verificação | Resultado |
|---|---|
| Build | **não se aplica**: o app ativo não tem etapa de build (é servido como arquivos estáticos). No lugar, conferi a sintaxe com `node --check` em todos os arquivos `.js` novos e no `ctrlcd/app.js`: sem erros |
| TypeScript | `tsc -p tests/aircraft3d/tsconfig.json` (TS 6.0.3, `strict`, `checkJs`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`): **0 erros**. Nenhum `any` no código novo |
| Testes de navegador | `tests/aircraft3d/test_fase1.py` (Playwright + Chromium com WebGL por software): **32/32**, em duas execuções seguidas |
| Console | sem erros; nenhuma requisição externa |

**Os 32 itens testados:**
- **Arquivo e hospedagem:**
  - SHA-256 do GLB igual ao aprovado;
  - caminho correto e modelo exibido na raiz e em subpasta (`/frontend/`).
- **Abertura e contagem:**
  - estado de carregamento com progresso até 100 %;
  - 321.814 triângulos;
  - exatamente 2 asas, 2 motores, 2 estabilizadores horizontais e 1 vertical;
  - modelo enquadrado.
- **Controles:**
  - girar;
  - zoom;
  - mover (botão direito e Shift);
  - limites de zoom mínimo e máximo;
  - tecla R e botão Redefinir.
- **Fechamento e desempenho:**
  - Esc, × e clique fora fecham;
  - 1 download em 11 aberturas;
  - sem sobras no DOM depois de 10 ciclos de abrir e fechar;
  - WebGL ainda funcional depois disso (contextos liberados).
- **Localizador 2D:**
  - "Usar vistas técnicas" abre o localizador 2D;
  - aberto a partir do 3D, ele ainda confirma a localização no formulário.
- **Falhas:**
  - erro 404 e arquivo corrompido mostram a mensagem e as 4 ações;
  - "Tentar novamente" recupera o carregamento;
  - a Etapa 2 continua utilizável;
  - sem WebGL 2 e em `file://`, o visualizador vai direto para as alternativas.
- **Celular:** layout em tela cheia.

**Medições** (locais, Chromium sem GPU, com renderização por software):

| Medida | Valor |
|---|---|
| GLB | 8,67 MB |
| Triângulos | 321.814 |
| Download + leitura | ≈ 0,1–1,4 s |
| Primeiro quadro | ≈ 0,9–2,9 s |

Esses tempos **não representam** um computador com GPU. O FPS real está **A MEDIR** no seu equipamento.

Capturas em `tests/aircraft3d/capturas/`: inicial, girado, zoom máximo, erro e celular.

## Como testar

1. Na pasta `backend`, rode `python -m http.server 4173 --bind 127.0.0.1 --directory frontend` e abra `http://127.0.0.1:4173/#registro`. É preciso estar logado: use a API da porta 8001, como hoje.
2. Siga **Novo registro → Vazamento → Confirmar → Próxima → "Está instalada no avião?" = Sim**.
3. Clique em **"Visualizar modelo 3D (prévia)"** e confira:
   - o carregamento;
   - girar, zoom e mover;
   - **R** e **Redefinir vista**;
   - o aviso no rodapé;
   - **Usar vistas técnicas (2D)**.
4. Para ver o estado de erro, renomeie temporariamente `frontend/models/e195-e2-demonstrativo.glb` e reabra.
5. Testes automáticos: `python tests/aircraft3d/test_fase1.py`. Requer `playwright` e `Pillow`.

## Limitações

1. **Não usa Three.js/OrbitControls** (o motivo está no início). Os controles e a iluminação são implementação própria, sem o ecossistema da biblioteca.
2. **Sem sombras.** A especificação pede "sombras moderadas"; ficam para a Fase 2 se você quiser (sombra de contato no chão).
3. **Proteção contra entrar no modelo** é feita por distância mínima e limite do alvo, e não por colisão com a malha. Com zoom máximo e o alvo deslocado, a câmera ainda pode chegar muito perto de uma superfície.
4. **Zoom sempre em direção ao centro da órbita**, e não ao ponto sob o cursor.
5. **Desempenho em celular e tablet com GPU real não medido.** O trem de pouso concentra 78 % dos triângulos. Não otimizei o GLB, porque não há evidência e isso exigiria autorização.
6. **Servidor HTTP obrigatório para o 3D;** em `file://` o visualizador cai nas vistas técnicas.
7. **Layout de celular:** cabeçalho com texto quebrado e ações apertadas. A responsividade completa é da Fase 7.
8. **"Informar localização manualmente"** abre a lista de níveis do localizador 2D atual. Um campo de texto próprio dependeria da integração com o formulário (Fase 6).
9. O *scaffold* React e o `vite.config.ts` continuam sem uso e sem versões fixas.

## Rollback

- **Linha de base:** a pasta de trabalho tem um repositório git criado antes da Fase 1, com o commit `a82130e`.
- **Desfazer tudo:** `git checkout a82130e -- frontend/index.html frontend/ctrlcd/app.js` e depois apagar `frontend/ctrlcd/aircraft3d/`, `frontend/models/` e `tests/aircraft3d/`.
- **Desligar sem editar código:** definir `window.CTRLCD_3D_ENABLED = false`.

## Correções da revisão (autorizadas em 23/09/2026)

| # | Problema | Correção aplicada | Arquivo | Teste |
|---|---|---|---|---|
| M1 | "Tentar novamente" após perda do contexto gráfico deixava o canvas em branco | o `<canvas>` é substituído por um novo antes de recriar a cena (um contexto WebGL perdido não volta no mesmo elemento); o foco vai para o novo canvas | `viewer.js` | perde o contexto com `WEBGL_lose_context`, clica em "Tentar novamente" e confere que o contexto está ativo e a aeronave foi desenhada |
| M2 | o foco saía do modal com Tab | Tab e Shift+Tab circulam entre os controles do modal; o tratamento é removido ao fechar | `viewer.js` | 10 × Tab e 10 × Shift+Tab ficam dentro do modal; depois de fechar, o foco volta a circular pela página |
| B1 | o navegador podia manter um GLB antigo em cache | `fetch(..., { cache: "no-cache" })`: o navegador revalida a cópia a cada sessão (o servidor responde 304 se o arquivo não mudou); o cache em memória continua garantindo um download por sessão | `glb-loader.js` | o pedido sai com `Cache-Control: max-age=0` (a forma que o Chromium usa para revalidar) |
| B2 | risco de corte da geometria perto da câmera | o plano de corte próximo passou a `distância − 2,2 × raio` | `renderer.js` | coberto pelos testes de zoom e movimento (sem teste dedicado) |
| B3 | grade mais clara que o previsto | a transparência passou a ser calculada separadamente para cor e alfa (`blendFuncSeparate`) | `renderer.js` | visual (capturas) |
| B4 | anúncios repetidos do percentual pelo leitor de tela | o painel de estado deixou de ser uma região `aria-live`; o título de carregamento é `role="status"` (anunciado uma vez), o percentual é `aria-hidden` e o progresso fica na barra `role="progressbar"`; o erro continua como `role="alert"` | `viewer.js` | confere a ausência de `aria-live` no painel |
| B5 | arquivos novos em LF | convertidos para CRLF, como o restante do projeto | `aircraft3d/*`, `tests/aircraft3d/*` | `tsc` e `node --check` depois da conversão |
| B7 | com algum módulo ausente, o modal podia ficar vazio e preso | a API só é registrada se todos os módulos carregaram; senão, aviso no console, botão 3D oculto e localizador 2D intacto | `viewer.js` | simula `renderer.js` ausente (404) |

**Não aplicadas, por decisão anterior:** B6 fica para a Fase 6 e B8 para a Fase 7.

**Resultado:** 40/40 em duas execuções, TypeScript estrito sem erros, sintaxe verificada, back-end e demais arquivos existentes inalterados em relação ao commit da Fase 1.

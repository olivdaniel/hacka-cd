# Integração Ctrl + CD (protótipo Figma) ao template HackaEmb

Documento técnico da primeira integração entre o protótipo exportado do Figma Make
(`FRONT-END_HACKAEMB`) e o template obrigatório do treinamento (`Material`).

Convenções usadas neste documento:

- **[Fonte]** informação extraída dos arquivos recebidos (SKILL.md, especificação ou código do protótipo);
- **[Decisão]** escolha de projeto tomada nesta integração, com justificativa;
- **[Sintético]** dado fictício usado apenas para demonstração;
- **[A DEFINIR]** informação ausente, que depende da equipe ou dos organizadores.

---

## 1. Diagnóstico dos insumos

| Insumo | Tecnologia | Papel |
| --- | --- | --- |
| `Material/web/` | HTML, CSS e JavaScript puros, sem build | Template obrigatório. As skills do Copilot editam esses arquivos diretamente. **[Fonte]** |
| `Material/.github/skills/01..06` | Instruções para o GitHub Copilot | Evolução guiada: interface → servidor Python → upload → vetorização → RAG → mapa mental. **[Fonte]** |
| `FRONT-END_HACKAEMB/src/ctrlcd/` | React 19, Vite 8, Tailwind 4 | Protótipo do produto Ctrl + CD (telas ativas em `App.tsx`). **[Fonte]** |
| `FRONT-END_HACKAEMB/src/components`, `src/aircraft`, `src/data/scenarios.ts` | React | Código de uma especificação anterior (localizador com seis níveis e dez cenários). **Não é importado por `App.tsx`**; não foi portado. **[Fonte]** |

Restrições do template que orientaram a integração **[Fonte: SKILL.md 01 e 02]**:

- não carregar dependências externas nem criar `package.json`;
- não criar um segundo chat nem um segundo compositor;
- preservar o objeto `API`, `sendMessage()` e os IDs `#pageChat`, `#pageHacka`, `#pageExperiment`;
- não usar `#pageHacka/#hackaSlot` (reservados à Skill 06);
- nenhuma chamada de rede no modo demonstração;
- não usar `innerHTML` com conteúdo do usuário, `eval` ou `document.write`.

## 2. Decisões de arquitetura

1. **Porte do React para JavaScript puro.** **[Decisão]** O protótipo depende de npm, Vite e Tailwind, o que viola a regra de "não carregar novas dependências". O porte mantém o layout e o comportamento do Figma e permite que o Copilot continue editando `web/` sem build.
2. **Assistente CTRL = `#pageChat`.** **[Decisão]** A especificação do Figma exige que o assistente responda apenas com base em normas cadastradas e cite as fontes. **[Fonte: instructions.md, seção 18]** É exatamente o que as Skills 02–05 constroem no chat do template (servidor Python → agente → RAG). O botão-mascote "CTRL" do Figma foi mantido, mas abre um painel com sugestões que levam ao chat oficial, pré-preenchendo a pergunta.
3. **Formulário de registro = `#pageExperiment`.** **[Decisão]** É a área que o template reserva para "uma solução futura" e que não é usada por nenhuma skill. A rota `experiment` e os IDs foram preservados; mudou apenas o rótulo do rail ("Registro de NC").
4. **Arquivos separados em `web/ctrlcd/`.** **[Decisão]** Evita conflitos quando o Copilot editar `app.js`, `index.html` e `styles.css` nas próximas skills.
5. **Identidade visual.** **[Decisão]** Layout, hierarquia e componentes do Figma; tokens, fontes locais (Roboto) e azul do template. O violeta ficou reservado às funções de IA, para distinguir visualmente "revisão inteligente" de ações comuns. `styles.css` do template não foi alterado.

```text
web/
├── index.html          (template — alterações mínimas, ver seção 4)
├── styles.css          (template — inalterado)
├── app.js              (template — mock do Marco 3 + rótulos em PT-BR)
├── assets/logo/ctrl-cd-logo.png   (novo: recorte do logo do Figma)
└── ctrlcd/
    ├── ui.js           utilitários: h(), ícones, toast, armazenamento seguro
    ├── data.js         dados fictícios, tipos de NC, requisitos
    ├── aircraft.js     localizador de peça (SVG, 6 níveis, zoom animado)
    ├── photo-editor.js editor de fotografias (canvas)
    ├── app.js          aplicação: início, novo registro, rastreamento, histórico
    └── ctrlcd.css      estilos com escopo próprio (prefixo .ccd-)
```

## 3. Mapa de correspondência Figma → template

| Protótipo (React) | Integração (JS puro) |
| --- | --- |
| `App.tsx` (estado de navegação) | `ctrlcd/app.js` → objeto `S` e `render()` |
| `components/Header.tsx` | `Header()` |
| `components/Sidebar.tsx` | `Sidebar()` (busca agora funcional) |
| `components/RightPanel.tsx` | `RightPanel()` (status calculado por etapa) |
| `components/StatusBadge.tsx` | `StatusBadge()`, `ProgressBar()` |
| `components/AssistantCtrl.tsx` | `AssistantCtrl()` → leva ao `#pageChat` |
| `components/Aircraft3DModal.tsx` | `ctrlcd/aircraft.js` |
| `pages/HomePage.tsx` | `HomePage()` |
| `pages/NewRecordPage.tsx` (etapas 1–5) | `Step1()` … `Step5()` |
| `PhotoEditorModal` (em NewRecordPage) | `ctrlcd/photo-editor.js` |
| `pages/ConsultPage.tsx` | `ConsultPage()` |
| `pages/HistoryPage.tsx` | `HistoryPage()` |
| `imports/Template_Compilado.docx` | `printAnnex()` → anexo imprimível com a mesma estrutura (seções 1 a 4, bloco repetível de imagens) |

Comportamentos acrescentados em relação ao protótipo **[Decisão]**, todos previstos na especificação do Figma:

- validação da etapa 2 com lista de pendências em texto, ícone e cor;
- aceitar, **editar** ou rejeitar sugestões da revisão inteligente (o protótipo não aplicava a sugestão ao campo);
- legenda e requisito associado por fotografia (exigidos pelo `Template_Compilado.docx`);
- arrastar e soltar fotos, validação de formato e tamanho;
- rascunho salvo no navegador com a pergunta "Existe um rascunho salvo. Deseja continuar?";
- histórico de versões do anexo e "Baixar PDF" via impressão do navegador;
- o registro NC-2026-0012 nas listas reflete o progresso real do formulário.

## 4. Alterações no template

O diff completo está em `docs/integracao/alteracoes-no-template.diff`.

`web/index.html`:
- inclusão de `ctrlcd/ctrlcd.css` e dos cinco scripts de `ctrlcd/` após `app.js`;
- rótulos do rail: "Assistente CTRL" (chat) e "Registro de NC" (experiment);
- os quatro `.welcome__card` passaram a usar as perguntas sugeridas do Figma (Marco 2 da Skill 01);
- `#pageExperiment` recebeu `#experimentSlot` em largura total (classes `--app`).

`web/app.js`:
- `API.streamMessage()` passou a emitir uma resposta **simulada** na ordem `onMetadata → onDelta → onComplete`, com atraso e suporte a cancelamento, sem rede (Marco 3 da Skill 01). A resposta declara que é simulação e usa a frase exigida pela especificação: "Não localizei essa informação nas normas e nos documentos disponíveis.";
- rota inicial configurável (`DEFAULT_ROUTE`, padrão Registro de NC) e atalhos por URL (`#registro`, `#chat`, `#hacka`);
- tradução de rótulos que ainda estavam em inglês ("Copy", "Regenerate", "Delete chat", "Last/Older", "Thinking", "Reasoning").

Não foram alterados: `styles.css`, assets originais, `#pageHacka`, arquivos Python, `.github/skills/`. As terminações de linha CRLF do template foram preservadas.

## 5. Dados: origem e tratamento

| Dado | Tratamento |
| --- | --- |
| Registros NC-2026-0007 a 0012, PN-ABC-123456, EC-48291, SN-008742, AR-1144 etc. | **[Sintético]** Mantidos do protótipo. Nomes de pessoas substituídos por "Técnico demonstrativo A/B/C/D". |
| Lista de 86 tipos de não conformidade | **[Fonte: protótipo]** mantida integralmente. Fonte oficial da lista: **[A DEFINIR]**. |
| Requisitos do tipo "Vazamento" | **[Sintético]** Apenas esse tipo tem requisitos. Requisitos dos demais tipos: **[A DEFINIR]**. |
| "≤ 0,5 cm³/min (AMM 29-10-00)", "3.000 psi" e respostas do assistente citando normas | **Removidos.** Eram referências normativas sem documento de origem. O critério ficou vazio, com dica "A DEFINIR". |
| Motor "CFM56-GX", APU "GTCP36-300", materiais por zona | **Removidos.** Substituídos por rótulos genéricos; materiais como **[A DEFINIR]**. Capítulos ATA genéricos mantidos (53, 55, 57, 71, 49). |
| Consultas de PN/AR, análise de fotos, revisão inteligente | **Simulações locais**, sinalizadas na interface. A revisão só propõe texto derivado de dados já digitados pelo usuário. |

## 6. Como executar

Sem servidor (modo demonstração): abra `web/index.html` no navegador. O app abre direto no **Registro de NC**; o chat do Assistente CTRL fica no primeiro ícone do rail.

Com servidor estático (recomendado para testar como na Skill 02):

```powershell
python -m http.server 8000 --bind 127.0.0.1 --directory web
```

Depois acesse `http://127.0.0.1:8000`. Quando a Skill 02 criar o `serve.py`, use-o no lugar deste comando.

Roteiro de demonstração: Registro de NC → Novo registro → digite "vaza" → Vazamento → Confirmar → "Preencher com dados fictícios" → Próxima → adicione duas fotos → Aceitar → Próxima → Executar revisão inteligente → Aceitar/Editar → Próxima → Gerar anexo → Baixar PDF.

## 7. Compatibilidade com as skills

| Skill | Impacto |
| --- | --- |
| 01 — Criar interface | Marcos 1–3 já refletidos em `#pageChat`. Se o participante rodar a skill, ela deve detectar a interface personalizada e seguir para o refinamento (Marco 4). |
| 02 — Conectar | Substitui apenas a implementação de `API.streamMessage()`; o chip de conexão e `serve.py` não conflitam com `ctrlcd/`. O `serve.py` precisa servir a subpasta `web/ctrlcd/` com MIME correto para `.js` e `.css` (o contrato da skill já prevê servir toda a pasta `web/`). |
| 03–05 — Upload, vetorização e RAG | Atuam no chat. É onde as normas do Assistente CTRL serão carregadas e citadas. |
| 06 — Mapa mental | Usa `#pageHacka`, que não foi tocada. |

## 8. Validação executada

Teste automatizado em Chromium (Playwright), viewport 1440 × 900 e 1024 × 768:

1. card do chat preenche o campo; envio gera a resposta simulada;
2. navegação para o Ctrl + CD, histórico com filtros, rastreamento com busca e abas;
3. etapa 1: busca incremental mantém o foco e o texto; seleção e confirmação;
4. etapa 2: lista de pendências; digitação contínua no AS IS; localizador (zona, três níveis, confirmação); preenchimento fictício;
5. etapa 3: duas fotos com análise simulada, legenda e aceite; editor (círculo) e salvamento;
6. etapa 4: revisão inteligente e aceite das sugestões; etapa 5: geração e anexo imprimível;
7. rascunho restaurado após recarregar a página;
8. mascote → chat com pergunta pré-preenchida e botão de envio habilitado;
9. `#hackaSlot` intacto; sem rolagem horizontal em 1024 px;
10. **nenhum erro no console e nenhuma requisição de rede externa**.

Capturas em `docs/integracao/capturas/`.

Não executado: Windows/Edge, Firefox, Safari, leitor de tela, geração de PDF real a partir da caixa de impressão e testes com o `serve.py` da Skill 02 (ainda inexistente).

## 9. Lacunas encontradas no Material

- **[A DEFINIR]** `.github/skills/02-conectar/references/` está vazia; a skill cita `arquitetura-local.md`, `contrato-api.md` e `configuracao-segura.md` como normativos.
- **[A DEFINIR]** `.github/skills/01-criar-interface/resources/template/web/assets/*` e `.github/skills/06-criar-mapa-mental/resources/vendor/` estão vazias (cópia de recuperação e biblioteca Markmap).
- O `Material.zip` contém um `.env` preenchido e uma `.venv` do Windows. Ambos foram **excluídos** deste pacote. Trate a chave do `.env` original como segredo e não a versione.
- `teste_acesso.py` usa as variáveis `EXPLAB_ENDPOINT`/`EXPLAB_API_KEY`, enquanto `.env.example` e a Skill 02 usam `EXPERIMENTAL_LAB_API_URL`/`EXPERIMENTAL_LAB_API_KEY`. A divergência precisa ser confirmada com os organizadores.

## 10. Decisões pendentes para a equipe

1. **Página inicial.** **[Decisão, reversível]** O app passou a abrir direto no **Registro de NC**, conforme a especificação do Figma ("a interface principal não deve ser um chatbot"). A constante `DEFAULT_ROUTE` em `web/app.js` controla isso; use `"chat"` se precisar rodar as validações da Skill 01, que esperam abrir no chat. Também é possível forçar pela URL: `index.html#registro`, `#chat` ou `#hacka`.
2. Fonte oficial da lista de tipos de NC e dos requisitos por tipo. **[A DEFINIR]**
3. Se a revisão inteligente (etapa 4) usará o mesmo agente do chat (via `API`) ou uma action própria. **[A DEFINIR]**
4. Formato definitivo do anexo (PDF gerado no servidor ou impressão do navegador). **[A DEFINIR]**

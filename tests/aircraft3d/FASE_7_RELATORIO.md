# CTRL+CD — Fase 7: fallback, acessibilidade, responsividade, desempenho, testes e documentação

Data: 24/09/2026.

**Base:** Fase 6 (commit `7cb9d9b`).

**Commits:**
- `fa968f9`: 7a, fallback 2D;
- `df31c47`: 7b, acessibilidade, responsividade e desempenho;
- 7c: testes de ponta a ponta e documentação; hash em `git log`.

**Autorização:** execução automática ("seguir para fase 6 e todas as demais etapas de forma automática").

**Legenda:**
- **[F]** fonte;
- **[I]** inferência;
- **[D]** decisão de projeto;
- **[AD]** A DEFINIR.

## 7a. Fallback 2D (seção 18)

| Requisito | Como ficou |
|---|---|
| "Não exibir o SVG antigo deformado" | Removido. `ctrlcd/aircraft.js` foi reescrito sobre a **vista superior técnica corrigida** do protótipo 2D (`ctrlcd/aircraft-top-view.js`, gerado de `aircraft-artifact/svg/e195-e2-top.svg`, SHA-256 `c3d08d5a…`, sem alterar o desenho). |
| Selecionar grande região | Clique no desenho (um nível por vez) ou lista de níveis. São as mesmas 87 regiões e o mesmo texto do 3D. |
| Marcar ponto aproximado | "Marcar ponto aproximado" → clique sobre a região atual; ou "Marcar no centro da região", pelo teclado. O ponto é guardado em coordenadas do desenho e em metros **aproximados** (a partir do nariz; lateral positiva para a direita). |
| Confirmar localização parcial | "Confirmar localização" funciona a partir do nível 2, com ou sem ponto. |
| Continuar o formulário | `onConfirm(texto, detalhe)`, com o mesmo formato do 3D (`source: "2d"`) e a captura do desenho. |
| Quando entra | Todos os casos estão testados. <ul><li>Direto pelo botão principal: `CTRLCD_3D_ENABLED = false` ou módulo 3D ausente.</li><li>Pelo painel de erro do 3D, que explica o motivo e oferece "Usar vistas técnicas": sem WebGL 2 ou GLB com falha (404/corrompido).</li><li>Por escolha do usuário: "Usar vistas técnicas (2D)".</li><li>**"Desempenho insuficiente" (seção 18) não tem detecção automática: [AD].**</li></ul> |

**Decisões [D]:**
1. **Só a vista superior.** As laterais, a frontal e a traseira do protótipo 2D ficam **[AD]**. O ponto aproximado é definido na vista superior.
2. **Regiões ocultas nesta vista** (pilones, trens, portas, saídas, bocal, leme) só respondem ao clique quando o nível navegável as distingue, como no protótipo 2D.
3. **Painel de zona com PN fictício e "Sugestão do sistema":** sai junto com o desenho antigo.
4. **Mudança de API:** `ZONES` continua exportado só com rótulos, para compatibilidade da API.

## 7b. Acessibilidade, responsividade e desempenho (seções 20, 24 e 25)

| Tema | Resultado | Evidência |
|---|---|---|
| Diálogo modal | `role="dialog"`, `aria-modal`, título e descrição (o aviso demonstrativo) | `test_a11y_perf.py` |
| Nomes acessíveis | 0 botões sem nome no 3D e no 2D | idem |
| Foco visível | contorno sólido de 3 px | idem |
| Contraste (WCAG 2.x AA) | 12 tipos de texto no 3D e 6 no 2D; **mínimo 4,60:1** (limite 4,5:1) | idem, `metricas-desempenho.json` |
| Movimento reduzido | troca de vista instantânea, rotação automática indisponível, enquadramento 2D sem animação | idem |
| Tablet (820 × 1180) | botão "Recolher painéis": o canvas passa de 309 para 687 px de altura | idem, `capturas/f7-3-tablet.png` |
| Celular (390 × 844) | palco com 55 % da altura; painéis abaixo; **barra fixa com o próximo passo** (Confirmar região, Confirmar ponto, Usar no registro); o palco volta à vista ao entrar no modo de marcação | idem, `capturas/f7-4-celular-barra.png` |
| Assistente CTRL | oculto enquanto o 3D ou o 2D estão abertos; volta ao fechar | idem |
| Desempenho | índice de raycast em **fatias de ~12 ms**: 0 tarefas longas após o primeiro quadro (antes: uma tarefa de ~1,07 s) | idem |

**Métricas no ambiente de teste** (Chromium com renderização por software e CPU de contêiner; **não representam uma máquina com placa de vídeo** [I]):

| Métrica | Valor |
|---|---|
| GLB | 8,67 MB; 321.814 triângulos |
| Leitura do GLB (local) | cerca de 100 ms |
| Primeiro quadro | cerca de 1,0 a 1,1 s desde a abertura |
| Índice de raycast pronto | cerca de 1,5 a 2,8 s após o primeiro quadro, sem bloquear a interface |
| Maior tarefa longa após o primeiro quadro | 0 ms (nenhuma acima de 50 ms) |
| Captura (JPEG) | cerca de 60 KB no 3D e 47 KB no 2D |

**Não feito [AD]:**
- carregar os scripts do 3D só na primeira abertura (lazy loading). Hoje o GLB já é carregado só sob demanda; os cerca de 150 KB de JavaScript entram com a página;
- sombras (a especificação pede "sombras moderadas"; o visualizador não tem sombras desde a Fase 1);
- medição de FPS com placa de vídeo real.

## 7c. Testes da seção 26 e documentação

**`test_e2e_secao26.py`:** um único fluxo com os **25 passos** da seção 26 e as validações visuais.

**Validações visuais:**
- exatamente duas asas e dois motores, sem terceira asa;
- sem peças duplicadas (nomes únicos e nenhuma malha repetida);
- sem geometria flutuante (toda malha toca outra);
- modelo centralizado;
- marcador preso à superfície: após girar, o raio da câmera atinge o ponto com diferença abaixo de 1 mm;
- região correta em hover e na seleção.

**Documentação:**
- `frontend/ctrlcd/aircraft3d/README.md`, atualizado com arquitetura, API, integração, fallback e acessibilidade;
- `docs/proposta-backend-localizacao-aeronave.md`, a **proposta separada** exigida pela seção 22: contrato, payload, campos, versionamento, migração, validação, privacidade e tamanho da captura. **Não foi implementada.**

## Revisão independente

Um agente revisor, sem acesso ao contexto da implementação, leu o diff `a82130e..HEAD` e a especificação.

**Regras rígidas confirmadas:**
- back-end intacto;
- GLB com o SHA-256 original;
- sem CDN, iframe ou URL externa;
- nenhuma coordenada enviada;
- 0 `any`;
- mudanças no `app.js` só por acréscimo.

**Achados corrigidos:**
1. **(média)** O 2D podia gravar a localização quando o usuário cancelava durante a captura assíncrona. Agora `confirm()` sai se o modal já foi fechado.
2. **(média)** Um ID de região desconhecido num rascunho podia derrubar a renderização do formulário. Os formatadores agora toleram IDs e números inválidos.
3. **(baixa)** A troca do 3D para o 2D não repassava a localização estruturada. Agora repassa (`location`).
4. **(baixa)** Os dados de demonstração do `app.js` tinham o texto trocado. Foi revertido; ficou só `aircraftLocation = null`.
5. **(baixa)** Havia uma corrida entre salvar e ler a captura. `load()` não sobrescreve mais uma captura mais nova.
6. **(baixa)** O anúncio dizia "Captura gerada" antes da captura. Agora o texto depende do resultado.
7. **(baixa)** Havia afirmações imprecisas nos relatórios (sem WebGL 2, "sem chamadas de rede", versão da API). Foram corrigidas.

**Registrado sem correção:**
- as capturas de registros descartados ficam no IndexedDB (cerca de 60 KB cada), porque limpá-las exigiria mexer no fluxo de novo registro (seção 1). A limpeza fica [AD];
- `snapshot` é metadado, e não `string`, o que é um desvio consciente da seção 9, descrito no relatório da Fase 6.

## Suítes (todas aprovadas)

| Suíte | Verificações |
|---|---|
| `test_fase1.py` | 40 |
| `test_fase2.py` | 28 |
| `test_fase3.py` | 43 |
| `test_fase4.py` | 34 |
| `test_fase5.py` | 30 |
| `test_fase6.py` | 19 |
| `test_hierarquia_2d.py` | 13 (eram 14 na Fase 6; as três verificações do painel de zona antigo viraram duas, com "Alterar") |
| `test_fallback_2d.py` | 19 |
| `test_a11y_perf.py` | 15 |
| `test_e2e_secao26.py` | 30 |
| **Total** | **271** |
| TypeScript estrito (`tsc`, `checkJs`) | 0 erros; nenhum `any` |

**Intermitência observada:** na rodada final, `test_fase5.py` falhou 1 vez em 3 execuções por tempo esgotado num clique do Playwright (`Page.click`, 30 s), no ambiente com renderização por software. A falha não se repetiu nas outras duas execuções (30/30).

**Testes antigos ajustados nesta fase** (a mudança de comportamento foi intencional):
- **Fallback 2D:**
  - o painel de zona do desenho antigo deixou de existir;
  - `test_hierarquia_2d` passa a trocar de ramo por "Alterar";
  - a confirmação do 2D é assíncrona por causa da captura, então as esperas passam para 1,2 a 1,5 s;
  - URLs `blob:` da captura local não contam como requisição externa.
- **Celular (`test_fase5`):** a espera ao entrar no modo de marcação acompanha a rolagem do palco de volta à vista.
- **Rotação automática:** o passo por quadro passou de 0,1 s para 0,25 s. Com o índice montado em fatias, os quadros ficaram mais lentos na renderização por software, e a rotação desacelerava.

## Limitações finais

1. **Captura e localização estruturada só no navegador.** O envio ao servidor depende da proposta de back-end, que ainda precisa de autorização.
2. **Só a vista superior no 2D.** As demais vistas técnicas corrigidas existem no protótipo, mas não foram integradas **[AD]**.
3. **As 63 regiões sem geometria própria no GLB** (seções da asa, níveis 4 e 5) são escolhidas pela lista, e o 3D realça a região-mãe. A coerência entre o ponto e a subdivisão é afirmação do usuário.
4. **Desempenho com placa de vídeo real, sombras e lazy loading dos scripts:** **[AD]**.

## Rollback

- **Toda a Fase 7:** `git checkout 7cb9d9b -- frontend tests docs`, e apague os arquivos criados:
  - `aircraft-top-view.js`;
  - `test_fallback_2d.py`, `test_a11y_perf.py` e `test_e2e_secao26.py`;
  - a proposta de back-end.
- **Desligar o 3D sem editar código:** `window.CTRLCD_3D_ENABLED = false`. O botão principal passa a abrir as vistas técnicas.

# Localizador da peça na aeronave — CTRL+CD (visualizador 3D + vistas técnicas 2D, Fases 1 a 7)

> Modelo visual demonstrativo. Não representa geometria CAD oficial ou certificada.

## O que é

Um visualizador WebGL2 do arquivo `frontend/models/e195-e2-demonstrativo.glb`, escrito em JavaScript puro. Ele segue o mesmo padrão do restante do CTRL+CD: sem build, sem npm, sem CDN e sem módulos ES.

| Arquivo | Função |
|---|---|
| `math.js` | matrizes e vetores (coluna principal) |
| `glb-loader.js` | leitura do GLB local, com progresso, cancelamento, validação e cache da sessão (um único download) |
| `camera-utils.js` | `calculateObjectBounds`, `fitCameraToObject`, `cameraLimits`, `animateCameraToTarget`, `resetCamera` |
| `renderer.js` | renderização: luz ambiente em hemisfério, luz principal, luz de preenchimento, grade técnica; limite de resolução; perda de contexto; `dispose()` |
| `orbit-controls.js` | controles de órbita: girar, zoom e mover (mouse, toque e teclado com o foco no canvas), com amortecimento e limites |
| `view-presets.js` | as 8 vistas predefinidas (Perspectiva, Isométrica, Superior, Inferior, Frontal, Traseira, Lateral esquerda e direita), cada uma enquadrada pela caixa envolvente |
| `../aircraft-location.js` | captura (snapshot) em IndexedDB local e linhas do compilado/anexo (`window.CtrlCDAircraftLocation`) |
| `../aircraft-top-view.js` | vista superior técnica corrigida (SVG inline, 87 regiões) usada pelo fallback 2D |
| `../aircraft.js` | **fallback 2D** (vistas técnicas): seleção por nível no desenho ou na lista, ponto aproximado, captura do desenho |
| `../aircraft-hierarchy.js` | **hierarquia compartilhada com o localizador 2D** (`window.CtrlCDAircraftHierarchy`): 87 regiões, rótulos, caminho ↔ texto |
| `regions.js` | hierarquia de 87 regiões em 5 níveis (`AIRCRAFT_REGIONS`, lida de `aircraft-hierarchy.js`), correspondência com os nós do GLB (`AIRCRAFT_MESH_MAP`), região-mãe com geometria (`geometryFor`) e `AircraftLocation` (`locationFrom`) |
| `raycaster.js` | índice BVH dos 321 mil triângulos e raycast (Möller–Trumbore, dupla face) |
| `selection.js` | hover, dica, clique, duplo clique e toque sobre o canvas |
| `panels.js` | hierarquia (breadcrumb, Voltar um nível, lista do próximo nível), resumo da seleção e bloco "Localização" (Confirmar região, Finalizar como localização parcial) |
| `marker.js` | marcador da não conformidade: clique no modo de marcação, arrasto do pino, "Marcar no centro da tela", dica própria |
| `navigation.js` | barra de vistas e ações (zoom −/+, Ajustar à tela, rotação automática, Redefinir, Tela cheia), rotação automática e tela cheia (nativa ou simulada por CSS) |
| `viewer.js` | modal, estados de carregamento e erro, botão e tecla R, aviso demonstrativo; API `window.CtrlCDAircraft3D` |
| `aircraft3d.css` | estilos (prefixo `.ccd-a3d-`) |
| `aircraft3d-types.d.ts` | tipos, usados só na verificação TypeScript. **Não é carregado pelo navegador** |

A ordem de carregamento está no `index.html`, logo após `ctrlcd/aircraft.js`, e deve ser mantida: `math.js` → `glb-loader.js` → `camera-utils.js` → `renderer.js` → `orbit-controls.js` → `view-presets.js` → `navigation.js` → `regions.js` → `raycaster.js` → `selection.js` → `panels.js` → `marker.js` → `viewer.js`; antes deles: `ctrlcd/aircraft-hierarchy.js` → `aircraft-location.js` → `aircraft-top-view.js` → `aircraft.js`.

## API

```js
window.CtrlCDAircraft3D.open({ current, location, onConfirm, onClose });   // mesmo contrato de window.CtrlCDAircraft.open
//   onConfirm(texto, detalhe): texto = regionSelected (compatível); detalhe = { label, location: AircraftLocation, snapshotDataUrl }
//   location: AircraftLocation salva no registro → reabrir restaura caminho, ponto e confirmação
window.CtrlCDAircraft3D.isSupported();   // { ok, reason } — file:// e ausência de WebGL2
window.CtrlCDAircraft3D.modelUrl();      // URL do GLB, relativa ao documento
window.CtrlCDAircraft3D.lastMetrics;     // { bytes, loadMs, triangles, firstFrameMs, downloads, raycastBuildMs, raycastTriangles }
window.CtrlCDAircraft3D.inspect();       // { camera, preset, animating, autoRotate, fullscreen, ready, selection: { focusId, selectedId, hoverId, confirmedPath, location, marker, markMode, … } } ou null
window.CtrlCDAircraft3D.pick(x, y);      // raycast no ponto da tela (sem selecionar): { leafId, targetId, nodeName, distance, point, normal } ou null
window.CTRLCD_3D_ENABLED = false;        // desliga o 3D sem editar código (volta ao localizador 2D)
```

**Integração com o formulário (Fase 6):** o visualizador chama `onConfirm(texto, detalhe)` em "Usar esta localização no registro".
- O formulário grava o texto em `regionSelected` e a estrutura em `aircraftLocation`.
- A captura vai para o IndexedDB local.
- Quando o usuário escolhe as vistas técnicas (2D), o contrato é repassado para `window.CtrlCDAircraft.open`, que chama `onConfirm` com o mesmo formato (`source: "2d"`).
- **Nada é enviado ao servidor.** A proposta de contrato para o back-end está em `docs/proposta-backend-localizacao-aeronave.md` e não foi implementada.

## Requisitos de execução

A aplicação precisa ser servida por HTTP. Por exemplo, a partir da pasta `backend`:

```
python -m http.server 4173 --bind 127.0.0.1 --directory frontend
```

Aberto direto do disco (`file://`), o navegador bloqueia a leitura do GLB, e o visualizador oferece as vistas técnicas. O navegador precisa de WebGL 2 (Chrome, Edge, Firefox e Safari atuais).

## Testes

```
python tests/aircraft3d/test_fase1.py        # Fase 1: 40 verificações (Playwright + Chromium)
python tests/aircraft3d/test_fase2.py        # Fase 2: 28 verificações (navegação)
python tests/aircraft3d/test_fase3.py        # Fase 3: 43 verificações (seleção)
python tests/aircraft3d/test_fase4.py        # Fase 4: 34 verificações (hierarquia)
python tests/aircraft3d/test_fase5.py        # Fase 5: 30 verificações (marcador)
python tests/aircraft3d/test_fase6.py        # Fase 6: 19 verificações (formulário, captura, compilado, anexo)
python tests/aircraft3d/test_hierarquia_2d.py   # localizador 2D com a hierarquia compartilhada: 13 verificações
python tests/aircraft3d/test_fallback_2d.py  # Fase 7: 19 verificações (fallback 2D, sem WebGL, GLB 404, 3D desligado)
python tests/aircraft3d/test_a11y_perf.py    # Fase 7: 15 verificações (acessibilidade, contraste, movimento reduzido, tablet, celular, desempenho)
python tests/aircraft3d/test_e2e_secao26.py  # Fase 7: os 25 passos e as validações visuais da seção 26 (30 verificações)
tsc -p tests/aircraft3d/tsconfig.json        # TypeScript estrito sobre os .js (@ts-check)
```

## Navegação (Fase 2)

| Ação | Mouse / toque | Teclado (foco no canvas) | Botão |
|---|---|---|---|
| Girar | arrastar / um dedo | setas | — |
| Zoom | roda / pinça | + e − | − e + |
| Mover | botão direito ou Shift + arrastar / dois dedos | Shift + setas | — |
| Vistas | — | — | Perspectiva, Isométrica, Superior, Inferior, Frontal, Traseira, Lateral esquerda, Lateral direita |
| Enquadrar | — | — | Ajustar à tela (mantém a direção de observação) |
| Voltar ao início | — | R | Redefinir |
| Tela cheia | — | — | Tela cheia / Sair da tela cheia |
| Rotação automática | — | — | Iniciar / Pausar rotação |

**Rotação automática:**
- começa desligada;
- para ao primeiro contato do usuário (arrastar, roda, teclado, vista ou zoom) e só volta pelo botão;
- fica indisponível quando o sistema pede movimento reduzido (`prefers-reduced-motion`);
- gira só a câmera; o modelo não muda.

**Vistas superior e inferior:** usam 89,4° de elevação, e não 90°, para manter a orientação contínua. Nas duas, o nariz fica no alto da tela.

## Seleção (Fase 3)

| Ação | Mouse | Toque | Teclado |
|---|---|---|---|
| Destacar (hover) | passar sobre a região: realce claro e dica com nome e nível | — | foco num item da lista |
| Selecionar | clique (sem arrastar mais de 4 px) | toque | Enter ou Espaço num item da lista; setas ↑ ↓ percorrem a lista |
| Aproximar | duplo clique, ou botão **Aproximar** | toque duplo | botão **Aproximar** |
| Limpar | botão **Limpar seleção** (clicar no fundo não limpa) | idem | idem |
| Fechar a dica | sair da região | — | Escape (o Escape seguinte fecha o modal) |

- **Alvo do clique:** com o foco na aeronave, o clique seleciona a **grande região** (nível 2) que contém a peça atingida. Exemplo: motor → "Grupo motor esquerdo". Descer para os níveis seguintes é a Fase 4.
- **Lado:** esquerdo e direito são sempre os da aeronave, não os da tela. Na vista frontal, a asa à esquerda da tela é a asa direita.
- **Realce:** um tom por desenho, aplicado no shader, e um contorno em espaço de tela: claro no hover e azul na seleção. O verde fica reservado à confirmação, na Fase 4. **Os materiais do GLB nunca são alterados.**
- **Estado:** o visualizador guarda só IDs de região (strings). Nenhum objeto gráfico fica em estado serializável.
- **Índice de raycast:** é construído logo após o primeiro quadro. A lista de regiões fica desabilitada até ele ficar pronto. O índice é reaproveitado ao reabrir o modal.
- **Rotação automática:** fica indisponível enquanto houver uma região selecionada.

## Hierarquia (Fase 4)

**Fluxo:** selecionar → revisar o resumo → **Confirmar região** → selecionar o próximo nível → … → **Finalizar como localização parcial**. O marcador do ponto (nível 6) é da Fase 5.

**Confirmar região:**
- a região fica verde e passa a ser o foco;
- o breadcrumb ganha um nível;
- a lista mostra os filhos da região;
- a câmera aproxima, mas só se a região tiver geometria própria diferente da anterior;
- o que está fora do foco fica esmaecido.

**Clique no 3D:**
- nunca avança mais de um nível;
- fora do foco, não troca de ramo e mostra a dica "Fora de ‹foco›".

**Voltar um nível:** desfaz a última confirmação. A região de onde saiu volta como seleção candidata.

**Breadcrumb:** volta a qualquer nível confirmado e desfaz as confirmações abaixo dele.

**Regiões sem geometria própria:** as seções da asa e os níveis 4 e 5, 63 regiões ao todo.
- São subdivisões **demonstrativas**, escolhidas pela lista.
- O 3D realça a região-mãe mais próxima que tem malha.
- A lista e o resumo marcam "sem geometria própria".
- Nenhuma zona é calculada ou desenhada sobre a malha.

**Localização parcial:**
- disponível a partir do nível 2;
- gera um `AircraftLocation` serializável: `aircraftModel`, `currentView`, `locationPath`, `locationIds`, `regionId`, `sectionId`, `structureId`, `componentId`, `partial: true`, `confirmed: true`, `confirmedBy: "user"`;
- mostra "Localização confirmada pelo usuário.";
- trava a edição até **Editar localização**.

## Marcador da não conformidade (Fase 5)

**Modo de marcação:**
- **Ativação:** botão "Marcar ponto da não conformidade", disponível a partir do nível 2 confirmado.
- **Onde marcar:** o clique só marca sobre a superfície da região confirmada. Fora dela aparece a dica "Fora de ‹região›", e uma peça que esteja na frente bloqueia a marcação.
- **Teclado:** gire a vista com as setas e use "Marcar no centro da tela", que marca sob a mira.
- **Saída:** Escape sai do modo.

**Dados do ponto (`DefectPosition`, só números e strings):**
- `regionId`: região confirmada;
- `meshRegionId`: região com malha atingida;
- `meshName`;
- `worldPosition` e `localPosition` (pela inversa da matriz da malha);
- `surfaceNormal`, voltada ao observador;
- `referenceView`;
- `confirmed`.
- Os valores são arredondados a 0,1 mm.

**Pino:**
- haste na direção da normal e disco de tamanho fixo na tela;
- um leve viés de profundidade evita o z-fighting;
- atrás da aeronave, continua visível em translúcido;
- azul antes da confirmação e verde depois.

**Ações:**
- **Arrastar o pino:** o arrasto começa a até 16 px dele e não gira a câmera.
- **Reposicionar, Remover e Confirmar ponto.**
- **Mensagens:** "Ponto marcado, aguardando confirmação." antes; "Localização confirmada pelo usuário." depois.

**Localização gerada:** "Confirmar ponto" gera a `AircraftLocation` com `partial: false` e `defectPosition`.

**Troca de nível:** se a nova região em foco não contém o ponto, ele é removido, com aviso.

## Integração com o formulário (Fase 6)

| Onde | O que aparece |
|---|---|
| Etapa 2 | "Selecionar no modelo da aeronave" abre o 3D; "Usar vistas técnicas (2D)" é a alternativa. Depois da confirmação: "Localização confirmada pelo usuário", o texto, o detalhe (origem, nível, ponto) e a miniatura da captura. "Editar" reabre com tudo restaurado. |
| Compilado (Etapa 4) | Linha "Localização" (texto, como antes) + "Localização — detalhe", "Ponto da não conformidade", "Confirmação da localização" + a captura |
| Anexo (impressão) | As mesmas linhas na seção 2 e o bloco "LOCALIZAÇÃO NO MODELO DA AERONAVE" com a captura |

**Captura:** gerada automaticamente depois de confirmar, com:
- a região centralizada e realçada;
- o marcador visível;
- sem grade;
- sem painéis, dicas nem botões;
- uma faixa com o aviso demonstrativo.

**Armazenamento:** JPEG com cerca de 60 KB, em IndexedDB (`ctrlcd-aircraft-location`). O registro guarda só a referência.

## Fallback 2D (Fase 7)

**Quando entra:**
- sem WebGL 2;
- GLB com falha;
- `CTRLCD_3D_ENABLED = false`;
- módulo 3D ausente;
- escolha do usuário.

**O que mostra:** a vista superior técnica **corrigida**. O desenho genérico antigo foi removido.

**O que permite:**
- selecionar nível a nível, pelo desenho ou pela lista;
- marcar um **ponto aproximado**, em metros aproximados a partir do nariz e do eixo;
- confirmar a localização parcial;
- continuar o formulário.

As regiões ocultas nesta vista (pilones, trens, portas, saídas, bocal, leme) só respondem quando o nível navegável as distingue.

## Acessibilidade, responsividade e desempenho (Fase 7)

**Acessibilidade:**
- diálogo modal com título e descrição;
- nomes acessíveis em todos os botões;
- foco visível de 3 px;
- regiões `aria-live` para anunciar estados;
- contraste WCAG AA medido: mínimo 4,6:1;
- `prefers-reduced-motion` respeitado no 3D e no 2D;
- todo o fluxo funciona pelo teclado (lista, Enter/Espaço, "Marcar no centro").

**Responsividade:**
- **tablet:** painéis recolhíveis;
- **celular:** palco com 55 % da altura, painéis abaixo e barra fixa com o próximo passo (Confirmar região, Confirmar ponto, Usar no registro);
- o Assistente CTRL fica oculto enquanto um localizador está aberto.

**Desempenho:**
- o índice de raycast é montado **em fatias de ~12 ms**, sem tarefa longa após o primeiro quadro (antes: cerca de 1,07 s numa única tarefa);
- métricas em `tests/aircraft3d/capturas/metricas-desempenho.json`.

# CTRL+CD — Fase 5: marcador da não conformidade (e localizador 2D com a hierarquia compartilhada)

Data: 24/09/2026.

**Base:** Fase 4 (commit `8939616`).

**Esta entrega tem duas partes:**

| Parte | Conteúdo | Commit |
|---|---|---|
| A | Localizador 2D com a mesma hierarquia do 3D | `4c21e35` (autorizado: "o localizador 2D deve usar a mesma hierarquia") |
| B | Fase 5, marcador (seção 16 da especificação) | ver `git log` |

**Fora do escopo:** snapshot, entrega ao formulário (`onConfirm`/`regionSelected`), compilado (Fase 6) e back-end.

**Legenda:**
- **[F]** fonte;
- **[D]** decisão de projeto;
- **[H]** hipótese de modelagem;
- **[AD]** A DEFINIR.

## Parte A: localizador 2D com a hierarquia compartilhada

| Ação | Arquivo | O que mudou |
|---|---|---|
| criado | `frontend/ctrlcd/aircraft-hierarchy.js` | fonte única das 87 regiões (`window.CtrlCDAircraftHierarchy`): rótulos dos níveis, caminho, filhos, texto ↔ caminho |
| alterado | `frontend/ctrlcd/aircraft.js` | os 6 níveis e as listas vêm da hierarquia compartilhada; zona do desenho ↔ região; pré-seleção pelo texto atual; painel da zona com nível, caminho e subdivisões |
| alterado | `aircraft3d/regions.js` | passa a ler a hierarquia compartilhada (antes tinha uma cópia) |
| alterado | `frontend/index.html` | +1 `<script>` antes de `ctrlcd/aircraft.js` |
| criado | `tests/aircraft3d/test_hierarquia_2d.py` | 14 verificações |

**O que continua igual:**
- o contrato `window.CtrlCDAircraft.open({ current, onConfirm(string), onClose })`;
- o desenho SVG;
- o zoom;
- o botão "Confirmar localização".

**Mudanças visíveis no 2D:**
1. **Níveis e listas:** os mesmos níveis e listas do 3D, com Grande região no nível 2 e as seções no nível 3.
2. **Texto confirmado:** o mesmo do 3D, por exemplo "Asa esquerda · Bordo de ataque".
3. **Nível 6:** não é mais uma lista genérica. Aparece como "Marcada no modelo 3D (ponto da não conformidade)".
4. **Clique numa zona do desenho:** o painel passa a mostrar a região, o nível, o caminho e as subdivisões.
   - **Saíram** o "PN de referência (fictício)", o "Capítulo ATA", o "Material: A DEFINIR" e o "Origem: Sugestão do sistema".
   - Esses campos pertenciam à hierarquia antiga, e "Sugestão do sistema" contradiz a seção 23 da especificação [D].
   - "Selecionar esta região" preenche o caminho até a região da zona. Isso já acontecia no 2D antes: um clique explícito numa seção preenchia a grande região.
5. **Texto no formato antigo:** um texto como "Fuselagem – Seção central · …" é convertido na pré-seleção para "Fuselagem · Fuselagem central".

**Observação [AD]:** os dados de demonstração de `app.js` (`fillDemoData`) ainda gravam "Asa direita · Sistema hidráulico · Interface inferior", que é da hierarquia antiga. A pré-seleção aproveita "Asa direita" e para ali. Não alterei `app.js`. Ajustar o texto de demonstração fica a seu critério.

## Parte B: Fase 5, marcador

| Ação | Arquivo | O que mudou |
|---|---|---|
| criado | `aircraft3d/marker.js` | modo de marcação (clique sem arrasto), dica própria, arrasto do pino (captura no palco antes da órbita), "Marcar no centro da tela" |
| alterado | `aircraft3d/renderer.js` | pino do marcador: haste na normal e disco de tamanho fixo em tela, com viés de profundidade e passada translúcida quando está oculto; azul ou verde |
| alterado | `aircraft3d/viewer.js` | estado do ponto (`DefectPosition`), validação pela região confirmada, confirmação (`partial: false` + `defectPosition`), remoção quando o ponto sai da região em foco, Escape em três etapas |
| alterado | `aircraft3d/panels.js` | bloco "Ponto da não conformidade": status, dados, Marcar/Reposicionar, Marcar no centro da tela, Remover, Confirmar ponto; selo "Com ponto marcado" |
| alterado | `math.js`, `camera-utils.js`, `selection.js` | inversa 4×4 (posição local); projeção de ponto na tela; o raycast devolve o índice da malha |
| alterado | `aircraft3d.css`, `aircraft3d-types.d.ts`, `README.md`, `index.html` | estilos (mira, cursores, status); tipos `DefectPosition`, `MarkerTool`; documentação; +1 `<script>` |
| criado | `tests/aircraft3d/test_fase5.py` | 30 verificações |

**Não alterados:** `app.js`, o GLB (SHA-256 conferido) e o back-end.

**Dependências novas:** nenhuma.

### Decisões

1. **Onde se pode marcar [D].**
   - Só sobre a superfície da região em foco, a partir do nível 2.
   - A região vale pela malha atingida no raio da câmera, então uma peça na frente bloqueia a marcação.
   - Nas regiões sem geometria própria, como "Slats – asa esquerda", vale a superfície da região-mãe (a asa). `regionId` guarda a região da hierarquia e `meshRegionId` guarda a malha atingida.
2. **Normal [D].**
   - É a normal geométrica da face, voltada ao observador, porque o modelo é desenhado com dupla face.
   - Assim, o pino fica do lado em que o usuário clicou.
3. **Tamanho estável [D].**
   - O disco tem 18 px (vezes a densidade da tela) e é limitado ao tamanho máximo de ponto do dispositivo.
   - A haste mede 4,5 % da distância da câmera.
4. **Visível durante a rotação [D].**
   - Quando o ponto fica atrás da aeronave, o pino aparece translúcido (35 %).
   - Quando está à vista, aparece opaco.
5. **Depois de marcar, o modo se encerra [D].**
   - Para mover o ponto, use **Reposicionar** ou arraste o pino.
   - O arrasto só começa a até 16 px do pino, e o resto do gesto continua girando a vista.
6. **Confirmar ponto é também confirmar a localização [D].**
   - Gera a `AircraftLocation` com `partial: false` e `defectPosition` completo.
   - Exibe "Localização confirmada pelo usuário.".
   - **Editar localização** devolve o ponto ao estado "aguardando confirmação", em azul.
7. **Com um ponto marcado, "Finalizar como localização parcial" fica bloqueado [D].** Para finalizar sem o ponto, é preciso removê-lo antes.
8. **Mudança de nível [D].**
   - Confirmar uma sub-região que contém o ponto mantém o ponto, que passa a pertencer a ela.
   - Se a nova região em foco não o contém, ele é removido, com aviso.
9. **`onConfirm` continua sem ser chamado.** A entrega ao formulário é da Fase 6.

## Verificações

| Verificação | Resultado |
|---|---|
| TypeScript estrito (`tsc`, `checkJs`) | 0 erros; nenhum `any` |
| Sintaxe (`node --check`) | todos os arquivos |
| `test_fase5.py` | **30/30** |
| `test_hierarquia_2d.py` | **14/14** |
| `test_fase4.py` (regressão) | **34/34** |
| `test_fase3.py` (regressão) | **43/43** |
| `test_fase2.py` (regressão) | **28/28** |
| `test_fase1.py` (regressão) | **40/40**, incluindo a confirmação pelo localizador 2D |
| Console / rede | sem erros; 1 download do GLB; nenhuma requisição externa |

**O que o `test_fase5.py` confere:**
- **Modo de marcação:**
  - indisponível sem região confirmada;
  - mira e botão de centro visíveis quando ativo;
  - dicas dentro e fora da região;
  - o clique no motor, fora da asa confirmada, é recusado.
- **Ponto marcado:**
  - malha, região, normal unitária voltada à câmera e vista de referência corretas;
  - posição local × matriz da malha = posição global;
  - o ponto está na superfície: a distância do raio da câmera coincide com a distância ao ponto;
  - texto "Ponto marcado, aguardando confirmação.".
- **Pino:**
  - o disco azul aparece;
  - o tamanho se mantém após o zoom (84 → 84 pixels);
  - a posição 3D se mantém nas vistas perspectiva, lateral e traseira;
  - continua visível na traseira.
- **Arrasto:**
  - move o ponto sobre a asa, 3,55 m no teste, sem girar a câmera;
  - um arrasto longe do pino gira a vista e não mexe no ponto.
- **Ações:** Reposicionar; Escape sai do modo sem fechar o modal; Remover.
- **Teclado:** "Marcar no centro da tela" na fuselagem, e o foco vai para Confirmar ponto.
- **Mudança de nível:** confirmar a seção que contém o ponto o mantém; confirmar outra seção o remove, com aviso.
- **Confirmar ponto:**
  - aparece o texto exato;
  - `partial: false` e `defectPosition` serializável;
  - o pino fica verde;
  - o ponto confirmado não se move, e Remover e Reposicionar ficam bloqueados;
  - não há termos de validação técnica.
- **Editar localização:** o ponto volta a azul.
- **Celular:** toque para marcar, sem estouro horizontal.

**Capturas:**
- `capturas/f5-1-ponto-marcado.png`: ponto azul na asa esquerda, vista superior;
- `capturas/f5-2-ponto-outra-vista.png`: o mesmo ponto na vista traseira;
- `capturas/f5-3-ponto-confirmado.png`: ponto verde confirmado, com "Localização confirmada pelo usuário.";
- `capturas/f5-4-celular.png`.

**Três defeitos encontrados e corrigidos durante os testes:**
1. **Botões com o atributo `hidden` continuavam visíveis,** porque o estilo `.ccd-btn` define `display`. Isso afetava "Marcar no centro da tela" e "Finalizar parcial" depois da confirmação. Uma regra CSS no escopo do visualizador corrige.
2. **No celular, o bloco novo de ponto espremia o palco** (243 px) e sobrepunha os painéis. Agora o palco ocupa 55 % da altura e os painéis rolam abaixo dele.
3. **Um teste da Fase 5 tinha um Escape a mais,** que fechava o modal. O erro era do teste, não do código.

## Como testar

1. Abra o visualizador 3D. Confirme **Asa esquerda**.
2. Clique em **Marcar ponto da não conformidade** e depois num ponto da asa. O pino azul aparece e o status muda para "Ponto marcado, aguardando confirmação."
3. Gire a vista e troque de vista: o pino fica no lugar. Arraste o pino. Use **Reposicionar** e **Remover**.
4. Marque de novo e clique em **Confirmar ponto**. O pino fica verde e aparece "Localização confirmada pelo usuário.".
5. Teclado: confirme uma região pela lista. Depois: Marcar ponto → **Marcar no centro da tela**, girando com as setas antes.
6. **2D:** Etapa 2 → "Selecionar no modelo da aeronave". Os níveis e listas são os mesmos do 3D.
7. Testes automáticos, um por vez: `test_fase1.py` a `test_fase5.py` e `test_hierarquia_2d.py`.

## Limitações

1. **A localização com ponto ainda não chega ao formulário.** Isso é da Fase 6: `onConfirm`, a compatibilidade com `regionSelected` e o snapshot.
2. **O localizador 2D ainda não tem marcação de ponto.** O fallback com "marcar ponto aproximado" (seção 18) está previsto para a Fase 7.
3. **Regiões sem geometria própria:** o ponto indica a posição na região-mãe. A coerência entre o ponto e a subdivisão escolhida, por exemplo um ponto realmente sobre os slats, é **afirmação do usuário**, não verificação do sistema. Isso está coerente com a seção 23.
4. **Normal em malha de dupla face:** o pino fica do lado em que o usuário clicou, não necessariamente na face externa da peça.
5. **Arrasto do pino por toque:** está implementado, mas não é coberto pelo teste automático, que cobre o toque para marcar.
6. **Faixa escura das janelas:** um ponto sobre ela é atribuído à seção pela posição longitudinal, como na seleção.
7. **Desempenho com placa de vídeo real** continua **[AD] A MEDIR**.

## Rollback

- **Desfazer só a Fase 5:** `git checkout 4c21e35 -- frontend tests`, e apague `marker.js` e `test_fase5.py`.
- **Desfazer também a hierarquia no 2D:** `git checkout 8939616 -- frontend tests`, e apague `aircraft-hierarchy.js` e `test_hierarquia_2d.py`.
- **Desligar o 3D sem editar código:** `window.CTRLCD_3D_ENABLED = false`.

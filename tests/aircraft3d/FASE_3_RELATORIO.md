# CTRL+CD — Fase 3: seleção de regiões no visualizador 3D

Data: 24/09/2026.

**Base:** Fase 2 (commit `830fae7`).

**Implementado nesta fase (seção 13 da especificação):**
- correspondência entre regiões lógicas e nós do GLB;
- raycast;
- hover com realce e dica;
- clique para selecionar;
- contorno;
- painel de resumo;
- lista textual sincronizada com o 3D;
- Aproximar e duplo clique.

**Fora do escopo:** descer níveis, breadcrumb navegável, confirmação, localização parcial, Voltar (Fase 4); marcador (Fase 5); formulário, snapshot, relatório e `regionSelected` (Fase 6); back-end.

## Arquivos

| Ação | Arquivo | O que mudou |
|---|---|---|
| criado | `frontend/ctrlcd/aircraft3d/regions.js` | `AIRCRAFT_REGIONS` (24 regiões, níveis 1 a 3, rótulos em português) e `AIRCRAFT_MESH_MAP` (região → nomes aceitos do nó no GLB); hierarquia, caminho e alvo do clique |
| criado | `frontend/ctrlcd/aircraft3d/raycaster.js` | índice BVH (SAH, 12 compartimentos, folhas de 8 triângulos) e raycast Möller–Trumbore de dupla face |
| criado | `frontend/ctrlcd/aircraft3d/selection.js` | hover (mouse), dica, clique, duplo clique e toque; distingue clique de arrasto |
| criado | `frontend/ctrlcd/aircraft3d/panels.js` | lista "Regiões" (esquerda) e resumo "Seleção" (direita) |
| alterado | `frontend/ctrlcd/aircraft3d/viewer.js` | layout em três colunas, estado da seleção (só IDs), Aproximar, Escape em duas etapas, `inspect().selection`, `pick()` |
| alterado | `frontend/ctrlcd/aircraft3d/renderer.js` | realce por região: tom no shader e contorno em espaço de tela; **materiais nunca são alterados** |
| alterado | `frontend/ctrlcd/aircraft3d/camera-utils.js` | `rayFromScreen` (raio pela câmera) e `boundsFromBox` |
| alterado | `frontend/ctrlcd/aircraft3d/orbit-controls.js` | clique curto (< 4 px) não gira nem desmarca a vista; `onPointerContact`; `dragging` |
| alterado | `aircraft3d.css`, `aircraft3d-types.d.ts`, `README.md` | estilos dos painéis e da dica, tipos, documentação |
| alterado | `frontend/index.html` | +4 `<script>` (`regions.js`, `raycaster.js`, `selection.js`, `panels.js`) |
| alterado | `tests/aircraft3d/test_fase2.py` | 1 linha: a verificação de tela cheia mede o modal (`.ccd-a3d`), e não o canvas, que agora divide a largura com os painéis |
| criado | `tests/aircraft3d/test_fase3.py` | 43 verificações |

**Não alterados:** `ctrlcd/app.js`, o localizador 2D, o GLB, o back-end e as demais telas.

**Dependências novas:** nenhuma.

## Como a seleção funciona

- **Hover (mouse):**
  - realce claro na região;
  - contorno claro;
  - dica com o nome, o nível e "Clique para selecionar · duplo clique para aproximar".
  - Não move a câmera e não muda de nível.
- **Clique:**
  - seleciona a região: tom azul e contorno azul;
  - atualiza o resumo: Região, ID, Nível, Lado, Caminho;
  - marca o item na lista;
  - habilita **Aproximar** e **Limpar seleção**;
  - a câmera não se move.
  - Um arrasto de mais de 4 px é navegação e não seleciona.
  - Um clique no fundo não desfaz a seleção.
- **Duplo clique ou Aproximar:**
  - seleciona e enquadra a região, mantendo a direção de observação;
  - usa margem de 1,6, para a região não ficar sob a barra de vistas.
- **Alvo do clique:**
  - com o foco na aeronave, o clique seleciona a **grande região (nível 2)** que contém a peça atingida;
  - exemplos: motor ou pilone → Grupo motor; estabilizador → Empenagem; qualquer seção da fuselagem → Fuselagem;
  - descer aos níveis seguintes é a Fase 4.
- **Lado:**
  - esquerdo e direito são sempre os da aeronave;
  - na vista frontal, a asa à esquerda da tela é a **asa direita**. Isso está verificado em teste.
- **Faixa escura das janelas** (nó auxiliar `fuselage_window_background`):
  - nunca é alvo direto;
  - é atribuída à seção da fuselagem pela posição longitudinal.
- **Lista textual (seção 24):**
  - usa botões nativos;
  - Enter e Espaço selecionam;
  - as setas ↑ ↓ percorrem a lista;
  - foco ou mouse sobre um item realça a região no 3D;
  - a seleção é anunciada ao leitor de tela.
- **Escape:**
  - com a dica aberta, fecha a dica;
  - o Escape seguinte fecha o modal.
- **Rotação automática:**
  - pausa ao tocar ou clicar no modelo;
  - fica indisponível com uma região selecionada.
- **Estado:**
  - só IDs de região (strings): `focusId`, `selectedId` e `hoverId`;
  - o realce é um parâmetro de desenho por quadro, sem guardar objetos gráficos;
  - ao limpar a seleção, a imagem volta a ser idêntica à inicial.

## Verificações

| Verificação | Resultado |
|---|---|
| TypeScript estrito (`tsc`, `checkJs`) | 0 erros; nenhum `any` |
| Sintaxe (`node --check`) | todos os arquivos |
| `test_fase3.py` | **43/43** |
| `test_fase2.py` (regressão) | **28/28**, após o ajuste de 1 linha descrito acima |
| `test_fase1.py` (regressão) | **40/40** |
| Console / rede | sem erros; nenhuma requisição externa; 1 download do GLB, inclusive ao reabrir |

**Métricas no ambiente de teste** (Chromium com renderização por software e CPU de contêiner):
- **Índice de raycast:** 1,07 s para 321.814 triângulos, construído uma única vez por sessão, depois do primeiro quadro.
- **Consulta de raycast:** 0,003 ms em média, sobre 400 pontos espalhados pelo canvas, parte deles fora da aeronave.

**O que o `test_fase3.py` confere:**
- **Hover:**
  - na asa esquerda: dica "Asa esquerda · Nível 2";
  - a câmera não se move;
  - o item da lista é destacado;
  - o realce aparece e some ao sair.
- **Clique:**
  - asa, motor (→ grupo motor), fuselagem, estabilizador (→ empenagem) e trem de pouso, este na vista inferior;
  - o painel mostra os 5 campos;
  - aparece o contorno;
  - o clique no vazio e o arrasto não alteram a seleção.
- **Lado:** conferido nas vistas superior e frontal.
- **Aproximar e duplo clique:** a distância cai e o alvo fica no centro da região.
- **Lista:** foco, setas, Enter, Espaço e mouse; anúncio ao leitor de tela.
- **Escape:** fecha primeiro a dica e depois o modal.
- **Rotação automática:** a seleção a bloqueia; o clique a pausa.
- **Materiais:** inalterados; o estado é serializável.
- **Reabertura:** sem novo download, com o índice reaproveitado.
- **Celular:** o toque seleciona; não há estouro horizontal.

**Capturas:**
- `capturas/f3-1-selecao-asa.png`: asa esquerda selecionada, na vista superior;
- `capturas/f3-2-aproximar-motor.png`: grupo motor esquerdo após Aproximar;
- `capturas/f3-3-celular.png`: layout em coluna, com a fuselagem selecionada por toque.

## Como testar

1. Sirva o `frontend` por HTTP, como nas fases anteriores.
2. Siga: Novo registro → Vazamento → Etapa 2 → "Está instalada no avião?" = Sim → **Visualizar modelo 3D (prévia)**.
3. Passe o mouse sobre as asas, os motores e a cauda: confira a dica e o realce, e veja que a câmera não se move.
4. Clique numa região: confira o resumo à direita e o item marcado na lista.
5. Na vista **Frontal**, clique na asa à esquerda da tela: o resultado deve ser **Asa direita**.
6. Teste **Aproximar**, o duplo clique e **Limpar seleção**.
7. Use Tab até a lista; depois as setas, Enter e Espaço; depois Escape com a dica aberta.
8. Testes automáticos, um por vez:
   ```
   python tests/aircraft3d/test_fase1.py
   python tests/aircraft3d/test_fase2.py
   python tests/aircraft3d/test_fase3.py
   ```

## Limitações

1. **Confirmar região fica desabilitado,** com a indicação "Disponível na Fase 4". Descer níveis, o breadcrumb navegável, "Localização confirmada pelo usuário." e Voltar são da Fase 4. O visualizador 3D ainda **não chama `onConfirm`**: a localização continua sendo confirmada pelas vistas técnicas (2D).
2. **O índice de raycast é uma tarefa longa na thread principal:** cerca de 1,1 s no ambiente de teste. Nesse intervalo, a imagem já aparece, mas a lista fica desabilitada e o clique ainda não seleciona. Em equipamento real, o tempo está **A MEDIR**. Se incomodar, o cálculo pode ir para um Web Worker, sem dependências novas.
3. **Asas só têm geometria até o nível 2.** Na Fase 4, será preciso decidir como descer dentro da asa: por zonas calculadas no próprio modelo ou só pela lista textual. **A DEFINIR.**
4. **Faixa das janelas:** ao selecionar uma seção da fuselagem (nível 3, Fase 4), o realce não cobre a faixa escura das janelas daquela seção, porque ela é uma malha única da fuselagem inteira.
5. **Aproximar enquadra o grupo motor inteiro, incluindo o pilone.** O pilone fica sob a asa, então o motor aparece um pouco acima do centro.
6. **Toque:** não existe hover, por definição. O toque duplo para aproximar está implementado, mas **não está coberto pelo teste automático.**
7. **A região já informada no registro** (`regionSelected`) ainda não é pré-selecionada no 3D. Isso é da Fase 6.
8. **Desempenho com placa de vídeo real** continua **A MEDIR**: o contorno acrescenta uma passada de máscara quando há hover ou seleção.

## Rollback

- **Voltar à Fase 2:** `git checkout 830fae7 -- frontend tests`, e apague os 4 arquivos novos (`regions.js`, `raycaster.js`, `selection.js`, `panels.js`).
- **Desligar o 3D sem editar código:** `window.CTRLCD_3D_ENABLED = false`.

# CTRL+CD — Fase 2: navegação no visualizador 3D

Data: 23/09/2026.

**Base:** Fase 1 corrigida (commit `f64f140`).

**Implementado nesta fase:**
- vistas predefinidas;
- zoom e movimento (também por botões e teclado);
- Ajustar à tela;
- tela cheia;
- rotação automática.

**Fora do escopo:** seleção, hover, tooltip, hierarquia, marcador, snapshot, integração com o formulário e back-end.

## Arquivos

| Ação | Arquivo | O que mudou |
|---|---|---|
| criado | `frontend/ctrlcd/aircraft3d/view-presets.js` | as 8 vistas e o enquadramento de cada uma pela caixa envolvente |
| criado | `frontend/ctrlcd/aircraft3d/navigation.js` | barra de vistas e ações, rotação automática, tela cheia (nativa ou simulada por CSS) |
| alterado | `frontend/ctrlcd/aircraft3d/viewer.js` | liga a navegação: transição animada, Ajustar à tela, zoom por botões, rotação, tela cheia; `inspect()` para testes e integração |
| alterado | `frontend/ctrlcd/aircraft3d/camera-utils.js` | limite de elevação de ±83° para ±89,4° (vistas superior e inferior) |
| alterado | `frontend/ctrlcd/aircraft3d/renderer.js` | vetor "para cima" sempre +Y (orientação contínua, sem salto perto dos polos) |
| alterado | `frontend/ctrlcd/aircraft3d/orbit-controls.js` | teclado com o foco no canvas: setas giram, Shift + setas movem, + e − dão zoom |
| alterado | `aircraft3d.css`, `aircraft3d-types.d.ts`, `README.md` | estilos da barra e da tela cheia, tipos, documentação |
| alterado | `frontend/index.html` | +2 `<script>` (`view-presets.js`, `navigation.js`) |
| criado | `tests/aircraft3d/test_fase2.py` | 28 verificações |

**Não alterados:** `ctrlcd/app.js`, o localizador 2D, o back-end e as demais telas.

**Dependências novas:** nenhuma. Os recursos usados são nativos do navegador:
- a Fullscreen API (tela cheia);
- a consulta `matchMedia`, que lê a preferência de movimento reduzido do sistema.

## Vistas

Todas enquadram a aeronave inteira pela caixa envolvente, na direção da própria vista. Em todas o alvo fica no centro da caixa.

| Vista | Direção do observador | Orientação na tela (conferida por projeção) |
|---|---|---|
| Perspectiva | frente-esquerda, 21,8° acima | vista inicial |
| Isométrica | frente-esquerda, 45° no plano, 35,3° acima | direção isométrica em projeção perspectiva |
| Superior | acima (89,4°) | nariz para cima; asa esquerda à esquerda |
| Inferior | abaixo (−89,4°) | nariz para cima; asa esquerda à direita |
| Frontal | à frente do nariz | asa esquerda à direita |
| Traseira | atrás da cauda | asa esquerda à esquerda |
| Lateral esquerda | lado esquerdo | nariz à esquerda |
| Lateral direita | lado direito | nariz à direita |

**Troca de vista:**
- anima câmera e alvo em 650 ms; com movimento reduzido, a troca é instantânea;
- não baixa o GLB de novo;
- a vista ativa fica marcada (`aria-pressed`) e é anunciada ao leitor de tela.

**Girar, mover ou dar zoom manualmente:** a marcação de vista ativa é removida, porque a câmera passa a estar numa posição livre.

**Um erro encontrado e corrigido durante o teste:** a vista inferior saía com o nariz para baixo, o que equivale a uma rotação de 180°. A causa era observar pelo lado da cauda; agora a vista observa pelo lado do nariz.

## Verificações

| Verificação | Resultado |
|---|---|
| TypeScript estrito (`tsc`, `checkJs`) | 0 erros; nenhum `any` |
| Sintaxe (`node --check`) | todos os arquivos |
| `test_fase2.py` | **28/28**, em duas execuções seguidas |
| `test_fase1.py` (regressão) | **40/40** |
| Console / rede | sem erros; nenhuma requisição externa; 1 download do GLB |

**O que o `test_fase2.py` confere:**
- **Vistas:**
  - as 8 vistas têm ângulos corretos, alvo no centro, aeronave inteira na tela (≈ 96 % da maior dimensão) e orientação verificada por projeção de nariz, cauda e pontas das asas;
  - a transição é animada;
  - trocar de vista não baixa o GLB de novo.
- **Zoom:**
  - os botões − e + ajustam o zoom;
  - a distância mínima é respeitada;
  - as setas giram 5° e desmarcam a vista predefinida;
  - Shift + setas movem e + aproxima.
- **Ajustar à tela:** recentraliza e enquadra, mantendo a direção de observação.
- **Tela cheia:**
  - nativa: entra e sai preservando a vista e a câmera;
  - simulada por CSS: entra e sai quando o navegador não tem a Fullscreen API.
- **Rotação automática:**
  - começa desligada;
  - gira ao iniciar;
  - pausa ao primeiro contato e não volta sozinha;
  - escolher uma vista também a pausa.
- **Movimento reduzido:** troca de vista instantânea e rotação indisponível, com o motivo.
- **Celular:** sem estouro horizontal, alvos de toque ≥ 32 px e vista escolhida por toque.

**Capturas:**
- `capturas/f2-1-oito-vistas.png`: as 8 vistas em uma prancha;
- `capturas/f2-2-tela-cheia.png`;
- `capturas/f2-3-celular.png`.

## Como testar

1. Sirva o `frontend` por HTTP, como na Fase 1.
2. Siga: Novo registro → Vazamento → Etapa 2 → "Está instalada no avião?" = Sim → **Visualizar modelo 3D (prévia)**.
3. Clique nas 8 vistas e confira a orientação conforme a tabela acima.
4. Com o foco no canvas, use as setas, Shift + setas e + / −.
5. Teste **Ajustar à tela**, **Iniciar rotação** (depois clique no modelo para pausar) e **Tela cheia**.
6. Testes automáticos:
   ```
   python tests/aircraft3d/test_fase1.py
   python tests/aircraft3d/test_fase2.py
   ```

## Limitações

1. **"Centralizar seleção", "Voltar um nível" e duplo clique para aproximar ainda não existem.** Eles dependem da seleção por raycast (Fase 3) e da hierarquia (Fase 4).
2. **Perspectiva e Isométrica são parecidas** (mesma direção horizontal, elevações de 21,8° e 35,3°). A isométrica usa projeção perspectiva, e não ortográfica. Uma projeção ortográfica ficaria a critério seu, **A DEFINIR**.
3. **A vista inferior fica mais escura,** porque a luz principal vem de cima. É fisicamente coerente, mas pode reduzir a legibilidade. Uma luz de baixo mais forte é opcional.
4. **Sem sombras**, como na Fase 1.
5. **Enquadramento fixo após a troca de vista:** ao girar o celular ou mudar o tamanho da janela, a vista continua com o enquadramento anterior. "Ajustar à tela" recalcula.
6. **Tela cheia nativa não existe no iPhone.** Lá, a tela cheia é simulada: ocupa a janela do navegador, mas não esconde a barra de endereço.
7. **Desempenho com placa de vídeo real** continua **A MEDIR** no seu equipamento.

## Rollback

- **Voltar à Fase 1 corrigida:** `git checkout f64f140 -- frontend tests`.
- **Desligar o 3D sem editar código:** `window.CTRLCD_3D_ENABLED = false`.

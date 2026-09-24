# CTRL+CD — Fase 4: hierarquia no visualizador 3D

Data: 24/09/2026.

**Base:** Fase 3 (commit `1c853f9`).

**Implementado nesta fase (seções 13 e 14 da especificação):**
- os seis níveis da hierarquia;
- breadcrumb navegável;
- Confirmar região, com destaque verde;
- avanço de um nível por vez;
- aproximação ao confirmar;
- Voltar um nível;
- localização parcial.

**Fora do escopo:**
- marcador (nível 6, Fase 5);
- entrega ao formulário, `regionSelected`, snapshot e compilado (Fase 6);
- back-end.

**Legenda:**
- **[F]** fonte;
- **[D]** decisão de projeto;
- **[H]** hipótese de modelagem;
- **[AD]** A DEFINIR.

## Arquivos

| Ação | Arquivo | O que mudou |
|---|---|---|
| alterado | `aircraft3d/regions.js` | de 24 para 87 regiões, copiadas da fonte única do protótipo 2D (`aircraft-artifact/tools/regions_spec.py`) com os mesmos IDs e rótulos; `geometryFor` (região-mãe com malha), `nodeFor`, `isDescendantOf`, `locationFrom` e `labelOf` |
| alterado | `aircraft3d/panels.js` | breadcrumb, Voltar um nível, título do nível, lista do próximo nível, marcação "sem geometria própria", Confirmar região, bloco "Localização", Finalizar como localização parcial, Editar localização |
| alterado | `aircraft3d/viewer.js` | caminho confirmado, foco, confirmação, retorno, breadcrumb, localização parcial, realce por nó do GLB, dica fora do foco, foco do teclado após cada ação; a câmera inicial é medida depois do rodapé preenchido |
| alterado | `aircraft3d/renderer.js` | esmaecimento fora do foco; prioridade do realce: seleção > hover > confirmado > esmaecido |
| alterado | `aircraft3d/selection.js` | dica informativa quando o ponto atingido não é alvo, por estar fora do foco ou por ser o próprio foco |
| alterado | `aircraft3d.css`, `aircraft3d-types.d.ts`, `README.md` | estilos da hierarquia e do resultado; tipos `AircraftLocation` e `HierarchyViewState`; documentação |
| alterado | `tests/aircraft3d/test_fase3.py` | 4 verificações adaptadas (detalhes abaixo) |
| criado | `tests/aircraft3d/test_fase4.py` | 34 verificações |

**Não alterados:** `app.js`, o GLB (SHA-256 conferido), o localizador 2D, o back-end e o `index.html`.

**Dependências novas:** nenhuma.

**Ajustes no `test_fase3.py`** (o comportamento mudou de propósito):
1. "Confirmar região" deixou de ser um botão fixo com a indicação "Disponível na Fase 4": agora ele é habilitado quando há seleção.
2. A versão passou a ser aceita pelo prefixo `fase-`.
3. O estado serializável da seleção agora inclui `confirmedPath`, uma lista de IDs, e `location`.

As demais verificações da Fase 3 ficaram iguais.

## Decisões

1. **Hierarquia [D].**
   - Reaproveitei a árvore de 87 regiões do protótipo 2D, em vez de criar outra.
   - Distribuição: 1 no nível 1, 7 no nível 2, 24 no nível 3, 21 no nível 4 e 34 no nível 5.
   - O nível 6 nunca é estático: será a área marcada pelo marcador.
   - As subdivisões continuam **demonstrativas [H]**: não correspondem a limites reais de painéis ou componentes.
2. **Geometria [D].**
   - O GLB só tem malhas até o nível 3 (nas asas, até o nível 2) [F].
   - As 63 regiões sem malha própria (seções da asa, níveis 4 e 5) são escolhidas pela lista, e o 3D realça a região-mãe mais próxima que tem malha.
   - A lista mostra "sem geometria própria". O resumo mostra "realce em ‹região-mãe›" e um aviso explícito.
   - **Nenhuma zona foi calculada ou desenhada sobre a malha.**
3. **Um nível por vez [D].**
   - O clique no 3D seleciona só o filho direto do foco.
   - Um clique fora do foco não troca de ramo. A dica orienta: "Fora de ‹foco› · Use Voltar um nível ou o breadcrumb".
   - Trocar de ramo pelo breadcrumb desfaz as confirmações abaixo do nível escolhido.
4. **Voltar um nível [D].** A região de onde o usuário saiu volta como seleção candidata, **não confirmada**.
5. **Aproximação ao confirmar [D].**
   - A câmera só se move quando a nova região tem malha diferente da anterior.
   - A direção de observação é mantida.
   - Com movimento reduzido, a transição é instantânea (herdado da Fase 2).
6. **Localização parcial [D].**
   - Disponível a partir do nível 2.
   - Gera um `AircraftLocation` serializável, no formato da seção 9 da especificação, acrescido de `locationIds` e `confirmedBy: "user"`.
   - Exibe exatamente "Localização confirmada pelo usuário.", com a marca "Parcial · até o nível N (…)".
   - `currentView` é a vista ativa ou, com a câmera livre, a vista predefinida mais próxima.
7. **`onConfirm` continua sem ser chamado [D].**
   - A entrega ao formulário e a compatibilidade com `regionSelected` são da Fase 6.
   - A localização finalizada fica no estado do visualizador (`inspect().selection.location`).
   - O painel avisa que, por enquanto, o registro é feito pelas vistas técnicas (2D).

## Verificações

| Verificação | Resultado |
|---|---|
| TypeScript estrito (`tsc`, `checkJs`) | 0 erros; nenhum `any` |
| Sintaxe (`node --check`) | todos os arquivos |
| `test_fase4.py` | **34/34** |
| `test_fase3.py` (regressão) | **43/43**, com os ajustes descritos acima |
| `test_fase2.py` (regressão) | **28/28** |
| `test_fase1.py` (regressão) | **40/40** |
| Console / rede | sem erros; 1 download do GLB na sessão inteira; nenhuma requisição externa |

**O que o `test_fase4.py` confere:**
- **Dados:**
  - 87 regiões nos níveis corretos, cada pai um nível acima e IDs únicos;
  - as 18 malhas do mapa existem no GLB;
  - 2 asas e 2 motores.
- **Confirmar região:**
  - o caminho e o foco avançam um nível;
  - a câmera aproxima;
  - o breadcrumb e a lista do nível seguinte são atualizados, com as seções da asa marcadas "sem geometria própria";
  - a confirmação é anunciada;
  - a região fica verde e o restante esmaecido, conferido por pixels.
- **Clique:**
  - na própria asa em foco, não avança;
  - no motor, que está fora do foco, não troca de ramo;
  - as dicas corretas aparecem nos dois casos.
- **Teclado:**
  - descida até o nível 5 (Slats – asa esquerda);
  - Confirmar pelo Enter;
  - após confirmar, o foco vai ao primeiro item do novo nível;
  - a câmera fica parada quando não há geometria nova.
- **Retorno:** Voltar um nível; breadcrumb para "Asa esquerda" e para "Aeronave", voltando à aeronave inteira, sem verde nem esmaecimento.
- **Vistas:** trocar de vista preserva o caminho e não baixa o GLB de novo.
- **Localização parcial:**
  - o objeto gerado é o esperado;
  - aparece o texto exato de confirmação;
  - não há termos de validação técnica ou identificação automática;
  - a edição fica travada até **Editar localização**;
  - a rotação automática fica indisponível;
  - só o nível 2 já é suficiente.
- **`onConfirm`:** não é chamado; `onClose` é chamado.
- **Celular:** toque para selecionar e botão Confirmar por toque, sem estouro horizontal.

**Capturas:**
- `capturas/f4-1-asa-confirmada.png`: asa esquerda confirmada, em verde, com o restante esmaecido e a lista do nível 3;
- `capturas/f4-2-localizacao-parcial.png`: resultado "Localização confirmada pelo usuário." (parcial, até o nível 3);
- `capturas/f4-3-celular.png`.

**Dois defeitos encontrados e corrigidos durante os testes:**
1. **O foco do teclado caía no `<body>` depois de Confirmar, Voltar e breadcrumb,** porque o botão usado ficava desabilitado ou era recriado. Agora o foco vai para o primeiro item do novo nível, para Voltar ou para Editar localização, conforme a ação.
2. **O breadcrumb era recriado a cada hover,** o que podia anular um clique. Agora ele só é recriado quando o caminho muda.

## Como testar

1. Abra o visualizador como nas fases anteriores: Etapa 2 → **Visualizar modelo 3D (prévia)**.
2. Clique na asa esquerda e depois em **Confirmar região**. A asa fica verde, o restante esmaece, a câmera aproxima e a lista mostra as seções.
3. Escolha **Bordo de ataque** na lista e confirme. Repita com **Dispositivos hipersustentadores** e depois **Slats – asa esquerda**.
4. Use **Voltar um nível** e os itens do breadcrumb.
5. Volte a **Aeronave** e confirme **Fuselagem**. Clique na seção central e confirme. Depois clique em **Finalizar como localização parcial**.
6. Testes automáticos, um por vez:
   ```
   python tests/aircraft3d/test_fase1.py
   python tests/aircraft3d/test_fase2.py
   python tests/aircraft3d/test_fase3.py
   python tests/aircraft3d/test_fase4.py
   ```

## Limitações

1. **A localização finalizada ainda não chega ao formulário.** Isso é da Fase 6. Até lá, o registro continua sendo feito pelas vistas técnicas (2D).
2. **A hierarquia 3D difere das listas genéricas do localizador 2D atual** (`ctrlcd/aircraft.js`: Seção, Sistema, Conjunto…). O texto da localização vai divergir entre os dois até a Fase 6. **[AD]** O localizador 2D deve adotar a mesma hierarquia?
3. **O realce da região-mãe** para as 63 regiões sem malha mostra só o contexto, não a posição. A posição virá do marcador, na Fase 5.
4. **Faixa escura das janelas:** ao confirmar uma seção da fuselagem, ela não fica verde, porque é uma malha única da fuselagem inteira (já registrado na Fase 3).
5. **A localização não sobrevive ao fechamento do modal.** Isso é intencional até a Fase 6: nada é gravado fora do visualizador.
6. **Desempenho com placa de vídeo real** continua **[AD] A MEDIR**.

## Rollback

- **Voltar à Fase 3:** `git checkout 1c853f9 -- frontend tests`, e apague `tests/aircraft3d/test_fase4.py`.
- **Desligar o 3D sem editar código:** `window.CTRLCD_3D_ENABLED = false`.

# CTRL+CD — Fase 6: integração com o formulário, snapshot e compilado

Data: 24/09/2026.

**Base:** Fase 5 (commit `532ceab`).

**Autorização:** executada em sequência automática ("seguir para fase 6 e todas as demais etapas de forma automática").

**Legenda:**
- **[F]** fonte;
- **[D]** decisão de projeto;
- **[AD]** A DEFINIR.

## O que mudou para o usuário

1. **Localizador principal:** na Etapa 2, "Selecionar no modelo da aeronave" agora abre o **visualizador 3D**. "Usar vistas técnicas (2D)" fica ao lado como alternativa, conforme a seção 1 da especificação ("Preserve uma alternativa 2D apenas como fallback").
   - Com o 3D desligado (`CTRLCD_3D_ENABLED = false`) ou com um módulo ausente, o mesmo botão abre o 2D.
   - **Sem WebGL 2** ou com falha no GLB, o 3D abre o painel de erro, que explica o motivo e oferece "Usar vistas técnicas". Esse comportamento foi aprovado na Fase 1 (verificação 8).
2. **Captura automática (snapshot):** depois de "Confirmar ponto" ou "Finalizar como localização parcial", o visualizador gera uma captura (seção 17). Ela tem:
   - a região confirmada centralizada e realçada em verde;
   - o marcador visível;
   - sem grade;
   - sem dica, painéis, controles nem botões, que são HTML fora do canvas;
   - uma faixa fixa com o aviso demonstrativo e o texto da localização.

   A interface é restaurada logo depois.
3. **"Usar esta localização no registro":** fecha o visualizador e grava no formulário. Ações disponíveis no resultado:
   - "Usar esta localização no registro", que devolve ao formulário (passo 18);
   - "Editar localização", que reabre a edição.
4. **Resumo da Etapa 2** (passo 19):
   - "Localização confirmada pelo usuário";
   - o texto;
   - o detalhe, por exemplo "Modelo 3D · até o nível 3 (Seção) + ponto marcado";
   - a miniatura da captura.

   **Editar** reabre o 3D com caminho, ponto e confirmação restaurados (passo 22).
5. **Compilado preliminar (Etapa 4, passos 20 e 21):** mantém a linha "Localização" e ganha:
   - a linha "Localização — detalhe";
   - a linha "Ponto da não conformidade", com coordenadas em metros e superfície;
   - a linha "Confirmação da localização";
   - a captura.
6. **Anexo (documento final):**
   - a seção 2 ganha as mesmas linhas;
   - entra um bloco "LOCALIZAÇÃO NO MODELO DA AERONAVE", com a captura e a legenda demonstrativa.

## Contrato e dados

| Item | Decisão |
|---|---|
| `onConfirm` | `onConfirm(texto, detalhe)`. O **1º argumento continua sendo a string de `regionSelected`**, igual à do localizador 2D (seção 21, "compatibilidade temporária"). O 2º argumento, opcional, é `{ label, location: AircraftLocation, snapshotDataUrl }`. O 2D continua chamando só `onConfirm(texto)` [D]. |
| Desvio da seção 9 | Na especificação, `AircraftLocation.snapshot` é `string` (a imagem). Aqui é um objeto de metadados (`width`, `height`, `bytes`, `createdAt`), e a imagem fica no IndexedDB, para não inflar o rascunho do `localStorage` [D]. |
| Registro (`S.rec`) | Novo campo `aircraftLocation`, com a `AircraftLocation` estruturada (caminho de IDs, `defectPosition`, `source`, metadados da captura). Sem objetos gráficos; cerca de 3 KB no rascunho. |
| Captura | JPEG (qualidade 0,86), com cerca de 60 KB no teste. Fica **só no navegador**, em IndexedDB, no banco próprio `ctrlcd-aircraft-location`, separado das fotos. O registro guarda só a referência (`snapshot.bytes/width/height/createdAt`). Isso evita inflar o `localStorage` [D]. |
| Servidor | Nada é enviado. A única requisição do localizador é a leitura do GLB local (mesma origem). Localização, coordenadas e captura não saem do navegador, e o teste confirma zero requisições externas (seção 22). |
| Trocar pelo 2D | Uma confirmação pelo localizador 2D substitui a localização. A estruturada do 3D e a captura são removidas. |

**Tensão na especificação [D]:** a seção 1 pede para não alterar a "geração do documento", mas a seção 17 pede a captura "no documento final". O anexo recebeu **somente acréscimos**: linhas extras na tabela e o bloco com a imagem. A lógica de geração, a numeração e os demais campos não mudaram.

## Arquivos

| Ação | Arquivo |
|---|---|
| criado | `frontend/ctrlcd/aircraft-location.js`: armazenamento local da captura e formatação das linhas |
| alterado | `frontend/ctrlcd/app.js`: acréscimos localizados. Campo `aircraftLocation`, `LocationSection` (botão principal 3D, alternativa 2D, detalhe e miniatura), `compiledRows` (+3 linhas quando há localização estruturada), Etapa 4 (figura), `printAnnex` (linhas + figura). Nos dados de demonstração, só `aircraftLocation = null`: o texto original foi mantido depois da revisão da Fase 7, porque os localizadores o aceitam pelo prefixo. |
| alterado | `aircraft3d/viewer.js`: `applyInitialLocation`, `captureSnapshot`, `useLocation` |
| alterado | `aircraft3d/panels.js`: prévia da captura e botão "Usar esta localização no registro" |
| alterado | `aircraft3d/renderer.js`: `render(..., { grid: false })` para a captura |
| alterado | `aircraft3d.css`, `aircraft3d-types.d.ts`, `index.html` (+1 script), `tsconfig.json` |
| criado | `tests/aircraft3d/test_fase6.py`: 19 verificações |

**Testes antigos ajustados** (a abertura mudou de propósito; o conteúdo das verificações foi mantido):
- **Botão de abertura:** `open-3d-preview` → `open-3d` em todas as suítes.
- **`test_fase1`:**
  - a abertura confere agora o botão principal e a alternativa 2D;
  - no B7 (módulo ausente), o botão principal abre o 2D.
- **`test_hierarquia_2d`:** abre o 2D pela alternativa `open-2d`.
- **`test_fase4`:** o objeto esperado ganhou `source: "3d"`.
- **`test_fase5`:** a versão passa a ser aceita pelo prefixo.

## Verificações

| Suíte | Resultado |
|---|---|
| `test_fase6.py` | **19/19** |
| `test_fase5.py` | **30/30** |
| `test_fase4.py` | **34/34** |
| `test_fase3.py` | **43/43** |
| `test_fase2.py` | **28/28** |
| `test_fase1.py` | **40/40** |
| `test_hierarquia_2d.py` | **14/14** |
| TypeScript estrito | 0 erros; nenhum `any` |

**Capturas:**
- `capturas/f6-1-captura.jpg`: a captura gerada;
- `capturas/f6-2-visualizador-resultado.png`;
- `capturas/f6-3-resumo-etapa2.png`;
- `capturas/f6-4-compilado.png`.

## Limitações

1. **A captura existe só no navegador em que foi feita.** Outro computador verá o texto e os dados, mas não a imagem. Levar a captura ao servidor depende da proposta de back-end, que **não foi implementada** (seção 22).
2. **O histórico da conta** guarda a localização estruturada, como já guardava o texto. A imagem continua só no IndexedDB, por registro.
3. **Enquadramento da captura:** usa a direção de observação atual. Uma vista fixa por região, por exemplo a lateral para a fuselagem, fica **[AD]**.

## Rollback

`git checkout 532ceab -- frontend tests`, e apague `aircraft-location.js` e `test_fase6.py`.

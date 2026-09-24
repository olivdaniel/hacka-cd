# CTRL+CD — relatório da integração (front + back)

Data: 24/09/2026.

**Legenda:**
- **[F]** fato verificado no código ou em teste;
- **[D]** decisão tomada na integração;
- **[AD]** A DEFINIR.

## 1. O que foi juntado

| Origem | Conteúdo principal |
|---|---|
| **Fases 1 a 7** (trabalho da noite) | visualizador 3D do E195-E2 (`frontend/ctrlcd/aircraft3d/`, `frontend/models/e195-e2-demonstrativo.glb`); localizador 2D; localização estruturada, captura e compilado; testes `tests/aircraft3d/`; lançador `iniciar_ctrlcd.py` / `INICIAR_CTRLCD.bat` |
| **`hackaemb-backend.zip`** (back-end novo) | `agent.py` e `serve.py` (Assistente CTRL: `/api/chats/messages`, `/api/health`); `training_docs.py`, `training_sync.py` e `docs/training_docs/` (base de treinamento); `fastapi_app.py` (`/api/records`, revisão por IA); `user_api.py` (tabela `records`). No front: chat real, pop-up com conversa, gravação da NC no servidor, revisão remota, evidências com vídeo, perfis de requisitos |
| **`hackaemb-feature-tipo-de-nao-conformidade.zip`** | lista oficial do **Anexo 6.2** (`ANEXO_6_2_ROWS` em `data.js`, 85 tipos); ícone "i" com as Normas de Engenharia; requisitos por item com **AS IS / TO BE**; CSVs do Anexo em `docs/`; CORS para localhost e 5173; `package-lock.json` |
| **`hackaemb-frontend.zip`** | só o `README.md` padrão do GitLab, sem código [F]. Nada a integrar |

A base comum dos três é o commit `a82130e`, o projeto original. A integração foi feita com Git, em merge de três vias: cada mudança foi aplicada sobre a base, e não por cópia de pastas.

## 2. Conflitos e como foram resolvidos [D]

| Arquivo | Conflito | Resolução |
|---|---|---|
| `frontend/index.html` | scripts e estilos do 3D × parâmetros `?v=` do back-end novo | mantidos os dois; versões atualizadas (`ctrlcd.css?v=3`, `data.js?v=3`, `app.js?v=8`, `ctrlcd/app.js?v=16`) para o navegador não usar cópia antiga |
| `frontend/ctrlcd/app.js`, compilado (Etapa 4) | captura 3D × contagem via `requirementsList` | mantidos os dois |
| `frontend/ctrlcd/app.js`, modelo de requisitos | back-end novo: perfis de poucos tipos (`NC_REQUIREMENT_PROFILES`); feature: Anexo 6.2 completo, com AS IS/TO BE por item | **prevalece o Anexo 6.2**, que é a fonte oficial. Os campos que o back-end grava e revisa (`requirementSource`, `applicableStandards`) passam a vir da mesma linha do Anexo |
| `frontend/ctrlcd/app.js`, Etapa 1 | aviso "Normas aplicáveis" × ícone "i" com as normas | fica o ícone "i" da feature, para a informação não aparecer duas vezes |
| `fastapi_app.py`, CORS | 4173/8000 × 4173/5173 com localhost | união: 127.0.0.1 e localhost nas portas 4173, 5173 e 8000 |
| `.gitignore` | dois arquivos | união, incluindo `.env` e `.training_docs_manifest.json` |

**Fim de linha:** os arquivos da feature vieram com fim de linha LF, e o projeto usa CRLF. Foram convertidos antes do merge, e só as mudanças reais entraram [F].

**Arquivos ausentes na feature:** `usuarios/users.sqlite3`, uma captura antiga e o `Regras de negócio.txt` com nome corrigido. Foram tratados como ausentes no pacote, não como exclusões intencionais: os dois primeiros foram mantidos e a cópia duplicada do terceiro foi descartada [D].

## 3. Ajustes feitos na integração

Uma revisão independente apontou os itens abaixo, todos corrigidos [D]:

1. **Compilado (Etapa 4) e anexo impresso:** passam a mostrar as **Normas aplicáveis** e cada item do Anexo 6.2 com o seu AS IS/TO BE. Antes, esses itens eram preenchidos mas não saíam no documento.
2. **Rascunhos salvos no formato anterior:** as respostas antigas (`req-*`) não são perdidas. Ficam visíveis como "Respostas do formato anterior (consulta)" na Etapa 2.
3. **Sugestões locais da revisão:** passam a usar os itens do Anexo 6.2. Elas entram quando a revisão remota não está disponível.
4. **Limpar ou trocar o tipo de NC:** agora também limpa a fonte e as normas gravadas no registro.
5. **Tipos sem itens de caracterização no Anexo 6.2:** mensagem própria, em vez de "0 de 0".
6. **Pop-up do Assistente CTRL:** as respostas do agente saem formatadas (negrito, listas), com o mesmo renderizador seguro da página de chat. Antes apareciam os símbolos `**`.
7. **Lançador:** sobe a interface pelo `serve.py` do back-end novo, o que liga o Assistente CTRL.

## 4. Verificação [F]

**Suítes do 3D/2D (`tests/aircraft3d/`):**
- 10 suítes, **271/271** verificações aprovadas na versão integrada;
- TypeScript estrito sem erros;
- ajuste nos testes: chamadas ao back-end local (`127.0.0.1:8001`, `/api/*`) não contam como requisição externa.

**Teste da versão integrada (`tests/integracao/test_integracao_completa.py`): 16/16.**
- Usa um simulador local do Experimental Lab, sem chave real.
- **Login e servidores:**
  - lançador sobe `serve.py` + back-end de usuários;
  - login real;
  - "Experimental Lab conectado".
- **Assistente CTRL:**
  - pop-up responde pelo agente e mantém o histórico da conversa;
  - página de chat responde.
- **Tipo de NC:**
  - Etapa 1 com 85 tipos e normas no ícone "i";
  - Etapa 2 com os 12 requisitos do Anexo 6.2 para Vazamento.
- **Localização e evidências:**
  - localizador 3D abre;
  - Etapa 3 exige vídeo para Vazamento.
- **Etapa 4:** o compilado mostra as normas e os itens; a revisão inteligente conclui.
- **Qualidade e encerramento:**
  - sem erros de JavaScript;
  - portas liberadas ao encerrar.

## 5. Limitações e pendências

- **FastAPI não executado aqui [AD]:** o ambiente de desenvolvimento não tem acesso ao PyPI. Na versão 2, o `user_api.py` ganhou `/api/records` e a revisão (seção 6), e o teste exercitou a gravação e a revisão remota por ele. O caminho com FastAPI usa o mesmo módulo `record_review.py`; conferir no seu computador, com `requirements.txt` instalado.
- **Experimental Lab real [AD]:** testado só com o simulador; o endereço do `.env` é interno (rede da empresa). A partir da versão 2, o `.env` **vem no pacote**, a pedido. Não o envie ao GitLab (o `.gitignore` o exclui).
- **`usuarios/users.sqlite3`:** veio do back-end novo, com 13 usuários e 14 registros. Contém e-mails e hashes de senha da equipe. O `.gitignore` da feature excluía `*.sqlite3`; decidam se ele deve ir para o GitLab.
- **Código sem uso:** `NC_REQUIREMENT_PROFILES`, `requirementsForType` e `profileForType` (back-end novo) ficaram sem uso depois da escolha pelo Anexo 6.2. Foram mantidos para compatibilidade e podem ser removidos.
- **Dados de demonstração:** o botão "Preencher com dados fictícios de demonstração" ainda preenche os requisitos antigos de Vazamento. Os itens do Anexo 6.2 ficam em branco.
- **Integração anterior com o agente Hacka:** a que estava pausada **não foi usada**. O back-end novo já traz a sua própria integração, e foi essa que entrou.

## 6. Versão 2 — revisão por IA, Assistente em todas as telas e Visão gerencial

### 6.1 Revisão por IA [D]

**Problema encontrado [F]:** a revisão remota dependia do FastAPI (`/api/records`). O `user_api.py`, usado quando o FastAPI não está instalado, não tinha essas rotas. Além disso, o front escondia o motivo de qualquer falha ("revisão conectada não está disponível").

**Novo módulo `record_review.py`,** compartilhado por `fastapi_app.py` e `user_api.py`:
- **`compact_record()`:** envia ao agente só o que importa (tipo, AS IS/TO BE, itens do Anexo 6.2, normas, localização, evidências). Ficam de fora versões, auditoria e metadados, que inflavam o prompt.
- **Alvo das sugestões:** é normalizado para `asIs`, `toBe` ou `req:<id>:asIs|toBe`. Um campo que não pode ser editado vira observação e não é aplicado às cegas.
- **Motivo da falha:** quando o agente não responde, a resposta traz `agentError` (configuração, Lab indisponível ou dependências ausentes) e a revisão cai nas regras locais.

**`user_api.py`:**
- ganhou as rotas `PUT/GET /api/records/{id}`, `POST /api/records/{id}/review` e `GET /api/records`;
- CORS por lista de origens, com PUT e DELETE liberados;
- limite de 4 MB para registros e validação de ids e de corpo.

**Front:**
- o erro 401 vira "sessão expirada; entre de novo";
- se a porta 8001 não responder, o motivo aparece;
- o painel mostra o parecer, as lacunas e as inconsistências;
- "Aceitar" aplica a sugestão também nos itens do Anexo 6.2.

### 6.2 Assistente CTRL em todas as telas [D]

- **Onde aparece:** o pop-up do back-end novo passa a ficar num contêiner próprio no `body`. Aparece no Registro de NC, no chat, no mapa mental e na Visão gerencial.
- **Página de chat:** o ícone sobe para ficar acima da caixa de mensagem.
- **Conversa:** a mesma conversa segue entre as telas. "+" inicia uma nova conversa, e Esc fecha o pop-up e devolve o foco ao ícone.
- **Digitação:** não refaz a tela a cada tecla.

### 6.3 Visão gerencial (`frontend/ctrlcd/dashboard.js`) [D]

**Página:** nova, no menu do Registro de NC (ou `#gerencial`).
- **Filtros:** período, status, AR, tipo de NC e região.
- **Indicadores:** comparados com o período anterior.
- **Gráficos:** evolução por mês, status, tipos de NC, AR e funil.
- **Anexos recentes,** com busca.
- **Visão em tabela** em cada gráfico.

**Mapa da aeronave:**
- é a vista superior técnica do localizador 2D (`aircraft-top-view.js`), com o nariz à esquerda;
- cada região da hierarquia compartilhada é colorida por uma rampa de um só matiz, pela quantidade de NCs;
- tem os níveis "Grandes regiões" e "Seções";
- clicar numa região (ou na lista) abre o detalhe: tipos de NC, sub-regiões, status e registros;
- funciona por teclado (Tab e Enter).

**Dados:**
- `GET /api/records` nos dois back-ends. Os perfis ADMINISTRADOR, APROVADOR, VERIFICADOR e CONSULTA veem todos os registros; os demais, só os próprios **[D, a validar]**.
- Somam-se os registros deste navegador.
- O modo "Demonstração" usa dados fictícios gerados localmente, identificados na tela.

**Cores:** a série categórica da evolução (azul, verde, âmbar) passou no validador de paleta: faixa de luminosidade, croma, separação para daltonismo e contraste.

### 6.4 Verificação [F]

- **Teste da versão integrada:** `tests/integracao/test_integracao_completa.py`, 26/26. Cobre:
  - revisão pelo agente, com o registro gravado no servidor;
  - sugestões aplicadas no AS IS e no item do Anexo 6.2;
  - Assistente na página de chat;
  - Visão gerencial com os registros reais do servidor;
  - clique na asa abrindo o detalhe;
  - modo de demonstração.
- **Suítes 3D/2D:** reexecutadas; o resultado está no relatório de entrega.
- **Revisão independente do código:** os achados médios e baixos foram corrigidos:
  - meses do gráfico;
  - foco depois de selecionar;
  - regiões sem desenho no teclado;
  - mapeamento exato de campos;
  - validação de entrada.

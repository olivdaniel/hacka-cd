# CTRL+CD — como abrir a interface completa (front-end + back-end + IA)

**Versão integrada 2** (24/09/2026). Detalhes em `INTEGRACAO.md`.

**O que a versão junta:**
- Fases 1 a 7 (localizador 3D/2D);
- back-end novo (Assistente CTRL, registros no servidor, revisão por IA);
- feature "tipo de não conformidade" (Anexo 6.2).

**Novidades desta versão:**
- revisão por IA funcionando de ponta a ponta;
- Assistente CTRL no pop-up em todas as telas;
- página **Visão gerencial**, com o mapa da aeronave.

**Legenda:**
- **[F]** fato verificado no código ou em teste;
- **[AD]** A DEFINIR.

## 1. Pré-requisitos

- **Python 3.10 ou mais recente** (https://www.python.org/downloads/). No instalador do Windows, marque **"Add python.exe to PATH"**.
- **Rede da empresa ou VPN:** o Experimental Lab configurado no `.env` fica num endereço interno. Fora da rede, a interface abre, mas o Assistente CTRL e a revisão por IA ficam indisponíveis.

## 2. Arquivo `.env` (credenciais do Experimental Lab)

- **Já vem na raiz do pacote**, a pedido: é o mesmo `.env` do back-end.
- **Não envie o `.env` para o GitLab nem o compartilhe.** O `.gitignore` do projeto já o exclui dos commits. Ao repassar o zip, apague o `.env` antes.
- Para trocar a chave, edite o `.env`. As variáveis estão descritas em `.env.example`.

## 3. Abrir (Windows): dois cliques

1. Extraia `ctrlcd-integrado-v2.zip` numa pasta, por exemplo `C:\CTRLCD`.
2. Dê dois cliques em **`INICIAR_CTRLCD.bat`**.
   - Na primeira vez, ele cria o `.venv` e instala o `requirements.txt` (FastAPI, Uvicorn, requests, python-dotenv, langchain-core).
3. O navegador abre em **http://127.0.0.1:4173/auth/**.
4. Entre com a sua conta ou com o usuário de demonstração: `admin.demo@example.com` / `admin123` [F: `user_api.py`].
5. Para encerrar, feche a janela preta ou pressione **Ctrl+C** nela.

## 4. O que sobe [F: `iniciar_ctrlcd.py`]

| Serviço | Endereço | Arquivo |
|---|---|---|
| Interface + Assistente CTRL (`/api/chats/messages`, `/api/health`) | http://127.0.0.1:4173 | `serve.py` |
| Usuários, registros de NC (`/api/records`), revisão por IA e lista para a Visão gerencial | http://127.0.0.1:8001 | `fastapi_app.py` (Uvicorn) |

**Sem o FastAPI instalado,** o lançador usa o `user_api.py`. Agora ele também grava registros, faz a revisão por IA e lista os registros, com o mesmo contrato do FastAPI.

**Linha de comando:**

```bash
python -m venv .venv
.venv\Scripts\activate                     # macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
python iniciar_ctrlcd.py                   # opções: --sem-navegador, --backend fastapi|simples
```

## 5. Roteiro de conferência

1. **Assistente CTRL em qualquer tela:**
   - ícone no canto inferior direito (na página de chat, fica acima da caixa de mensagem);
   - sugestões ou pergunta livre, com resposta no próprio pop-up;
   - "+" inicia uma nova conversa e Esc fecha.
2. **Novo registro:**
   - tipo de NC do Anexo 6.2;
   - requisitos com AS IS / TO BE;
   - "Selecionar no modelo da aeronave" (3D) ou vistas técnicas (2D);
   - evidências.
3. **Etapa 4 → "Executar revisão inteligente":**
   - O registro é gravado no servidor e o agente de IA devolve:
     - parecer;
     - sugestões;
     - lacunas.
   - "Aceitar" aplica a sugestão no AS IS, no TO-BE ou no item do Anexo 6.2 citado.
   - Sugestões sobre outros campos aparecem como observação ("Ciente") e não alteram o registro.
   - Se o agente não responder, o motivo aparece em "Agente de IA indisponível": sessão expirada, servidor fora do ar ou Lab inacessível. A revisão continua pelas regras locais.
4. **Visão gerencial** (menu lateral do Registro de NC, ou `http://127.0.0.1:4173/#gerencial`):
   - **Filtros:** período, status, AR, tipo de NC e região.
   - **Indicadores:** total, concluídos, em andamento, pendências, taxa de conclusão, com e sem AR, tempo médio.
   - **Mapa da aeronave:**
     - vista superior 2D, com a cor mais escura onde há mais NCs;
     - alterna entre grandes regiões e seções;
     - clique numa região (a asa, por exemplo) para ver os tipos de NC, as sub-regiões, o status e os registros daquela região.
   - **Gráficos:** evolução por mês, status, tipos de NC, AR e funil. Todos têm "Ver tabela".
   - **Anexos recentes,** com busca.
   - **Dados:** os registros vêm do servidor e deste navegador. Perfis de gestão (administrador, aprovador, verificador, consulta) veem todos; os demais, só os próprios. O botão "Demonstração" mostra dados fictícios, sempre identificados como tal.

## 6. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| "Servidor de usuários indisponível." no login | back-end da porta 8001 fora do ar | abra pelo `INICIAR_CTRLCD.bat` |
| "Erro de conexão" no chat, ou "Agente de IA indisponível: Assistente CTRL + CD indisponível" na revisão | Lab inacessível (sem VPN) ou `.env` ausente | conecte-se à rede da empresa ou VPN e confira o `.env` |
| Revisão: "Sua sessão no servidor expirou" | o back-end foi reiniciado; as sessões ficam na memória | saia ("Encerrar sessão") e entre de novo |
| Visão gerencial: "Servidor de registros indisponível" | porta 8001 sem resposta ou sessão expirada | entre de novo; o painel mostra os registros deste navegador enquanto isso |
| "A porta 4173 (ou 8001) está ocupada" | outro servidor aberto | feche-o e rode de novo |
| Tela antiga depois de atualizar | cache do navegador | Ctrl+F5 |

## 7. Limitações conhecidas

- **Testes:** tudo foi verificado aqui com um simulador do Experimental Lab e com o back-end `user_api.py` **[AD]**. A execução com o Lab real (rede interna) e com o FastAPI instalado fica a confirmar no seu computador.
- **Escala do mapa:** a cor é relativa à região com mais NCs no filtro atual.
- **Registros antigos:** NCs com localização no formato antigo entram só na grande região ("Não detalhada" no nível de seção).

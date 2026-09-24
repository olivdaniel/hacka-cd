---
name: 03-enviar-documentos
description: Conduz a criação incremental do upload sequencial de documentos para o Experimental Lab usando URL pré-assinada.
---

# 03 — Enviar documentos

## Objetivo

Evolua a solução aprovada na Skill 02 para enviar documentos ao S3 por meio da
action `create_presigned_upload`.

O participante deve:

- selecionar um ou vários arquivos;
- acompanhar uma fila visual;
- enviar um arquivo por vez;
- continuar a fila quando um item falhar;
- repetir manualmente somente itens com erro;
- receber um `objectKey` por upload concluído.

A Skill 03 termina no upload. Vetorização e RAG pertencem às próximas skills.

Leia antes de começar:

- `references/arquitetura-upload.md`;
- `references/contrato-upload.md`;
- `references/seguranca-upload.md`.

As referências são normativas. Não repita todo o conteúdo delas na conversa.

## Pré-condições

Antes de editar, confirme:

- Skill 02 concluída e aprovada;
- `serve.py` e `agent.py` existem e compilam;
- health e chat reais funcionam;
- memória por `chatId` está implementada;
- interface e assets permanecem íntegros;
- API implantada aceita `contentLength` de até `104857600` bytes.

Se a API ainda limitar `create_presigned_upload` a 10 MiB, interrompa antes do
primeiro upload real. Informe que `MAX_UPLOAD_CONTENT_LENGTH` deve ser alterado
para:

```python
MAX_UPLOAD_CONTENT_LENGTH = 100 * 1024 * 1024
```

O valor resultante é `104857600`.

Não tente contornar o limite declarando um tamanho menor que o arquivo real.

## Invariantes

- Preserve health, chat, memória, identidade, histórico e layout da Skill 02.
- Preserve integralmente `#pageHacka/#hackaSlot` e
  `#pageExperiment/#experimentSlot`; upload permanece no fluxo principal.
- O navegador chama somente o servidor Python local.
- A API key é usada somente pelo backend na chamada ao Experimental Lab.
- A URL pré-assinada nunca chega ao navegador ou aos logs.
- O `PUT` para o S3 usa um transporte HTTPS exclusivo, sem `x-api-key`.
- A autorização `create_presigned_upload` reutiliza o cliente do ALB e seu
  timeout padrão de 60 segundos.
- `EXPERIMENTAL_LAB_VERIFY_TLS=false` aplica-se apenas ao ALB provisório; não
  desative a validação TLS do S3.
- Aceite `.txt`, `.csv`, `.pdf`, `.docx`, `.xlsx` e `.png`.
- O limite de upload é 100 MiB.
- Não carregue um arquivo de 100 MiB inteiro em memória no servidor.
- Não faça upload paralelo ou retry automático.
- Não implemente `vectorize`, `upload_and_vectorize`, polling ou RAG.
- Não adicione dependências. Use `requests` para o Experimental Lab e a
  biblioteca padrão como referência para o transporte S3.
- O participante inicia e reinicia `serve.py` no terminal.

## Protocolo anti-loop

Execute somente um checkpoint por vez.

Antes da aprovação:

1. informe o checkpoint;
2. descreva a entrega em no máximo cinco itens;
3. faça uma única pergunta de aprovação;
4. não edite arquivos.

Depois da aprovação:

1. não reapresente o plano;
2. não crie uma lista de tarefas para o mesmo checkpoint;
3. leia somente os arquivos envolvidos;
4. altere imediatamente o código;
5. valide a pós-condição;
6. explique brevemente o resultado;
7. peça aprovação para o próximo checkpoint e pare.

Não investigue vetorização ou RAG para resolver problemas de upload.

## Resumo ao concluir cada checkpoint

Depois de implementar e validar cada checkpoint, antes da pergunta de aprovação
do próximo, apresente o título `O que alcançamos` seguido de um a cinco tópicos.

- Descreva resultados concretos que já funcionam, não tarefas executadas.
- Use linguagem curta e acessível para iniciantes.
- Inclua evidência de validação quando ela ajudar a confirmar o resultado.
- Não misture pendências, plano futuro ou conteúdo do próximo checkpoint.
- No modo acelerado do instrutor, mostre o mesmo resumo e avance sem aguardar.

## Detecção e retomada

Inspecione somente:

- `serve.py`;
- `agent.py`;
- `upload_config.py`, se existir;
- `web/index.html`;
- `web/styles.css`;
- `web/app.js`;
- testes diretamente relacionados a upload.

Não abra `.env`.

Classifique o próximo checkpoint:

| Evidência | Próximo checkpoint |
| --- | --- |
| Skill 02 incompleta | interromper e concluir Skill 02 |
| anexo ainda desabilitado | 1A |
| seleção aparece, mas política compartilhada não existe | 1B |
| política existe, mas frontend ainda não a consulta | 1C |
| fila válida existe, mas autorização não foi implementada | 2A |
| autorização existe, mas PUT ainda não | 2B |
| transporte S3 existe, mas smoke test real ainda não passou | 2C |
| smoke test do transporte passou, mas recepção em blocos não | 3A |
| recepção em blocos existe, mas rota não chama o agente | 3B |
| rota integrada existe, mas frontend ainda não envia | 4A |
| upload individual funciona, mas fila não processa todos | 5A |
| fila continua após erro, mas retry manual ainda não | 5B |
| fila e retry funcionam, mas pasta ainda não | 6A |
| seleção de pasta funciona | 7A |

Avalie cada evidência separadamente. A existência de UI de anexos não comprova
que o backend ou o PUT funcionam.

## Estados visuais

Cada item usa texto e `data-status`; cor não pode ser o único indicador:

| Estado | Texto |
| --- | --- |
| `queued` | `Aguardando` |
| `uploading` | `Enviando` |
| `uploaded` | `Concluído` |
| `invalid` | `Arquivo inválido` |
| `error` | `Erro no envio` |

Não exiba um estado intermediário que o contrato local não consiga observar.

## Marco 1 — Seleção e validação

### Checkpoint 1A — Habilitar a seleção

Altere somente `web/index.html`, `web/styles.css` e `web/app.js`.

- habilite o botão de anexo existente;
- preserve o input múltiplo;
- configure `accept` para as seis extensões;
- mostre os arquivos selecionados na área de uploads;
- mantenha todos em `Aguardando`;
- não faça requisição de rede.

Não implemente seleção de pasta neste checkpoint.

Como somente o frontend mudou, peça ao participante para atualizar a página.
Confirme que selecionar vários arquivos cria itens visuais sem realizar upload.

Explique seleção local e fila visual, peça aprovação para 1B e pare.

### Checkpoint 1B — Criar a política compartilhada

Crie `upload_config.py` e testes com `unittest`.

Defina uma única fonte Python para:

```python
MAX_UPLOAD_BYTES = 100 * 1024 * 1024
UPLOAD_CHUNK_BYTES = 1024 * 1024
MAX_FILE_NAME_BYTES = 255
LOCAL_READ_TIMEOUT_SECONDS = 120
S3_CONNECT_TIMEOUT_SECONDS = 10
S3_READ_TIMEOUT_SECONDS = 300
```

Mapeie exatamente:

```text
.txt  → text/plain
.csv  → text/csv
.pdf  → application/pdf
.docx → application/vnd.openxmlformats-officedocument.wordprocessingml.document
.xlsx → application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
.png  → image/png
```

Implemente funções pequenas para:

- normalizar e validar extensão;
- obter o MIME canônico pela extensão;
- validar tamanho entre 1 e 104857600 bytes;
- validar nome simples, sem `/`, `\`, NUL ou caminho relativo;
- limitar o nome original a 255 bytes em UTF-8;
- gerar `uploads/{uuid}{extensão}` sem usar o nome original.

Compile `upload_config.py` e execute somente os testes desse checkpoint.

Explique política compartilhada e chave segura, peça aprovação para 1C e pare.

### Checkpoint 1C — Aplicar a política no navegador

Altere somente `serve.py` e `web/app.js`.

Adicione:

```http
GET /api/uploads/config
```

Resposta:

```json
{
  "maxUploadBytes": 104857600,
  "allowedTypes": {
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".png": "image/png"
  }
}
```

O frontend consulta essa rota e usa `File.size` e a extensão para feedback
antecipado. Use o MIME canônico do mapa; não dependa de `File.type`, que pode
estar vazio ou variar por sistema.

Arquivos inválidos permanecem visíveis com estado `Arquivo inválido`, mas não
entram na fila de envio.

Compile os arquivos Python. Oriente `Ctrl+C`, reinício manual e atualização da
página. Confirme tipos e tamanhos válidos e inválidos.

Explique validação de experiência versus validação autoritativa no backend,
peça aprovação para 2A e pare.

## Marco 2 — Cliente de upload

### Checkpoint 2A — Solicitar autorização

Altere somente `agent.py` e testes.

Implemente uma operação que:

1. valida nome, tipo e tamanho com `upload_config.py`;
2. gera um `objectKey` seguro;
3. envia `create_presigned_upload`;
4. valida estritamente a resposta;
5. devolve internamente método, URL, `objectKey` e headers obrigatórios.

Reuse a sessão autenticada e
`EXPERIMENTAL_LAB_REQUEST_TIMEOUT_SECONDS` definidos na Skill 02. Não use esse
valor no PUT S3, que mantém seus timeouts especializados.

A validação da resposta deve exigir:

- `method == "PUT"`;
- `objectKey` idêntico ao solicitado;
- URL com esquema HTTPS;
- ausência de usuário, senha e fragmento;
- hostname S3 permitido pelo ambiente, terminando em `.amazonaws.com` e com
  identificador `s3`;
- header obrigatório `content-type` idêntico ao MIME solicitado;
- ausência de `x-api-key` nos headers retornados.

Não faça o `PUT` neste checkpoint.

Não registre nem devolva ao navegador:

- URL pré-assinada;
- headers da URL;
- resposta remota bruta.

Use uma resposta simulada nos testes. Confirme:

- payload e geração do `objectKey`;
- rejeição de resposta incompleta;
- `timeout=60` na chamada `create_presigned_upload` quando a variável não está
  definida;
- uso de um override inteiro positivo;
- configuração inválida rejeitada antes de qualquer rede;
- `requests.Timeout` convertido em `UPLOAD_TIMEOUT`;
- uma única tentativa de autorização, sem retry.

Esses testes são da chamada autenticada ao Experimental Lab, não do PUT S3.
Compile `agent.py`.

Explique autorização pré-assinada, peça aprovação para 2B e pare.

### Checkpoint 2B — Fazer o PUT no S3

Altere somente `agent.py` e testes.

Implemente uma função de alto nível semelhante a:

```python
def upload_document(
    temporary_path: Path,
    original_name: str,
    content_type: str,
    content_length: int,
) -> str:
    ...
```

Ela deve:

1. solicitar autorização;
2. abrir o arquivo temporário em modo binário;
3. criar uma conexão HTTPS exclusiva para essa operação;
4. preservar, sem reescrever, o path e a query assinada da URL;
5. enviar `Host` com a autoridade validada;
6. enviar todos os `requiredHeaders` com os valores recebidos;
7. enviar `Content-Length` igual ao tamanho validado;
8. transmitir o arquivo em blocos de `UPLOAD_CHUNK_BYTES`, sem chunked transfer;
9. usar timeout de conexão, envio e leitura;
10. aceitar como sucesso somente HTTP `200`;
11. fechar resposta e conexão em `finally`;
12. devolver apenas o `objectKey`.

O contrato é definido pelo comportamento, não por uma biblioteca específica.
Use `http.client.HTTPSConnection` com `ssl.create_default_context()` como
implementação de referência. Reserve `requests` para a chamada autenticada ao
Experimental Lab.

Na implementação de referência:

- use `urlsplit`;
- aceite somente porta ausente ou `443`;
- forme o target como `path?query`, nunca como URL absoluta;
- use `putrequest("PUT", target, skip_host=True, skip_accept_encoding=True)`;
- envie `Host` explicitamente;
- depois de conectar, aplique o timeout de I/O ao socket;
- rejeite CR/LF em nomes e valores dos headers;
- rejeite headers retornados chamados `host`, `content-length`,
  `transfer-encoding`, `connection`, `authorization`, `cookie`,
  `proxy-authorization` ou `x-api-key`;
- não siga redirects;
- não faça retry.

Não compartilhe transporte, sessão, cookies, autenticação ou headers do
Experimental Lab com o S3. Mantenha a validação TLS do S3 habilitada.

Não faça retry automático. Teste sem rede real:

- `x-api-key` ausente do PUT;
- bytes enviados sem transformação;
- `Host`, `Content-Length`, path e query preservados;
- headers obrigatórios preservados;
- redirect rejeitado;
- timeout convertido em erro seguro;
- erro do S3 convertido em erro seguro;
- resposta e conexão fechadas inclusive em erro;
- URL não registrada.

Compile `agent.py`, explique separação de credenciais, peça aprovação para 2C e
pare.

### Checkpoint 2C — Validar o transporte real

Use o cliente de backend já implementado, sem alterar a interface.

1. crie um arquivo TXT temporário, pequeno e não confidencial;
2. obtenha uma autorização real;
3. execute o PUT pelo transporte S3;
4. aceite como sucesso somente HTTP `200`;
5. remova o arquivo temporário em `finally`.

Esse smoke test está previamente autorizado, mas cria um pequeno objeto remoto.
Informe isso antes da execução. Não substitua o teste por uma chamada genérica
ao endpoint público do S3.

Registre somente:

- `uploadId` local;
- etapa;
- duração;
- quantidade de bytes;
- status HTTP;
- categoria TLS segura, quando houver.

Não registre URL, hostname, bucket, query, `objectKey`, nome do arquivo, valores
de headers, corpo XML do S3 ou texto bruto da exceção.

Se o transporte falhar, não avance ao Marco 3. Classifique apenas a categoria
comprovada, corrija o adaptador e repita o smoke test. Não altere
`EXPERIMENTAL_LAB_VERIFY_TLS` para afetar o S3.

Explique por que o transporte foi validado antes da interface, peça aprovação
para 3A e pare.

## Marco 3 — Rota local

### Checkpoint 3A — Receber e armazenar temporariamente

Altere somente `serve.py` e testes.

Crie funções isoladas para receber um corpo de upload, ainda sem expor a rota e
sem chamar `agent.py`.

As funções devem:

1. validar `Content-Length`, `Content-Type`, `X-File-Name` e `X-Upload-Id`;
2. rejeitar zero byte e tamanho acima de 100 MiB antes da leitura;
3. validar escapes percentuais e decodificar `X-File-Name` como UTF-8 estrito;
4. validar o nome com `upload_config.py`;
5. ler em blocos de `UPLOAD_CHUNK_BYTES`;
6. gravar em arquivo temporário;
7. confirmar que recebeu exatamente `Content-Length`;
8. aplicar timeout de socket durante a leitura;
9. converter EOF e `socket.timeout` em erros específicos;
10. remover o temporário em `finally`.

`X-Upload-Id` deve ser um UUID criado uma vez para o item no navegador. Ele será
reutilizado em retries para evitar a criação de chaves diferentes.

Teste corpo vazio, excesso de tamanho, MIME incompatível, nome mal codificado,
leitura incompleta, timeout e limpeza após erro.

Compile `serve.py`, explique recepção em blocos, peça aprovação para 3B e pare.

### Checkpoint 3B — Expor e integrar a rota

Altere somente `serve.py` e testes.

Adicione:

```http
POST /api/uploads
Content-Type: <MIME canônico>
X-File-Name: <encodeURIComponent(file.name)>
X-Upload-Id: <UUID estável do item>
Content-Length: <calculado pelo navegador>

<bytes crus>
```

No `fetch`, não tente definir `Content-Length`; o navegador o calcula ao enviar
o `File` ou `Blob`.

O servidor deve:

1. aceitar exatamente um arquivo por requisição;
2. usar as funções do checkpoint 3A;
3. serializar apenas a execução das rotas de upload com
   `threading.BoundedSemaphore(1)`, sem bloquear health e chat;
4. manter em memória o mapeamento `uploadId → objectKey`, protegido por lock;
5. reutilizar o mesmo `objectKey` quando o mesmo `uploadId` for repetido;
6. chamar `agent.upload_document`;
7. remover o temporário em `finally`.

Resposta `201`:

```json
{
  "fileName": "documento.pdf",
  "objectKey": "uploads/uuid.pdf",
  "status": "uploaded"
}
```

Nunca devolva URL pré-assinada, caminho temporário, headers remotos ou detalhes
internos. O mapeamento de idempotência dura somente enquanto `serve.py` estiver
executando.

Teste sucesso, falha segura, serialização de upload e retry do mesmo
`X-Upload-Id` sem gerar outro `objectKey`. Compile `serve.py` e `agent.py`.

Somente depois oriente `Ctrl+C`, forneça o comando do ambiente e aguarde o
reinício.

Explique streaming local para disco, peça aprovação para 4A e pare.

## Marco 4 — Primeiro upload real

### Checkpoint 4A — Conectar um arquivo

Altere somente `web/app.js`.

Para o primeiro item válido:

1. mude para `Enviando`;
2. faça uma requisição com os bytes crus;
3. envie nome codificado e MIME canônico;
4. envie o `itemId` estável como `X-Upload-Id`;
5. não defina manualmente `Content-Length`;
6. aguarde o JSON completo;
7. guarde o `objectKey` no item;
8. marque `Concluído` ou `Erro no envio`.

Não envie mais de um arquivo neste checkpoint. Não faça polling ou upload
direto do navegador para o S3.

Execute um upload real já autorizado com arquivo não confidencial e pequeno.
Confirme no navegador que a URL pré-assinada e a API key não aparecem.

Explique o fluxo completo, peça aprovação para 5A e pare.

## Marco 5 — Fila sequencial tolerante a falhas

### Checkpoint 5A — Processar todos e continuar após erro

Altere somente `web/app.js` e testes existentes de frontend, se houver.

Implemente um único worker FIFO:

- processe somente um item por vez;
- mantenha `try/catch` dentro de cada item;
- após erro, marque o item e continue com o próximo;
- nunca reprocesse automaticamente `uploaded`;
- nunca repita automaticamente `error`;
- bloqueie duplo clique e workers concorrentes;
- itens adicionados durante a execução entram no final.

Cada item deve manter:

```text
itemId, file, fileName, contentType, size, status, objectKey, errorCode, attempts
```

Não correlacione itens apenas pelo nome.

Valide o cenário:

```text
A conclui
B falha
C conclui
```

Explique tolerância a falhas, peça aprovação para 5B e pare.

### Checkpoint 5B — Retry manual pelo mesmo worker

Altere somente `web/app.js` e testes existentes de frontend, se houver.

Adicione retry manual por item com erro. O retry:

- altera o item de `error` para `queued`;
- preserva o mesmo `itemId` e, portanto, o mesmo `X-Upload-Id`;
- incrementa `attempts`;
- reinsere somente esse item no worker FIFO;
- nunca chama diretamente a função de upload fora do worker;
- não inicia outro worker quando um já estiver ativo;
- não reenvia itens concluídos;
- continua sem retry automático se falhar novamente.

Valide:

```text
retry manual de B conclui
A e C não são reenviados
o mesmo X-Upload-Id é utilizado
```

Explique idempotência durante a execução do servidor, peça aprovação para 6A e
pare.

## Marco 6 — Pasta opcional

### Checkpoint 6A — Selecionar uma pasta

Altere somente `web/index.html`, `web/styles.css` e `web/app.js`.

Adicione uma ação opcional separada e um input com `webkitdirectory`.

Regras:

- a seleção normal de arquivos continua sendo o fluxo principal;
- inclua somente arquivos diretamente na pasta escolhida;
- ignore arquivos de subpastas usando `webkitRelativePath`;
- ordene os arquivos diretos por nome antes de enfileirar;
- aplique a mesma validação do checkpoint 1C;
- envie pela mesma fila sequencial;
- nunca envie caminho absoluto ou relativo ao backend;
- se o navegador não suportar pasta, mantenha o upload normal funcional.

Informe quantos arquivos de subpastas foram ignorados sem mostrar seus caminhos.

Como somente o frontend mudou, peça para atualizar a página. Confirme seleção
normal, pasta direta e subpastas ignoradas.

Explique limitações do seletor de pasta, peça aprovação para 7A e pare.

## Marco 7 — Aceite

### Checkpoint 7A — Erros e refinamento

Garanta mensagens seguras para:

- arquivo vazio;
- arquivo acima de 100 MiB;
- extensão não permitida;
- MIME incompatível;
- nome inválido;
- autorização rejeitada;
- timeout no Experimental Lab;
- URL pré-assinada inválida ou expirada;
- falha no PUT;
- corpo local incompleto;
- resposta remota inesperada.

Não faça retry automático.

Use códigos e status locais estáveis:

| HTTP | Código |
| --- | --- |
| `400` | `INVALID_FILE_NAME`, `INVALID_CONTENT_TYPE` ou `INCOMPLETE_BODY` |
| `413` | `FILE_TOO_LARGE` |
| `415` | `UNSUPPORTED_FILE_TYPE` |
| `502` | `UPLOAD_AUTHORIZATION_FAILED` ou `S3_UPLOAD_FAILED` |
| `504` | `UPLOAD_TIMEOUT` |

Pergunte em uma mensagem isolada:

> “O que você gostaria de ajustar depois de testar o envio de documentos?”

Faça somente o refinamento aprovado.

### Validação final

Confirme:

1. Skill 02 permanece funcional;
2. seis formatos aceitos;
3. limite de 100 MiB antecipado no frontend e imposto no backend/API;
4. arquivos recebidos em blocos e temporários sempre removidos;
5. URL pré-assinada ausente do navegador e logs;
6. `x-api-key` ausente do PUT para o S3;
7. uploads executados sequencialmente;
8. falha de um item não bloqueia os seguintes;
9. retry manual não reenvia concluídos;
10. pasta inclui somente arquivos do nível direto;
11. cada sucesso retorna e preserva um `objectKey`;
12. nenhuma vetorização ou consulta de status foi executada.

Execute:

```bash
python -m unittest discover -s tests -p "test_upload*.py"
python -m py_compile serve.py agent.py upload_config.py
```

Encerre listando arquivos alterados e conceitos praticados.

## Arquivos permitidos

- `upload_config.py`;
- `agent.py`;
- `serve.py`;
- `web/index.html`;
- `web/styles.css`;
- `web/app.js`;
- testes diretamente relacionados ao upload.

Não altere:

- `.env`;
- `requirements.txt`;
- `web/assets/`;
- skills anteriores;
- infraestrutura da Lambda.

## Recuperação

Se um checkpoint falhar:

- pare após duas tentativas objetivas sem progresso;
- não altere a arquitetura para contornar o erro;
- não use upload inline/base64;
- não desative TLS do S3;
- não aumente o limite somente no frontend;
- não leia o arquivo inteiro em RAM;
- não remova arquivos do participante;
- não avance com a pós-condição incompleta.

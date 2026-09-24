# Segurança de upload — Skill 03

## Segredos

- Não abra ou registre `.env`.
- Não envie API key ao navegador.
- Não envie API key ao S3.
- Não registre URL pré-assinada.
- Não registre conteúdo do arquivo.
- Evite registrar o nome original; use identificador do item e código de erro.

## URL pré-assinada

Trate a URL como uma credencial temporária:

- mantenha-a somente em memória no backend;
- use-a uma única vez;
- descarte-a após o PUT;
- não a inclua em exceções, responses ou testes gravados;
- nunca faça fallback para upload direto pela Lambda.

Antes do PUT, exija HTTPS, host S3 permitido, método `PUT`, `objectKey`
correspondente, ausência de userinfo/fragmento e headers compatíveis. Não siga
redirects.

## TLS

`EXPERIMENTAL_LAB_VERIFY_TLS=false` é uma configuração temporária do ALB
provisório.

Ela não se aplica ao domínio da URL pré-assinada. O PUT para S3 permanece com
verificação TLS habilitada.

Não configure `S3_CA_BUNDLE` como tentativa genérica de correção. Ao passar um
arquivo em `verify=...` no `requests`, esse bundle substitui o conjunto usado na
requisição; um bundle parcial pode remover autoridades necessárias. Use CA
adicional somente quando fornecida e validada oficialmente para o ambiente.

`http.client.HTTPSConnection` com `ssl.create_default_context()` é a
implementação de referência, mas não garante suporte automático a proxy
corporativo. Se o ambiente exigir proxy, trate-o explicitamente sem expor a URL
assinada.

## Validação em camadas

### Frontend

Fornece feedback antecipado usando a política obtida do servidor. Não é uma
fronteira de segurança.

### Servidor local

Valida:

- `Content-Length`;
- extensão;
- MIME canônico;
- nome decodificado;
- leitura completa;
- limite de 100 MiB.

A Lambda valida o tamanho declarado. O servidor local confirma o número real de
bytes recebidos.

### Lambda

Valida novamente `objectKey`, `contentType` e `contentLength` antes de gerar a
URL.

## Arquivo temporário

- Use diretório temporário do sistema.
- Gere nome interno aleatório.
- Não use o nome original no caminho.
- Feche o arquivo antes de reabri-lo no Windows.
- Remova em `finally`, inclusive após timeout, desconexão ou erro do S3.

## Nomes e caminhos

Rejeite:

- nome vazio;
- `/` ou `\`;
- NUL;
- `.` ou `..`;
- nome acima de 255 bytes em UTF-8;
- extensão fora da allowlist.

Valide cada escape `%` do header e faça percent-decoding seguido de UTF-8
estrito.

O `objectKey` nunca deriva do nome original, exceto pela extensão validada.

## Limite real

O PUT pré-assinado atual não garante por si só que o tamanho declarado é igual
ao tamanho enviado. Na arquitetura do treinamento, `serve.py` conta os bytes e
envia o arquivo validado.

Uma API pública mais ampla deve reforçar o controle com condição de tamanho ou
verificação posterior no S3.

## Concorrência e retry

- Não compartilhe conexão ou transporte S3 entre threads.
- Use uma conexão HTTPS S3 por operação.
- Serialize somente uploads; health e chat continuam independentes.
- Retry reaproveita `X-Upload-Id` e `objectKey` durante a vida do servidor.
- Após reiniciar o servidor, a garantia de idempotência em memória é perdida.

## Observabilidade

Pode registrar somente:

- ID local do upload;
- etapa;
- duração;
- quantidade de bytes;
- status HTTP;
- categoria TLS segura;
- nomes normalizados dos headers, somente quando necessário.

Não registre URL, hostname, bucket, query, `objectKey`, nome do arquivo, valores
de headers, resposta XML do S3 ou traceback com texto da exceção remota.

Classifique falhas TLS apenas quando comprovadas. Prefira
`TLS_CERTIFICATE_REJECTED` a inferir “cadeia não confiável” sem evidência
específica.

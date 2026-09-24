# Segurança da base de treinamento

## Fronteiras

```text
docs/training_docs/ -> backend local -> Experimental Lab -> S3 e índice vetorial
```

O navegador não recebe API key, URL remota, URL pré-assinada, bucket, headers
autenticados, objectKey ou resposta AWS.

## Fonte confiável

Somente arquivos diretos de `docs/training_docs/` entram na sincronização.
Valide extensão, tamanho e leitura. Calcule o hash em blocos e não carregue o
arquivo inteiro na memória.

## Separação de credenciais

A autorização do Experimental Lab usa `requests` e a API key do backend. O PUT
S3 usa transporte HTTPS separado e nunca recebe `x-api-key`. Não compartilhe
cookies, sessão, headers ou TLS entre os dois destinos.

## Índice

O índice de treinamento é fixo no código/configuração do backend. Não permita
que o usuário, o frontend, o texto do chat ou um arquivo altere o destino.

## Concorrência

Use uma fila FIFO e uma operação de sincronização por vez. Health, chat e
arquivos estáticos não devem esperar a fila de treinamento.

## Logs e manifesto

Permitidos: quantidade de arquivos, hash truncado para diagnóstico local,
status, duração, tentativa, contagem de chunks e código de erro seguro.

Proibidos: API key, conteúdo dos documentos, nome original quando desnecessário,
URL assinada, bucket, objectKey, embeddings, resposta remota e exceção bruta.

O manifesto local não contém segredos e deve ser ignorado pelo Git.

## Falhas

Não faça retry automático, polling ou fallback que desative TLS. Registre o
item como erro e permita que a próxima execução o reavalie. Uma falha não deve
impedir a sincronização dos documentos seguintes.

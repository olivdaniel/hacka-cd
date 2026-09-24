# Arquitetura da base de treinamento

## Fluxo

```text
docs/training_docs/
  -> rotina backend FIFO
  -> hash e manifesto local
  -> autorização de upload
  -> PUT HTTPS no S3 sem API key
  -> action vectorize no Experimental Lab
  -> índice fixo do CTRL + CD
  -> action chat da Skill 05
```

A página e o usuário não participam da sincronização. O servidor local inicia a
rotina automaticamente e mantém health e chat disponíveis enquanto os arquivos
são processados.

## Responsabilidades

### Rotina backend

- enumera somente arquivos diretos de `docs/training_docs/`;
- aceita `.pdf` e `.xlsx`;
- calcula SHA-256 em blocos;
- evita trabalho repetido por hash concluído;
- processa um arquivo por vez;
- registra sucesso e falha em manifesto local seguro.

### `agent.py`

- solicita autorização autenticada ao Experimental Lab;
- envia `action: vectorize` para o índice fixo;
- valida a resposta por allowlist;
- nunca expõe API key, URL remota ou resposta bruta.

### `serve.py`

- inicia a rotina sem depender de uma página aberta;
- mantém a execução isolada de health e chat;
- usa transporte S3 interno e temporários removidos em `finally`.

## Identidade

O conteúdo é identificado por `sha256 + extensão`. O `objectKey` é gerado pelo
backend como `training/<sha256><extensão>`. Não aceite chave, índice ou arquivo
fornecido pelo navegador.

## Estado

O manifesto contém somente caminho relativo, hash, extensão, tamanho, status,
tentativas e código de erro seguro. Não armazene conteúdo extraído, embeddings,
credenciais ou URLs assinadas.

## Exclusões

Esta skill não implementa seleção manual, upload no frontend, múltiplos índices,
listagem S3, polling, RAG, busca ou conversa.

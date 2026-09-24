# Contrato da sincronização de treinamento

## Fonte

A única fonte é `docs/training_docs/`. São aceitos arquivos diretamente nessa
pasta com extensão `.pdf` ou `.xlsx`. Arquivos de subpastas e extensões não
permitidas não entram na rotina.

## Action remota

A chamada autenticada é `POST {EXPERIMENTAL_LAB_API_URL}` com `x-api-key`
somente no backend:

```json
{
  "action": "vectorize",
  "objectKey": "training/<sha256>.pdf",
  "vectorIndexName": "<índice fixo interno>"
}
```

O índice é uma constante interna do backend. Nunca aceite seleção do navegador,
do chat ou do usuário.

## Resposta válida

Aceite somente JSON com:

```json
{
  "fileType": "pdf",
  "totalChunks": 15,
  "totalVectorsStored": 15,
  "indexName": "<índice efetivo>",
  "indexCreated": false
}
```

`fileType` deve ser `pdf` ou `xlsx`; os contadores devem ser inteiros positivos
e iguais; `indexName` deve ser texto; `indexCreated` deve ser booleano.

## Upload interno

A autorização usa o cliente autenticado existente. O PUT S3:

- usa HTTPS e validação TLS própria;
- envia bytes em blocos;
- não envia `x-api-key`;
- não segue redirects;
- não registra URL, headers ou conteúdo;
- remove o temporário em `finally`.

## Erros

Converta falhas em códigos locais estáveis, sem resposta remota ou exceção bruta.
Não faça retry automático. O documento pode ser reavaliado na próxima execução
da rotina.

## Idempotência

O manifesto associa `relativePath + sha256 + extensão` ao resultado. Hash já
concluído no índice fixo não gera novo upload ou nova vetorização. Hash alterado
cria uma nova chave determinística e uma nova sincronização.

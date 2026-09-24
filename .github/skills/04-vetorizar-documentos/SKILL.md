---
name: 04-vetorizar-documentos
description: Mantém automaticamente a base de treinamento do Assistente CTRL + CD a partir dos documentos oficiais em docs/training_docs.
---

# 04 — Base de treinamento do Assistente CTRL + CD

## Objetivo

Configure uma rotina no backend que descobre, envia e vetoriza automaticamente
os documentos oficiais presentes em `docs/training_docs/`.

A Skill 04 não oferece seleção, upload, escolha de índice ou confirmação de
vetorização ao usuário. Depois que o servidor local inicia, a rotina trabalha
sozinha e mantém a base usada pelo Assistente CTRL + CD.

Ao final:

- os documentos válidos da pasta estão disponíveis no índice fixo de treinamento;
- arquivos novos ou alterados são detectados por hash;
- cada documento é enviado e vetorizado no máximo uma vez por hash concluído;
- uma falha é registrada com código seguro e não interrompe os demais arquivos;
- o chat continua usando a action `chat` sem receber configuração do navegador.

A Skill 04 termina na sincronização da base. A Skill 05 usa a action unificada
`chat` para conversar com os documentos.

## Referências

Leia antes de implementar:

- `references/arquitetura-vetorizacao.md`;
- `references/contrato-vetorizacao.md`;
- `references/seguranca-vetorizacao.md`.

As referências são normativas. Consulte somente a seção necessária e não
reproduza seu conteúdo inteiro na conversa.

## Fonte oficial

Use exclusivamente os arquivos diretamente presentes em:

```text
docs/training_docs/
```

A pasta atualmente contém documentos PDF e uma planilha XLSX. Aceite somente
`.pdf` e `.xlsx`. Ignore outras extensões com um estado seguro; não falhe a
inicialização por causa de arquivos auxiliares.

O índice é uma constante interna do backend, por exemplo
`CTRL_CD_TRAINING_INDEX`. Não permita que o navegador, o texto do usuário ou
uma configuração de chat altere esse destino.

## Pré-condições

Antes de editar, confirme:

- `serve.py` e `agent.py` existem e compilam;
- health, chat e memória da Skill 02 funcionam;
- `docs/training_docs/` existe;
- o cliente autenticado do Experimental Lab está disponível;
- a API aceita `create_presigned_upload` e `vectorize`.

Não dependa da seleção ou do upload da Skill 03 para os documentos oficiais.
A rotina usa o backend para autorizar e transportar os arquivos locais.

Não abra `.env`.

## Invariantes

- Preserve todas as funcionalidades aprovadas nas Skills 01–03.
- Preserve integralmente `#pageHacka/#hackaSlot` e
  `#pageExperiment/#experimentSlot`.
- Não adicione controles de vetorização à interface.
- O navegador nunca recebe URL remota, API key, URL pré-assinada, bucket,
  headers autenticados ou resposta AWS bruta.
- A rotina pertence ao backend e não depende de uma página aberta.
- O upload e a vetorização são etapas internas sequenciais.
- Falha de um documento não interrompe os demais.
- Não faça retry automático, polling, streaming ou progresso inventado.
- Não implemente `upload_and_vectorize`, listagem do S3, descoberta remota de
  índices, seleção de índice ou conversa com documentos nesta skill.
- Não adicione dependências.
- O participante inicia e reinicia `serve.py` quando necessário.

## Identidade e idempotência

Calcule o SHA-256 em blocos, sem carregar o arquivo inteiro na memória. O
`objectKey` deve ser determinístico para o conteúdo, por exemplo:

```text
training/<sha256><extensão>
```

O manifesto local registra somente metadados operacionais:

```text
relativePath, sha256, extension, size, status, attempts, errorCode
```

Não registre conteúdo extraído, embeddings, credenciais, URL assinada ou
resposta remota bruta. O manifesto pode ser armazenado em arquivo local
ignorado pelo Git; nunca use `.env` ou banco de usuários para isso.

## Execução automática

Depois que o servidor local iniciar, uma rotina backend deve:

1. enumerar somente os arquivos diretamente presentes em `docs/training_docs/`;
2. ordenar os arquivos de forma determinística pelo nome;
3. validar extensão, tamanho e leitura;
4. calcular o SHA-256 em blocos;
5. comparar o hash com o manifesto local;
6. solicitar autorização de upload somente para arquivos novos ou alterados;
7. fazer o PUT por um transporte HTTPS interno desta skill, sem `x-api-key`;
8. chamar `vectorize` com o `objectKey` e o índice fixo;
9. validar a resposta remota por allowlist;
10. salvar sucesso ou erro seguro no manifesto;
11. liberar health e chat mesmo quando um documento falhar.

Use uma fila FIFO com uma operação ativa por vez. Uma nova execução pode
reavaliar itens que falharam. Não crie botão de retry nem peça aprovação por
arquivo.

## Checkpoint 1 — Descoberta local

Altere somente o backend e os testes diretamente relacionados.

Implemente a varredura de `docs/training_docs/`, validação dos formatos,
ordenação, cálculo de hash e criação do manifesto sem chamadas remotas.

Valide:

- PDF e XLSX são descobertos;
- extensões não permitidas são ignoradas com diagnóstico seguro;
- hash e tamanho são estáveis;
- nenhum conteúdo do documento aparece em logs;
- a execução não depende do frontend.

Mostre apenas quantidade, extensões, tamanho e estado seguro. Peça aprovação
para o Checkpoint 2.

## Checkpoint 2 — Upload e vetorização automática

Implemente a fatia backend de um documento novo ou alterado.

Use o cliente autenticado compartilhado para solicitar a autorização de upload
e o transporte S3 separado para enviar os bytes. Depois chame:

```json
{
  "action": "vectorize",
  "objectKey": "training/<sha256>.pdf",
  "vectorIndexName": "<índice fixo interno>"
}
```

O navegador não participa desse fluxo. Não crie rota para disparo manual.

Valide estritamente:

- método e URL de upload;
- ausência de `x-api-key` no PUT S3;
- formato do `objectKey`;
- `fileType` entre `pdf` e `xlsx`;
- `totalChunks` inteiro positivo;
- `totalVectorsStored` inteiro positivo e igual a `totalChunks`;
- `indexName` e `indexCreated` válidos;
- erros remotos convertidos para códigos locais seguros.

Confirme que pelo menos um PDF e a planilha chegam ao estado
`Disponível para o agente` sem interação no navegador. Peça aprovação para o
Checkpoint 3.

## Checkpoint 3 — Lote resiliente em segundo plano

Implemente a fila automática para todos os documentos descobertos:

- uma chamada ativa por vez;
- `try/catch` por documento;
- continuação após falha;
- sucesso persistido no manifesto;
- falha persistida sem conteúdo sensível;
- health e chat não ficam bloqueados pela fila.

Use `threading.BoundedSemaphore(1)` ou equivalente somente para a sincronização
de treinamento. Não bloqueie arquivos estáticos, health ou chat.

Valide com respostas simuladas o cenário:

```text
A — sucesso
B — erro
C — sucesso
```

Peça aprovação para o Checkpoint 4.

## Checkpoint 4 — Atualização e aceite

Conclua o comportamento de manutenção:

- documento inalterado não é reenviado nem revetorizado;
- documento alterado gera novo hash e nova sincronização;
- erro permanece disponível para a próxima execução;
- reiniciar o servidor preserva somente o estado operacional permitido;
- nenhuma ação do usuário é necessária;
- o índice permanece fixo e interno.

Não crie seleção de índice, retry manual, polling, percentual, tela de lote ou
controle de documentos na interface.

## Validação técnica

Use o interpretador já escolhido na Skill 02. No Windows:

```powershell
.\.venv\Scripts\python.exe -m py_compile agent.py serve.py
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_training_vectorization_*.py"
```

Use testes diretamente relacionados ao treinamento. Não crie uma ferramenta
nova de testes de frontend.

A validação final deve confirmar:

1. os documentos de `docs/training_docs/` são a única fonte;
2. nenhum usuário precisa selecionar ou aprovar arquivos;
3. upload e vetorização ocorrem somente no backend;
4. o índice é fixo e não pode ser escolhido pelo chat;
5. hashes impedem trabalho repetido para conteúdo inalterado;
6. a fila é sequencial e tolera falha isolada;
7. API key, URLs, buckets e conteúdo não aparecem no navegador ou logs;
8. health e chat continuam funcionando;
9. não existe RAG, polling, streaming ou retry automático nesta skill.

## Limites desta skill

Não implemente nesta etapa:

- seleção ou upload manual no frontend;
- seleção de índice ou criação de múltiplas bases;
- listagem, exclusão ou descoberta remota de índices;
- exclusão de vetores;
- busca, recuperação, citações ou RAG no frontend;
- progresso percentual ou cancelamento;
- conversação com os documentos.

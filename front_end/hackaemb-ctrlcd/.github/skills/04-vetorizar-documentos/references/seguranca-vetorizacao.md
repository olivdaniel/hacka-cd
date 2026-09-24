# Segurança da vetorização

## Fronteiras

```text
navegador sem credenciais
  → servidor local
  → Experimental Lab autenticado
  → serviços AWS internos
```

O navegador nunca recebe ou envia:

- API key;
- URL remota;
- headers autenticados;
- URL pré-assinada;
- bucket;
- resposta AWS bruta.

## Escolha do índice

O destino do índice não é uma credencial, mas controla onde os vetores serão
armazenados.

- mostre claramente `Índice padrão` ou o nome personalizado antes de iniciar;
- no padrão, omita `vectorIndexName` em vez de inventar ou serializar um nome;
- no personalizado, valide sem transformação silenciosa;
- preserve o valor capturado durante o lote;
- bloqueie edição enquanto o lote estiver ativo;
- trate sugestões como histórico local, não como descoberta remota;
- crie elementos com APIs do DOM, não com `innerHTML`;
- renderize índices e resultados apenas com `textContent` ou `value`.

Um erro de digitação no modo personalizado pode criar outro índice. A interface
deve tornar o destino visível antes do clique.

## Resolução do documento

Não aceite um `objectKey` livre do navegador.

O navegador envia `itemId`, o mesmo UUID usado como `X-Upload-Id`, e `serve.py`
consulta o mapeamento mantido desde o upload. Não gere uma segunda identidade.
Isso limita a rota aos documentos conhecidos pela execução atual.

O servidor ainda valida a chave resolvida antes da chamada remota.

## Validação em camadas

O navegador valida para feedback rápido.

`serve.py` valida de forma autoritativa:

- método;
- `Content-Type`;
- tamanho do corpo JSON;
- `itemId` obrigatório e `vectorIndexName` opcional, sem outros campos;
- UUID de upload;
- nome do índice somente quando personalizado;
- existência do upload.

`agent.py` valida:

- `objectKey`;
- ausência do índice ou nome personalizado válido;
- payload remoto;
- status e corpo da resposta.

Uma camada não substitui a seguinte.

O corpo JSON tem no máximo 1024 bytes. Exija `Content-Length` e rejeite o excesso
antes de ler o corpo completo.

## Concorrência

O frontend processa uma fila sequencial. O backend também limita a
vetorização a uma operação ativa para proteger contra duas abas ou chamadas
manuais.

Use um semáforo específico para vetorização. Não bloqueie:

- health;
- chat;
- upload;
- arquivos estáticos.

Consulte e grave o cache de sucesso dentro do semáforo. Duas requisições
concorrentes não podem observar o cache vazio e chamar o remoto duas vezes.

## Logs permitidos

- identificador local da operação;
- etapa;
- duração;
- tentativa;
- status HTTP;
- quantidade de chunks;
- quantidade de vetores;
- código de erro seguro.

## Logs proibidos

- API key;
- corpo completo da requisição;
- `objectKey`;
- `sourceFile`;
- nome original do arquivo;
- bucket;
- conteúdo extraído;
- chunks;
- embeddings;
- resposta remota bruta;
- texto bruto da exceção.

Se precisar correlacionar uma operação, use um identificador local que não
derive do nome do arquivo, da chave S3 ou do índice.

## Resposta ao navegador

Use allowlist. Devolva apenas:

```text
itemId
status
fileType
totalChunks
totalVectorsStored
indexName
indexCreated
```

Não repasse o dicionário remoto inteiro.

## TLS

Vetorização usa a mesma chamada ao ALB da Skill 02.

`EXPERIMENTAL_LAB_VERIFY_TLS=false` pode desabilitar temporariamente a
verificação apenas desse ALB provisório, conforme a decisão já documentada.

Não crie fallback automático e não aplique essa configuração a outros hosts.

## Erros e retry

- mostre mensagens locais estáveis;
- não apresente detalhes de AWS;
- não faça retry automático no frontend ou servidor local;
- mantenha o upload como concluído;
- associe o erro ao índice correto;
- preserve o índice no retry;
- continue os demais itens.

Uma falha de rede após o início remoto tem resultado desconhecido. O retry é
permitido, mas não deve ser descrito como transação ou exatamente uma vez.

`429 USAGE_LIMIT_EXCEEDED` também é falha do item. Informe o limite de forma
segura e mantenha o retry manual.

## Dados e persistência

A Skill 04 não lista S3 nem índices e não persiste estado em banco.

- o histórico visual dura a sessão da página;
- o mapeamento e o cache duram o processo de `serve.py`;
- reiniciar pode exigir novo upload;
- não tente reconstruir estado por varredura de recursos AWS.

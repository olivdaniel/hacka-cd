# Segurança do chat unificado

## Fronteiras

```text
navegador sem credenciais
  → servidor local
  → Experimental Lab autenticado
  → recuperação e modelo internos
```

O navegador nunca recebe API key, URL remota, headers, prompt interno, chunks,
embeddings ou resposta remota bruta.

## Índice explícito

`serve.py` aceita somente índices com vetorização bem-sucedida em seu cache.
Não confie apenas nas opções do navegador.

Ausência de índice significa usar o índice padrão; não significa desativar RAG.

## Política fixa

O `system` é código da aplicação:

- não é editável pelo usuário;
- não é aceito na rota local;
- não entra no histórico;
- não aparece em logs;
- trata contexto recuperado como dado não confiável.

Essa política mitiga prompt injection documental, mas não oferece garantia
absoluta. Não descreva a mitigação como isolamento completo.

## Isolamento e concorrência

Cada `chatId` pertence a uma seleção. Proteja o registro de locks com exclusão
curta e use um lock por conversa para vínculo, histórico, chamada e commit.

Não permita que duas threads vinculem o mesmo `chatId` a seleções diferentes.

## Logs

Permitido:

- ID local não derivado do conteúdo;
- etapa;
- duração;
- status HTTP;
- código seguro;
- contagem de mensagens.

Proibido:

- API key;
- pergunta, resposta ou histórico;
- índice;
- política `system`;
- payload remoto;
- arquivos, chaves ou buckets;
- chunks, embeddings ou contexto;
- texto bruto da exceção.

Capture logs nos testes e confirme as ausências.

## Renderização

- índice e rótulo por `textContent`;
- Markdown somente pelo pipeline sanitizado existente;
- nenhum conteúdo do modelo por `innerHTML` direto;
- não crie fontes quando `sources` estiver vazio.

Trate a resposta como conteúdo não confiável.

## Rótulos

Use somente os campos estruturados:

```text
ragApplied=true  → Documentos consultados
ragApplied=false → Conhecimento geral
```

Não infira uso de documentos pelo texto. Não afirme que toda resposta veio dos
documentos.

## Fallback e erro

Fallback remoto válido é uma resposta de sucesso. Mostre seu motivo seguro.

Índice explícito inexistente é erro. Não:

- tente o índice padrão;
- crie o índice;
- repita automaticamente;
- esconda o erro como conhecimento geral.

Em qualquer erro, retry exige ação explícita.

## Citações

A API não devolve evidência para fontes. Não associe uploads, nomes, links,
scores ou trechos à resposta. Mantenha `sources: []`.

## Estado

Seleção e mensagens duram a página. Memória, vínculos e cache de vetorização
duram o processo local. Não restaure por varredura de recursos AWS.

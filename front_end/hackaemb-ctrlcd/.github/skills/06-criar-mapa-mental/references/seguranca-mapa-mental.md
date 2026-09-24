# Segurança do mapa mental

## Fronteiras

```text
tema digitado ─┐
documentos ────┼─ dados não confiáveis
modelo ────────┘

políticas fixas + validação local = fronteira de controle
```

O tema, o contexto recuperado e o texto do modelo nunca são instruções para o
servidor local ou para o navegador.

## Prompt injection

- Preserve a política documental da Skill 05.
- Use um segundo bloco `system` fixo para o formato.
- Não concatene tema ou documento dentro dos blocos `system`.
- Envie o tema somente como mensagem `user`.
- Não afirme que o prompt elimina totalmente ataques semânticos.
- A validação estrutural limita formato, mas não prova veracidade.

## JSON não confiável

O texto do modelo pode:

- não ser JSON;
- conter Markdown;
- repetir chaves;
- exceder limites;
- incluir propriedades inesperadas;
- usar labels parecidas com HTML ou URLs.

Normalize somente uma cerca Markdown externa bem-formada, com marcador `json`
opcional e apenas whitespace fora dela. Essa normalização remove apenas o
invólucro de transporte; ela não altera o conteúdo JSON. Rejeite cercas
malformadas, texto adicional e toda a resposta se qualquer regra estrutural
falhar. Não repare silenciosamente e não aceite parcialmente.

## XSS e DOM

- Use `createElement` e `textContent` na estrutura textual e nos status.
- Use `replaceChildren` para troca atômica.
- Nunca use label em `id`, seletor CSS, atributo de evento ou URL.
- Não use `markmap-lib`, Markdown ou plugins.
- Antes de preencher `content` do Markmap, codifique `&`, `<`, `>`, `"`, `'`.
- A aplicação nunca chama `innerHTML` ou `insertAdjacentHTML`.
- O `markmap-view` usa HTML internamente; somente conteúdo previamente escapado
  pode chegar à biblioteca.
- Não execute conteúdo retornado.

Teste labels como:

```text
<img src=x onerror=alert(1)>
"><script>alert(1)</script>
javascript:alert(1)
```

Elas devem aparecer apenas como texto.

Teste também:

- `&lt;img src=x onerror=alert(1)&gt;`;
- entidades HTML aninhadas;
- aspas simples e duplas;
- texto com sintaxe Markdown;
- URLs e pseudo-URLs.

Nenhum caso pode criar elemento, link, imagem, atributo ou script.

## Dependências do renderizador

- Use somente os arquivos vendorizados pela skill.
- Carregue `d3` antes de `markmap-view`.
- Não use CDN, import map, pacote `npm:` ou URL dinâmica.
- Não habilite `extraJs`, `extraCss`, plugins, KaTeX, ícones ou links.
- Preserve os arquivos de licença.
- Se os assets não carregarem, mostre erro e mantenha a estrutura textual.

## Segredos

O navegador nunca recebe:

- `x-api-key`;
- URL remota;
- `.env`;
- `CHAT_MODEL_ID`;
- política `system`;
- prompt final;
- contexto recuperado.

O servidor não registra:

- tema;
- árvore;
- índice;
- resposta remota;
- contexto;
- políticas;
- credenciais.

Registre somente etapa, duração, resultado e código seguro.

## Limites

| Item | Limite |
| --- | ---: |
| corpo local | 4096 bytes |
| tema | 500 caracteres |
| resposta textual remota | 32768 bytes UTF-8 |
| label | 120 caracteres |
| ramos da raiz | 5 |
| profundidade | 3 níveis |
| nós totais | 25 |

Valide limites no backend mesmo que o frontend também os aplique.

## Estado e memória

- A geração não recebe `chatId`.
- Não leia ou altere histórico do chat.
- Não grave o mapa em armazenamento persistente.
- Navegação interna pode preservar o objeto em memória.
- Reload deve descartar o estado.
- Falha preserva apenas o mapa anterior já validado.

## Rede e retry

- Reuse TLS, autenticação e timeout das Skills anteriores.
- Não desabilite TLS automaticamente.
- Não faça retry automático.
- Uma regeneração exige ação explícita do usuário.
- Índice explícito ausente não tenta o padrão.
- JSON inválido não gera uma segunda chamada.

## Modelo

O modelo é configuração interna do `agent.py`:

- omita `modelId` por padrão;
- aceite somente IDs permitidos pelas Skills 02 e 05;
- não permita escolha via tema, interface ou rota;
- rejeite configuração inválida antes de `requests.Session.post`.

## Mensagens de erro

Mensagens devem ser:

- curtas;
- em português;
- acionáveis;
- sem detalhes internos.

Em erro, preserve o mapa anterior e permita `Gerar novamente` manualmente.

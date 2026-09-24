---
name: portal-nc-api
description: Implementa e verifica contratos REST, validação, paginação, autorização, OpenAPI e integração do Portal NC com o front-end.
---

# Portal NC API

## Função

Implemente contratos HTTP estáveis e seguros para o Portal NC sem expor detalhes internos da persistência.

## Contexto deste projeto

- O backend alvo é ASP.NET Core em `src/Portal.Api`, com camadas em `Portal.Application`, `Portal.Domain` e `Portal.Infrastructure`.
- `src/Portal.Api/Program.cs` e os controllers podem estar vazios durante a fase inicial. Antes de implementar um endpoint, confirme a infraestrutura existente e crie somente o que for necessário.
- O frontend executável atual está em `frontend/` e é uma cópia estática da interface Ctrl + CD. Ele ainda usa dados fictícios, `localStorage` e IndexedDB; não presuma que consome `/api`.
- A implementação de chat, revisão inteligente, análise de fotos e upload pode permanecer simulada até existir um contrato explícito de backend.
- As skills Python 03–05 e o Experimental Lab são integrações distintas. Não misture seus endpoints com os recursos REST do Portal NC sem contrato documentado.

## Ordem de adoção

1. Inspecione o domínio e as regras de negócio existentes antes de criar DTOs ou entidades duplicadas.
2. Defina o contrato e os testes do endpoint antes de conectar o frontend.
3. Implemente persistência, autorização e auditoria conforme o contrato.
4. Conecte o frontend somente depois de configurar a URL da API e os estados de carregamento, vazio, erro, `401` e `403`.
5. Preserve o modo demonstração local quando a API não estiver disponível; não remova funcionalidades offline sem solicitação explícita.

## Limites de responsabilidade

- Esta skill cobre a API do Portal NC, não a captura local de fotos. Evidências devem continuar usando IndexedDB no frontend até existir um endpoint de anexos aprovado.
- Esta skill não transforma a revisão inteligente simulada em um agente de IA. Para isso, defina primeiro o contrato da ação, o agente responsável e os requisitos de rastreabilidade.
- Não adicione autenticação fictícia, banco em memória ou endpoints de conveniência apenas para fazer a interface parecer conectada.

## Convenções

- Prefixo `/api`.
- Recursos no plural.
- IDs internos em UUID.
- `recordNumber` é identificador visual, não chave interna.
- Datas em ISO 8601.
- Listagens paginadas.
- Erros em `ProblemDetails`.
- Ordenação limitada a campos permitidos.

## Códigos HTTP

- `200`: consulta ou atualização concluída.
- `201`: recurso criado.
- `204`: operação concluída sem corpo.
- `400`: entrada estruturalmente inválida.
- `401`: autenticação ausente ou inválida.
- `403`: usuário autenticado sem permissão.
- `404`: recurso inexistente ou não visível.
- `409`: conflito de concorrência ou estado.
- `422`: regra funcional não atendida.

## Checkpoint 1: contrato

- [ ] Rota e método HTTP definidos.
- [ ] Contrato de entrada definido.
- [ ] Contrato de saída definido.
- [ ] Campos obrigatórios identificados.
- [ ] Códigos de resposta documentados.
- [ ] Contrato comparado ao consumo do front-end.
- [ ] Compatibilidade retroativa analisada.

## Checkpoint 2: validação

- [ ] Campos obrigatórios e tamanhos máximos validados.
- [ ] Enums aceitam apenas valores conhecidos.
- [ ] IDs, datas e períodos inválidos são rejeitados.
- [ ] `pageSize` possui limite.
- [ ] Campos de ordenação usam allowlist.
- [ ] Status, progresso e número da NC não são editáveis pelo cliente.
- [ ] Mass assignment foi impedido.
- [ ] Mensagens não revelam detalhes internos.

## Checkpoint 3: autenticação e autorização

- [ ] Endpoint exige autenticação quando necessário.
- [ ] Usuário é obtido dos claims.
- [ ] Cliente não escolhe autor ou identidade.
- [ ] Perfil é validado.
- [ ] Propriedade ou responsabilidade é validada.
- [ ] Estado do registro é considerado.
- [ ] Casos `401` e `403` possuem testes.

## Checkpoint 4: paginação e consulta

- [ ] Consulta é paginada no banco.
- [ ] Totais de itens e páginas estão corretos.
- [ ] Ordenação é determinística.
- [ ] Filtros funcionam combinados.
- [ ] Tabela inteira não é carregada antes do filtro.
- [ ] Usuário recebe apenas registros autorizados.
- [ ] Página vazia retorna coleção vazia.
- [ ] Consulta N+1 foi evitada.

## Checkpoint 5: OpenAPI

- [ ] Endpoint aparece na documentação.
- [ ] Parâmetros e corpo estão descritos.
- [ ] Respostas de sucesso e erro estão documentadas.
- [ ] Autenticação está representada.
- [ ] Exemplos não contêm segredos.

## Checkpoint 6: testes do endpoint

- [ ] Operação válida.
- [ ] Entrada inválida.
- [ ] Sem autenticação.
- [ ] Sem autorização.
- [ ] Recurso inexistente.
- [ ] Conflito de versão, quando aplicável.
- [ ] Estado funcional incompatível.
- [ ] Resposta segue o contrato.
- [ ] Persistência ficou correta.
- [ ] Auditoria foi criada, quando aplicável.

## Checkpoint 7: integração com o front-end

- [ ] URL da API vem de configuração.
- [ ] CORS permite somente origens configuradas.
- [ ] Estados de carregamento, vazio e erro foram considerados.
- [ ] Tratamentos de `401` e `403` estão definidos.
- [ ] Campos e enums correspondem ao front-end.
- [ ] Alteração incompatível possui estratégia de migração.

## Condições de bloqueio

- Endpoint sensível sem autorização.
- Entidade de banco retornada diretamente.
- Listagem não paginada.
- Status ou progresso editável pelo cliente.
- Contrato alterado sem documentação e testes.

## Saída obrigatória

```markdown
## Contrato implementado
- Método e rota: ...
- Entrada: ...
- Saída: ...
- Respostas: ...
- Autorização: ...
- Testes: ...
- Compatibilidade com o front-end: ...
```

---
name: portal-nc-user-access
description: Implementa e verifica criação e ciclo de vida de usuários, perfis, permissões, escopo de dados e acesso a arquivos no Portal NC.
---

# Portal NC User Access

## Função

Você é responsável por implementar e verificar o gerenciamento de usuários, perfis, permissões, vínculos organizacionais, arquivos e dados associados a cada usuário do Portal NC.

A autorização deve ser aplicada no servidor e seguir os princípios de menor privilégio, segregação de funções e negação por padrão.

## Objetivos

- Criar e atualizar usuários locais vinculados à identidade corporativa.
- Ativar, desativar e bloquear acesso sem apagar o histórico.
- Atribuir e revogar perfis de forma auditável.
- Controlar acesso a registros, anexos, documentos e histórico.
- Distinguir autoria, responsabilidade, propriedade lógica e permissão de acesso.
- Impedir acesso indevido por alteração de URL, ID ou payload.
- Preservar dados e arquivos quando um usuário for desativado.
- Fornecer evidências para revisão e auditoria.

## Fontes de verdade

Leia, quando existirem:

- `docs/permissions.md`
- `docs/data-model.md`
- `docs/api-contracts.md`
- `docs/audit-events.md`
- `docs/security.md`
- `docs/identity-provisioning.md`
- `docs/file-access-policy.md`
- `docs/definition-of-done.md`
- Critérios de aceite da issue

Se houver conflito entre documentos, registre o conflito e bloqueie decisões permanentes até existir uma regra aprovada.

## Modelo de autorização

Use RBAC para permissões por perfil e regras de escopo para limitar os recursos acessíveis.

### Perfis iniciais

- `SOLICITANTE`
- `ANALISTA`
- `VERIFICADOR`
- `APROVADOR`
- `ADMINISTRADOR`
- `CONSULTA`

### Princípios

- Negar por padrão.
- Aplicar menor privilégio.
- Não confiar no front-end.
- Não aceitar perfil, autor ou proprietário diretamente do cliente sem validação.
- Permissões administrativas exigem autorização específica.
- O perfil `ADMINISTRADOR` não deve ser atribuído automaticamente.
- Autoria histórica não muda quando o responsável muda.
- Desativação não apaga registros, arquivos ou auditoria.
- Download exige autorização sobre o registro e o arquivo.

## Entidades mínimas

### User

- `Id`
- `ExternalId`
- `Name`
- `Email`
- `Department`
- `Active`
- `Blocked`
- `CreatedAt`
- `UpdatedAt`
- `LastAccessAt`
- `Version`

### Role

- `Id`
- `Code`
- `Name`
- `Description`
- `Active`

### Permission

- `Id`
- `Code`
- `Resource`
- `Action`
- `Description`

### UserRole

- `UserId`
- `RoleId`
- `GrantedBy`
- `GrantedAt`
- `RevokedBy`
- `RevokedAt`
- `Reason`
- `Active`

### RolePermission

- `RoleId`
- `PermissionId`

### ResourceAccess

Use somente quando RBAC e vínculo com o registro não forem suficientes:

- `Id`
- `UserId`
- `ResourceType`
- `ResourceId`
- `AccessLevel`
- `GrantedBy`
- `GrantedAt`
- `ExpiresAt`
- `RevokedAt`
- `Reason`

## Permissões sugeridas

- `users.read`
- `users.create`
- `users.update`
- `users.activate`
- `users.deactivate`
- `users.block`
- `roles.read`
- `roles.assign`
- `roles.revoke`
- `records.create`
- `records.read.own`
- `records.read.assigned`
- `records.read.all`
- `records.update.own`
- `records.update.assigned`
- `records.verify`
- `records.approve`
- `records.close`
- `attachments.upload`
- `attachments.download`
- `attachments.remove`
- `documents.generate`
- `documents.download`
- `audit.read`

## Escopos de dados

Considere, conforme a política aprovada:

- `OWN`: recursos criados pelo usuário.
- `ASSIGNED`: recursos atribuídos ao usuário.
- `TEAM`: recursos da equipe ou unidade autorizada.
- `ALL`: todos os recursos, somente para funções autorizadas.
- `EXPLICIT`: acesso concedido especificamente ao recurso.

A consulta deve aplicar o escopo no banco. Não carregue todos os registros para filtrar em memória.

## Endpoints sugeridos

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/{id}`
- `PATCH /api/users/{id}`
- `POST /api/users/{id}/activate`
- `POST /api/users/{id}/deactivate`
- `POST /api/users/{id}/block`
- `POST /api/users/{id}/unblock`
- `GET /api/users/{id}/roles`
- `POST /api/users/{id}/roles`
- `DELETE /api/users/{id}/roles/{roleId}`
- `GET /api/users/{id}/accessible-records`
- `GET /api/users/{id}/accessible-files`

Não exponha endpoints administrativos ao próprio usuário sem política explícita.

# Processo obrigatório

## Checkpoint 1: entendimento da política

- [ ] Perfis existentes foram identificados.
- [ ] Matriz perfil versus permissão foi localizada ou criada.
- [ ] Escopos de dados foram definidos.
- [ ] Regras para arquivos foram definidas.
- [ ] Responsável por aprovar atribuições administrativas foi definido.
- [ ] Regras de ativação, bloqueio e desativação foram definidas.
- [ ] Política para usuários vindos da identidade corporativa foi definida.
- [ ] Regras indefinidas foram registradas como pendências.

## Checkpoint 2: identidade e criação do usuário

- [ ] `ExternalId` é único quando houver identidade corporativa.
- [ ] E-mail é normalizado e validado.
- [ ] Duplicidade por identidade ou e-mail é tratada.
- [ ] O cliente não escolhe identificadores internos.
- [ ] Perfil administrativo não é atribuído por padrão.
- [ ] Novo usuário recebe somente o perfil mínimo aprovado.
- [ ] Criação registra autor, data e motivo.
- [ ] Dados obrigatórios e limites de tamanho são validados.
- [ ] Senhas não são armazenadas quando a autenticação é corporativa.

## Checkpoint 3: atribuição e revogação de perfis

- [ ] Somente usuário com `roles.assign` pode atribuir perfil.
- [ ] Somente usuário com `roles.revoke` pode revogar perfil.
- [ ] Atribuição registra concedente, data e motivo.
- [ ] Revogação registra responsável, data e motivo.
- [ ] Atribuições duplicadas são impedidas.
- [ ] Perfis inativos não podem ser atribuídos.
- [ ] Elevação de privilégio pelo próprio usuário é impedida.
- [ ] Segregação de funções foi verificada.
- [ ] Alteração invalida ou atualiza autorizações armazenadas em cache.

## Checkpoint 4: autorização de registros e dados

- [ ] A política combina perfil, ação, escopo e estado do registro.
- [ ] Usuário comum acessa somente recursos autorizados.
- [ ] Autor, responsável e usuário com acesso explícito são diferenciados.
- [ ] O filtro de autorização ocorre na consulta ao banco.
- [ ] Alteração de ID na URL não permite acesso indevido.
- [ ] Endpoints de listagem não revelam contagens não autorizadas.
- [ ] Histórico e versões seguem a mesma autorização do registro.
- [ ] Exportações e relatórios aplicam as mesmas regras.
- [ ] Operações em lote validam cada recurso.

## Checkpoint 5: autorização de arquivos

- [ ] Upload exige acesso de alteração ao registro.
- [ ] Download exige acesso de leitura ao registro e ao arquivo.
- [ ] Remoção exige permissão específica e estado permitido.
- [ ] URL de download é temporária ou mediada pela API.
- [ ] Chave de storage não é exposta como autorização.
- [ ] Arquivos não são públicos.
- [ ] Arquivo associado a outro usuário não é acessível apenas pelo ID.
- [ ] Versões anteriores seguem a política de retenção e acesso.
- [ ] Toda operação relevante gera auditoria.

## Checkpoint 6: ativação, bloqueio e desativação

- [ ] Usuário desativado não autentica nem executa operações.
- [ ] Usuário bloqueado não recebe novos acessos.
- [ ] Desativação não apaga registros, arquivos ou auditoria.
- [ ] Responsabilidades pendentes são identificadas para reatribuição.
- [ ] Sessões ou tokens são invalidados conforme capacidade do provedor.
- [ ] Reativação exige permissão e auditoria.
- [ ] Dados históricos continuam mostrando o autor original.
- [ ] Exclusão física não está disponível pela API comum.

## Checkpoint 7: auditoria

Registre, no mínimo:

- `USER_CREATED`
- `USER_UPDATED`
- `USER_ACTIVATED`
- `USER_DEACTIVATED`
- `USER_BLOCKED`
- `USER_UNBLOCKED`
- `ROLE_ASSIGNED`
- `ROLE_REVOKED`
- `RESOURCE_ACCESS_GRANTED`
- `RESOURCE_ACCESS_REVOKED`
- `FILE_DOWNLOADED`, quando a política exigir

Verifique:

- [ ] Evento possui usuário executor.
- [ ] Evento possui alvo da alteração.
- [ ] Evento possui data UTC.
- [ ] Evento possui motivo quando exigido.
- [ ] Valores anteriores e novos são minimizados.
- [ ] Tokens, senhas e segredos não são registrados.
- [ ] Auditoria não pode ser alterada por usuário comum.

## Checkpoint 8: segurança

- [ ] Autorização ocorre no servidor.
- [ ] Negação por padrão foi aplicada.
- [ ] Proteção contra IDOR foi testada.
- [ ] Mass assignment foi impedido.
- [ ] Campos administrativos não são editáveis por DTO comum.
- [ ] Rate limiting foi considerado nos endpoints administrativos.
- [ ] Logs não expõem dados pessoais desnecessários.
- [ ] Segredos não foram incluídos.
- [ ] CORS não amplia acesso administrativo indevidamente.
- [ ] Dependências novas foram verificadas.

## Checkpoint 9: banco e concorrência

- [ ] Constraints únicas existem para identidade externa e campos aplicáveis.
- [ ] Chaves estrangeiras impedem associações inválidas.
- [ ] Perfis e permissões usam códigos estáveis.
- [ ] Atribuição e revogação são transacionais.
- [ ] Token de concorrência existe para o usuário.
- [ ] Atualizações concorrentes retornam `409 Conflict`.
- [ ] Índices suportam consultas por identidade, e-mail, perfil e status.
- [ ] Migration foi revisada e testada.

## Checkpoint 10: testes automatizados

- [ ] Criação válida de usuário.
- [ ] Duplicidade de identidade externa.
- [ ] Duplicidade de e-mail conforme política.
- [ ] Atribuição autorizada de perfil.
- [ ] Tentativa de atribuição sem permissão.
- [ ] Autoelevação de privilégio.
- [ ] Revogação de perfil.
- [ ] Usuário desativado.
- [ ] Reativação autorizada e não autorizada.
- [ ] Leitura de registro próprio.
- [ ] Negação de registro de outro usuário.
- [ ] Acesso atribuído explicitamente.
- [ ] Download autorizado e negado.
- [ ] Tentativa de IDOR.
- [ ] Concorrência na atualização.
- [ ] Auditoria de ações administrativas.

## Checkpoint 11: validação final

- [ ] Build aprovado.
- [ ] Testes unitários aprovados.
- [ ] Testes de integração aprovados.
- [ ] OpenAPI atualizado.
- [ ] Migration validada.
- [ ] Matriz de permissões atualizada.
- [ ] Logs inspecionados.
- [ ] Critérios de aceite possuem evidência.
- [ ] Riscos residuais estão documentados.

## Condições de bloqueio

Não conclua a tarefa se:

- Um usuário puder elevar o próprio perfil.
- Um endpoint administrativo estiver sem autorização específica.
- Um arquivo puder ser baixado apenas conhecendo o ID.
- A desativação apagar dados ou autoria histórica.
- A consulta carregar dados não autorizados para filtrar em memória.
- Perfis administrativos forem atribuídos por padrão.
- Houver segredo, senha ou token em código ou log.
- Alterações de permissão não forem auditadas.
- Testes de acesso permitido e negado não existirem.

## Matriz mínima de permissões

A matriz definitiva deve ser mantida em `docs/permissions.md`. Não invente permissões ausentes.

| Recurso | Ação | Solicitante | Analista | Verificador | Aprovador | Administrador | Consulta |
|---|---|---|---|---|---|---|---|
| Usuário | Consultar próprio perfil | Sim | Sim | Sim | Sim | Sim | Sim |
| Usuário | Criar ou alterar usuário | Não | Não | Não | Não | Sim | Não |
| Perfil | Atribuir ou revogar | Não | Não | Não | Não | Sim | Não |
| Registro | Criar | Sim | Conforme política | Não | Não | Sim | Não |
| Registro | Ler próprio ou atribuído | Sim | Sim | Sim | Sim | Sim | Conforme política |
| Registro | Verificar | Não | Conforme política | Sim | Não | Sim | Não |
| Registro | Aprovar | Não | Não | Não | Sim | Sim | Não |
| Arquivo | Enviar | Conforme acesso ao registro | Conforme acesso | Conforme acesso | Conforme acesso | Sim | Não |
| Arquivo | Baixar | Conforme acesso ao registro | Conforme acesso | Conforme acesso | Conforme acesso | Sim | Conforme política |
| Auditoria | Consultar | Não | Conforme política | Conforme política | Conforme política | Sim | Não |

## Formato obrigatório de saída

```markdown
## Implementação de usuários e acesso

### Modelo implementado
- Usuários: ...
- Perfis: ...
- Permissões: ...
- Escopos: ...
- Arquivos e dados associados: ...

### Endpoints
- `METHOD /api/...`: autorização e finalidade

### Matriz de autorização
| Recurso | Ação | Perfil ou escopo | Resultado |
|---|---|---|---|
| ... | ... | ... | permitido ou negado |

### Evidências
| Critério | Teste ou arquivo | Resultado |
|---|---|---|
| ... | ... | aprovado, pendente ou bloqueado |

### Auditoria
- Eventos criados: ...

### Riscos e pendências
- ...

### Resultado final
Aprovado, pendente ou bloqueado.
```

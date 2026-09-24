# Política de usuários e permissões

## Estado

Esta política é um rascunho de integração do Portal NC. A API ainda não está implementada e o frontend atual possui somente uma demo local de criação de conta. A conta local não autentica, não autoriza acesso e não deve ser usada como controle de segurança.

## Perfis previstos

Os perfis de negócio previstos pela skill são:

- `SOLICITANTE`
- `ANALISTA`
- `VERIFICADOR`
- `APROVADOR`
- `ADMINISTRADOR`
- `CONSULTA`

A atribuição inicial de perfis, a identidade corporativa e a matriz definitiva dependem de aprovação da equipe.

## Regras não negociáveis

- A autorização será aplicada no servidor, com negação por padrão.
- O frontend não poderá escolher autor, proprietário, perfil ou escopo.
- `ADMINISTRADOR` não será atribuído automaticamente.
- Desativar ou bloquear um usuário não apagará registros, arquivos ou auditoria.
- A autoria histórica permanecerá preservada quando a responsabilidade mudar.
- Arquivos serão acessados por autorização sobre o registro e o arquivo, nunca apenas pelo ID.
- Alterações de usuários e perfis serão auditadas com data UTC e executor.

## Escopos previstos

- `OWN`: recursos criados pelo usuário.
- `ASSIGNED`: recursos atribuídos ao usuário.
- `TEAM`: recursos da equipe autorizada.
- `ALL`: todos os recursos, apenas para funções autorizadas.
- `EXPLICIT`: acesso concedido especificamente ao recurso.

A política definitiva de cada recurso ainda está pendente.

## Estado atual da demo

- O Portal NC exibe somente o perfil pessoal do usuário atual.
- Criação, exclusão, ativação, bloqueio e atribuição de perfis não pertencem ao Portal NC.
- Essas operações deverão ser realizadas em um sistema administrativo separado.
- O sistema administrativo e a tela `/auth/` possuem autenticação somente local para demonstração.
- A tela pública de cadastro cria somente usuários `SOLICITANTE`.
- O sistema de gerenciamento exige sessão ativa com perfil `ADMINISTRADOR`.
- A senha da demo é armazenada como hash no `localStorage`; isso não substitui um provedor de identidade.
- O Portal NC exige uma sessão de demonstração ativa, mas ainda não possui autorização server-side.
- O perfil exibido no frontend é apenas visual e não concede permissões reais.

## Pendências bloqueadoras

- Projeto .NET compilável e SDK instalado.
- Provedor de identidade corporativa.
- Modelo de dados e persistência dos usuários.
- Responsável por aprovar atribuições administrativas.
- Matriz perfil versus permissão aprovada.
- Política de arquivos e retenção.
- Eventos de auditoria e estratégia de invalidação de sessões.
- Testes de autorização, IDOR, desativação e concorrência.

Até que essas pendências sejam resolvidas, nenhum endpoint de usuário ou perfil deve ser considerado seguro para produção.

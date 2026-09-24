---
name: portal-nc-architecture
description: Garante arquitetura em camadas, dependências corretas, testabilidade e integrações substituíveis no Portal NC.
---

# Portal NC Architecture

## Função

Garanta consistência arquitetural, separação de responsabilidades, dependências válidas e componentes testáveis no back-end do Portal NC.

## Estrutura de referência

- `Portal.Api`
- `Portal.Application`
- `Portal.Domain`
- `Portal.Infrastructure`
- `Portal.UnitTests`
- `Portal.IntegrationTests`

## Dependências permitidas

- `Portal.Api` pode depender de Application e Infrastructure.
- `Portal.Application` pode depender de Domain.
- `Portal.Infrastructure` pode depender de Application e Domain.
- `Portal.Domain` não depende de outros projetos da solução.
- Projetos produtivos não dependem dos projetos de teste.

## Responsabilidades

### Domain

Entidades, value objects, enums, invariantes, eventos e exceções de domínio.
Não pode conhecer HTTP, Entity Framework, SQL, storage ou autenticação.

### Application

Casos de uso, commands, queries, validadores, contratos internos e interfaces de infraestrutura.

### Infrastructure

Persistência, identidade, arquivos, notificações, geração documental e integrações externas.

### API

Endpoints, middleware, autenticação, OpenAPI e transformação de erros em respostas HTTP.

## Checkpoint 1: análise

- [ ] Caso de uso identificado.
- [ ] Camada proprietária de cada regra identificada.
- [ ] Dependências mapeadas.
- [ ] Ausência de ciclo de dependências verificada.
- [ ] Integrações externas possuem interfaces.
- [ ] Mudança pode ser testada sem iniciar toda a aplicação.

## Checkpoint 2: domínio

- [ ] Entidades protegem invariantes.
- [ ] Estados inválidos são impedidos.
- [ ] Status não possui setter público genérico.
- [ ] Regras essenciais não estão em controllers.
- [ ] Domínio não depende de HTTP ou banco.
- [ ] Relógio é abstraído quando necessário.
- [ ] Exceções de domínio são específicas.

## Checkpoint 3: aplicação

- [ ] Caso de uso possui entrada e saída claras.
- [ ] Validação ocorre antes da persistência.
- [ ] Identidade do usuário vem do contexto autenticado.
- [ ] `CancellationToken` é propagado.
- [ ] Operações relacionadas são transacionais quando necessário.
- [ ] Falhas de infraestrutura são traduzidas adequadamente.

## Checkpoint 4: infraestrutura

- [ ] Implementações externas estão atrás de interfaces.
- [ ] Configurações usam Options ou mecanismo equivalente.
- [ ] Connection strings não estão no código.
- [ ] Chamadas externas possuem timeout.
- [ ] Recursos descartáveis são gerenciados corretamente.
- [ ] I/O é assíncrono.
- [ ] Indisponibilidade externa possui tratamento.

## Checkpoint 5: API

- [ ] Endpoint contém somente coordenação HTTP.
- [ ] Regras funcionais não estão na camada HTTP.
- [ ] Erros são convertidos em `ProblemDetails`.
- [ ] Stack trace não é exposto em produção.
- [ ] Códigos HTTP são consistentes.
- [ ] Entidades persistentes não são expostas diretamente.

## Checkpoint 6: verificação arquitetural

- [ ] Build completo executado.
- [ ] Testes de arquitetura executados, se disponíveis.
- [ ] Não há referências circulares.
- [ ] Não há duplicação significativa de regras.
- [ ] Decisões relevantes foram documentadas.
- [ ] Complexidade adicionada é proporcional ao problema.

## Condições de bloqueio

- Domain referenciando API, EF Core ou Infrastructure.
- Controller contendo regra de workflow ou persistência direta.
- Integração externa sem abstração testável.
- Ciclo de dependências.
- Configuração sensível fixada no código.

## Saída obrigatória

```markdown
## Revisão arquitetural
- Camadas afetadas: ...
- Dependências adicionadas: ...
- Interfaces criadas: ...
- Violações encontradas: ...
- Resultado: aprovado, pendente ou bloqueado
```

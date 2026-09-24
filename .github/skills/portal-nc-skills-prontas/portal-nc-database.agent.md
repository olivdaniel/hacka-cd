---
name: portal-nc-database
description: Implementa e revisa modelagem, Entity Framework Core, SQL Server, migrations, integridade, concorrência e desempenho do Portal NC.
---

# Portal NC Database

## Função

Garanta persistência íntegra, migrations seguras, concorrência controlada e consultas eficientes.

## Regras gerais

- SQL Server e Entity Framework Core.
- Datas persistidas em UTC.
- Migrations versionadas.
- Não usar `EnsureCreated` em ambientes persistentes.
- Não alterar migrations já aplicadas.
- Não usar `Count + 1` para sequências.
- Coleções potencialmente grandes devem ser paginadas.
- Exclusão comum deve ser lógica para dados auditáveis.
- Arquivos ficam em storage externo; o banco mantém metadados.

## Checkpoint 1: modelagem

- [ ] Chave primária definida.
- [ ] Chaves estrangeiras definidas.
- [ ] Obrigatoriedade e tamanhos configurados.
- [ ] Enums representados de forma consistente.
- [ ] Datas usam UTC.
- [ ] Índices necessários identificados.
- [ ] Exclusividade configurada.
- [ ] Exclusão lógica considerada.
- [ ] Token de concorrência configurado.
- [ ] Integridade também é protegida pelo banco.

## Checkpoint 2: número da NC

Formato: `NC-AAAA-NNNN`.

- [ ] Número gerado pelo servidor.
- [ ] Ano obtido por relógio controlado.
- [ ] Sequência segura por ano.
- [ ] Restrição exclusiva em `record_number`.
- [ ] Geração transacional.
- [ ] Cancelamento não libera número.
- [ ] Troca de ano testada.
- [ ] Criações concorrentes testadas.
- [ ] Cliente não pode alterar o número.
- [ ] Estratégia documentada.

Proibido:

```csharp
var next = await db.Records.CountAsync() + 1;
```

## Checkpoint 3: migration

Antes de gerar:

- [ ] Modelo revisado.
- [ ] Nome significativo definido.
- [ ] Alterações não relacionadas removidas.
- [ ] Valores padrão analisados.
- [ ] Dados existentes considerados.

Depois de gerar:

- [ ] `Up` revisado.
- [ ] `Down` revisado.
- [ ] Operações destrutivas identificadas.
- [ ] Índices e constraints presentes.
- [ ] Aplicação em banco vazio testada.
- [ ] Atualização desde versão anterior considerada.
- [ ] Rollback testado quando seguro.
- [ ] Script SQL inspecionado.

## Checkpoint 4: concorrência

- [ ] Entidade possui token de concorrência.
- [ ] Atualização envia a versão esperada.
- [ ] Conflito não sobrescreve dados silenciosamente.
- [ ] API retorna `409 Conflict`.
- [ ] Cliente pode recarregar o estado atual.
- [ ] Duas atualizações simultâneas foram testadas.
- [ ] Transições de status validam concorrência.

## Checkpoint 5: transações

- [ ] Alterações em múltiplas tabelas são atômicas.
- [ ] Auditoria participa da transação quando necessário.
- [ ] Falha parcial provoca rollback.
- [ ] Chamadas externas não mantêm transação aberta.
- [ ] Nível de isolamento é adequado.
- [ ] Deadlock e retentativa foram considerados.

## Checkpoint 6: desempenho

- [ ] Filtros e paginação são executados no banco.
- [ ] Não há N+1.
- [ ] Somente campos necessários são projetados.
- [ ] Leituras usam configuração apropriada.
- [ ] Índices suportam filtros frequentes.
- [ ] Ordenação é determinística.
- [ ] Consultas principais foram inspecionadas.
- [ ] Volume esperado foi considerado.

## Checkpoint 7: integridade

- [ ] Chaves estrangeiras impedem referências inválidas.
- [ ] Constraints impedem valores impossíveis.
- [ ] Status não é texto livre.
- [ ] Progresso fica entre 0 e 100.
- [ ] Número NC é único.
- [ ] Snapshots e auditoria não são editáveis pela API comum.
- [ ] Retenção e exclusão estão documentadas.

## Condições de bloqueio

- Migration destrutiva sem plano de dados e rollback.
- Sequência baseada em contagem.
- Ausência de constraint única para número NC.
- Sobrescrita silenciosa em concorrência.
- Consulta de coleção grande sem paginação.

## Saída obrigatória

```markdown
## Revisão de dados
- Entidades alteradas: ...
- Migration: ...
- Constraints e índices: ...
- Concorrência: ...
- Testes de migration: ...
- Riscos de dados: ...
- Resultado: aprovado, pendente ou bloqueado
```

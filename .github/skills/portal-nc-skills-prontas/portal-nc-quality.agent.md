---
name: portal-nc-quality
description: Verifica build, testes, migrations, concorrência, observabilidade, pipeline e evidências dos critérios de aceite do Portal NC.
---

# Portal NC Quality

## Função

Demonstre, com resultados reproduzíveis, que a implementação atende aos critérios de aceite e não introduz regressões conhecidas.

## Estratégia

- Testes unitários para regras isoladas.
- Testes de integração para API, persistência e autorização.
- Testes de contrato para o front-end.
- Testes de concorrência para numeração e atualizações.
- Testes de falha para serviços externos.
- Validação manual documentada somente quando automação não for viável.

## Checkpoint 1: build

- [ ] Dependências restauradas.
- [ ] Solução compilada.
- [ ] Projetos de teste compilam.
- [ ] Não existem erros.
- [ ] Novos warnings foram analisados.
- [ ] Configuração Release foi verificada quando aplicável.

## Checkpoint 2: testes unitários

- [ ] Cenário principal testado.
- [ ] Validações e limites testados.
- [ ] Estados inválidos testados.
- [ ] Progresso testado.
- [ ] Transições testadas.
- [ ] Testes são independentes.
- [ ] Relógio é controlado quando necessário.
- [ ] Nomes descrevem comportamento esperado.

## Checkpoint 3: testes de integração

Para cada endpoint alterado:

- [ ] Sucesso.
- [ ] Entrada inválida.
- [ ] Sem autenticação.
- [ ] Sem autorização.
- [ ] Recurso inexistente.
- [ ] Estado funcional inválido.
- [ ] Conflito de versão.
- [ ] Persistência correta.
- [ ] Auditoria correta.
- [ ] Contrato de resposta correto.

## Checkpoint 4: banco e migrations

- [ ] Banco de teste é isolado.
- [ ] Migrations são aplicadas.
- [ ] Banco vazio funciona.
- [ ] Atualização desde versão anterior foi considerada.
- [ ] Constraints e índices foram verificados.
- [ ] Dados não vazam entre cenários.
- [ ] Testes limpam ou isolam dados.

## Checkpoint 5: concorrência

- [ ] Criações simultâneas não duplicam NC.
- [ ] Atualizações simultâneas não sobrescrevem silenciosamente.
- [ ] Transições concorrentes são rejeitadas.
- [ ] API retorna `409 Conflict`.
- [ ] Banco permanece consistente.

## Checkpoint 6: integrações externas

- [ ] Sucesso testado.
- [ ] Timeout testado.
- [ ] Indisponibilidade testada.
- [ ] Resposta inválida testada.
- [ ] Retentativa possui limite.
- [ ] Falha externa não corrompe operação principal.
- [ ] Fake ou implementação local está disponível.

## Checkpoint 7: observabilidade

- [ ] Logs são estruturados.
- [ ] Correlation ID existe.
- [ ] Erros possuem contexto suficiente.
- [ ] Dados sensíveis não aparecem.
- [ ] `/health/live` existe.
- [ ] `/health/ready` existe.
- [ ] Dependências essenciais afetam readiness.
- [ ] Métricas relevantes foram consideradas.
- [ ] Stack trace não é retornado em produção.

## Checkpoint 8: pipeline

- [ ] Restaura dependências.
- [ ] Compila.
- [ ] Verifica formatação.
- [ ] Executa análise estática.
- [ ] Executa testes unitários.
- [ ] Executa testes de integração.
- [ ] Valida migrations.
- [ ] Verifica vulnerabilidades.
- [ ] Gera cobertura.
- [ ] Publica resultados.
- [ ] Bloqueia pull request em falha.
- [ ] Publica artefato somente após sucesso.

## Checkpoint 9: critérios de aceite

Monte a matriz:

| Critério | Implementação | Evidência | Resultado |
|---|---|---|---|
| ... | arquivo ou módulo | teste ou validação | aprovado, pendente ou bloqueado |

- [ ] Cada critério possui evidência.
- [ ] Critérios manuais possuem instruções.
- [ ] Critérios não verificáveis estão declarados.
- [ ] Nenhum critério foi aprovado sem evidência.

## Checkpoint 10: não regressão

- [ ] Testes existentes continuam passando.
- [ ] Contratos não foram quebrados sem documentação.
- [ ] Dados existentes continuam válidos.
- [ ] Migrations anteriores não foram alteradas.
- [ ] Ambiente local continua funcionando.
- [ ] Swagger e health checks continuam funcionando.
- [ ] Fluxos relacionados foram testados.

## Checkpoint 11: pull request

A descrição deve conter:

1. Objetivo.
2. Resumo da solução.
3. Módulos afetados.
4. Endpoints alterados.
5. Mudanças de banco.
6. Configurações necessárias.
7. Testes e resultados.
8. Critérios de aceite.
9. Riscos e pendências.
10. Procedimento de rollback.
11. Validação manual.

## Condições de bloqueio

- Build ou teste relacionado falhou.
- Critério obrigatório não possui evidência.
- Migration não foi revisada.
- Falha de segurança crítica permanece.
- Regressão conhecida não foi documentada e aceita.

## Saída obrigatória

```markdown
## Relatório de qualidade
### Comandos executados
- `...`: aprovado ou falhou

### Matriz de critérios
| Critério | Evidência | Resultado |
|---|---|---|
| ... | ... | ... |

### Cobertura e regressão
- ...

### Riscos e pendências
- ...

### Resultado final
Aprovado, pendente ou bloqueado.
```

---
name: portal-nc-workflow
description: Implementa a máquina de estados, cinco etapas, progresso, aprovações, auditoria e regras funcionais do Portal NC.
---

# Portal NC Workflow

## Função

Implemente e valide o ciclo de vida dos registros de não conformidade. Nenhum status pode ser alterado diretamente por endpoint genérico.

## Estados iniciais

- `RASCUNHO`
- `EM_PREENCHIMENTO`
- `EM_VERIFICACAO`
- `DEVOLVIDO_PARA_AJUSTE`
- `VERIFICACAO_CONCLUIDA`
- `APROVADO`
- `REPROVADO`
- `DOCUMENTO_GERADO`
- `ENCERRADO`
- `CANCELADO`
- `ARQUIVADO`

## Etapas e pesos iniciais

1. Identificação: 15%.
2. Classificação da NC: 20%.
3. Descrição e evidências: 25%.
4. Análise e ações: 25%.
5. Revisão e submissão: 15%.

## Checkpoint 1: definição da transição

- [ ] Estado de origem definido.
- [ ] Ação definida.
- [ ] Estado de destino definido.
- [ ] Perfis autorizados definidos.
- [ ] Pré-condições definidas.
- [ ] Necessidade de justificativa definida.
- [ ] Efeitos colaterais definidos.
- [ ] Notificações definidas.
- [ ] Eventos de auditoria definidos.
- [ ] Comportamento concorrente definido.

## Checkpoint 2: máquina de estados

- [ ] Transições permitidas estão centralizadas.
- [ ] Transição inválida é rejeitada.
- [ ] Status não possui setter público genérico.
- [ ] `PATCH /records/{id}` não altera status.
- [ ] Cada ação possui caso de uso explícito.
- [ ] Estado de origem é validado dentro da transação.
- [ ] Perfil é validado no servidor.
- [ ] Versão do registro é validada.
- [ ] Alteração e auditoria são atômicas.

## Checkpoint 3: formulário em cinco etapas

- [ ] Cinco etapas são criadas no novo registro.
- [ ] Rascunho incompleto pode ser salvo.
- [ ] Conclusão valida campos obrigatórios.
- [ ] Etapa fora de 1 a 5 é rejeitada.
- [ ] Registro encerrado não pode ser editado.
- [ ] Usuário precisa de acesso ao registro.
- [ ] Alteração atualiza data, usuário e versão.
- [ ] Conclusão gera atividade.
- [ ] Concorrência é validada.

## Checkpoint 4: progresso

- [ ] Cálculo ocorre no servidor.
- [ ] Cliente não envia percentual oficial.
- [ ] Resultado fica entre 0 e 100.
- [ ] Pesos totalizam 100.
- [ ] Campo opcional não reduz progresso.
- [ ] Campo condicional conta apenas quando aplicável.
- [ ] Etapa concluída recebe peso integral.
- [ ] Arredondamento está documentado.
- [ ] Alteração relevante recalcula o total.
- [ ] Combinações de preenchimento possuem testes.

## Checkpoint 5: submissão

- [ ] Estado atual permite envio.
- [ ] Etapas obrigatórias estão completas.
- [ ] Não há pendência impeditiva.
- [ ] Usuário possui perfil permitido.
- [ ] Status muda para `EM_VERIFICACAO`.
- [ ] Histórico e atividade são criados.
- [ ] Responsável é notificado quando aplicável.
- [ ] Operação é transacional.

## Checkpoint 6: devolução e reprovação

- [ ] Justificativa é obrigatória e validada.
- [ ] Perfil e estado de origem são validados.
- [ ] Histórico registra justificativa com segurança.
- [ ] Solicitante recebe notificação.
- [ ] Dados anteriores são preservados.
- [ ] Operação gera auditoria.

## Checkpoint 7: aprovação, documento e encerramento

- [ ] Verificação está concluída.
- [ ] Perfil de aprovação está correto.
- [ ] Pendências impeditivas foram verificadas.
- [ ] Documento usa snapshot aprovado.
- [ ] Registro encerrado fica protegido contra edição.
- [ ] Aprovação e encerramento são auditados.
- [ ] Alterações posteriores exigem nova versão.
- [ ] Download continua autorizado por recurso.

## Checkpoint 8: testes por transição

- [ ] Caminho válido.
- [ ] Estado de origem incorreto.
- [ ] Perfil incorreto.
- [ ] Dados obrigatórios ausentes.
- [ ] Justificativa ausente.
- [ ] Registro inexistente.
- [ ] Registro encerrado ou cancelado.
- [ ] Atualização concorrente.
- [ ] Auditoria correta.
- [ ] Notificação correta quando aplicável.

## Condições de bloqueio

- Status alterado por setter ou `PATCH` genérico.
- Transição sem validação de perfil e estado.
- Operação relevante sem auditoria.
- Progresso aceito do cliente.
- Workflow sem testes de caminhos inválidos.

## Saída obrigatória

```markdown
## Regra de workflow
- Estado de origem: ...
- Ação: ...
- Estado de destino: ...
- Perfis autorizados: ...
- Pré-condições: ...
- Auditoria e notificações: ...
- Testes válidos e inválidos: ...
- Resultado: aprovado, pendente ou bloqueado
```

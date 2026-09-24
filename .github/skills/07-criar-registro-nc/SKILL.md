# Skill: Assistente de Criação e Gestão de Não Conformidades (NC)

## Objetivo

Auxiliar o usuário na criação, revisão, complementação, rastreabilidade e conclusão de registros de Não Conformidade (NC), conduzindo o preenchimento de forma estruturada, garantindo persistência dos dados, histórico completo e trilha de auditoria.

---

# Princípios Gerais

- O preenchimento deve ser guiado passo a passo.
- O usuário pode interromper e retomar o processo a qualquer momento.
- O sistema deve preservar o progresso já informado.
- Nenhuma informação previamente registrada deve ser perdida sem ação explícita autorizada.
- O sistema deve manter histórico completo das NCs criadas pela conta do usuário.
- Toda alteração relevante deve ser auditável.
- Todas as datas devem ser armazenadas em UTC.

---

# Persistência e Escopo

## Isolamento por conta

Todos os registros devem ser associados à conta autenticada do usuário.

Cada registro deve possuir:

- id
- ownerId
- createdBy
- createdAt
- updatedAt

O sistema nunca deve exibir registros de outras contas sem autorização explícita do backend.

---

## Continuidade de sessão

Ao iniciar uma nova interação, a skill deve verificar se existem NCs em andamento associadas ao usuário.

Caso existam:

- apresentar a lista resumida;
- permitir retomada de uma NC existente;
- permitir criação de uma nova NC.

---

# Fluxo de Criação da NC

## Etapa 1 – Identificação

Coletar:

- Título da NC
- Descrição resumida
- Data da ocorrência
- Local da ocorrência
- Programa ou projeto
- Responsável

---

## Etapa 2 – Classificação

Identificar:

- Tipo da NC
- Severidade
- Impacto potencial
- Área afetada

Classificações possíveis:

- Produto
- Processo
- Documento
- Fornecedor
- Segurança
- Qualidade
- Outro

---

## Etapa 3 – Descrição Técnica

Coletar:

- Descrição detalhada
- Condição encontrada
- Condição esperada
- Evidências disponíveis
- Causa observada
- Observações adicionais

---

## Etapa 4 – Requisitos Aplicáveis

Registrar:

- Normas
- Procedimentos
- Especificações
- Requisitos contratuais
- Requisitos regulatórios

---

## Etapa 5 – Evidências

Permitir registro de:

- Fotografias
- Relatórios
- Documentos
- Registros de inspeção
- Testes
- Anexos diversos

Para cada evidência registrar:

- Identificador
- Descrição
- Data
- Autor
- Versão

---

## Etapa 6 – Revisão

A skill deve:

- verificar campos faltantes;
- verificar inconsistências;
- sugerir melhorias;
- sugerir textos técnicos;
- sugerir ações corretivas quando solicitado.

---

## Etapa 7 – Finalização

Ao concluir:

- gerar resumo consolidado;
- registrar data de conclusão;
- criar versão final do registro;
- armazenar histórico completo.

---

# Histórico Permanente da Conta

## Registro automático

Toda NC criada deve ser automaticamente registrada no histórico da conta proprietária.

O histórico deve:

- permanecer disponível após o encerramento da sessão;
- permanecer disponível após a conclusão da NC;
- manter vínculo permanente com ownerId;
- permitir consulta posterior pelo proprietário autorizado.

---

## Informações mínimas do histórico

Cada registro histórico deve conter:

- ID da NC
- Autor da criação
- Data de criação
- Data de atualização
- Data de conclusão
- Status atual
- Classificação
- Quantidade de evidências
- Quantidade de revisões
- Versão mais recente do anexo

---

## Consulta de histórico

O usuário pode consultar:

- NCs em andamento
- NCs concluídas
- NCs arquivadas

Filtros mínimos:

- ID
- Status
- Classificação
- Data de criação
- Data de atualização
- Data de conclusão

---

# Dashboard da Conta

A skill deve disponibilizar indicadores resumidos:

- Total de NCs criadas
- NCs abertas
- NCs em preenchimento
- NCs em revisão
- NCs concluídas
- NCs bloqueadas
- NCs vencidas
- Últimas NCs criadas
- Últimas NCs concluídas

---

# Auditoria e Rastreabilidade

## Objetivo

Garantir rastreabilidade completa de todas as alterações executadas sobre uma NC.

---

## Eventos obrigatórios

Os seguintes eventos devem ser registrados em auditHistory:

- CREATE_NC
- UPDATE_TITLE
- UPDATE_DESCRIPTION
- UPDATE_CLASSIFICATION
- UPDATE_REQUIREMENTS
- ADD_EVIDENCE
- REMOVE_EVIDENCE
- UPDATE_ATTACHMENT
- GENERATE_ATTACHMENT
- REVIEW_ACCEPTED
- REVIEW_REJECTED
- COMPLETE_NC
- REOPEN_NC

---

## Estrutura mínima de auditoria

```json
{
  "timestamp": "2026-09-23T18:22:00Z",
  "action": "CREATE_NC",
  "userId": "user123",
  "recordId": "NC-000001",
  "previousValue": null,
  "newValue": {
    "status": "OPEN"
  }
}
```

---

## Requisitos de auditoria

- Toda alteração relevante deve gerar evento.
- Eventos não podem ser alterados pelo frontend.
- Eventos não podem ser removidos pelo usuário comum.
- Toda alteração deve registrar responsável.
- Toda alteração deve registrar data e hora.
- A trilha de auditoria permanece disponível após conclusão.
- A trilha de auditoria permanece disponível após reabertura.

---

# Modelo Mínimo do Registro

```json
{
  "id": "",
  "ownerId": "",
  "createdBy": "",
  "createdAt": "",
  "updatedAt": "",
  "completedAt": "",
  "status": "",
  "currentStep": 0,
  "maxStep": 7,
  "classification": "",
  "title": "",
  "description": "",
  "requirements": [],
  "evidence": [],
  "attachments": [],
  "auditHistory": []
}
```

---

# Controle de Acesso

## Proprietário

Pode:

- criar NC;
- editar NC;
- concluir NC;
- consultar histórico;
- consultar auditoria.

---

## Revisor

Pode:

- revisar;
- comentar;
- aprovar;
- rejeitar.

---

## Administrador

Pode:

- consultar qualquer registro autorizado;
- consultar auditoria;
- gerar relatórios globais.

---

# Versionamento de Anexos

Cada geração de documento deve criar nova versão.

Campos mínimos:

- versionNumber
- createdAt
- createdBy
- description

Nenhuma versão anterior deve ser sobrescrita.

---

# Retenção

- NCs concluídas permanecem acessíveis.
- Evidências permanecem associadas ao registro.
- Anexos permanecem associados ao registro.
- Versões anteriores permanecem disponíveis.
- A exclusão física não deve ocorrer pelo fluxo operacional normal.
- Exclusões administrativas devem ser auditadas.

---

# Saída Obrigatória

Ao final de qualquer solicitação, a skill deve informar:

- ID da NC
- Status atual
- Etapa atual
- Percentual de preenchimento
- Histórico da conta relacionado
- Quantidade de eventos de auditoria
- Última atualização
- Próxima ação recomendada

Exemplo:

ID da NC: NC-2026-000123
Status: Em preenchimento
Etapa atual: 4 de 7
Preenchimento: 57%
Eventos de auditoria: 12
Última atualização: 2026-09-23T18:30:00Z
Próxima ação: Registrar evidências
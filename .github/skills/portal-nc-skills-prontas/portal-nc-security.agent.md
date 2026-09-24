---
name: portal-nc-security
description: Implementa e revisa autenticação, autorização, segredos, CORS, uploads, logs e proteção de dados do Portal NC.
---

# Portal NC Security

## Função

Aplique segurança no servidor com menor privilégio, defesa em profundidade, configuração segura e minimização de dados.

## Checkpoint 1: autenticação

- [ ] Endpoints protegidos exigem token válido.
- [ ] Emissor, audiência, assinatura e expiração são validados.
- [ ] Claims obrigatórios são validados.
- [ ] Tokens completos não são registrados.
- [ ] Swagger de desenvolvimento suporta autenticação.
- [ ] Casos sem token, expirado e inválido possuem testes.

## Checkpoint 2: usuário local de desenvolvimento

- [ ] Funciona somente em `Development`.
- [ ] Aplicação falha se ativado fora de Development.
- [ ] Configuração não contém credencial real.
- [ ] Perfis simulados são explícitos.
- [ ] Modo local está documentado.
- [ ] Não substitui silenciosamente autenticação real.
- [ ] Proteção de ambiente possui teste.

## Checkpoint 3: autorização

- [ ] Perfil é validado.
- [ ] Propriedade ou responsabilidade é validada.
- [ ] Estado do registro é validado.
- [ ] Usuário não escolhe sua identidade na requisição.
- [ ] Privilégio administrativo não é concedido por padrão.
- [ ] Downloads e histórico exigem autorização.
- [ ] Casos `403` possuem testes.
- [ ] Enumeração de recursos foi considerada.

## Checkpoint 4: segredos e configuração

- [ ] Não há token, senha ou chave privada no código.
- [ ] `.env` está ignorado.
- [ ] Somente `.env.example` sem valores reais é versionado.
- [ ] Connection strings vêm de configuração segura.
- [ ] Logs não exibem segredos.
- [ ] Configurações obrigatórias são validadas na inicialização.
- [ ] Histórico Git é considerado se um segredo foi removido.

## Checkpoint 5: CORS e HTTP

- [ ] Origens permitidas vêm de configuração.
- [ ] Não há origem curinga com credenciais.
- [ ] Métodos e headers são limitados.
- [ ] HTTPS é exigido fora de desenvolvimento.
- [ ] Stack trace não é exposto em produção.
- [ ] Rate limiting foi considerado.
- [ ] Headers de segurança aplicáveis foram avaliados.

## Checkpoint 6: anexos

- [ ] Tamanho, extensão e MIME type são validados.
- [ ] Assinatura do arquivo é verificada quando possível.
- [ ] Nome original não é chave física.
- [ ] Nome exibido é sanitizado.
- [ ] Path traversal é impedido.
- [ ] Download exige autorização.
- [ ] Arquivo não é público.
- [ ] Checksum é calculado.
- [ ] Antimalware está previsto.
- [ ] Conteúdo não aparece em logs.
- [ ] Falha de storage não deixa metadados órfãos.

## Checkpoint 7: validação de entrada

- [ ] Entradas possuem limites de tamanho.
- [ ] Parâmetros inesperados são tratados.
- [ ] Consultas são parametrizadas.
- [ ] SQL não concatena entrada do usuário.
- [ ] HTML e URLs externas são tratados com segurança.
- [ ] Upload malformado é rejeitado.
- [ ] Mass assignment foi impedido.
- [ ] Campos internos não são editáveis pelo cliente.

## Checkpoint 8: logs e auditoria

Nunca registrar tokens, senhas, segredos, chaves privadas, connection strings completas, conteúdo de anexos ou dados pessoais desnecessários.

- [ ] Logs possuem correlation ID.
- [ ] Falhas de autenticação não expõem conteúdo sensível.
- [ ] Ações críticas são auditadas.
- [ ] Auditoria não é alterável por usuário comum.
- [ ] Retenção está documentada.
- [ ] Dados pessoais foram minimizados.

## Checkpoint 9: dependências

- [ ] Nova dependência possui justificativa.
- [ ] Origem é confiável.
- [ ] Versão está controlada.
- [ ] Vulnerabilidades conhecidas foram verificadas.
- [ ] Permissões desnecessárias foram evitadas.
- [ ] Pacote abandonado foi evitado.
- [ ] Licença foi considerada conforme política organizacional.

## Checkpoint 10: revisão final

- [ ] Autenticação e autorização testadas.
- [ ] Entradas inválidas testadas.
- [ ] Upload malicioso simulado quando aplicável.
- [ ] Logs inspecionados.
- [ ] Segredos pesquisados no diff.
- [ ] Configuração de produção revisada.
- [ ] Riscos residuais documentados.

## Condições de bloqueio

- Segredo versionado.
- Endpoint sensível sem autorização.
- Download público.
- Autenticação local ativa fora de Development.
- Dados sensíveis em logs.
- Entrada externa usada diretamente em SQL ou caminho físico.

## Saída obrigatória

```markdown
## Revisão de segurança
- Autenticação: ...
- Autorização: ...
- Segredos e configuração: ...
- Entradas e arquivos: ...
- Logs e auditoria: ...
- Dependências: ...
- Riscos residuais: ...
- Resultado: aprovado, pendente ou bloqueado
```

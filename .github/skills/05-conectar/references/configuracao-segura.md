# Configuração segura — Skill 02

## Arquivos

### `.env.example`

Distribuído sem valores:

```dotenv
EXPERIMENTAL_LAB_API_URL=
EXPERIMENTAL_LAB_API_KEY=
EXPERIMENTAL_LAB_VERIFY_TLS=false
EXPERIMENTAL_LAB_REQUEST_TIMEOUT_SECONDS=60
```

### `.env`

Criado e editado manualmente pelo participante. Deve permanecer fora do Git.

## Regras

- Nunca peça que o participante cole valores no chat.
- Nunca leia valores em voz alta ou os inclua em respostas.
- Nunca abra o `.env` com ferramentas de leitura de arquivos.
- Nunca use `Get-Content`, `type` ou comando equivalente no `.env`.
- Valide apenas se existem e não estão vazios.
- Não imprima o dicionário de ambiente.
- Não registre headers de `requests`.
- Não envie URL remota ou API key ao navegador.
- Não use valores reais em exemplos, testes ou documentação.
- Use verificação TLS padrão de `requests`.
- Use `60` segundos como timeout padrão das chamadas ao Experimental Lab.
- Aceite override somente como inteiro decimal positivo.
- Rejeite valor vazio, não inteiro ou menor que 1 antes da rede.
- Não registre o valor nem faça retry automático após timeout.
- Não use `verify=False`, exceto no modo temporário explicitamente autorizado
  abaixo.
- Nunca desative avisos de certificado.
- Escute somente em `127.0.0.1`.

## Falha segura

Se uma variável estiver ausente, interrompa a operação antes da chamada e
informe apenas o nome da variável que precisa ser configurada.

`EXPERIMENTAL_LAB_REQUEST_TIMEOUT_SECONDS` é opcional. Quando ausente, use
`60`. Se estiver presente e inválida, informe apenas que a configuração de
timeout deve ser corrigida.

Esse timeout aplica-se somente ao cliente autenticado do ALB. Não substitui os
timeouts especializados da leitura local de arquivos ou do PUT no S3.

Se a autenticação falhar, informe que a configuração deve ser revisada, sem
mostrar tamanho, prefixo ou qualquer trecho da chave.

Se a URL não terminar em `/aws-bedrock`, interrompa antes da requisição e peça
ao participante para copiar novamente a URL oficial completa.

Se houver incompatibilidade entre o hostname e o certificado, a correção é usar
o hostname oficial. Acrescentar `/aws-bedrock` corrige apenas a rota e não
altera o hostname validado pelo certificado.

Se houver cadeia não confiável, aceite somente um bundle de CA distribuído por
um canal oficial da organização. Não baixe certificados sugeridos por mensagens
de erro e não contorne a falha desabilitando a validação TLS.

Se a mensagem não distinguir hostname, cadeia ou validade, não invente a causa:
informe uma falha TLS não classificada e solicite o endpoint oficial ou suporte
da equipe responsável.

## Verificação TLS temporária

Enquanto o ALB definitivo não estiver disponível, o instrutor pode autorizar:

```dotenv
EXPERIMENTAL_LAB_VERIFY_TLS=false
```

Regras obrigatórias:

- valor padrão `true` quando a variável estiver ausente;
- desativação manual, nunca automática após `SSLError`;
- valor aceito somente como `true` ou `false`;
- aviso permanente no terminal;
- API key temporária e revogada ou rotacionada após o evento;
- nenhum dado ou credencial de produção;
- valor alterado para `true` assim que o endpoint definitivo estiver disponível.

Esse modo permite a criptografia da conexão, mas não autentica a identidade do
servidor. Um intermediário capaz de interceptar a rede pode capturar a API key e
o conteúdo enviado.

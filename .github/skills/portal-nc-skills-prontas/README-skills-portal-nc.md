# Skills e agentes do Portal NC

Este pacote contém sete arquivos prontos para uso como instruções de agentes especializados do Portal NC.

## Arquivos

- `portal-nc-orchestrator.agent.md`
- `portal-nc-architecture.agent.md`
- `portal-nc-api.agent.md`
- `portal-nc-database.agent.md`
- `portal-nc-workflow.agent.md`
- `portal-nc-security.agent.md`
- `portal-nc-quality.agent.md`

## Instalação sugerida

Copie os sete arquivos para:

```text
.github/agents/
```

Estrutura final:

```text
.github/
└── agents/
    ├── portal-nc-orchestrator.agent.md
    ├── portal-nc-architecture.agent.md
    ├── portal-nc-api.agent.md
    ├── portal-nc-database.agent.md
    ├── portal-nc-workflow.agent.md
    ├── portal-nc-security.agent.md
    └── portal-nc-quality.agent.md
```

Se a configuração da organização utilizar Agent Skills em vez de custom agents, use o conteúdo de cada arquivo como `SKILL.md` em uma pasta própria:

```text
.github/skills/
├── portal-nc-orchestrator/SKILL.md
├── portal-nc-architecture/SKILL.md
├── portal-nc-api/SKILL.md
├── portal-nc-database/SKILL.md
├── portal-nc-workflow/SKILL.md
├── portal-nc-security/SKILL.md
└── portal-nc-quality/SKILL.md
```

## Uso recomendado

1. A issue é entregue ao `portal-nc-orchestrator`.
2. O coordenador lê os documentos em `docs/` e identifica especialidades.
3. As especialidades verificam arquitetura, API, banco, workflow e segurança.
4. `portal-nc-quality` executa a verificação final e monta a matriz de evidências.
5. O pull request permanece sujeito a revisão humana.

## Documentos complementares recomendados

```text
docs/
├── architecture.md
├── api-contracts.md
├── data-model.md
├── workflow.md
├── permissions.md
├── progress-rules.md
├── audit-events.md
├── local-development.md
└── definition-of-done.md
```

## Observação

O suporte e o formato exato de custom agents e Agent Skills podem variar conforme a versão e as políticas habilitadas do GitHub Copilot na organização. Os arquivos foram escritos para serem portáveis: o corpo Markdown pode ser mantido mesmo que seja necessário ajustar o frontmatter ou o diretório de instalação.

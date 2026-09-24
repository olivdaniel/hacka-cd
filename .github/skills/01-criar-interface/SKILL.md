---
name: reference-ui-recreator
description: >
  Analisa o arquivo  .png presente na pasta da skill recria uma interface web
  visualmente fiel, responsiva, acessível e organizada em componentes reutilizáveis.
  Use esta skill quando o usuário solicitar a implementação de uma página, dashboard,
  sistema interno ou componente baseado em uma imagem de referência.
---

# Reference UI Recreator

## Objetivo

Recriar interfaces web com alta fidelidade visual a partir de capturas de tela,
preservando:

- hierarquia visual;
- proporções;
- espaçamento;
- cores;
- tipografia;
- bordas;
- sombras;
- estados;
- densidade de informação;
- comportamento responsivo;
- acessibilidade.

A implementação deve ser funcional, manutenível e dividida em componentes.

## Stack padrão

Quando o usuário não especificar uma stack, utilizar:

- React;
- TypeScript;
- Vite;
- Tailwind CSS;
- Lucide React para ícones;
- CSS Grid e Flexbox;
- dados mockados em arquivos TypeScript;
- componentes funcionais;
- HTML semântico.

Não utilizar imagens para simular partes da interface que possam ser construídas
com HTML e CSS.

## Entrada esperada

A skill pode receber:

1. uma captura de tela;
2. uma descrição da interface;
3. uma captura de tela acompanhada de requisitos;
4. código existente a ser corrigido;
5. uma solicitação para criar apenas uma parte da interface.

## Processo obrigatório

### Etapa 1: analisar a referência

Antes de escrever código, identificar:

- dimensões e proporções aproximadas;
- regiões principais da tela;
- navegação global;
- navegação contextual;
- cabeçalho;
- cards;
- tabelas;
- formulários;
- botões;
- indicadores;
- ícones;
- tipografia;
- cores;
- bordas;
- sombras;
- estados selecionados;
- espaçamentos;
- elementos fixos;
- elementos roláveis.

Não inventar elementos que não sejam necessários.

### Etapa 2: criar um mapa da interface

Descrever brevemente a interface usando esta estrutura:

- Layout global
- Cabeçalho
- Navegação lateral
- Conteúdo principal
- Componentes
- Estados visuais
- Comportamento responsivo

### Etapa 3: definir tokens visuais

Criar tokens centralizados para:

- cores;
- tipografia;
- espaçamento;
- raios de borda;
- sombras;
- larguras da navegação;
- altura do cabeçalho;
- tamanhos de ícone.

Exemplo:

```ts
export const uiTokens = {
  colors: {
    navy: "#061F3D",
    sidebar: "#0B4394",
    primary: "#1155CC",
    primaryHover: "#0D47B5",
    pageBackground: "#F7F8FA",
    surface: "#FFFFFF",
    border: "#D9DCE3",
    text: "#16181D",
    textMuted: "#60657A",
    success: "#138A72",
    warning: "#B96B20",
  },
  layout: {
    topbarHeight: 58,
    railWidth: 58,
    sidebarWidth: 248,
  },
  radius: {
    small: 6,
    medium: 10,
    large: 14,
  },
};

## Modo de execução local

Quando o usuário solicitar uma aplicação local, implementar a solução para
funcionar integralmente no computador do usuário, sem dependência obrigatória
de serviços externos.

### Stack padrão

Utilizar:

- React;
- TypeScript;
- Vite;
- Tailwind CSS;
- Lucide React;
- IndexedDB por meio de Dexie;
- dados iniciais sintéticos;
- Vitest para testes;
- ESLint;
- Prettier.

Não exigir backend remoto, autenticação corporativa, banco de dados na nuvem ou
serviços externos para a execução básica.

### Execução

A aplicação deve iniciar com:

```bash
npm install
npm run dev
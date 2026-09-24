---
name: camera-photo-storage
description: >
  Integra captura de fotografias pela câmera do dispositivo, pré-visualização,
  armazenamento local persistente e gerenciamento de evidências em aplicações web.
  Use esta skill quando o usuário solicitar câmera, fotos, evidências visuais,
  anexos fotográficos ou armazenamento local de imagens.
---

# Camera Photo Storage

## Objetivo

Adicionar captura e gerenciamento de fotografias em uma aplicação web, preservando:

- permissão explícita do usuário;
- pré-visualização da câmera;
- captura por câmera traseira em dispositivos móveis quando disponível;
- armazenamento persistente das imagens;
- galeria de evidências;
- exclusão controlada;
- acessibilidade;
- comportamento responsivo;
- funcionamento local sem dependência obrigatória de backend ou serviços externos.

A implementação deve ser funcional, manutenível e integrada ao fluxo da aplicação.

## Stack padrão

Quando o usuário não especificar uma stack, utilizar:

- HTML semântico;
- JavaScript ou TypeScript;
- Media Capture and Streams API (`navigator.mediaDevices.getUserMedia`);
- IndexedDB para armazenamento local de imagens;
- CSS responsivo;
- SVG ou biblioteca de ícones já existente no projeto.

Não utilizar base64 em `localStorage` para imagens grandes. Não instalar dependências
quando a aplicação precisar funcionar em um ambiente sem npm.

## Entrada esperada

A skill pode receber:

1. uma aplicação web existente;
2. uma descrição de fluxo de captura;
3. uma solicitação para criar apenas o componente de câmera;
4. um requisito de anexar fotos a registros;
5. um código existente a ser corrigido.

## Processo obrigatório

### Etapa 1: analisar o fluxo existente

Antes de escrever código, identificar:

- onde o usuário inicia a captura;
- qual registro ou entidade recebe a fotografia;
- como a aplicação persiste dados atualmente;
- se há React, JavaScript puro ou outro framework;
- se existe backend para upload;
- estados de carregamento, erro e permissão já utilizados;
- comportamento esperado em desktop e mobile.

Não criar uma tela isolada quando já existir um fluxo de anexos ou evidências.

### Etapa 2: criar um mapa da experiência

Descrever brevemente:

- ponto de entrada da câmera;
- modal ou página de captura;
- área de pré-visualização;
- controles de iniciar, capturar e parar;
- galeria de fotos;
- ação de excluir;
- mensagens de permissão e erro;
- comportamento responsivo.

### Etapa 3: definir o modelo de armazenamento

Para armazenamento local, usar um banco IndexedDB com estrutura equivalente a:

```ts
type PhotoEvidence = {
  id?: number;
  recordId?: string;
  createdAt: string;
  mimeType: string;
  width: number;
  height: number;
  blob: Blob;
};
```

Requisitos:

- nome do banco e do object store centralizados;
- `Blob` ou `ArrayBuffer` para o conteúdo da imagem;
- data armazenada em ISO/UTC;
- vínculo opcional com o identificador do registro;
- consultas por registro quando houver essa entidade;
- revogação de `URL.createObjectURL` quando a imagem deixar de ser usada;
- tratamento de indisponibilidade ou erro do IndexedDB.

### Etapa 4: implementar a câmera

Usar uma solicitação equivalente a:

```ts
await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
  },
  audio: false,
});
```

Regras:

- pedir permissão somente após ação explícita do usuário;
- nunca ativar a câmera automaticamente ao carregar a página;
- manter a referência do `MediaStream`;
- parar todas as tracks ao fechar o modal, trocar de tela ou sair da página;
- desabilitar o botão de captura enquanto o vídeo não estiver pronto;
- usar `playsinline` em dispositivos móveis;
- usar `canvas.toBlob` para gerar JPEG ou outro formato compatível;
- apresentar erro claro para permissão negada, dispositivo ausente ou contexto inseguro.

### Etapa 5: criar os estados visuais

Implementar pelo menos:

- câmera desativada;
- solicitando permissão;
- câmera ativa;
- captura em andamento;
- foto armazenada;
- galeria vazia;
- armazenamento indisponível;
- erro de permissão;
- dispositivo sem câmera.

Os controles devem ter rótulos acessíveis e não depender somente de ícones.

### Etapa 6: validar

Executar, quando disponível:

```bash
npm run build
```

Para aplicações sem npm, executar:

```bash
python -m http.server 8000 --directory frontend
```

Verificar manualmente:

- abertura da câmera em `localhost`;
- captura de uma foto;
- persistência após recarregar a página;
- exclusão da foto;
- bloqueio e liberação da permissão;
- funcionamento em viewport móvel;
- comportamento quando o usuário recusa a permissão.

## Contexto seguro

`getUserMedia` normalmente exige contexto seguro. Para desenvolvimento local,
`http://localhost` e `http://127.0.0.1` são aceitos pelos navegadores modernos.
Em produção, usar HTTPS. Não orientar o usuário a liberar câmera para origens
arbitrárias sem necessidade.

## Segurança e privacidade

- informar ao usuário que as imagens serão armazenadas localmente quando esse for o caso;
- não enviar imagens para rede sem consentimento e requisito explícito;
- não armazenar dados de câmera no `localStorage`;
- parar o stream ao fechar o fluxo;
- evitar logs com conteúdo da imagem;
- validar tamanho e tipo do arquivo quando houver upload posterior;
- oferecer exclusão individual das evidências.

## Critérios de conclusão

A skill está concluída quando:

- o usuário consegue iniciar a câmera por uma ação explícita;
- o vídeo é exibido antes da captura;
- uma fotografia é criada e armazenada;
- a fotografia aparece na galeria;
- a fotografia permanece após recarregar a aplicação;
- a fotografia pode ser excluída;
- a câmera é desligada ao sair do fluxo;
- os estados de erro e permissão são tratados;
- a solução funciona sem npm quando esse for um requisito;
- não há erros de diagnóstico nos arquivos alterados.

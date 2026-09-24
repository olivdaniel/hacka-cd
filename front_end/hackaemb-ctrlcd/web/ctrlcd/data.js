/* ==========================================================================
   Ctrl + CD — dados fictícios do protótipo
   Portado de FRONT-END_HACKAEMB/src/ctrlcd/data/*.ts (Figma Make).

   IMPORTANTE
   - Todos os registros, PNs, Ecodes, ARs, Notas CD, nomes e valores abaixo são
     DADOS SINTÉTICOS para demonstração. Não representam aeronaves, peças,
     pessoas ou documentos reais.
   - Referências normativas que apareciam no protótipo (ex.: capítulos de
     manual e limites numéricos) foram removidas porque não havia fonte
     documental. Onde o valor depende de norma, usa-se "A DEFINIR".
   - A lista de tipos de não conformidade foi mantida exatamente como veio do
     protótipo; a fonte oficial dessa lista é A DEFINIR pela equipe.
   ========================================================================== */
(() => {
  "use strict";

  const NC_TYPES = [
    "Afundamento / Mossa / Amassamento / Ondulação / Vinco",
    "Ajuste excessivo",
    "Assimetria",
    "Atualização (up grade) de Equipamento",
    "Cablagem sem continuidade e/ou isolação / ligação invertida",
    "Canibalização",
    "Clad afetado",
    "Componente solto (FOE)",
    "Comprimento / Largura / Altura (Dimensional)",
    "Falta torque ou torque solto",
    "Componentes danificados",
    "Configuração não-conforme",
    "Curto circuito",
    "Degrau",
    "Delaminação",
    "Desalinhamento / Deslocamento / Posicionamento incorreto",
    "Descascamento (Pintura)",
    "Descolamento",
    "Diâmetro incorreto",
    "Empenamento",
    "Entradas de ferramenta (usinagem)",
    "Escareado indevido",
    "Esmagamento de Colméia",
    "Falta de componentes no kit de instalação",
    "Falta de documentação",
    "Falta de metalização",
    "Fio com crimpagem errada solto ou rompido",
    "Folga",
    "Freno incorreto",
    "Furo com marcas na parede interna (Instalação de bucha)",
    "Furo inclinado",
    "Furo indevido",
    "Furo Ovalizado/Com Diametro Incorreto",
    "Furos – Desalinhamento/Deslocamento/Posicionamento incorreto (Foco: Usinagem)",
    "Guia do conector rotacionado",
    "Impossibilidade de Montagem",
    "Infiltração Química",
    "Insertos deslocados",
    "Inspeção de Recebimento Informação Divergente (Documentação e Sistema)",
    "Inspeções não-destrutivas (Imperfeições internas: Vazios, pontes em raios, corpo estranho, etc.)",
    "Interferência (Atrito)",
    "Linha de Sistema",
    "Marca de ferramenta",
    "Material Quebrado/Danificado (antes da montagem no ambiente produtivo)",
    "Metalização Faltando/Incorreta (fabricação)",
    "Metalização Incorreta (valores fora do especificado)",
    "Pino de conector baixo / danificado / faltando / sem sealing plug / sem travamento",
    "Porca travada",
    "Porosidade",
    "Prendedores em desacordo com projeto / cravação incorreta",
    "Printer Fault / Printer Faulted / Printer Inoperative",
    "Recebimento: itens amassados e danificados",
    "Redução de espessura (Foco: Usinagem)",
    "Risco",
    "Rompimento de Camadas (Trincas)",
    "Rugas nas camadas",
    "Ruído",
    "Sistema Operando fora do Especificado (Mensagem de Falha)",
    "SN Duplicado Recebido",
    "Tempo de Vida / Aferição / Inspeção Periódica / Validade Vencida",
    "Tratamento Térmico/Superficial Faltando",
    "Trinca",
    "Vazamento",
    "Vincos",
    "Cablagem - Trançada",
    "Cablagem - Terminal Incorreto",
    "Cablagem - Ligação invertida",
    "Ramificação Incorreta",
    "Identificação Incorreta",
    "Corpo estranho",
    "Cura",
    "Resina Insuficiente/Faltando",
    "Ruptura de Tela",
    "Espessura",
    "Afundamento / Mossa / Amassamento / Ondulação / Vinco (Foco: Composto)",
    "Tempo de Exposição",
    "Vazios",
    "Núcleo Esmagado / Descolado",
    "Extração/Desmoldagem (Foco Composto)",
    "Pontes em Chanfros e Raios",
    "Fibras Danificadas/Desalinhadas",
    "Defeito na colagem do inserto / terital / posicionamento",
    "Peso",
    "Profundidade",
    "Forma (Má Conformação, Dobra/Rasgo / Ângulo / Chanfro / Raio)",
    "Trinca na Camada de Cromo",
  ];

  const RECORDS = [
    { id: "NC-2026-0012", cdNumber: null, arNumber: null, type: "Nota CD", ncType: "Vazamento", subject: "Vazamento na interface do conjunto de conexão hidráulica", responsible: "Usuário demonstrativo", createdAt: "18/09/2026 09:14", updatedAt: "18/09/2026 14:32", status: "Com pendência", progress: 55, pendencies: 1, currentStep: 3 },
    { id: "NC-2026-0011", cdNumber: "CD-4521", arNumber: null, type: "Nota CD", ncType: "Trinca", subject: "Trinca na base estrutural do misturador", responsible: "Técnico demonstrativo A", createdAt: "17/09/2026 08:22", updatedAt: "17/09/2026 16:45", status: "Verificação concluída", progress: 85, pendencies: 0, currentStep: 4 },
    { id: "NC-2026-0010", cdNumber: "CD-4518", arNumber: "AR-1144", type: "AR", ncType: "Desalinhamento / Deslocamento / Posicionamento incorreto", subject: "Desalinhamento no eixo de rotação do rotor axial", responsible: "Técnico demonstrativo B", createdAt: "16/09/2026 10:05", updatedAt: "16/09/2026 17:20", status: "Com pendência", progress: 70, pendencies: 2, currentStep: 3 },
    { id: "NC-2026-0009", cdNumber: "CD-4515", arNumber: null, type: "Nota CD", ncType: "Componente solto (FOE)", subject: "Componente solto no compartimento de queima", responsible: "Técnico demonstrativo C", createdAt: "15/09/2026 07:30", updatedAt: "15/09/2026 14:10", status: "Anexo gerado", progress: 100, pendencies: 0, currentStep: 5 },
    { id: "NC-2026-0008", cdNumber: "CD-4510", arNumber: null, type: "Nota CD", ncType: "Risco", subject: "Risco na superfície externa do painel lateral", responsible: "Usuário demonstrativo", createdAt: "14/09/2026 11:15", updatedAt: "14/09/2026 15:45", status: "Anexo gerado", progress: 100, pendencies: 0, currentStep: 5 },
    { id: "NC-2026-0007", cdNumber: "CD-4505", arNumber: "AR-1138", type: "AR", ncType: "Falta torque ou torque solto", subject: "Torque solto no parafuso de fixação do suporte", responsible: "Técnico demonstrativo D", createdAt: "12/09/2026 09:00", updatedAt: "13/09/2026 11:30", status: "Verificação concluída", progress: 95, pendencies: 0, currentStep: 4 },
  ];

  const DEMO_RECORD_ID = "NC-2026-0012";

  /* Requisitos do tipo "Vazamento". Os valores pré-preenchidos são sintéticos.
     O critério da especificação ficou vazio: depende de documento normativo
     que não foi fornecido (A DEFINIR). */
  const VAZAMENTO_REQUIREMENTS = [
    { id: "req-01", label: "Critério permitido pela especificação", mandatory: true, allowNA: false, fieldType: "text", status: "not-started", value: "", photosCount: 0, hint: "Informe o critério e a referência documental aplicável (A DEFINIR)." },
    { id: "req-02", label: "Valor do vazamento medido", mandatory: true, allowNA: false, fieldType: "number", status: "met", value: "2,3", photosCount: 1, unit: "cm³/min" },
    { id: "req-03", label: "Tipo de teste executado", mandatory: true, allowNA: false, fieldType: "select", status: "met", value: "Teste de pressão", photosCount: 0, options: ["Teste de pressão", "Teste hidrostático", "Teste pneumático", "Teste a vácuo", "Inspeção visual"] },
    { id: "req-04", label: "Momento da detecção", mandatory: true, allowNA: false, fieldType: "select", status: "met", value: "Durante teste funcional", photosCount: 0, options: ["Durante montagem", "Após montagem", "Durante teste funcional", "Em operação", "Durante manutenção"] },
    { id: "req-05", label: "Condição estática ou dinâmica", mandatory: true, allowNA: false, fieldType: "select", status: "met", value: "Estática", photosCount: 0, options: ["Estática", "Dinâmica", "Ambas"] },
    { id: "req-06", label: "Tipo de fluido", mandatory: true, allowNA: false, fieldType: "select", status: "met", value: "Hidráulico", photosCount: 0, options: ["Hidráulico", "Combustível", "Óleo lubrificante", "Água", "Ar pressurizado"] },
    { id: "req-07", label: "Método de detecção", mandatory: true, allowNA: false, fieldType: "select", status: "met", value: "Inspeção visual", photosCount: 0, options: ["Inspeção visual", "Teste de pressão", "Agente revelador", "Sensor de vazamento"] },
    { id: "req-08", label: "Localização", mandatory: true, allowNA: false, fieldType: "text", status: "met", value: "Interface inferior do conjunto", photosCount: 1 },
    { id: "req-09", label: "Existência de danos na área", mandatory: true, allowNA: false, fieldType: "yesno", status: "met", value: "Não", photosCount: 0 },
    { id: "req-10", label: "Verificação das interfaces", mandatory: true, allowNA: false, fieldType: "yesno", status: "met", value: "Sim", photosCount: 0 },
    { id: "req-11", label: "Torque aplicado", mandatory: false, allowNA: true, fieldType: "number", status: "not-started", value: "", photosCount: 0, unit: "N·m" },
    { id: "req-12", label: "Realização de troca da peça", mandatory: true, allowNA: false, fieldType: "yesno", status: "not-started", value: "", photosCount: 0 },
  ];

  const TIMELINE_STEPS = [
    { id: "tl-1", title: "Tipo definido", description: "Tipo de NC selecionado e confirmado", status: "done", date: "18/09/2026 09:18", responsible: "Usuário demonstrativo", details: ["Tipo: Vazamento"] },
    { id: "tl-2", title: "Dados e requisitos", description: "PN validado. 10 de 12 requisitos atendidos", status: "done", date: "18/09/2026 10:45", responsible: "Usuário demonstrativo", details: ["PN: PN-ABC-123456", "Ecode: EC-48291", "10/12 requisitos atendidos"] },
    { id: "tl-3", title: "Evidências", description: "Foto de detalhamento com pendência", status: "pending", date: "18/09/2026 14:32", responsible: "Usuário demonstrativo", nextAction: "Substituir foto de detalhamento", details: ["1 de 2 fotos obrigatórias aceitas", "Foto de detalhamento: enquadramento insuficiente"] },
    { id: "tl-4", title: "Verificação", description: "Aguardando resolução das pendências", status: "blocked", details: [] },
    { id: "tl-5", title: "Anexo final", description: "Não iniciado", status: "waiting", details: [] },
  ];

  const ACTIVITY_EVENTS = [
    { id: "ae-1", date: "18/09/2026", time: "14:32", user: "Sistema", action: "Fotografia avaliada com pendência", category: "evidencias", summary: "Foto de detalhamento: enquadramento insuficiente. Ação necessária." },
    { id: "ae-2", date: "18/09/2026", time: "14:28", user: "Usuário demonstrativo", action: "Foto de detalhamento adicionada", category: "evidencias", summary: "Arquivo IMG_0042.jpg enviado como foto de não conformidade." },
    { id: "ae-3", date: "18/09/2026", time: "14:10", user: "Usuário demonstrativo", action: "Foto de localização aprovada", category: "evidencias", summary: "Foto de contextualização aprovada em todos os critérios." },
    { id: "ae-4", date: "18/09/2026", time: "10:45", user: "Usuário demonstrativo", action: "Dados da ocorrência preenchidos", category: "dados", summary: "10 requisitos obrigatórios atendidos. 2 aguardando." },
    { id: "ae-5", date: "18/09/2026", time: "09:52", user: "Sistema", action: "PN validado", category: "dados", summary: "PN-ABC-123456 localizado. Ecode: EC-48291. Descrição: Conjunto de conexão hidráulica." },
    { id: "ae-6", date: "18/09/2026", time: "09:22", user: "Usuário demonstrativo", action: "Tipo de NC selecionado", category: "tipo", summary: "Tipo selecionado: Vazamento." },
    { id: "ae-7", date: "18/09/2026", time: "09:14", user: "Usuário demonstrativo", action: "Registro criado", category: "tipo", summary: "ID interno gerado: NC-2026-0012. Status inicial: Em rascunho." },
  ];

  /* Resultado fictício das consultas simuladas de PN e AR. */
  const MOCK_LOOKUP = {
    pn: { ecode: "EC-48291", description: "Conjunto de conexão hidráulica" },
    ar: { pn: "PN-ABC-123456", ecode: "EC-48291", description: "Conjunto de conexão hidráulica", aircraft: "Modelo demonstrativo · MSN 0000" },
  };

  const FORM_STEPS = [
    { id: 1, title: "Tipo de não conformidade", shortTitle: "Tipo de NC" },
    { id: 2, title: "Dados e requisitos técnicos", shortTitle: "Dados" },
    { id: 3, title: "Evidências fotográficas", shortTitle: "Evidências" },
    { id: 4, title: "Verificação e compilado", shortTitle: "Verificação" },
    { id: 5, title: "Anexo final", shortTitle: "Anexo" },
  ];

  const CONTEXT_TIPS = {
    1: "Selecione o tipo que melhor representa a condição encontrada na lista normativa.",
    2: "Preencha os campos obrigatórios. O PN é validado por uma consulta simulada.",
    3: "Adicione pelo menos uma foto de contextualização e uma foto da não conformidade.",
    4: "Revise o compilado preliminar antes de solicitar a revisão inteligente.",
    5: "Certifique-se de que todas as pendências foram resolvidas antes de gerar o anexo.",
  };

  window.CtrlCDData = Object.freeze({
    NC_TYPES,
    RECORDS,
    DEMO_RECORD_ID,
    VAZAMENTO_REQUIREMENTS,
    TIMELINE_STEPS,
    ACTIVITY_EVENTS,
    MOCK_LOOKUP,
    FORM_STEPS,
    CONTEXT_TIPS,
  });
})();

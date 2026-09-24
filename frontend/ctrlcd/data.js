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

  const ANEXO_6_2_ROWS = [
  {
    "type": "Afundamento / Mossa / Amassamento / Ondulação / Vinco",
    "normalizedType": "afundamento / mossa / amassamento / ondulacao / vinco",
    "requirements": [
      {
        "id": "afundamento-mossa-amassamento-ondulacao-vinco-distancia-em-relacao-aos-prendedores-adjacentes",
        "description": "Distância em relação aos prendedores adjacentes"
      },
      {
        "id": "afundamento-mossa-amassamento-ondulacao-vinco-distancias-de-referencias-ao-local-afetado-somente-para-area-de-usinagem-estamparia-e-trat-superficial",
        "description": "Distâncias de referências ao local afetado (Somente para área de Usinagem. Estamparia e Trat. Superficial)"
      },
      {
        "id": "afundamento-mossa-amassamento-ondulacao-vinco-espessura-da-regiao-afetada",
        "description": "Espessura da região afetada"
      },
      {
        "id": "afundamento-mossa-amassamento-ondulacao-vinco-valor-de-h-x-l-encontrado",
        "description": "Valor de (H x L) encontrado"
      }
    ],
    "engineeringStandards": [
      "NE07-038",
      "NE03-071",
      "NE03-063",
      "NE03-007"
    ],
    "sourceRow": "1"
  },
  {
    "type": "Ajuste excessivo",
    "normalizedType": "ajuste excessivo",
    "requirements": [
      {
        "id": "ajuste-excessivo-dimensao-do-dano-largura-de-material-removido-e-comprimento-da-area-afetada",
        "description": "Dimensão do dano: Largura de material removido e Comprimento da área afetada"
      },
      {
        "id": "ajuste-excessivo-distancia-de-borda-caso-a-regiao-obter-furos",
        "description": "Distância de borda, caso a região obter furos"
      },
      {
        "id": "ajuste-excessivo-diametro-do-furo-quando-aplicavel",
        "description": "Diâmetro do furo (Quando aplicável)"
      },
      {
        "id": "ajuste-excessivo-reportar-se-havera-problemas-nas-proximas-montagem-informacao-opcional-socilitar-apoio-do-processo-local",
        "description": "Reportar se haverá problemas nas próximas montagem (Informação opcional) - Socilitar apoio do processo local."
      }
    ],
    "engineeringStandards": [
      "NE 20-038 (Item 9.10)"
    ],
    "sourceRow": "2"
  },
  {
    "type": "Assimetria",
    "normalizedType": "assimetria",
    "requirements": [
      {
        "id": "assimetria-informar-o-valor-atual-com-os-dados-da-planilha",
        "description": "Informar o valor atual com os dados da planilha."
      }
    ],
    "engineeringStandards": [
      "NE02-046",
      "NE02-044"
    ],
    "sourceRow": "3"
  },
  {
    "type": "Atualização (up grade) de Equipamento",
    "normalizedType": "atualizacao (up grade) de equipamento",
    "requirements": [
      {
        "id": "atualizacao-up-grade-de-equipamento-incluir-numero-da-ordem-de-engenharia-oe-e-responsavel-pela-evolucao-up-grade-do-equipamento-produto",
        "description": "Incluir número da Ordem de Engenharia (OE) e responsável pela evolução (up-grade) do equipamento/produto"
      },
      {
        "id": "atualizacao-up-grade-de-equipamento-informar-pn-e-sn-contidos-na-op-ou-om-sendo-pago",
        "description": "Informar PN e SN contidos na OP ou OM sendo pago"
      },
      {
        "id": "atualizacao-up-grade-de-equipamento-informar-tsn-e-csn-da-peca-removida-se-aplicado",
        "description": "Informar TSN e CSN da peça removida (se aplicado)"
      },
      {
        "id": "atualizacao-up-grade-de-equipamento-informar-para-qual-o-pn-sera-atualizado",
        "description": "Informar para qual o PN será atualizado."
      },
      {
        "id": "atualizacao-up-grade-de-equipamento-informar-o-solicitante-ex-embraer-ou-fornecedor",
        "description": "Informar o solicitante (Ex: EMBRAER ou fornecedor)."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "4"
  },
  {
    "type": "Cablagem sem continuidade e/ou isolacao / ligação invertida",
    "normalizedType": "cablagem sem continuidade e / ou isolacao / ligacao invertida",
    "requirements": [
      {
        "id": "cablagem-sem-continuidade-e-ou-isolacao-ligacao-invertida-informar-sigla-do-conector-ou-do-componente-afetado",
        "description": "Informar sigla do conector ou do componente afetado."
      },
      {
        "id": "cablagem-sem-continuidade-e-ou-isolacao-ligacao-invertida-incluir-foto-do-contato-prensagem-3-informar-pino-ou-n-do-fio",
        "description": "Incluir Foto do contato/ Prensagem 3) Informar pino ou n° do fio."
      },
      {
        "id": "cablagem-sem-continuidade-e-ou-isolacao-ligacao-invertida-verificar-ponto-a-ponto-ex-conector-p1000-pino-10-ex-conector-p1000-fio-w202-02248-22",
        "description": "Verificar Ponto a Ponto Ex.: Conector P1000, Pino 10 Ex.: Conector P1000, Fio W202-02248-22"
      }
    ],
    "engineeringStandards": [
      "NE07-038",
      "NE03-071",
      "NE03-063",
      "NE03-007"
    ],
    "sourceRow": "5"
  },
  {
    "type": "Canibalização",
    "normalizedType": "canibalizacao",
    "requirements": [
      {
        "id": "canibalizacao-incluir-foto-do-contato-prensagem-3-informar-pino-ou-n-do-fio",
        "description": "Incluir Foto do contato/ Prensagem 3) Informar pino ou n° do fio."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "6"
  },
  {
    "type": "Clad afetado",
    "normalizedType": "clad afetado",
    "requirements": [
      {
        "id": "clad-afetado-verificar-ponto-a-ponto",
        "description": "Verificar Ponto a Ponto"
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "7"
  },
  {
    "type": "Componente solto (FOE)",
    "normalizedType": "componente solto (foe)",
    "requirements": [],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "8"
  },
  {
    "type": "Comprimento / Largura / Altura (Dimensional)",
    "normalizedType": "comprimento / largura / altura (dimensional)",
    "requirements": [
      {
        "id": "comprimento-largura-altura-dimensional-informar-medida-da-cablagem-ou-da-ramificacao-com-comprimento-incorreto",
        "description": "Informar medida da cablagem ou da ramificação com comprimento incorreto.*"
      },
      {
        "id": "comprimento-largura-altura-dimensional-informar-medida-de-projeto-da-cablagem-avaliar-di-de-instalacao-x-dmu-de-fabricacao-especifico-para-fabricacao-da-cablagem",
        "description": "Informar medida de projeto da cablagem. (Avaliar DI de Instalação X DMU de fabricação)* *especifico para Fabricação da Cablagem"
      }
    ],
    "engineeringStandards": [
      "Doc.Emb 3829",
      "NE80-076"
    ],
    "sourceRow": "9"
  },
  {
    "type": "Falta torque ou torque solto",
    "normalizedType": "falta torque ou torque solto",
    "requirements": [
      {
        "id": "falta-torque-ou-torque-solto-informar-sigla-do-conector",
        "description": "Informar sigla do conector."
      },
      {
        "id": "falta-torque-ou-torque-solto-informar-detalhes-da-etapa-e-local-onde-foi-encontrado-a-falta-de-torque-conector-exemplo-recebimento-producao-equipagem-entrega-etc",
        "description": "Informar detalhes da etapa e local onde foi encontrado a falta de torque conector (Exemplo: recebimento, produção, equipagem, entrega, etc.)"
      },
      {
        "id": "falta-torque-ou-torque-solto-evidenciar-com-foto-o-posicionador-do-torque-desalinhado",
        "description": "Evidenciar com foto o posicionador do torque desalinhado"
      }
    ],
    "engineeringStandards": [
      "Doc.Emb 3824"
    ],
    "sourceRow": "10"
  },
  {
    "type": "Componentes danificados",
    "normalizedType": "componentes danificados",
    "requirements": [
      {
        "id": "componentes-danificados-informar-detalhes-da-etapa-e-local-onde-foi-encontrado-o-dano-do-conector-exemplo-recebimento-producao-equipagem-entrega-etc",
        "description": "Informar detalhes da etapa e local onde foi encontrado o dano do conector (Exemplo: recebimento, produção, equipagem, entrega, etc.)"
      },
      {
        "id": "componentes-danificados-informar-sigla-eletrica-do-conector",
        "description": "Informar sigla elétrica do conector;*"
      },
      {
        "id": "componentes-danificados-informar-a-data-de-manufatura-ou-o-lote-caso-o-sn-nao-seja-aplicavel-ao-pn",
        "description": "Informar a data de manufatura ou o lote, caso o SN não seja aplicável ao PN"
      },
      {
        "id": "componentes-danificados-identificar-se-conector-ja-foi-montado-previamente-ou-nao-antes-da-deteccao-da-falha",
        "description": "Identificar se conector já foi montado previamente ou não antes da detecção da falha"
      },
      {
        "id": "componentes-danificados-anexar-fotos-dos-pinos-ou-cavidades-do-conector-danificado-indicando-a-regiao-afetada",
        "description": "Anexar fotos dos pinos ou cavidades do conector danificado, indicando a região afetada"
      },
      {
        "id": "componentes-danificados-evidenciar-atraves-de-fotos-que-nao-existe-marca-de-instalacao-no-conector-especifico-para-fabricacao-da-cablagem",
        "description": "Evidenciar através de fotos que não existe marca de instalação no conector. *especifico para Fabricação da Cablagem"
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "11"
  },
  {
    "type": "Configuração não-conforme",
    "normalizedType": "configuracao nao - conforme",
    "requirements": [
      {
        "id": "configuracao-nao-conforme-informar-qual-a-configuracao-de-projeto-p-n-foto-do-material",
        "description": "Informar qual a configuração de projeto; (p/n, foto do material)"
      },
      {
        "id": "configuracao-nao-conforme-informar-qual-a-configuracao-atual-p-n-foto-do-material",
        "description": "Informar qual a configuração atual; (p/n , foto do material)"
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "12"
  },
  {
    "type": "Curto circuito",
    "normalizedType": "curto circuito",
    "requirements": [
      {
        "id": "curto-circuito-sigla-do-componente-e-lote-do-modulo-ou-cablagem-ex-conector-modulo-chave-rele-etc",
        "description": "Sigla do componente e LOTE do Modulo ou Cablagem (Ex:conector, modulo, chave, relê, etc)"
      },
      {
        "id": "curto-circuito-informar-se-o-fio-esta-danificado-esmagado-cortado-etc",
        "description": "Informar se o fio está danificado (esmagado, cortado, etc)"
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "13"
  },
  {
    "type": "Degrau",
    "normalizedType": "degrau",
    "requirements": [
      {
        "id": "degrau-especificacao-de-projeto",
        "description": "Especificação de Projeto"
      },
      {
        "id": "degrau-valor-do-degrau-encontrado",
        "description": "Valor do degrau encontrado"
      },
      {
        "id": "degrau-dimensionamento-da-regiao-discrepante-ex-comprimento-x-largura-etc",
        "description": "Dimensionamento da região discrepante (Ex: comprimento X Largura etc)"
      },
      {
        "id": "degrau-localizacao-do-defeito",
        "description": "Localização do defeito"
      },
      {
        "id": "degrau-espessura-adjacente",
        "description": "Espessura adjacente"
      },
      {
        "id": "degrau-caso-existir-furos-de-fixacao-reportar-o-diametro-dos-mesmos",
        "description": "Caso existir furos de fixação, reportar o diâmetro dos mesmos,"
      },
      {
        "id": "degrau-prendedor-de-projeto-e-passo-e-bordas-minimas",
        "description": "Prendedor de projeto e passo e bordas mínimas"
      },
      {
        "id": "degrau-informar-se-na-regiao-do-degrau-existe-proxima-montagem",
        "description": "Informar se na região do degrau existe próxima montagem"
      }
    ],
    "engineeringStandards": [
      "NE03-071",
      "NE 20-038 (Item 8.2)",
      "NE03-063",
      "NE03-007"
    ],
    "sourceRow": "14"
  },
  {
    "type": "Delaminação",
    "normalizedType": "delaminacao",
    "requirements": [
      {
        "id": "delaminacao-dimensionar-o-local-delaminado-comprimento-x-largura",
        "description": "Dimensionar o local delaminado (comprimento x largura)"
      },
      {
        "id": "delaminacao-relatar-o-motivo-da-delaminacao",
        "description": "Relatar o motivo da delaminação"
      },
      {
        "id": "delaminacao-espessura-do-local",
        "description": "Espessura do local"
      },
      {
        "id": "delaminacao-informar-prendedores-passo-e-borda-caso-necessario",
        "description": "Informar prendedores, passo e borda caso necessário"
      },
      {
        "id": "delaminacao-numero-de-camadas-afetadas-nota-se-usado-ensaios-ndt-deve-ser-informado-a-profundidade-do-dano",
        "description": "Número de camadas afetadas (Nota: Se usado ensaios NDT deve ser informado a profundidade do dano)*"
      },
      {
        "id": "delaminacao-localizacao-da-delaminacao-interno-ou-externo-na-peca",
        "description": "Localização da delaminação (Interno ou Externo na peça)*"
      },
      {
        "id": "delaminacao-mapeamento-proxima-montagem-aplicavel-no-ambiente-de-fabricacao-material-composto",
        "description": "Mapeamento próxima montagem* * Aplicavel No ambiente de fabricação: Material Composto"
      }
    ],
    "engineeringStandards": [
      "NE 20-038",
      "NE 07-11",
      "NE 20-032 (Composto)"
    ],
    "sourceRow": "15"
  },
  {
    "type": "Desalinhamento / Deslocamento / Posicionamento incorreto",
    "normalizedType": "desalinhamento / deslocamento / posicionamento incorreto",
    "requirements": [
      {
        "id": "desalinhamento-deslocamento-posicionamento-incorreto-especificar-qual-o-desalinhamento-encontrado-entre-quais-pecas-informando-o-pn",
        "description": "Especificar qual o desalinhamento encontrado (entre quais peças, informando o PN)"
      },
      {
        "id": "desalinhamento-deslocamento-posicionamento-incorreto-incluir-foto-indicando-o-desalinhamento-com-o-dimensional-encontrado-comparando-com-a-especificacao",
        "description": "Incluir foto indicando o desalinhamento, com o dimensional encontrado, comparando com a especificação"
      },
      {
        "id": "desalinhamento-deslocamento-posicionamento-incorreto-em-caso-de-furo-valor-do-deslocamento",
        "description": "Em caso de furo, valor do deslocamento"
      },
      {
        "id": "desalinhamento-deslocamento-posicionamento-incorreto-distancia-de-borda-se-aplicavel",
        "description": "Distância de borda (se aplicável)"
      },
      {
        "id": "desalinhamento-deslocamento-posicionamento-incorreto-diametro-do-furo-se-aplicavel",
        "description": "Diâmetro do furo (se aplicável)"
      },
      {
        "id": "desalinhamento-deslocamento-posicionamento-incorreto-reportar-se-havera-problemas-nas-proximas-montagens-opcional-socilitar-apoio-a-eng-manufatura-local",
        "description": "Reportar se haverá problemas nas próximas montagens (opcional) - Socilitar apoio a Eng. Manufatura local."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "16"
  },
  {
    "type": "Descascamento (Pintura)",
    "normalizedType": "descascamento (pintura)",
    "requirements": [
      {
        "id": "descascamento-pintura-dimensionar-o-local-com-pintura-descascada-comprimento-x-largura",
        "description": "Dimensionar o local com pintura descascada (comprimento x largura)"
      }
    ],
    "engineeringStandards": [
      "Doc.EMB 1755 (Tabela 5)"
    ],
    "sourceRow": "17"
  },
  {
    "type": "Descolamento",
    "normalizedType": "descolamento",
    "requirements": [
      {
        "id": "descolamento-dimensao-do-dano-largura-x-comprimento",
        "description": "Dimensão do dano: Largura x Comprimento"
      },
      {
        "id": "descolamento-onde-ocorreu-o-descolamento-ex-colmeia-colmeia-colmeia-laminado-entre-outros",
        "description": "Onde ocorreu o descolamento (Ex.: Colméia/Colméia; Colméia/Laminado; entre outros)"
      },
      {
        "id": "descolamento-informar-o-metodo-utilizado-na-deteccao-ex-visual-ultra-som-e-tap-test",
        "description": "Informar o método utilizado na detecção (Ex.: visual, ultra-som e tap test)."
      },
      {
        "id": "descolamento-informar-posicao-de-projeto-e-valor-do-deslocamento-desalimhamento-tal-como-o-sentido-do-deslocamento",
        "description": "Informar posição de projeto e valor do deslocamento/desalimhamento tal como o sentido do deslocamento"
      },
      {
        "id": "descolamento-para-casos-de-posicao-e-preciso-avaliar-a-proxima-montagem-pois-este-deslocamento-pode-gerar-atrito-ou-gap-acima-do-especificado",
        "description": "Para casos de posição é preciso avaliar a proxima montagem pois este deslocamento pode gerar atrito ou GAP acima do especificado"
      },
      {
        "id": "descolamento-para-estes-casos-e-necessario-avaliar-possiveis-impactos-na-proxima-montagem-ex-borda-afeta-furacao-ou-instalacao-de-outro-produto",
        "description": "Para estes casos é necessário avaliar possíveis impactos na próxima montagem Ex: borda, afeta furação ou instalação de outro produto"
      },
      {
        "id": "descolamento-borda-informar-borda-de-projeto-e-valor-encontrado-verificar-proxima-montagem-caso-seja-identificada-furacao-reportar-diametro-do-furos-quantidade-de-furos-afetados-e-prendedores-de-projeto",
        "description": "Borda informar borda de projeto e valor encontrado, verificar próxima montagem caso seja identificada furação reportar diâmetro do furos, quantidade de furos afetados e prendedores de projeto"
      }
    ],
    "engineeringStandards": [
      "NE 20-038 (Item 8.6)"
    ],
    "sourceRow": "18"
  },
  {
    "type": "Diâmetro incorreto",
    "normalizedType": "diametro incorreto",
    "requirements": [
      {
        "id": "diametro-incorreto-valor-do-furo-conforme-projeto",
        "description": "Valor do furo conforme projeto"
      },
      {
        "id": "diametro-incorreto-valor-do-furo-encontrado-realizar-medicao-em-03-pontos-e-no-comprimento-do-furo-indicando-ovalizacao-conicidade",
        "description": "Valor do furo encontrado (realizar medição em 03 pontos e no comprimento do furo, indicando ovalização / conicidade)"
      },
      {
        "id": "diametro-incorreto-distancia-de-passo-e-borda",
        "description": "Distância de passo e borda"
      },
      {
        "id": "diametro-incorreto-prendedor-de-projeto",
        "description": "Prendedor de projeto"
      },
      {
        "id": "diametro-incorreto-espessura-do-revestimento-quando-aplicavel",
        "description": "Espessura do revestimento (quando aplicável)"
      },
      {
        "id": "diametro-incorreto-avaliar-e-reportar-proxima-montagem-folga-ou-excesso-de-material-aplicavel-para-composto",
        "description": "Avaliar e reportar próxima montagem (folga ou excesso de material)*; * Aplicavél para composto"
      }
    ],
    "engineeringStandards": [
      "NE03-006",
      "NE03-071",
      "NE03-063",
      "NE03-007"
    ],
    "sourceRow": "19"
  },
  {
    "type": "Empenamento",
    "normalizedType": "empenamento",
    "requirements": [
      {
        "id": "empenamento-valor-do-gap-encontrado",
        "description": "Valor do gap encontrado"
      },
      {
        "id": "empenamento-dimensionamento-da-regiao-discrepante-comprimento",
        "description": "Dimensionamento da região discrepante (comprimento)"
      },
      {
        "id": "empenamento-reportar-os-desvios-a-cada-250mm-verificando-os-desvios-com-peso-e-sem-peso",
        "description": "Reportar os desvios a cada 250mm.; verificando os desvios com peso e sem peso."
      }
    ],
    "engineeringStandards": [
      "NE03-071",
      "NE03-063",
      "NE03-007"
    ],
    "sourceRow": "20"
  },
  {
    "type": "Entradas de ferramenta (usinagem)",
    "normalizedType": "entradas de ferramenta (usinagem)",
    "requirements": [
      {
        "id": "entradas-de-ferramenta-usinagem-dimensao-do-dano-comprimento-x-largura-x-profundidade",
        "description": "Dimensão do dano: Comprimento x Largura x Profundidade"
      },
      {
        "id": "entradas-de-ferramenta-usinagem-distancia-do-dano-em-relacao-ao-furo-mais-proximo-se-aplicavel",
        "description": "Distância do dano em relação ao furo mais próximo (se aplicável)"
      },
      {
        "id": "entradas-de-ferramenta-usinagem-distancia-de-passo-e-borda-se-aplicavel",
        "description": "Distância de passo e borda (se aplicável)"
      },
      {
        "id": "entradas-de-ferramenta-usinagem-reportar-se-havera-problemas-nas-proximas-montagens-opcional-socilitar-apoio-a-eng-manufatura-local",
        "description": "Reportar se haverá problemas nas próximas montagens (opcional) - Socilitar apoio a Eng. Manufatura local."
      }
    ],
    "engineeringStandards": [
      "NE 20-038 (Item 8.7)"
    ],
    "sourceRow": "21"
  },
  {
    "type": "Escareado indevido",
    "normalizedType": "escareado indevido",
    "requirements": [
      {
        "id": "escareado-indevido-do-escareado",
        "description": "Ø do Escareado"
      },
      {
        "id": "escareado-indevido-altura-do-corpo-cilindrico",
        "description": "Altura do corpo cilíndrico"
      },
      {
        "id": "escareado-indevido-produndidade-do-escareado",
        "description": "Produndidade do escareado"
      },
      {
        "id": "escareado-indevido-pn-do-prendedor-de-projeto-completo",
        "description": "PN do prendedor de projeto (completo)"
      },
      {
        "id": "escareado-indevido-distancia-de-passo-e-borda",
        "description": "Distância de passo e borda"
      },
      {
        "id": "escareado-indevido-espessura-do-local-em-caso-de-revestimento",
        "description": "Espessura do local (em caso de revestimento)."
      }
    ],
    "engineeringStandards": [
      "NE03-006",
      "NE03-071",
      "NE03-063",
      "NE03-007"
    ],
    "sourceRow": "22"
  },
  {
    "type": "Esmagamento de Colméia",
    "normalizedType": "esmagamento de colmeia",
    "requirements": [
      {
        "id": "esmagamento-de-colmeia-dimensoes-do-dano-comprimento-x-largura",
        "description": "Dimensões do dano (comprimento x largura)"
      },
      {
        "id": "esmagamento-de-colmeia-distancia-do-dano-em-relacao-a-borda-da-peca",
        "description": "Distância do dano em relação a borda da peça"
      },
      {
        "id": "esmagamento-de-colmeia-reportar-causa-do-dano-opcional",
        "description": "Reportar causa do dano (Opcional)"
      }
    ],
    "engineeringStandards": [
      "NE 20-038 (Item 8.10)"
    ],
    "sourceRow": "23"
  },
  {
    "type": "Falta de componentes no kit de instalação",
    "normalizedType": "falta de componentes no kit de instalacao",
    "requirements": [
      {
        "id": "falta-de-componentes-no-kit-de-instalacao-reportar-em-que-momento-a-falta-do-componente-foi-identificada",
        "description": "Reportar em que momento a falta do componente foi identificada"
      },
      {
        "id": "falta-de-componentes-no-kit-de-instalacao-recebimento-producao-verificar-embalagem-do-fornecedor-para-ver-se-componente-esta-no-seu-interior",
        "description": "Recebimento / Produção: Verificar embalagem do fornecedor para ver se componente está no seu interior"
      },
      {
        "id": "falta-de-componentes-no-kit-de-instalacao-producao-verificar-forma-de-pagamento-em-caixa-em-formato-de-kit-etc",
        "description": "Produção: Verificar forma de pagamento (em caixa; em formato de kit, etc)"
      },
      {
        "id": "falta-de-componentes-no-kit-de-instalacao-producao-verificar-se-pi-no-recebimento-solicita-a-verificacao-do-kit",
        "description": "Produção: Verificar se PI no recebimento solicita a verificação do Kit."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "24"
  },
  {
    "type": "Falta de documentação",
    "normalizedType": "falta de documentacao",
    "requirements": [
      {
        "id": "falta-de-documentacao-informar-numero-da-invoice",
        "description": "Informar número da Invoice"
      },
      {
        "id": "falta-de-documentacao-informar-quantidade-de-caixas-pallets-se-referem-a-invoice",
        "description": "Informar quantidade de caixas/pallets se referem a Invoice"
      },
      {
        "id": "falta-de-documentacao-reportar-condicoes-da-caixa-embalagem-e-material-de-protecao-foto",
        "description": "Reportar condições da caixa, embalagem e material de proteção (foto)."
      },
      {
        "id": "falta-de-documentacao-informar-se-a-documentacao-faltante-foi-verificada-em-todas-as-caixas-recebidas-pela-mesma-invoice-exemplo-envio-parcial-de-caixas-da-mesma-invoice-para-o-estoque",
        "description": "Informar se a documentação faltante foi verificada em todas as caixas recebidas pela mesma Invoice. Exemplo: Envio parcial de caixas da mesma Invoice para o estoque."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "25"
  },
  {
    "type": "Falta de metalização",
    "normalizedType": "falta de metalizacao",
    "requirements": [
      {
        "id": "falta-de-metalizacao-reportar-o-valor-em-miliohms",
        "description": "Reportar o valor em miliohms"
      },
      {
        "id": "falta-de-metalizacao-reportar-se-a-metalizacao-foi-executada-corretamente",
        "description": "Reportar se a metalização foi executada corretamente"
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "26"
  },
  {
    "type": "Fio com crimpagem errada solto ou rompido",
    "normalizedType": "fio com crimpagem errada solto ou rompido",
    "requirements": [
      {
        "id": "fio-com-crimpagem-errada-solto-ou-rompido-reportar-excesso-de-canela",
        "description": "Reportar \"excesso de canela\""
      },
      {
        "id": "fio-com-crimpagem-errada-solto-ou-rompido-reportar-se-esta-crimpado-sobre-a-isolacao",
        "description": "Reportar se está crimpado sobre a isolação"
      },
      {
        "id": "fio-com-crimpagem-errada-solto-ou-rompido-informar-n-do-fio-conector-e-pino",
        "description": "Informar nº do fio, conector e pino"
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "27"
  },
  {
    "type": "Folga",
    "normalizedType": "folga",
    "requirements": [
      {
        "id": "folga-especificacao-de-projeto",
        "description": "Especificação de Projeto"
      },
      {
        "id": "folga-valor-do-gap-encontrado",
        "description": "Valor do gap encontrado"
      },
      {
        "id": "folga-dimensionamento-da-regiao-discrepante-comprimento",
        "description": "Dimensionamento da região discrepante (comprimento)"
      },
      {
        "id": "folga-localizacao-do-defeito",
        "description": "Localização do defeito"
      },
      {
        "id": "folga-incluir-foto-indicando-o-problema-com-as-dimensoes-discrepantes",
        "description": "Incluir foto indicando o problema, com as dimensões discrepantes"
      },
      {
        "id": "folga-caso-existir-furos-de-fixacao-reportar-o-diametro-dos-mesmos-o-prendedor-de-projeto-e-passo-e-borda-minima",
        "description": "Caso existir furos de fixação, reportar o diâmetro dos mesmos, o prendedor de projeto e passo e borda minima."
      }
    ],
    "engineeringStandards": [
      "NE02-044",
      "NE20-038 (Item 9.2)"
    ],
    "sourceRow": "28"
  },
  {
    "type": "Freno incorreto",
    "normalizedType": "freno incorreto",
    "requirements": [
      {
        "id": "freno-incorreto-informar-se-e-freno-ou-cabo-de-seguranca",
        "description": "Informar se é freno ou cabo de segurança"
      },
      {
        "id": "freno-incorreto-informar-o-sentido-do-freno",
        "description": "Informar o sentido do freno"
      },
      {
        "id": "freno-incorreto-informar-se-o-freno-ou-cabo-passou-pelos-furos-do-parafuso",
        "description": "Informar se o freno ou cabo passou pelos furos do parafuso"
      },
      {
        "id": "freno-incorreto-informar-se-o-freno-ou-cabo-esta-frouxo-tensionado",
        "description": "Informar se o freno ou cabo está frouxo / tensionado"
      },
      {
        "id": "freno-incorreto-inserir-fotos-do-freno-incorreto",
        "description": "Inserir fotos do freno incorreto."
      }
    ],
    "engineeringStandards": [
      "Doc.Emb 3824 (Cablagem)"
    ],
    "sourceRow": "29"
  },
  {
    "type": "Furo com marcas na parede interna (Instalação de bucha)",
    "normalizedType": "furo com marcas na parede interna (instalacao de bucha)",
    "requirements": [
      {
        "id": "furo-com-marcas-na-parede-interna-instalacao-de-bucha-valor-do-furo-conforme-projeto",
        "description": "Valor do furo conforme projeto"
      },
      {
        "id": "furo-com-marcas-na-parede-interna-instalacao-de-bucha-diametro-do-furo-ovalizado-valores-minimo-e-maximo-encontrado-em-tres-direcoes-radiais-pecas-com-grandes-espessuras-medir-o-furo-em-tres-profundidades-a-profundidade-da-marca-utilizar-molde-oranwash",
        "description": "Diâmetro do furo ovalizado (valores minímo e máximo encontrado em tres direções radiais). Peças com grandes espessuras medir o furo em três profundidades (+) a profundidade da marca (utilizar molde ORANWASH)"
      },
      {
        "id": "furo-com-marcas-na-parede-interna-instalacao-de-bucha-informar-os-pn-s-afetado-e-a-espessura-de-cada-peca-conforme-gbi",
        "description": "Informar os PN’s afetado e a espessura de cada peça, conforme GBI"
      },
      {
        "id": "furo-com-marcas-na-parede-interna-instalacao-de-bucha-informar-extencao-do-pacote-total-medicao-com-paquimetro",
        "description": "Informar extenção do pacote total (Medição com paquímetro)"
      },
      {
        "id": "furo-com-marcas-na-parede-interna-instalacao-de-bucha-distancia-em-relacao-aos-prendedores-adjacentes",
        "description": "Distância em relação aos prendedores adjacentes"
      },
      {
        "id": "furo-com-marcas-na-parede-interna-instalacao-de-bucha-distancias-de-referencias-ao-local-afetado-raio-de-concordancia-ou-montagem-adjacente-que-possa-comprometer-a-instalacao-das-buchas",
        "description": "Distâncias de referências ao local afetado (raio de concordância ou montagem adjacente que possa comprometer a instalação das buchas)"
      },
      {
        "id": "furo-com-marcas-na-parede-interna-instalacao-de-bucha-distancia-de-passo-e-borda",
        "description": "Distância de passo e borda"
      },
      {
        "id": "furo-com-marcas-na-parede-interna-instalacao-de-bucha-prendedor-de-projeto",
        "description": "Prendedor de projeto"
      },
      {
        "id": "furo-com-marcas-na-parede-interna-instalacao-de-bucha-perpendicularidade-do-furo-em-graus",
        "description": "Perpendicularidade do furo (em graus)"
      },
      {
        "id": "furo-com-marcas-na-parede-interna-instalacao-de-bucha-caso-necessitar-fazer-observacao-para-medicao-da-espessura-das-pecas-por-ultra-som",
        "description": "Caso necessitar, fazer observação para medição da espessura das peças por ultra-som."
      }
    ],
    "engineeringStandards": [
      "NE03-006",
      "NE03-071",
      "NE03-063",
      "NE03-007"
    ],
    "sourceRow": "30"
  },
  {
    "type": "Furo inclinado",
    "normalizedType": "furo inclinado",
    "requirements": [
      {
        "id": "furo-inclinado-diametro-do-furo",
        "description": "Diâmetro do furo"
      },
      {
        "id": "furo-inclinado-distancia-de-passo-e-borda",
        "description": "Distância de passo e borda"
      },
      {
        "id": "furo-inclinado-espessura-do-local-em-caso-de-revest",
        "description": "Espessura do local (Em caso de revest.)"
      },
      {
        "id": "furo-inclinado-perpendicularidade-do-furo-graus",
        "description": "Perpendicularidade do furo (Graus)"
      }
    ],
    "engineeringStandards": [
      "NE03-006"
    ],
    "sourceRow": "31"
  },
  {
    "type": "Furo indevido",
    "normalizedType": "furo indevido",
    "requirements": [
      {
        "id": "furo-indevido-diametro-do-furo",
        "description": "Diâmetro do furo"
      },
      {
        "id": "furo-indevido-distancia-de-passo-em-relacao-ao-proximo-furo-de-projeto",
        "description": "Distância de passo em relação ao próximo furo de projeto"
      },
      {
        "id": "furo-indevido-distancia-de-borda-c40",
        "description": "Distância de borda; +C40"
      },
      {
        "id": "furo-indevido-reportar-se-havera-problemas-nas-proximas-montagens-informacao-opcional-socilitar-apoio-da-engenharia-de-manufatura-local",
        "description": "Reportar se haverá problemas nas próximas montagens (Informação opcional) - Socilitar apoio da Engenharia de Manufatura local."
      }
    ],
    "engineeringStandards": [
      "NE 20-038 (Item 8.5)"
    ],
    "sourceRow": "32"
  },
  {
    "type": "Furo Ovalizado/Com Diametro Incorreto",
    "normalizedType": "furo ovalizado / com diametro incorreto",
    "requirements": [
      {
        "id": "furo-ovalizado-com-diametro-incorreto-dametro-do-furo-conforme-projeto",
        "description": "Dâmetro do furo conforme projeto"
      },
      {
        "id": "furo-ovalizado-com-diametro-incorreto-diametro-do-furo-ovalizado-valores-minimo-e-maximo-encontrado-em-tres-direcoes-radiais-pecas-com-grandes-espessuras-medir-o-furo-em-tres-profundidades",
        "description": "Diâmetro do furo ovalizado (valores minímo e máximo encontrado em tres direções radiais). Peças com grandes espessuras medir o furo em três profundidades"
      },
      {
        "id": "furo-ovalizado-com-diametro-incorreto-pn-cod-embraer-do-prendedor-de-projeto",
        "description": "PN / Cód. Embraer do prendedor de projeto"
      },
      {
        "id": "furo-ovalizado-com-diametro-incorreto-distancia-de-passo-e-borda",
        "description": "Distância de passo e borda"
      },
      {
        "id": "furo-ovalizado-com-diametro-incorreto-espessura-do-revestimento-quando-aplicavel",
        "description": "Espessura do revestimento (quando aplicável)"
      },
      {
        "id": "furo-ovalizado-com-diametro-incorreto-reportar-se-havera-problemas-nas-proximas-montagens-opcional-socilitar-apoio-a-eng-manufatura-local",
        "description": "Reportar se haverá problemas nas próximas montagens (opcional) - Socilitar apoio a Eng. Manufatura local."
      }
    ],
    "engineeringStandards": [
      "NE03-006",
      "NE03-071",
      "NE03-063",
      "NE03-007"
    ],
    "sourceRow": "33"
  },
  {
    "type": "Furos »» Desalinhamento/Deslocamento/ Posicionamento incorreto (Foco:Usinagem)",
    "normalizedType": "furos / desalinhamento / deslocamento / posicionamento incorreto (foco: usinagem)",
    "requirements": [
      {
        "id": "furos-desalinhamento-deslocamento-posicionamento-incorreto-foco-usinagem-fase-de-fabricacao-que-foi-detectada-a-nao-conformidade",
        "description": "Fase de fabricação que foi detectada a não-conformidade"
      },
      {
        "id": "furos-desalinhamento-deslocamento-posicionamento-incorreto-foco-usinagem-reportar-desvios-atraves-de-relatorios-de-inspecao-socilitar-apoio-da-area-inspecao-tridimensional",
        "description": "Reportar desvios através de relatórios de Inspeção - Socilitar apoio da área Inspeção Tridimensional"
      },
      {
        "id": "furos-desalinhamento-deslocamento-posicionamento-incorreto-foco-usinagem-reportar-desvios-atraves-dos-valores-encontrados-x-valores-de-projeto",
        "description": "Reportar desvios através dos valores encontrados X valores de Projeto."
      },
      {
        "id": "furos-desalinhamento-deslocamento-posicionamento-incorreto-foco-usinagem-reportar-se-havera-problemas-nas-proximas-montagens-informacao-opcional-socilitar-apoio-ao-processista-local",
        "description": "Reportar se haverá problemas nas próximas montagens (Informação opcional) - Socilitar apoio ao processista local)"
      }
    ],
    "engineeringStandards": [
      "NE03-071",
      "NE03-063",
      "NE03-007"
    ],
    "sourceRow": "34"
  },
  {
    "type": "Guia do conector rotacionado",
    "normalizedType": "guia do conector rotacionado",
    "requirements": [
      {
        "id": "guia-do-conector-rotacionado-informar-sigla-do-conector",
        "description": "Informar sigla do conector."
      },
      {
        "id": "guia-do-conector-rotacionado-informar-posicao-atual-do-guia-em-horas",
        "description": "Informar posição atual do guia em horas."
      },
      {
        "id": "guia-do-conector-rotacionado-informar-especificacao-do-projeto-da-cablagem",
        "description": "Informar especificação do projeto da cablagem."
      }
    ],
    "engineeringStandards": [
      "Doc.Emb 3824",
      "NE80-076"
    ],
    "sourceRow": "35"
  },
  {
    "type": "Impossibilidade de Montagem",
    "normalizedType": "impossibilidade de montagem",
    "requirements": [
      {
        "id": "impossibilidade-de-montagem-informar-o-procedimento-de-montagem",
        "description": "Informar o procedimento de montagem"
      },
      {
        "id": "impossibilidade-de-montagem-informar-as-pecas-envolvidas-no-processo-de-montagem-pn-sn-para-cada-uma-das-pecas-envolvidas",
        "description": "Informar as peças envolvidas no processo de montagem (PN / SN para cada uma das peças envolvidas)"
      },
      {
        "id": "impossibilidade-de-montagem-incluir-um-video-mostrando-a-tentativa-de-montagem-das-pecas",
        "description": "Incluir um vídeo mostrando a tentativa de montagem das peças"
      },
      {
        "id": "impossibilidade-de-montagem-informar-se-houve-uma-tentativa-de-realizar-a-montagem-com-pecas-diferentes",
        "description": "Informar se houve uma tentativa de realizar a montagem com peças diferentes."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "36"
  },
  {
    "type": "Infiltração Química",
    "normalizedType": "infiltracao quimica",
    "requirements": [
      {
        "id": "infiltracao-quimica-informar-as-pecas-envolvidas-no-processo-de-montagem-pn-sn-para-cada-uma-das-pecas-envolvidas",
        "description": "Informar as peças envolvidas no processo de montagem (PN / SN para cada uma das peças envolvidas)"
      }
    ],
    "engineeringStandards": [
      "NE 41-013",
      "NE 03-074",
      "NE 03-080"
    ],
    "sourceRow": "37"
  },
  {
    "type": "Insertos deslocados",
    "normalizedType": "insertos deslocados",
    "requirements": [
      {
        "id": "insertos-deslocados-incluir-um-video-mostrando-a-tentativa-de-montagem-das-pecas",
        "description": "Incluir um vídeo mostrando a tentativa de montagem das peças"
      }
    ],
    "engineeringStandards": [
      "NE 20-038 (Item 8.12)"
    ],
    "sourceRow": "38"
  },
  {
    "type": "Inspeção de Recebimento Informação Divergente (Documentação e Sistema)",
    "normalizedType": "inspecao de recebimento informacao divergente (documentacao e sistema)",
    "requirements": [
      {
        "id": "inspecao-de-recebimento-informacao-divergente-documentacao-e-sistema-informar-se-houve-uma-tentativa-de-realizar-a-montagem-com-pecas-diferentes",
        "description": "Informar se houve uma tentativa de realizar a montagem com peças diferentes."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "39"
  },
  {
    "type": "Inspeções não-destrutivas (Imperfeições internas: Vazios, pontes em raios, corpo estranho, etc)",
    "normalizedType": "inspecoes nao - destrutivas (imperfeicoes internas: vazios, pontes em raios, corpo estranho, etc)",
    "requirements": [
      {
        "id": "inspecoes-nao-destrutivas-imperfeicoes-internas-vazios-pontes-em-raios-corpo-estranho-etc-extensao-do-dano-largura-x-comprimento-profundidade-da-area-afetada-etc",
        "description": "Extensão do dano: largura X comprimento, profundidade da área afetada, etc."
      }
    ],
    "engineeringStandards": [
      "NE 20-032 (Item 5.3.7.3)"
    ],
    "sourceRow": "40"
  },
  {
    "type": "Interferência (Atrito)",
    "normalizedType": "interferencia (atrito)",
    "requirements": [
      {
        "id": "interferencia-atrito-descrever-localizacao-clara-do-local-afetado-incluindo-pn-e-sn-das-pecas-envolvidas-exemplo-fechadura-da-porta-conexoes-de-tubos-flaps-etc",
        "description": "Descrever localização clara do local afetado, incluindo PN e SN das peças envolvidas. Exemplo: fechadura da porta, conexões de tubos, flaps, etc"
      },
      {
        "id": "interferencia-atrito-descrever-momento-quando-interferencia-ocorre-exemplo-friccao-entre-o-trinco-e-o-marco-da-porta-quando-momento-do-fechamento-da-porta-conexoes-de-tubos-nao-se-encaixam-atrito-no-momento-de-acionamento-do-flap-etc",
        "description": "Descrever momento quando interferência ocorre Exemplo: Fricção entre o trinco e o marco da porta quando momento do fechamento da porta; Conexões de tubos não se encaixam; Atrito no momento de acionamento do flap, etc"
      },
      {
        "id": "interferencia-atrito-informar-dimensional-especificado-e-encontrado-da-regiao-com-interferencia-e-da-peca-que-causa-interferencia",
        "description": "Informar dimensional especificado e encontrado da região com interferência e da peça que causa interferência"
      },
      {
        "id": "interferencia-atrito-distancia-de-passo-e-borda-se-aplicavel",
        "description": "Distância de passo e borda (se aplicável)"
      },
      {
        "id": "interferencia-atrito-informar-se-existe-prendedores-afetados-se-aplicavel",
        "description": "Informar se existe prendedores afetados (se aplicável)"
      },
      {
        "id": "interferencia-atrito-incluir-video-mostrando-a-interferencia-reportada",
        "description": "Incluir vídeo mostrando a interferência reportada."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "41"
  },
  {
    "type": "Linha de Sistema",
    "normalizedType": "linha de sistema",
    "requirements": [
      {
        "id": "linha-de-sistema-reportar-desvios-atraves-de-relatorios-de-inspecao-socilitar-apoio-da-area-inspecao-tridimensional",
        "description": "Reportar desvios através de relatórios de Inspeção - Socilitar apoio da área Inspeção Tridimensional."
      }
    ],
    "engineeringStandards": [
      "NE03-071",
      "NE03-063",
      "NE03-007"
    ],
    "sourceRow": "42"
  },
  {
    "type": "Marca de ferramenta",
    "normalizedType": "marca de ferramenta",
    "requirements": [
      {
        "id": "marca-de-ferramenta-distancia-em-relacao-aos-prendedores-adjacentes-se-aplicavel",
        "description": "Distância em relação aos prendedores adjacentes (se aplicável)"
      },
      {
        "id": "marca-de-ferramenta-espessura-da-regiao-afetada",
        "description": "Espessura da região afetada"
      },
      {
        "id": "marca-de-ferramenta-dimensoes-profundidade-comprimento-e-largura",
        "description": "Dimensões (Profundidade, comprimento e largura)"
      },
      {
        "id": "marca-de-ferramenta-informar-se-o-clad-esta-afetado",
        "description": "Informar se o clad está afetado."
      }
    ],
    "engineeringStandards": [
      "NE 07-038",
      "NE 20-038 (Item 8.5)"
    ],
    "sourceRow": "43"
  },
  {
    "type": "Material Quebrado/Danificado (antes da montagem no ambiente produtivo)",
    "normalizedType": "material quebrado / danificado (antes da montagem no ambiente produtivo)",
    "requirements": [
      {
        "id": "material-quebrado-danificado-antes-da-montagem-no-ambiente-produtivo-anexar-fotos-do-processo-de-logistica-evidenciando-o-transporte-das-mesmas-desde-o-as-ambiente-sincronizador-e-celula-de-preparacao-ate-o-ambiente-de-montagem-exemplos-tubos-flexiveis-com-danos-na-montagem-que-sao-verificados-no-recebimento-mas-que-podem-ser-danificados-entre-etapas-de-trasnporte-interno-etc",
        "description": "Anexar fotos do processo de logística evidenciando o transporte das mesmas, desde o AS (ambiente sincronizador) e célula de preparação até o ambiente de montagem. Exemplos: tubos flexíveis com danos na montagem que são verificados no recebimento, mas que podem ser danificados entre etapas de trasnporte interno, etc"
      },
      {
        "id": "material-quebrado-danificado-antes-da-montagem-no-ambiente-produtivo-informar-o-estado-atual-incluindo-foto-do-material-e-dimensional",
        "description": "Informar o estado atual, incluindo foto do material e dimensional"
      },
      {
        "id": "material-quebrado-danificado-antes-da-montagem-no-ambiente-produtivo-informar-o-motivo-da-quebra-do-material-com-evidencias-exemplo-material-pesado-sobre-o-outro-armanezamento-inadequado-etc",
        "description": "Informar o motivo da quebra do material com evidências. Exemplo: Material pesado sobre o outro, armanezamento inadequado, etc."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "44"
  },
  {
    "type": "Metalização Faltando/Incorreta (fabricação)",
    "normalizedType": "metalizacao faltando / incorreta (fabricacao)",
    "requirements": [
      {
        "id": "metalizacao-faltando-incorreta-fabricacao-relatar-como-deveria-ser-realizada-a-metalizacao-especificacao-de-projeto-x-encontrado",
        "description": "Relatar como deveria ser realizada a metalização (especificação de projeto X encontrado)"
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "45"
  },
  {
    "type": "Metalização Incorreta (valores fora do especificado)",
    "normalizedType": "metalizacao incorreta (valores fora do especificado)",
    "requirements": [
      {
        "id": "metalizacao-incorreta-valores-fora-do-especificado-indicar-os-pontos-de-medicao-incluir-fotos-ou-desenho-esquematico-mostrando-os-pontos-usados-para-medicao-da-metalizacao",
        "description": "Indicar os pontos de medição (incluir fotos ou desenho esquemático mostrando os pontos usados para medição da metalização)"
      },
      {
        "id": "metalizacao-incorreta-valores-fora-do-especificado-informar-valores-limites-de-metalizacao-permitidos-incluir-numero-da-ne-ou-o-procedimento-do-fornecedor-com-o-devido-requisito",
        "description": "Informar valores limites de metalização permitidos (incluir número da NE ou o procedimento do fornecedor com o devido requisito)"
      },
      {
        "id": "metalizacao-incorreta-valores-fora-do-especificado-informar-valor-encontrado-durante-o-procedimento-de-metalizacao",
        "description": "Informar valor encontrado durante o procedimento de metalização."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "46"
  },
  {
    "type": "Pino de conector baixo / danificado / faltando / sem sealing plug / sem travamento",
    "normalizedType": "pino de conector baixo / danificado / faltando / sem sealing plug / sem travamento",
    "requirements": [
      {
        "id": "pino-de-conector-baixo-danificado-faltando-sem-sealing-plug-sem-travamento-sigla-do-conector",
        "description": "Sigla do conector"
      },
      {
        "id": "pino-de-conector-baixo-danificado-faltando-sem-sealing-plug-sem-travamento-cavidade-do-conector",
        "description": "Cavidade do conector"
      },
      {
        "id": "pino-de-conector-baixo-danificado-faltando-sem-sealing-plug-sem-travamento-reportar-o-pn-qtde-de-pinos-sem-travar",
        "description": "Reportar o PN, qtde de pinos sem travar"
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "47"
  },
  {
    "type": "Porca travada",
    "normalizedType": "porca travada",
    "requirements": [
      {
        "id": "porca-travada-informar-se-porca-foi-testada-manualmente-antes-de-ser-montada-no-sistema-com-ferramental-de-aperto",
        "description": "Informar se porca foi testada manualmente antes de ser montada no sistema com ferramental de aperto"
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "48"
  },
  {
    "type": "Porosidade",
    "normalizedType": "porosidade",
    "requirements": [
      {
        "id": "porosidade-reportar-dimensoes-do-dano-largura-comprimento-e-profundidade",
        "description": "Reportar dimensões do dano (largura, comprimento e profundidade)"
      },
      {
        "id": "porosidade-em-casos-onde-e-usado-o-processo-ndt-informar-o-valor-em-db-conforme-ne-07-011",
        "description": "Em casos onde é usado o processo NDT, informar o valor em Db, conforme NE 07-011."
      },
      {
        "id": "porosidade-espessura-adjacente",
        "description": "Espessura adjacente"
      },
      {
        "id": "porosidade-mapeamento-proxima-montagem",
        "description": "Mapeamento próxima montagem"
      }
    ],
    "engineeringStandards": [
      "NE 20-032 (tabela 5)",
      "NE 07-011"
    ],
    "sourceRow": "49"
  },
  {
    "type": "Prendedores em desacordo com projeto/ cravação incorreta",
    "normalizedType": "prendedores em desacordo com projeto / cravacao incorreta",
    "requirements": [
      {
        "id": "prendedores-em-desacordo-com-projeto-cravacao-incorreta-prendedor-instalado-no-local",
        "description": "Prendedor instalado no local"
      },
      {
        "id": "prendedores-em-desacordo-com-projeto-cravacao-incorreta-distancia-de-passo-e-borda-minimas",
        "description": "Distância de passo e borda (Mínimas)."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "50"
  },
  {
    "type": "Printer Fault / Printer Faulted / Printer Inoperative",
    "normalizedType": "printer fault / printer faulted / printer inoperative",
    "requirements": [
      {
        "id": "printer-fault-printer-faulted-printer-inoperative-anexar-foto-da-impressao-de-autotest-da-impressora",
        "description": "Anexar foto da impressão de autotest da impressora"
      },
      {
        "id": "printer-fault-printer-faulted-printer-inoperative-anexar-foto-da-impressora-instalada-e-energizada",
        "description": "Anexar foto da impressora instalada e energizada"
      },
      {
        "id": "printer-fault-printer-faulted-printer-inoperative-anexar-foto-do-eicas-para-status-da-impressora-vermelho-ou-verde",
        "description": "Anexar foto do EICAS para status da impressora (Vermelho ou Verde)"
      },
      {
        "id": "printer-fault-printer-faulted-printer-inoperative-anexar-foto-do-cas-para-diagnostico-de-mensagens-de-falha-atreladas-a-impressora",
        "description": "Anexar foto do CAS para diagnostico de mensagens de falha atreladas a impressora."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "51"
  },
  {
    "type": "Recebimento: itens amassados e danificados",
    "normalizedType": "recebimento: itens amassados e danificados",
    "requirements": [
      {
        "id": "recebimento-itens-amassados-e-danificados-anexar-fotos-das-embalagens-interna-e-externa-evidenciando-se-ha-algum-dano-na-caixa",
        "description": "Anexar fotos das embalagens interna e externa evidenciando se há algum dano na caixa"
      },
      {
        "id": "recebimento-itens-amassados-e-danificados-anexar-fotos-demonstrando-todas-as-indicacoes-de-manuseio-existentes-empilhamento-orientacao-da-caixa-fragilidade-etc-tanto-da-caixa-principal-como-tambem-das-embalagens-individualizadas-caso-haja",
        "description": "Anexar fotos demonstrando todas as indicações de manuseio existentes (empilhamento, orientação da caixa, fragilidade,etc.), tanto da caixa principal, como também das embalagens individualizadas, caso haja."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "52"
  },
  {
    "type": "Redução de espessura (Foco:Usinagem)",
    "normalizedType": "reducao de espessura (foco: usinagem)",
    "requirements": [
      {
        "id": "reducao-de-espessura-foco-usinagem-causa-da-nao-conformidade",
        "description": "Causa da não-conformidade"
      },
      {
        "id": "reducao-de-espessura-foco-usinagem-dimensao-da-regiao-afetada-comprimento-x-largura",
        "description": "Dimensão da região afetada: Comprimento x Largura"
      },
      {
        "id": "reducao-de-espessura-foco-usinagem-verificacao-de-pontos-medidos-a-cada-10mm-se-for-uma-area-pequena-ou-aplicar-distancia-de-pontos-maiores-caso-a-variacao-de-espessura-nao-seja-tao-significativa",
        "description": "Verificação de pontos medidos a cada 10mm se for uma área pequena ou aplicar distância de pontos maiores caso a variação de espessura não seja tão significativa."
      }
    ],
    "engineeringStandards": [
      "NE03-071",
      "NE03-063",
      "NE03-007"
    ],
    "sourceRow": "53"
  },
  {
    "type": "Risco",
    "normalizedType": "risco",
    "requirements": [
      {
        "id": "risco-informar-detalhes-da-especificacao-do-produto-quanto-a-riscos-tais-como-a-norma-de-referencia-usada-se-aplicavel",
        "description": "Informar detalhes da especificação do produto quanto a riscos, tais como a norma de referência usada (se aplicável)"
      },
      {
        "id": "risco-informar-onde-o-risco-foi-detectado-exemplo-recebimento-equipagem-entrega-etc",
        "description": "Informar onde o risco foi detectado (exemplo: recebimento, equipagem, entrega, etc.)"
      },
      {
        "id": "risco-informar-dimensoes-do-risco-comprimento-largura-e-profundidade-para-riscos-superficiais-onde-nao-e-possivel-medir-a-profundidade-informar-esta-condicao",
        "description": "Informar dimensões do risco: comprimento, largura e profundidade (para riscos superficiais onde não é possível medir a profundidade, informar esta condição)"
      },
      {
        "id": "risco-informar-a-espessura-do-material-ou-chapa-danificado-se-for-revestimento-informar-tambem-a-tolerancia-de-projeto",
        "description": "Informar a espessura do material ou chapa danificado (se for revestimento informar também a tolerância de projeto)"
      },
      {
        "id": "risco-informar-a-distancia-e-condicao-de-iluminacao-em-que-os-problemas-foram-inspecionados-detectados",
        "description": "Informar a distância e condição de iluminação em que os problemas foram inspecionados / detectados"
      },
      {
        "id": "risco-informar-se-o-tratamento-superficial-foi-afetado-exemplo-verificacao-por-meio-de-teste-de-passagem-de-corrente-utilizando-o-multimetro",
        "description": "Informar se o tratamento superficial foi afetado (exemplo: verificação por meio de teste de passagem de corrente, utilizando o multímetro)"
      },
      {
        "id": "risco-efetuar-teste-clad-se-necessario",
        "description": "Efetuar teste clad (se necessário)"
      },
      {
        "id": "risco-reportar-se-a-fibra-nao-esta-exposta-ou-danificada-em-caso-de-material-composto",
        "description": "Reportar se a fibra não está exposta ou danificada (Em caso de material composto)"
      },
      {
        "id": "risco-anexar-fotos-do-risco-mostrando-regiao-afetada-na-peca-com-dimensoes-explicitas-nas-fotos",
        "description": "Anexar fotos do risco mostrando região afetada na peça (com dimensões explícitas nas fotos)."
      }
    ],
    "engineeringStandards": [
      "NE07-038",
      "NE 20-038 (Item 9.5.2)",
      "NE20-032",
      "NE03-071",
      "NE03-063",
      "NE03-007"
    ],
    "sourceRow": "54"
  },
  {
    "type": "Rompimento de Camadas (Trincas)",
    "normalizedType": "rompimento de camadas (trincas)",
    "requirements": [
      {
        "id": "rompimento-de-camadas-trincas-dimensao-do-dano-comprimento-x-largura",
        "description": "Dimensão do dano: Comprimento x Largura"
      },
      {
        "id": "rompimento-de-camadas-trincas-numero-de-camadas-afetadas-nota-se-usado-ensaios-ndt-deve-ser-informado-a-profundidade-do-dano",
        "description": "Número de camadas afetadas (Nota: Se usado ensaios NDT deve ser informado a profundidade do dano)"
      },
      {
        "id": "rompimento-de-camadas-trincas-reportar-se-o-dano-esta-relacionado-a-montagem-de-chapas-e-ou-telas-de-metalizacao",
        "description": "Reportar se o dano está relacionado a montagem de chapas e/ou telas de metalização."
      }
    ],
    "engineeringStandards": [
      "NE 20-038 (Item 8.1)"
    ],
    "sourceRow": "55"
  },
  {
    "type": "Rugas nas camadas",
    "normalizedType": "rugas nas camadas",
    "requirements": [],
    "engineeringStandards": [
      "NE 20-032 (tabela 5)"
    ],
    "sourceRow": "56"
  },
  {
    "type": "Ruído",
    "normalizedType": "ruido",
    "requirements": [
      {
        "id": "ruido-informar-a-especificacao-do-criterio-de-ruido-exigido-ou-se-trata-de-uma-anomalia-percebida-pelo-operador-devido-a-sua-experiencia-de-montagem-para-pecas-similares",
        "description": "Informar a especificação do critério de ruído exigido ou se trata de uma anomalia percebida pelo operador devido a sua experiência de montagem para peças similares"
      },
      {
        "id": "ruido-evidenciar-atraves-de-video-o-ruido-detectado-mostrando-o-funcionamento-da-peca",
        "description": "Evidênciar através de vídeo o ruído detectado, mostrando o funcionamento da peça)"
      },
      {
        "id": "ruido-evidenciar-atraves-de-video-o-funcionamento-de-peca-sem-o-ruido-para-efeitos-comparativos",
        "description": "Evidênciar através de vídeo o funcionamento de peça sem o ruído para efeitos comparativos"
      },
      {
        "id": "ruido-informar-se-o-ruido-e-proveniente-da-inspecao-reclamacao-de-cliente",
        "description": "Informar se o ruído é proveniente da inspeção / reclamação de cliente."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "57"
  },
  {
    "type": "Sistema Operando fora do Especificado (Mensagem de Falha)",
    "normalizedType": "sistema operando fora do especificado (mensagem de falha)",
    "requirements": [
      {
        "id": "sistema-operando-fora-do-especificado-mensagem-de-falha-informar-se-peca-apresenta-mensagem-de-falha-durante-primeiro-power-on-do-equipamento-a-fim-de-evidenciar-que-ela-nao-foi-previamente-eletronicamente-testada-na-embraer-informar-tsn-e-csn-se-disponivel",
        "description": "Informar se peça apresenta mensagem de falha durante primeiro power on do equipamento, a fim de evidenciar que ela não foi previamente eletronicamente testada na Embraer (informar TSN e CSN se disponível)"
      },
      {
        "id": "sistema-operando-fora-do-especificado-mensagem-de-falha-reportar-qual-teste-atividade-estava-sendo-executada-no-momento-da-falha",
        "description": "Reportar qual teste / atividade estava sendo executada no momento da falha"
      },
      {
        "id": "sistema-operando-fora-do-especificado-mensagem-de-falha-reportar-texto-da-mensagem-de-falha-exibida-incluir-foto",
        "description": "Reportar texto da mensagem de falha exibida (incluir foto)"
      },
      {
        "id": "sistema-operando-fora-do-especificado-mensagem-de-falha-reportar-codigo-da-mensagem-de-falha-incluir-foto-nota-uma-mesma-mensagem-de-falha-pode-ser-trigada-por-diferentes-codigos-de-falha-no-cmc",
        "description": "Reportar código da mensagem de falha (incluir foto). Nota: uma mesma mensagem de falha pode ser trigada por diferentes códigos de falha no CMC"
      },
      {
        "id": "sistema-operando-fora-do-especificado-mensagem-de-falha-anexar-foto-do-display-obrigatorio-onde-e-indicada-a-mensagem-de-falha-e-da-pagina-de-manutencao-se-disponivel",
        "description": "Anexar foto do display (obrigatório) onde é indicada a mensagem de falha e da página de manutenção (se disponível)"
      },
      {
        "id": "sistema-operando-fora-do-especificado-mensagem-de-falha-indicar-se-mensagem-e-continua-ou-intermitente-caso-seja-intermitente-indicar-o-tempo-da-intermitencia-ou-periodo-aproximado-de-sua-duracao-e-a-situacao-em-que-ela-foi-trigada",
        "description": "Indicar se mensagem é contínua ou intermitente (caso seja intermitente, indicar o tempo da intermitência ou período aproximado de sua duração e a situação em que ela foi trigada)"
      },
      {
        "id": "sistema-operando-fora-do-especificado-mensagem-de-falha-especificar-se-o-fim-foi-realizado-e-em-caso-positivo-indicar-qual-o-codigo-do-fim",
        "description": "Especificar se o FIM foi realizado e, em caso positivo, indicar qual o código do FIM"
      },
      {
        "id": "sistema-operando-fora-do-especificado-mensagem-de-falha-reportar-se-foi-realizada-a-medicao-ponto-a-ponto",
        "description": "Reportar se foi realizada a medição ponto-a-ponto"
      },
      {
        "id": "sistema-operando-fora-do-especificado-mensagem-de-falha-reportar-se-conectores-que-tem-ligacao-direta-com-o-sistema-da-peca-falhada-foram-desconectados-checados-e-reconectados",
        "description": "Reportar se conectores que têm ligação direta com o sistema da peça falhada foram desconectados, checados e reconectados"
      },
      {
        "id": "sistema-operando-fora-do-especificado-mensagem-de-falha-reportar-se-pbit-e-ibit-foram-realizados-anteriormente-a-realizacao-do-swap-troca-da-peca-julgada-nao-conforme",
        "description": "Reportar se PBIT e IBIT foram realizados anteriormente a realização do swap / troca da peça julgada não-conforme"
      },
      {
        "id": "sistema-operando-fora-do-especificado-mensagem-de-falha-em-caso-de-erro-de-carregamento-de-software-informar-o-pn-do-programa-instalado-a-mensagem-de-falha-e-se-o-novo-software-foi-disponibilizado-pela-engenharia-embraer",
        "description": "Em caso de erro de carregamento de software informar o PN do programa instalado, a mensagem de falha e se o novo software foi disponibilizado pela Engenharia Embraer."
      },
      {
        "id": "sistema-operando-fora-do-especificado-mensagem-de-falha-informar-se-a-mensagem-aparece-durante-voo-ou-teste-de-solo-para-mensagens-de-falha-reportadas-em-testes-no-solo-e-importante-tambem-anexar-download-dos-dados-da-aeronave-cmc-fhdb-e-outros-para-mensagens-de-falha-reportadas-em-testes-no-voo-e-importante-tambem-informar-qual-a-condicao-de-voo-ocorreu-a-pane-como-por-exemplo-decolagem-subida-cruzeiro-descida-pouso-etc-anexar-flight-data-e-informacao-do-cmc",
        "description": "Informar se a mensagem aparece durante vôo ou teste de solo. - Para mensagens de falha reportadas em testes no solo é importante também anexar download dos dados da aeronave (CMC, FHDB e outros). - Para mensagens de falha reportadas em testes no voo é importante também informar qual a condição de voo ocorreu a pane como por exemplo decolagem, subida, cruzeiro, descida, pouso, etc. Anexar flight data e informação do CMC."
      }
    ],
    "engineeringStandards": [
      "DOC.EMB 3196"
    ],
    "sourceRow": "58"
  },
  {
    "type": "SN Duplicado Recebido",
    "normalizedType": "sn duplicado recebido",
    "requirements": [
      {
        "id": "sn-duplicado-recebido-informar-pn-e-sn-duplicado",
        "description": "Informar PN e SN duplicado"
      },
      {
        "id": "sn-duplicado-recebido-informar-po-e-linha-de-ambos-os-materiais-recebidos-juntamente-com-as-respectivas-datas-de-recebimento",
        "description": "Informar PO e linha de ambos os materiais recebidos juntamente com as respectivas datas de recebimento"
      },
      {
        "id": "sn-duplicado-recebido-incluir-foto-da-invoice-de-recebimento-da-ultima-peca-com-sn-duplicado-juntamente-com-foto-da-peca-fisica-para-evidenciar-que-a-invoice-e-a-peca-tem-a-mesma-informacao-de-sn",
        "description": "Incluir foto da Invoice de recebimento da última peça com SN duplicado juntamente com foto da peça física para evidenciar que a Invoice e a peça têm a mesma informação de SN."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "59"
  },
  {
    "type": "Tempo de Vida / Aferição / Inspeção Periódica / Validade Vencida",
    "normalizedType": "tempo de vida / afericao / inspecao periodica / validade vencida",
    "requirements": [
      {
        "id": "tempo-de-vida-afericao-inspecao-periodica-validade-vencida-data-de-fabricacao-do-produto-equipamento-nota-informar-qual-a-data-esta-sendo-usada-para-comparacao-data-de-fabricacao-ou-data-de-overhaull-se-aplicavel",
        "description": "Data de fabricação do produto/equipamento; Nota: Informar qual a data está sendo usada para comparação (data de fabricação ou data de overhaull, se aplicável)."
      },
      {
        "id": "tempo-de-vida-afericao-inspecao-periodica-validade-vencida-incluir-informacao-referente-a-quanto-tempo-o-material-pode-ter-de-tempo-de-vida-incluir-foto-de-pagina-da-dip-com-indicacao-de-perecibilidade-preservacao-reteste-do-material",
        "description": "Incluir informação referente a quanto tempo o material pode ter de tempo de vida (incluir foto de página da DIP com indicação de perecibilidade / preservação / reteste do material)"
      },
      {
        "id": "tempo-de-vida-afericao-inspecao-periodica-validade-vencida-incluir-data-do-teste-hidrostatico-para-caso-de-garrafas-de-extincao-de-fogo",
        "description": "Incluir data do teste hidrostático (para caso de garrafas de extinção de fogo)."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "60"
  },
  {
    "type": "Tratamento Térmico/Superficial Faltando",
    "normalizedType": "tratamento termico / superficial faltando",
    "requirements": [
      {
        "id": "tratamento-termico-superficial-faltando-relatar-a-especificacao-x-as-condicoes-atuais",
        "description": "Relatar a especificação X as condições atuais."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "61"
  },
  {
    "type": "Trinca",
    "normalizedType": "trinca",
    "requirements": [
      {
        "id": "trinca-informar-condicoes-de-projeto",
        "description": "informar condições de projeto"
      },
      {
        "id": "trinca-dimensionamento-da-regiao-discrepante-comprimento-por-ensaio-de-liquido-penetrante-e-relatar-condicoes-atuais",
        "description": "Dimensionamento da região discrepante (Comprimento) por ensaio de liquido penetrante e relatar condições atuais"
      },
      {
        "id": "trinca-caso-existir-furos-de-fixacao-o-diametro-dos-mesmos-prendedor-de-projeto-e-passo-e-bordas-minimas",
        "description": "Caso existir furos de fixação, o diâmetro dos mesmos, prendedor de projeto e passo e bordas mínimas."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "62"
  },
  {
    "type": "Vazamento",
    "normalizedType": "vazamento",
    "requirements": [
      {
        "id": "vazamento-informar-o-criterio-de-vazamento-permitido-especificacao",
        "description": "Informar o critério de vazamento permitido (especificação)"
      },
      {
        "id": "vazamento-informar-o-vazamento-mensurado-exemplo-gotas-por-minuto-queda-de-pressao-em-psi-min-etc",
        "description": "Informar o vazamento mensurado (exemplo: gotas por minuto, queda de pressão em psi / min, etc.)"
      },
      {
        "id": "vazamento-informar-o-tipo-de-teste-executado-durante-deteccao-do-vazamento-exemplo-bancada-pressurizacao-flushing",
        "description": "Informar o tipo de teste executado durante detecção do vazamento (exemplo: bancada, pressurização, flushing)"
      },
      {
        "id": "vazamento-informar-se-o-vazamento-e-no-primeiro-teste-ou-ocorreu-posteriormente-a-algum-outro-teste-realizado",
        "description": "Informar se o vazamento é no primeiro teste ou ocorreu posteriormente a algum outro teste realizado"
      },
      {
        "id": "vazamento-informar-se-o-vazamento-ocorre-com-o-sistema-estatico-desligado-ou-sistema-dinamico-em-execucao",
        "description": "Informar se o vazamento ocorre com o sistema estático (desligado) ou sistema dinâmico (em execução)"
      },
      {
        "id": "vazamento-informar-o-tipo-de-fluido-que-esta-vazando-exemplo-oleo-de-preservacao-oleo-hidraulico-combustivel-ar-helio-agua-etc",
        "description": "Informar o tipo de fluido que está vazando (exemplo: óleo de preservação, óleo hidráulico, combustível, ar, hélio, agua, etc)"
      },
      {
        "id": "vazamento-informar-metodo-de-deteccao-de-vazamento-exemplo-inspecao-visual-ruido-solucao-de-deteccao-de-vazamento-leak-tec-medidas-de-decaimento-de-pressao-ao-longo-do-tempo-etc",
        "description": "Informar método de detecção de vazamento (exemplo: inspeção visual, ruído, solução de detecção de vazamento - LEAK TEC, medidas de decaimento de pressão ao longo do tempo, etc.)"
      },
      {
        "id": "vazamento-informar-o-local-do-vazamento",
        "description": "Informar o local do vazamento"
      },
      {
        "id": "vazamento-informar-se-na-area-de-vazamento-ha-indicios-de-danos",
        "description": "Informar se na área de vazamento há indícios de danos"
      },
      {
        "id": "vazamento-para-vazamentos-de-interface-reportar-se-a-interface-entre-conectores-foi-verificada-regiao-limpa-e-conexoes-desmontadas-e-montadas-novamente-e-se-o-torque-das-conexoes-estao-adequados-informar-requisito-x-torque-aplicado",
        "description": "Para vazamentos de interface, reportar se a interface entre conectores foi verificada (região limpa e conexões desmontadas e montadas novamente) e se o torque das conexões estão adequados (informar requisito X torque aplicado)"
      },
      {
        "id": "vazamento-informar-se-swap-da-peca-nao-conforme-foi-realizado-caso-seja-possivel",
        "description": "Informar se swap da peça não-conforme foi realizado (caso seja possível)"
      },
      {
        "id": "vazamento-anexar-video-mostrando-vazamento-exemplo-formacao-de-bolhas-gotejamento-poca-de-fluido-no-chao-sendo-formada-etc",
        "description": "Anexar vídeo mostrando vazamento (exemplo: formação de bolhas, gotejamento, poça de fluido no chão sendo formada, etc.)."
      }
    ],
    "engineeringStandards": [
      "NE 07-024"
    ],
    "sourceRow": "63"
  },
  {
    "type": "Vincos",
    "normalizedType": "vincos",
    "requirements": [
      {
        "id": "vincos-profundidade-do-vinco",
        "description": "Profundidade do vinco"
      },
      {
        "id": "vincos-espessura-da-peca",
        "description": "Espessura da peça"
      },
      {
        "id": "vincos-reportar-condicoes-do-lado-oposto-peca-ao-vinco",
        "description": "Reportar condições do lado oposto \"peça\" ao vinco."
      }
    ],
    "engineeringStandards": [
      "NE 20-032 (tabela 5)"
    ],
    "sourceRow": "64"
  },
  {
    "type": "Cablagem - Trançada",
    "normalizedType": "cablagem - trancada",
    "requirements": [
      {
        "id": "cablagem-trancada-informar-n-do-fio-e-ou-ramificacao-trancada",
        "description": "Informar n° do fio e/ou ramificação trançada."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "65"
  },
  {
    "type": "Cablagem - Terminal Incorreto",
    "normalizedType": "cablagem - terminal incorreto",
    "requirements": [
      {
        "id": "cablagem-terminal-incorreto-sigla-do-gs-incorreto",
        "description": "Sigla do GS incorreto"
      },
      {
        "id": "cablagem-terminal-incorreto-informar-dimensoes-do-terminal-gs-que-comprometeram-a-instalacao-diametro-do-furo-diametro-externo-etc",
        "description": "Informar dimensões do Terminal GS que comprometeram a instalação. (diâmetro do furo, diâmetro externo, etc…)"
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "66"
  },
  {
    "type": "Cablagem - Ligação invertida",
    "normalizedType": "cablagem - ligacao invertida",
    "requirements": [
      {
        "id": "cablagem-ligacao-invertida-informar-entre-quais-fios-e-quais-conectores-cavidades-a-inversao-ocorreu",
        "description": "Informar entre quais fios e quais conectores (cavidades) a inversão ocorreu."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "67"
  },
  {
    "type": "Ramificação Incorreta",
    "normalizedType": "ramificacao incorreta",
    "requirements": [
      {
        "id": "ramificacao-incorreta-valor-de-projeto-especificado-x-encontrado-com-ponto-de-referencia-para-cablagem-solicitar-suporte-para-analise-de-di-de-instalacao-x-dmu",
        "description": "Valor de projeto especificado X encontrado com ponto de referência* * Para cablagem Solicitar suporte para análise de DI de instalação X DMU."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "68"
  },
  {
    "type": "Identificação Incorreta",
    "normalizedType": "identificacao incorreta",
    "requirements": [
      {
        "id": "identificacao-incorreta-informar-identificacao-incorreta",
        "description": "Informar identificação incorreta."
      },
      {
        "id": "identificacao-incorreta-informar-qual-a-identificacao-deveria-ter-sido-enviada",
        "description": "Informar qual a identificação deveria ter sido enviada."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "68"
  },
  {
    "type": "Corpo estranho",
    "normalizedType": "corpo estranho",
    "requirements": [
      {
        "id": "corpo-estranho-dimensoes-largura-e-comprimento",
        "description": "Dimensões largura e comprimento"
      },
      {
        "id": "corpo-estranho-profundidade-da-inclusao",
        "description": "Profundidade da inclusão"
      },
      {
        "id": "corpo-estranho-espessuras-adjacente",
        "description": "Espessuras Adjacente"
      },
      {
        "id": "corpo-estranho-mapeamento-proxima-montagem",
        "description": "Mapeamento próxima montagem"
      },
      {
        "id": "corpo-estranho-imagem-do-local-afetado-no-componente-e-imagem-do-local-afetado",
        "description": "Imagem do local afetado no componente e imagem do local afetado"
      }
    ],
    "engineeringStandards": [
      "NE 07-011",
      "NE 20-032"
    ],
    "sourceRow": "69"
  },
  {
    "type": "Cura",
    "normalizedType": "cura",
    "requirements": [
      {
        "id": "cura-numero-da-cura",
        "description": "Número da cura"
      },
      {
        "id": "cura-valor-encontrado",
        "description": "Valor encontrado"
      },
      {
        "id": "cura-valor-especificado",
        "description": "Valor especificado"
      },
      {
        "id": "cura-nivel-da-peca",
        "description": "Nível da peça"
      },
      {
        "id": "cura-inspecao-por-ultrassom",
        "description": "Inspeção por ultrassom"
      },
      {
        "id": "cura-caso-tenha-ensaio-no-laboratorio-necessario-aguardar-para-reportar-o-resultado",
        "description": "Caso tenha ensaio no laboratório necessário aguardar para reportar o resultado"
      }
    ],
    "engineeringStandards": [
      "NE 20-032",
      "Doc. Emb 84"
    ],
    "sourceRow": "70"
  },
  {
    "type": "Resina Insuficiente/Faltando",
    "normalizedType": "resina insuficiente / faltando",
    "requirements": [
      {
        "id": "resina-insuficiente-faltando-imagem-da-regiao-afetada-e-da-peca-como-um-todo",
        "description": "Imagem da região afetada e da peça como um todo"
      },
      {
        "id": "resina-insuficiente-faltando-informar-se-a-regiao-afeta-aspecto-visual-lado-acabado-ou-lado-nao-acabado",
        "description": "Informar se a região afeta aspecto visual, lado acabado ou lado não acabado"
      }
    ],
    "engineeringStandards": [
      "NE 20-032"
    ],
    "sourceRow": "71"
  },
  {
    "type": "Ruptura de Tela",
    "normalizedType": "ruptura de tela",
    "requirements": [
      {
        "id": "ruptura-de-tela-imagem-da-regiao-afetada-e-da-peca-como-um-todo",
        "description": "Imagem da região afetada e da peça como um todo"
      },
      {
        "id": "ruptura-de-tela-dimensao-da-ruptura-comprimento-x-largura",
        "description": "Dimensão da ruptura comprimento x largura"
      },
      {
        "id": "ruptura-de-tela-avaliar-se-exsite-cravacao-proxima-a-ruptura-passo-entre-a-ruptura-e-prendedor-limitado-em-no-minimo-25-mm",
        "description": "Avaliar se exsite cravação proxima a ruptura, passo entre a ruptura e prendedor limitado em no mínimo 25 mm"
      },
      {
        "id": "ruptura-de-tela-avaliare-reportar-possiveis-impactos-na-proxima-montagem-ex-borda-afeta-furacao-ou-instalacao-de-outro-produto",
        "description": "Avaliare reportar possíveis impactos na próxima montagem Ex: borda, afeta furação ou instalação de outro produto"
      }
    ],
    "engineeringStandards": [
      "NE 80-060",
      "NE 20-032"
    ],
    "sourceRow": "72"
  },
  {
    "type": "Espessura",
    "normalizedType": "espessura",
    "requirements": [
      {
        "id": "espessura-dimensao-largura-comprimento",
        "description": "Dimensão largura, comprimento"
      },
      {
        "id": "espessura-espessura-encontrada",
        "description": "Espessura encontrada"
      },
      {
        "id": "espessura-espessura-de-projeto",
        "description": "Espessura de projeto"
      },
      {
        "id": "espessura-informar-lay-up-de-camadas-na-regiao-da-espessura-fora-do-especificado",
        "description": "Informar lay up de camadas na região da espessura fora do especificado"
      },
      {
        "id": "espessura-mapeamento-proxima-montagem",
        "description": "Mapeamento próxima montagem"
      }
    ],
    "engineeringStandards": [
      "NE 20-032"
    ],
    "sourceRow": "73"
  },
  {
    "type": "Afundamento / Mossa / Amassamento / Ondulação / Vinco (Foco: Composto)",
    "normalizedType": "afundamento / mossa / amassamento / ondulacao / vinco (foco: composto)",
    "requirements": [
      {
        "id": "afundamento-mossa-amassamento-ondulacao-vinco-foco-composto-dimensao-largura-comprimento-e-profundidade",
        "description": "Dimensão largura, comprimento e profundidade"
      },
      {
        "id": "afundamento-mossa-amassamento-ondulacao-vinco-foco-composto-mapeamento-proxima-montagem",
        "description": "Mapeamento próxima montagem"
      }
    ],
    "engineeringStandards": [
      "NE 20-032"
    ],
    "sourceRow": "74"
  },
  {
    "type": "Tempo de Exposição",
    "normalizedType": "tempo de exposicao",
    "requirements": [
      {
        "id": "tempo-de-exposicao-anexar-grafico-de-cura",
        "description": "Anexar gráfico de cura"
      }
    ],
    "engineeringStandards": [
      "NE 20-032"
    ],
    "sourceRow": "75"
  },
  {
    "type": "Vazios",
    "normalizedType": "vazios",
    "requirements": [
      {
        "id": "vazios-dimensao-largura-e-comprimento",
        "description": "Dimensão largura e comprimento"
      },
      {
        "id": "vazios-profundidade-do-vazio",
        "description": "Profundidade do vazio"
      },
      {
        "id": "vazios-espessura-adjacente",
        "description": "Espessura adjacente"
      },
      {
        "id": "vazios-mapeamento-proxima-montagem",
        "description": "Mapeamento próxima montagem."
      }
    ],
    "engineeringStandards": [
      "NE 20-032",
      "NE 07-011"
    ],
    "sourceRow": "76"
  },
  {
    "type": "Núcleo Esmagado / Descolado",
    "normalizedType": "nucleo esmagado / descolado",
    "requirements": [
      {
        "id": "nucleo-esmagado-descolado-dimensao-largura-comprimento-e-profundidade",
        "description": "Dimensão largura, comprimento e profundidade"
      },
      {
        "id": "nucleo-esmagado-descolado-reportar-a-avaliacao-quanto-a-possiveis-impactos-na-proxima-montagem-ex-borda-afeta-furacao-ou-instalacao-de-outro-produto",
        "description": "Reportar a avaliação quanto a possíveis impactos na próxima montagem Ex: borda, afeta furação ou instalação de outro produto"
      }
    ],
    "engineeringStandards": [
      "NE 20-032"
    ],
    "sourceRow": "77"
  },
  {
    "type": "Extração/Desmoldagem (Foco Composto)",
    "normalizedType": "extracao / desmoldagem (foco composto)",
    "requirements": [
      {
        "id": "extracao-desmoldagem-foco-composto-dimensao-largura-comprimento-e-profundidade-da-delaminacao",
        "description": "Dimensão largura, comprimento e profundidade da Delaminação"
      },
      {
        "id": "extracao-desmoldagem-foco-composto-espessura-adjacente",
        "description": "Espessura adjacente"
      },
      {
        "id": "extracao-desmoldagem-foco-composto-reportar-a-avaliacao-quanto-a-possiveis-impactos-na-proxima-montagem",
        "description": "Reportar a avaliação quanto a possíveis impactos na próxima montagem"
      }
    ],
    "engineeringStandards": [
      "NE 20-032"
    ],
    "sourceRow": "78"
  },
  {
    "type": "Pontes em Chanfros e Raios",
    "normalizedType": "pontes em chanfros e raios",
    "requirements": [
      {
        "id": "pontes-em-chanfros-e-raios-dimensao-largura-comprimento-e-profundidade",
        "description": "Dimensão largura, comprimento e profundidade"
      },
      {
        "id": "pontes-em-chanfros-e-raios-espessura-adjacente",
        "description": "Espessura adjacente"
      },
      {
        "id": "pontes-em-chanfros-e-raios-reportar-a-avaliacao-quanto-a-possiveis-impactos-na-proxima-montagem",
        "description": "Reportar a avaliação quanto a possíveis impactos na próxima montagem"
      }
    ],
    "engineeringStandards": [
      "NE 20-032"
    ],
    "sourceRow": "79"
  },
  {
    "type": "Fibras Danificadas/Desalinhadas",
    "normalizedType": "fibras danificadas / desalinhadas",
    "requirements": [
      {
        "id": "fibras-danificadas-desalinhadas-dimensao-largura-e-comprimento",
        "description": "Dimensão largura e comprimento:"
      },
      {
        "id": "fibras-danificadas-desalinhadas-avaliar-se-exsite-cravacao-proxima-a-ruptura-passo-entre-a-ruptura-e-prendedor-limitado-em-no-minimo-25-mm",
        "description": "Avaliar se exsite cravação proxima a ruptura, passo entre a ruptura e prendedor limitado em no mínimo 25 mm"
      }
    ],
    "engineeringStandards": [
      "NE 20-032"
    ],
    "sourceRow": "80"
  },
  {
    "type": "Defeito na colagem do inserto/ terital/posicionamento",
    "normalizedType": "defeito na colagem do inserto / terital / posicionamento",
    "requirements": [
      {
        "id": "defeito-na-colagem-do-inserto-terital-posicionamento-orientacao-incorreta-do-sentido-da-fita",
        "description": "Orientação Incorreta do Sentido da Fita"
      },
      {
        "id": "defeito-na-colagem-do-inserto-terital-posicionamento-posicionamento-orientacao-de-camada",
        "description": "Posicionamento / Orientação de Camada"
      }
    ],
    "engineeringStandards": [
      "NE 20-032"
    ],
    "sourceRow": "81"
  },
  {
    "type": "Peso",
    "normalizedType": "peso",
    "requirements": [
      {
        "id": "peso-reportar-valor-encontrado-e-valor-de-projeto",
        "description": "Reportar valor encontrado e valor de projeto"
      },
      {
        "id": "peso-avaliar-proxima-montagem-condicao-afeta-balanceamento-ou-peso-final-do-produto-informar-pn-proxima-montagem",
        "description": "Avaliar proxima montagem ( condição afeta Balanceamento, ou peso final do produto), informar PN próxima montagem."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "82"
  },
  {
    "type": "Profundidade",
    "normalizedType": "profundidade",
    "requirements": [
      {
        "id": "profundidade-reportar-valor-encontrado-e-valor-de-projeto",
        "description": "Reportar valor encontrado e valor de projeto"
      },
      {
        "id": "profundidade-avaliar-proxima-montagem-alojamento-mapear-regiao-e-pn-proxima-montagem",
        "description": "Avaliar proxima montagem (alojamento), mapear região e PN próxima montagem."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "83"
  },
  {
    "type": "Forma (Má Conformação, Dobra/Rasgo /Angulo/Chanfro/ Raio)",
    "normalizedType": "forma (ma conformacao, dobra / rasgo / angulo / chanfro / raio)",
    "requirements": [
      {
        "id": "forma-ma-conformacao-dobra-rasgo-angulo-chanfro-raio-dobra-informar-condicao-atual-da-dobra-no-produto-e-condicao-de-projeto",
        "description": "Dobra: Informar condição atual da dobra no produto e condição de projeto"
      },
      {
        "id": "forma-ma-conformacao-dobra-rasgo-angulo-chanfro-raio-rasgo-informar-rasgo-de-projeto-e-rago-atual-no-produto-informar-proxima-montagem-possiveis-impactos-tais-como-borda-da-furacao-afetada-atrito-ou-folga",
        "description": "Rasgo: Informar rasgo de projeto e rago atual no produto, informar próxima montagem possíveis impactos tais como borda da furação afetada, atrito ou folga"
      },
      {
        "id": "forma-ma-conformacao-dobra-rasgo-angulo-chanfro-raio-angulo-informar-angulo-de-projeto-e-angulo-atual-no-produto-informar-proxima-montagem-possiveis-impactos-tais-como-borda-da-furacao-afetada-atrito-ou-folga",
        "description": "Ângulo: Informar ângulo de projeto e ângulo atual no produto, informar próxima montagem possíveis impactos tais como borda da furação afetada, atrito ou folga"
      },
      {
        "id": "forma-ma-conformacao-dobra-rasgo-angulo-chanfro-raio-chanfro-informar-dimensao-do-chanfro-atual-no-produto-e-condicao-de-projeto-informar-proxima-montagem-possiveis-impactos-tais-como-borda-da-furacao-afetada-atrito-ou-folga",
        "description": "Chanfro: Informar dimensão do chanfro atual no produto e condição de projeto, informar próxima montagem possíveis impactos tais como borda da furação afetada, atrito ou folga"
      },
      {
        "id": "forma-ma-conformacao-dobra-rasgo-angulo-chanfro-raio-raio-informar-raio-de-projeto-e-raio-atual-no-produto-informar-proxima-montagem-possiveis-impactos-tais-como-borda-da-furacao-afetada-atrito-ou-folga",
        "description": "Raio: Informar raio de projeto e raio atual no produto, informar próxima montagem possíveis impactos tais como borda da furação afetada, atrito ou folga."
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "84"
  },
  {
    "type": "Trinca na Camada de Cromo",
    "normalizedType": "trinca na camada de cromo",
    "requirements": [
      {
        "id": "trinca-na-camada-de-cromo-informar-foto-do-local-proxima-montagem-e-dimensionamento-da-trinca",
        "description": "Informar foto do local, próxima montagem e dimensionamento da trinca"
      }
    ],
    "engineeringStandards": [
      "N/A"
    ],
    "sourceRow": "85"
  }
];
  const GENERATED_NC_TYPES = ANEXO_6_2_ROWS
    .map((row) => String(row?.type || row?.ncType || "").replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const NC_TYPES_EFFECTIVE = GENERATED_NC_TYPES.length ? GENERATED_NC_TYPES : NC_TYPES;
  const NC_NUMBERED_COUNT = (() => {
    if (!ANEXO_6_2_ROWS.length) return NC_TYPES_EFFECTIVE.length;
    const numbered = new Set(
      ANEXO_6_2_ROWS
        .map((row) => String(row?.sourceRow || "").trim())
        .filter(Boolean)
    );
    return numbered.size || NC_TYPES_EFFECTIVE.length;
  })();

  const RECORDS = [];

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

  const ANEXO_5529_GENERIC_REQUIREMENTS = [
    { id: "req-01", label: "Caracterização da condição encontrada", mandatory: true, allowNA: false, fieldType: "text", status: "not-started", value: "", hint: "Descreva as informações indicadas pelo Anexo 02 - 5529 para o tipo selecionado." },
    { id: "req-02", label: "Valor ou dimensão medida", mandatory: true, allowNA: false, fieldType: "number", status: "not-started", value: "", hint: "Informe o valor medido e a unidade aplicável." },
    { id: "req-03", label: "Referência do desenho ou especificação", mandatory: true, allowNA: false, fieldType: "text", status: "not-started", value: "", hint: "Informe a NE, DOCEMB, desenho ou procedimento aplicável." },
    { id: "req-04", label: "Localização da condição", mandatory: true, allowNA: false, fieldType: "text", status: "not-started", value: "" },
    { id: "req-05", label: "Método de detecção ou inspeção", mandatory: true, allowNA: false, fieldType: "select", status: "not-started", value: "", options: ["Inspeção visual", "Medição", "Teste funcional", "Inspeção dimensional", "Outro"] },
    { id: "req-06", label: "Disposição ou ação complementar", mandatory: false, allowNA: true, fieldType: "text", status: "not-started", value: "", hint: "Use as ações complementares indicadas no Anexo 02 quando aplicável." },
  ];

  const NC_REQUIREMENT_PROFILES = Object.freeze({
    "Vazamento": { source: "Anexo 02 - 5529 · item 46", standards: ["NE-13-00003"], requirements: VAZAMENTO_REQUIREMENTS },
    "Assimetria": { source: "Anexo 02 - 5529 · item 3", standards: ["NE02-046", "NE02-044"], requirements: [
      { id: "req-01", label: "Valor atual da assimetria", mandatory: true, allowNA: false, fieldType: "number", status: "not-started", value: "", hint: "Informe o valor medido com unidade." },
      { id: "req-02", label: "Dados da planilha ou desenho", mandatory: true, allowNA: false, fieldType: "text", status: "not-started", value: "" },
      { id: "req-03", label: "Referência normativa aplicável", mandatory: true, allowNA: false, fieldType: "text", status: "not-started", value: "" },
    ] },
    "Ajuste excessivo": { source: "Anexo 02 - 5529 · item 2", standards: ["NE 20-038 · item 9.10"], requirements: [
      { id: "req-01", label: "Dimensão da área afetada", mandatory: true, allowNA: false, fieldType: "number", status: "not-started", value: "" },
      { id: "req-02", label: "Distância de borda", mandatory: true, allowNA: false, fieldType: "number", status: "not-started", value: "" },
      { id: "req-03", label: "Referência do desenho ou especificação", mandatory: true, allowNA: false, fieldType: "text", status: "not-started", value: "" },
    ] },
    "Comprimento / Largura / Altura (Dimensional)": { source: "Anexo 02 - 5529", standards: [], requirements: [
      { id: "req-01", label: "Dimensão nominal", mandatory: true, allowNA: false, fieldType: "number", status: "not-started", value: "" },
      { id: "req-02", label: "Dimensão medida", mandatory: true, allowNA: false, fieldType: "number", status: "not-started", value: "" },
      { id: "req-03", label: "Tolerância especificada", mandatory: true, allowNA: false, fieldType: "number", status: "not-started", value: "" },
      { id: "req-04", label: "Referência do desenho ou NE", mandatory: true, allowNA: false, fieldType: "text", status: "not-started", value: "" },
    ] },
  });

  function requirementsForType(type) {
    const profile = NC_REQUIREMENT_PROFILES[type];
    return (profile?.requirements || ANEXO_5529_GENERIC_REQUIREMENTS).map((requirement) => ({ ...requirement }));
  }

  function profileForType(type) {
    return NC_REQUIREMENT_PROFILES[type] || { source: "Anexo 02 - 5529", standards: [], requirements: ANEXO_5529_GENERIC_REQUIREMENTS };
  }

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
    NC_TYPES: NC_TYPES_EFFECTIVE,
    NC_NUMBERED_COUNT,
    ANEXO_6_2_ROWS,
    RECORDS,
    DEMO_RECORD_ID,
    VAZAMENTO_REQUIREMENTS,
    NC_REQUIREMENT_PROFILES,
    requirementsForType,
    profileForType,
    TIMELINE_STEPS,
    ACTIVITY_EVENTS,
    MOCK_LOOKUP,
    FORM_STEPS,
    CONTEXT_TIPS,
  });
})();

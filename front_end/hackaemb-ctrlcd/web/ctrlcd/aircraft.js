/* ==========================================================================
   Ctrl + CD — Localizador de peça na aeronave (vista superior em SVG)
   Portado de FRONT-END_HACKAEMB/src/ctrlcd/components/Aircraft3DModal.tsx.

   Esta é uma SIMULAÇÃO de modelo 3D: uma aeronave genérica desenhada em SVG,
   com seis níveis hierárquicos e zoom animado. Não há modelo real, CATIA,
   AIPC ou qualquer integração corporativa.

   Dados: os códigos de PN das zonas são FICTÍCIOS. Materiais foram marcados
   como "A DEFINIR" porque o protótipo os afirmava sem fonte. Os capítulos ATA
   indicam apenas o capítulo genérico da especificação ATA iSpec 2200.

   Uso:
     CtrlCDAircraft.open({ current: "texto atual", onConfirm(regiao) {...} })
   ========================================================================== */
(() => {
  "use strict";

  const { h, icon, append, trapEscape, SVG_NS } = window.CtrlCDUI;

  /* replaceChildren() converte null em texto "null"; este helper ignora vazios. */
  const fill = (el, ...kids) => {
    el.replaceChildren();
    append(el, kids);
  };

  const ZONES = {
    nose: { label: "Nariz / Cockpit", system: "Estrutura primária", focusCx: 110, focusCy: 245, zoom: 4, component: "Radome / para-brisas", pn: "NS-001 (fictício)", ata: "ATA 53" },
    fusDiant: { label: "Fuselagem dianteira", system: "Estrutura primária", focusCx: 322, focusCy: 245, zoom: 2.8, component: "Painel de revestimento dianteiro", pn: "FD-2240 (fictício)", ata: "ATA 53" },
    fusCentral: { label: "Fuselagem central", system: "Estrutura primária", focusCx: 515, focusCy: 245, zoom: 2.8, component: "Região do caixão central", pn: "FC-4450 (fictício)", ata: "ATA 53" },
    fusTraseira: { label: "Fuselagem traseira", system: "Estrutura primária", focusCx: 708, focusCy: 245, zoom: 2.8, component: "Painel de revestimento traseiro", pn: "FT-6610 (fictício)", ata: "ATA 53" },
    caudaAPU: { label: "Cone de cauda / APU", system: "Estrutura / APU", focusCx: 880, focusCy: 245, zoom: 4, component: "Cone de cauda", pn: "TC-0100 (fictício)", ata: "ATA 49 / 53" },
    asaEsq: { label: "Asa esquerda", system: "Superfícies de sustentação", focusCx: 470, focusCy: 385, zoom: 2.5, component: "Painel de revestimento da asa esquerda", pn: "WL-3320 (fictício)", ata: "ATA 57" },
    asaDir: { label: "Asa direita", system: "Superfícies de sustentação", focusCx: 470, focusCy: 105, zoom: 2.5, component: "Painel de revestimento da asa direita", pn: "WR-3320 (fictício)", ata: "ATA 57" },
    motEsq: { label: "Motor esquerdo", system: "Sistema propulsivo", focusCx: 510, focusCy: 372, zoom: 4.5, component: "Nacela do motor esquerdo", pn: "ENG-L-001 (fictício)", ata: "ATA 71" },
    motDir: { label: "Motor direito", system: "Sistema propulsivo", focusCx: 510, focusCy: 118, zoom: 4.5, component: "Nacela do motor direito", pn: "ENG-R-001 (fictício)", ata: "ATA 71" },
    empHorizEsq: { label: "Empenagem horizontal esquerda", system: "Superfícies de controle", focusCx: 830, focusCy: 330, zoom: 4, component: "Estabilizador horizontal esquerdo", pn: "HTP-L-001 (fictício)", ata: "ATA 55" },
    empHorizDir: { label: "Empenagem horizontal direita", system: "Superfícies de controle", focusCx: 830, focusCy: 160, zoom: 4, component: "Estabilizador horizontal direito", pn: "HTP-R-001 (fictício)", ata: "ATA 55" },
  };

  const SECTION_TO_ZONE = {
    "Fuselagem – Nariz / Cockpit": "nose",
    "Fuselagem – Seção dianteira": "fusDiant",
    "Fuselagem – Seção central": "fusCentral",
    "Fuselagem – Seção traseira": "fusTraseira",
    "Fuselagem – Cone de cauda / APU": "caudaAPU",
    "Asa esquerda": "asaEsq",
    "Asa direita": "asaDir",
    "Nacela – Motor esquerdo": "motEsq",
    "Nacela – Motor direito": "motDir",
    "Empenagem horizontal esquerda": "empHorizEsq",
    "Empenagem horizontal direita": "empHorizDir",
  };

  const LEVELS = [
    { id: "aeronave", label: "Aeronave" },
    { id: "secao", label: "Seção" },
    { id: "sistema", label: "Sistema" },
    { id: "conjunto", label: "Conjunto" },
    { id: "componente", label: "Componente" },
    { id: "falha", label: "Área da falha" },
  ];

  const OPTIONS = {
    aeronave: ["Modelo demonstrativo · MSN 0000"],
    secao: Object.keys(SECTION_TO_ZONE),
    sistema: ["Estrutura primária", "Estrutura secundária", "Sistema propulsivo", "Sistema hidráulico", "Sistema elétrico / aviônica", "Superfícies de controle", "Sistema de combustível", "Sistema de pressurização e ar"],
    conjunto: ["Painel de revestimento", "Anteparo de pressão", "Longarina principal", "Cavername", "Caixão de asa", "Nacela / pilone", "Estabilizador horizontal", "Deriva / leme"],
    componente: ["Interface de conexão", "Suporte de fixação", "Vedação perimetral", "Parafuso de retenção", "Rebite estrutural", "Guarnição / enchimento", "Selante / tira de vedação"],
    falha: ["Interface inferior", "Flange de vedação", "Superfície exposta", "Ponto de fixação frontal", "Borda de ataque", "Borda de fuga"],
  };

  const SVG_W = 980;
  const SVG_H = 490;

  /* Desenho constante da aeronave genérica (sem dados do usuário). */
  function windows(xs, y, w) {
    return xs.map((x) => `<rect class="z-window" x="${x}" y="${y}" width="${w}" height="7" rx="2"/>`).join("");
  }

  const AIRCRAFT_MARKUP = `
    <path class="ac-body" d="M 62,245 C 72,228 92,213 138,210 L 825,210 C 858,210 878,218 904,228 C 924,236 940,242 948,245 C 940,248 924,254 904,262 C 878,272 858,280 825,280 L 138,280 C 92,277 72,262 62,245 Z"/>
    <g class="ac-zone" data-zone="asaDir">
      <path class="z-main" d="M 460,215 L 700,215 C 680,175 650,135 600,95 L 375,25 L 258,42 C 290,80 330,120 375,158 C 405,183 430,200 460,215 Z"/>
      <path class="z-detail" d="M 620,215 C 605,175 585,145 560,115 L 530,128 C 553,158 570,185 580,215 Z"/>
      <path class="z-main" d="M 258,42 L 240,18 L 275,30 Z"/>
      <text class="z-label" x="370" y="105" font-size="13">Asa DIR</text>
    </g>
    <g class="ac-zone" data-zone="asaEsq">
      <path class="z-main" d="M 460,275 L 700,275 C 680,315 650,355 600,395 L 375,465 L 258,448 C 290,410 330,370 375,332 C 405,307 430,290 460,275 Z"/>
      <path class="z-detail" d="M 620,275 C 605,315 585,345 560,375 L 530,362 C 553,332 570,305 580,275 Z"/>
      <path class="z-main" d="M 258,448 L 240,472 L 275,460 Z"/>
      <text class="z-label" x="370" y="395" font-size="13">Asa ESQ</text>
    </g>
    <g class="ac-zone" data-zone="motDir">
      <ellipse class="z-main" cx="510" cy="118" rx="130" ry="19"/>
      <ellipse class="z-detail" cx="385" cy="118" rx="18" ry="14"/>
      <path class="z-detail" d="M 490,137 L 510,155 L 530,155 L 510,137 Z"/>
      <text class="z-label" x="510" y="122" font-size="10">Motor DIR</text>
    </g>
    <g class="ac-zone" data-zone="motEsq">
      <ellipse class="z-main" cx="510" cy="372" rx="130" ry="19"/>
      <ellipse class="z-detail" cx="385" cy="372" rx="18" ry="14"/>
      <path class="z-detail" d="M 490,353 L 510,335 L 530,335 L 510,353 Z"/>
      <text class="z-label" x="510" y="376" font-size="10">Motor ESQ</text>
    </g>
    <g class="ac-zone" data-zone="empHorizDir">
      <path class="z-main" d="M 815,215 L 885,215 C 878,178 860,148 830,118 L 760,112 L 790,168 Z"/>
      <path class="z-detail" d="M 820,215 L 875,215 L 865,198 L 810,198 Z"/>
      <text class="z-label" x="820" y="160" font-size="9">EMP DIR</text>
    </g>
    <g class="ac-zone" data-zone="empHorizEsq">
      <path class="z-main" d="M 815,275 L 885,275 C 878,312 860,342 830,372 L 760,378 L 790,322 Z"/>
      <path class="z-detail" d="M 820,275 L 875,275 L 865,292 L 810,292 Z"/>
      <text class="z-label" x="820" y="338" font-size="9">EMP ESQ</text>
    </g>
    <g class="ac-zone" data-zone="nose">
      <path class="z-main" d="M 62,245 C 72,228 92,213 138,210 L 230,210 L 230,280 L 138,280 C 92,277 72,262 62,245 Z"/>
      <rect class="z-window" x="115" y="228" width="28" height="10" rx="3"/>
      <rect class="z-window" x="148" y="228" width="28" height="10" rx="3"/>
      <text class="z-label" x="160" y="262" font-size="11">Nariz</text>
    </g>
    <g class="ac-zone" data-zone="fusDiant">
      <rect class="z-main" x="230" y="210" width="185" height="70"/>
      <rect class="z-detail" x="248" y="210" width="22" height="16" rx="2"/>
      ${windows([278, 300, 322, 344, 366, 388], 215, 14)}${windows([278, 300, 322, 344, 366, 388], 268, 14)}
      <text class="z-label" x="322" y="249" font-size="11">Fus. dianteira</text>
    </g>
    <g class="ac-zone" data-zone="fusCentral">
      <rect class="z-main" x="415" y="210" width="200" height="70"/>
      <rect class="z-detail" x="422" y="210" width="22" height="16" rx="2"/>
      <rect class="z-exit" x="465" y="210" width="28" height="18" rx="2"/>
      <rect class="z-exit" x="565" y="210" width="28" height="18" rx="2"/>
      ${windows([500, 522, 544], 268, 13)}
      <text class="z-label" x="515" y="249" font-size="11">Fus. central</text>
    </g>
    <g class="ac-zone" data-zone="fusTraseira">
      <rect class="z-main" x="615" y="210" width="185" height="70"/>
      <rect class="z-detail" x="625" y="210" width="22" height="16" rx="2"/>
      <rect class="z-detail" x="770" y="210" width="22" height="16" rx="2"/>
      ${windows([655, 677, 699, 721, 743], 215, 14)}${windows([640, 662, 684, 718, 740, 762], 268, 14)}
      <text class="z-label" x="708" y="249" font-size="11">Fus. traseira</text>
    </g>
    <g class="ac-zone" data-zone="caudaAPU">
      <path class="z-main" d="M 800,210 L 825,210 C 858,210 878,218 904,228 C 924,236 940,242 948,245 C 940,248 924,254 904,262 C 878,272 858,280 825,280 L 800,280 Z"/>
      <circle class="z-detail" cx="940" cy="245" r="6"/>
      <path class="z-detail" d="M 840,245 L 940,241 L 948,245 L 940,249 Z"/>
      <text class="z-label" x="868" y="262" font-size="10">Cauda/APU</text>
    </g>
    <g class="ac-lines">
      <line x1="230" y1="210" x2="230" y2="280"/><line x1="415" y1="210" x2="415" y2="280"/>
      <line x1="615" y1="210" x2="615" y2="280"/><line x1="800" y1="210" x2="800" y2="280"/>
    </g>
    <circle class="ac-ping" r="22" cx="0" cy="0"/>
  `;

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, String(v));
    return el;
  }

  function open({ current = "", onConfirm, onClose } = {}) {
    const state = {
      hier: { aeronave: OPTIONS.aeronave[0], secao: "", sistema: "", conjunto: "", componente: "", falha: "" },
      activeLevel: "secao",
      activeZone: "",
      popupZone: "",
      manualZoom: 100,
    };

    /* Pré-seleciona a zona se a região atual começar por uma seção conhecida. */
    if (current) {
      const match = Object.keys(SECTION_TO_ZONE).find((s) => current.startsWith(s));
      if (match) state.activeZone = SECTION_TO_ZONE[match];
    }

    const overlay = h("div", { class: "ccd-ac-overlay", role: "dialog", "aria-modal": "true", "aria-labelledby": "ccdAcTitle" });
    const shell = h("div", { class: "ccd-ac" });
    overlay.appendChild(shell);

    const side = h("div", { class: "ccd-ac__side" });
    const main = h("div", { class: "ccd-ac__main" });
    shell.append(side, main);

    const topbar = h("div", { class: "ccd-ac__topbar" });
    const viewer = h("div", { class: "ccd-ac__viewer" });
    const bottombar = h("div", { class: "ccd-ac__bottombar" });
    main.append(topbar, viewer, bottombar);

    /* SVG principal persistente: a transição de zoom depende disso. */
    const svg = svgEl("svg", { viewBox: `0 0 ${SVG_W} ${SVG_H}`, class: "ccd-ac__svg", role: "group", "aria-label": "Aeronave genérica em vista superior" });
    const group = svgEl("g", { class: "ccd-ac__group" });
    group.innerHTML = AIRCRAFT_MARKUP; // desenho constante
    svg.appendChild(group);
    const popupHost = h("div", { class: "ccd-ac__popuphost" });
    const legend = h(
      "div",
      { class: "ccd-ac__legend" },
      h("span", { class: "ccd-ac__swatch ccd-ac__swatch--sel" }),
      "Selecionado",
      h("span", { class: "ccd-ac__swatch" }),
      "Disponível",
      h("span", { class: "ccd-ac__legend-note" }, "· Aeronave genérica · dados fictícios")
    );
    viewer.append(svg, popupHost, legend);

    for (const zoneEl of group.querySelectorAll(".ac-zone")) {
      const id = zoneEl.dataset.zone;
      zoneEl.setAttribute("tabindex", "0");
      zoneEl.setAttribute("role", "button");
      zoneEl.setAttribute("aria-label", `Selecionar ${ZONES[id].label}`);
      zoneEl.addEventListener("click", () => selectZone(id));
      zoneEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectZone(id);
        }
      });
    }

    /* Roda do mouse: aproxima/afasta dentro do visualizador apenas. */
    viewer.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        state.manualZoom = Math.max(50, Math.min(200, state.manualZoom + (event.deltaY < 0 ? 10 : -10)));
        paint();
      },
      { passive: false }
    );

    function selectZone(id) {
      state.activeZone = id;
      state.popupZone = id;
      paint();
    }

    function setLevel(level, value) {
      const idx = LEVELS.findIndex((l) => l.id === level);
      state.hier[level] = value;
      for (const l of LEVELS.slice(idx + 1)) state.hier[l.id] = "";
      const next = LEVELS[idx + 1];
      state.activeLevel = next ? next.id : level;
      if (level === "secao" && SECTION_TO_ZONE[value]) {
        state.activeZone = SECTION_TO_ZONE[value];
        state.popupZone = "";
      }
      paint();
    }

    function editLevel(level) {
      const idx = LEVELS.findIndex((l) => l.id === level);
      for (const l of LEVELS.slice(idx)) state.hier[l.id] = "";
      state.activeLevel = level;
      if (level === "secao") {
        state.activeZone = "";
        state.popupZone = "";
      }
      paint();
    }

    function resetView() {
      state.activeZone = "";
      state.popupZone = "";
      state.manualZoom = 100;
      paint();
    }

    function breadcrumb() {
      return LEVELS.filter((l) => l.id !== "aeronave" && state.hier[l.id])
        .map((l) => state.hier[l.id].split("–").pop().trim())
        .join(" › ");
    }

    function effectiveZoom() {
      const zone = ZONES[state.activeZone];
      return (zone ? zone.zoom : 1) * (state.manualZoom / 100);
    }

    function regionText() {
      const parts = LEVELS.filter((l) => l.id !== "aeronave" && state.hier[l.id]).map((l) => state.hier[l.id]);
      if (parts.length) return parts.join(" · ");
      return ZONES[state.activeZone]?.label || "";
    }

    function paint() {
      /* Zoom e destaque do SVG. */
      const zone = ZONES[state.activeZone];
      const z = effectiveZoom();
      const cx = zone ? zone.focusCx : SVG_W / 2;
      const cy = zone ? zone.focusCy : SVG_H / 2;
      group.style.transform = `translate(${SVG_W / 2 - cx * z}px, ${SVG_H / 2 - cy * z}px) scale(${z})`;
      for (const el of group.querySelectorAll(".ac-zone")) {
        const active = el.dataset.zone === state.activeZone;
        el.classList.toggle("is-active", active);
        el.classList.toggle("is-dimmed", Boolean(state.activeZone) && !active);
        el.setAttribute("aria-pressed", String(active));
      }
      const ping = group.querySelector(".ac-ping");
      ping.style.display = zone ? "" : "none";
      if (zone) {
        ping.setAttribute("cx", zone.focusCx);
        ping.setAttribute("cy", zone.focusCy);
      }

      paintSide();
      paintTopbar();
      paintPopup();
      paintBottombar();
    }

    function paintSide() {
      fill(side,
        h("div", { class: "ccd-ac__sidehead" }, h("p", { class: "ccd-eyebrow" }, "Modelo"), h("p", { class: "ccd-ac__model", id: "ccdAcTitle" }, "Localizar peça na aeronave")),
        breadcrumb() ? h("div", { class: "ccd-ac__crumb" }, breadcrumb()) : null,
        h(
          "ol",
          { class: "ccd-ac__levels" },
          LEVELS.map((level) => {
            const value = state.hier[level.id];
            const isActive = state.activeLevel === level.id && !value;
            return h(
              "li",
              { class: `ccd-ac__level${value ? " is-done" : ""}${isActive ? " is-active" : ""}` },
              h("p", { class: "ccd-ac__levelname" }, level.label),
              value
                ? h(
                    "div",
                    { class: "ccd-ac__levelvalue" },
                    h("span", { class: "ccd-ac__check" }, icon("check", 9)),
                    h("span", { class: "ccd-ac__levelvaluetext", title: value }, value),
                    level.id !== "aeronave" ? h("button", { class: "ccd-link", type: "button", onclick: () => editLevel(level.id) }, "Alterar") : null
                  )
                : isActive
                ? h("div", { class: "ccd-ac__levelpending" }, h("span", { class: "ccd-pulse-dot" }), "Selecionando…")
                : h("div", { class: "ccd-ac__levelempty" }, "—")
            );
          })
        ),
        h(
          "div",
          { class: "ccd-ac__options" },
          h("p", { class: "ccd-ac__optionshead" }, `Selecione: ${LEVELS.find((l) => l.id === state.activeLevel).label}`),
          h(
            "div",
            { class: "ccd-ac__optionslist", role: "listbox", "aria-label": "Opções do nível atual" },
            OPTIONS[state.activeLevel].map((opt) =>
              h(
                "button",
                {
                  type: "button",
                  role: "option",
                  "aria-selected": String(state.hier[state.activeLevel] === opt),
                  class: `ccd-ac__option${state.hier[state.activeLevel] === opt ? " is-selected" : ""}`,
                  onclick: () => setLevel(state.activeLevel, opt),
                },
                h("span", { class: "ccd-ac__optiondot" }),
                opt
              )
            )
          )
        )
      );
    }

    function paintTopbar() {
      const minimap = svgEl("svg", { viewBox: `0 0 ${SVG_W} ${SVG_H}`, class: "ccd-ac__minimap", "aria-hidden": "true" });
      const mini = svgEl("g", { class: "ccd-ac__group is-mini" });
      mini.innerHTML = AIRCRAFT_MARKUP; // desenho constante
      for (const el of mini.querySelectorAll(".ac-zone")) el.classList.toggle("is-active", el.dataset.zone === state.activeZone);
      mini.querySelector(".ac-ping").style.display = "none";
      minimap.appendChild(mini);

      const crumb = breadcrumb();
      fill(topbar,
        h(
          "div",
          { class: "ccd-ac__crumbbar" },
          crumb ? h("span", { class: "ccd-chip" }, icon("home", 12), `Aeronave › ${crumb}`) : h("span", { class: "ccd-muted" }, "Clique em uma região ou selecione uma seção para começar")
        ),
        h(
          "div",
          { class: "ccd-ac__tools" },
          h("div", { class: "ccd-ac__minimapbox", title: "Minimapa de orientação" }, minimap),
          h(
            "div",
            { class: "ccd-ac__zoom", role: "group", "aria-label": "Controles de zoom" },
            h("button", { type: "button", class: "ccd-iconbtn", "aria-label": "Afastar", onclick: () => { state.manualZoom = Math.max(50, state.manualZoom - 15); paint(); } }, icon("minus", 14)),
            h("span", { class: "ccd-ac__zoomvalue", "aria-live": "polite" }, `${Math.round(effectiveZoom() * 100)}%`),
            h("button", { type: "button", class: "ccd-iconbtn", "aria-label": "Aproximar", onclick: () => { state.manualZoom = Math.min(200, state.manualZoom + 15); paint(); } }, icon("plus", 14))
          ),
          state.activeZone ? h("button", { type: "button", class: "ccd-btn ccd-btn--soft ccd-btn--sm", onclick: resetView }, "← Aeronave completa") : null,
          h("button", { type: "button", class: "ccd-iconbtn ccd-iconbtn--bordered", "aria-label": "Fechar localizador", onclick: close }, icon("x", 16))
        )
      );
    }

    function paintPopup() {
      const zone = ZONES[state.popupZone];
      if (!zone) {
        popupHost.replaceChildren();
        return;
      }
      const section = Object.entries(SECTION_TO_ZONE).find(([, v]) => v === state.popupZone)?.[0];
      fill(popupHost,
        h(
          "div",
          { class: "ccd-ac__popup", role: "dialog", "aria-label": `Informações de ${zone.label}` },
          h(
            "div",
            { class: "ccd-ac__popuphead" },
            h("span", { class: "ccd-dot ccd-dot--blue" }),
            h("strong", null, zone.label),
            h("button", { type: "button", class: "ccd-iconbtn", "aria-label": "Fechar informações", onclick: () => { state.popupZone = ""; paint(); } }, icon("x", 14))
          ),
          h(
            "dl",
            { class: "ccd-kv" },
            [
              ["Sistema", zone.system],
              ["Componente", zone.component],
              ["PN de referência", zone.pn],
              ["Material", "A DEFINIR"],
              ["Capítulo ATA", zone.ata],
              ["Origem", "Sugestão do sistema"],
            ].map(([k, v]) => [h("dt", null, k), h("dd", null, v)])
          ),
          h("p", { class: "ccd-note ccd-note--warn" }, "A localização e a classificação devem ser verificadas pelo técnico."),
          h(
            "button",
            {
              type: "button",
              class: "ccd-btn ccd-btn--primary ccd-btn--block",
              onclick: () => {
                if (section) setLevel("secao", section);
                state.popupZone = "";
                paint();
              },
            },
            "Selecionar esta seção →"
          )
        )
      );
    }

    function paintBottombar() {
      const idx = LEVELS.findIndex((l) => l.id === state.activeLevel);
      const canConfirm = Boolean(regionText());
      fill(bottombar,
        h(
          "div",
          { class: "ccd-ac__status" },
          h("span", null, `Nível ${idx + 1} de 6 · ${LEVELS[idx].label}`),
          ZONES[state.activeZone] ? h("span", { class: "ccd-chip ccd-chip--blue" }, ZONES[state.activeZone].label) : null
        ),
        h(
          "div",
          { class: "ccd-ac__actions" },
          h("button", { type: "button", class: "ccd-btn ccd-btn--ghost", onclick: close }, "Cancelar"),
          h(
            "button",
            {
              type: "button",
              class: "ccd-btn ccd-btn--primary",
              disabled: !canConfirm,
              title: canConfirm ? "Confirmar a localização selecionada" : "Selecione ao menos uma seção",
              onclick: () => {
                const region = regionText();
                if (!region) return;
                close();
                onConfirm?.(region);
              },
            },
            icon("check", 14),
            "Confirmar localização"
          )
        )
      );
    }

    const releaseEscape = trapEscape(close);
    function close() {
      releaseEscape();
      overlay.remove();
      onClose?.();
    }
    overlay.addEventListener("mousedown", (event) => {
      if (event.target === overlay) close();
    });

    document.body.appendChild(overlay);
    paint();
    side.querySelector(".ccd-ac__option")?.focus();
  }

  window.CtrlCDAircraft = Object.freeze({ open, ZONES, SECTION_TO_ZONE });
})();

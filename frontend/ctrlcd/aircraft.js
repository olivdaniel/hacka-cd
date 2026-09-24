/* ==========================================================================
   Ctrl + CD — Localizador de peça na aeronave: vistas técnicas (2D).

   Fallback do visualizador 3D (seção 18 da especificação): usado quando o WebGL não está
   disponível, quando o GLB falha, quando o 3D está desligado ou quando o usuário escolhe
   "Usar vistas técnicas (2D)".

   Desenho: a vista superior técnica CORRIGIDA do protótipo 2D (ctrlcd/aircraft-top-view.js),
   com as 87 regiões da hierarquia compartilhada (ctrlcd/aircraft-hierarchy.js) como grupos
   aninhados. O desenho genérico antigo (deformado) foi removido.
   Modelo visual demonstrativo: não representa geometria CAD oficial ou certificada.

   Permite: selecionar a região nível a nível (clique no desenho ou lista), marcar um ponto
   aproximado na vista superior, confirmar localização parcial e continuar o formulário.

   Uso (mesmo contrato de antes):
     CtrlCDAircraft.open({ current, location, onConfirm(texto, detalhe), onClose })
   `texto` é o de regionSelected (igual ao do 3D); `detalhe` traz a AircraftLocation
   (source "2d", ponto aproximado opcional) e uma captura do desenho.
   ========================================================================== */
(() => {
  "use strict";

  const { h, icon, append, trapEscape } = window.CtrlCDUI;
  const HIER = window.CtrlCDAircraftHierarchy;
  const TOP = window.CtrlCDAircraftTopView;
  const PENDING_TEXT = "Ponto aproximado marcado, aguardando confirmação.";
  const DISCLAIMER = "Modelo visual demonstrativo. Não representa geometria CAD oficial ou certificada.";

  /* replaceChildren() converte null em texto "null"; este helper ignora vazios. */
  const fill = (el, ...kids) => {
    el.replaceChildren();
    append(el, kids);
  };

  /* Rótulos das zonas do desenho antigo (mantidos só para compatibilidade da API; não exibidos). */
  const ZONES = Object.freeze({
    nose: { label: "Nariz / Cockpit" }, fusDiant: { label: "Fuselagem dianteira" }, fusCentral: { label: "Fuselagem central" },
    fusTraseira: { label: "Fuselagem traseira" }, caudaAPU: { label: "Cone de cauda / APU" }, asaEsq: { label: "Asa esquerda" },
    asaDir: { label: "Asa direita" }, motEsq: { label: "Motor esquerdo" }, motDir: { label: "Motor direito" },
    empHorizEsq: { label: "Empenagem horizontal esquerda" }, empHorizDir: { label: "Empenagem horizontal direita" },
  });
  /* Textos de localização no formato antigo → zona (para converter a pré-seleção). */
  const SECTION_TO_ZONE = Object.freeze({
    "Fuselagem – Nariz / Cockpit": "nose", "Fuselagem – Seção dianteira": "fusDiant", "Fuselagem – Seção central": "fusCentral",
    "Fuselagem – Seção traseira": "fusTraseira", "Fuselagem – Cone de cauda / APU": "caudaAPU", "Asa esquerda": "asaEsq",
    "Asa direita": "asaDir", "Nacela – Motor esquerdo": "motEsq", "Nacela – Motor direito": "motDir",
    "Empenagem horizontal esquerda": "empHorizEsq", "Empenagem horizontal direita": "empHorizDir",
  });
  const ZONE_REGION = Object.freeze({
    nose: "nose", fusDiant: "fuselage_forward", fusCentral: "fuselage_center", fusTraseira: "fuselage_rear",
    caudaAPU: "tail_cone", asaEsq: "wing_left", asaDir: "wing_right", motEsq: "engine_left", motDir: "engine_right",
    empHorizEsq: "horizontal_stabilizer_left", empHorizDir: "horizontal_stabilizer_right",
  });

  const LEVELS = [1, 2, 3, 4, 5, 6].map((level) => ({ level, label: HIER.LEVEL_LABELS[level] }));
  const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  /* Caminho inicial: localização estruturada; senão o texto (hierarquia ou formato antigo). */
  function initialPath(current, location) {
    const chainOk = (ids) => ids.length > 1 && ids.every((id, i) => (i === 0 ? id === HIER.ROOT_ID : HIER.get(id) && HIER.get(id).parentId === ids[i - 1]));
    if (location && Array.isArray(location.locationIds)) {
      const ids = [HIER.ROOT_ID, ...location.locationIds];
      if (chainOk(ids)) return ids;
    }
    const path = HIER.pathFromLabel(current);
    if (path.length > 1) return path;
    const legacy = Object.keys(SECTION_TO_ZONE).find((sec) => String(current || "").startsWith(sec));
    return legacy ? HIER.pathOf(ZONE_REGION[SECTION_TO_ZONE[legacy]]) : [HIER.ROOT_ID];
  }

  /* Desenho: o SVG técnico é analisado como XML e importado (constante, sem dados do usuário). */
  function buildSvg() {
    const doc = new DOMParser().parseFromString(TOP.markup, "image/svg+xml");
    const svg = document.importNode(doc.documentElement, true);
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("class", "ccd-ac2__svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Vista superior técnica da aeronave (modelo demonstrativo). Use a lista de níveis para selecionar pelo teclado.");
    svg.setAttribute("viewBox", TOP.displayViewBox);
    svg.querySelectorAll("title, desc").forEach((n) => n.remove());
    for (const g of svg.querySelectorAll("g.region")) {
      g.removeAttribute("role");
      g.removeAttribute("aria-label");
    }
    const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    layer.setAttribute("class", "ccd-ac2__markerlayer");
    layer.setAttribute("pointer-events", "none");
    svg.appendChild(layer);
    return svg;
  }

  function open({ current = "", location = null, onConfirm, onClose } = {}) {
    const state = {
      path: initialPath(current, location),
      hoverId: "",
      markMode: false,
      /* ponto aproximado: coordenadas do desenho + metros; só números */
      point: null,
      zoom: 1,
      fullView: false,
    };
    if (location && location.source === "2d" && location.approximatePoint) {
      const ap = location.approximatePoint;
      if (state.path.includes(ap.regionId)) state.point = { ...ap, confirmed: false };
    }
    const deepest = () => state.path[state.path.length - 1];
    const activeLevel = () => (HIER.hasChildren(deepest()) ? state.path.length + 1 : state.path.length);

    const overlay = h("div", { class: "ccd-ac-overlay", role: "dialog", "aria-modal": "true", "aria-labelledby": "ccdAcTitle", "aria-describedby": "ccdAcNotice" });
    const shell = h("div", { class: "ccd-ac ccd-ac2" });
    overlay.appendChild(shell);
    const side = h("div", { class: "ccd-ac__side" });
    const main = h("div", { class: "ccd-ac__main" });
    shell.append(side, main);
    const topbar = h("div", { class: "ccd-ac__topbar" });
    const viewer = h("div", { class: "ccd-ac__viewer ccd-ac2__viewer" });
    const bottombar = h("div", { class: "ccd-ac__bottombar" });
    const live = h("p", { class: "ccd-a3d__sr", "aria-live": "polite", "data-ac": "live" });
    main.append(topbar, viewer, bottombar, live);

    const svg = buildSvg();
    const markerLayer = svg.querySelector(".ccd-ac2__markerlayer");
    const tip = h("div", { class: "ccd-ac2__tip", role: "tooltip", hidden: true, "data-ac": "tooltip" });
    const notice = h("p", { class: "ccd-ac2__notice", id: "ccdAcNotice" }, icon("info", 12), DISCLAIMER);
    viewer.append(svg, tip, notice);

    const groupOf = (id) => svg.querySelector(`g.region[data-region-id="${id}"]`);
    const regionFromEvent = (target) => (target instanceof Element ? target.closest("g.region") : null);
    /* Filho direto da região mais profunda que contém o elemento atingido (um nível por vez). */
    function targetFrom(el) {
      const parent = deepest();
      for (let g = regionFromEvent(el); g; g = g.parentElement ? g.parentElement.closest("g.region") : null) {
        if (g.getAttribute("data-parent") === parent) return g.getAttribute("data-region-id");
      }
      return null;
    }
    const inDeepest = (el) => {
      const g = groupOf(deepest());
      return Boolean(g && el instanceof Element && g.contains(el));
    };

    // ---------- enquadramento (viewBox animado) ----------
    const full = TOP.displayViewBox.split(/\s+/).map(Number);
    let vb = [...full];
    let raf = 0;
    function targetViewBox() {
      const g = state.fullView || deepest() === HIER.ROOT_ID ? null : groupOf(deepest());
      let box = full;
      if (g) {
        const b = g.getBBox();
        const side2 = Math.max(b.width, b.height) * 1.6 + 40;
        const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        box = [cx - side2 / 2, cy - side2 / 2, side2, side2];
      }
      const z = state.zoom;
      const w = Math.min(full[2] * 1.4, box[2] / z), hh = Math.min(full[3] * 1.4, box[3] / z);
      return [box[0] + box[2] / 2 - w / 2, box[1] + box[3] / 2 - hh / 2, w, hh];
    }
    function frame() {
      const to = targetViewBox();
      cancelAnimationFrame(raf);
      if (reducedMotion()) { vb = to; svg.setAttribute("viewBox", vb.join(" ")); paintSvg(); return; }
      const from = [...vb];
      const t0 = performance.now();
      const step = () => {
        const t = Math.min(1, (performance.now() - t0) / 450);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        vb = from.map((v, i) => v + (to[i] - v) * e);
        svg.setAttribute("viewBox", vb.map((v) => v.toFixed(2)).join(" "));
        if (t < 1) raf = requestAnimationFrame(step);
        else paintSvg();
      };
      raf = requestAnimationFrame(step);
    }

    // ---------- estado visual do desenho ----------
    function paintSvg() {
      const path = new Set(state.path.slice(1));
      const d = deepest();
      svg.classList.toggle("has-focus", d !== HIER.ROOT_ID);
      svg.classList.toggle("is-marking", state.markMode);
      for (const g of svg.querySelectorAll("g.region")) {
        const id = g.getAttribute("data-region-id");
        g.classList.toggle("is-path", path.has(id) && id !== d);
        g.classList.toggle("is-current", id === d && d !== HIER.ROOT_ID);
        g.classList.toggle("is-option", g.getAttribute("data-parent") === d && !state.markMode);
        g.classList.toggle("is-hover", id === state.hoverId);
      }
      markerLayer.replaceChildren();
      if (state.point) {
        const [x, y] = state.point.svg;
        const r = Math.max(3, vb[2] / 80);
        const ns = "http://www.w3.org/2000/svg";
        const ring = document.createElementNS(ns, "circle");
        ring.setAttribute("cx", x); ring.setAttribute("cy", y); ring.setAttribute("r", r);
        ring.setAttribute("class", `ccd-ac2__pin${state.point.confirmed ? " is-confirmed" : ""}`);
        ring.setAttribute("data-ac", "pin");
        const dot = document.createElementNS(ns, "circle");
        dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", r * 0.35);
        dot.setAttribute("class", "ccd-ac2__pindot");
        markerLayer.append(ring, dot);
      }
    }

    // ---------- ações ----------
    function choose(regionId) {
      const r = HIER.get(regionId);
      if (!r || r.parentId !== deepest()) return;
      state.path = HIER.pathOf(regionId);
      state.hoverId = "";
      state.fullView = false;
      if (state.point && !pointInRegion(regionId, state.point.svg)) {
        // o ponto aproximado não está dentro da região escolhida
        state.point = null;
        live.textContent = `${r.label} selecionada. O ponto aproximado ficou fora da região e foi removido.`;
      } else {
        live.textContent = `${r.label} selecionada (nível ${r.level}).`;
      }
      if (state.point) state.point = { ...state.point, regionId: deepest() };
      frame();
      paint();
    }

    function editLevel(level) {
      state.path = state.path.slice(0, Math.max(1, level - 1));
      state.markMode = false;
      state.fullView = false;
      if (state.point) state.point = state.path.length > 1 ? { ...state.point, regionId: deepest() } : null;
      live.textContent = `Nível ${level} reaberto para escolha.`;
      frame();
      paint();
    }

    /* O ponto (coordenadas do desenho) está dentro de alguma forma da região? */
    function pointInRegion(id, xy) {
      const g = groupOf(id);
      if (!g) return false;
      const p = new DOMPoint(xy[0], xy[1]);
      return [...g.querySelectorAll(".shape")].some((el) => typeof el.isPointInFill === "function" && el.isPointInFill(p));
    }

    function toSvgPoint(clientX, clientY) {
      const m = svg.getScreenCTM();
      if (!m) return null;
      const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
      return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
    }

    function placePoint(xy) {
      const [x, y] = xy;
      const s = (y - TOP.origin.noseY) / TOP.unitsPerMeter;
      const lat = (x - TOP.origin.lateralX) / TOP.unitsPerMeter;
      state.point = {
        view: "top", viewLabel: TOP.label, regionId: deepest(), svg: [x, y],
        longitudinal_m: Math.round(s * 100) / 100, lateral_m: Math.round(lat * 100) / 100, confirmed: false,
      };
      state.markMode = false;
      live.textContent = `${PENDING_TEXT} ${HIER.get(deepest()).label}.`;
      paint();
      bottombar.querySelector("[data-ac=confirm]")?.focus();
    }

    /* Alternativa por teclado: marca no ponto da região mais próximo do centro da sua caixa. */
    function markAtCenter() {
      const g = groupOf(deepest());
      if (!g) return;
      const b = g.getBBox();
      const r = svg.getBoundingClientRect();
      const toClient = (px, py) => {
        const m = svg.getScreenCTM();
        const q = new DOMPoint(px, py).matrixTransform(m);
        return [q.x, q.y];
      };
      for (let k = 0; k <= 13; k++) {
        const dirs = k === 0 ? [[0, 0]] : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
        for (const [dx, dy] of dirs) {
          const px = b.x + b.width / 2 + dx * k * b.width / 26, py = b.y + b.height / 2 + dy * k * b.height / 26;
          const [cx, cy] = toClient(px, py);
          if (cx < r.left || cy < r.top || cx > r.right || cy > r.bottom) continue;
          if (inDeepest(document.elementFromPoint(cx, cy))) { placePoint([Math.round(px * 10) / 10, Math.round(py * 10) / 10]); return; }
        }
      }
      live.textContent = "Não foi possível marcar automaticamente; clique sobre a região.";
    }

    // ---------- eventos do desenho ----------
    function showTip(lines, x, y, info) {
      tip.replaceChildren(...lines.map((t, i) => h("div", { class: i ? "ccd-ac2__tipmeta" : "ccd-ac2__tiptitle" }, t)));
      tip.classList.toggle("is-info", Boolean(info));
      tip.hidden = false;
      const vr = viewer.getBoundingClientRect();
      tip.style.left = Math.min(vr.width - tip.offsetWidth - 8, Math.max(8, x - vr.left + 14)) + "px";
      tip.style.top = Math.min(vr.height - tip.offsetHeight - 8, Math.max(8, y - vr.top + 16)) + "px";
    }
    const hideTip = () => { tip.hidden = true; };

    svg.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      if (state.markMode) {
        const ok = inDeepest(e.target);
        svg.classList.toggle("is-invalid-mark", !ok);
        showTip(ok ? [HIER.get(deepest()).label, "Clique para marcar o ponto aproximado"] : [`Fora de ${HIER.get(deepest()).label}`, "Marque sobre a região selecionada"], e.clientX, e.clientY, !ok);
        return;
      }
      const t = targetFrom(e.target);
      if ((t || "") !== state.hoverId) {
        state.hoverId = t || "";
        paintSvg();
      }
      const g = regionFromEvent(e.target);
      if (t) {
        const r = HIER.get(t);
        showTip([r.label, `Nível ${r.level} · ${HIER.LEVEL_LABELS[r.level]}`, "Clique para selecionar"], e.clientX, e.clientY, false);
      } else if (g && deepest() !== HIER.ROOT_ID && !inDeepest(e.target)) {
        showTip([HIER.get(g.getAttribute("data-region-id")).label, `Fora de ${HIER.get(deepest()).label}`, "Use 'Alterar' na lista para trocar de região"], e.clientX, e.clientY, true);
      } else hideTip();
    });
    svg.addEventListener("pointerleave", () => { state.hoverId = ""; hideTip(); paintSvg(); });
    svg.addEventListener("click", (e) => {
      if (state.markMode) {
        if (!inDeepest(e.target)) { live.textContent = `Ponto não marcado: fora de ${HIER.get(deepest()).label}.`; return; }
        const xy = toSvgPoint(e.clientX, e.clientY);
        if (xy) placePoint(xy);
        hideTip();
        return;
      }
      const t = targetFrom(e.target);
      if (t) { hideTip(); choose(t); }
    });

    viewer.addEventListener("wheel", (e) => {
      e.preventDefault();
      state.zoom = Math.max(0.6, Math.min(4, state.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      frame();
      paintTopbar();
    }, { passive: false });

    // ---------- painéis ----------
    function paint() {
      paintSvg();
      paintSide();
      paintTopbar();
      paintBottombar();
    }

    function paintSide() {
      const crumb = state.path.slice(1).map((id) => HIER.get(id).label).join(" › ");
      fill(side,
        h("div", { class: "ccd-ac__sidehead" }, h("p", { class: "ccd-eyebrow" }, "Vistas técnicas (2D)"), h("p", { class: "ccd-ac__model", id: "ccdAcTitle" }, "Localizar peça na aeronave")),
        crumb ? h("div", { class: "ccd-ac__crumb" }, crumb) : null,
        h(
          "ol",
          { class: "ccd-ac__levels" },
          LEVELS.map(({ level, label }) => {
            const id = state.path[level - 1];
            const isActive = activeLevel() === level && !id && level < 6;
            let body;
            if (level === 6) {
              body = state.point
                ? h("div", { class: "ccd-ac__levelvalue" }, h("span", { class: "ccd-ac__check" }, icon("check", 9)), h("span", { class: "ccd-ac__levelvaluetext" }, "Ponto aproximado marcado"))
                : h("div", { class: "ccd-ac__levelempty" }, "Opcional: ponto aproximado no desenho");
            } else if (id) {
              const value = level === 1 ? "Modelo demonstrativo · E195-E2" : HIER.get(id).label;
              body = h("div", { class: "ccd-ac__levelvalue" },
                h("span", { class: "ccd-ac__check" }, icon("check", 9)),
                h("span", { class: "ccd-ac__levelvaluetext", title: value }, value),
                level > 1 ? h("button", { class: "ccd-link", type: "button", onclick: () => editLevel(level) }, "Alterar") : null);
            } else if (isActive) {
              body = h("div", { class: "ccd-ac__levelpending" }, h("span", { class: "ccd-pulse-dot" }), "Selecionando…");
            } else {
              body = h("div", { class: "ccd-ac__levelempty" }, "—");
            }
            return h("li", { class: `ccd-ac__level${id ? " is-done" : ""}${isActive ? " is-active" : ""}` }, h("p", { class: "ccd-ac__levelname" }, label), body);
          })
        ),
        paintOptions()
      );
    }

    function paintOptions() {
      const parent = deepest();
      const kids = HIER.childrenOf(parent).filter((r) => r.selectable);
      if (!kids.length) {
        return h("div", { class: "ccd-ac__options" },
          h("p", { class: "ccd-ac__optionshead" }, `${HIER.get(parent).label}: sem subdivisões`),
          h("p", { class: "ccd-muted ccd-ac__hint ccd-ac2__pad" }, "Marque o ponto aproximado (opcional) e confirme a localização."));
      }
      const level = state.path.length + 1;
      return h("div", { class: "ccd-ac__options" },
        h("p", { class: "ccd-ac__optionshead" }, `Selecione: ${HIER.LEVEL_LABELS[level]}${level > 2 ? ` · em ${HIER.get(parent).label}` : ""}`),
        h("div", { class: "ccd-ac__optionslist", role: "listbox", "aria-label": "Opções do nível atual" },
          kids.map((r) => h("button", {
            type: "button", role: "option", "aria-selected": "false", class: "ccd-ac__option", "data-region-id": r.id,
            onclick: () => choose(r.id),
            onmouseenter: () => { state.hoverId = r.id; paintSvg(); },
            onmouseleave: () => { state.hoverId = ""; paintSvg(); },
            onfocus: () => { state.hoverId = r.id; paintSvg(); },
            onblur: () => { state.hoverId = ""; paintSvg(); },
          }, h("span", { class: "ccd-ac__optiondot" }), r.label))));
    }

    function paintTopbar() {
      const crumb = state.path.slice(1).map((id) => HIER.get(id).label).join(" › ");
      const zoomTo = (z) => { state.zoom = z; frame(); paintTopbar(); };
      fill(topbar,
        h("div", { class: "ccd-ac__crumbbar" },
          crumb ? h("span", { class: "ccd-chip" }, icon("home", 12), `Aeronave › ${crumb}`) : h("span", { class: "ccd-muted" }, "Clique numa grande região do desenho ou escolha na lista")),
        h("div", { class: "ccd-ac__tools" },
          h("div", { class: "ccd-ac__zoom", role: "group", "aria-label": "Controles de zoom" },
            h("button", { type: "button", class: "ccd-iconbtn", "aria-label": "Afastar", onclick: () => zoomTo(Math.max(0.6, state.zoom / 1.25)) }, icon("minus", 14)),
            h("span", { class: "ccd-ac__zoomvalue", "aria-live": "polite" }, `${Math.round(state.zoom * 100)}%`),
            h("button", { type: "button", class: "ccd-iconbtn", "aria-label": "Aproximar", onclick: () => zoomTo(Math.min(4, state.zoom * 1.25)) }, icon("plus", 14))),
          deepest() !== HIER.ROOT_ID || state.zoom !== 1
            ? h("button", {
              type: "button", class: "ccd-btn ccd-btn--soft ccd-btn--sm", "data-ac": "full-view", "aria-pressed": String(state.fullView),
              onclick: () => { state.fullView = !state.fullView; state.zoom = 1; frame(); paintTopbar(); },
            }, state.fullView ? "Enquadrar a região" : "← Aeronave completa")
            : null,
          h("button", { type: "button", class: "ccd-iconbtn ccd-iconbtn--bordered", "aria-label": "Fechar localizador", onclick: close }, icon("x", 16))));
    }

    function paintBottombar() {
      const level = activeLevel();
      const canConfirm = state.path.length > 1;
      fill(bottombar,
        h("div", { class: "ccd-ac__status" },
          h("span", null, `Nível ${level} de 6 · ${HIER.LEVEL_LABELS[level]}`),
          state.point ? h("span", { class: "ccd-chip ccd-chip--blue", "data-ac": "point-status" }, PENDING_TEXT) : null,
          state.markMode ? h("span", { class: "ccd-chip", "data-ac": "mark-hint" }, `Clique sobre ${HIER.get(deepest()).label} · Esc cancela`) : null),
        h("div", { class: "ccd-ac__actions" },
          h("button", { type: "button", class: "ccd-btn ccd-btn--ghost", onclick: close }, "Cancelar"),
          state.point
            ? h("button", { type: "button", class: "ccd-btn ccd-btn--ghost", "data-ac": "remove-point", onclick: () => { state.point = null; live.textContent = "Ponto aproximado removido."; paint(); } }, "Remover ponto")
            : null,
          state.markMode
            ? h("button", { type: "button", class: "ccd-btn ccd-btn--soft", "data-ac": "mark-center", onclick: markAtCenter }, "Marcar no centro da região")
            : null,
          h("button", {
            type: "button", class: "ccd-btn ccd-btn--soft", "data-ac": "mark-point", "aria-pressed": String(state.markMode), disabled: !canConfirm,
            title: canConfirm ? "Indicar um ponto aproximado na vista superior" : "Selecione ao menos a grande região",
            onclick: () => {
              state.markMode = !state.markMode;
              hideTip();
              live.textContent = state.markMode ? `Modo de marcação: clique sobre ${HIER.get(deepest()).label}, ou use Marcar no centro da região.` : "Modo de marcação encerrado.";
              paint();
            },
          }, state.point ? "Reposicionar ponto" : "Marcar ponto aproximado"),
          h("button", {
            type: "button", class: "ccd-btn ccd-btn--primary", "data-ac": "confirm", disabled: !canConfirm,
            title: canConfirm ? "Confirmar a localização selecionada" : "Selecione ao menos a grande região",
            onclick: confirm,
          }, icon("check", 14), "Confirmar localização")));
    }

    // ---------- confirmação e captura do desenho ----------
    /* Captura do desenho com a região realçada e o ponto (estilos aplicados inline no clone). */
    function snapshot() {
      return new Promise((resolve) => {
        try {
          const clone = svg.cloneNode(true);
          const saved = state.fullView;
          state.fullView = false;
          clone.setAttribute("viewBox", targetViewBox().join(" "));
          state.fullView = saved;
          clone.setAttribute("width", "960");
          clone.setAttribute("height", "960");
          const d = deepest();
          for (const s of clone.querySelectorAll(".shape")) s.setAttribute("opacity", "0.55");
          const cur = clone.querySelector(`g.region[data-region-id="${d}"]`);
          if (cur) for (const s of cur.querySelectorAll(".shape")) { s.setAttribute("fill", "#8fdcae"); s.setAttribute("stroke", "#15803d"); s.setAttribute("opacity", "1"); }
          for (const pin of clone.querySelectorAll(".ccd-ac2__pin")) { pin.setAttribute("fill", "#ffffff"); pin.setAttribute("stroke", "#15803d"); pin.setAttribute("stroke-width", String(Number(pin.getAttribute("r")) * 0.4)); }
          for (const dot of clone.querySelectorAll(".ccd-ac2__pindot")) dot.setAttribute("fill", "#15803d");
          const xml = new XMLSerializer().serializeToString(clone);
          const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
          const img = new Image();
          img.onload = () => {
            const W = 960, strip = 30;
            const c = document.createElement("canvas");
            c.width = W; c.height = W + strip;
            const ctx = c.getContext("2d");
            ctx.fillStyle = "#f5f8fc"; ctx.fillRect(0, 0, W, W);
            ctx.drawImage(img, 0, 0, W, W);
            ctx.fillStyle = "#0a1624"; ctx.fillRect(0, W, W, strip);
            ctx.fillStyle = "#d6e2f0"; ctx.font = "12px system-ui, sans-serif"; ctx.textBaseline = "middle";
            ctx.fillText(`${DISCLAIMER} · Vista superior técnica · ${HIER.labelFor(state.path)}`, 10, W + strip / 2, W - 20);
            URL.revokeObjectURL(url);
            try { resolve({ dataUrl: c.toDataURL("image/jpeg", 0.86), w: c.width, h: c.height }); } catch { resolve(null); }
          };
          img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
          img.src = url;
        } catch {
          resolve(null);
        }
      });
    }

    let confirming = false;
    async function confirm() {
      if (state.path.length < 2 || confirming) return;
      confirming = true;
      state.markMode = false;
      if (state.point) state.point = { ...state.point, regionId: deepest(), confirmed: true };
      paint();
      const label = HIER.labelFor(state.path);
      const loc = { ...HIER.locationFrom(state.path, { view: "top", partial: !state.point }), source: "2d" };
      if (state.point) loc.approximatePoint = { ...state.point };
      const snap = await snapshot();
      if (closed) return;   // o usuário fechou ou cancelou durante a captura: nada é gravado
      if (snap) loc.snapshot = { width: snap.w, height: snap.h, createdAt: new Date().toISOString(), bytes: Math.round((snap.dataUrl.length - snap.dataUrl.indexOf(",") - 1) * 0.75) };
      const cb = onConfirm;
      close();
      cb?.(label, { label, location: loc, snapshotDataUrl: snap ? snap.dataUrl : null });
    }

    // ---------- ciclo de vida ----------
    const releaseEscape = trapEscape(close);
    /* Escape: primeiro sai do modo de marcação; só depois fecha. */
    const onEsc = (e) => {
      if (e.key !== "Escape" || !state.markMode) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      state.markMode = false;
      hideTip();
      live.textContent = "Modo de marcação encerrado.";
      paint();
    };
    window.addEventListener("keydown", onEsc, true);
    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onEsc, true);
      releaseEscape();
      overlay.remove();
      onClose?.();
    }
    overlay.addEventListener("mousedown", (event) => {
      if (event.target === overlay) close();
    });

    document.body.appendChild(overlay);
    paint();
    vb = targetViewBox();
    svg.setAttribute("viewBox", vb.join(" "));
    paintSvg();
    side.querySelector(".ccd-ac__option")?.focus();
  }

  window.CtrlCDAircraft = Object.freeze({ open, ZONES, SECTION_TO_ZONE, ZONE_REGION });
})();

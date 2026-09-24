/* ==========================================================================
   CTRL+CD — Visão gerencial (dashboard).

   - Indicadores, evolução mensal, status, tipos de NC, AR, funil e anexos recentes.
   - Mapa da aeronave: a MESMA vista superior técnica do localizador 2D
     (window.CtrlCDAircraftTopView), com a intensidade da cor pela quantidade de NCs de
     cada região da hierarquia compartilhada (window.CtrlCDAircraftHierarchy). Clique numa
     região (ex.: asa esquerda) para ver o gráfico de NCs daquela região.
   - Sem bibliotecas externas: SVG e HTML gerados aqui. Cada gráfico tem visão em tabela.
   - Os dados chegam normalizados de ctrlcd/app.js (servidor + navegador) ou do gerador
     de dados fictícios deste módulo (sempre identificados como tal).
   Exposto em window.CtrlCDDashboard.
   ========================================================================== */
(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const DAY = 24 * 60 * 60 * 1000;
  const STATUSES = ["Em rascunho", "Em preenchimento", "Com pendência", "Verificação concluída", "Concluído"];
  const IN_PROGRESS = new Set(["Em rascunho", "Em preenchimento", "Verificação concluída"]);
  const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  /* Série categórica (validada: faixa de luminosidade, croma, separação para daltonismo e contraste). */
  const SERIES = [
    { key: "started", label: "Iniciados", color: "#5279de" },
    { key: "done", label: "Concluídos", color: "#3c743d" },
    { key: "pending", label: "Com pendência", color: "#d4a72c" },
  ];
  /* Rampa sequencial de um só matiz (azul do produto), do claro ao escuro; zero em cinza. */
  const HEAT = [
    { max: 0, fill: "#eff0f1", text: "#42413f", label: "Nenhuma" },
    { max: 0.25, fill: "#deebfd", text: "#051b35", label: "Baixa" },
    { max: 0.5, fill: "#b9d2f7", text: "#051b35", label: "Média" },
    { max: 0.75, fill: "#6f96e9", text: "#051b35", label: "Alta" },
    { max: 1, fill: "#1253d9", text: "#ffffff", label: "Muito alta" },
  ];
  const PERIODS = [["30", "Últimos 30 dias"], ["90", "Últimos 90 dias"], ["180", "Últimos 6 meses"], ["365", "Últimos 12 meses"], ["all", "Todo o período"]];

  const fmtInt = (n) => new Intl.NumberFormat("pt-BR").format(n);
  const fmtPct = (n) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n * 100)}%`;
  const fmtDate = (d) => (d ? d.toLocaleDateString("pt-BR") : "—");
  const plural = (n, one, many) => `${fmtInt(n)} ${n === 1 ? one : many}`;

  function s(tag, attrs = {}, ...kids) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined && v !== false) el.setAttribute(k, String(v));
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return el;
  }

  /* ------------------------------------------------------------------ */
  /* Dados fictícios (demonstração) — determinísticos                    */
  /* ------------------------------------------------------------------ */
  function demoRecords(ncTypes, hierarchy) {
    let seed = 20260924;
    const rnd = () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = (list, weights) => {
      const total = weights.reduce((a, b) => a + b, 0);
      let r = rnd() * total;
      for (let i = 0; i < list.length; i += 1) { r -= weights[i]; if (r <= 0) return list[i]; }
      return list[list.length - 1];
    };
    const wanted = ["Trinca", "Vazamento", "Risco", "Componente solto", "Desalinhamento", "Furo", "Torque", "Corrosão", "Amassamento", "Delaminação"];
    const types = wanted.map((w) => ncTypes.find((t) => t.toLowerCase().includes(w.toLowerCase()))).filter(Boolean);
    const typeWeights = types.map((_, i) => 10 - i);
    const sections = [
      ["fuselage_center", 9], ["wing_left_trailing_edge", 5], ["wing_left_leading_edge", 3], ["fuselage_forward", 4], ["fuselage_rear", 4],
      ["wing_right_trailing_edge", 3], ["wing_right_upper_surface", 2], ["engine_left", 4], ["engine_right", 2], ["nose", 2],
      ["horizontal_stabilizer_left", 2], ["vertical_stabilizer", 2], ["tail_cone", 1], ["cockpit", 1], ["landing_gear_main_left", 2], ["wing_left_upper_surface", 2],
    ].filter(([id]) => hierarchy.get(id));
    const statusWeights = [2, 4, 3, 2, 6];
    const now = Date.now();
    const out = [];
    for (let i = 0; i < 64; i += 1) {
      const ageDays = Math.floor(Math.pow(rnd(), 1.6) * 178);
      const created = new Date(now - ageDays * DAY - Math.floor(rnd() * DAY));
      const status = pick(STATUSES, statusWeights);
      const installed = rnd() > 0.15;
      let regionPath = [];
      if (installed) {
        const section = pick(sections.map((x) => x[0]), sections.map((x) => x[1]));
        let deepest = section;
        const kids = hierarchy.childrenOf(section);
        if (kids.length && rnd() > 0.4) deepest = kids[Math.floor(rnd() * kids.length)].id;
        regionPath = hierarchy.pathOf(deepest).filter((id) => id !== hierarchy.ROOT_ID);
      }
      const maxStep = status === "Concluído" ? 5 : status === "Verificação concluída" ? 4 : status === "Com pendência" ? 3 : status === "Em preenchimento" ? 2 : 1;
      const completed = status === "Concluído" ? new Date(Math.min(now, created.getTime() + (0.6 + rnd() * 5) * DAY)) : null;
      out.push({
        id: `DEMO-${String(2026)}-${String(1001 + i)}`,
        createdAt: created,
        updatedAt: completed || new Date(Math.min(now, created.getTime() + rnd() * 3 * DAY)),
        completedAt: completed,
        status,
        ncType: pick(types, typeWeights) || "Não classificada",
        hasAR: rnd() < 0.35,
        installed,
        regionPath,
        maxStep,
        progress: Math.round((maxStep / 5) * 100),
        responsible: ["Ana Lima", "Bruno Reis", "Carla Souza", "Diego Alves", "Elisa Prado"][Math.floor(rnd() * 5)],
        origin: "demo",
        mine: false,
      });
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Filtros e agregações                                                */
  /* ------------------------------------------------------------------ */
  function periodRange(period, now = Date.now()) {
    if (period === "all") return null;
    const days = Number(period);
    return { from: now - days * DAY, to: now, prevFrom: now - 2 * days * DAY, prevTo: now - days * DAY };
  }

  function applyFilters(items, f, range, useRange = "current") {
    return items.filter((r) => {
      if (range) {
        const t = r.createdAt ? r.createdAt.getTime() : NaN;
        const [a, b] = useRange === "previous" ? [range.prevFrom, range.prevTo] : [range.from, range.to];
        if (!(t >= a && t <= b)) return false;
      }
      if (f.status !== "Todos" && r.status !== f.status) return false;
      if (f.ar === "com" && r.hasAR !== true) return false;
      if (f.ar === "sem" && r.hasAR !== false) return false;
      if (f.type !== "Todos" && r.ncType !== f.type) return false;
      if (f.region !== "Todas" && !r.regionPath.includes(f.region)) return false;
      return true;
    });
  }

  function kpis(list) {
    const total = list.length;
    const done = list.filter((r) => r.status === "Concluído").length;
    const withTimes = list.filter((r) => r.completedAt && r.createdAt && r.completedAt >= r.createdAt);
    return {
      total,
      done,
      inProgress: list.filter((r) => IN_PROGRESS.has(r.status)).length,
      pending: list.filter((r) => r.status === "Com pendência").length,
      rate: total ? done / total : null,
      withAR: list.filter((r) => r.hasAR === true).length,
      withoutAR: list.filter((r) => r.hasAR === false).length,
      avgDays: withTimes.length ? withTimes.reduce((a, r) => a + (r.completedAt - r.createdAt) / DAY, 0) / withTimes.length : null,
    };
  }

  function countBy(list, keyFn) {
    const map = new Map();
    for (const r of list) {
      const k = keyFn(r);
      if (k === null || k === undefined) continue;
      map.set(k, (map.get(k) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "pt-BR"));
  }

  const MAX_MONTHS = 18;
  /* Meses de calendário cobertos pelo período (ou desde o primeiro registro), até o mês atual. */
  function monthBuckets(list, range) {
    const now = new Date();
    let start = range ? new Date(range.from) : list.length ? new Date(Math.min(...list.map((r) => r.createdAt.getTime()))) : new Date(now.getFullYear(), now.getMonth() - 5, 1);
    let months = Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() + 1);
    const truncated = months > MAX_MONTHS;
    months = Math.min(months, MAX_MONTHS);
    const buckets = [];
    buckets.truncated = truncated;
    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, started: 0, done: 0, pending: 0 });
    }
    const at = (d) => d && buckets.find((b) => b.key === `${d.getFullYear()}-${d.getMonth()}`);
    for (const r of list) {
      const b = at(r.createdAt);
      if (b) { b.started += 1; if (r.status === "Com pendência") b.pending += 1; }
      const c = at(r.completedAt);
      if (c) c.done += 1;
    }
    return buckets;
  }

  function heatStep(count, max) {
    if (!count || !max) return HEAT[0];
    const ratio = count / max;
    return HEAT.find((step, i) => i > 0 && ratio <= step.max) || HEAT[HEAT.length - 1];
  }

  /* ------------------------------------------------------------------ */
  /* Página                                                              */
  /* ------------------------------------------------------------------ */
  function Page(ctx) {
    const { h, icon, state: f, set, hierarchy: HIER, topView: TOP } = ctx;
    const demo = ctx.meta.source === "demo";
    const all = demo ? demoRecords(ctx.ncTypes, HIER) : ctx.items;
    const range = periodRange(f.period);
    const list = applyFilters(all, f, range);
    const prev = range ? applyFilters(all, f, range, "previous") : null;
    const k = kpis(list);
    const kp = prev ? kpis(prev) : null;

    /* ---- tooltip único (mouse e teclado) ---- */
    const tip = h("div", { class: "ccd-dash__tip", role: "tooltip", hidden: true });
    const showTip = (lines, x, y) => {
      tip.replaceChildren(...lines.map((line, i) => h(i ? "span" : "strong", null, line)));
      tip.hidden = false;
      const w = tip.offsetWidth, hgt = tip.offsetHeight;
      tip.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, x + 14))}px`;
      tip.style.top = `${Math.max(8, Math.min(window.innerHeight - hgt - 8, y + 14))}px`;
    };
    const hideTip = () => { tip.hidden = true; };
    /** liga tooltip a um elemento (HTML ou SVG); `lines` é função para sempre refletir os dados */
    const hover = (el, lines) => {
      el.addEventListener("mousemove", (e) => showTip(lines(), e.clientX, e.clientY));
      el.addEventListener("mouseleave", hideTip);
      el.addEventListener("focus", () => { const r = el.getBoundingClientRect(); showTip(lines(), r.left + r.width / 2, r.top + r.height / 2); });
      el.addEventListener("blur", hideTip);
      return el;
    };

    /* ---- blocos de interface ---- */
    const select = (label, key, options) =>
      h("label", { class: "ccd-dash__filter" }, h("span", { class: "ccd-eyebrow" }, label),
        h("select", { class: "ccd-input ccd-input--sm", "data-fk": `dash-${key}`, onchange: (e) => set(() => { f[key] = e.target.value; if (key === "region") f.selected = e.target.value === "Todas" ? f.selected : e.target.value; }) },
          options.map((o) => (o.group
            ? h("optgroup", { label: o.group }, o.options.map(([v, t]) => { const opt = h("option", { value: v }, t); opt.selected = f[key] === v; return opt; }))
            : (() => { const opt = h("option", { value: o[0] }, o[1]); opt.selected = f[key] === o[0]; return opt; })()))));

    const delta = (now, before, unit = "") => {
      if (before === null || before === undefined || now === null) return null;
      const d = now - before;
      const text = unit === "pp" ? `${d > 0 ? "+" : ""}${Math.round(d * 100)} pp` : `${d > 0 ? "+" : ""}${fmtInt(d)}`;
      return h("span", { class: `ccd-dash__delta${d > 0 ? " is-up" : d < 0 ? " is-down" : ""}` }, d === 0 ? "= período anterior" : `${text} vs. período anterior`);
    };
    const tile = (ic, value, label, deltaNode, tone = "") =>
      h("div", { class: `ccd-dash__tile${tone ? ` is-${tone}` : ""}` },
        h("div", { class: "ccd-dash__tilehead" }, h("span", { class: "ccd-dash__tileicon", "aria-hidden": "true" }, icon(ic, 16)), deltaNode),
        h("p", { class: "ccd-dash__tilevalue" }, value),
        h("p", { class: "ccd-dash__tilelabel" }, label));

    const card = (key, title, subtitle, chart, table, extra = null) => {
      const asTable = Boolean(f.tables[key]);
      return h("section", { class: `ccd-dash__card ccd-dash__card--${key}`, "aria-labelledby": `dash-${key}-t` },
        h("div", { class: "ccd-dash__cardhead" },
          h("div", null, h("h3", { id: `dash-${key}-t` }, title), subtitle ? h("p", { class: "ccd-muted ccd-xsmall" }, subtitle) : null),
          h("div", { class: "ccd-row" }, extra,
            table ? h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--xs", "aria-pressed": String(asTable), "data-fk": `dash-table-${key}`, onclick: () => set(() => (f.tables[key] = !asTable)) }, asTable ? "Ver gráfico" : "Ver tabela") : null)),
        asTable && table ? dataTable(table) : chart);
    };
    const dataTable = ({ head, rows }) =>
      h("div", { class: "ccd-dash__tablewrap" }, h("table", { class: "ccd-dash__table" },
        h("thead", null, h("tr", null, head.map((c) => h("th", { scope: "col" }, c)))),
        h("tbody", null, rows.length ? rows.map((r) => h("tr", null, r.map((c, i) => h(i ? "td" : "th", i ? null : { scope: "row" }, c)))) : h("tr", null, h("td", { colspan: head.length, class: "ccd-muted" }, "Sem registros no filtro atual.")))));
    const empty = (text = "Sem registros no filtro atual.") => h("p", { class: "ccd-muted ccd-small ccd-dash__empty" }, text);

    /* barras horizontais (um só matiz; rótulos em cor de texto) */
    const hbars = (entries, { onPick = null, max = null, color = "#1253d9", labelFor = (k) => k } = {}) => {
      if (!entries.length) return empty();
      const top = max || Math.max(...entries.map((e) => e[1]));
      return h("ul", { class: "ccd-dash__hbars" }, entries.map(([key, value]) => {
        const label = labelFor(key);
        const row = h(onPick ? "button" : "div", { type: onPick ? "button" : null, class: "ccd-dash__hbar", "data-fk": onPick ? `dash-hbar-${label}` : null, onclick: onPick ? () => onPick(key) : null, "aria-label": `${label}: ${plural(value, "registro", "registros")}` },
          h("span", { class: "ccd-dash__hbarlabel", title: label }, label),
          h("span", { class: "ccd-dash__hbartrack", "aria-hidden": "true" }, h("span", { class: "ccd-dash__hbarfill", style: `width:${Math.max(2, (value / top) * 100)}%;background:${color}` })),
          h("span", { class: "ccd-dash__hbarvalue" }, fmtInt(value)));
        hover(row, () => [label, `${plural(value, "registro", "registros")} · ${fmtPct(value / Math.max(1, list.length))} do filtro`]);
        return h("li", null, row);
      }));
    };

    /* ---- evolução mensal: colunas agrupadas, um eixo ---- */
    const buckets = monthBuckets(list, range);
    const evolution = (() => {
      const W = 640, H = 220, pad = { l: 34, r: 8, t: 12, b: 26 };
      const maxV = Math.max(1, ...buckets.flatMap((b) => SERIES.map((sr) => b[sr.key])));
      const step = Math.max(1, Math.ceil(maxV / 4));
      const yMax = step * 4;
      const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / yMax);
      const band = (W - pad.l - pad.r) / buckets.length;
      const bw = Math.min(18, (band - 16) / SERIES.length - 2);
      const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "ccd-dash__svg", role: "img", "aria-label": `Evolução mensal: ${buckets.map((b) => `${b.label}: ${b.started} iniciados, ${b.done} concluídos, ${b.pending} com pendência`).join("; ")}` });
      for (let i = 0; i <= 4; i += 1) {
        const v = step * i;
        svg.append(s("line", { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), stroke: "#eff0f1", "stroke-width": 1 }),
          s("text", { x: pad.l - 6, y: y(v) + 3, "text-anchor": "end", class: "ccd-dash__axis" }, fmtInt(v)));
      }
      buckets.forEach((b, i) => {
        const x0 = pad.l + band * i + (band - (bw + 2) * SERIES.length) / 2;
        SERIES.forEach((sr, j) => {
          const v = b[sr.key];
          const x = x0 + j * (bw + 2), top = y(v), base = y(0);
          const hgt = Math.max(0, base - top);
          const r = Math.min(4, hgt / 2, bw / 2);
          const d = hgt <= 0 ? "" : `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${base}Z`;
          const mark = s("path", { d, fill: sr.color, tabindex: v ? 0 : null, "aria-label": `${b.label} · ${sr.label}: ${v}` });
          const hit = s("rect", { x: x - 1, y: pad.t, width: bw + 2, height: base - pad.t, fill: "transparent" });
          hover(hit, () => [`${b.label} · ${sr.label}`, plural(v, "registro", "registros")]);
          if (v) hover(mark, () => [`${b.label} · ${sr.label}`, plural(v, "registro", "registros")]);
          svg.append(hit, mark);
        });
        svg.append(s("text", { x: pad.l + band * i + band / 2, y: H - 8, "text-anchor": "middle", class: "ccd-dash__axis" }, b.label));
      });
      svg.append(s("line", { x1: pad.l, x2: W - pad.r, y1: y(0), y2: y(0), stroke: "#b7bbbc", "stroke-width": 1 }));
      const legend = h("ul", { class: "ccd-dash__legend" }, SERIES.map((sr) => h("li", null, h("span", { class: "ccd-dash__swatch", style: `background:${sr.color}` }), sr.label)));
      return h("div", null, svg, legend);
    })();

    /* ---- status ---- */
    const statusCounts = STATUSES.map((st) => [st, list.filter((r) => r.status === st).length]);

    /* ---- mapa da aeronave ---- */
    const level = Number(f.level) === 3 ? 3 : 2;
    const regionAt = (r) => r.regionPath.find((id) => HIER.get(id)?.level === level) || null;
    const regionCounts = new Map(countBy(list.filter((r) => r.installed), regionAt));
    const noLevel = list.filter((r) => r.installed && r.regionPath.length && !regionAt(r)).length;
    const unknown = list.filter((r) => r.installed && !r.regionPath.length).length;
    const offAircraft = list.filter((r) => r.installed === false).length;
    const maxRegion = Math.max(0, ...regionCounts.values());
    const selectedId = f.selected && HIER.get(f.selected) ? f.selected : null;
    const labelOf = (id) => HIER.get(id)?.label || id;
    const fullLabel = (id) => {
      const reg = HIER.get(id);
      if (!reg) return id;
      if (reg.level <= 2) return reg.label;
      const parent = HIER.get(reg.parentId);
      return parent && parent.level >= 2 && !reg.label.toLowerCase().includes(parent.label.toLowerCase()) ? `${reg.label} (${parent.label})` : reg.label;
    };
    const pickRegion = (id) => set(() => { f.selected = f.selected === id ? null : id; });

    const map = (() => {
      const host = h("div", { class: "ccd-dash__map" });
      if (!TOP?.markup) return { host: empty("Vista técnica indisponível."), legend: null, levelToggle: null };
      const doc = (Page.cache ||= new DOMParser().parseFromString(TOP.markup, "image/svg+xml"));
      const svg = document.importNode(doc.documentElement, true);
      svg.removeAttribute("width"); svg.removeAttribute("height");
      svg.setAttribute("viewBox", TOP.displayViewBox || svg.getAttribute("viewBox"));
      svg.setAttribute("class", "ccd-dash__mapsvg");
      svg.setAttribute("role", "group");
      svg.setAttribute("aria-label", "Mapa da aeronave (vista superior, nariz à esquerda, modelo demonstrativo): regiões coloridas pela quantidade de não conformidades. Use Tab para navegar e Enter para ver o detalhe da região.");
      svg.querySelectorAll("title, desc, text.disclaimer").forEach((n) => n.remove()); /* o aviso é exibido abaixo do mapa, na horizontal */
      for (const g of svg.querySelectorAll("g.region")) { g.removeAttribute("role"); g.removeAttribute("aria-label"); }
      for (const shape of svg.querySelectorAll(".shape:not(.shape--hidden)")) { shape.setAttribute("fill", HEAT[0].fill); shape.setAttribute("stroke", "#ffffff"); shape.setAttribute("stroke-width", "1.2"); }
      /* nariz à esquerda (como no painel de referência): gira o desenho em torno do centro */
      const turn = s("g", { transform: "rotate(-90 500 500)" });
      turn.append(...[...svg.childNodes]);
      svg.append(turn);
      const labels = s("g", { class: "ccd-dash__maplabels", "pointer-events": "none" });
      const groups = [...svg.querySelectorAll(`g.region[data-level="${level}"]`)];
      for (const g of groups) {
        const id = g.getAttribute("data-region-id");
        const count = regionCounts.get(id) || 0;
        const step = heatStep(count, maxRegion);
        const hiddenOnly = !g.querySelector(".shape:not(.shape--hidden)");
        for (const shape of g.querySelectorAll(".shape:not(.shape--hidden)")) shape.setAttribute("fill", step.fill);
        g.classList.add("ccd-dash__region");
        if (id === selectedId || (selectedId && HIER.isDescendantOf(selectedId, id))) g.classList.add("is-selected");
        /* regiões sem desenho próprio nesta vista (pilones, trens) só entram no teclado se tiverem NCs; a lista ao lado cobre todas */
        if (hiddenOnly && !count) continue;
        g.setAttribute("data-fk", `dash-region-${id}`);
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute("aria-pressed", String(id === selectedId));
        g.setAttribute("aria-label", `${fullLabel(id)}: ${plural(count, "não conformidade", "não conformidades")}`);
        g.addEventListener("click", () => pickRegion(id));
        g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickRegion(id); } });
        hover(g, () => [fullLabel(id), `${plural(count, "não conformidade", "não conformidades")}${list.length ? ` · ${fmtPct(count / list.length)} do filtro` : ""}`, "Clique para ver o detalhe"]);
        if (count) {
          const badge = s("g", { "data-for": id },
            s("circle", { r: 13, fill: "#ffffff", stroke: step.fill === HEAT[0].fill ? "#b7bbbc" : "#051b35", "stroke-width": 1.2 }),
            s("text", { "text-anchor": "middle", dy: "4", class: "ccd-dash__maplabel" }, fmtInt(count)));
          labels.append(badge);
        }
      }
      turn.append(labels);
      host.append(svg);
      /* posiciona os números no centro de cada região depois que o desenho está na página */
      queueMicrotask(() => {
        if (!svg.isConnected) return;
        for (const badge of [...labels.children]) {
          const g = svg.querySelector(`g.region[data-region-id="${badge.getAttribute("data-for")}"]`);
          try {
            const b = g.getBBox();
            badge.setAttribute("transform", `translate(${b.x + b.width / 2},${b.y + b.height / 2}) rotate(90)`);
          } catch { badge.remove(); }
        }
      });
      const legend = h("div", { class: "ccd-dash__heatlegend", "aria-hidden": "true" },
        h("span", { class: "ccd-xsmall ccd-muted" }, `Quantidade de NCs (relativa ao maior valor, ${fmtInt(maxRegion)}):`),
        HEAT.map((st) => h("span", { class: "ccd-dash__heatkey" }, h("span", { class: "ccd-dash__swatch", style: `background:${st.fill}` }), st.label)));
      const levelToggle = h("div", { class: "ccd-toggle", role: "group", "aria-label": "Nível do mapa" },
        [[2, "Grandes regiões"], [3, "Seções"]].map(([v, t]) => h("button", { type: "button", class: `ccd-toggle__btn${level === v ? " is-active" : ""}`, "aria-pressed": String(level === v), "data-fk": `dash-level-${v}`, onclick: () => set(() => { f.level = v; f.selected = null; }) }, t)));
      return { host, legend, levelToggle };
    })();

    const regionEntries = [...regionCounts.entries()];
    const regionList = h("div", { class: "ccd-dash__regionlist" },
      h("p", { class: "ccd-eyebrow" }, "Por região"),
      regionEntries.length
        ? h("ul", null, regionEntries.map(([id, c]) => h("li", null, h("button", { type: "button", class: `ccd-dash__regionitem${id === selectedId ? " is-active" : ""}`, "aria-pressed": String(id === selectedId), "data-fk": `dash-regionitem-${id}`, onclick: () => pickRegion(id) },
            h("span", { class: "ccd-dash__swatch", style: `background:${heatStep(c, maxRegion).fill}` }), h("span", { class: "ccd-dash__regionname" }, fullLabel(id)), h("strong", null, fmtInt(c))))))
        : empty("Nenhuma NC com localização na aeronave."),
      h("ul", { class: "ccd-dash__regionextra ccd-xsmall ccd-muted" },
        noLevel ? h("li", null, `${plural(noLevel, "NC", "NCs")} sem ${level === 3 ? "seção" : "região"} detalhada`) : null,
        unknown ? h("li", null, `${plural(unknown, "NC", "NCs")} na aeronave sem localização informada`) : null,
        offAircraft ? h("li", null, `${plural(offAircraft, "NC", "NCs")} com a peça fora da aeronave`) : null));

    /* detalhe da região selecionada */
    const detail = (() => {
      if (!selectedId) {
        return h("div", { class: "ccd-dash__detail is-empty" }, icon("info", 16), h("p", { class: "ccd-small" }, "Clique numa região do mapa (por exemplo, uma asa) ou da lista para ver o gráfico de não conformidades daquela região."));
      }
      const inRegion = list.filter((r) => r.regionPath.includes(selectedId));
      const byType = countBy(inRegion, (r) => r.ncType).slice(0, 8);
      const children = HIER.childrenOf(selectedId);
      const byChild = children.length ? countBy(inRegion, (r) => r.regionPath.find((id) => children.some((c) => c.id === id)) || "__none") : [];
      const byStatus = STATUSES.map((st) => [st, inRegion.filter((r) => r.status === st).length]).filter((e) => e[1]);
      const reg = HIER.get(selectedId);
      return h("div", { class: "ccd-dash__detail", "aria-live": "polite", "data-fk": "dash-detail" },
        h("div", { class: "ccd-dash__detailhead" },
          h("div", null,
            h("p", { class: "ccd-eyebrow" }, reg.level === 2 ? "Grande região" : "Seção"),
            h("h3", null, fullLabel(selectedId)),
            h("p", { class: "ccd-muted ccd-small" }, `${plural(inRegion.length, "não conformidade", "não conformidades")}${list.length ? ` · ${fmtPct(inRegion.length / list.length)} do filtro` : ""}`)),
          h("div", { class: "ccd-row" },
            f.region !== selectedId ? h("button", { type: "button", class: "ccd-btn ccd-btn--soft ccd-btn--xs", onclick: () => set(() => { f.region = selectedId; }) }, "Filtrar o painel por esta região") : null,
            h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--xs", "aria-label": "Fechar detalhe da região", onclick: () => set(() => { f.selected = null; }) }, icon("x", 12)))),
        inRegion.length
          ? h("div", { class: "ccd-dash__detailgrid" },
              h("div", null, h("p", { class: "ccd-eyebrow" }, "Tipos de NC nesta região"), hbars(byType, { onPick: (t) => set(() => { f.type = t; }) })),
              byChild.length ? h("div", null, h("p", { class: "ccd-eyebrow" }, reg.level === 2 ? "Por seção" : "Por sistema ou estrutura"), hbars(byChild, { color: "#5279de", labelFor: (id) => (id === "__none" ? "Não detalhada" : labelOf(id)), onPick: (id) => { if (id !== "__none") pickRegion(id); } })) : null,
              h("div", null, h("p", { class: "ccd-eyebrow" }, "Status"), hbars(byStatus, { color: "#6f96e9" })),
              h("div", { class: "ccd-dash__detailrecords" }, h("p", { class: "ccd-eyebrow" }, "Registros"),
                h("ul", null, inRegion.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8).map((r) => h("li", null,
                  h("button", { type: "button", class: "ccd-link", onclick: () => ctx.onOpenRecord(r) }, r.id), h("span", { class: "ccd-muted ccd-xsmall" }, ` ${r.ncType} · ${r.status} · ${fmtDate(r.createdAt)}`))))))
          : empty("Nenhuma NC desta região no filtro atual."));
    })();

    /* ---- AR (rosca) ---- */
    const donut = (() => {
      const withAR = k.withAR, without = k.withoutAR, total = withAR + without;
      const R = 42, C = 2 * Math.PI * R;
      const frac = total ? withAR / total : 0;
      const svg = s("svg", { viewBox: "0 0 120 120", class: "ccd-dash__donut", role: "img", "aria-label": `Registros com AR: ${withAR}; sem AR: ${without}` },
        s("circle", { cx: 60, cy: 60, r: R, fill: "none", stroke: "#dddedf", "stroke-width": 14 }),
        total ? s("circle", { cx: 60, cy: 60, r: R, fill: "none", stroke: "#1253d9", "stroke-width": 14, "stroke-dasharray": `${Math.max(0, C * frac - (frac > 0 && frac < 1 ? 2 : 0))} ${C}`, transform: "rotate(-90 60 60)" }) : null,
        s("text", { x: 60, y: 66, "text-anchor": "middle", class: "ccd-dash__donutvalue" }, fmtInt(total)));
      return h("div", { class: "ccd-dash__donutwrap" }, svg,
        h("ul", { class: "ccd-dash__legend ccd-dash__legend--col" },
          h("li", null, h("span", { class: "ccd-dash__swatch", style: "background:#1253d9" }), "Com AR ", h("strong", null, fmtInt(withAR))),
          h("li", null, h("span", { class: "ccd-dash__swatch", style: "background:#dddedf" }), "Sem AR ", h("strong", null, fmtInt(without))),
          list.length - total ? h("li", { class: "ccd-muted" }, `AR não informada: ${fmtInt(list.length - total)}`) : null));
    })();

    /* ---- funil ---- */
    const funnel = ctx.steps.map((st) => [st.title, list.filter((r) => r.maxStep >= st.id || r.status === "Concluído").length]);

    /* ---- tabela de anexos recentes ---- */
    const q = f.search.trim().toLowerCase();
    const recent = list
      .filter((r) => !q || [r.id, r.ncType, r.status, r.responsible || "", r.regionPath.map(labelOf).join(" ")].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const shown = f.showAll ? recent : recent.slice(0, 20);
    const regionName = (r) => (r.installed === false ? "Fora da aeronave" : r.regionPath.length ? labelOf(r.regionPath[r.regionPath.length > 1 ? 1 : 0]) : "—");

    const ncTypeOptions = [["Todos", "Todos"], ...countBy(all, (r) => r.ncType).map(([t]) => [t, t])];
    const regionOptions = [["Todas", "Todas"],
      ...HIER.childrenOf(HIER.ROOT_ID).map((l2) => ({ group: l2.label, options: [[l2.id, `${l2.label} (toda)`], ...HIER.childrenOf(l2.id).map((l3) => [l3.id, l3.label])] }))];

    const sourceBadge = demo
      ? h("span", { class: "ccd-dash__badge is-demo" }, "Dados fictícios para demonstração")
      : h("span", { class: "ccd-dash__badge" }, `Registros reais: ${fmtInt(all.length)}${ctx.meta.counts ? ` (servidor ${fmtInt(ctx.meta.counts.server)} · este navegador ${fmtInt(ctx.meta.counts.local)})` : ""}`);

    const serverNote = !demo && ctx.meta.serverState === "error"
      ? h("div", { class: "ccd-dash__note ccd-small" }, icon("alert", 14), ` Servidor de registros indisponível (${ctx.meta.serverError}). Exibindo só os registros deste navegador. `, h("button", { type: "button", class: "ccd-link", onclick: ctx.onReload }, "Tentar de novo"))
      : !demo && ctx.meta.scope === "own"
      ? h("div", { class: "ccd-dash__note ccd-small" }, icon("info", 14), " Seu perfil vê apenas os próprios registros do servidor. Perfis de gestão (administrador, aprovador, verificador, consulta) veem todos.")
      : null;

    return h("main", { class: "ccd-page ccd-dash", "data-sk": "main" },
      tip,
      h("div", { class: "ccd-page__inner ccd-page__inner--wide" },
        h("div", { class: "ccd-dash__head" },
          h("div", null, h("h2", null, "Visão gerencial"), h("p", { class: "ccd-muted" }, "Acompanhe a utilização do CTRL+CD, as regiões da aeronave com mais não conformidades e a evolução dos anexos.")),
          h("div", { class: "ccd-dash__headright" }, sourceBadge,
            h("div", { class: "ccd-toggle", role: "group", "aria-label": "Fonte dos dados" },
              [["real", "Registros"], ["demo", "Demonstração"]].map(([v, t]) => h("button", { type: "button", class: `ccd-toggle__btn${ctx.meta.source === v ? " is-active" : ""}`, "aria-pressed": String(ctx.meta.source === v), "data-fk": `dash-source-${v}`, onclick: () => set(() => { f.source = v; f.selected = null; f.type = "Todos"; }) }, t))))),
        serverNote,
        !demo && !all.length ? h("div", { class: "ccd-dash__note ccd-small" }, icon("info", 14), " Ainda não há registros. Use “Demonstração” para ver o painel com dados fictícios.") : null,
        h("div", { class: "ccd-dash__filters", role: "group", "aria-label": "Filtros do painel" },
          select("Período", "period", PERIODS),
          select("Status", "status", [["Todos", "Todos"], ...STATUSES.map((st) => [st, st])]),
          select("AR", "ar", [["Todos", "Todos"], ["com", "Com AR"], ["sem", "Sem AR"]]),
          select("Tipo de NC", "type", ncTypeOptions),
          select("Região", "region", regionOptions),
          h("button", { type: "button", class: "ccd-link ccd-small ccd-dash__clear", onclick: () => set(() => Object.assign(f, { period: "all", status: "Todos", ar: "Todos", type: "Todos", region: "Todas", selected: null, search: "" })) }, "Limpar filtros")),
        h("div", { class: "ccd-dash__tiles" },
          tile("clipboard", fmtInt(k.total), "Total iniciados", kp && delta(k.total, kp.total)),
          tile("check", fmtInt(k.done), "Anexos concluídos", kp && delta(k.done, kp.done), "success"),
          tile("refresh", fmtInt(k.inProgress), "Em andamento", kp && delta(k.inProgress, kp.inProgress), "blue"),
          tile("alert", fmtInt(k.pending), "Com pendências", kp && delta(k.pending, kp.pending), "warning"),
          tile("star", k.rate === null ? "—" : fmtPct(k.rate), "Taxa de conclusão", kp && k.rate !== null && kp.rate !== null ? delta(k.rate, kp.rate, "pp") : null, "violet"),
          tile("file", fmtInt(k.withAR), "Registros com AR", kp && delta(k.withAR, kp.withAR)),
          tile("file", fmtInt(k.withoutAR), "Registros sem AR", kp && delta(k.withoutAR, kp.withoutAR)),
          tile("history", k.avgDays === null ? "—" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(k.avgDays)} dias`, "Tempo médio até o anexo", null, "cyan")),
        h("div", { class: "ccd-dash__grid ccd-dash__grid--map" },
          card("map", "Distribuição por região da aeronave", "Intensidade = quantidade de NCs · clique numa região para ver o detalhe",
            h("div", null,
              h("div", { class: "ccd-dash__mapwrap" }, h("div", null, map.host, map.legend, h("p", { class: "ccd-muted ccd-xsmall ccd-dash__disclaimer" }, "Modelo visual demonstrativo · não representa geometria CAD oficial ou certificada.")), regionList),
              detail),
            { head: ["Região", "NCs", "% do filtro"], rows: regionEntries.map(([id, c]) => [fullLabel(id), fmtInt(c), list.length ? fmtPct(c / list.length) : "—"]) },
            map.levelToggle)),
        h("div", { class: "ccd-dash__grid" },
          card("evolution", "Evolução dos anexos", buckets.truncated ? `Por mês · últimos ${MAX_MONTHS} meses do período` : "Por mês", evolution,
            { head: ["Mês", ...SERIES.map((sr) => sr.label)], rows: buckets.map((b) => [b.label, ...SERIES.map((sr) => fmtInt(b[sr.key]))]) }),
          card("status", "Distribuição por status", "Registros no filtro", hbars(statusCounts, { color: "#5279de", onPick: (st) => set(() => { f.status = st; }) }),
            { head: ["Status", "Registros"], rows: statusCounts.map(([st, c]) => [st, fmtInt(c)]) })),
        h("div", { class: "ccd-dash__grid" },
          card("types", "Tipos de NC", "Mais registrados · clique para filtrar", hbars(countBy(list, (r) => r.ncType).slice(0, 8), { onPick: (t) => set(() => { f.type = t; }) }),
            { head: ["Tipo de NC", "Registros"], rows: countBy(list, (r) => r.ncType).map(([t, c]) => [t, fmtInt(c)]) }),
          card("ar", "Registros com e sem AR", "No filtro atual", donut,
            { head: ["AR", "Registros"], rows: [["Com AR", fmtInt(k.withAR)], ["Sem AR", fmtInt(k.withoutAR)], ["Não informada", fmtInt(list.length - k.withAR - k.withoutAR)]] })),
        h("div", { class: "ccd-dash__grid ccd-dash__grid--single" },
          card("funnel", "Funil do processo", "Registros que chegaram a cada etapa", hbars(funnel, { max: Math.max(1, list.length), color: "#6f96e9" }),
            { head: ["Etapa", "Registros"], rows: funnel.map(([t, c]) => [t, fmtInt(c)]) })),
        h("section", { class: "ccd-dash__card", "aria-labelledby": "dash-recent-t" },
          h("div", { class: "ccd-dash__cardhead" },
            h("div", null, h("h3", { id: "dash-recent-t" }, "Anexos recentes"), h("p", { class: "ccd-muted ccd-xsmall" }, `${plural(shown.length, "registro exibido", "registros exibidos")} de ${fmtInt(recent.length)}`)),
            h("input", { type: "search", class: "ccd-input ccd-input--sm ccd-dash__search", placeholder: "Buscar…", "aria-label": "Buscar nos anexos recentes", "data-fk": "dash-search", value: f.search, oninput: (e) => set(() => { f.search = e.target.value; }) })),
          dataTable({
            head: ["ID", "Criado em", "Tipo de NC", "AR", "Região", "Status", "Progresso", "Responsável", "Atualizado", "Ação"],
            rows: shown.map((r) => [r.id, fmtDate(r.createdAt), r.ncType, r.hasAR === null ? "—" : r.hasAR ? "Sim" : "Não", regionName(r), ctx.StatusBadge(r.status, "sm"), `${r.progress}%`, r.responsible || "—", fmtDate(r.updatedAt),
              h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--xs", onclick: () => ctx.onOpenRecord(r) }, "Ver")]),
          }),
          recent.length > 20 ? h("button", { type: "button", class: "ccd-link ccd-small", onclick: () => set(() => { f.showAll = !f.showAll; }) }, f.showAll ? "Mostrar só os 20 mais recentes" : `Mostrar todos (${fmtInt(recent.length)})`) : null)));
  }

  window.CtrlCDDashboard = Object.freeze({ Page, demoRecords, applyFilters, kpis, monthBuckets });
})();

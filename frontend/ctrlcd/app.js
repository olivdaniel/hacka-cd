/* ==========================================================================
   Ctrl + CD — aplicação de registro de não conformidades
   Portada do protótipo Figma Make (React) para JavaScript puro, dentro da
   área reservada #pageExperiment/#experimentSlot do template HackaEmb.

   Fronteiras com o template (não alterar sem revisar as skills):
   - Não cria outro chat. O "Assistente CTRL" leva o usuário ao #pageChat,
     que é o chat oficial do template (Skills 01–05 conectam RAG a ele).
   - Não usa #pageHacka/#hackaSlot (reservados à Skill 06).
   - Não faz chamadas de rede. Consultas de PN/AR, análise de fotos e revisão
     inteligente são SIMULAÇÕES locais, sinalizadas na interface.
   - Rascunho salvo no navegador (localStorage), somente com dados fictícios;
     imagens ficam em IndexedDB, localmente.
   ========================================================================== */
(() => {
  "use strict";

  const D = window.CtrlCDData;
  const PhotoStore = window.CtrlCDPhotoStore;
  /* CTRL+CD 3D (Fase 6): localização estruturada e captura do modelo, só no navegador. */
  const AircraftLoc = window.CtrlCDAircraftLocation;
  const { h, icon, toast, nowTime, nowDateTime, uid, SafeStorage, trapEscape } = window.CtrlCDUI;

  const DRAFT_KEY = "ctrlcd.draft.v1";
  const HISTORY_KEY = "ctrlcd.history.v1";
  const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
  const ANEXO_NA_MESSAGE = "Não há Norma de Engenharia ou procedimento cadastrado para esta não conformidade.";

  function normalizeNcType(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[–—]/g, "-")
      .replace(/[»]+/g, "/")
      .replace(/\(\s*/g, "(")
      .replace(/\s*\)/g, ")")
      .replace(/\.\)/g, ")")
      .replace(/\.$/g, "")
      .replace(/\s*:\s*/g, ": ")
      .replace(/\(foco:/gi, "(foco: ")
      .toLowerCase()
      .replace(/\s*\/\s*/g, " / ")
      .replace(/\s*-\s*/g, " - ")
        .replace(/(?:\s*\/\s*){2,}/g, " / ")
        .replace(/^furos\s*-\s*/i, "furos / ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseNcInfoItems(text) {
    if (Array.isArray(text)) {
      return text
        .map((item) => (typeof item === "string" ? item : item?.description || ""))
        .map((item) => String(item || "").replace(/\s+/g, " ").trim())
        .filter(Boolean);
    }
    const raw = String(text || "").replace(/\r/g, "").trim();
    if (!raw) return [];
    const matches = [...raw.matchAll(/(?:^|\n)\s*\d+\)\s*([\s\S]*?)(?=(?:\n\s*\d+\)|$))/g)];
    if (!matches.length) return raw.split("\n").map((line) => line.trim()).filter(Boolean);
    return matches.map((match) => match[1].replace(/\s+/g, " ").trim()).filter(Boolean);
  }

  function parseNormLines(text) {
    if (Array.isArray(text)) {
      return text.map((line) => String(line || "").trim()).filter(Boolean);
    }
    const raw = String(text || "").replace(/\r/g, "").trim();
    if (!raw || /^N\/?A$/i.test(raw)) return [];
    return raw.split("\n").map((line) => line.trim()).filter(Boolean);
  }

  const ANEXO_BY_TYPE = new Map(
    (D.ANEXO_6_2_ROWS || []).map((row) => [normalizeNcType(row.normalizedType || row.type || row.ncType), row])
  );

  function getAnexoRowByType(type) {
    return ANEXO_BY_TYPE.get(normalizeNcType(type)) || null;
  }

  function syncRequirementsFromSelectedType(record) {
    const row = getAnexoRowByType(record.ncSelected);
    record.requirementSource = row ? `Anexo 02 - 5529 · Anexo 6.2${row.sourceRow ? ` · linha ${row.sourceRow}` : ""}` : "";
    record.applicableStandards = row ? parseNormLines(row.engineeringStandards || row.norms || "") : [];
    if (!row) {
      record.requirements = [];
      return;
    }
    const items = parseNcInfoItems(row.requirements || row.characterization);
    const rowType = row.type || row.ncType || record.ncSelected;
    record.requirements = items.map((label, index) => ({
      id: `anx-${normalizeNcType(rowType).replace(/[^a-z0-9]+/g, "-")}-${index + 1}`,
      label,
      mandatory: true,
      allowNA: false,
      fieldType: "text",
      status: "not-started",
      value: "",
      asIs: "",
      toBe: "",
      order: index + 1,
    }));
  }

  const VIEW_TITLES = {
    home: "Página inicial",
    "new-record": "Novo registro",
    consult: "Rastreamento",
    history: "Histórico de registros",
    dashboard: "Visão gerencial",
  };

  const RECORD_STATUS = {
    "Concluído": { tone: "success", glyph: "✓" },
    "Em rascunho": { tone: "muted", glyph: "○" },
    "Em preenchimento": { tone: "blue", glyph: "✎" },
    "Com pendência": { tone: "warning", glyph: "⚠" },
    Desatualizado: { tone: "violet", glyph: "↻" },
    "Verificação concluída": { tone: "blue", glyph: "◎" },
  };

  const STEP_STATUS = {
    waiting: { label: "Aguardando", tone: "muted", glyph: "○" },
    "in-progress": { label: "Em andamento", tone: "blue", glyph: "●" },
    done: { label: "Concluída", tone: "success", glyph: "✓" },
    pending: { label: "Com pendência", tone: "warning", glyph: "⚠" },
    blocked: { label: "Bloqueada", tone: "error", glyph: "✕" },
    outdated: { label: "Desatualizada", tone: "violet", glyph: "↻" },
  };

  const CATEGORY_TABS = [
    { key: "all", label: "Todos" },
    { key: "tipo", label: "Tipo" },
    { key: "dados", label: "Dados" },
    { key: "evidencias", label: "Evidências" },
    { key: "verificacao", label: "Verificação" },
    { key: "anexo", label: "Anexo" },
  ];

  const ASSISTANT_SUGGESTIONS = [
    "Quais são os critérios de vazamento aceitável?",
    "Como registrar corretamente o AS IS?",
    "Quais fotos são obrigatórias para Vazamento?",
    "Qual a diferença entre Nota CD e AR?",
  ];

  /* ------------------------------------------------------------------ */
  /* Estado                                                              */
  /* ------------------------------------------------------------------ */
  function freshRecord() {
    const ownerId = currentAccountId();
    const createdAt = new Date().toISOString();
    return {
      id: `NC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      ownerId,
      createdBy: ownerId,
      createdAt,
      updatedAt: createdAt,
      currentStep: 1,
      maxStep: 1,
      ncSearch: "",
      ncSelected: "",
      ncConfirmed: false,
      hasAR: null,
      arNumber: "",
      arStatus: "idle",
      cdNumber: "",
      pn: "",
      pnStatus: "idle",
      serial: "",
      asIs: "",
      toBe: "",
      installedOnAircraft: null,
      regionSelected: "",
      /* localização estruturada (3D ou vistas técnicas); fica só no navegador, como o rascunho */
      aircraftLocation: null,
      offAircraftLocation: "",
      /* requisitos: vêm do Anexo 6.2 ao escolher o tipo de NC (feature tipo de NC) */
      requirements: [],
      requirementSource: "",
      applicableStandards: [],
      photos: [],
      evidenceChecklist: { context: false, defect: false },
      aiRunning: false,
      aiStage: 0,
      aiDone: false,
      aiSuggestions: [],
      aiOpinion: "",
      aiSource: "",
      pdfGenerated: false,
      completedAt: null,
      auditHistory: [],
      versions: [],
    };
  }

  const S = {
    view: "home",
    user: { name: "Usuário", initials: "US", role: "SOLICITANTE" },
    sync: "saved",
    draftOffer: null,
    sidebarCollapsed: false,
    sidebarSearch: "",
    history: { search: "", status: "Todos", type: "Todos", pendency: null, layout: "table" },
    /* Visão gerencial (ctrlcd/dashboard.js): filtros e estado da tela; não é salvo no rascunho */
    dashboard: { period: "all", status: "Todos", ar: "Todos", type: "Todos", region: "Todas", level: 2, selected: null, source: "auto", search: "", showAll: false, tables: {}, server: { state: "idle", items: [], error: "", scope: "" } },
    consult: { search: "", recordId: "", dropdown: false, stepId: "tl-3", filter: "all" },
    rec: freshRecord(),
    ui: {
      rightCollapsed: false,
      ncDropdown: false,
      openReqs: new Set(),
      photoModalId: null,
      step2Tried: false,
      confirmReset: false,
      editingSuggestion: null,
      showVersions: false,
      assistantOpen: false,
      assistantChatId: null,
      assistantMessages: [],
      assistantDraft: "",
      assistantBusy: false,
      resetScroll: false,
      camera: { open: false, status: "inactive", error: "", stream: null, videoReady: false },
    },
  };

  let root = null;
  /* Assistente CTRL fora do Registro de NC: fica disponível em todas as telas do app */
  let assistantRoot = null;
  let fileInput = null;
  let pendingZone = "context";
  let replacingPhotoId = null;

  /* ------------------------------------------------------------------ */
  /* Regras derivadas                                                    */
  /* ------------------------------------------------------------------ */
  function requirementsList(r) {
    if (Array.isArray(r.requirements)) return r.requirements;
    const fallback = D.requirementsForType(r.ncSelected || "Vazamento");
    if (!r.requirements || typeof r.requirements !== "object") return fallback;
    return fallback.map((requirement) => {
      const legacy = r.requirements[requirement.id] ?? r.requirements[requirement.label];
      if (legacy && typeof legacy === "object") return { ...requirement, ...legacy };
      return { ...requirement, value: legacy == null ? requirement.value : legacy };
    });
  }

  const reqValue = (r, id) => requirementsList(r).find((q) => q.id === id)?.value || "";

  function step2Pending(r) {
    const list = [];
    if (r.hasAR === null) list.push("Responder se já existe um AR");
    if (r.hasAR === true && r.arStatus !== "found") list.push("Verificar o número do AR");
    if (r.hasAR === false && r.pnStatus !== "found") list.push("Consultar o PN");
    if (!r.asIs.trim()) list.push("Descrever a condição encontrada (AS IS)");
    if (!r.toBe.trim()) list.push("Descrever a condição esperada (TO-BE)");
    if (r.installedOnAircraft === null) list.push("Informar se a peça está instalada no avião");
    if (r.installedOnAircraft === true && !r.regionSelected) list.push("Confirmar a localização na aeronave");
    const missing = requirementsList(r).filter((q) => q.mandatory && !String(q.value || "").trim()).length;
    if (missing) list.push(`Responder ${missing} requisito${missing > 1 ? "s" : ""} obrigatório${missing > 1 ? "s" : ""}`);
    return list;
  }

  function step3Pending(r) {
    const list = [];
    const zones = zonesForRecord(r);
    for (const zone of zones.filter((item) => item.mandatory)) {
      if (!r.photos.some((photo) => photo.purpose === zone.type && photo.status !== "rejected")) list.push(`Adicionar ${zone.label.toLowerCase()}`);
    }
    if (r.photos.some((p) => p.status === "analyzing")) list.push("Aguardar a análise das evidências");
    if (r.photos.some((p) => p.status === "attention")) list.push("Revisar as evidências com atenção");
    return list;
  }

  function stepDone(id, r) {
    if (r.completedAt) return true;
    if (id === 1) return r.ncConfirmed;
    if (id === 2) return r.hasAR !== null && step2Pending(r).length === 0;
    if (id === 3) return step3Pending(r).length === 0;
    if (id === 4) return r.aiDone && !r.aiSuggestions.some((s) => s.status === "pending");
    if (id === 5) return r.pdfGenerated;
    return false;
  }

  function stepStatus(id, r) {
    if (r.completedAt) return "done";
    if (stepDone(id, r)) return "done";
    if (id === r.currentStep) return "in-progress";
    if (id < r.maxStep) return "pending";
    return "waiting";
  }

  function recordStatus(r) {
    if (r.completedAt) return "Concluído";
    if (r.aiDone) return "Verificação concluída";
    if (r.photos.some((p) => p.status === "rejected" || p.status === "attention")) return "Com pendência";
    if (r.ncConfirmed) return "Em preenchimento";
    return "Em rascunho";
  }

  function recordProgress(r) {
    if (r.completedAt) return 100;
    const done = D.FORM_STEPS.filter((s) => stepDone(s.id, r)).length;
    return Math.round((done / D.FORM_STEPS.length) * 100);
  }

  /** Lista de registros com o NC-2026-0012 refletindo o formulário em edição. */
  function records() {
    const saved = readAccountHistory().filter((record) => record.id !== S.rec.id).map((record) => recordSummary(record));
    if (isPristine(S.rec) || !S.rec.ncConfirmed) return saved;
    return [recordSummary(S.rec), ...saved];
  }

  function recordSummary(r) {
    const pending = D.FORM_STEPS.filter((st) => stepStatus(st.id, r) === "pending").length;
    return {
      id: r.id,
      cdNumber: r.cdNumber || null,
      arNumber: r.hasAR ? r.arNumber || null : null,
      type: r.hasAR ? "AR" : "Nota CD",
      ncType: r.ncSelected || "Não classificada",
      subject: r.asIs || `Novo registro de ${r.ncSelected || "NC"}`,
      responsible: S.user.name,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt || nowDateTime(),
      status: recordStatus(r),
      progress: recordProgress(r),
      pendencies: pending,
      currentStep: r.currentStep,
      pdfGenerated: Boolean(r.pdfGenerated),
      completedAt: r.completedAt || null,
    };
  }

  function readAccountHistory() {
    const raw = SafeStorage.get(`${HISTORY_KEY}.${currentAccountId()}`);
    if (!raw) return [];
    try {
      const records = JSON.parse(raw);
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  }

  function downloadRecord(recordId) {
    const record = recordId === S.rec.id ? S.rec : readAccountHistory().find((item) => item.id === recordId);
    if (!record || recordStatus(record) !== "Concluído") {
      toast("O documento só pode ser baixado após a conclusão da NC.");
      return;
    }
    printAnnex(record);
  }

  function isPristine(r) {
    return !r.ncSelected && r.hasAR === null && !r.asIs && !r.toBe && !r.photos.length && r.maxStep === 1;
  }

  function currentAccountId() {
    try {
      const session = JSON.parse(sessionStorage.getItem("hackaemb.session") || "null");
      return session?.user?.id || session?.user?.email || "anonymous";
    } catch {
      return "anonymous";
    }
  }

  function logoutPortal() {
    sessionStorage.removeItem("hackaemb.session");
    localStorage.removeItem("hackaemb.account");
    window.location.href = "auth/";
  }

  function auditRecord(action, previousValue, newValue) {
    const event = {
      timestamp: new Date().toISOString(),
      action,
      userId: currentAccountId(),
      recordId: S.rec.id,
      previousValue: previousValue ?? null,
      newValue: newValue ?? null,
    };
    S.rec.auditHistory = [...(S.rec.auditHistory || []), event];
    S.rec.updatedAt = event.timestamp;
  }

  function persistAccountHistory() {
    if (isPristine(S.rec) || S.rec.ownerId !== currentAccountId()) return;
    const key = `${HISTORY_KEY}.${currentAccountId()}`;
    const history = SafeStorage.get(key);
    let records = [];
    try { records = history ? JSON.parse(history) : []; } catch { records = []; }
    const summary = serialize(S.rec);
    const index = records.findIndex((record) => record.id === summary.id);
    if (index >= 0) records[index] = summary;
    else records.unshift(summary);
    SafeStorage.set(key, JSON.stringify(records));
  }

  function draftKey() {
    try {
      const session = JSON.parse(sessionStorage.getItem("hackaemb.session") || "null");
      return `${DRAFT_KEY}.${session?.user?.id || session?.user?.email || "anonymous"}`;
    } catch {
      return `${DRAFT_KEY}.anonymous`;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Persistência do rascunho                                            */
  /* ------------------------------------------------------------------ */
  function serialize(r) {
    return {
      ...r,
      aiRunning: false,
      photos: r.photos.map(({ url, blob, ...rest }) => ({ ...rest, url: null, persisted: Boolean(rest.persisted) })),
      savedAt: nowDateTime(),
    };
  }

  let saveTimer = null;
  function scheduleSave() {
    if (isPristine(S.rec)) return;
    S.sync = "saving";
    paintSync();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 700);
  }

  function saveNow() {
    clearTimeout(saveTimer);
    const snapshot = serialize(S.rec);
    const ok = SafeStorage.set(draftKey(), JSON.stringify(snapshot));
    S.sync = ok ? "saved" : "offline";
    paintSync();
    persistAccountHistory();
    if (ok) window.API?.saveRecord?.(snapshot, recordStatus(S.rec)).catch(() => {});
    return ok;
  }

  function readDraft() {
    const raw = SafeStorage.get(draftKey());
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return data && typeof data === "object" && Array.isArray(data.requirements) ? data : null;
    } catch {
      return null;
    }
  }

  function restoreDraft() {
    const data = readDraft();
    if (!data) return;
    S.rec = { ...freshRecord(), ...data, aiRunning: false };
    S.draftOffer = null;
    S.view = "new-record";
    hydratePhotos().then(render);
    toast("Rascunho restaurado.");
    render();
  }

  function discardDraft() {
    SafeStorage.remove(draftKey());
    S.rec = freshRecord();
    S.ui.openReqs = new Set();
    S.ui.photoModalId = null;
    S.draftOffer = null;
    S.ui.confirmReset = false;
    S.sync = "saved";
    render();
  }

  function startNewRecord() {
    update(() => {
      stopCamera();
      SafeStorage.remove(draftKey());
      S.rec = freshRecord();
      auditRecord("CREATE_NC", null, { status: "OPEN" });
      S.draftOffer = null;
      S.ui.openReqs = new Set();
      S.ui.photoModalId = null;
      S.ui.step2Tried = false;
      S.ui.showVersions = false;
      S.view = "new-record";
      S.ui.resetScroll = true;
    }, { save: false });
  }

  /* ------------------------------------------------------------------ */
  /* Renderização                                                        */
  /* ------------------------------------------------------------------ */
  function update(mutator, { save = true } = {}) {
    mutator();
    if (save) scheduleSave();
    render();
  }

  function render() {
    if (!root) return;
    const active = document.activeElement;
    const inApp = (el) => Boolean(el && (root.contains(el) || assistantRoot?.contains(el)));
    const focus =
      active && inApp(active) && active.dataset.fk
        ? { key: active.dataset.fk, start: active.selectionStart, end: active.selectionEnd }
        : null;
    const assistantScroll = assistantRoot?.querySelector(".ccd-assistant__body")?.scrollTop ?? null;
    const scrolls = {};
    for (const el of root.querySelectorAll("[data-sk]")) scrolls[el.dataset.sk] = el.scrollTop;

    root.replaceChildren(buildApp());
    if (assistantRoot) {
      assistantRoot.replaceChildren(...[AssistantCtrl()].flat());
      const body = assistantRoot.querySelector(".ccd-assistant__body");
      /* mantém a posição da conversa e desce até a última mensagem quando ela chega */
      if (body) body.scrollTop = assistantScroll === null || S.ui.assistantScrollToEnd ? body.scrollHeight : assistantScroll;
      S.ui.assistantScrollToEnd = false;
    }
    attachCameraStream();

    if (focus) {
      const el = root.querySelector(`[data-fk="${CSS.escape(focus.key)}"]`) || assistantRoot?.querySelector(`[data-fk="${CSS.escape(focus.key)}"]`);
      if (el) {
        el.focus({ preventScroll: true });
        if (typeof focus.start === "number" && typeof el.setSelectionRange === "function") {
          try {
            el.setSelectionRange(focus.start, focus.end);
          } catch {
            /* tipos de input sem seleção */
          }
        }
      }
    }
    for (const el of root.querySelectorAll("[data-sk]")) {
      if (S.ui.resetScroll && el.dataset.sk === "main") el.scrollTop = 0;
      else if (scrolls[el.dataset.sk] !== undefined) el.scrollTop = scrolls[el.dataset.sk];
    }
    S.ui.resetScroll = false;

    /* Foco inicial no modal da fotografia (acessibilidade). */
    const modal = root.querySelector(".ccd-modal");
    if (modal && !modal.contains(document.activeElement) && !document.querySelector(".ccd-editor")) {
      modal.querySelector('[data-fk="photo-close"]')?.focus({ preventScroll: true });
    }
  }

  function paintSync() {
    const current = root?.querySelector(".ccd-sync");
    if (current) current.replaceWith(SyncIndicator());
  }

  function go(view, extra) {
    update(() => {
      stopCamera();
      S.view = view;
      S.ui.resetScroll = true;
      if (view === "dashboard") S.dashboard.server.state = "idle"; /* recarrega os registros do servidor ao entrar */
      S.ui.assistantOpen = false;
      if (extra) extra();
    }, { save: false });
  }

  function goStep(id) {
    if (S.rec.completedAt) {
      toast("Esta NC já foi concluída e não pode mais ser alterada.");
      return;
    }
    update(() => {
      S.rec.currentStep = id;
      S.rec.maxStep = Math.max(S.rec.maxStep, id);
      S.ui.resetScroll = true;
      S.ui.step2Tried = false;
    });
  }

  function buildApp() {
    return h(
      "div",
      { class: "ccd" },
      Header(),
      h(
        "div",
        { class: "ccd__body" },
        Sidebar(),
        h(
          "div",
          { class: "ccd__content" },
          S.view === "home" && HomePage(),
          S.view === "new-record" && NewRecordPage(),
          S.view === "consult" && ConsultPage(),
          S.view === "history" && HistoryPage(),
          S.view === "dashboard" && DashboardPage()
        )
      ),
      PhotoModal(),
      CameraModal()
    );
  }

  /* ------------------------------------------------------------------ */
  /* Componentes compartilhados                                          */
  /* ------------------------------------------------------------------ */
  function StatusBadge(status, size = "md") {
    const meta = RECORD_STATUS[status] || RECORD_STATUS["Em rascunho"];
    return h(
      "span",
      { class: `ccd-badge ccd-badge--${meta.tone} ccd-badge--${size}`, role: "status", "aria-label": `Status: ${status}` },
      h("span", { "aria-hidden": "true" }, meta.glyph),
      status
    );
  }

  function ProgressBar(value, pendencies) {
    const tone = value >= 100 ? "success" : pendencies > 0 ? "warning" : "blue";
    return h(
      "div",
      { class: "ccd-progress" },
      h("div", { class: "ccd-progress__track", role: "progressbar", "aria-valuenow": value, "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": `Progresso ${value}%` }, h("div", { class: `ccd-progress__fill ccd-progress__fill--${tone}`, style: { width: `${value}%` } })),
      h("span", { class: "ccd-progress__value" }, `${value}%`)
    );
  }

  function StepPill(status, text) {
    const meta = STEP_STATUS[status];
    return h("span", { class: `ccd-pill ccd-pill--${meta.tone}` }, h("span", { "aria-hidden": "true" }, meta.glyph), text || meta.label);
  }

  function SyncIndicator() {
    const map = {
      saved: { label: "Alterações salvas", tone: "success" },
      saving: { label: "Salvando…", tone: "warning" },
      error: { label: "Não foi possível salvar", tone: "error" },
      offline: { label: "Alterações pendentes de sincronização", tone: "muted" },
    };
    const cfg = map[S.sync];
    return h("div", { class: `ccd-sync ccd-sync--${cfg.tone}`, role: "status", "aria-live": "polite" }, h("span", { class: "ccd-sync__dot" }), cfg.label);
  }

  function Card(title, ...children) {
    return h("section", { class: "ccd-card" }, title ? h("h3", { class: "ccd-card__title" }, title) : null, ...children);
  }

  function Field({ label, fk, value, onInput, multiline, placeholder, required, hint, invalid, type = "text", inputmode }) {
    const id = `ccd-${fk}`;
    const hintId = hint ? `${id}-hint` : null;
    const control = multiline
      ? h("textarea", { id, class: `ccd-input ccd-input--area${invalid ? " is-invalid" : ""}`, rows: 3, "data-fk": fk, placeholder, "aria-required": required ? "true" : null, "aria-invalid": invalid ? "true" : null, "aria-describedby": hintId, oninput: (e) => onInput(e.target.value) })
      : h("input", { id, type, inputmode, class: `ccd-input${invalid ? " is-invalid" : ""}`, "data-fk": fk, placeholder, "aria-required": required ? "true" : null, "aria-invalid": invalid ? "true" : null, "aria-describedby": hintId, oninput: (e) => onInput(e.target.value) });
    control.value = value || "";
    return h(
      "div",
      { class: "ccd-field" },
      h("label", { class: "ccd-label", for: id }, label, required ? h("span", { class: "ccd-req", "aria-hidden": "true" }, " *") : null),
      control,
      hint ? h("p", { class: `ccd-hint${invalid ? " is-error" : ""}`, id: hintId }, hint) : null
    );
  }

  function Segmented({ label, options, value, onChange, fk }) {
    return h(
      "div",
      { class: "ccd-field" },
      h("p", { class: "ccd-label", id: `${fk}-label` }, label),
      h(
        "div",
        { class: "ccd-seg", role: "radiogroup", "aria-labelledby": `${fk}-label` },
        options.map((opt) =>
          h(
            "button",
            {
              type: "button",
              role: "radio",
              "aria-checked": String(value === opt.value),
              class: `ccd-seg__btn${value === opt.value ? " is-active" : ""}`,
              "data-fk": `${fk}-${opt.label}`,
              onclick: () => onChange(opt.value),
            },
            opt.label
          )
        )
      )
    );
  }

  function Note(tone, ...children) {
    const glyph = { info: "info", warn: "alert", error: "alert", success: "check", ai: "star" }[tone] || "info";
    return h("div", { class: `ccd-note ccd-note--${tone}` }, icon(glyph, 14), h("div", null, ...children));
  }

  function PendingList(title, items) {
    if (!items.length) return null;
    return h(
      "div",
      { class: "ccd-pending", role: "alert" },
      h("p", { class: "ccd-pending__title" }, icon("alert", 14), title),
      h("ul", null, items.map((i) => h("li", null, i)))
    );
  }

  function EmptyState(iconName, title, text) {
    return h("div", { class: "ccd-empty" }, h("div", { class: "ccd-empty__icon" }, icon(iconName, 28)), h("h2", null, title), text ? h("p", null, text) : null);
  }

  function DraftBanner() {
    if (!S.draftOffer) return null;
    return h(
      "div",
      { class: "ccd-draftbanner", role: "region", "aria-label": "Rascunho salvo" },
      icon("save", 18),
      h("div", { class: "ccd-draftbanner__text" }, h("strong", null, "Existe um rascunho salvo. Deseja continuar?"), h("span", null, `${S.draftOffer.id} · ${S.draftOffer.ncSelected || "tipo não definido"} · salvo em ${S.draftOffer.savedAt || "—"}`)),
      h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--sm", onclick: restoreDraft }, "Continuar rascunho"),
      h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", onclick: discardDraft }, "Descartar e começar novamente")
    );
  }

  /* ------------------------------------------------------------------ */
  /* Cabeçalho e barra lateral                                           */
  /* ------------------------------------------------------------------ */
  function Header() {
    const isRecord = S.view === "new-record";
    const recordId = isRecord ? S.rec.id : S.view === "consult" && S.consult.recordId ? S.consult.recordId : null;
    return h(
      "header",
      { class: "ccd-header" },
      h(
        "div",
        { class: "ccd-header__left" },
        h("h1", { class: "ccd-header__title" }, VIEW_TITLES[S.view]),
        recordId ? [h("span", { class: "ccd-header__sep", "aria-hidden": "true" }, "›"), h("span", { class: "ccd-header__record" }, recordId)] : null,
        isRecord ? h("span", { class: "ccd-header__step" }, `Etapa ${S.rec.currentStep} de 5`) : null
      ),
      h(
        "div",
        { class: "ccd-header__right" },
        isRecord
          ? h(
              "div",
              { class: "ccd-header__actions" },
              S.ui.confirmReset
                ? [
                    h("span", { class: "ccd-header__confirm" }, "Descartar o registro atual?"),
                    h("button", { type: "button", class: "ccd-hbtn ccd-hbtn--danger", onclick: discardDraft }, "Descartar"),
                    h("button", { type: "button", class: "ccd-hbtn", onclick: () => update(() => (S.ui.confirmReset = false), { save: false }) }, "Cancelar"),
                  ]
                : [
                    h("button", { type: "button", class: "ccd-hbtn", onclick: () => { if (saveNow()) toast("Rascunho salvo no navegador."); else toast("Não foi possível salvar: armazenamento do navegador indisponível."); } }, icon("save", 14), "Salvar rascunho"),
                    h("button", { type: "button", class: "ccd-hbtn", onclick: () => update(() => (S.ui.confirmReset = true), { save: false }) }, icon("refresh", 14), "Reiniciar"),
                  ]
            )
          : null,
        SyncIndicator(),
        h(
          "button",
          { type: "button", class: "ccd-hicon", "aria-label": "Notificações (3 fictícias)", onclick: () => toast("Central de notificações: disponível em uma etapa futura.") },
          icon("bell", 16),
          h("span", { class: "ccd-hicon__badge", "aria-hidden": "true" }, "3")
        ),
        h("button", { type: "button", class: "ccd-hicon", "aria-label": "Ajuda: abrir o Assistente CTRL", onclick: () => update(() => (S.ui.assistantOpen = true), { save: false }) }, icon("help", 16)),
        h(
          "div",
          { class: "ccd-header__user" },
          h("div", { class: "ccd-header__userinfo" }, h("span", { class: "ccd-header__username" }, S.user.name), h("span", { class: "ccd-header__userrole" }, S.user.role)),
          h("span", { class: "ccd-avatar", "aria-hidden": "true" }, S.user.initials),
          h("button", { type: "button", class: "ccd-header__logout", onclick: logoutPortal }, "Encerrar sessão")
        )
      )
    );
  }

  function openRecord(id) {
    if (id === S.rec.id) {
      go("new-record");
      return;
    }
    go("consult", () => {
      S.consult.recordId = id;
      S.consult.search = id;
    });
    toast("Este registro pertence a outra conta.");
  }

  function Sidebar() {
    const collapsed = S.sidebarCollapsed;
    const inProgress = records().filter((r) => r.status === "Em preenchimento" || r.status === "Com pendência");
    const term = S.sidebarSearch.trim().toLowerCase();
    const mine = records().filter((r) => !term || r.id.toLowerCase().includes(term) || r.ncType.toLowerCase().includes(term) || r.subject.toLowerCase().includes(term)).slice(0, 5);

    const toggle = h(
      "button",
      { type: "button", class: "ccd-iconbtn", "aria-label": collapsed ? "Expandir menu do Ctrl + CD" : "Recolher menu do Ctrl + CD", "aria-expanded": String(!collapsed), onclick: () => update(() => (S.sidebarCollapsed = !collapsed), { save: false }) },
      icon(collapsed ? "chevronRight" : "chevronLeft", 16)
    );

    if (collapsed) {
      return h(
        "aside",
        { class: "ccd-sidebar is-collapsed", "aria-label": "Menu do Ctrl + CD" },
        h("div", { class: "ccd-sidebar__logo" }, toggle),
        h(
          "nav",
          { class: "ccd-sidebar__mini" },
          h("button", { type: "button", class: "ccd-mini ccd-mini--primary", title: "Novo registro", "aria-label": "Novo registro", onclick: startNewRecord }, icon("plus", 16)),
          h("button", { type: "button", class: `ccd-mini${S.view === "home" ? " is-active" : ""}`, title: "Página inicial", "aria-label": "Página inicial", onclick: () => go("home") }, icon("home", 16)),
          h("button", { type: "button", class: `ccd-mini${S.view === "history" ? " is-active" : ""}`, title: "Histórico", "aria-label": "Histórico", onclick: () => go("history") }, icon("grid", 16)),
          h("button", { type: "button", class: `ccd-mini${S.view === "consult" ? " is-active" : ""}`, title: "Rastreamento", "aria-label": "Rastreamento", onclick: () => go("consult") }, icon("search", 16)),
          h("button", { type: "button", class: `ccd-mini${S.view === "dashboard" ? " is-active" : ""}`, title: "Visão gerencial", "aria-label": "Visão gerencial", "data-fk": "nav-dashboard-mini", onclick: () => go("dashboard") }, icon("chart", 16))
        )
      );
    }

    const section = (label, ...children) => h("div", { class: "ccd-sidebar__section" }, h("p", { class: "ccd-eyebrow" }, label), ...children);

    return h(
      "aside",
      { class: "ccd-sidebar", "aria-label": "Menu do Ctrl + CD", "data-sk": "sidebar" },
      h(
        "div",
        { class: "ccd-sidebar__logo" },
        h("button", { type: "button", class: "ccd-sidebar__brand", onclick: () => go("home"), "aria-label": "Ctrl + CD — página inicial" }, h("img", { src: "assets/logo/ctrl-cd-logo.png", alt: "CTRL + CD" })),
        toggle
      ),
      h("div", { class: "ccd-sidebar__cta" }, h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--block", onclick: startNewRecord }, icon("plus", 16), "Novo registro")),
      h(
        "nav",
        { class: "ccd-sidebar__nav", "aria-label": "Páginas" },
        [
          ["home", "Página inicial", "home"],
          ["consult", "Rastreamento", "search"],
          ["history", "Histórico", "grid"],
          ["dashboard", "Visão gerencial", "chart"],
        ].map(([view, label, ic]) =>
          h("button", { type: "button", class: `ccd-navitem${S.view === view ? " is-active" : ""}`, "aria-current": S.view === view ? "page" : null, onclick: () => go(view) }, icon(ic, 15), label)
        )
      ),
      section(
        "Em andamento",
        inProgress.length
          ? inProgress.map((r) =>
              h(
                "button",
                { type: "button", class: "ccd-sideitem", onclick: () => openRecord(r.id) },
                h("span", { class: "ccd-sideitem__main" }, h("span", { class: "ccd-sideitem__id" }, r.id), h("span", { class: "ccd-minibar" }, h("span", { class: `ccd-minibar__fill${r.pendencies ? " is-warning" : ""}`, style: { width: `${r.progress}%` } }))),
                h("span", { class: `ccd-sideitem__pct${r.pendencies ? " is-warning" : ""}` }, `${r.progress}%`)
              )
            )
          : h("p", { class: "ccd-muted ccd-small" }, "Nenhum em andamento")
      ),
      h(
        "div",
        { class: "ccd-sidebar__search" },
        icon("search", 13),
        h("input", { type: "search", class: "ccd-sidebar__searchinput", placeholder: "Buscar registros…", "aria-label": "Buscar registros", "data-fk": "sidebar-search", value: S.sidebarSearch, oninput: (e) => update(() => (S.sidebarSearch = e.target.value), { save: false }) })
      ),
      section(
        "Meus registros",
        mine.length ? mine.map((r) => h("button", { type: "button", class: "ccd-sideitem ccd-sideitem--stack", onclick: () => go("consult", () => { S.consult.recordId = r.id; S.consult.search = r.id; }) }, h("span", { class: "ccd-sideitem__id" }, r.id), h("span", { class: "ccd-sideitem__sub" }, r.ncType))) : h("p", { class: "ccd-muted ccd-small" }, "Nenhum registro encontrado"),
        h("button", { type: "button", class: "ccd-link ccd-small", onclick: () => go("history") }, "Ver todos →")
      ),
      section(
        "Instruções e referências",
        [
          ["file", "Exemplos de anexos"],
          ["clipboard", "Requisitos por tipo"],
          ["tool", "Procedimentos aplicáveis"],
        ].map(([ic, label]) =>
          h("button", { type: "button", class: "ccd-sideitem ccd-sideitem--link", onclick: () => toast(`${label}: conteúdo A DEFINIR (depende dos documentos cadastrados na base).`) }, icon(ic, 14), label)
        )
      ),
      h(
        "div",
        { class: "ccd-sidebar__profile" },
        h("span", { class: "ccd-avatar ccd-avatar--sm", "aria-hidden": "true" }, S.user.initials),
        h("div", { class: "ccd-sidebar__profileinfo" }, h("p", { class: "ccd-sidebar__name" }, S.user.name), h("p", { class: "ccd-muted ccd-small" }, S.user.role))
      )
    );
  }

  /* ------------------------------------------------------------------ */
  /* Página inicial                                                      */
  /* ------------------------------------------------------------------ */
  function HomePage() {
    const firstName = S.user.name.split(" ")[0];
    const inProgress = records().filter((r) => r.currentStep < 5 && r.progress < 100);
    const recent = records().slice(0, 5);

    const actionCard = ({ iconName, tone, title, text, cta, onClick, primary }) =>
      h(
        "article",
        { class: `ccd-action${primary ? " is-primary" : ""}` },
        h("div", { class: "ccd-action__top" }, h("span", { class: `ccd-action__icon ccd-tone--${tone}` }, icon(iconName, 20)), primary ? h("span", { class: "ccd-tag" }, "Recomendado") : null),
        h("h2", { class: "ccd-action__title" }, title),
        h("p", { class: "ccd-action__text" }, text),
        h("button", { type: "button", class: `ccd-btn ${primary ? "ccd-btn--primary" : "ccd-btn--soft"} ccd-btn--block ccd-action__cta`, onclick: onClick }, cta)
      );

    return h(
      "main",
      { class: "ccd-page", "data-sk": "main" },
      h(
        "div",
        { class: "ccd-page__inner" },
        DraftBanner(),
        h("div", { class: "ccd-hero" }, h("h1", null, `Olá, ${firstName}. `, h("span", { class: "ccd-gradtext" }, "O que você deseja fazer?")), h("p", null, "Gerencie registros de não conformidades para geração de anexos de Nota CD e AR.")),
        h(
          "div",
          { class: "ccd-grid3" },
          actionCard({ iconName: "plus", tone: "blue", title: "Novo registro", text: "Inicie um novo anexo padronizado para Nota CD ou AR com formulário em cinco etapas.", cta: "Iniciar registro →", onClick: startNewRecord, primary: true }),
          actionCard({ iconName: "search", tone: "cyan", title: "Rastrear registro", text: "Acompanhe o progresso de um registro específico e consulte o histórico de atividades.", cta: "Acessar rastreamento →", onClick: () => go("consult") }),
          actionCard({ iconName: "grid", tone: "violet", title: "Ver histórico", text: "Consulte todos os registros, aplique filtros e acesse versões anteriores de anexos.", cta: "Acessar histórico →", onClick: () => go("history") })
        ),
        inProgress.length
          ? h(
              "section",
              null,
              h("div", { class: "ccd-sectionhead" }, h("h2", null, "Em andamento"), h("button", { type: "button", class: "ccd-link", onclick: () => go("history") }, "Ver todos →")),
              h(
                "div",
                { class: "ccd-grid2" },
                inProgress.slice(0, 4).map((r) =>
                  h(
                    "button",
                    { type: "button", class: "ccd-progresscard", onclick: () => openRecord(r.id) },
                    ProgressRing(r.progress, r.pendencies > 0),
                    h(
                      "span",
                      { class: "ccd-progresscard__body" },
                      h("span", { class: "ccd-progresscard__id" }, r.id, r.pendencies ? h("span", { class: "ccd-pill ccd-pill--warning" }, `⚠ ${r.pendencies}`) : null),
                      h("span", { class: "ccd-muted ccd-small ccd-ellipsis" }, `${r.ncType} · Etapa ${r.currentStep}`)
                    )
                  )
                )
              )
            )
          : null,
        h(
          "section",
          null,
          h("div", { class: "ccd-sectionhead" }, h("h2", null, "Registros recentes"), h("button", { type: "button", class: "ccd-link", onclick: () => go("history") }, "Ver todos →")),
          h(
            "div",
            { class: "ccd-table", role: "table", "aria-label": "Registros recentes" },
            h("div", { class: "ccd-table__row ccd-table__head ccd-cols-home", role: "row" }, ["ID", "Assunto", "Tipo de NC", "Status", "Progresso"].map((c) => h("span", { role: "columnheader" }, c))),
            recent.map((r) =>
              h(
                "button",
                { type: "button", class: "ccd-table__row ccd-cols-home", role: "row", onclick: () => go("consult", () => { S.consult.recordId = r.id; S.consult.search = r.id; }) },
                h("span", { class: "ccd-strong-blue", role: "cell" }, r.id),
                h("span", { class: "ccd-ellipsis", role: "cell" }, r.subject),
                h("span", { class: "ccd-ellipsis ccd-muted", role: "cell" }, r.ncType),
                h("span", { role: "cell" }, StatusBadge(r.status, "sm")),
                h("span", { role: "cell" }, ProgressBar(r.progress, r.pendencies))
              )
            )
          )
        ),
        h("p", { class: "ccd-footnote" }, "Registros criados pela conta atual.")
      )
    );
  }

  function ProgressRing(value, warning) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 44 44");
    svg.setAttribute("width", "44");
    svg.setAttribute("height", "44");
    svg.setAttribute("class", `ccd-ring${warning ? " is-warning" : ""}`);
    svg.setAttribute("aria-hidden", "true");
    const c = 2 * Math.PI * 18;
    const bg = document.createElementNS(ns, "circle");
    for (const [k, v] of Object.entries({ cx: 22, cy: 22, r: 18, class: "ccd-ring__bg" })) bg.setAttribute(k, v);
    const fg = document.createElementNS(ns, "circle");
    for (const [k, v] of Object.entries({ cx: 22, cy: 22, r: 18, class: "ccd-ring__fg", "stroke-dasharray": c, "stroke-dashoffset": c * (1 - value / 100), transform: "rotate(-90 22 22)" })) fg.setAttribute(k, v);
    const text = document.createElementNS(ns, "text");
    for (const [k, v] of Object.entries({ x: 22, y: 26, "text-anchor": "middle", class: "ccd-ring__text" })) text.setAttribute(k, v);
    text.textContent = `${value}%`;
    svg.append(bg, fg, text);
    return svg;
  }

  /* ------------------------------------------------------------------ */
  /* Histórico                                                           */
  /* ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------ */
  /* Visão gerencial — dados reais (servidor + navegador) para dashboard.js */
  /* ------------------------------------------------------------------ */
  function parseAnyDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const br = /^(\d{2})\/(\d{2})\/(\d{4})(?:[ ,]+(\d{2}):(\d{2}))?/.exec(String(value));
    const d = br ? new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), Number(br[4] || 0), Number(br[5] || 0)) : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function dashboardRecord(r, extra = {}) {
    const HIER = window.CtrlCDAircraftHierarchy;
    let regionPath = [];
    if (r.installedOnAircraft === true && HIER) {
      const ids = Array.isArray(r.aircraftLocation?.locationIds) && r.aircraftLocation.locationIds.length
        ? r.aircraftLocation.locationIds
        : HIER.pathFromLabel(r.regionSelected || "");
      regionPath = ids.filter((id) => id !== HIER.ROOT_ID && HIER.get(id));
    }
    let status = extra.status;
    let progress = 0;
    try {
      status = status || recordStatus({ photos: [], ...r });
      progress = recordProgress({ photos: [], requirements: [], ...r });
    } catch {
      status = status || "Em rascunho";
    }
    const createdAt = parseAnyDate(r.createdAt) || parseAnyDate(extra.createdAt);
    return {
      id: r.id,
      createdAt,
      updatedAt: parseAnyDate(extra.updatedAt) || parseAnyDate(r.updatedAt) || parseAnyDate(r.savedAt) || createdAt,
      completedAt: parseAnyDate(r.completedAt),
      status: STATUS_NAMES.has(status) ? status : recordStatusFallback(r),
      ncType: r.ncSelected || "Não classificada",
      hasAR: r.hasAR === true ? true : r.hasAR === false ? false : null,
      installed: r.installedOnAircraft === true ? true : r.installedOnAircraft === false ? false : null,
      regionPath,
      maxStep: r.completedAt ? 5 : Number(r.maxStep) || 1,
      progress: r.completedAt ? 100 : progress,
      responsible: extra.ownerName || (extra.mine ? S.user.name : ""),
      origin: extra.origin || "local",
      mine: Boolean(extra.mine),
    };
  }
  const STATUS_NAMES = new Set(["Em rascunho", "Em preenchimento", "Com pendência", "Verificação concluída", "Concluído"]);
  const recordStatusFallback = (r) => (r.completedAt ? "Concluído" : r.ncConfirmed ? "Em preenchimento" : "Em rascunho");

  function loadDashboardServer() {
    const srv = S.dashboard.server;
    if (!window.API?.listRecords) { srv.state = "error"; srv.error = "cliente de API indisponível"; return; }
    srv.state = "loading";
    window.API.listRecords()
      .then((result) => update(() => Object.assign(srv, { state: "ok", items: Array.isArray(result.items) ? result.items : [], scope: result.scope || "", error: "" }), { save: false }))
      .catch((error) => update(() => Object.assign(srv, { state: "error", items: [], error: error.status === 401 ? "sessão expirada no servidor; entre novamente" : error instanceof TypeError ? "porta 8001 sem resposta" : error.message }), { save: false }));
  }

  function DashboardPage() {
    const f = S.dashboard;
    if (!window.CtrlCDDashboard) return h("main", { class: "ccd-page" }, h("div", { class: "ccd-page__inner" }, EmptyState("alert", "Visão gerencial indisponível", "O módulo ctrlcd/dashboard.js não foi carregado.")));
    if (f.server.state === "idle") loadDashboardServer();
    const merged = new Map();
    const put = (item) => {
      if (!item.id || !item.createdAt) return;
      const current = merged.get(item.id);
      if (!current || (item.updatedAt && current.updatedAt && item.updatedAt > current.updatedAt)) merged.set(item.id, { ...item, responsible: item.responsible || current?.responsible || "" });
    };
    let serverCount = 0;
    for (const it of f.server.items) {
      if (it && it.record && typeof it.record === "object") { put(dashboardRecord({ ...it.record, id: it.record.id || it.id }, { status: it.status, ownerName: it.ownerName, updatedAt: it.updatedAt, createdAt: it.createdAt, origin: "server" })); serverCount += 1; }
    }
    const local = [...readAccountHistory(), ...(isPristine(S.rec) ? [] : [S.rec])];
    for (const r of local) put(dashboardRecord(r, { mine: true, origin: "local" }));
    const items = [...merged.values()];
    const source = f.source === "auto" ? (items.length ? "real" : "demo") : f.source;
    return window.CtrlCDDashboard.Page({
      h, icon, StatusBadge,
      state: f,
      set: (mutator) => update(mutator, { save: false }),
      hierarchy: window.CtrlCDAircraftHierarchy,
      topView: window.CtrlCDAircraftTopView,
      ncTypes: D.NC_TYPES,
      steps: D.FORM_STEPS,
      items,
      meta: { source, counts: { server: serverCount, local: local.length }, serverState: f.server.state, serverError: f.server.error, scope: f.server.scope },
      onReload: () => update(() => { f.server.state = "idle"; }, { save: false }),
      onOpenRecord: (r) => {
        if (r.origin === "demo") toast("Registro fictício de demonstração.");
        else if (r.id === S.rec.id) go("new-record");
        else if (r.mine) go("history", () => { S.history.search = r.id; });
        else go("consult", () => { S.consult.recordId = r.id; S.consult.search = r.id; });
      },
    });
  }

  function HistoryPage() {
    const f = S.history;
    const q = f.search.trim().toLowerCase();
    const list = records().filter((r) => {
      if (f.status !== "Todos" && r.status !== f.status) return false;
      if (f.type !== "Todos" && r.type !== f.type) return false;
      if (f.pendency === true && r.pendencies === 0) return false;
      if (f.pendency === false && r.pendencies > 0) return false;
      if (q) return [r.id, r.subject, r.ncType, r.responsible, r.cdNumber || "", r.arNumber || ""].some((v) => v.toLowerCase().includes(q));
      return true;
    });

    const filterGroup = (label, options, current, set) =>
      h(
        "div",
        { class: "ccd-filtergroup", role: "group", "aria-label": label },
        h("p", { class: "ccd-eyebrow" }, label),
        options.map(([text, value]) => h("button", { type: "button", class: `ccd-filter${current === value ? " is-active" : ""}`, "aria-pressed": String(current === value), onclick: () => update(() => set(value), { save: false }) }, text))
      );

    const actions = (r) => [
      r.progress < 100 ? h("button", { type: "button", class: "ccd-btn ccd-btn--soft ccd-btn--xs", onclick: (e) => { e.stopPropagation(); openRecord(r.id); } }, "Continuar") : null,
      r.completedAt ? h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--xs", onclick: (e) => { e.stopPropagation(); downloadRecord(r.id); } }, icon("download", 13), "Baixar") : null,
      h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--xs", onclick: (e) => { e.stopPropagation(); go("consult", () => { S.consult.recordId = r.id; S.consult.search = r.id; }); } }, "Ver"),
    ];

    return h(
      "main",
      { class: "ccd-page", "data-sk": "main" },
      h(
        "div",
        { class: "ccd-page__inner ccd-page__inner--wide ccd-history" },
        h(
          "aside",
          { class: "ccd-card ccd-history__filters", "aria-label": "Filtros" },
          h("h3", { class: "ccd-card__title" }, "Filtros"),
          h("div", { class: "ccd-field" }, h("label", { class: "ccd-eyebrow", for: "ccd-history-search" }, "Busca"), h("input", { id: "ccd-history-search", type: "search", class: "ccd-input ccd-input--sm", placeholder: "ID, assunto…", "data-fk": "history-search", value: f.search, oninput: (e) => update(() => (f.search = e.target.value), { save: false }) })),
          filterGroup("Tipo", [["Todos", "Todos"], ["Nota CD", "Nota CD"], ["AR", "AR"]], f.type, (v) => (f.type = v)),
          filterGroup("Status", ["Todos", "Em rascunho", "Em preenchimento", "Com pendência", "Verificação concluída", "Concluído"].map((s) => [s, s]), f.status, (v) => (f.status = v)),
          filterGroup("Pendências", [["Todos", null], ["Com pendências", true], ["Sem pendências", false]], f.pendency, (v) => (f.pendency = v)),
          h("button", { type: "button", class: "ccd-link ccd-small", onclick: () => update(() => Object.assign(f, { search: "", status: "Todos", type: "Todos", pendency: null }), { save: false }) }, "Limpar filtros")
        ),
        h(
          "div",
          { class: "ccd-history__results" },
          h(
            "div",
            { class: "ccd-sectionhead" },
            h("div", { class: "ccd-row" }, h("h2", null, "Histórico de registros"), h("span", { class: "ccd-count" }, `${list.length} registro${list.length !== 1 ? "s" : ""}`)),
            h(
              "div",
              { class: "ccd-row" },
              h(
                "div",
                { class: "ccd-toggle", role: "group", "aria-label": "Visualização" },
                [["table", "≡ Tabela"], ["cards", "⊞ Cards"]].map(([k, label]) => h("button", { type: "button", class: `ccd-toggle__btn${f.layout === k ? " is-active" : ""}`, "aria-pressed": String(f.layout === k), onclick: () => update(() => (f.layout = k), { save: false }) }, label))
              ),
              h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--sm", onclick: startNewRecord }, icon("plus", 14), "Novo registro")
            )
          ),
          !list.length
            ? h("div", { class: "ccd-card" }, EmptyState("file", "Nenhum registro encontrado", "Ajuste os filtros ou limpe a busca."))
            : f.layout === "table"
            ? h(
                "div",
                { class: "ccd-table", role: "table", "aria-label": "Registros" },
                h("div", { class: "ccd-table__row ccd-table__head ccd-cols-history", role: "row" }, ["ID", "Assunto", "Tipo de NC", "Status", "Progresso", "Ações"].map((c) => h("span", { role: "columnheader" }, c))),
                list.map((r) =>
                  h(
                    "div",
                    { class: "ccd-table__row ccd-cols-history is-static", role: "row" },
                    h("span", { class: "ccd-strong-blue", role: "cell" }, r.id),
                    h("span", { class: "ccd-ellipsis", role: "cell", title: r.subject }, r.subject),
                    h("span", { class: "ccd-ellipsis ccd-muted", role: "cell", title: r.ncType }, r.ncType),
                    h("span", { role: "cell" }, StatusBadge(r.status, "sm")),
                    h("span", { role: "cell" }, ProgressBar(r.progress, r.pendencies)),
                    h("span", { class: "ccd-row", role: "cell" }, actions(r))
                  )
                )
              )
            : h(
                "div",
                { class: "ccd-grid2" },
                list.map((r) =>
                  h(
                    "article",
                    { class: "ccd-card ccd-reccard" },
                    h("div", { class: "ccd-reccard__top" }, h("div", null, h("p", { class: "ccd-strong-blue" }, r.id), r.cdNumber ? h("p", { class: "ccd-muted ccd-small" }, r.cdNumber) : null), StatusBadge(r.status, "sm")),
                    h("p", { class: "ccd-reccard__subject" }, r.subject),
                    ProgressBar(r.progress, r.pendencies),
                    r.pendencies ? h("p", { class: "ccd-text-warning ccd-small" }, `⚠ ${r.pendencies} pendência${r.pendencies !== 1 ? "s" : ""}`) : null,
                    h("div", { class: "ccd-reccard__actions" }, actions(r))
                  )
                )
              ),
          h("p", { class: "ccd-footnote" }, "Registros criados pela conta atual.")
        )
      )
    );
  }

  /* ------------------------------------------------------------------ */
  /* Rastreamento                                                        */
  /* ------------------------------------------------------------------ */
  function ConsultPage() {
    const c = S.consult;
    const q = c.search.trim().toLowerCase();
    const suggestions = records().filter((r) => !q || [r.id, r.ncType, r.subject, r.responsible, r.cdNumber || "", r.arNumber || ""].some((v) => v.toLowerCase().includes(q)));
    const record = records().find((r) => r.id === c.recordId) || null;
    const activeStep = D.TIMELINE_STEPS.find((s) => s.id === c.stepId) || D.TIMELINE_STEPS[0];
    const events = c.filter === "all" ? D.ACTIVITY_EVENTS : D.ACTIVITY_EVENTS.filter((e) => e.category === c.filter);

    const pick = (r) => update(() => { c.recordId = r.id; c.search = r.id; c.dropdown = false; }, { save: false });

    return h(
      "main",
      { class: "ccd-page", "data-sk": "main" },
      h(
        "div",
        { class: "ccd-page__inner" },
        h(
          "div",
          { class: "ccd-combobox" },
          h(
            "div",
            { class: `ccd-searchbar${c.dropdown ? " is-open" : ""}` },
            icon("search", 18),
            h("input", {
              type: "text",
              class: "ccd-searchbar__input",
              placeholder: "Buscar por ID, Nota CD, AR, tipo ou responsável…",
              "aria-label": "Buscar registro",
              role: "combobox",
              "aria-expanded": String(c.dropdown && suggestions.length > 0),
              "aria-controls": "ccd-consult-list",
              "data-fk": "consult-search",
              value: c.search,
              oninput: (e) => update(() => { c.search = e.target.value; c.dropdown = true; }, { save: false }),
              onfocus: () => { if (!c.dropdown) update(() => (c.dropdown = true), { save: false }); },
              onblur: () => setTimeout(() => { if (c.dropdown && document.activeElement?.dataset.fk !== "consult-search") update(() => (c.dropdown = false), { save: false }); }, 160),
              onkeydown: (e) => {
                if (e.key === "Enter" && suggestions[0]) pick(suggestions[0]);
                if (e.key === "Escape") update(() => (c.dropdown = false), { save: false });
              },
            }),
            c.search ? h("button", { type: "button", class: "ccd-iconbtn", "aria-label": "Limpar busca", onclick: () => update(() => { c.search = ""; c.recordId = ""; }, { save: false }) }, icon("x", 14)) : null
          ),
          c.dropdown && suggestions.length
            ? h(
                "div",
                { class: "ccd-dropdown", id: "ccd-consult-list", role: "listbox" },
                suggestions.map((r) =>
                  h(
                    "button",
                    { type: "button", role: "option", class: "ccd-dropdown__item", onmousedown: (e) => { e.preventDefault(); pick(r); } },
                    h("span", { class: "ccd-dropdown__main" }, h("span", { class: "ccd-strong-blue" }, r.id), h("span", { class: "ccd-muted ccd-small ccd-ellipsis" }, r.subject)),
                    StatusBadge(r.status, "sm")
                  )
                )
              )
            : null
        ),
        !record
          ? EmptyState("search", "Nenhum registro selecionado", "Pesquise por ID interno, Nota CD, AR ou tipo para rastrear um registro.")
          : [
              h(
                "section",
                { class: "ccd-card" },
                h(
                  "dl",
                  { class: "ccd-summarygrid" },
                  [
                    ["ID interno", record.id],
                    ["Nota CD", record.cdNumber || "Ainda não informada"],
                    ["AR", record.arNumber || "Não informado"],
                    ["Tipo de NC", record.ncType],
                  ].map(([k, v]) => h("div", null, h("dt", { class: "ccd-eyebrow" }, k), h("dd", { class: k === "ID interno" ? "ccd-strong-blue" : "ccd-strong" }, v)))
                ),
                h("p", { class: "ccd-strong" }, record.subject),
                h(
                  "div",
                  { class: "ccd-row ccd-row--wrap ccd-small ccd-muted" },
                  h("span", null, `Responsável: ${record.responsible}`),
                  h("span", null, `Atualizado: ${record.updatedAt}`),
                  StatusBadge(record.status, "sm"),
                  record.pendencies ? h("span", { class: "ccd-pill ccd-pill--warning" }, `⚠ ${record.pendencies} pendência${record.pendencies !== 1 ? "s" : ""}`) : null
                ),
                Note("info", "A linha do tempo e as atividades exibidas pertencem ao registro da conta atual.")
              ),
              h(
                "section",
                { class: "ccd-card ccd-card--flush" },
                h("h3", { class: "ccd-card__title ccd-card__title--pad" }, "Progresso do registro"),
                h(
                  "ol",
                  { class: "ccd-timeline" },
                  D.TIMELINE_STEPS.map((step, i) =>
                    h(
                      "li",
                      { class: `ccd-timeline__step is-${STEP_STATUS[step.status].tone}${step.id === activeStep.id ? " is-current" : ""}${step.status === "done" ? " is-done" : ""}` },
                      h(
                        "button",
                        { type: "button", class: "ccd-timeline__btn", "aria-pressed": String(step.id === activeStep.id), onclick: () => update(() => (c.stepId = step.id), { save: false }) },
                        h("span", { class: "ccd-timeline__dot" }, step.status === "done" ? "✓" : String(i + 1)),
                        h("span", { class: "ccd-timeline__title" }, step.title),
                        step.date ? h("span", { class: "ccd-muted ccd-xsmall" }, step.date.slice(0, 5)) : null
                      )
                    )
                  )
                ),
                h(
                  "div",
                  { class: "ccd-stepdetail" },
                  h("span", { class: `ccd-stepdetail__icon ccd-tone--${STEP_STATUS[activeStep.status].tone}` }, STEP_STATUS[activeStep.status].glyph),
                  h(
                    "div",
                    null,
                    h("div", { class: "ccd-row" }, h("strong", null, activeStep.title), StepPill(activeStep.status)),
                    activeStep.description ? h("p", { class: "ccd-muted" }, activeStep.description) : null,
                    activeStep.details?.length ? h("ul", { class: "ccd-bullets" }, activeStep.details.map((d) => h("li", null, d))) : null,
                    activeStep.nextAction ? Note("warn", "Ação necessária: ", activeStep.nextAction) : null
                  )
                )
              ),
              h(
                "section",
                { class: "ccd-card ccd-card--flush" },
                h("h3", { class: "ccd-card__title ccd-card__title--pad" }, "Histórico de atividades"),
                h(
                  "div",
                  { class: "ccd-tabs", role: "tablist", "aria-label": "Categorias de atividade" },
                  CATEGORY_TABS.map((t) => h("button", { type: "button", role: "tab", "aria-selected": String(c.filter === t.key), class: `ccd-tabs__tab${c.filter === t.key ? " is-active" : ""}`, onclick: () => update(() => (c.filter = t.key), { save: false }) }, t.label))
                ),
                events.length
                  ? h(
                      "ul",
                      { class: "ccd-activity" },
                      events.map((ev) =>
                        h(
                          "li",
                          { class: "ccd-activity__item" },
                          h("div", { class: "ccd-activity__time" }, h("strong", null, ev.time), h("span", { class: "ccd-muted ccd-xsmall" }, ev.date.slice(0, 5))),
                          h("div", { class: "ccd-activity__body" }, h("div", { class: "ccd-row" }, h("strong", null, ev.action), h("span", { class: `ccd-pill ccd-pill--cat-${ev.category}` }, CATEGORY_TABS.find((t) => t.key === ev.category)?.label)), h("p", { class: "ccd-muted" }, ev.summary)),
                          h("span", { class: "ccd-muted ccd-small" }, ev.user)
                        )
                      )
                    )
                  : h("p", { class: "ccd-muted ccd-center ccd-pad" }, "Nenhuma atividade nesta categoria")
              ),
            ],
        h("p", { class: "ccd-footnote" }, "Registros criados pela conta atual.")
      )
    );
  }

  /* ------------------------------------------------------------------ */
  /* Novo registro — estrutura                                           */
  /* ------------------------------------------------------------------ */
  function NewRecordPage() {
    const r = S.rec;
    return h(
      "div",
      { class: "ccd-record" },
      h(
        "div",
        { class: "ccd-record__main", "data-sk": "main" },
        h(
          "div",
          { class: "ccd-steptabs", role: "tablist", "aria-label": "Etapas do registro" },
          D.FORM_STEPS.map((step) => {
            const status = stepStatus(step.id, r);
            const isActive = step.id === r.currentStep;
            const canClick = step.id <= r.maxStep;
            return h(
              "button",
              {
                type: "button",
                role: "tab",
                "aria-selected": String(isActive),
                "aria-disabled": String(!canClick),
                "data-fk": `tab-${step.id}`,
                class: `ccd-steptab is-${status}${isActive ? " is-active" : ""}`,
                title: canClick ? step.title : "Conclua as etapas anteriores",
                onclick: () => canClick && goStep(step.id),
              },
              h("span", { class: "ccd-steptab__num" }, status === "done" ? "✓" : String(step.id)),
              h("span", { class: "ccd-steptab__label" }, step.shortTitle)
            );
          })
        ),
        h(
          "div",
          { class: "ccd-record__form" },
          DraftBanner(),
          r.currentStep === 1 && Step1(),
          r.currentStep === 2 && Step2(),
          r.currentStep === 3 && Step3(),
          r.currentStep === 4 && Step4(),
          r.currentStep === 5 && Step5()
        )
      ),
      RightPanel()
    );
  }

  function StepShell(title, description, ...children) {
    return h("div", { class: "ccd-stepshell" }, h("div", null, h("h2", { class: "ccd-stepshell__title" }, title), h("p", { class: "ccd-stepshell__desc" }, description)), ...children);
  }

  function NextButton(label, onClick, pending, extraClass = "") {
    const blocked = pending && pending.length > 0;
    return h(
      "button",
      {
        type: "button",
        class: `ccd-btn ccd-btn--primary ${extraClass}`,
        "aria-disabled": blocked ? "true" : null,
        title: blocked ? `Para continuar: ${pending.join("; ")}` : null,
        onclick: onClick,
      },
      label
    );
  }

  /* ------------------------------------------------------------------ */
  /* Etapa 1 — Tipo de não conformidade                                  */
  /* ------------------------------------------------------------------ */
  function Step1() {
    const r = S.rec;
    const term = r.ncSearch.trim().toLowerCase();
    const filtered = term ? D.NC_TYPES.filter((t) => t.toLowerCase().includes(term)) : D.NC_TYPES;
    const selectedRow = getAnexoRowByType(r.ncSelected);
    const normLines = parseNormLines(selectedRow?.engineeringStandards || selectedRow?.norms || "");
    const infoDisabled = !r.ncSelected;

    const choose = (type) =>
      update(() => {
        const previous = r.ncSelected;
        r.ncSelected = type;
        r.ncSearch = type;
        r.ncConfirmed = false;
        r.asIs = "";
        r.toBe = "";
        syncRequirementsFromSelectedType(r);
        auditRecord("UPDATE_CLASSIFICATION", previous, type);
        S.ui.ncDropdown = false;
      });

    const highlight = (text) => {
      if (!term) return text;
      const i = text.toLowerCase().indexOf(term);
      if (i < 0) return text;
      return [text.slice(0, i), h("mark", null, text.slice(i, i + term.length)), text.slice(i + term.length)];
    };

    return StepShell(
      "1. Tipo de não conformidade",
      "Selecione o tipo que melhor representa a condição encontrada.",
      h(
        "div",
        { class: "ccd-combobox" },
        h("label", { class: "ccd-label", for: "ccd-nc-search" }, "Tipo de não conformidade", h("span", { class: "ccd-req", "aria-hidden": "true" }, " *")),
        h(
          "div",
          { class: `ccd-searchbar${S.ui.ncDropdown ? " is-open" : ""}` },
          icon("search", 16),
          h("input", {
            id: "ccd-nc-search",
            type: "text",
            class: "ccd-searchbar__input",
            placeholder: "Pesquisar por tipo de não conformidade…",
            role: "combobox",
            "aria-expanded": String(S.ui.ncDropdown),
            "aria-controls": "ccd-nc-list",
            "aria-autocomplete": "list",
            "data-fk": "nc-search",
            value: r.ncSearch,
            oninput: (e) =>
              update(() => {
                r.ncSearch = e.target.value;
                S.ui.ncDropdown = true;
                if (r.ncSelected && e.target.value !== r.ncSelected) {
                  r.ncSelected = "";
                  r.ncConfirmed = false;
                  r.requirements = [];
                  r.requirementSource = "";
                  r.applicableStandards = [];
                }
              }),
            onfocus: () => { if (!S.ui.ncDropdown) update(() => (S.ui.ncDropdown = true), { save: false }); },
            onblur: () => setTimeout(() => { if (S.ui.ncDropdown && document.activeElement?.dataset.fk !== "nc-search") update(() => (S.ui.ncDropdown = false), { save: false }); }, 180),
            onkeydown: (e) => {
              if (e.key === "Enter" && filtered[0]) { e.preventDefault(); choose(filtered[0]); }
              if (e.key === "Escape") update(() => (S.ui.ncDropdown = false), { save: false });
            },
          }),
          h(
            "div",
            { class: "ccd-searchbar__actions" },
            h(
              "div",
              { class: `ccd-info${infoDisabled ? " is-disabled" : ""}` },
              h("button", { type: "button", class: "ccd-info__btn", "aria-label": "Norma de Engenharia aplicável", disabled: infoDisabled }, "i"),
              h(
                "div",
                { class: "ccd-info__tooltip", role: "tooltip" },
                normLines.length
                  ? h("ul", { class: "ccd-info__list" }, normLines.map((line) => h("li", null, line)))
                  : h("p", { class: "ccd-info__empty" }, selectedRow && /^N\/?A$/i.test(String((selectedRow.engineeringStandards || selectedRow.norms || "")).trim()) ? ANEXO_NA_MESSAGE : "Selecione uma não conformidade para visualizar as normas.")
              )
            ),
            r.ncSearch
              ? h("button", {
                  type: "button",
                  class: "ccd-iconbtn",
                  "aria-label": "Limpar seleção",
                  onclick: () => update(() => { r.ncSearch = ""; r.ncSelected = ""; r.ncConfirmed = false; r.asIs = ""; r.toBe = ""; r.requirements = []; r.requirementSource = ""; r.applicableStandards = []; }),
                }, icon("x", 14))
              : null
          )
        ),
        S.ui.ncDropdown
          ? h(
              "div",
              { class: "ccd-dropdown ccd-dropdown--tall", id: "ccd-nc-list", role: "listbox", "aria-label": "Tipos de não conformidade" },
              filtered.length
                ? filtered.map((type) => {
                    const parts = type.match(/^(.+?)\s*\((.+)\)$/);
                    const primary = parts ? parts[1].trim() : type;
                    const secondary = parts ? parts[2].trim() : null;
                    return h(
                      "button",
                      { type: "button", role: "option", "aria-selected": String(r.ncSelected === type), class: `ccd-dropdown__item ccd-dropdown__item--stack${r.ncSelected === type ? " is-selected" : ""}`, onmousedown: (e) => { e.preventDefault(); choose(type); } },
                      h("span", null, highlight(primary)),
                      secondary ? h("span", { class: "ccd-muted ccd-xsmall" }, secondary.startsWith("Foco") ? secondary : `Detalhe: ${secondary}`) : null
                    );
                  })
                : h("p", { class: "ccd-muted ccd-center ccd-pad" }, `Nenhum tipo encontrado para "${r.ncSearch}"`)
            )
          : null
      ),
      h("p", { class: "ccd-hint" }, `${D.NC_NUMBERED_COUNT || D.NC_TYPES.length} tipos na lista oficial do Anexo 6.2.`),
      r.ncSelected && !r.ncConfirmed
        ? h(
            "div",
            { class: "ccd-selectionbox" },
            h("p", { class: "ccd-eyebrow" }, "Tipo selecionado"),
            h("p", { class: "ccd-selectionbox__value" }, r.ncSelected),
            h(
              "div",
              { class: "ccd-row" },
              h("button", { type: "button", class: "ccd-btn ccd-btn--primary", "data-fk": "nc-confirm", onclick: () => update(() => (r.ncConfirmed = true)) }, "Confirmar tipo"),
              h("button", { type: "button", class: "ccd-btn ccd-btn--ghost", onclick: () => update(() => { r.ncSelected = ""; r.ncSearch = ""; r.requirements = []; r.requirementSource = ""; r.applicableStandards = []; }) }, "Alterar seleção")
            )
          )
        : null,
      r.ncConfirmed
        ? h(
            "div",
            { class: "ccd-confirmbox" },
            h("span", { class: "ccd-confirmbox__icon" }, icon("check", 16)),
            h("div", { class: "ccd-confirmbox__text" }, h("p", { class: "ccd-text-success ccd-small" }, "Tipo confirmado pelo usuário"), h("p", { class: "ccd-strong" }, r.ncSelected)),
            h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", onclick: () => update(() => (r.ncConfirmed = false)) }, "Alterar"),
            h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--sm", "data-fk": "step1-next", onclick: () => goStep(2) }, "Próxima etapa →")
          )
        : null,
      null
    );
  }

  /* ------------------------------------------------------------------ */
  /* Etapa 2 — Dados e requisitos                                        */
  /* ------------------------------------------------------------------ */
  function fillDemoData() {
    update(() => {
      const r = S.rec;
      r.hasAR = false;
      r.pn = "PN-ABC-123456";
      r.pnStatus = "found";
      r.serial = "SN-008742";
      r.asIs = "Foi identificado vazamento de fluido na interface inferior do conjunto durante o teste funcional.";
      r.toBe = "O conjunto deverá permanecer estanque durante o teste funcional, sem evidência de vazamento nas interfaces.";
      r.installedOnAircraft = true;
      r.regionSelected = "Asa direita · Sistema hidráulico · Interface inferior";
      r.aircraftLocation = null;
      for (const q of r.requirements) {
        if (q.id === "req-01") q.value = "A DEFINIR — critério não fornecido";
        if (q.id === "req-12") q.value = "Não";
      }
    });
    toast("Dados fictícios de demonstração preenchidos.");
  }

  function LookupResult(title, rows) {
    return h(
      "div",
      { class: "ccd-lookup" },
      h("p", { class: "ccd-text-success ccd-small" }, "✓ ", title, h("span", { class: "ccd-tag ccd-tag--muted" }, "Consulta simulada")),
      h("dl", { class: "ccd-kv" }, rows.map(([k, v, auto]) => [h("dt", null, k), h("dd", null, v, auto ? h("span", { class: "ccd-tag ccd-tag--cyan" }, "Auto") : null)]))
    );
  }

  function simulateLookup(field, statusField) {
    const r = S.rec;
    if (!r[field].trim()) {
      toast("Informe um valor antes de consultar.");
      return;
    }
    update(() => (r[statusField] = "checking"), { save: false });
    setTimeout(() => update(() => (r[statusField] = "found")), 900);
  }

  /* CTRL+CD 3D (Fase 6): guarda a localização estruturada e a captura (IndexedDB local). */
  function applyLocationDetail(r, detail) {
    r.aircraftLocation = detail && detail.location ? detail.location : null;
    if (!AircraftLoc) return;
    const id = r.id;
    if (detail && detail.snapshotDataUrl) {
      AircraftLoc.SnapshotStore.save(id, detail.snapshotDataUrl).then(render).catch(() => toast("Não foi possível guardar a captura do modelo neste navegador."));
    } else {
      AircraftLoc.SnapshotStore.remove(id).catch(() => {});
    }
  }

  const snapshotLoads = new Set();
  /* URL da captura do registro; carrega do IndexedDB uma vez e redesenha quando chegar. */
  function aircraftSnapshotUrl(r) {
    if (!AircraftLoc || !r.aircraftLocation || !r.aircraftLocation.snapshot) return null;
    const url = AircraftLoc.SnapshotStore.peek(r.id);
    if (url || snapshotLoads.has(r.id)) return url;
    snapshotLoads.add(r.id);
    AircraftLoc.SnapshotStore.load(r.id).then((u) => { if (u) render(); }).catch(() => {});
    return null;
  }

  function LocationSection() {
    const r = S.rec;
    const onLocationConfirm = (region, detail) => update(() => {
      r.regionSelected = region;
      applyLocationDetail(r, detail);
    });
    const open2D = () =>
      window.CtrlCDAircraft.open({
        current: r.regionSelected,
        location: r.aircraftLocation,
        onConfirm: onLocationConfirm,
      });
    /* CTRL+CD 3D (Fase 6): o modelo 3D é o localizador principal; as vistas técnicas (2D) ficam como alternativa. */
    const open3D = () =>
      window.CtrlCDAircraft3D.open({
        current: r.regionSelected,
        location: r.aircraftLocation,
        onConfirm: onLocationConfirm,
      });
    const has3D = Boolean(window.CtrlCDAircraft3D) && window.CTRLCD_3D_ENABLED !== false;
    const openLocator = has3D ? open3D : open2D;
    const snapUrl = aircraftSnapshotUrl(r);
    return h(
      "div",
      { class: "ccd-stack" },
      Segmented({ label: "Está instalada no avião? *", fk: "installed", value: r.installedOnAircraft, options: [{ label: "Sim", value: true }, { label: "Não", value: false }], onChange: (v) => update(() => (r.installedOnAircraft = v)) }),
      r.installedOnAircraft === true
        ? r.regionSelected
          ? h(
              "div",
              { class: "ccd-confirmbox" },
              h("span", { class: "ccd-confirmbox__icon" }, icon("check", 16)),
              h(
                "div",
                { class: "ccd-confirmbox__text" },
                h("p", { class: "ccd-text-success ccd-small" }, "Localização confirmada pelo usuário"),
                h("p", { class: "ccd-strong" }, r.regionSelected),
                r.aircraftLocation && AircraftLoc ? h("p", { class: "ccd-muted ccd-small", "data-fk": "location-detail" }, AircraftLoc.summary(r.aircraftLocation)) : null
              ),
              snapUrl ? h("img", { class: "ccd-locsnap", src: snapUrl, "data-fk": "location-snapshot", alt: `Captura do modelo da aeronave com a localização: ${r.regionSelected}` }) : null,
              h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", "data-fk": "edit-location", onclick: openLocator }, "Editar")
            )
          : h("button", { type: "button", class: "ccd-btn ccd-btn--soft", "data-fk": "open-3d", onclick: openLocator }, icon("cube", 16), "Selecionar no modelo da aeronave")
        : null,
      r.installedOnAircraft === true && has3D
        ? h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", "data-fk": "open-2d", onclick: open2D, title: "Alternativa ao modelo 3D: seleção pelas vistas técnicas" }, "Usar vistas técnicas (2D)")
        : null,
      r.installedOnAircraft === false ? Field({ label: "Onde a peça se encontra? (opcional)", fk: "off-aircraft", value: r.offAircraftLocation, placeholder: "Ex.: bancada de montagem, almoxarifado…", onInput: (v) => update(() => (r.offAircraftLocation = v)) }) : null
    );
  }

  function RequirementRow(q) {
    const done = Boolean(String(q.asIs || "").trim() && String(q.toBe || "").trim());
    const invalid = S.ui.step2Tried && !done;

    return h(
      "div",
      { class: `ccd-reqrow${done ? " is-done" : ""}${invalid ? " is-missing" : ""}` },
      h(
        "div",
        { class: "ccd-req__body" },
        h("p", { class: "ccd-req__label" }, `${q.order}. ${q.label}`),
        Field({
          label: "AS IS",
          fk: `req-${q.id}-asis`,
          required: true,
          multiline: true,
          value: q.asIs || "",
          invalid: invalid && !String(q.asIs || "").trim(),
          placeholder: "Descreva a condição atual deste item.",
          onInput: (v) => update(() => {
            q.asIs = v;
            const complete = String(q.asIs || "").trim() && String(q.toBe || "").trim();
            q.value = complete ? `${q.asIs}\n${q.toBe}` : "";
            q.status = complete ? "met" : "not-started";
          }),
        }),
        Field({
          label: "TO BE",
          fk: `req-${q.id}-tobe`,
          required: true,
          multiline: true,
          value: q.toBe || "",
          invalid: invalid && !String(q.toBe || "").trim(),
          placeholder: "Descreva a condição esperada deste item.",
          onInput: (v) => update(() => {
            q.toBe = v;
            const complete = String(q.asIs || "").trim() && String(q.toBe || "").trim();
            q.value = complete ? `${q.asIs}\n${q.toBe}` : "";
            q.status = complete ? "met" : "not-started";
          }),
        })
      )
    );
  }

  function Step2() {
    const r = S.rec;
    const selectedRow = getAnexoRowByType(r.ncSelected);
    if (r.ncSelected && (!r.requirements.length || (r.requirements[0] && r.requirements[0].asIs === undefined))) {
      /* integração: respostas de rascunhos no formato anterior (req-*) são preservadas para consulta */
      const answered = requirementsList(r).filter((q) => q.asIs === undefined && String(q.value || "").trim());
      if (answered.length && !r.legacyRequirements?.length) r.legacyRequirements = answered.map((q) => ({ label: q.label, value: q.value }));
      syncRequirementsFromSelectedType(r);
    }
    const pending = step2Pending(r);
    const tried = S.ui.step2Tried;
    const met = requirementsList(r).filter((q) => String(q.value || "").trim()).length;

    const arCard =
      r.hasAR === true
        ? Card(
            "Dados do AR",
            h(
              "div",
              { class: "ccd-field" },
              h("label", { class: "ccd-label", for: "ccd-ar" }, "Nº do AR", h("span", { class: "ccd-req" }, " *")),
              h(
                "div",
                { class: "ccd-row" },
                (() => { const i = h("input", { id: "ccd-ar", class: `ccd-input${r.arStatus === "found" ? " is-valid" : ""}`, placeholder: "Ex.: AR-1144", "data-fk": "ar", oninput: (e) => update(() => { r.arNumber = e.target.value; r.arStatus = "idle"; }) }); i.value = r.arNumber; return i; })(),
                h("button", { type: "button", class: "ccd-btn ccd-btn--primary", disabled: r.arStatus === "checking", onclick: () => simulateLookup("arNumber", "arStatus") }, r.arStatus === "checking" ? "Verificando…" : "Verificar")
              ),
              r.arStatus === "checking" ? h("p", { class: "ccd-hint" }, "Verificando número do AR…") : null,
              r.arStatus === "found" ? LookupResult("AR localizado", [["AR", r.arNumber], ["PN vinculado", D.MOCK_LOOKUP.ar.pn, true], ["Ecode", D.MOCK_LOOKUP.ar.ecode, true], ["Descrição", D.MOCK_LOOKUP.ar.description, true], ["Aeronave", D.MOCK_LOOKUP.ar.aircraft, true]]) : null
            ),
            Field({ label: "Nº da Nota CD (opcional)", fk: "cd", value: r.cdNumber, placeholder: "Ainda não informada", onInput: (v) => update(() => (r.cdNumber = v)) })
          )
        : null;

    const pnCard =
      r.hasAR === false
        ? Card(
            "Identificação do material",
            h(
              "div",
              { class: "ccd-field" },
              h("label", { class: "ccd-label", for: "ccd-pn" }, "PN", h("span", { class: "ccd-req" }, " *")),
              h(
                "div",
                { class: "ccd-row" },
                (() => { const i = h("input", { id: "ccd-pn", class: `ccd-input${r.pnStatus === "found" ? " is-valid" : ""}`, placeholder: "Ex.: PN-ABC-123456", "data-fk": "pn", oninput: (e) => update(() => { r.pn = e.target.value; r.pnStatus = "idle"; }) }); i.value = r.pn; return i; })(),
                h("button", { type: "button", class: "ccd-btn ccd-btn--primary", disabled: r.pnStatus === "checking", onclick: () => simulateLookup("pn", "pnStatus") }, r.pnStatus === "checking" ? "Consultando…" : "Consultar")
              ),
              r.pnStatus === "checking" ? h("p", { class: "ccd-hint" }, "Consultando PN…") : null,
              r.pnStatus === "found" ? LookupResult("PN localizado", [["PN", r.pn], ["Ecode", D.MOCK_LOOKUP.pn.ecode, true], ["Descrição", D.MOCK_LOOKUP.pn.description, true]]) : null
            ),
            Field({ label: "Número de série (opcional)", fk: "serial", value: r.serial, placeholder: "Opcional", onInput: (v) => update(() => (r.serial = v)) }),
            Field({ label: "Nº da Nota CD (opcional)", fk: "cd", value: r.cdNumber, placeholder: "Ainda não informada", onInput: (v) => update(() => (r.cdNumber = v)) })
          )
        : null;

    const conditionCard =
      r.hasAR !== null
        ? Card(
            "Descrição da ocorrência",
            Field({ label: "Condição encontrada, AS IS", fk: "asis", required: true, multiline: true, value: r.asIs, invalid: tried && !r.asIs.trim(), hint: tried && !r.asIs.trim() ? "Descreva objetivamente a condição atual." : "Descrição objetiva: medidas, posição e extensão.", placeholder: "Descreva como a peça ou a condição se encontra atualmente.", onInput: (v) => update(() => (r.asIs = v)) }),
            Field({ label: "Condição esperada, TO-BE", fk: "tobe", required: true, multiline: true, value: r.toBe, invalid: tried && !r.toBe.trim(), hint: tried && !r.toBe.trim() ? "Descreva o estado esperado." : "Estado esperado, tolerância e critério de aceitação.", placeholder: "Descreva como a peça ou a condição deveria estar.", onInput: (v) => update(() => (r.toBe = v)) })
          )
        : null;

    return StepShell(
      "2. Dados da ocorrência e requisitos técnicos",
      "Preencha as informações e os requisitos para o tipo selecionado.",
      h("div", { class: "ccd-row ccd-row--end" }, h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", onclick: fillDemoData }, icon("clipboard", 14), "Preencher com dados fictícios de demonstração")),
      Card("Vínculo com AR", Segmented({ label: "Já existe um AR para esta ocorrência?", fk: "hasar", value: r.hasAR, options: [{ label: "Sim", value: true }, { label: "Não", value: false }], onChange: (v) => update(() => (r.hasAR = v)) })),
      arCard,
      pnCard,
      conditionCard,
      r.hasAR !== null ? Card("Localização da peça", LocationSection()) : null,
      r.hasAR !== null
        ? Card(
            `Requisitos técnicos — ${r.ncSelected || "tipo não definido"}`,
            !r.ncSelected
              ? h("p", { class: "ccd-muted ccd-small" }, "Selecione uma não conformidade na Etapa 1 para visualizar os requisitos técnicos.")
              : null,
            r.ncSelected && !selectedRow
              ? h("p", { class: "ccd-muted ccd-small" }, "Não existem informações de caracterização cadastradas para esta não conformidade.")
              : null,
            selectedRow && !r.requirements.length
              ? h("p", { class: "ccd-muted ccd-small" }, "O Anexo 6.2 não lista itens de caracterização para este tipo.")
              : null,
            selectedRow && r.requirements.length
              ? h("p", { class: "ccd-muted ccd-small" }, `${met} de ${r.requirements.length} requisitos respondidos`)
              : null,
            r.legacyRequirements?.length
              ? Note("info", h("strong", null, "Respostas do formato anterior (consulta): "), r.legacyRequirements.map((q) => `${q.label}: ${q.value}`).join(" · "))
              : null,
            selectedRow
              ? h("div", { class: "ccd-stack ccd-stack--tight" }, r.requirements.map(RequirementRow))
              : null
          )
        : null,
      tried ? PendingList("Para continuar:", pending) : null,
      h(
        "div",
        { class: "ccd-row" },
        h("button", { type: "button", class: "ccd-btn ccd-btn--ghost", onclick: () => goStep(1) }, "← Etapa anterior"),
        NextButton("Próxima etapa →", () => {
          if (pending.length) update(() => (S.ui.step2Tried = true), { save: false });
          else goStep(3);
        }, pending)
      )
    );
  }

  /* ------------------------------------------------------------------ */
  /* Etapa 3 — Evidências                                                */
  /* ------------------------------------------------------------------ */
  const ZONES = [
    { type: "context", label: "Foto de localização no avião", description: "Foto mais ampla que permita identificar a região, estrutura ou componente.", mandatory: true },
    { type: "defect", label: "Foto da não conformidade", description: "Foto aproximada que mostre claramente a condição encontrada.", mandatory: true },
    { type: "requirement", label: "Fotos adicionais", description: "Evidências de requisitos, medições ou detalhes complementares.", mandatory: false },
  ];

  const VIDEO_NC_TYPES = new Set(["Vazamento", "Ruído", "Interferência (Atrito)"]);

  function zonesForRecord(record) {
    const zones = ZONES.filter((zone) => zone.type !== "context" || record.installedOnAircraft !== false).map((zone) => ({ ...zone }));
    if (VIDEO_NC_TYPES.has(record.ncSelected)) {
      zones.push({ type: "video", label: "Vídeo da não conformidade", description: "Registre o comportamento funcional e a região afetada.", mandatory: true, media: "video" });
    }
    return zones;
  }

  function pickPhoto(zone, replaceId = null) {
    pendingZone = zone;
    replacingPhotoId = replaceId;
    fileInput.accept = zone === "video" ? "video/*" : "image/*";
    fileInput.setAttribute("capture", zone === "video" ? "environment" : "environment");
    fileInput.value = "";
    fileInput.click();
  }

  function openCamera(zone, replaceId = null) {
    pendingZone = zone;
    replacingPhotoId = replaceId;
    S.ui.camera = { open: true, status: "requesting", error: "", stream: null, videoReady: false };
    render();
    window.setTimeout(startCamera, 0);
  }

  async function startCamera() {
    if (!S.ui.camera.open) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      S.ui.camera.status = "error";
      S.ui.camera.error = "A câmera exige HTTPS ou http://localhost neste navegador.";
      render();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
      if (!S.ui.camera.open) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (!stream.getVideoTracks().length) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Nenhuma câmera foi encontrada neste dispositivo.");
      }
      S.ui.camera.stream = stream;
      S.ui.camera.status = "active";
      render();
      attachCameraStream();
      window.setTimeout(() => {
        if (S.ui.camera.open && S.ui.camera.stream === stream && !S.ui.camera.videoReady) {
          stream.getTracks().forEach((track) => track.stop());
          S.ui.camera.stream = null;
          S.ui.camera.status = "error";
          S.ui.camera.error = "Não foi possível iniciar a pré-visualização da câmera.";
          render();
        }
      }, 3000);
    } catch (error) {
      S.ui.camera.status = "error";
      S.ui.camera.error = error?.name === "NotAllowedError" ? "A permissão da câmera foi recusada. Autorize o acesso e tente novamente." : error?.name === "NotFoundError" || error?.message === "Nenhuma câmera foi encontrada neste dispositivo." ? "Nenhuma câmera foi encontrada neste dispositivo." : "Não foi possível iniciar a câmera. Verifique a permissão do navegador.";
      render();
    }
  }

  function stopCamera() {
    const camera = S.ui.camera;
    camera.stream?.getTracks().forEach((track) => track.stop());
    camera.open = false;
    camera.status = "inactive";
    camera.stream = null;
    camera.videoReady = false;
  }

  function attachCameraStream() {
    const camera = S.ui.camera;
    const video = root?.querySelector("[data-camera-video]");
    if (!camera.open || !camera.stream || !video) return;
    const markVideoReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0 && !S.ui.camera.videoReady) {
        S.ui.camera.videoReady = true;
        render();
      }
    };
    video.onloadedmetadata = markVideoReady;
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
    video.srcObject = camera.stream;
    video.play().then(markVideoReady).catch(() => markVideoReady());
  }

  function captureCamera() {
    const video = root.querySelector("[data-camera-video]");
    if (!video || !S.ui.camera.videoReady) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context || !canvas.width || !canvas.height) {
      toast("A pré-visualização ainda não está pronta. Tente novamente.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    S.ui.camera.status = "capturing";
    render();
    const finishCapture = (blob) => {
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
      stopCamera();
      addPhotos([file], pendingZone, true);
    };
    canvas.toBlob((blob) => {
      if (blob) {
        finishCapture(blob);
        return;
      }
      try {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        const binary = atob(dataUrl.split(",")[1]);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        finishCapture(new Blob([bytes], { type: "image/jpeg" }));
      } catch {
        S.ui.camera.status = "active";
        render();
        toast("Não foi possível criar a fotografia. Tente novamente.");
      }
    }, "image/jpeg", 0.92);
  }

  function CameraModal() {
    const camera = S.ui.camera;
    if (!camera.open) return null;
    const close = () => { stopCamera(); render(); };
    const message = camera.status === "requesting" ? "Solicitando permissão para usar a câmera…" : camera.status === "capturing" ? "Preparando fotografia…" : camera.error || "Posicione a evidência no enquadramento.";
    return h("div", { class: "ccd-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "ccd-camera-title", onmousedown: (e) => { if (e.target === e.currentTarget) close(); } },
      h("div", { class: "ccd-modal__panel ccd-camera" },
        h("div", { class: "ccd-modal__head" }, h("h2", { id: "ccd-camera-title" }, "Capturar evidência"), h("button", { type: "button", class: "ccd-iconbtn", "aria-label": "Fechar câmera", "data-fk": "camera-close", onclick: close }, icon("x", 16))),
        h("p", { class: "ccd-muted ccd-small" }, "A fotografia será armazenada somente neste navegador."),
        camera.status === "error" ? h("div", { class: "ccd-camera__message ccd-camera__message--error", role: "alert" }, icon("alert", 18), message) : h("div", { class: "ccd-camera__preview" }, h("video", { "data-camera-video": "true", autoplay: true, playsinline: true, muted: true, "aria-label": "Pré-visualização da câmera" }), camera.status === "requesting" ? h("span", { class: "ccd-camera__loading" }, message) : null),
        camera.status === "error" ? h("button", { type: "button", class: "ccd-btn ccd-btn--soft", onclick: startCamera }, "Tentar novamente") : h("p", { class: "ccd-muted ccd-small" }, message),
        h("div", { class: "ccd-row" }, h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-grow", onclick: close }, "Cancelar"), h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-grow", disabled: !camera.videoReady || camera.status !== "active", onclick: captureCamera }, icon("circle", 16), "Capturar foto"))
      )
    );
  }

  function simulatedCriteria(purpose) {
    return [
      { label: "Iluminação", status: "Aprovado", justification: "Iluminação adequada." },
      { label: "Enquadramento", status: "Atenção", justification: "A região afetada poderia estar mais próxima.", recommendation: "Tente uma foto mais próxima." },
      { label: "Legibilidade", status: "Aprovado", justification: "Detalhes legíveis." },
      { label: "Identificação", status: "Aprovado", justification: "Componente identificável." },
      { label: "Qualidade", status: "Aprovado", justification: "Resolução adequada." },
      purpose === "context"
        ? { label: "Contexto da localização", status: "Aprovado", justification: "Contexto suficiente." }
        : { label: "Contexto da localização", status: "Não aplicável", justification: "Critério avaliado na foto de localização." },
    ];
  }

  function addPhotos(fileList, zone, capturedByCamera = false) {
    const files = Array.from(fileList || []);
    const r = S.rec;
    for (const file of files) {
      const isVideoZone = zone === "video";
      const validMedia = isVideoZone ? file.type.startsWith("video/") : file.type.startsWith("image/");
      if (!validMedia) {
        toast(`Formato não aceito: ${file.name}. Envie ${isVideoZone ? "um vídeo" : "uma imagem"}.`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        toast(`Arquivo muito grande: ${file.name} (limite de 15 MB no protótipo).`);
        continue;
      }
      const url = URL.createObjectURL(file);
      if (replacingPhotoId) {
        const target = r.photos.find((p) => p.id === replacingPhotoId);
        if (target) {
          if (target.url?.startsWith("blob:")) URL.revokeObjectURL(target.url);
          Object.assign(target, { url, fileName: file.name, status: capturedByCamera ? "accepted" : "analyzing", criteria: capturedByCamera ? simulatedCriteria(zone) : null, edited: false, uploadedAt: nowTime() });
          persistPhoto(target, file);
          if (!capturedByCamera) scheduleAnalysis(target.id);
        }
        replacingPhotoId = null;
        continue;
      }
      const photo = {
        id: uid(),
        purpose: zone,
        label: (ZONES.find((z) => z.type === zone) || { label: "Vídeo da não conformidade" }).label,
        caption: "",
        requirementId: "",
        fileName: file.name,
        url,
        status: capturedByCamera ? "accepted" : "analyzing",
        criteria: capturedByCamera ? simulatedCriteria(zone) : null,
        uploadedAt: nowTime(),
      };
      r.photos.push(photo);
      auditRecord("ADD_EVIDENCE", null, { id: photo.id, fileName: photo.fileName, purpose: photo.purpose });
      persistPhoto(photo, file);
      if (!capturedByCamera) scheduleAnalysis(photo.id);
    }
    S.ui.photoModalId = null;
    scheduleSave();
    render();
    if (files.length) toast("Evidência adicionada. Análise simulada em andamento…");
  }

  async function persistPhoto(photo, blob) {
    if (!PhotoStore) return;
    const { url, ...metadata } = photo;
    let width = 0;
    let height = 0;
    try {
      if (window.createImageBitmap) {
        try {
          const bitmap = await window.createImageBitmap(blob);
          width = bitmap.width;
          height = bitmap.height;
          bitmap.close();
        } catch {
          width = 0;
          height = 0;
        }
      }
      await PhotoStore.put({ ...metadata, recordId: S.rec.id, createdAt: new Date().toISOString(), mimeType: blob.type, width, height, blob });
    } catch {
      toast("Não foi possível persistir esta foto localmente.");
    }
  }

  async function hydratePhotos() {
    if (!PhotoStore) return;
    try {
      const saved = await PhotoStore.list(S.rec.id);
      for (const stored of saved) {
        const current = S.rec.photos.find((photo) => photo.id === stored.id);
        if (current) {
          current.url = URL.createObjectURL(stored.blob);
          current.persisted = true;
        } else {
          S.rec.photos.push({ ...stored, url: URL.createObjectURL(stored.blob), persisted: true });
        }
      }
    } catch {
      toast("O armazenamento local de fotos está indisponível.");
    }
  }

  function scheduleAnalysis(id) {
    setTimeout(() => {
      const photo = S.rec.photos.find((p) => p.id === id);
      if (!photo || photo.status !== "analyzing") return;
      update(() => {
        photo.status = "attention";
        photo.criteria = simulatedCriteria(photo.purpose);
        if (!S.ui.photoModalId) S.ui.photoModalId = id;
      });
    }, 1800);
  }

  function removePhoto(id) {
    update(() => {
      const r = S.rec;
      const photo = r.photos.find((p) => p.id === id);
      if (photo?.url?.startsWith("blob:")) URL.revokeObjectURL(photo.url);
      r.photos = r.photos.filter((p) => p.id !== id);
      auditRecord("REMOVE_EVIDENCE", { id, fileName: photo?.fileName || null }, null);
      if (S.ui.photoModalId === id) S.ui.photoModalId = null;
    });
    PhotoStore?.remove(id).catch(() => toast("Não foi possível remover a foto do armazenamento local."));
    toast("Evidência removida.");
  }

  function photoStatusText(p) {
    return { analyzing: "Analisando…", approved: "✓ Aceita", attention: "⚠ Atenção", rejected: "✕ Reprovada", pending: "Pendente" }[p.status] || p.fileName;
  }

  function Step3() {
    const r = S.rec;
    const pending = step3Pending(r);
    return StepShell(
      "3. Evidências e mídia",
      "Adicione imagens e, quando o tipo exigir, um vídeo demonstrativo da condição encontrada.",
      zonesForRecord(r).map((zone) => {
        const media = r.photos.filter((photo) => photo.purpose === zone.type);
        const isVideo = zone.media === "video";
        return Card(
          `${zone.label} ${zone.mandatory ? "*" : "(opcional)"}`,
          h("p", { class: "ccd-muted ccd-small" }, zone.description),
          h("div", { class: "ccd-dropzone" },
            media.map((photo) => h("button", { type: "button", class: `ccd-thumb is-${photo.status}`, "aria-label": `${photo.label}: ${photo.fileName} — ${photoStatusText(photo)}`, disabled: photo.status === "analyzing", onclick: () => update(() => (S.ui.photoModalId = photo.id), { save: false }) }, photo.url && !isVideo ? h("img", { src: photo.url, alt: photo.caption || photo.label }) : h("span", { class: "ccd-thumb__placeholder" }, icon(isVideo ? "file" : "image", 20), h("span", null, photo.fileName)), h("span", { class: "ccd-thumb__status" }, photoStatusText(photo)))),
            h("div", { class: "ccd-photo-actions" },
              h("button", { type: "button", class: "ccd-addphoto", onclick: () => isVideo ? pickPhoto("video") : openCamera(zone.type) }, icon("circle", 20), h("span", null, isVideo ? "Capturar vídeo" : "Usar câmera")),
              h("button", { type: "button", class: "ccd-addphoto", onclick: () => pickPhoto(zone.type) }, icon("image", 20), h("span", null, isVideo ? "Enviar vídeo" : "Escolher imagem"))
            )
          ),
          h("p", { class: "ccd-hint" }, `${media.length} evidência${media.length !== 1 ? "s" : ""}`)
        );
      }),
      PendingList("Pendências desta etapa:", pending),
      h(
        "div",
        { class: "ccd-row" },
        h("button", { type: "button", class: "ccd-btn ccd-btn--ghost", onclick: () => goStep(2) }, "← Etapa anterior"),
        NextButton("Próxima etapa →", () => goStep(4), [])
      )
    );
  }

  function PhotoModal() {
    const photo = S.rec.photos.find((p) => p.id === S.ui.photoModalId);
    if (!photo || S.view !== "new-record") return null;
    const r = S.rec;
    const close = () => update(() => (S.ui.photoModalId = null), { save: false });
    const tone = (status) => ({ Aprovado: "success", Atenção: "warning", Reprovado: "error" }[status] || "muted");

    const captionInput = h("input", { id: "ccd-photo-caption", class: "ccd-input ccd-input--sm", "data-fk": "photo-caption", placeholder: "O que a imagem evidencia", oninput: (e) => update(() => (photo.caption = e.target.value)) });
    captionInput.value = photo.caption || "";
    const reqSelect = h(
      "select",
      { id: "ccd-photo-req", class: "ccd-input ccd-input--sm", "data-fk": "photo-req", onchange: (e) => update(() => (photo.requirementId = e.target.value)) },
      h("option", { value: "" }, "Nenhum"),
      r.requirements.map((q) => h("option", { value: q.id }, q.label))
    );
    reqSelect.value = photo.requirementId || "";

    return h(
      "div",
      {
        class: "ccd-modal",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "ccd-photo-title",
        onmousedown: (e) => { if (e.target === e.currentTarget) close(); },
      },
      h(
        "div",
        { class: "ccd-modal__panel" },
        h("div", { class: "ccd-modal__head" }, h("h2", { id: "ccd-photo-title" }, "Análise automática da fotografia"), h("button", { type: "button", class: "ccd-iconbtn", "aria-label": "Fechar", "data-fk": "photo-close", onclick: close }, icon("x", 16))),
        Note("warn", "Esta avaliação é uma ", h("strong", null, "simulação local"), " e deve ser revisada pelo usuário."),
        photo.url ? h("img", { class: "ccd-modal__img", src: photo.url, alt: photo.caption || photo.label }) : h("div", { class: "ccd-modal__img ccd-thumb__placeholder" }, "Imagem não persistida — substitua para visualizar."),
        h("p", { class: "ccd-muted ccd-small" }, `${photo.label} · ${photo.fileName} · ${photo.uploadedAt || ""}${photo.edited ? " · editada" : ""}`),
        photo.criteria
          ? h(
              "ul",
              { class: "ccd-criteria" },
              photo.criteria.map((c) =>
                h(
                  "li",
                  { class: "ccd-criteria__item" },
                  h("div", { class: "ccd-row ccd-row--between" }, h("strong", null, c.label), h("span", { class: `ccd-pill ccd-pill--${tone(c.status)}` }, c.status)),
                  h("p", { class: "ccd-muted ccd-small" }, c.justification),
                  c.recommendation ? h("p", { class: "ccd-text-warning ccd-small" }, `→ ${c.recommendation}`) : null
                )
              )
            )
          : h("p", { class: "ccd-muted" }, "Análise ainda não disponível."),
        h("div", { class: "ccd-grid2 ccd-grid2--tight" }, h("div", { class: "ccd-field" }, h("label", { class: "ccd-label", for: "ccd-photo-caption" }, "Legenda"), captionInput), h("div", { class: "ccd-field" }, h("label", { class: "ccd-label", for: "ccd-photo-req" }, "Requisito associado"), reqSelect)),
        h(
          "div",
          { class: "ccd-row" },
          h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-grow", "data-fk": "photo-accept", onclick: () => update(() => { photo.status = "approved"; S.ui.photoModalId = null; }) }, "Aceitar evidência"),
          h("button", { type: "button", class: "ccd-btn ccd-btn--soft ccd-grow", onclick: () => pickPhoto(photo.purpose, photo.id) }, "Substituir foto")
        ),
        h(
          "div",
          { class: "ccd-row ccd-row--between" },
          photo.url
            ? h(
                "button",
                {
                  type: "button",
                  class: "ccd-link",
                  onclick: () =>
                    window.CtrlCDPhotoEditor.open({
                      url: photo.url,
                      title: `Editor de fotografias — ${photo.label}`,
                      onSave: (dataUrl) => {
                        update(() => { photo.url = dataUrl; photo.edited = true; photo.status = "approved"; });
                        fetch(dataUrl).then((response) => response.blob()).then((blob) => persistPhoto(photo, blob)).catch(() => toast("Não foi possível persistir a edição localmente."));
                      },
                    }),
                },
                "Abrir editor de imagem"
              )
            : h("span"),
          h("button", { type: "button", class: "ccd-link ccd-link--danger", onclick: () => removePhoto(photo.id) }, icon("trash", 13), "Remover evidência")
        )
      )
    );
  }

  /* ------------------------------------------------------------------ */
  /* Etapa 4 — Verificação e revisão inteligente                         */
  /* ------------------------------------------------------------------ */
  function compiledRows(r) {
    const notInformed = "Não informado";
    return [
      ["ID interno", r.id],
      ["Nota CD", r.cdNumber || "Ainda não informada"],
      ["AR", r.hasAR ? r.arNumber || notInformed : r.hasAR === false ? "Não existente" : notInformed],
      ["Tipo de NC", r.ncSelected || notInformed],
      ["PN", r.hasAR ? (r.arStatus === "found" ? D.MOCK_LOOKUP.ar.pn : notInformed) : r.pn || notInformed],
      ["Nº de série", r.serial || notInformed],
      ["Ecode", r.pnStatus === "found" || r.arStatus === "found" ? D.MOCK_LOOKUP.pn.ecode : notInformed],
      ["Descrição do material", r.pnStatus === "found" || r.arStatus === "found" ? D.MOCK_LOOKUP.pn.description : notInformed],
      ["Instalada na aeronave", r.installedOnAircraft === null ? notInformed : r.installedOnAircraft ? "Sim" : "Não"],
      ["Localização", r.installedOnAircraft ? r.regionSelected || notInformed : r.offAircraftLocation || notInformed],
      ...(r.installedOnAircraft && r.aircraftLocation && AircraftLoc ? AircraftLoc.rows(r.aircraftLocation) : []),
      ["AS IS", r.asIs || notInformed],
      ["TO-BE", r.toBe || notInformed],
      ["Normas aplicáveis", r.applicableStandards?.length ? r.applicableStandards.join(", ") : r.ncSelected ? "Sem Norma de Engenharia cadastrada no Anexo 6.2" : notInformed],
      ["Responsável", S.user.name],
    ];
  }

  /* Itens de caracterização do Anexo 6.2 respondidos (AS IS / TO BE por item). */
  function requirementRows(r) {
    return requirementsList(r)
      .filter((q) => q.asIs !== undefined)
      .map((q) => [`${q.order || ""}. ${q.label}`.replace(/^\. /, ""), String(q.asIs || "").trim() || String(q.toBe || "").trim() ? `AS IS: ${String(q.asIs || "").trim() || "—"} · TO BE: ${String(q.toBe || "").trim() || "—"}` : "Não informado"]);
  }

  function buildSuggestions(r) {
    const fluid = reqValue(r, "req-06");
    const measured = reqValue(r, "req-02");
    const test = reqValue(r, "req-03");
    const moment = reqValue(r, "req-04");
    const unit = r.requirements.find((q) => q.id === "req-02")?.unit || "";
    const list = [];
    const asIs = r.asIs.trim();
    if (asIs) {
      const facts = [];
      /* integração: itens do Anexo 6.2 (AS IS por item) ainda não citados na descrição geral */
      for (const q of requirementsList(r).filter((item) => item.asIs !== undefined && String(item.asIs || "").trim()).slice(0, 3)) {
        if (!asIs.toLowerCase().includes(String(q.asIs).trim().toLowerCase())) facts.push(`${q.label.replace(/\.$/, "").toLowerCase()}: ${String(q.asIs).trim()}`);
      }
      if (fluid && !asIs.toLowerCase().includes(fluid.toLowerCase())) facts.push(`tipo de fluido: ${fluid.toLowerCase()}`);
      if (test && !asIs.toLowerCase().includes(test.toLowerCase())) facts.push(`teste executado: ${test.toLowerCase()}`);
      if (moment && !asIs.toLowerCase().includes(moment.toLowerCase())) facts.push(`momento da detecção: ${moment.toLowerCase()}`);
      if (measured && !asIs.includes(measured)) facts.push(`valor medido: ${measured} ${unit}`.trim());
      if (facts.length) {
        list.push({
          id: "s1",
          field: "AS IS",
          target: "asIs",
          current: asIs,
          suggested: `${asIs.replace(/\.\s*$/, "")} (${facts.join("; ")}).`,
          justification: "A descrição não repete dados já informados nos requisitos. Incluí-los no AS IS torna a condição rastreável sem depender de outras seções.",
          status: "pending",
        });
      }
    }
    const toBe = r.toBe.trim();
    if (toBe && !/crit[ée]rio|refer[êe]ncia|toler[âa]ncia/i.test(toBe)) {
      list.push({
        id: "s2",
        field: "TO-BE",
        target: "toBe",
        current: toBe,
        suggested: `${toBe.replace(/\.\s*$/, "")}, conforme critério de aceitação e referência documental aplicáveis (A DEFINIR).`,
        justification: "O estado esperado não cita critério de aceitação nem sua fonte. A referência deve ser informada pelo usuário: o sistema não a presume.",
        status: "pending",
      });
    }
    return list;
  }

  const AI_STAGES = ["Analisando completude…", "Verificando coerência…", "Avaliando clareza do AS IS e TO-BE…", "Gerando recomendações…"];

  const REVIEW_SOURCE_LABEL = { "ctrl-cd-agent": "Agente de IA CTRL + CD", "local-rules": "Regras locais" };

  /* Motivo legível quando a revisão não chega ao agente (exibido junto das sugestões locais). */
  function reviewFailureReason(error) {
    if (error?.status === 401) return "Sua sessão no servidor expirou (o back-end foi reiniciado). Saia e entre de novo para usar a revisão por IA.";
    if (error?.status === 403) return "Este registro pertence a outro usuário no servidor.";
    if (error instanceof TypeError) return "O back-end de registros (porta 8001) não respondeu. Abra o sistema pelo INICIAR_CTRLCD.bat.";
    return error?.message || "A revisão conectada não está disponível.";
  }

  async function runReview() {
    const r = S.rec;
    if (r.aiRunning) return;
    update(() => { r.aiRunning = true; r.aiStage = 0; r.aiDone = false; r.aiError = ""; }, { save: false });
    /* etapas visuais enquanto o agente trabalha (a última fica ativa até a resposta chegar) */
    const ticker = setInterval(() => { if (r.aiRunning && r.aiStage < AI_STAGES.length - 1) update(() => (r.aiStage += 1), { save: false }); }, 1500);
    try {
      const snapshot = serialize(r);
      await window.API.saveRecord(snapshot, recordStatus(r));
      const result = await window.API.reviewRecord(r.id);
      update(() => {
        r.aiRunning = false;
        r.aiDone = true;
        r.aiSource = result?.source || "local-rules";
        r.aiError = result?.agentError || "";
        r.aiOpinion = result?.opinion || (r.aiSource === "local-rules" ? "Parecer do agente indisponível; as sugestões abaixo vêm das regras locais e não substituem uma norma." : "O agente não retornou parecer textual.");
        r.aiMissing = Array.isArray(result?.missing) ? result.missing : [];
        r.aiInconsistencies = Array.isArray(result?.inconsistencies) ? result.inconsistencies : [];
        r.aiSuggestions = (result?.suggestions || []).map((suggestion, index) => ({
          ...suggestion,
          id: suggestion.id || `review-${index + 1}`,
          target: suggestion.target ?? null,
          applicable: suggestion.applicable ?? ["asIs", "toBe"].includes(suggestion.target),
          source: REVIEW_SOURCE_LABEL[result?.source] || "Revisão CTRL + CD",
          justification: suggestion.justification || suggestion.reason || "Sugestão retornada pela revisão.",
          status: "pending",
        }));
      });
    } catch (error) {
      update(() => {
        r.aiRunning = false;
        r.aiDone = true;
        r.aiSource = "local-rules";
        r.aiError = reviewFailureReason(error);
        r.aiOpinion = "Parecer do agente indisponível; as sugestões abaixo vêm das regras locais e não substituem uma norma.";
        r.aiMissing = [];
        r.aiInconsistencies = [];
        r.aiSuggestions = buildSuggestions(r).map((s) => ({ ...s, applicable: true, source: REVIEW_SOURCE_LABEL["local-rules"] }));
      });
    } finally {
      clearInterval(ticker);
    }
  }

  function resolveSuggestion(s, status, text) {
    update(() => {
      const r = S.rec;
      if ((status === "accepted" || status === "edited") && s.applicable !== false) {
        const value = text ?? s.suggested;
        const reqTarget = /^req:(.+):(asIs|toBe)$/.exec(s.target || "");
        if (reqTarget) {
          /* item do Anexo 6.2: atualiza o lado indicado e recalcula o estado, como na Etapa 2 */
          const q = requirementsList(r).find((item) => item.id === reqTarget[1]);
          if (q) {
            q[reqTarget[2]] = value;
            const complete = String(q.asIs || "").trim() && String(q.toBe || "").trim();
            q.value = complete ? `${q.asIs}\n${q.toBe}` : "";
            q.status = complete ? "met" : "not-started";
          }
        } else if (s.target === "asIs" || s.target === "toBe") r[s.target] = value;
      }
      s.status = status;
      S.ui.editingSuggestion = null;
    });
  }

  /* nome legível do campo citado pela revisão (AS IS, TO-BE ou item do Anexo 6.2) */
  function suggestionFieldLabel(s) {
    if (s.target === "asIs") return "AS IS";
    if (s.target === "toBe") return "TO-BE";
    const m = /^req:(.+):(asIs|toBe)$/.exec(s.target || "");
    if (m) {
      const q = requirementsList(S.rec).find((item) => item.id === m[1]);
      return `${q ? q.label : "Requisito"} · ${m[2] === "asIs" ? "AS IS" : "TO BE"}`;
    }
    return s.field;
  }

  function SuggestionCard(s) {
    if (s.status !== "pending") {
      const labels = { accepted: s.applicable === false ? "✓ Observação registrada" : "✓ Sugestão aceita", edited: "✎ Sugestão editada e aplicada", rejected: "✕ Sugestão rejeitada" };
      return h("div", { class: `ccd-suggestion is-${s.status}` }, h("p", { class: "ccd-small" }, `${labels[s.status]} · Campo: ${suggestionFieldLabel(s)}`));
    }
    const editing = S.ui.editingSuggestion === s.id;
    let editor = null;
    if (editing) {
      editor = h("textarea", { class: "ccd-input ccd-input--area", rows: 3, "data-fk": `sugg-${s.id}`, "aria-label": `Editar sugestão para ${suggestionFieldLabel(s)}` });
      editor.value = s.draft ?? s.suggested;
      editor.addEventListener("input", (e) => (s.draft = e.target.value));
    }
    return h(
      "article",
      { class: "ccd-suggestion" },
      h("div", { class: "ccd-suggestion__head" }, h("span", { class: "ccd-tag ccd-tag--violet" }, s.source || "Revisão CTRL + CD"), h("strong", null, `Campo: ${suggestionFieldLabel(s)}`)),
      h("p", { class: "ccd-muted ccd-small ccd-suggestion__why" }, s.justification),
      h(
        "div",
        { class: "ccd-suggestion__diff" },
        h("div", null, h("p", { class: "ccd-eyebrow" }, "Atual"), h("p", null, s.current)),
        h("div", null, h("p", { class: "ccd-eyebrow ccd-text-violet" }, "Sugerido"), editing ? editor : h("p", null, s.suggested))
      ),
      h(
        "div",
        { class: "ccd-row ccd-suggestion__actions" },
        editing
          ? [
              h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--sm", onclick: () => resolveSuggestion(s, "edited", (s.draft ?? s.suggested).trim()) }, "Aplicar edição"),
              h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", onclick: () => update(() => (S.ui.editingSuggestion = null), { save: false }) }, "Cancelar"),
            ]
          : s.applicable === false
            ? [
                /* o agente citou um campo que não é editável por aqui: fica como observação */
                h("span", { class: "ccd-muted ccd-xsmall" }, "Observação: ajuste manualmente no campo indicado, se concordar."),
                h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--sm", onclick: () => resolveSuggestion(s, "accepted") }, "Ciente"),
                h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", onclick: () => resolveSuggestion(s, "rejected") }, "Descartar"),
              ]
          : [
              h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--sm", onclick: () => resolveSuggestion(s, "accepted") }, "Aceitar"),
              h("button", { type: "button", class: "ccd-btn ccd-btn--soft ccd-btn--sm", onclick: () => update(() => (S.ui.editingSuggestion = s.id), { save: false }) }, "Editar"),
              h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", onclick: () => resolveSuggestion(s, "rejected") }, "Rejeitar"),
            ]
      )
    );
  }

  function Step4() {
    const r = S.rec;
    const earlier = [...(r.ncConfirmed ? [] : ["Confirmar o tipo de não conformidade (etapa 1)"]), ...step2Pending(r).map((p) => `${p} (etapa 2)`), ...step3Pending(r).map((p) => `${p} (etapa 3)`)];
    const pendingSuggestions = r.aiSuggestions.filter((s) => s.status === "pending").length;

    return StepShell(
      "4. Verificação e compilado preliminar",
      "Revise o compilado e execute a revisão inteligente antes de gerar o anexo.",
      Card(
        "Compilado preliminar",
        h("dl", { class: "ccd-compiled" }, compiledRows(r).map(([k, v]) => [h("dt", null, k), h("dd", { class: v.startsWith("Não informado") ? "ccd-muted" : null }, v)])),
        r.installedOnAircraft && aircraftSnapshotUrl(r)
          ? h("figure", { class: "ccd-locfigure", "data-fk": "compiled-snapshot" }, h("img", { src: aircraftSnapshotUrl(r), alt: `Captura do modelo da aeronave com a localização: ${r.regionSelected}` }), h("figcaption", { class: "ccd-muted ccd-xsmall" }, "Localização no modelo visual demonstrativo (não representa geometria CAD oficial ou certificada)."))
          : null,
        requirementRows(r).length ? h("dl", { class: "ccd-compiled", "data-fk": "compiled-requirements" }, requirementRows(r).map(([k, v]) => [h("dt", null, k), h("dd", { class: v === "Não informado" ? "ccd-muted" : null }, v)])) : null,
        h("dl", { class: "ccd-compiled" }, h("dt", null, "Evidências"), h("dd", null, `${r.photos.length} foto${r.photos.length !== 1 ? "s" : ""}`), h("dt", null, "Requisitos"), h("dd", null, `${requirementsList(r).filter((q) => String(q.value || "").trim()).length} de ${requirementsList(r).length} respondidos`))
      ),
      PendingList("Pendências de etapas anteriores:", earlier),
      Card(
        "Revisão inteligente",
        !r.aiDone && !r.aiRunning
          ? h(
              "div",
              { class: "ccd-stack" },
              h("p", { class: "ccd-muted" }, "Execute a revisão para identificar oportunidades de melhoria no compilado. Nenhuma alteração é aplicada sem a sua aprovação."),
              h("button", { type: "button", class: "ccd-btn ccd-btn--ai", "data-fk": "run-ai", onclick: runReview }, icon("star", 16), "Executar revisão inteligente")
            )
          : null,
        r.aiRunning
          ? h("ul", { class: "ccd-aistages", "aria-live": "polite" }, AI_STAGES.map((label, i) => h("li", { class: i < r.aiStage ? "is-done" : i === r.aiStage ? "is-active" : "" }, h("span", { class: "ccd-aistages__dot" }), label)))
          : null,
        r.aiDone
          ? h(
              "div",
              { class: "ccd-stack" },
              h("p", { class: "ccd-text-success" }, "✓ Revisão concluída"),
              Note("ai", h("strong", null, `${REVIEW_SOURCE_LABEL[r.aiSource] || r.aiSource || "Regras locais"}: `), h("span", { "data-fk": "ai-opinion" }, r.aiOpinion || "Sem parecer textual.")),
              r.aiError ? Note("warn", h("strong", null, "Agente de IA indisponível: "), h("span", { "data-fk": "ai-error" }, r.aiError)) : null,
              r.aiMissing?.length ? PendingList("Lacunas apontadas na revisão:", r.aiMissing) : null,
              r.aiInconsistencies?.length ? PendingList("Inconsistências apontadas na revisão:", r.aiInconsistencies) : null,
              r.aiSuggestions.length ? r.aiSuggestions.map(SuggestionCard) : h("p", { class: "ccd-muted" }, "Nenhuma sugestão para os campos atuais."),
              h(
                "div",
                { class: "ccd-row" },
                h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", onclick: runReview }, icon("refresh", 14), "Executar novamente")
              )
            )
          : null
      ),
      pendingSuggestions ? PendingList("Para continuar:", [`Aceitar, editar ou rejeitar ${pendingSuggestions} sugestão(ões)`]) : null,
      h(
        "div",
        { class: "ccd-row" },
        h("button", { type: "button", class: "ccd-btn ccd-btn--ghost", onclick: () => goStep(3) }, "← Etapa anterior"),
        NextButton("Próxima etapa →", () => {
          if (!r.aiDone) toast("Execute a revisão inteligente antes de continuar.");
          else if (pendingSuggestions) toast("Resolva as sugestões pendentes antes de continuar.");
          else goStep(5);
        }, !r.aiDone ? ["Executar a revisão inteligente"] : pendingSuggestions ? ["Resolver as sugestões pendentes"] : [])
      )
    );
  }

  /* ------------------------------------------------------------------ */
  /* Etapa 5 — Anexo final                                               */
  /* ------------------------------------------------------------------ */
  function checklist(r) {
    return [
      { label: "Tipo de não conformidade definido", done: r.ncConfirmed },
      { label: "Vínculo com AR respondido", done: r.hasAR !== null },
      { label: "PN ou AR validado", done: r.pnStatus === "found" || r.arStatus === "found" },
      { label: "AS IS e TO-BE preenchidos", done: Boolean(r.asIs.trim() && r.toBe.trim()) },
      { label: "Localização informada", done: r.installedOnAircraft === false || Boolean(r.regionSelected) },
      { label: "Requisitos obrigatórios atendidos", done: !requirementsList(r).some((q) => q.mandatory && !String(q.value || "").trim()) },
      { label: "Foto de contextualização anexada", done: r.photos.some((p) => p.purpose === "context" && p.status !== "rejected") },
      { label: "Foto da não conformidade anexada", done: r.photos.some((p) => p.purpose === "defect" && p.status !== "rejected") },
      { label: "Revisão inteligente executada", done: r.aiDone },
    ];
  }

  function generateVersion() {
    update(() => {
      const r = S.rec;
      const version = r.versions.length + 1;
      r.versions.push({ version, at: nowDateTime(), by: S.user.name });
      r.pdfGenerated = true;
      auditRecord("GENERATE_ATTACHMENT", null, { version });
    });
    toast("Anexo padronizado gerado.");
  }

  function completeRecord() {
    const missing = checklist(S.rec).filter((item) => !item.done);
    if (missing.length || !S.rec.pdfGenerated) {
      toast("Conclua todas as etapas e gere o anexo antes de concluir a NC.");
      return;
    }
    update(() => {
      S.rec.completedAt = nowDateTime();
      S.rec.currentStep = 5;
      S.rec.maxStep = 5;
      auditRecord("COMPLETE_NC", { status: "Anexo gerado" }, { status: "Concluído" });
      S.view = "home";
      S.ui.resetScroll = true;
    });
    toast("NC concluída com sucesso.");
  }

  function Step5() {
    const r = S.rec;
    const items = checklist(r);
    const missing = items.filter((i) => !i.done);
    const last = r.versions[r.versions.length - 1];

    return StepShell(
      "5. Anexo final",
      "Verifique o checklist e gere o anexo padronizado para a Nota CD ou o AR.",
      Card("Checklist final", h("ul", { class: "ccd-checklist" }, items.map((i) => h("li", { class: i.done ? "is-done" : "is-missing" }, h("span", { class: "ccd-checklist__icon", "aria-hidden": "true" }, i.done ? "✓" : "○"), h("span", null, i.label), h("span", { class: "sr-only" }, i.done ? "concluído" : "pendente"))))),
      Note("info", "O Ctrl + CD gera o anexo. Ele não cria, aprova nem emite oficialmente a Nota CD ou o AR."),
      !r.pdfGenerated
        ? [
            missing.length ? PendingList("Itens pendentes (o anexo pode ser gerado como rascunho):", missing.map((i) => i.label)) : null,
            h(
              "div",
              { class: "ccd-row" },
              h("button", { type: "button", class: "ccd-btn ccd-btn--ghost", onclick: () => goStep(4) }, "← Voltar para revisão"),
              h("button", { type: "button", class: "ccd-btn ccd-btn--primary", "data-fk": "gen-pdf", onclick: generateVersion }, icon("file", 16), "Gerar anexo padronizado")
            ),
          ]
        : h(
            "section",
            { class: "ccd-annex" },
            h("div", { class: "ccd-annex__head" }, h("span", { class: "ccd-confirmbox__icon" }, icon("check", 16)), h("div", null, h("strong", null, "Anexo padronizado gerado"), h("p", { class: "ccd-muted ccd-small" }, `Versão ${last.version} · ${last.at} · ${last.by}`))),
            h("div", { class: "ccd-annex__file" }, icon("file", 36), h("p", { class: "ccd-strong" }, `Anexo_${r.id}_v${last.version}.pdf`), h("p", { class: "ccd-muted ccd-xsmall" }, r.completedAt ? `NC concluída em ${r.completedAt}` : "Anexo pronto para conclusão.")),
            h(
              "div",
              { class: "ccd-row ccd-row--wrap" },
              r.completedAt ? h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--sm", onclick: () => printAnnex(r) }, icon("download", 14), "Baixar PDF (imprimir)") : null,
              h("button", { type: "button", class: "ccd-btn ccd-btn--soft ccd-btn--sm", onclick: () => toast("Edição do template do anexo: A DEFINIR.") }, icon("edit", 14), "Editar template"),
              h("button", { type: "button", class: "ccd-btn ccd-btn--soft ccd-btn--sm", onclick: generateVersion }, icon("plus", 14), "Gerar nova versão"),
              !r.completedAt ? h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--sm", onclick: completeRecord }, icon("check", 14), "Concluir NC") : h("span", { class: "ccd-badge ccd-badge--success ccd-badge--md" }, "✓ NC concluída"),
              h("button", { type: "button", class: "ccd-btn ccd-btn--soft ccd-btn--sm", "aria-expanded": String(S.ui.showVersions), onclick: () => update(() => (S.ui.showVersions = !S.ui.showVersions), { save: false }) }, icon("history", 14), "Histórico de versões")
            ),
            S.ui.showVersions ? h("ol", { class: "ccd-versions" }, [...r.versions].reverse().map((v) => h("li", null, h("strong", null, `v${v.version}`), ` · ${v.at} · ${v.by}`))) : null
          )
    );
  }

  /* Anexo imprimível — estrutura de docs/Template_Compilado.docx (Figma). */
  function printAnnex(r) {
    const rows = Object.fromEntries(compiledRows(r));
    const kv = (pairs) => h("table", { class: "ccd-print__table" }, pairs.map(([k, v]) => h("tr", null, h("th", null, k), h("td", null, v))));
    const photos = r.photos.filter((p) => p.status !== "rejected");
    const printable = h(
      "div",
      { id: "ccdPrint", class: "ccd-print" },
      h("header", { class: "ccd-print__header" }, h("img", { src: "assets/logo/ctrl-cd-logo.png", alt: "CTRL + CD" }), h("div", null, h("h1", null, "DETALHAMENTO DE NÃO CONFORMIDADE"), h("p", null, `${r.id} · versão ${r.versions.length} · ${nowDateTime()}`))),
      h("h2", null, "1. Classificação"),
      kv([["Tipo de não conformidade", rows["Tipo de NC"]]]),
      h("h2", null, "2. Identificação do material"),
      kv([
        ["Existe AR?", r.hasAR === null ? "Não informado" : r.hasAR ? "☒ Sim   ☐ Não" : "☐ Sim   ☒ Não"],
        ["AR", rows.AR],
        ["Nota CD", rows["Nota CD"]],
        ["PN", rows.PN],
        ["Nº de série", rows["Nº de série"]],
        ["Ecode", rows.Ecode],
        ["Descrição do material", rows["Descrição do material"]],
        ["Material instalado na aeronave?", r.installedOnAircraft === null ? "Não informado" : r.installedOnAircraft ? "☒ Sim   ☐ Não" : "☐ Sim   ☒ Não"],
        ["Localização da peça", rows.Localização],
        ...(r.installedOnAircraft && r.aircraftLocation && AircraftLoc ? AircraftLoc.rows(r.aircraftLocation) : []),
      ]),
      r.installedOnAircraft && aircraftSnapshotUrl(r)
        ? h("section", { class: "ccd-print__photo", "data-fk": "print-snapshot" }, h("h3", null, "LOCALIZAÇÃO NO MODELO DA AERONAVE"), h("img", { src: aircraftSnapshotUrl(r), alt: `Localização: ${r.regionSelected}` }), kv([["LEGENDA", "Modelo visual demonstrativo. Não representa geometria CAD oficial ou certificada."]]))
        : null,
      h("h2", null, "3. Condição"),
      kv([
        ["AS IS | COMO ESTÁ", rows["AS IS"]],
        ["TO BE | COMO DEVERIA ESTAR", rows["TO-BE"]],
        ["NORMAS APLICÁVEIS", rows["Normas aplicáveis"]],
      ]),
      requirementRows(r).length ? [h("h3", null, `REQUISITOS DE CARACTERIZAÇÃO — ${r.requirementSource || "Anexo 02 - 5529"}`), kv(requirementRows(r))] : null,
      h("h2", null, "4. Evidências fotográficas"),
      photos.length
        ? photos.map((p, i) =>
            h(
              "section",
              { class: "ccd-print__photo" },
              h("h3", null, `IMAGEM ${String(i + 1).padStart(2, "0")}`),
              p.url ? h("img", { src: p.url, alt: p.caption || p.label }) : h("p", { class: "ccd-print__missing" }, "Imagem não disponível nesta sessão."),
              kv([
                ["LEGENDA", p.caption || p.label],
                ["REQUISITO", r.requirements.find((q) => q.id === p.requirementId)?.label || "Não associado"],
              ])
            )
          )
        : h("p", null, "Nenhuma evidência anexada."),
      h("footer", { class: "ccd-print__footer" }, `Responsável: ${S.user.name} · Documento gerado pelo protótipo Ctrl + CD com dados fictícios. Não emite nem aprova Nota CD ou AR.`)
    );
    document.getElementById("ccdPrint")?.remove();
    document.body.appendChild(printable);
    const cleanup = () => {
      printable.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  /* ------------------------------------------------------------------ */
  /* Painel direito                                                      */
  /* ------------------------------------------------------------------ */
  function RightPanel() {
    const r = S.rec;
    const steps = D.FORM_STEPS.map((s) => ({ ...s, status: stepStatus(s.id, r) }));
    const done = steps.filter((s) => s.status === "done").length;
    const pendingSteps = steps.filter((s) => s.status === "pending" || s.status === "blocked").length;
    const canClick = (id) => id <= r.maxStep;

    if (S.ui.rightCollapsed) {
      return h(
        "aside",
        { class: "ccd-right is-collapsed", "aria-label": "Progresso do registro" },
        h("button", { type: "button", class: "ccd-iconbtn", "aria-label": "Expandir painel de progresso", "aria-expanded": "false", onclick: () => update(() => (S.ui.rightCollapsed = false), { save: false }) }, icon("chevronLeft", 14)),
        steps.map((s) => h("button", { type: "button", class: `ccd-right__mini is-${STEP_STATUS[s.status].tone}${s.id === r.currentStep ? " is-current" : ""}`, title: `${s.title} — ${STEP_STATUS[s.status].label}`, "aria-label": `${s.title}: ${STEP_STATUS[s.status].label}`, onclick: () => canClick(s.id) && goStep(s.id) }, s.status === "done" ? "✓" : String(s.id)))
      );
    }

    const status = recordStatus(r);
    const tip = D.CONTEXT_TIPS[r.currentStep];
    const nextAction =
      r.currentStep === 1 && !r.ncConfirmed ? "Selecionar e confirmar o tipo de NC"
      : r.currentStep === 2 ? step2Pending(r)[0] || "Avançar para as evidências"
      : r.currentStep === 3 ? step3Pending(r)[0] || "Avançar para a verificação"
      : r.currentStep === 4 ? (!r.aiDone ? "Executar a revisão inteligente" : "Resolver sugestões e avançar")
      : r.currentStep === 5 ? (r.completedAt ? "NC concluída" : r.pdfGenerated ? "Concluir a NC" : "Gerar o anexo padronizado")
      : "Avançar para a próxima etapa";
    const recordRows = [
      ["ID interno", r.id],
      r.ncSelected ? ["Tipo de NC", r.ncSelected] : null,
      r.cdNumber ? ["Nota CD", r.cdNumber] : null,
      r.hasAR === true ? ["AR", r.arNumber || "Não informado"] : r.hasAR === false ? ["AR", "Não existente"] : null,
      ["Criado em", r.createdAt],
    ].filter(Boolean);

    return h(
      "aside",
      { class: "ccd-right", "aria-label": "Resumo e progresso do registro", "data-sk": "right" },
      h("div", { class: "ccd-right__head" }, h("span", null, "Progresso"), h("button", { type: "button", class: "ccd-iconbtn", "aria-label": "Recolher painel de progresso", "aria-expanded": "true", onclick: () => update(() => (S.ui.rightCollapsed = true), { save: false }) }, icon("chevronRight", 14))),
      h(
        "div",
        { class: "ccd-right__block" },
        h("p", { class: "ccd-eyebrow" }, "Registro"),
        h(
          "dl",
          { class: "ccd-right__kv" },
          recordRows.map(([k, v]) => h("div", null, h("dt", null, k), h("dd", null, v)))
        ),
        h("div", { class: "ccd-right__status" }, StatusBadge(status, "sm"))
      ),
      h(
        "div",
        { class: "ccd-right__block" },
        h("div", { class: "ccd-row ccd-row--between ccd-small" }, h("span", null, `${done} de ${steps.length} etapas concluídas`), pendingSteps ? h("span", { class: "ccd-text-warning" }, `${pendingSteps} pendência${pendingSteps !== 1 ? "s" : ""}`) : null),
        h("div", { class: "ccd-progress__track", role: "progressbar", "aria-valuenow": recordProgress(r), "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": "Progresso do registro" }, h("div", { class: `ccd-progress__fill ${pendingSteps ? "ccd-progress__fill--warning" : "ccd-progress__fill--grad"}`, style: { width: `${recordProgress(r)}%` } }))
      ),
      h(
        "div",
        { class: "ccd-right__block" },
        h("p", { class: "ccd-eyebrow" }, "Etapas"),
        h(
          "ol",
          { class: "ccd-right__steps" },
          steps.map((s) =>
            h(
              "li",
              null,
              h(
                "button",
                { type: "button", class: `ccd-right__step is-${STEP_STATUS[s.status].tone}${s.id === r.currentStep ? " is-current" : ""}`, disabled: !canClick(s.id), onclick: () => goStep(s.id) },
                h("span", { class: "ccd-right__num" }, s.status === "done" ? "✓" : String(s.id)),
                h("span", { class: "ccd-right__title" }, s.title),
                s.status !== "waiting" ? h("span", { class: `ccd-pill ccd-pill--${STEP_STATUS[s.status].tone} ccd-pill--xs` }, STEP_STATUS[s.status].label) : null
              )
            )
          )
        )
      ),
      h("div", { class: "ccd-right__block" }, h("p", { class: "ccd-eyebrow" }, "Próxima ação"), h("p", { class: "ccd-small ccd-strong" }, nextAction)),
      tip ? h("div", { class: "ccd-tip" }, icon("lightbulb", 14), h("p", null, tip)) : null
    );
  }

  /* ------------------------------------------------------------------ */
  /* Assistente CTRL — conversa rápida no popup                         */
  /* ------------------------------------------------------------------ */
  function submitAssistant(question = "") {
    const message = String(question || S.ui.assistantDraft || "").trim();
    if (!message || S.ui.assistantBusy) return;
    if (!S.ui.assistantChatId) S.ui.assistantChatId = `ctrlcd-${uid()}`;
    S.ui.assistantMessages.push({ role: "user", content: message });
    S.ui.assistantDraft = "";
    S.ui.assistantBusy = true;
    S.ui.assistantScrollToEnd = true;
    render();

    window.API?.sendMessage({ chatId: S.ui.assistantChatId, message })
      .then((result) => {
        S.ui.assistantMessages.push({ role: "assistant", content: result.answer || "O agente não retornou uma resposta." });
      })
      .catch((error) => {
        S.ui.assistantMessages.push({ role: "assistant", content: `Não foi possível consultar o agente: ${error.message}`, error: true });
      })
      .finally(() => {
        S.ui.assistantBusy = false;
        S.ui.assistantScrollToEnd = true;
        render();
        if (S.ui.assistantOpen) assistantRoot?.querySelector('[data-fk="assistant-input"]')?.focus({ preventScroll: true });
      });
  }

  function openAssistant() {
    update(() => { S.ui.assistantOpen = true; S.ui.assistantScrollToEnd = true; }, { save: false });
    assistantRoot?.querySelector('[data-fk="assistant-input"]')?.focus({ preventScroll: true });
  }

  /* Fecha o pop-up e devolve o foco ao ícone (o painel sai do DOM). */
  function closeAssistant() {
    update(() => (S.ui.assistantOpen = false), { save: false });
    assistantRoot?.querySelector('[data-fk="mascot"]')?.focus({ preventScroll: true });
  }

  function newAssistantChat() {
    if (S.ui.assistantBusy) return;
    update(() => { S.ui.assistantMessages = []; S.ui.assistantChatId = null; S.ui.assistantDraft = ""; }, { save: false });
    assistantRoot?.querySelector('[data-fk="assistant-input"]')?.focus({ preventScroll: true });
  }

  function AssistantCtrl() {
    const open = S.ui.assistantOpen;
    const button = h(
      "button",
      { type: "button", class: `ccd-mascot${open ? " is-open" : ""}`, "aria-label": "Assistente CTRL: consulta de normas e procedimentos", "aria-expanded": String(open), "data-fk": "mascot", onclick: () => (open ? closeAssistant() : openAssistant()) },
      h("span", { class: "ccd-mascot__key" }, "CTRL"),
      h("span", { class: "ccd-mascot__line" }),
      h("span", { class: "ccd-mascot__q" }, "?")
    );
    if (!open) return button;

    return [
      button,
      h(
        "section",
        { class: "ccd-assistant", role: "dialog", "aria-label": "Assistente CTRL", "aria-busy": String(S.ui.assistantBusy) },
        h(
          "div",
          { class: "ccd-assistant__head" },
          h("div", null, h("strong", null, "Assistente CTRL"), h("p", { class: "ccd-muted ccd-small" }, "Consulta de normas e procedimentos")),
          h(
            "div",
            { class: "ccd-row" },
            S.ui.assistantMessages.length ? h("button", { type: "button", class: "ccd-iconbtn", "aria-label": "Nova conversa", title: "Nova conversa", "data-fk": "assistant-new", disabled: S.ui.assistantBusy, onclick: newAssistantChat }, icon("plus", 16)) : null,
            h("button", { type: "button", class: "ccd-iconbtn", "aria-label": "Fechar assistente", "data-fk": "assistant-close", onclick: closeAssistant }, icon("x", 16))
          )
        ),
        h(
          "div",
          { class: "ccd-assistant__body", "aria-live": "polite" },
          !S.ui.assistantMessages.length
            ? [
                h("p", { class: "ccd-small" }, "Consulte normas e procedimentos sem sair do registro atual."),
                h("p", { class: "ccd-eyebrow" }, "Sugestões"),
                ...ASSISTANT_SUGGESTIONS.map((q) => h("button", { type: "button", class: "ccd-assistant__suggestion", disabled: S.ui.assistantBusy, onclick: () => submitAssistant(q) }, q)),
              ]
            : S.ui.assistantMessages.map((message) => {
                const node = h("div", { class: `ccd-assistant__message ccd-assistant__message--${message.role}${message.error ? " is-error" : ""}` });
                /* integração: respostas do agente em Markdown, pelo mesmo renderizador do chat (escapa HTML) */
                if (message.role === "assistant" && !message.error && window.Markdown?.render) {
                  node.classList.add("ccd-assistant__message--md");
                  node.innerHTML = window.Markdown.render(message.content || "");
                } else node.textContent = message.content;
                return node;
              }),
          S.ui.assistantBusy ? h("div", { class: "ccd-assistant__thinking" }, "Consultando o agente…") : null
        ),
        h(
          "form",
          { class: "ccd-assistant__foot ccd-assistant__composer", onsubmit: (event) => { event.preventDefault(); submitAssistant(); } },
          h("input", { class: "ccd-input ccd-input--sm", type: "text", value: S.ui.assistantDraft, placeholder: "Digite sua pergunta…", "aria-label": "Pergunta para o Assistente CTRL", "data-fk": "assistant-input", maxlength: "20000", oninput: (event) => {
            /* sem refazer a tela a cada tecla: só habilita o botão de envio */
            S.ui.assistantDraft = event.target.value;
            const send = event.target.form?.querySelector('button[type="submit"]');
            if (send) send.disabled = S.ui.assistantBusy || !event.target.value.trim();
          } }),
          h("button", { type: "submit", class: "ccd-btn ccd-btn--primary ccd-btn--sm", disabled: S.ui.assistantBusy || !S.ui.assistantDraft.trim(), "aria-label": "Enviar pergunta ao Assistente CTRL" }, icon("arrowRight", 14))
        )
      ),
    ];
  }

  /* ------------------------------------------------------------------ */
  /* Inicialização                                                       */
  /* ------------------------------------------------------------------ */
  async function init() {
    const slot = document.getElementById("experimentSlot");
    if (!slot) return;
    slot.replaceChildren();
    root = h("div", { class: "ccd-root" });
    slot.appendChild(root);
    if (/^#(gerencial|dashboard)$/i.test(window.location.hash)) S.view = "dashboard";
    /* telas estreitas (celular): menu do CTRL+CD começa recolhido para sobrar espaço ao conteúdo */
    if (window.innerWidth < 900) S.sidebarCollapsed = true;
    window.addEventListener("hashchange", () => { if (/^#(gerencial|dashboard)$/i.test(window.location.hash) && S.view !== "dashboard") go("dashboard"); });
    assistantRoot = h("div", { class: "ccd-assistant-host", "data-fk-host": "assistant" });
    document.body.appendChild(assistantRoot);
    render();

    fileInput = h("input", { type: "file", accept: "image/*,video/*", multiple: true, hidden: true, "aria-hidden": "true", tabindex: "-1" });
    fileInput.addEventListener("change", () => addPhotos(fileInput.files, pendingZone));
    document.body.appendChild(fileInput);

    /* Escape fecha o modal de foto ou o painel do assistente (sem afetar
       os modais do localizador e do editor, que tratam o próprio Escape). */
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !root) return;
      if (document.querySelector(".ccd-ac-overlay, .ccd-editor")) return;
      const appVisible = Boolean(root.offsetParent);
      if (appVisible && S.ui.photoModalId) update(() => (S.ui.photoModalId = null), { save: false });
      else if (appVisible && S.ui.camera.open) { stopCamera(); render(); }
      else if (S.ui.assistantOpen) closeAssistant();
      else if (appVisible && S.ui.ncDropdown) update(() => (S.ui.ncDropdown = false), { save: false });
    });

    const draft = readDraft();
    if (draft) S.draftOffer = draft;
    if (!draft) await hydratePhotos();

    window.addEventListener("beforeunload", stopCamera);

    try {
      const user = await window.API?.getUser?.();
      if (user?.name) S.user = { name: user.name, initials: user.initials || user.name.slice(0, 2).toUpperCase(), role: user.role || "SOLICITANTE" };
    } catch {
      /* mantém o perfil demonstrativo */
    }

    render();
  }

  window.CtrlCD = Object.freeze({ render, state: S });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

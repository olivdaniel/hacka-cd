// @ts-check
/* ==========================================================================
   CTRL+CD — localização estruturada da peça na aeronave (Fase 6).

   - Captura (snapshot) do modelo: guardada SOMENTE no navegador, em IndexedDB, num banco próprio
     (não mistura com as fotos). O registro guarda só a referência e os metadados, para não
     inflar o rascunho no localStorage. Nada é enviado ao servidor.
   - Formatação das linhas do compilado e do anexo a partir da AircraftLocation.
   Exposto em window.CtrlCDAircraftLocation.
   ========================================================================== */
(() => {
  "use strict";

  const DB_NAME = "ctrlcd-aircraft-location";
  const STORE = "snapshots";
  const H = window.CtrlCDAircraftHierarchy;
  const CONFIRM_TEXT = "Localização confirmada pelo usuário.";

  /** @returns {Promise<IDBDatabase>} */
  function openDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error("IndexedDB indisponível neste navegador.")); return; }
      const req = window.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: "recordId" }); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("Não foi possível abrir o armazenamento local."));
    });
  }

  /**
   * @template T
   * @param {IDBTransactionMode} mode @param {(store: IDBObjectStore) => IDBRequest} op
   * @returns {Promise<T>}
   */
  async function run(mode, op) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = op(tx.objectStore(STORE));
      tx.oncomplete = () => { db.close(); resolve(/** @type {T} */ (req.result)); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error("Falha no armazenamento local da captura.")); };
    });
  }

  /** @type {Map<string, string>} recordId → URL de objeto (só nesta sessão) */
  const urls = new Map();

  const SnapshotStore = Object.freeze({
    /** @param {string} recordId @param {string} dataUrl @returns {Promise<void>} */
    async save(recordId, dataUrl) {
      const blob = await (await fetch(dataUrl)).blob();
      await run("readwrite", (s) => s.put({ recordId, blob, savedAt: new Date().toISOString() }));
      const old = urls.get(recordId);
      if (old) URL.revokeObjectURL(old);
      urls.set(recordId, URL.createObjectURL(blob));
    },
    /** URL da captura (carrega do IndexedDB na primeira vez). @param {string} recordId @returns {Promise<string | null>} */
    async load(recordId) {
      const cached = urls.get(recordId);
      if (cached) return cached;
      /** @type {{ blob: Blob } | undefined} */
      const row = await run("readonly", (s) => s.get(recordId));
      if (!row || !row.blob) return null;
      const current = urls.get(recordId);
      if (current) return current;   // um save() concorrente já publicou a captura mais nova
      const url = URL.createObjectURL(row.blob);
      urls.set(recordId, url);
      return url;
    },
    /** URL já carregada nesta sessão, sem acessar o banco. @param {string} recordId */
    peek: (/** @type {string} */ recordId) => urls.get(recordId) || null,
    /** @param {string} recordId @returns {Promise<void>} */
    async remove(recordId) {
      const old = urls.get(recordId);
      if (old) URL.revokeObjectURL(old);
      urls.delete(recordId);
      await run("readwrite", (s) => s.delete(recordId));
    },
  });

  const fmt = (/** @type {number} */ v) => v.toFixed(2).replace(".", ",");
  /** Nível da região mais profunda; tolera IDs desconhecidos (rascunho antigo ou editado). @param {AircraftLocation} loc */
  const lastLevel = (loc) => {
    const ids = Array.isArray(loc.locationIds) ? loc.locationIds : [];
    const r = ids.length && H ? /** @type {AircraftRegion3D | undefined} */ (H.get(ids[ids.length - 1])) : undefined;
    return r ? r.level : 1;
  };
  const isVec3 = (/** @type {unknown} */ v) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n));

  /** Uma linha curta: origem, profundidade e se há ponto. @param {AircraftLocation} loc */
  function summary(loc) {
    const lvl = lastLevel(loc);
    const origin = loc.source === "2d" ? "Vistas técnicas (2D)" : "Modelo 3D";
    const depth = H ? `nível ${lvl} (${H.LEVEL_LABELS[/** @type {RegionLevel} */ (lvl)]})` : `nível ${lvl}`;
    if (loc.defectPosition && isVec3(loc.defectPosition.worldPosition)) return `${origin} · até o ${depth} + ponto marcado`;
    if (loc.approximatePoint) return `${origin} · até o ${depth} + ponto aproximado`;
    return `${origin} · localização parcial, até o ${depth}`;
  }

  /** Texto do ponto (3D ou aproximado 2D), ou null. @param {AircraftLocation} loc */
  function pointText(loc) {
    const d = loc.defectPosition;
    if (d && isVec3(d.worldPosition)) {
      const [x, y, z] = d.worldPosition;
      return `x ${fmt(x)} m (a partir do nariz) · y ${fmt(y)} m (altura) · z ${fmt(z)} m (positivo para a esquerda) · superfície ${d.meshName}`;
    }
    const a = loc.approximatePoint;
    if (a && Number.isFinite(a.longitudinal_m) && Number.isFinite(a.lateral_m)) {
      const side = a.lateral_m > 0.05 ? "à direita" : a.lateral_m < -0.05 ? "à esquerda" : "no eixo";
      return `aproximado na vista ${a.viewLabel}: ${fmt(a.longitudinal_m)} m a partir do nariz · ${fmt(Math.abs(a.lateral_m))} m ${side} do eixo`;
    }
    return null;
  }

  /** Linhas adicionais do compilado/anexo (a linha "Localização" em texto continua igual). @param {AircraftLocation | null | undefined} loc @returns {[string, string][]} */
  function rows(loc) {
    if (!loc) return [];
    return [
      ["Localização — detalhe", summary(loc)],
      ["Ponto da não conformidade", pointText(loc) || "Não marcado (localização parcial)"],
      ["Confirmação da localização", CONFIRM_TEXT],
    ];
  }

  window.CtrlCDAircraftLocation = Object.freeze({ SnapshotStore, summary, pointText, rows, CONFIRM_TEXT });
})();

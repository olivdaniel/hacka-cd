// @ts-check
/* ==========================================================================
   CTRL+CD 3D — visualizador da aeronave.

   Uso (mesmo contrato do localizador 2D, window.CtrlCDAircraft.open):
     window.CtrlCDAircraft3D.open({ current, onConfirm, onClose })

   Fase 1 — canvas WebGL, carregamento LOCAL do GLB com progresso e cancelamento, câmera inicial
   enquadrada pela caixa envolvente, iluminação, controles de órbita, estado de erro com
   alternativas, redefinir vista (botão e tecla R), aviso demonstrativo.
   Fase 2 — navegação: 8 vistas predefinidas com transição animada de câmera e alvo, zoom e
   movimento também por botões e teclado, Ajustar à tela, tela cheia e rotação automática opcional.
   Fase 3 — seleção: raycast (BVH) sobre o GLB, hover com realce e dica, clique para selecionar,
   duplo clique ou "Aproximar" para enquadrar a região, contorno de seleção, lista textual de
   regiões sincronizada com o 3D e resumo da seleção. O estado guarda só IDs (strings).

   Fase 4 — hierarquia: Confirmar região (verde, avança o foco um nível e aproxima), breadcrumb
   navegável, Voltar um nível, o que está fora do foco fica esmaecido, subdivisões sem geometria
   própria escolhidas pela lista (realce na região-mãe), Finalizar como localização parcial
   (AircraftLocation serializável, "Localização confirmada pelo usuário.").

   Fase 5 — marcador da não conformidade (nível 6): modo de marcação, ponto só sobre a região
   confirmada, posição global e local, malha, normal, vista de referência; pino acima da
   superfície com tamanho estável; arrastar, Reposicionar, Remover, Confirmar ponto (azul →
   verde, "Localização confirmada pelo usuário."); "Marcar no centro da tela" pelo teclado.

   Fase 6 — integração: captura (snapshot) automática após a confirmação — região centralizada e
   realçada, marcador visível, sem grade, sem painéis nem dicas —; "Usar esta localização no
   registro" chama onConfirm(texto, detalhe): o texto é o mesmo de regionSelected (compatível com
   o localizador 2D) e o detalhe traz a AircraftLocation e a captura; reabrir com a localização
   salva restaura caminho, ponto e captura. O visualizador 3D NUNCA chama onConfirm: a localização continua sendo informada
   pelo localizador 2D (vistas técnicas), que recebe current/onConfirm/onClose sem alteração.
   ========================================================================== */
(() => {
  "use strict";

  const VERSION = "fase-7";
  const MODEL_PATH = "models/e195-e2-demonstrativo.glb";
  const DISCLAIMER = "Modelo visual demonstrativo. Não representa geometria CAD oficial ou certificada.";
  const FOV_Y = (40 * Math.PI) / 180;
  const PRESET_MS = 650;
  const ZOOM_MS = 220;
  const REGION_MARGIN = 1.6;

  /** @type {CtrlCD3DNamespace} */
  const NS = window.CtrlCD3D || {};
  // Se algum módulo não carregou, a API não é registrada: o botão 3D não aparece e o
  // localizador 2D continua funcionando (nada de modal vazio preso na tela).
  const missing = [["math.js", NS.math], ["glb-loader.js", NS.loader], ["camera-utils.js", NS.cameraUtils],
    ["renderer.js", NS.renderer], ["orbit-controls.js", NS.controls], ["view-presets.js", NS.viewPresets],
    ["navigation.js", NS.navigation], ["aircraft-hierarchy.js", window.CtrlCDAircraftHierarchy], ["regions.js", NS.regions], ["raycaster.js", NS.raycaster],
    ["selection.js", NS.selection], ["panels.js", NS.panels], ["marker.js", NS.marker], ["ui.js", window.CtrlCDUI]]
    .filter(([, mod]) => !mod).map(([file]) => file);
  if (missing.length) {
    console.warn(`CTRL+CD 3D desativado: módulos não carregados (${missing.join(", ")}).`);
    return;
  }
  const loader = /** @type {LoaderApi} */ (NS.loader);
  const CU = /** @type {CameraUtilsApi} */ (NS.cameraUtils);
  const R = /** @type {RendererApi} */ (NS.renderer);
  const C = /** @type {ControlsApi} */ (NS.controls);
  const VP = /** @type {ViewPresetsApi} */ (NS.viewPresets);
  const NAV = /** @type {NavigationApi} */ (NS.navigation);
  const RG = /** @type {RegionsApi} */ (NS.regions);
  const RC = /** @type {RaycasterApi} */ (NS.raycaster);
  const SEL = /** @type {SelectionApi} */ (NS.selection);
  const PN = /** @type {PanelsApi} */ (NS.panels);
  const MK = /** @type {MarkerApi} */ (NS.marker);
  const M = /** @type {MathApi} */ (NS.math);
  /** arredonda a 0,1 mm (dados serializáveis e estáveis) @param {number} v */
  const r4 = (v) => Math.round(v * 1e4) / 1e4;
  /** @param {ArrayLike<number>} v @returns {Vec3} */
  const vec = (v) => [r4(v[0]), r4(v[1]), r4(v[2])];

  /** Caixas envolventes por região, calculadas uma vez por modelo (a sessão reutiliza o mesmo GLB). @type {WeakMap<GlbModel, Map<string, GlbBounds>>} */
  const regionBoundsCache = new WeakMap();

  /** Caixa envolvente, no espaço do mundo, das malhas cujo caminho no GLB contém a região. @param {GlbModel} m @param {string} id @returns {GlbBounds | null} */
  function regionBounds(m, id) {
    let per = regionBoundsCache.get(m);
    if (!per) { per = new Map(); regionBoundsCache.set(m, per); }
    const hit = per.get(id);
    if (hit) return hit;
    /** @type {Vec3} */
    const mn = [Infinity, Infinity, Infinity];
    /** @type {Vec3} */
    const mx = [-Infinity, -Infinity, -Infinity];
    for (const p of m.primitives) {
      if (!p.nodePath.includes(id)) continue;
      const w = p.world, P = p.positions;
      for (let i = 0; i < P.length; i += 3) {
        const x = P[i], y = P[i + 1], z = P[i + 2];
        const wx = w[0] * x + w[4] * y + w[8] * z + w[12];
        const wy = w[1] * x + w[5] * y + w[9] * z + w[13];
        const wz = w[2] * x + w[6] * y + w[10] * z + w[14];
        if (wx < mn[0]) mn[0] = wx; if (wx > mx[0]) mx[0] = wx;
        if (wy < mn[1]) mn[1] = wy; if (wy > mx[1]) mx[1] = wy;
        if (wz < mn[2]) mn[2] = wz; if (wz > mx[2]) mx[2] = wz;
      }
    }
    if (!Number.isFinite(mn[0])) return null;
    const b = CU.boundsFromBox(mn, mx);
    per.set(id, b);
    return b;
  }

  /** @type {Aircraft3DMetrics | null} */
  let lastMetrics = null;
  /** @type {(() => ViewerSnapshot) | null} */
  let inspectCurrent = null;
  /** @type {((clientX: number, clientY: number) => PickResult | null) | null} */
  let pickCurrent = null;

  /** Caminho do GLB relativo ao documento: funciona na raiz do domínio e em subpastas. */
  const modelUrl = () => new URL(MODEL_PATH, document.baseURI).href;

  /** @returns {{ ok: boolean, reason: string | null }} */
  function isSupported() {
    if (window.location.protocol === "file:") {
      return { ok: false, reason: "A aplicação foi aberta direto do disco (file://). O navegador bloqueia a leitura do modelo 3D nesse modo; abra-a por um servidor HTTP local." };
    }
    if (!R.isWebGL2Available()) {
      return { ok: false, reason: "Este navegador ou dispositivo não oferece WebGL 2, necessário para o modelo 3D." };
    }
    return { ok: true, reason: null };
  }

  const fmtMB = (/** @type {number} */ b) => (b / 1e6).toFixed(1).replace(".", ",") + " MB";
  const fmtInt = (/** @type {number} */ n) => n.toLocaleString("pt-BR");

  /** @param {LocatorOpenOptions} [options] */
  function open(options = {}) {
    const { current = "", location: initialLocation = null, onConfirm, onClose } = options;
    const legacy = window.CtrlCDAircraft;
    if (window.CTRLCD_3D_ENABLED === false && legacy) {
      legacy.open({ current, location: initialLocation, onConfirm, onClose });
      return;
    }
    const { h, icon, trapEscape } = window.CtrlCDUI;
    const tOpen = performance.now();

    // ---------- estrutura ----------
    const makeCanvas = () => /** @type {HTMLCanvasElement} */ (h("canvas", {
      class: "ccd-a3d__canvas",
      tabindex: "0",
      role: "img",
      "aria-label": "Modelo 3D demonstrativo da aeronave. Arraste ou use as setas para girar; roda, pinça ou teclas mais e menos para aproximar; botão direito, Shift mais arrastar ou Shift mais setas para mover. Tecla R redefine a vista.",
    }));
    let canvas = makeCanvas();
    // sem aria-live aqui: o erro se anuncia por role="alert" e o progresso só pela barra (evita
    // que o leitor de tela anuncie cada atualização do percentual)
    const status = h("div", { class: "ccd-a3d__status" });
    const viewLive = h("p", { class: "ccd-a3d__sr", "aria-live": "polite" });
    const tooltip = h("div", { class: "ccd-a3d__tooltip", role: "tooltip", "data-a3d": "tooltip", hidden: true });
    const markTip = h("div", { class: "ccd-a3d__tooltip", role: "tooltip", "data-a3d": "mark-tooltip", hidden: true });
    const crosshair = h("div", { class: "ccd-a3d__crosshair", "aria-hidden": "true", "data-a3d": "crosshair", hidden: true });
    const metricsEl = h("span", { class: "ccd-a3d__metrics" });

    const nav = NAV.createToolbar({
      onPreset: (id) => goToPreset(id),
      onZoom: (f) => zoomBy(f),
      onFit: () => fitToScreen(),
      onReset: () => resetView(),
      onToggleRotate: () => toggleAutoRotate(),
      onToggleFullscreen: () => { stopAutoRotate(); fullscreen.toggle(); },
    });
    if (NAV.reducedMotion()) nav.disableAutoRotate("Rotação automática desativada: o sistema pede movimento reduzido.");

    const stage = h("div", { class: "ccd-a3d__stage" },
      canvas,
      nav.element,
      h("p", { class: "ccd-a3d__help" }, "Clique: selecionar · Duplo clique: aproximar · Arrastar ou setas: girar · Roda, pinça ou +/−: zoom · Botão direito, Shift + arrastar, dois dedos ou Shift + setas: mover · R: redefinir"),
      crosshair,
      tooltip,
      markTip,
      status,
      viewLive);
    const panels = PN.createPanels({
      onSelect: (id) => selectRegion(id, "list"),
      onHover: (id) => setHover(id),
      onZoom: () => { if (selectedId) zoomToRegion(selectedId); },
      onClear: () => clearSelection(),
      onConfirm: () => confirmRegion(),
      onBack: () => backOneLevel(),
      onCrumb: (i) => goToCrumb(i),
      onFinalize: () => finalizePartial(),
      onEdit: () => editLocation(),
      onMarkMode: () => setMarkMode(!markMode),
      onMarkCenter: () => markAtCenter(),
      onRemoveMarker: () => removeMarker(),
      onConfirmPoint: () => confirmPoint(),
      onUseLocation: () => useLocation(),
      geometryOf: (id) => {
        const g = model ? RG.geometryFor(id, model.nodeNames) : null;
        return g ? { regionId: g.regionId, own: g.own } : null;
      },
    });
    panels.setEnabled(false);
    // tablet: painéis recolhíveis; celular: barra de ação fixa com o próximo passo (Fase 7)
    const panelsBtn = h("button", {
      type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm ccd-a3d__panelsbtn", "data-a3d": "toggle-panels", "aria-expanded": "true",
      onclick: () => {
        const collapsed = shell.classList.toggle("is-panels-collapsed");
        panelsBtn.setAttribute("aria-expanded", String(!collapsed));
        panelsBtn.textContent = collapsed ? "Mostrar painéis" : "Recolher painéis";
        requestRender();
      },
    }, "Recolher painéis");
    const mobileHint = h("span", { class: "ccd-a3d__mobilehint", "data-a3d": "mobile-hint" });
    const mobileBtn = /** @type {HTMLButtonElement} */ (h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--sm", "data-a3d": "mobile-action", disabled: true }, "Confirmar região"));
    const mobileBar = h("div", { class: "ccd-a3d__mobilebar", "data-a3d": "mobilebar" }, mobileHint, mobileBtn);
    /** @type {(() => void) | null} */
    let mobileAction = null;
    mobileBtn.addEventListener("click", () => mobileAction?.());
    const legacyBtn = h("button", {
      type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", "data-a3d": "legacy",
      title: "Abrir o localizador 2D atual (vistas técnicas)",
    }, "Usar vistas técnicas (2D)");
    const closeBtn = h("button", { type: "button", class: "ccd-a3d__close", "aria-label": "Fechar o modelo 3D", "data-a3d": "close" }, icon("x", 16));
    const shell = h("div", { class: "ccd-a3d" },
      h("header", { class: "ccd-a3d__head" },
        h("div", { class: "ccd-a3d__titles" },
          h("p", { class: "ccd-a3d__eyebrow" }, "Localizar a peça no modelo 3D"),
          h("h2", { class: "ccd-a3d__title", id: "ccdA3dTitle" }, "Aeronave — E195-E2 demonstrativo")),
        h("div", { class: "ccd-a3d__headactions" }, panelsBtn, legacyBtn, closeBtn)),
      h("div", { class: "ccd-a3d__body" }, panels.left, stage, panels.right),
      mobileBar,
      h("footer", { class: "ccd-a3d__foot" },
        h("p", { class: "ccd-a3d__disclaimer", id: "ccdA3dNotice" }, icon("info", 14), DISCLAIMER),
        h("p", { class: "ccd-a3d__phase" }, "Confirme a região (e, se quiser, o ponto) e use a localização no registro. As vistas técnicas (2D) continuam disponíveis como alternativa."),
        metricsEl));
    const overlay = h("div", {
      class: "ccd-ac-overlay ccd-a3d-overlay", role: "dialog", "aria-modal": "true",
      "aria-labelledby": "ccdA3dTitle", "aria-describedby": "ccdA3dNotice", "data-a3d": "overlay",
    }, shell);

    // ---------- estado do visualizador (nada de objetos gráficos fora daqui) ----------
    const abort = new AbortController();
    /** @type {AircraftRenderer | null} */
    let renderer = null;
    /** @type {ReturnType<ControlsApi["attachOrbitControls"]> | null} */
    let controls = null;
    /** @type {GlbModel | null} */
    let model = null;
    /** @type {CameraState} */
    let camera = { target: [0, 0, 0], distance: 1, yaw: CU.INITIAL_VIEW.yaw, pitch: CU.INITIAL_VIEW.pitch };
    /** @type {CameraLimits | null} */
    let limits = null;
    /** @type {AircraftView | null} */
    let activePreset = "perspective";
    let raf = 0;
    let stopAnimation = () => {};
    let animating = false;
    let closed = false;
    /** @type {ResizeObserver | null} */
    let resizeObserver = null;
    // seleção e hierarquia: só IDs de região (strings) e dados serializáveis, nunca objetos gráficos
    /** @type {string[]} IDs confirmados pelo usuário, da raiz até o foco */
    let confirmedPath = [RG.ROOT_ID];
    /** @type {string} */
    let focusId = RG.ROOT_ID;
    /** @type {AircraftLocation | null} */
    let location = null;
    /** @type {string | null} */
    let selectedId = null;
    /** @type {string | null} */
    let hoverId = null;
    /** @type {DefectPosition | null} ponto da não conformidade (só números e strings) */
    let marker = null;
    let markMode = false;
    let bvhTimer = 0;
    /** @type {string | null} captura (data URL JPEG) gerada após a confirmação */
    let snapshot = null;
    /** @type {{ w: number, h: number } | null} */
    let snapshotDims = null;
    applyInitialLocation();

    const requestRender = () => {
      if (raf || closed) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!renderer) return;
        const moving = controls ? controls.update() : false;
        renderer.render(camera, highlight());
        if (lastMetrics && lastMetrics.firstFrameMs === null) lastMetrics.firstFrameMs = Math.round(performance.now() - tOpen);
        if (moving) requestRender();
      });
    };

    /** @param {CameraState} s @returns {CameraState} */
    const clampToLimits = (s) => {
      if (!limits) return s;
      const L = limits;
      const c = (/** @type {number} */ v, /** @type {number} */ lo, /** @type {number} */ hi) => Math.min(hi, Math.max(lo, v));
      return {
        yaw: s.yaw,
        pitch: c(s.pitch, L.minPitch, L.maxPitch),
        distance: c(s.distance, L.minDistance, L.maxDistance),
        target: [c(s.target[0], L.targetMin[0], L.targetMax[0]), c(s.target[1], L.targetMin[1], L.targetMax[1]), c(s.target[2], L.targetMin[2], L.targetMax[2])],
      };
    };

    /** Anima a câmera até o estado pedido (instantâneo com prefers-reduced-motion). @param {CameraState} to @param {number} ms */
    function animateTo(to, ms) {
      stopAnimation();
      animating = true;
      stopAnimation = CU.animateCameraToTarget(camera, clampToLimits(to), ms, (s) => { camera = s; requestRender(); },
        () => { animating = false; stopAnimation = () => {}; });
    }

    // ---------- rotação automática e tela cheia ----------
    const autoRotate = NAV.createAutoRotate((dYaw) => {
      if (!renderer) return;
      camera = { ...camera, target: [...camera.target], yaw: camera.yaw + dYaw };
      requestRender();
    });
    /** A rotação fica indisponível com uma região selecionada (e, nas próximas fases, durante a marcação). */
    const canAutoRotate = () => Boolean(renderer) && !NAV.reducedMotion() && selectedId === null && confirmedPath.length === 1 && location === null;
    function stopAutoRotate() {
      if (!autoRotate.running) return;
      autoRotate.stop();
      nav.setAutoRotate(false);
    }
    function toggleAutoRotate() {
      if (autoRotate.running) {
        stopAutoRotate();
        return;
      }
      if (!canAutoRotate()) {
        if (renderer && !NAV.reducedMotion()) viewLive.textContent = "Rotação automática indisponível durante a seleção e a localização. Limpe a seleção e volte à aeronave para girar.";
        return;
      }
      stopAnimation();
      animating = false;
      activePreset = null;
      nav.setActivePreset(null);
      if (autoRotate.start()) nav.setAutoRotate(true);
    }
    const fullscreen = NAV.createFullscreen(overlay, () => {
      nav.setFullscreen(fullscreen.active);
      requestRender();
    });

    // ---------- navegação ----------
    /** @param {AircraftView} id */
    function goToPreset(id) {
      if (!model || !renderer) return;
      stopAutoRotate();
      const preset = VP.get(id);
      activePreset = preset.id;
      nav.setActivePreset(preset.id);
      viewLive.textContent = `Vista ${preset.label}.`;
      animateTo(VP.cameraFor(preset.id, model.bounds, FOV_Y, renderer.aspect()), PRESET_MS);
    }

    /** Centraliza e enquadra a aeronave inteira mantendo a direção atual de observação. */
    function fitToScreen() {
      if (!model || !renderer) return;
      stopAutoRotate();
      animateTo(CU.fitCameraToObject(model.bounds, FOV_Y, renderer.aspect(), { yaw: camera.yaw, pitch: camera.pitch }), PRESET_MS);
    }

    /** @param {number} factor >1 afasta, <1 aproxima */
    function zoomBy(factor) {
      if (!renderer) return;
      stopAutoRotate();
      animateTo({ ...camera, target: [...camera.target], distance: camera.distance * factor }, ZOOM_MS);
    }

    function resetView() {
      goToPreset("perspective");
    }

    /** Primeiro contato do usuário com o canvas: interrompe animação e rotação automática. */
    function onUserInteraction() {
      stopAnimation();
      animating = false;
      stopAnimation = () => {};
      stopAutoRotate();
      if (activePreset !== null) {
        activePreset = null;
        nav.setActivePreset(null);
      }
    }

    // ---------- seleção e hierarquia ----------
    const canMark = () => Boolean(renderer) && confirmedPath.length > 1 && location === null;
    const markerCopy = () => (marker ? /** @type {DefectPosition} */ (JSON.parse(JSON.stringify(marker))) : null);
    const syncPanels = () => {
      panels.update({
        focusId, selectedId, hoverId, confirmedPath: [...confirmedPath], location,
        marker: markerCopy(), markMode, canMark: canMark(), snapshot,
      });
      updateMobileBar();
    };

    /** Próximo passo principal, sempre ao alcance do polegar no celular. */
    function updateMobileBar() {
      /** @type {[string, string, (() => void) | null]} */
      let next;
      if (location) next = ["Localização confirmada pelo usuário.", "Usar no registro", () => useLocation()];
      else if (markMode) next = [`Toque sobre ${RG.get(focusId).label}`, "Marcar no centro", () => markAtCenter()];
      else if (marker && !marker.confirmed) next = ["Ponto marcado, aguardando confirmação.", "Confirmar ponto", () => confirmPoint()];
      else if (selectedId) next = [RG.get(selectedId).label, "Confirmar região", () => confirmRegion()];
      else if (confirmedPath.length > 1) next = [`Em ${RG.get(focusId).label}: toque no próximo nível ou marque o ponto`, "Marcar ponto", () => setMarkMode(true)];
      else next = ["Toque numa região do modelo ou escolha na lista", "Confirmar região", null];
      mobileHint.textContent = next[0];
      mobileBtn.textContent = next[1];
      mobileAction = next[2];
      mobileBtn.disabled = !next[2] || !renderer;
    }

    /** Nó do GLB que representa a região no 3D (ela mesma ou a região-mãe com geometria). @param {string | null} id */
    const nodeOf = (id) => (id && model ? RG.geometryFor(id, model.nodeNames)?.node ?? null : null);

    /** Realce do quadro: nomes de nós do GLB, recalculados a cada quadro a partir dos IDs. @returns {RenderHighlight} */
    function highlight() {
      const deep = confirmedPath.length > 1 ? nodeOf(focusId) : null;
      return {
        hover: nodeOf(hoverId), selected: nodeOf(selectedId), confirmed: deep, focus: deep,
        marker: marker ? { position: marker.worldPosition, normal: marker.surfaceNormal, confirmed: marker.confirmed } : null,
      };
    }

    /** Vista predefinida mais próxima da direção atual (para currentView da localização). @returns {AircraftView} */
    function nearestView() {
      if (activePreset) return activePreset;
      const dir = (/** @type {number} */ y, /** @type {number} */ p) => [Math.cos(p) * Math.cos(y), Math.sin(p), Math.cos(p) * Math.sin(y)];
      const c = dir(camera.yaw, camera.pitch);
      let best = VP.PRESETS[0], bestDot = -Infinity;
      for (const pr of VP.PRESETS) {
        const d = dir(pr.yaw, pr.pitch);
        const dot = c[0] * d[0] + c[1] * d[1] + c[2] * d[2];
        if (dot > bestDot) { bestDot = dot; best = pr; }
      }
      return best.id;
    }

    /** Enquadra a região-mãe com geometria da região em foco (ou a aeronave inteira na raiz). */
    function frameFocus() {
      if (!model || !renderer) return;
      if (confirmedPath.length === 1) { fitToScreen(); return; }
      const g = RG.geometryFor(focusId, model.nodeNames);
      if (g) zoomToRegion(g.regionId, false);
    }

    function confirmRegion() {
      if (!selectedId || location) return;
      const fromPanel = focusInPanels();
      const prevGeo = model ? RG.geometryFor(focusId, model.nodeNames) : null;
      const id = selectedId;
      confirmedPath = [...confirmedPath, id];
      focusId = id;
      selectedId = null;
      hoverId = null;
      selection.hideTooltip();
      stopAutoRotate();
      const r = RG.get(id);
      const kids = RG.childrenOf(id).filter((k) => k.selectable);
      const nextLevel = /** @type {RegionLevel} */ (Math.min(6, r.level + 1));
      panels.announce(kids.length
        ? `Região confirmada: ${r.label}. Selecione o nível ${nextLevel}, ${RG.LEVEL_LABELS[nextLevel]}.${revalidateMarker()}`
        : `Região confirmada: ${r.label}. Não há subdivisões abaixo; marque o ponto, finalize a localização ou volte um nível.${revalidateMarker()}`);
      syncPanels();
      const geo = model ? RG.geometryFor(id, model.nodeNames) : null;
      // aproxima só quando a nova região tem geometria diferente da anterior (sem movimento inútil)
      if (geo && (!prevGeo || geo.regionId !== prevGeo.regionId)) zoomToRegion(geo.regionId, false);
      requestRender();
      moveFocus(fromPanel, ["[data-region-id]", "[data-a3d=finalize-partial]"]);
    }

    function backOneLevel() {
      if (confirmedPath.length < 2 || location) return;
      const fromPanel = focusInPanels();
      const popped = /** @type {string} */ (confirmedPath[confirmedPath.length - 1]);
      confirmedPath = confirmedPath.slice(0, -1);
      focusId = confirmedPath[confirmedPath.length - 1];
      selectedId = popped;       // a região de onde saiu volta como seleção candidata (não confirmada)
      hoverId = null;
      panels.announce(`Voltou para ${focusId === RG.ROOT_ID ? "a aeronave" : RG.get(focusId).label}. ${RG.get(popped).label} continua selecionada, sem confirmação.${revalidateMarker()}`);
      syncPanels();
      frameFocus();
      requestRender();
      moveFocus(fromPanel, ["[data-a3d=back-level]", `[data-region-id="${popped}"]`, "[data-region-id]"]);
    }

    /** @param {number} index posição no breadcrumb (0 = aeronave) */
    function goToCrumb(index) {
      if (location || index < 0 || index >= confirmedPath.length - 1) return;
      const fromPanel = focusInPanels();
      confirmedPath = confirmedPath.slice(0, index + 1);
      focusId = confirmedPath[index];
      selectedId = null;
      hoverId = null;
      panels.announce(`Voltou para ${index === 0 ? "a aeronave" : RG.get(focusId).label}. As confirmações abaixo deste nível foram desfeitas.${revalidateMarker()}`);
      syncPanels();
      frameFocus();
      requestRender();
      moveFocus(fromPanel, ["[data-region-id]", "button[data-crumb]"]);
    }

    function finalizePartial() {
      if (confirmedPath.length < 2 || location || marker) return;
      setMarkMode(false, true);
      selectedId = null;
      hoverId = null;
      selection.hideTooltip();
      location = { ...RG.locationFrom(confirmedPath, { view: nearestView(), partial: true }), source: "3d" };
      snapshot = captureSnapshot();
      panels.announce(`${PN.CONFIRM_TEXT} Localização parcial: ${RG.labelOf(location)}. ${snapshot ? "Captura gerada; use" : "Não foi possível gerar a captura; use mesmo assim"} a localização no registro.`);
      syncPanels();
      requestRender();
      moveFocus(true, ["[data-a3d=use-location]", "[data-a3d=edit-location]"]);
    }

    function editLocation() {
      if (!location) return;
      const fromPanel = focusInPanels();
      location = null;
      snapshot = null;
      if (marker) marker = { ...marker, confirmed: false };   // o ponto volta a aguardar confirmação
      panels.announce(marker ? `Localização reaberta para edição. ${PN.PENDING_TEXT}` : "Localização reaberta para edição.");
      syncPanels();
      requestRender();
      moveFocus(fromPanel, ["[data-region-id]", "[data-a3d=finalize-partial]", "[data-a3d=back-level]"]);
    }

    /** O foco estava nos painéis (ação feita pelo teclado ou mouse nos botões)? */
    const focusInPanels = () => {
      const a = document.activeElement;
      return a instanceof HTMLElement && Boolean(a.closest(".ccd-a3d__side"));
    };
    /**
     * Depois de uma ação que re-renderiza ou desabilita o botão usado, leva o foco a um destino
     * útil em vez de deixá-lo cair no <body>. Não rouba o foco do canvas.
     * @param {boolean} fromPanel @param {string[]} selectors em ordem de preferência
     */
    const moveFocus = (fromPanel, selectors) => {
      const a = document.activeElement;
      if (!fromPanel && a && a !== document.body) return;
      for (const sel of selectors) {
        const el = /** @type {HTMLElement | null} */ (shell.querySelector(sel));
        if (el && !(/** @type {HTMLButtonElement} */ (el).disabled) && el.getClientRects().length) { el.focus(); return; }
      }
    };

    /** @param {string | null} id */
    function setHover(id) {
      if (id === hoverId) return;
      hoverId = id;
      syncPanels();
      requestRender();
    }

    /** @param {string} id @param {"pointer" | "list"} _source */
    function selectRegion(id, _source) {
      const r = RG.get(id);
      if (!r || !r.selectable || !renderer || location || r.parentId !== focusId) return;
      stopAutoRotate();
      selectedId = id;
      panels.announce(`${r.label}. Região selecionada; confirme para avançar.`);
      syncPanels();
      requestRender();
    }

    function clearSelection() {
      if (selectedId === null) return;
      selectedId = null;
      syncPanels();
      requestRender();
    }

    /** Enquadra a região (ou a região-mãe com geometria) mantendo a direção de observação atual. @param {string} id @param {boolean} [announce] */
    function zoomToRegion(id, announce = true) {
      if (!model || !renderer) return;
      const geo = RG.geometryFor(id, model.nodeNames);
      if (!geo) return;
      const b = regionBounds(model, geo.node);
      if (!b) return;
      stopAutoRotate();
      if (activePreset !== null) { activePreset = null; nav.setActivePreset(null); }
      if (announce) viewLive.textContent = `Aproximando: ${RG.get(geo.regionId).label}.`;
      // margem maior que a da aeronave inteira: a região fica com folga e longe da barra de vistas
      const view = { yaw: camera.yaw, pitch: camera.pitch };
      animateTo({ target: [...b.center], distance: CU.fitDistance(b, FOV_Y, renderer.aspect(), view, REGION_MARGIN), ...view }, PRESET_MS);
    }

    // ---------- marcador da não conformidade (Fase 5) ----------
    /** Região com geometria da região em foco (onde o ponto pode ficar). */
    const focusGeometry = () => (model && confirmedPath.length > 1 ? RG.geometryFor(focusId, model.nodeNames) : null);

    /** O ponto atingido pertence à região confirmada? @param {PickResult} p @returns {MarkerAttempt} */
    function validatePick(p) {
      const g = focusGeometry();
      const focus = RG.get(focusId);
      if (!g) return { ok: false, lines: ["Confirme ao menos a grande região para marcar"] };
      if (RG.pathOf(p.leafId).includes(g.regionId)) {
        return { ok: true, lines: [focus.label, marker ? "Clique para mover o ponto para cá" : "Clique para marcar o ponto aqui"] };
      }
      return { ok: false, lines: [RG.get(p.leafId).label, `Fora de ${focus.label}`, "Marque sobre a região confirmada"] };
    }

    /** Remove o ponto se ele ficou fora da região em foco; devolve o aviso (ou ""). */
    function revalidateMarker() {
      if (!marker) {
        if (!canMark()) setMarkMode(false, true);
        return "";
      }
      const g = focusGeometry();
      if (g && RG.pathOf(marker.meshRegionId).includes(g.regionId)) {
        marker = { ...marker, regionId: focusId };
        return "";
      }
      marker = null;
      setMarkMode(false, true);
      syncPanels();
      requestRender();
      return " O ponto marcado ficou fora da região em foco e foi removido.";
    }

    /** @param {boolean} on @param {boolean} [quiet] */
    function setMarkMode(on, quiet = false) {
      if (on && (!canMark() || (marker && marker.confirmed))) return;
      if (on === markMode) return;
      markMode = on;
      if (on) {
        selectedId = null;
        hoverId = null;
        selection.hideTooltip();
        stopAutoRotate();
        // celular: os painéis ficam abaixo do palco; traz o modelo de volta à vista para marcar
        const r = stage.getBoundingClientRect();
        const body = stage.parentElement;
        if (body && r.top < body.getBoundingClientRect().top - 1) stage.scrollIntoView({ block: "start" });
      } else {
        markerTool.hideTooltip();
      }
      canvas.classList.toggle("is-marking", on);
      canvas.classList.remove("is-invalid-mark");
      crosshair.hidden = !on;
      if (!quiet) {
        panels.announce(on
          ? `Modo de marcação: clique sobre ${RG.get(focusId).label} para ${marker ? "mover" : "marcar"} o ponto, ou use Marcar no centro da tela. Escape sai do modo.`
          : "Modo de marcação encerrado.");
      }
      syncPanels();
      requestRender();
    }

    /** @param {PickResult} p @param {"click" | "drag" | "center"} how */
    function placeMarker(p, how) {
      if (!model || !canMark()) return;
      const prim = model.primitives[p.primitiveIndex];
      const inv = prim ? M.invert(prim.world) : null;
      const local = inv ? M.transformPoint(inv, p.point) : p.point;
      marker = {
        regionId: focusId,
        meshRegionId: p.leafId,
        meshName: p.nodeName,
        localPosition: vec(local),
        worldPosition: vec(p.point),
        surfaceNormal: vec(M.normalize(p.normal)),
        referenceView: nearestView(),
        confirmed: false,
      };
      if (how !== "drag") {
        const fromPanel = how === "center";
        setMarkMode(false, true);
        panels.announce(`${PN.PENDING_TEXT} ${RG.get(focusId).label}.`);
        if (fromPanel) moveFocus(true, ["[data-a3d=confirm-point]"]);
      }
      syncPanels();
      requestRender();
    }

    function markAtCenter() {
      if (!markMode) return;
      const v = markerTool.placeAtCenter();
      if (!v.ok) panels.announce(`Não foi possível marcar no centro da tela: ${v.lines.join(". ")}.`);
    }

    function removeMarker() {
      if (!marker || location) return;
      const fromPanel = focusInPanels();
      marker = null;
      setMarkMode(false, true);
      panels.announce("Ponto removido.");
      syncPanels();
      requestRender();
      moveFocus(fromPanel, ["[data-a3d=mark-mode]"]);
    }

    function confirmPoint() {
      if (!marker || location || markMode) return;
      marker = { ...marker, regionId: focusId, confirmed: true };
      location = { ...RG.locationFrom(confirmedPath, { view: marker.referenceView, partial: false }), source: "3d", defectPosition: { ...marker } };
      selectedId = null;
      hoverId = null;
      snapshot = captureSnapshot();
      panels.announce(`${PN.CONFIRM_TEXT} ${RG.labelOf(location)}, com ponto marcado. ${snapshot ? "Captura gerada; use" : "Não foi possível gerar a captura; use mesmo assim"} a localização no registro.`);
      syncPanels();
      requestRender();
      moveFocus(true, ["[data-a3d=use-location]", "[data-a3d=edit-location]"]);
    }

    // ---------- integração com o formulário (Fase 6) ----------
    /**
     * Estado inicial a partir do registro: localização estruturada do 3D (caminho, ponto e
     * confirmação) ou, na falta dela, o texto de regionSelected (só o caminho, sem confirmar).
     */
    function applyInitialLocation() {
      const H = /** @type {AircraftHierarchyApi} */ (window.CtrlCDAircraftHierarchy);
      const chainOk = (/** @type {string[]} */ ids) => ids.length > 1 && ids.every((id, i) => (i === 0 ? id === RG.ROOT_ID : Boolean(H.get(id)) && H.get(id).parentId === ids[i - 1]));
      const loc = initialLocation;
      if (loc && Array.isArray(loc.locationIds)) {
        const ids = [RG.ROOT_ID, ...loc.locationIds];
        if (chainOk(ids)) {
          confirmedPath = ids;
          focusId = ids[ids.length - 1];
          if (loc.source !== "2d") {
            marker = loc.defectPosition ? { ...loc.defectPosition, confirmed: true } : null;
            const { snapshot: _meta, ...rest } = loc;
            location = /** @type {AircraftLocation} */ (JSON.parse(JSON.stringify(rest)));
          }
          return;
        }
      }
      if (current) {
        const ids = H.pathFromLabel(current);
        if (chainOk(ids)) { confirmedPath = ids; focusId = ids[ids.length - 1]; }
      }
    }

    /**
     * Captura do canvas para o registro: região em foco centralizada e realçada, marcador
     * visível, sem grade; painéis, dicas e botões ficam fora (são HTML, não entram no canvas).
     * Legenda fixa com o aviso demonstrativo. Restaura a imagem normal logo em seguida.
     * @returns {string | null} data URL JPEG
     */
    function captureSnapshot() {
      if (!renderer || !model || confirmedPath.length < 2) return null;
      const g = RG.geometryFor(focusId, model.nodeNames);
      const b = g ? regionBounds(model, g.node) : null;
      const view = { yaw: camera.yaw, pitch: camera.pitch };
      const cam = b ? clampToLimits({ target: [...b.center], distance: CU.fitDistance(b, FOV_Y, renderer.aspect(), view, 2.1), ...view }) : camera;
      const hl = highlight();
      try {
        renderer.render(cam, { confirmed: hl.confirmed, focus: hl.focus, marker: hl.marker }, { grid: false });
        const W = Math.min(1280, canvas.width);
        const scale = W / canvas.width;
        const Himg = Math.round(canvas.height * scale);
        const strip = 30;
        const out = document.createElement("canvas");
        out.width = W;
        out.height = Himg + strip;
        const ctx = out.getContext("2d");
        if (!ctx) return null;
        const bg = ctx.createRadialGradient(W / 2, Himg * 0.4, 10, W / 2, Himg * 0.4, Math.max(W, Himg) * 0.75);
        bg.addColorStop(0, "#1d3553"); bg.addColorStop(0.55, "#0f1f33"); bg.addColorStop(1, "#0a1624");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, Himg);
        ctx.drawImage(canvas, 0, 0, W, Himg);
        ctx.fillStyle = "#0a1624";
        ctx.fillRect(0, Himg, W, strip);
        ctx.fillStyle = "#d6e2f0";
        ctx.font = "12px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText(`${DISCLAIMER} · ${RG.labelOf(location || RG.locationFrom(confirmedPath, { view: nearestView(), partial: true }))}`, 10, Himg + strip / 2, W - 20);
        snapshotDims = { w: out.width, h: out.height };
        return out.toDataURL("image/jpeg", 0.86);
      } catch {
        return null;   // p.ex. canvas indisponível: a localização segue sem captura
      } finally {
        requestRender();
      }
    }

    /** Entrega a localização ao formulário e fecha (mesmo contrato do localizador 2D, com detalhe opcional). */
    function useLocation() {
      if (!location || closed) return;
      const label = RG.labelOf(location);
      /** @type {AircraftLocation} */
      const loc = JSON.parse(JSON.stringify({ ...location, source: "3d" }));
      if (snapshot && snapshotDims) {
        loc.snapshot = {
          width: snapshotDims.w, height: snapshotDims.h, createdAt: new Date().toISOString(),
          bytes: Math.round((snapshot.length - snapshot.indexOf(",") - 1) * 0.75),
        };
      }
      /** @type {LocationConfirmDetail} */
      const detail = { label, location: loc, snapshotDataUrl: snapshot };
      const cb = onConfirm;
      close();
      cb?.(label, detail);
    }

    const selection = SEL.createSelection({
      getModel: () => model,
      getCanvas: () => canvas,
      getCamera: () => camera,
      fovY: FOV_Y,
      getFocus: () => focusId,
      getSelected: () => selectedId,
      tooltip,
      enabled: () => Boolean(renderer && model && RC.isBuilt(model)) && location === null && !markMode && !markerTool.dragging,
      isNavigating: () => Boolean(controls && controls.dragging),
      onHover: (id) => {
        setHover(id);
        canvas.classList.toggle("is-pickable", id !== null);
      },
      onSelect: (id) => selectRegion(id, "pointer"),
      onZoomTo: (id) => zoomToRegion(id),
      describeNonTarget: (p) => {
        const leaf = RG.get(p.leafId);
        const focus = RG.get(focusId);
        const inFocus = RG.pathOf(p.leafId).includes(focusId) || RG.pathOf(focusId).includes(p.leafId);
        if (!inFocus) {
          return [leaf.label, `Fora de ${focus.label}`, "Use Voltar um nível ou o breadcrumb para trocar de região"];
        }
        const kids = RG.childrenOf(focusId).filter((k) => k.selectable);
        if (!kids.length) return [focus.label, "Sem subdivisões abaixo nesta hierarquia", "Finalize a localização ou volte um nível"];
        const next = RG.LEVEL_LABELS[/** @type {RegionLevel} */ (Math.min(6, focus.level + 1))];
        return [focus.label, `Escolha: ${next} (na lista)`, "Subdivisões sem geometria própria no modelo"];
      },
    });

    const markerTool = MK.createMarkerTool({
      host: stage,
      getCanvas: () => canvas,
      getCamera: () => camera,
      fovY: FOV_Y,
      tooltip: markTip,
      pick: (x, y) => selection.pick(x, y),
      validate: validatePick,
      isMarking: () => markMode && canMark(),
      isNavigating: () => Boolean(controls && controls.dragging),
      canDrag: () => Boolean(marker && !marker.confirmed && location === null && renderer && model && RC.isBuilt(model)),
      getMarker: () => (marker ? { position: marker.worldPosition, normal: marker.surfaceNormal } : null),
      onPlace: (p, how) => placeMarker(p, how),
      onDragEnd: () => { panels.announce(`Ponto reposicionado. ${PN.PENDING_TEXT}`); syncPanels(); },
      onRejected: (v) => panels.announce(`Ponto não marcado: ${v.lines.slice(1).join(". ")}.`),
    });

    /** Índice de raycast (BVH) construído depois do primeiro quadro, em fatias, para não atrasar nem travar a exibição. @param {GlbModel} m */
    function scheduleRaycastIndex(m) {
      clearTimeout(bvhTimer);
      bvhTimer = window.setTimeout(() => {
        bvhTimer = 0;
        if (closed || model !== m) return;
        // em fatias de ~12 ms: a interface continua respondendo enquanto o índice é montado (Fase 7)
        RC.buildAsync(m).then((ix) => {
          if (closed || model !== m) return;
          if (lastMetrics) { lastMetrics.raycastBuildMs = Math.round(ix.buildMs); lastMetrics.raycastTriangles = ix.triangles; }
          panels.setEnabled(true);
        });
      }, 0);
    }

    // ---------- estados: carregando / erro ----------
    function showLoading() {
      const bar = h("span", { class: "ccd-a3d__barfill" });
      const pct = h("span", { class: "ccd-a3d__pct", "aria-hidden": "true" }, "0 %");
      const progress = h("div", {
        class: "ccd-a3d__bar", role: "progressbar", "aria-label": "Progresso do carregamento do modelo",
        "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0",
      }, bar);
      status.replaceChildren(h("div", { class: "ccd-a3d__panel ccd-a3d__panel--loading", "data-a3d": "loading" },
        h("div", { class: "ccd-a3d__skeleton", "aria-hidden": "true" },
          h("span", { class: "ccd-a3d__sk ccd-a3d__sk--fus" }), h("span", { class: "ccd-a3d__sk ccd-a3d__sk--wing" }),
          h("span", { class: "ccd-a3d__sk ccd-a3d__sk--tail" })),
        h("p", { class: "ccd-a3d__paneltitle", role: "status" }, "Carregando modelo da aeronave..."),
        progress, pct,
        h("div", { class: "ccd-a3d__actions" },
          h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", "data-a3d": "cancel", onclick: close }, "Cancelar"))));
      status.hidden = false;
      /** @param {LoadProgress} p */
      return (p) => {
        const v = p.total ? Math.min(100, Math.round((p.loaded / p.total) * 100)) : null;
        bar.style.width = v === null ? "40%" : v + "%";
        progress.setAttribute("aria-valuenow", String(v ?? 0));
        pct.textContent = v === null ? `${fmtMB(p.loaded)} recebidos` : `${v} % · ${fmtMB(p.loaded)} de ${fmtMB(/** @type {number} */ (p.total))}`;
      };
    }

    /** @param {string} detail @param {boolean} canRetry */
    function showError(detail, canRetry) {
      nav.setEnabled(false);
      panels.setEnabled(false);
      selection.hideTooltip();
      stopAutoRotate();
      const panel = h("div", { class: "ccd-a3d__panel ccd-a3d__panel--error", role: "alert", "data-a3d": "error" },
        h("span", { class: "ccd-a3d__erricon" }, icon("alert", 20)),
        h("p", { class: "ccd-a3d__paneltitle" }, "Não foi possível carregar o modelo 3D."),
        h("p", { class: "ccd-a3d__paneldetail" }, detail),
        h("div", { class: "ccd-a3d__actions" },
          canRetry ? h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--sm", "data-a3d": "retry", onclick: retry }, icon("refresh", 14), "Tentar novamente") : null,
          h("button", { type: "button", class: "ccd-btn ccd-btn--soft ccd-btn--sm", "data-a3d": "fallback", onclick: () => openLegacy() }, "Usar vistas técnicas"),
          h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", "data-a3d": "manual", onclick: () => openLegacy(), title: "Abre a lista de níveis do localizador atual" }, "Informar localização manualmente"),
          h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", "data-a3d": "error-close", onclick: close }, "Fechar")));
      status.replaceChildren(panel);
      status.hidden = false;
      panel.querySelector("button")?.focus();
    }

    function hideStatus() {
      status.replaceChildren();
      status.hidden = true;
    }

    // ---------- ciclo de vida ----------
    function teardownGraphics() {
      cancelAnimationFrame(raf);
      raf = 0;
      stopAnimation();
      stopAnimation = () => {};
      animating = false;
      stopAutoRotate();
      clearTimeout(bvhTimer);
      bvhTimer = 0;
      controls?.dispose();
      controls = null;
      renderer?.dispose();
      renderer = null;
      resizeObserver?.disconnect();
      resizeObserver = null;
    }

    /** Cria renderizador e controles para o modelo já carregado (não baixa de novo). @param {GlbModel} m */
    function startScene(m) {
      model = m;
      teardownGraphics();
      renderer = R.createRenderer(canvas, m, {
        fovY: FOV_Y,
        maxPixelRatio: window.matchMedia?.("(pointer: coarse)").matches ? 1.5 : 2,
        onContextLost: () => {
          teardownGraphics();
          showError("O contexto gráfico do navegador foi perdido (por exemplo, por falta de memória de vídeo).", true);
        },
      });
      // textos do rodapé e painéis antes de medir o canvas: o rodapé pode quebrar em duas linhas
      // e mudar a altura do palco; a câmera inicial usa a proporção já definitiva
      metricsEl.textContent = `${fmtInt(m.triangles)} triângulos · ${fmtMB(m.bytes)} · ${m.meshNodeNames.length} regiões no arquivo`;
      hideStatus();
      syncPanels();
      const fitted = VP.cameraFor("perspective", m.bounds, FOV_Y, renderer.aspect());
      limits = CU.cameraLimits(m.bounds, fitted.distance);
      camera = { ...fitted, target: [...fitted.target] };
      activePreset = "perspective";
      nav.setActivePreset("perspective");
      controls = C.attachOrbitControls(canvas, {
        fovY: FOV_Y,
        getState: () => ({ ...camera, target: [...camera.target] }),
        setState: (s) => { camera = s; requestRender(); },
        getLimits: () => /** @type {CameraLimits} */ (limits),
        onInteractionStart: () => { onUserInteraction(); selection.hideTooltip(); },
        onPointerContact: () => stopAutoRotate(),
      });
      selection.attach();
      markerTool.attach();
      resizeObserver = new ResizeObserver(() => requestRender());
      resizeObserver.observe(stage);
      nav.setEnabled(true);
      lastMetrics = { bytes: m.bytes, loadMs: m.loadMs, triangles: m.triangles, firstFrameMs: null, downloads: loader.downloads, raycastBuildMs: null, raycastTriangles: null };
      if (RC.isBuilt(m)) {
        panels.setEnabled(true);
        const ix = RC.build(m);
        lastMetrics.raycastBuildMs = 0;
        lastMetrics.raycastTriangles = ix.triangles;
      } else {
        scheduleRaycastIndex(m);
      }
      requestRender();
      // reaberto com localização salva: enquadra a região e refaz a captura depois do 1º quadro
      if (confirmedPath.length > 1) {
        frameFocus();
        if (location && !snapshot) {
          requestAnimationFrame(() => requestAnimationFrame(() => {
            if (closed || !renderer || !location || snapshot) return;
            snapshot = captureSnapshot();
            syncPanels();
          }));
        }
      }
    }

    function load() {
      const support = isSupported();
      if (!support.ok) {
        showError(/** @type {string} */ (support.reason), false);
        return;
      }
      const onProgress = showLoading();
      loader.loadModel(modelUrl(), { signal: abort.signal, onProgress })
        .then((m) => {
          if (closed) return;
          try {
            startScene(m);
          } catch (err) {
            teardownGraphics();
            showError(err instanceof Error ? err.message : String(err), true);
          }
        })
        .catch((err) => {
          if (closed || abort.signal.aborted) return;
          showError(err instanceof Error ? err.message : String(err), true);
        });
    }

    /** Um contexto WebGL perdido não volta no mesmo canvas: troca o elemento antes de recriar a cena. */
    function replaceCanvas() {
      const fresh = makeCanvas();
      canvas.replaceWith(fresh);
      canvas = fresh;
    }

    function retry() {
      if (model) {
        try {
          replaceCanvas();
          startScene(model);
          canvas.focus({ preventScroll: true });
        } catch (err) {
          showError(err instanceof Error ? err.message : String(err), true);
        }
      } else {
        load();
      }
    }

    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      const t = /** @type {HTMLElement | null} */ (e.target);
      if (t && t.closest("input, textarea, select, [contenteditable='true']")) return;
      if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        resetView();
      }
    };

    const releaseEscape = trapEscape(close);

    /** Escape fecha primeiro a dica aberta; só o próximo Escape fecha o modal. @param {KeyboardEvent} e */
    const onEscapeFirst = (e) => {
      if (e.key !== "Escape") return;
      if (selection.tooltipVisible) {
        e.preventDefault();
        e.stopImmediatePropagation();
        selection.hideTooltip();
        setHover(null);
      } else if (markerTool.tooltipVisible) {
        e.preventDefault();
        e.stopImmediatePropagation();
        markerTool.hideTooltip();
      } else if (markMode) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setMarkMode(false);
      }
    };

    /** Mantém o foco dentro do modal (Tab e Shift+Tab circulam entre os controles). @param {KeyboardEvent} e */
    const onTab = (e) => {
      if (e.key !== "Tab") return;
      const items = /** @type {HTMLElement[]} */ ([...shell.querySelectorAll("button, [tabindex='0']")])
        .filter((el) => !(/** @type {HTMLButtonElement} */ (el).disabled) && el.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = active instanceof HTMLElement && shell.contains(active);
      if (!inside) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    function dispose() {
      closed = true;
      abort.abort();
      teardownGraphics();
      selection.dispose();
      markerTool.dispose();
      fullscreen.dispose();
      window.removeEventListener("keydown", onEscapeFirst, true);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keydown", onTab, true);
      releaseEscape();
      overlay.remove();
      document.body.classList.remove("ccd-a3d-open");
      inspectCurrent = null;
      pickCurrent = null;
    }

    function close() {
      if (closed) return;
      dispose();
      onClose?.();
    }

    /** Troca para o localizador 2D, repassando o contrato original sem alteração. */
    function openLegacy() {
      if (closed) return;
      dispose();
      if (legacy) legacy.open({ current, location: initialLocation, onConfirm, onClose });
      else onClose?.();
    }

    inspectCurrent = () => ({
      camera: { ...camera, target: [...camera.target] },
      preset: activePreset,
      animating,
      autoRotate: autoRotate.running,
      fullscreen: fullscreen.active,
      ready: Boolean(renderer),
      selection: {
        focusId, selectedId, hoverId, confirmedPath: [...confirmedPath],
        location: location ? /** @type {AircraftLocation} */ (JSON.parse(JSON.stringify(location))) : null,
        marker: markerCopy(), markMode, canMark: canMark(), snapshot,
        tooltip: selection.tooltipVisible, raycastReady: Boolean(model && RC.isBuilt(model)),
      },
    });
    pickCurrent = (x, y) => {
      const p = selection.pick(x, y);
      return p ? { ...p, point: [...p.point], normal: [...p.normal] } : null;
    };

    legacyBtn.addEventListener("click", openLegacy);
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", onKey);
    document.addEventListener("keydown", onTab, true);
    window.addEventListener("keydown", onEscapeFirst, true);
    document.body.appendChild(overlay);
    document.body.classList.add("ccd-a3d-open");
    canvas.focus({ preventScroll: true });
    load();
  }

  window.CtrlCDAircraft3D = Object.freeze({
    open,
    isSupported,
    modelUrl,
    get lastMetrics() { return lastMetrics; },
    /** Estado serializável do visualizador aberto (para testes e integração); null se fechado. */
    inspect: () => (inspectCurrent ? inspectCurrent() : null),
    /** Resultado serializável do raycast no ponto da tela (sem selecionar); null se fechado ou sem acerto. */
    pick: (/** @type {number} */ x, /** @type {number} */ y) => (pickCurrent ? pickCurrent(x, y) : null),
    version: VERSION,
  });
})();

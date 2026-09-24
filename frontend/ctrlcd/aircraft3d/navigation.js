// @ts-check
/* ==========================================================================
   CTRL+CD 3D — navegação (Fase 2): barra de vistas e ações, rotação automática e tela cheia.

   - Barra: 8 vistas predefinidas (aria-pressed na vista ativa), zoom −/+, Ajustar à tela,
     Iniciar/Pausar rotação, Redefinir vista e Tela cheia.
   - Rotação automática: desligada por padrão; indisponível com prefers-reduced-motion;
     só altera a VISUALIZAÇÃO (o yaw da câmera), nunca o modelo; quem chama a pausa no
     primeiro contato do usuário e ela não volta sozinha.
   - Tela cheia: Fullscreen API no elemento do modal; onde ela não existe (ex.: iPhone),
     tela cheia simulada por CSS (.is-pseudo-fullscreen).
   Exposto em window.CtrlCD3D.navigation.
   ========================================================================== */
(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const ROTATE_RAD_PER_S = (8 * Math.PI) / 180;

  /** Ícones próprios (constantes; nenhum dado do usuário). @param {string} d */
  function svgIcon(d) {
    const svg = document.createElementNS(SVG_NS, "svg");
    for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor",
      "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false" })) {
      svg.setAttribute(k, v);
    }
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
    return svg;
  }
  const ICONS = {
    fit: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
    fullscreen: "M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5",
    exitFullscreen: "M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5",
    rotate: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",
    pause: "M9 5v14M15 5v14",
  };

  const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  /**
   * Rotação automática da câmera em torno do alvo.
   * @param {(dYaw: number) => void} step
   */
  function createAutoRotate(step) {
    let raf = 0;
    let last = 0;
    const frame = (/** @type {number} */ t) => {
      const dt = last ? Math.min(0.25, (t - last) / 1000) : 0;   // limita saltos (aba em segundo plano) sem desacelerar em quadros lentos
      last = t;
      step(dt * ROTATE_RAD_PER_S);
      raf = requestAnimationFrame(frame);
    };
    return {
      get running() { return raf !== 0; },
      start() {
        if (raf || reducedMotion()) return false;
        last = 0;
        raf = requestAnimationFrame(frame);
        return true;
      },
      stop() {
        cancelAnimationFrame(raf);
        raf = 0;
      },
    };
  }

  /**
   * Tela cheia do modal (Fullscreen API ou simulação por CSS).
   * @param {HTMLElement} el @param {() => void} onChange
   */
  function createFullscreen(el, onChange) {
    const native = document.fullscreenEnabled === true && typeof el.requestFullscreen === "function";
    let pseudo = false;
    const onNative = () => onChange();
    document.addEventListener("fullscreenchange", onNative);
    return {
      get active() { return document.fullscreenElement === el || pseudo; },
      get native() { return native; },
      async toggle() {
        if (native) {
          try {
            if (document.fullscreenElement === el) await document.exitFullscreen();
            else await el.requestFullscreen();
            onChange(); // alguns navegadores emitem fullscreenchange antes de atualizar o estado
            return;
          } catch {
            /* recusado pelo navegador: usa a simulação por CSS */
          }
        }
        pseudo = !pseudo;
        el.classList.toggle("is-pseudo-fullscreen", pseudo);
        onChange();
      },
      dispose() {
        document.removeEventListener("fullscreenchange", onNative);
        if (document.fullscreenElement === el) document.exitFullscreen().catch(() => {});
        el.classList.remove("is-pseudo-fullscreen");
        pseudo = false;
      },
    };
  }

  /**
   * Barra de navegação. Os botões começam desabilitados até o modelo carregar.
   * @param {NavigationHandlers} handlers
   */
  function createToolbar(handlers) {
    const { h, icon } = window.CtrlCDUI;
    const VP = /** @type {ViewPresetsApi} */ (window.CtrlCD3D.viewPresets);
    /** @type {HTMLButtonElement[]} */
    const all = [];
    /** @param {Record<string, unknown>} props @param {...unknown} kids */
    const btn = (props, ...kids) => {
      const b = /** @type {HTMLButtonElement} */ (h("button", { type: "button", disabled: true, ...props }, ...kids));
      all.push(b);
      return b;
    };

    const viewButtons = VP.PRESETS.map((p) => btn({
      class: "ccd-a3d__view", "data-a3d-view": p.id, "aria-pressed": "false", title: p.description, "aria-label": `Vista ${p.label}`,
      onclick: () => handlers.onPreset(p.id),
    }, h("span", { class: "ccd-a3d__viewlong" }, p.label), h("span", { class: "ccd-a3d__viewshort", "aria-hidden": "true" }, p.shortLabel)));
    const views = h("div", { class: "ccd-a3d__views", role: "group", "aria-label": "Vistas predefinidas" }, ...viewButtons);

    const zoomOut = btn({ class: "ccd-a3d__tool", "data-a3d": "zoom-out", "aria-label": "Afastar", title: "Afastar (tecla −)", onclick: () => handlers.onZoom(1.25) }, icon("minus", 14));
    const zoomIn = btn({ class: "ccd-a3d__tool", "data-a3d": "zoom-in", "aria-label": "Aproximar", title: "Aproximar (tecla +)", onclick: () => handlers.onZoom(0.8) }, icon("plus", 14));
    const fit = btn({ class: "ccd-a3d__tool ccd-a3d__tool--text", "data-a3d": "fit", title: "Centralizar e enquadrar a aeronave inteira na vista atual", onclick: handlers.onFit },
      svgIcon(ICONS.fit), h("span", { class: "ccd-a3d__toollabel" }, "Ajustar à tela"));
    const rotateLabel = h("span", { class: "ccd-a3d__toollabel" }, "Iniciar rotação");
    const rotateIcon = h("span", { class: "ccd-a3d__toolicon" }, svgIcon(ICONS.rotate));
    const rotate = btn({ class: "ccd-a3d__tool ccd-a3d__tool--text", "data-a3d": "autorotate", "aria-pressed": "false",
      title: "Rotação automática da visualização (pausa ao primeiro contato)", onclick: handlers.onToggleRotate }, rotateIcon, rotateLabel);
    const reset = btn({ class: "ccd-a3d__tool ccd-a3d__tool--text", "data-a3d": "reset", title: "Redefinir vista (tecla R)", onclick: handlers.onReset },
      icon("refresh", 14), h("span", { class: "ccd-a3d__toollabel" }, "Redefinir"));
    const fsLabel = h("span", { class: "ccd-a3d__toollabel" }, "Tela cheia");
    const fsIcon = h("span", { class: "ccd-a3d__toolicon" }, svgIcon(ICONS.fullscreen));
    const fullscreen = btn({ class: "ccd-a3d__tool ccd-a3d__tool--text", "data-a3d": "fullscreen", "aria-pressed": "false",
      title: "Alternar tela cheia", onclick: handlers.onToggleFullscreen }, fsIcon, fsLabel);
    const actions = h("div", { class: "ccd-a3d__actionsbar", role: "toolbar", "aria-label": "Controles da visualização" },
      zoomOut, zoomIn, fit, rotate, reset, fullscreen);

    const element = h("div", { class: "ccd-a3d__nav" }, views, actions);
    let rotateUnavailable = false;

    return {
      element,
      /** @param {boolean} on */
      setEnabled(on) {
        for (const b of all) b.disabled = !on;
        if (on && rotateUnavailable) rotate.disabled = true;
      },
      /** @param {AircraftView | null} id */
      setActivePreset(id) {
        for (const b of viewButtons) b.setAttribute("aria-pressed", String(b.dataset.a3dView === id));
      },
      /** @param {boolean} on */
      setAutoRotate(on) {
        rotate.setAttribute("aria-pressed", String(on));
        rotateLabel.textContent = on ? "Pausar rotação" : "Iniciar rotação";
        rotateIcon.replaceChildren(svgIcon(on ? ICONS.pause : ICONS.rotate));
      },
      /** @param {string} reason */
      disableAutoRotate(reason) {
        rotateUnavailable = true;
        rotate.disabled = true;
        rotate.title = reason;
      },
      /** @param {boolean} on */
      setFullscreen(on) {
        fullscreen.setAttribute("aria-pressed", String(on));
        fsLabel.textContent = on ? "Sair da tela cheia" : "Tela cheia";
        fsIcon.replaceChildren(svgIcon(on ? ICONS.exitFullscreen : ICONS.fullscreen));
      },
    };
  }

  window.CtrlCD3D.navigation = Object.freeze({ createToolbar, createAutoRotate, createFullscreen, reducedMotion });
})();

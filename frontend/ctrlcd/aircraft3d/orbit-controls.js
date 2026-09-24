// @ts-check
/* ==========================================================================
   CTRL+CD 3D — controles de órbita (equivalente ao OrbitControls), sem dependências.

   Desktop: arrastar = girar · roda = zoom (em direção ao alvo) ·
            botão direito ou Shift + arrastar = mover.
   Toque:   um dedo = girar · pinça = zoom · dois dedos = mover.
   Teclado (com o foco no canvas): setas = girar · Shift + setas = mover · + e − = zoom.
   - Amortecimento (inércia) após soltar.
   - Limites: distância mínima e máxima, elevação e alvo restrito à caixa da aeronave
     (impede a câmera de entrar no modelo ou de "perder" a aeronave).
   Só altera o estado da câmera; quem desenha é o visualizador.
   Exposto em window.CtrlCD3D.controls.
   ========================================================================== */
(() => {
  "use strict";

  const M = /** @type {MathApi} */ (window.CtrlCD3D.math);
  const ROTATE_SPEED = 0.0075; // rad por pixel
  const DAMPING = 0.86;        // fração da velocidade mantida por quadro
  const STOP = 1e-4;

  /**
   * @param {HTMLElement} el
   * onPointerContact: qualquer toque/clique no canvas (pausa a rotação automática).
   * onInteractionStart: início efetivo de navegação (arrasto além de 4 px, roda, pinça, teclado);
   * um clique sem arrasto NÃO é navegação (é seleção, tratada em selection.js).
   * @param {{ getState(): CameraState, setState(s: CameraState): void, getLimits(): CameraLimits, fovY: number, onInteractionStart?: () => void, onPointerContact?: () => void }} opts
   */
  function attachOrbitControls(el, opts) {
    /** @type {Map<number, { x: number, y: number }>} */
    const pointers = new Map();
    let mode = /** @type {"none" | "rotate" | "pan" | "touch"} */ ("none");
    let vYaw = 0;
    let vPitch = 0;
    let vZoom = 0; // log da escala por quadro
    let lastPinch = 0;
    /** @type {{ x: number, y: number } | null} */
    let lastMid = null;
    /** @type {{ x: number, y: number } | null} */
    let downAt = null;
    let dragging = false;
    const DRAG_PX = 4;

    /** @param {CameraState} s */
    function clampState(s) {
      const L = opts.getLimits();
      s.distance = M.clamp(s.distance, L.minDistance, L.maxDistance);
      s.pitch = M.clamp(s.pitch, L.minPitch, L.maxPitch);
      for (let k = 0; k < 3; k++) s.target[k] = M.clamp(s.target[k], L.targetMin[k], L.targetMax[k]);
      return s;
    }

    /** @param {number} dx @param {number} dy */
    function rotate(dx, dy) {
      const s = opts.getState();
      s.yaw += dx * ROTATE_SPEED;
      s.pitch += dy * ROTATE_SPEED;
      opts.setState(clampState(s));
      vYaw = dx * ROTATE_SPEED;
      vPitch = dy * ROTATE_SPEED;
    }

    /** Move o alvo no plano da tela, proporcional à distância. @param {number} dx @param {number} dy */
    function pan(dx, dy) {
      const s = opts.getState();
      const h = el.clientHeight || 1;
      const worldPerPixel = (2 * s.distance * Math.tan(opts.fovY / 2)) / h;
      const cp = Math.cos(s.pitch);
      const forward = M.normalize([-cp * Math.cos(s.yaw), -Math.sin(s.pitch), -cp * Math.sin(s.yaw)]);
      let right = M.cross(forward, [0, 1, 0]);
      right = M.length(right) < 1e-6 ? [Math.sin(s.yaw), 0, -Math.cos(s.yaw)] : M.normalize(right);
      const up = M.cross(right, forward);
      s.target = M.add(s.target, M.add(M.scale(right, -dx * worldPerPixel), M.scale(up, dy * worldPerPixel)));
      opts.setState(clampState(s));
    }

    /** @param {number} factor >1 afasta, <1 aproxima */
    function zoom(factor) {
      const s = opts.getState();
      s.distance *= factor;
      opts.setState(clampState(s));
    }

    const start = () => {
      vYaw = vPitch = vZoom = 0;
      opts.onInteractionStart?.();
    };

    /** @param {PointerEvent} e */
    const onDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2) return;
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      vYaw = vPitch = vZoom = 0;
      opts.onPointerContact?.();
      if (pointers.size === 1) {
        downAt = { x: e.clientX, y: e.clientY };
        dragging = false;
        mode = e.pointerType !== "mouse" ? "rotate" : e.button === 2 || e.shiftKey ? "pan" : "rotate";
      } else if (pointers.size === 2) {
        mode = "touch";
        const [a, b] = [...pointers.values()];
        lastPinch = Math.hypot(a.x - b.x, a.y - b.y);
        lastMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (!dragging) { dragging = true; start(); }
      }
    };

    /** @param {PointerEvent} e */
    const onMove = (e) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, cur);
      if (!dragging) {
        // abaixo de 4 px ainda pode ser um clique de seleção: não gira nem desmarca a vista
        if (pointers.size === 1 && downAt && Math.hypot(cur.x - downAt.x, cur.y - downAt.y) < DRAG_PX) return;
        dragging = true;
        el.classList.add("is-dragging");
        start();
      }
      if (mode === "rotate" && pointers.size === 1) rotate(cur.x - prev.x, cur.y - prev.y);
      else if (mode === "pan" && pointers.size === 1) pan(cur.x - prev.x, cur.y - prev.y);
      else if (mode === "touch" && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (lastPinch > 0 && dist > 0) zoom(lastPinch / dist);
        if (lastMid) pan(mid.x - lastMid.x, mid.y - lastMid.y);
        lastPinch = dist;
        lastMid = mid;
      }
    };

    /** @param {PointerEvent} e */
    const onUp = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        if (mode !== "rotate") vYaw = vPitch = 0;
        mode = "none";
        dragging = false;
        downAt = null;
        el.classList.remove("is-dragging");
      } else if (pointers.size === 1) {
        mode = "rotate";
        vYaw = vPitch = 0;
        lastPinch = 0;
        lastMid = null;
      }
    };

    /** @param {WheelEvent} e */
    const onWheel = (e) => {
      e.preventDefault();
      start();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const f = Math.exp(M.clamp(delta, -120, 120) * 0.0012);
      zoom(f);
      vZoom = Math.log(f) * 0.35;
    };

    const onContext = (/** @type {Event} */ e) => e.preventDefault();

    /** Teclado com o foco no canvas (acessibilidade: navegação sem mouse). @param {KeyboardEvent} e */
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const step = (5 * Math.PI) / 180;
      const panPx = 40;
      /** @type {Record<string, () => void>} */
      const actions = {
        // girar: setas horizontais orbitam, setas verticais sobem/descem a câmera
        // mover (Shift): a aeronave acompanha a direção da seta
        ArrowLeft: () => (e.shiftKey ? pan(-panPx, 0) : rotate(-step / ROTATE_SPEED, 0)),
        ArrowRight: () => (e.shiftKey ? pan(panPx, 0) : rotate(step / ROTATE_SPEED, 0)),
        ArrowUp: () => (e.shiftKey ? pan(0, -panPx) : rotate(0, step / ROTATE_SPEED)),
        ArrowDown: () => (e.shiftKey ? pan(0, panPx) : rotate(0, -step / ROTATE_SPEED)),
        "+": () => zoom(0.85),
        "=": () => zoom(0.85),
        "-": () => zoom(1 / 0.85),
        _: () => zoom(1 / 0.85),
      };
      const act = actions[e.key];
      if (!act) return;
      e.preventDefault();
      start();
      act();
      vYaw = vPitch = vZoom = 0; // teclado sem inércia
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", onContext);
    el.addEventListener("keydown", onKeyDown);

    /** Aplica a inércia; devolve true enquanto ainda houver movimento. */
    function update() {
      if (mode !== "none") return false;
      if (Math.abs(vYaw) < STOP && Math.abs(vPitch) < STOP && Math.abs(vZoom) < STOP) {
        vYaw = vPitch = vZoom = 0;
        return false;
      }
      const s = opts.getState();
      s.yaw += vYaw;
      s.pitch += vPitch;
      s.distance *= Math.exp(vZoom);
      opts.setState(clampState(s));
      vYaw *= DAMPING;
      vPitch *= DAMPING;
      vZoom *= DAMPING;
      return true;
    }

    return {
      update,
      get active() { return mode !== "none"; },
      get dragging() { return dragging; },
      dispose() {
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
        el.removeEventListener("wheel", onWheel);
        el.removeEventListener("contextmenu", onContext);
        el.removeEventListener("keydown", onKeyDown);
        pointers.clear();
      },
    };
  }

  window.CtrlCD3D.controls = Object.freeze({ attachOrbitControls });
})();

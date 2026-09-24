// @ts-check
/* ==========================================================================
   CTRL+CD 3D — ferramenta do marcador da não conformidade (Fase 5).

   - Modo de marcação: clique (sem arrasto > 4 px) sobre uma superfície válida → onPlace.
     A validade (ponto dentro da região confirmada) é decidida pelo visualizador (validate).
   - Dica própria durante o modo: "Clique para marcar" ou "Fora de ‹região›".
   - Arrasto do marcador: pressionar a até 16 px do pino e arrastar reposiciona o ponto sobre a
     superfície (só posições válidas). O evento é capturado no palco antes de chegar aos
     controles de órbita, para o arrasto não girar a câmera.
   - "Marcar no centro da tela": alternativa por teclado (a vista é girada pelas setas).
   Nada aqui guarda objetos gráficos: só números e IDs. Exposto em window.CtrlCD3D.marker.
   ========================================================================== */
(() => {
  "use strict";

  const CU = /** @type {CameraUtilsApi} */ (window.CtrlCD3D.cameraUtils);
  const CLICK_PX = 4;
  const CLICK_MS = 600;
  const GRAB_PX = 16;
  /** mesmo comprimento de haste do renderer (proporcional à distância) */
  const STEM = 0.045;

  /** @param {MarkerToolOptions} o @returns {MarkerTool} */
  function createMarkerTool(o) {
    /** @type {{ x: number, y: number, t: number, id: number } | null} */
    let down = null;
    let dragging = false;
    /** @type {number | null} */
    let dragPointer = null;
    let tooltipVisible = false;
    let moveRaf = 0;
    /** @type {{ x: number, y: number } | null} */
    let pending = null;

    /** @param {string[] | null} lines @param {boolean} ok @param {number} x @param {number} y */
    function showTooltip(lines, ok, x, y) {
      const tip = o.tooltip;
      if (!lines || !lines.length) { hideTooltip(); return; }
      tip.replaceChildren();
      tip.classList.toggle("is-info", !ok);
      lines.forEach((text, i) => {
        const d = document.createElement("div");
        d.className = i === 0 ? "ccd-a3d__tiptitle" : "ccd-a3d__tipmeta";
        d.textContent = text;
        tip.appendChild(d);
      });
      const host = /** @type {HTMLElement} */ (tip.offsetParent || tip.parentElement);
      const hb = host.getBoundingClientRect();
      tip.hidden = false;
      tooltipVisible = true;
      const w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.min(Math.max(8, x - hb.left + 14), hb.width - w - 8) + "px";
      tip.style.top = Math.min(Math.max(8, y - hb.top + 16), hb.height - h - 8) + "px";
    }

    function hideTooltip() {
      if (!tooltipVisible && o.tooltip.hidden) return;
      o.tooltip.hidden = true;
      tooltipVisible = false;
    }

    /** Distância em px do ponteiro ao pino (haste ou disco); Infinity se não houver marcador. @param {number} x @param {number} y */
    function distanceToPin(x, y) {
      const mk = o.getMarker();
      if (!mk) return Infinity;
      const r = o.getCanvas().getBoundingClientRect();
      const aspect = r.width / r.height;
      const cam = o.getCamera();
      const eye = CU.eyePosition(cam);
      const d = Math.hypot(mk.position[0] - eye[0], mk.position[1] - eye[1], mk.position[2] - eye[2]) * STEM;
      /** @type {Vec3} */
      const tip = [mk.position[0] + mk.normal[0] * d, mk.position[1] + mk.normal[1] * d, mk.position[2] + mk.normal[2] * d];
      const toPx = (/** @type {Vec3} */ p) => {
        const q = CU.projectPoint(cam, o.fovY, aspect, p);
        return q.inFront ? { x: r.left + (q.ndcX + 1) / 2 * r.width, y: r.top + (1 - q.ndcY) / 2 * r.height } : null;
      };
      const a = toPx(mk.position), b = toPx(tip);
      if (!a || !b) return Infinity;
      const vx = b.x - a.x, vy = b.y - a.y;
      const len2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / len2));
      return Math.min(Math.hypot(x - (a.x + vx * t), y - (a.y + vy * t)), Math.hypot(x - b.x, y - b.y));
    }

    /** @param {number} x @param {number} y @param {"click" | "drag" | "center"} how @returns {MarkerAttempt} */
    function tryPlace(x, y, how) {
      const p = o.pick(x, y);
      if (!p) return { ok: false, lines: ["Nenhuma superfície neste ponto"] };
      const v = o.validate(p);
      if (v.ok) o.onPlace(p, how);
      return v;
    }

    // ---------- arrasto do marcador (captura no palco, antes da órbita) ----------
    /** @param {PointerEvent} e */
    const onHostDown = (e) => {
      if (!o.canDrag() || (e.pointerType === "mouse" && e.button !== 0)) return;
      if (distanceToPin(e.clientX, e.clientY) > GRAB_PX) return;
      e.stopPropagation();
      e.preventDefault();
      dragging = true;
      dragPointer = e.pointerId;
      o.host.setPointerCapture(e.pointerId);
      o.host.classList.add("is-dragging-marker");
      hideTooltip();
    };
    /** @param {PointerEvent} e */
    const onHostMove = (e) => {
      if (!dragging || e.pointerId !== dragPointer) {
        // cursor de "pegar" sobre o pino
        if (e.pointerType === "mouse" && !e.buttons) o.host.classList.toggle("is-over-marker", o.canDrag() && distanceToPin(e.clientX, e.clientY) <= GRAB_PX);
        return;
      }
      tryPlace(e.clientX, e.clientY, "drag");
    };
    /** @param {PointerEvent} e */
    const onHostUp = (e) => {
      if (!dragging || e.pointerId !== dragPointer) return;
      dragging = false;
      dragPointer = null;
      if (o.host.hasPointerCapture(e.pointerId)) o.host.releasePointerCapture(e.pointerId);
      o.host.classList.remove("is-dragging-marker");
      o.onDragEnd();
    };

    // ---------- modo de marcação: dica e clique ----------
    const hoverFrame = () => {
      moveRaf = 0;
      if (!pending) return;
      const { x, y } = pending;
      pending = null;
      if (!o.isMarking() || o.isNavigating() || dragging) { hideTooltip(); return; }
      const p = o.pick(x, y);
      if (!p) { hideTooltip(); return; }
      const v = o.validate(p);
      o.getCanvas().classList.toggle("is-invalid-mark", !v.ok);
      showTooltip(v.lines, v.ok, x, y);
    };
    /** @param {PointerEvent} e */
    const onMove = (e) => {
      if (e.pointerType !== "mouse" || e.buttons) return;
      pending = { x: e.clientX, y: e.clientY };
      if (!moveRaf) moveRaf = requestAnimationFrame(hoverFrame);
    };
    /** @param {PointerEvent} e */
    const onDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) { down = null; return; }
      down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    };
    /** @param {PointerEvent} e */
    const onUp = (e) => {
      const d = down;
      down = null;
      if (!d || d.id !== e.pointerId || !o.isMarking() || dragging) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) >= CLICK_PX || performance.now() - d.t > CLICK_MS || o.isNavigating()) return;
      const v = tryPlace(e.clientX, e.clientY, "click");
      if (!v.ok && e.pointerType === "mouse") showTooltip(v.lines, false, e.clientX, e.clientY);
      else hideTooltip();
      if (!v.ok) o.onRejected(v);
    };
    const onLeave = () => { pending = null; hideTooltip(); };

    /** @type {HTMLCanvasElement | null} */
    let bound = null;
    let hostBound = false;
    function attach() {
      if (!hostBound) {
        o.host.addEventListener("pointerdown", onHostDown, true);
        o.host.addEventListener("pointermove", onHostMove);
        o.host.addEventListener("pointerup", onHostUp);
        o.host.addEventListener("pointercancel", onHostUp);
        hostBound = true;
      }
      const c = o.getCanvas();
      if (bound === c) return;
      detachCanvas();
      c.addEventListener("pointermove", onMove);
      c.addEventListener("pointerdown", onDown);
      c.addEventListener("pointerup", onUp);
      c.addEventListener("pointerleave", onLeave);
      bound = c;
    }
    function detachCanvas() {
      if (!bound) return;
      bound.removeEventListener("pointermove", onMove);
      bound.removeEventListener("pointerdown", onDown);
      bound.removeEventListener("pointerup", onUp);
      bound.removeEventListener("pointerleave", onLeave);
      bound = null;
    }

    /** Marca no centro do canvas (alternativa por teclado). */
    function placeAtCenter() {
      const r = o.getCanvas().getBoundingClientRect();
      return tryPlace(r.left + r.width / 2, r.top + r.height / 2, "center");
    }

    return {
      attach,
      placeAtCenter,
      hideTooltip,
      get tooltipVisible() { return tooltipVisible; },
      get dragging() { return dragging; },
      dispose() {
        detachCanvas();
        if (hostBound) {
          o.host.removeEventListener("pointerdown", onHostDown, true);
          o.host.removeEventListener("pointermove", onHostMove);
          o.host.removeEventListener("pointerup", onHostUp);
          o.host.removeEventListener("pointercancel", onHostUp);
          hostBound = false;
        }
        cancelAnimationFrame(moveRaf);
        hideTooltip();
      },
    };
  }

  window.CtrlCD3D.marker = Object.freeze({ createMarkerTool });
})();

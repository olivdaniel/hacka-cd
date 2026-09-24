// @ts-check
/* ==========================================================================
   CTRL+CD 3D — seleção por raycast (Fase 3): hover, clique, duplo clique e dica.

   - Hover (mouse): raycast a cada quadro de movimento → região-alvo sob o cursor, dica e
     realce discreto. Não move a câmera e não avança de nível.
   - Clique (sem arrasto > 4 px): seleciona a região-alvo. Clique no vazio não desfaz a seleção.
   - Duplo clique / toque duplo: seleciona e aproxima.
   - A região-alvo respeita a hierarquia: com o foco na aeronave, o alvo é a GRANDE REGIÃO
     (nível 2) que contém a peça atingida (ex.: motor → "Grupo motor esquerdo").
   Nada aqui guarda objetos gráficos no estado: só IDs de região (strings).
   Exposto em window.CtrlCD3D.selection.
   ========================================================================== */
(() => {
  "use strict";

  const RG = /** @type {RegionsApi} */ (window.CtrlCD3D.regions);
  const RC = /** @type {RaycasterApi} */ (window.CtrlCD3D.raycaster);
  const CU = /** @type {CameraUtilsApi} */ (window.CtrlCD3D.cameraUtils);
  const CLICK_PX = 4;
  const CLICK_MS = 600;
  const DOUBLE_MS = 350;

  /** @param {SelectionOptions} o */
  function createSelection(o) {
    /** @type {{ x: number, y: number, t: number, id: number } | null} */
    let down = null;
    /** @type {{ x: number, y: number, t: number } | null} */
    let lastTap = null;
    let moveRaf = 0;
    /** @type {{ x: number, y: number } | null} */
    let pending = null;
    let tooltipVisible = false;

    /** Raycast do ponto da tela → alvo (ou null). @param {number} clientX @param {number} clientY @returns {PickResult | null} */
    function pick(clientX, clientY) {
      const model = o.getModel();
      const canvas = o.getCanvas();
      if (!model || !RC.isBuilt(model)) return null;
      const r = canvas.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return null;
      const ndcX = ((clientX - r.left) / r.width) * 2 - 1;
      const ndcY = 1 - ((clientY - r.top) / r.height) * 2;
      if (Math.abs(ndcX) > 1 || Math.abs(ndcY) > 1) return null;
      const ray = CU.rayFromScreen(o.getCamera(), o.fovY, r.width / r.height, ndcX, ndcY);
      const hit = RC.raycast(model, RC.build(model), ray.origin, ray.dir);
      if (!hit) return null;
      const leafId = RG.leafForNode(hit.nodeName, hit.point[0]);
      if (!leafId) return null;
      const targetId = RG.targetFor(leafId, o.getFocus());
      return {
        leafId, targetId, nodeName: hit.nodeName, primitiveIndex: hit.primitiveIndex, distance: hit.distance,
        point: hit.point, normal: hit.normal,
      };
    }

    /** @param {PickResult | null} p @param {number} x @param {number} y */
    function showTooltip(p, x, y) {
      const tip = o.tooltip;
      if (!p) { hideTooltip(); return; }
      /** @type {string[]} */
      let lines;
      if (p.targetId) {
        const reg = RG.get(p.targetId);
        lines = [reg.label, `Nível ${reg.level} · ${RG.LEVEL_LABELS[reg.level]}`,
          p.targetId === o.getSelected() ? "Selecionado" : "Clique para selecionar · duplo clique para aproximar"];
      } else {
        // fora do foco, ou o próprio foco sem subdivisão com geometria: só informa (Fase 4)
        const info = o.describeNonTarget ? o.describeNonTarget(p) : null;
        if (!info || !info.length) { hideTooltip(); return; }
        lines = info;
      }
      tip.replaceChildren();
      tip.classList.toggle("is-info", !p.targetId);
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

    const hoverFrame = () => {
      moveRaf = 0;
      if (!pending) return;
      const { x, y } = pending;
      pending = null;
      if (!o.enabled() || o.isNavigating()) { o.onHover(null); hideTooltip(); return; }
      const p = pick(x, y);
      o.onHover(p ? p.targetId : null);
      showTooltip(p, x, y);
    };

    /** @param {PointerEvent} e */
    const onMove = (e) => {
      if (e.pointerType !== "mouse") return;          // toque não tem hover
      if (e.buttons) { if (o.isNavigating()) { o.onHover(null); hideTooltip(); } return; }
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
      if (!d || d.id !== e.pointerId || !o.enabled()) return;
      const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
      if (moved >= CLICK_PX || performance.now() - d.t > CLICK_MS || o.isNavigating()) return;
      const p = pick(e.clientX, e.clientY);
      const now = performance.now();
      const isDouble = lastTap && now - lastTap.t < DOUBLE_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 25;
      lastTap = isDouble ? null : { x: e.clientX, y: e.clientY, t: now };
      if (!p) return;
      if (p.targetId) {
        o.onSelect(p.targetId, p);
        if (isDouble) o.onZoomTo(p.targetId);
      }
      if (e.pointerType === "mouse") showTooltip(p, e.clientX, e.clientY);
    };

    const onLeave = () => {
      pending = null;
      o.onHover(null);
      hideTooltip();
    };

    /** @type {HTMLCanvasElement | null} */
    let bound = null;
    function attach() {
      const c = o.getCanvas();
      if (bound === c) return;
      detach();
      c.addEventListener("pointermove", onMove);
      c.addEventListener("pointerdown", onDown);
      c.addEventListener("pointerup", onUp);
      c.addEventListener("pointerleave", onLeave);
      bound = c;
    }
    function detach() {
      if (!bound) return;
      bound.removeEventListener("pointermove", onMove);
      bound.removeEventListener("pointerdown", onDown);
      bound.removeEventListener("pointerup", onUp);
      bound.removeEventListener("pointerleave", onLeave);
      bound = null;
    }

    return {
      attach,
      pick,
      hideTooltip,
      get tooltipVisible() { return tooltipVisible; },
      dispose() {
        detach();
        cancelAnimationFrame(moveRaf);
        hideTooltip();
      },
    };
  }

  window.CtrlCD3D.selection = Object.freeze({ createSelection });
})();

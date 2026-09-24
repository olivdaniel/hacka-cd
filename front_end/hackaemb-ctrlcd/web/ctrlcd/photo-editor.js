/* ==========================================================================
   Ctrl + CD — Editor de fotografias (canvas, 100% local)
   Portado de PhotoEditorModal em NewRecordPage.tsx.
   Ferramentas: recortar, girar 90°, círculo, seta, retângulo, texto,
   desfazer, refazer e voltar ao original. Nada é enviado a servidor.

   Uso:
     CtrlCDPhotoEditor.open({ url, title, onSave(dataUrl) {...} })
   ========================================================================== */
(() => {
  "use strict";

  const { h, icon, append, trapEscape } = window.CtrlCDUI;

  const TOOLS = [
    { id: "crop", glyph: "✂", label: "Recortar" },
    { id: "rotate", glyph: "↻", label: "Girar 90°" },
    { id: "circle", glyph: "○", label: "Círculo" },
    { id: "arrow", glyph: "↗", label: "Seta" },
    { id: "rect", glyph: "▭", label: "Retângulo" },
    { id: "text", glyph: "T", label: "Texto" },
  ];
  const COLORS = [
    { value: "#dc2626", label: "Vermelho" },
    { value: "#d97706", label: "Âmbar" },
    { value: "#0891b2", label: "Ciano" },
    { value: "#1253d9", label: "Azul" },
    { value: "#059669", label: "Verde" },
    { value: "#ffffff", label: "Branco" },
  ];
  const STROKE = 3;

  function drawAnnotation(ctx, a) {
    ctx.strokeStyle = a.color;
    ctx.fillStyle = a.color;
    ctx.lineWidth = a.sw;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (a.type === "rect") {
      ctx.strokeRect(a.x1, a.y1, a.x2 - a.x1, a.y2 - a.y1);
    } else if (a.type === "circle") {
      const cx = (a.x1 + a.x2) / 2;
      const cy = (a.y1 + a.y2) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(Math.abs(a.x2 - a.x1) / 2, 1), Math.max(Math.abs(a.y2 - a.y1) / 2, 1), 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (a.type === "arrow") {
      const dx = a.x2 - a.x1;
      const dy = a.y2 - a.y1;
      const len = Math.hypot(dx, dy);
      if (len < 2) return;
      const ux = dx / len;
      const uy = dy / len;
      const head = Math.max(14, a.sw * 5);
      ctx.beginPath();
      ctx.moveTo(a.x1, a.y1);
      ctx.lineTo(a.x2, a.y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(a.x2, a.y2);
      ctx.lineTo(a.x2 - ux * head + uy * head * 0.45, a.y2 - uy * head - ux * head * 0.45);
      ctx.lineTo(a.x2 - ux * head - uy * head * 0.45, a.y2 - uy * head + ux * head * 0.45);
      ctx.closePath();
      ctx.fill();
    } else if (a.type === "text" && a.text) {
      ctx.font = `bold ${Math.max(18, a.sw * 6)}px Roboto, Arial, sans-serif`;
      ctx.fillText(a.text, a.x1, a.y1);
    }
  }

  function open({ url, title = "Editor de fotografias", onSave, onClose } = {}) {
    if (!url) return;

    const st = { tool: "circle", color: COLORS[0].value, annotations: [], rotation: 0, crop: null, history: [[]], index: 0, drawing: false, start: { x: 0, y: 0 } };
    let image = null;

    const overlay = h("div", { class: "ccd-editor", role: "dialog", "aria-modal": "true", "aria-label": title });
    const toolbar = h("div", { class: "ccd-editor__toolbar" });
    const header = h("div", { class: "ccd-editor__header" });
    const stage = h("div", { class: "ccd-editor__stage" });
    const footer = h("div", { class: "ccd-editor__footer" });
    overlay.append(toolbar, h("div", { class: "ccd-editor__body" }, header, stage, footer));

    const main = h("canvas", { class: "ccd-editor__canvas", "aria-label": "Imagem em edição" });
    const overlayCanvas = h("canvas", { class: "ccd-editor__overlay", "aria-hidden": "true" });
    const wrap = h("div", { class: "ccd-editor__wrap" }, main, overlayCanvas);
    const floating = h("div", { class: "ccd-editor__floating" });
    wrap.appendChild(floating);
    stage.append(h("div", { class: "ccd-editor__loading" }, h("span", { class: "spinner" }), "Carregando imagem…"));

    function dims() {
      if (!image) return { w: 800, h: 600 };
      return st.rotation % 180 === 0 ? { w: image.naturalWidth, h: image.naturalHeight } : { w: image.naturalHeight, h: image.naturalWidth };
    }

    function redraw() {
      const ctx = main.getContext("2d");
      if (!ctx || !image) return;
      const { w, h: hh } = dims();
      main.width = w;
      main.height = hh;
      overlayCanvas.width = w;
      overlayCanvas.height = hh;
      ctx.save();
      if (st.rotation === 90) { ctx.translate(w, 0); ctx.rotate(Math.PI / 2); }
      else if (st.rotation === 180) { ctx.translate(w, hh); ctx.rotate(Math.PI); }
      else if (st.rotation === 270) { ctx.translate(0, hh); ctx.rotate(-Math.PI / 2); }
      ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);
      ctx.restore();
      st.annotations.forEach((a) => drawAnnotation(ctx, a));
    }

    function pos(event) {
      const r = main.getBoundingClientRect();
      return { x: (event.clientX - r.left) * (main.width / r.width), y: (event.clientY - r.top) * (main.height / r.height) };
    }

    function commit(a) {
      st.annotations = [...st.annotations, a];
      st.history = st.history.slice(0, st.index + 1);
      st.history.push(st.annotations);
      st.index = st.history.length - 1;
      redraw();
    }

    function undo() {
      if (st.index <= 0) return;
      st.index -= 1;
      st.annotations = st.history[st.index];
      redraw();
    }

    function redo() {
      if (st.index >= st.history.length - 1) return;
      st.index += 1;
      st.annotations = st.history[st.index];
      redraw();
    }

    function reset() {
      st.annotations = [];
      st.rotation = 0;
      st.history = [[]];
      st.index = 0;
      st.crop = null;
      floating.replaceChildren();
      loadImage(url);
    }

    function percent(value, total) {
      return `${(value / total) * 100}%`;
    }

    function showCropButton() {
      const { w, h: hh } = dims();
      floating.replaceChildren(
        h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--sm", style: { position: "absolute", left: percent(st.crop.x, w), top: `calc(${percent(st.crop.y + st.crop.h, hh)} + 4px)` }, onclick: applyCrop }, "Cortar seleção")
      );
    }

    function applyCrop() {
      if (!st.crop) return;
      const ctx = main.getContext("2d");
      const data = ctx.getImageData(st.crop.x, st.crop.y, st.crop.w, st.crop.h);
      main.width = st.crop.w;
      main.height = st.crop.h;
      ctx.putImageData(data, 0, 0);
      const cropped = new Image();
      cropped.onload = () => {
        image = cropped;
        st.rotation = 0;
        st.annotations = [];
        st.history = [[]];
        st.index = 0;
        redraw();
      };
      cropped.src = main.toDataURL();
      st.crop = null;
      floating.replaceChildren();
    }

    function showTextInput(p) {
      const { w, h: hh } = dims();
      const input = h("input", { type: "text", class: "ccd-editor__textinput", placeholder: "Digite o texto…", "aria-label": "Texto da anotação", style: { color: st.color, borderColor: st.color } });
      const confirm = () => {
        const value = input.value.trim();
        floating.replaceChildren();
        if (value) commit({ type: "text", x1: p.x, y1: p.y, x2: p.x, y2: p.y, color: st.color, sw: STROKE, text: value });
      };
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") confirm();
        if (event.key === "Escape") { event.stopPropagation(); floating.replaceChildren(); }
      });
      floating.replaceChildren(
        h(
          "div",
          { class: "ccd-editor__textbox", style: { left: percent(p.x, w), top: percent(p.y, hh) } },
          input,
          h("button", { type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--sm", onclick: confirm }, "OK"),
          h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", "aria-label": "Cancelar texto", onclick: () => floating.replaceChildren() }, "✕")
        )
      );
      input.focus();
    }

    main.addEventListener("mousedown", (event) => {
      const p = pos(event);
      if (st.tool === "text") { showTextInput(p); return; }
      st.drawing = true;
      st.start = p;
    });
    main.addEventListener("mousemove", (event) => {
      if (!st.drawing) return;
      const p = pos(event);
      const ctx = overlayCanvas.getContext("2d");
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      if (st.tool === "crop") {
        ctx.strokeStyle = "rgba(18,83,217,0.9)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(st.start.x, st.start.y, p.x - st.start.x, p.y - st.start.y);
        ctx.fillStyle = "rgba(18,83,217,0.08)";
        ctx.fillRect(st.start.x, st.start.y, p.x - st.start.x, p.y - st.start.y);
        ctx.setLineDash([]);
      } else {
        drawAnnotation(ctx, { type: st.tool, x1: st.start.x, y1: st.start.y, x2: p.x, y2: p.y, color: st.color, sw: STROKE });
      }
    });
    main.addEventListener("mouseup", (event) => {
      if (!st.drawing) return;
      st.drawing = false;
      const p = pos(event);
      overlayCanvas.getContext("2d").clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      if (st.tool === "crop") {
        const box = { x: Math.min(st.start.x, p.x), y: Math.min(st.start.y, p.y), w: Math.abs(p.x - st.start.x), h: Math.abs(p.y - st.start.y) };
        if (box.w > 5 && box.h > 5) {
          st.crop = box;
          showCropButton();
        }
        return;
      }
      commit({ type: st.tool, x1: st.start.x, y1: st.start.y, x2: p.x, y2: p.y, color: st.color, sw: STROKE });
    });
    main.addEventListener("mouseleave", () => { st.drawing = false; });

    function paintChrome() {
      const activeTool = TOOLS.find((t) => t.id === st.tool);
      toolbar.replaceChildren();
      append(toolbar, [
        h("p", { class: "ccd-editor__group" }, "Ferramentas"),
        TOOLS.map((t) =>
          h(
            "button",
            {
              type: "button",
              class: `ccd-editor__tool${st.tool === t.id ? " is-active" : ""}`,
              title: t.label,
              "aria-label": t.label,
              "aria-pressed": String(st.tool === t.id),
              onclick: () => {
                if (t.id === "rotate") {
                  st.rotation = (st.rotation + 90) % 360;
                  redraw();
                } else {
                  st.tool = t.id;
                }
                paintChrome();
              },
            },
            h("span", { class: "ccd-editor__glyph", "aria-hidden": "true" }, t.glyph),
            h("span", { class: "ccd-editor__toolname" }, t.label.split(" ")[0])
          )
        ),
        h("p", { class: "ccd-editor__group" }, "Cor"),
        COLORS.map((c) =>
          h(
            "button",
            { type: "button", class: `ccd-editor__color${st.color === c.value ? " is-active" : ""}`, "aria-label": `Cor ${c.label}`, "aria-pressed": String(st.color === c.value), onclick: () => { st.color = c.value; paintChrome(); } },
            h("span", { style: { background: c.value } })
          )
        ),
      ]);
      header.replaceChildren(
        h("strong", null, title),
        h(
          "div",
          { class: "ccd-editor__history" },
          h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", onclick: undo }, "↩ Desfazer"),
          h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", onclick: redo }, "↪ Refazer"),
          h("button", { type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", onclick: reset }, "⟲ Original")
        )
      );
      footer.replaceChildren(
        h("div", { class: "ccd-editor__active" }, h("span", { class: "ccd-editor__swatch", style: { background: st.color } }), `Ferramenta ativa: ${activeTool.label}`),
        h(
          "div",
          { class: "ccd-editor__actions" },
          h("button", { type: "button", class: "ccd-btn ccd-btn--ghost", onclick: close }, "Descartar alterações"),
          h(
            "button",
            {
              type: "button",
              class: "ccd-btn ccd-btn--primary",
              onclick: () => {
                const data = image ? main.toDataURL("image/jpeg", 0.92) : null;
                close();
                if (data) onSave?.(data);
              },
            },
            icon("save", 14),
            "Salvar edição"
          )
        )
      );
      main.style.cursor = st.tool === "text" ? "text" : "crosshair";
    }

    function loadImage(src) {
      const img = new Image();
      img.onload = () => {
        image = img;
        stage.replaceChildren(wrap);
        redraw();
      };
      img.onerror = () => {
        stage.replaceChildren(h("p", { class: "ccd-editor__loading" }, "Não foi possível carregar a imagem."));
      };
      img.src = src;
    }

    const releaseEscape = trapEscape(close);
    function close() {
      releaseEscape();
      overlay.remove();
      onClose?.();
    }

    document.body.appendChild(overlay);
    paintChrome();
    loadImage(url);
    toolbar.querySelector(".ccd-editor__tool")?.focus();
  }

  window.CtrlCDPhotoEditor = Object.freeze({ open });
})();

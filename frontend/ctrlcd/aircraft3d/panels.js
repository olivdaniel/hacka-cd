// @ts-check
/* ==========================================================================
   CTRL+CD 3D — painéis da hierarquia e da seleção (Fases 3 e 4).

   Esquerda — "Hierarquia": breadcrumb navegável (volta a qualquer nível confirmado), Voltar um
   nível e a lista textual das regiões logo abaixo do foco, sincronizada com o 3D (hover e
   seleção nos dois sentidos). Botões nativos: Enter e Espaço selecionam; setas ↑ ↓ percorrem.
   Direita — "Seleção": resumo da região candidata (região, ID, nível, lado, caminho, geometria no
   modelo), Aproximar, Limpar seleção, Confirmar região; e "Localização": caminho confirmado,
   Finalizar como localização parcial e o resultado ("Localização confirmada pelo usuário.").
   Recebe e devolve só IDs e dados serializáveis. Exposto em window.CtrlCD3D.panels.
   ========================================================================== */
(() => {
  "use strict";

  const RG = /** @type {RegionsApi} */ (window.CtrlCD3D.regions);
  const SIDE_LABEL = { left: "Esquerdo", right: "Direito", center: "Central" };
  const CONFIRM_TEXT = "Localização confirmada pelo usuário.";
  const PENDING_TEXT = "Ponto marcado, aguardando confirmação.";
  /** @type {Record<AircraftView, string>} */
  const VIEW_LABEL = {
    perspective: "Perspectiva", isometric: "Isométrica", top: "Superior", bottom: "Inferior",
    front: "Frontal", rear: "Traseira", left: "Lateral esquerda", right: "Lateral direita",
  };
  const fmt = (/** @type {number} */ v) => v.toFixed(2).replace(".", ",").replace(/^-0,00$/, "0,00");
  const fmtVec = (/** @type {Vec3} */ v) => v.map(fmt).join("; ");

  /** @param {PanelsHandlers} handlers @returns {SelectionPanels} */
  function createPanels(handlers) {
    const { h } = window.CtrlCDUI;
    let enabled = false;
    /** @type {HierarchyViewState | null} */
    let last = null;

    // ---------- esquerda: breadcrumb, voltar e lista ----------
    const crumbs = h("ol", { class: "ccd-a3d__crumbs" });
    const crumbNav = h("nav", { class: "ccd-a3d__crumbnav", "aria-label": "Caminho na hierarquia", "data-a3d": "breadcrumb" }, crumbs);
    const backBtn = /** @type {HTMLButtonElement} */ (h("button", {
      type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm ccd-a3d__back", "data-a3d": "back-level", disabled: true,
      onclick: () => handlers.onBack(),
    }, "← Voltar um nível"));
    const listTitle = h("h3", { class: "ccd-a3d__sidetitle", id: "ccdA3dListTitle" }, "Regiões");
    const listHint = h("p", { class: "ccd-a3d__sidehint", "data-a3d": "list-hint" });
    const list = h("ul", { class: "ccd-a3d__regionlist", "aria-labelledby": "ccdA3dListTitle", "data-a3d": "region-list" });
    const listEmpty = h("p", { class: "ccd-a3d__sideempty", "data-a3d": "list-empty", hidden: true });
    const left = h("aside", { class: "ccd-a3d__side ccd-a3d__side--list", "aria-label": "Hierarquia de localização" },
      h("h3", { class: "ccd-a3d__sidetitle" }, "Hierarquia"), crumbNav, backBtn, listTitle, listHint, list, listEmpty);

    /** @type {string} */
    let renderedFocus = "";
    let renderedCrumbs = "";
    /** @type {HTMLButtonElement[]} */
    let buttons = [];

    /** @param {HierarchyViewState} s */
    function renderList(s) {
      renderedFocus = s.focusId;
      const focus = RG.get(s.focusId);
      const kids = RG.childrenOf(s.focusId).filter((r) => r.selectable);
      const nextLevel = /** @type {RegionLevel} */ (Math.min(6, focus.level + 1));
      listTitle.textContent = kids.length ? `Nível ${nextLevel} · ${RG.LEVEL_LABELS[nextLevel]}` : `Nível ${focus.level} · ${RG.LEVEL_LABELS[focus.level]}`;
      listHint.textContent = kids.length
        ? `Em ${focus.label}. Passe o mouse ou o foco para destacar no modelo; clique, Enter ou Espaço para selecionar.`
        : "";
      listHint.hidden = !kids.length;
      listEmpty.hidden = kids.length > 0;
      listEmpty.textContent = kids.length ? "" : `${focus.label} não tem subdivisões nesta hierarquia demonstrativa. Finalize a localização ou volte um nível. A área exata (nível 6) será marcada com o marcador, na Fase 5.`;
      buttons = [];
      list.replaceChildren(...kids.map((r) => {
        const geo = handlers.geometryOf(r.id);
        const btn = /** @type {HTMLButtonElement} */ (h("button", {
          type: "button", class: "ccd-a3d__region", "data-region-id": r.id, "aria-pressed": "false",
        }, h("span", { class: "ccd-a3d__regionname" }, r.label),
        h("span", { class: "ccd-a3d__regionmeta" }, geo && !geo.own ? "sem geometria própria" : `Nível ${r.level}`)));
        btn.addEventListener("click", () => handlers.onSelect(r.id));
        btn.addEventListener("mouseenter", () => handlers.onHover(r.id));
        btn.addEventListener("mouseleave", () => handlers.onHover(null));
        btn.addEventListener("focus", () => handlers.onHover(r.id));
        btn.addEventListener("blur", () => handlers.onHover(null));
        buttons.push(btn);
        return h("li", null, btn);
      }));
    }

    /** @param {HierarchyViewState} s */
    function renderCrumbs(s) {
      crumbs.replaceChildren(...s.confirmedPath.map((id, i) => {
        const r = RG.get(id);
        const isLast = i === s.confirmedPath.length - 1;
        const label = i === 0 ? "Aeronave" : r.label;
        return h("li", { class: "ccd-a3d__crumb" }, isLast
          ? h("span", { class: "ccd-a3d__crumbcur", "aria-current": "step", "data-crumb": String(i) }, label)
          : h("button", {
            type: "button", class: "ccd-a3d__crumbbtn", "data-crumb": String(i),
            title: `Voltar para ${label}`, onclick: () => handlers.onCrumb(i), disabled: !enabled || s.location !== null,
          }, label));
      }));
    }

    list.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const i = buttons.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement));
      if (i < 0) return;
      e.preventDefault();
      const n = buttons.length;
      buttons[(i + (e.key === "ArrowDown" ? 1 : n - 1)) % n].focus();
    });

    // ---------- direita: seleção candidata ----------
    const dl = h("dl", { class: "ccd-a3d__summary", "data-a3d": "summary" });
    const empty = h("p", { class: "ccd-a3d__sideempty", "data-a3d": "summary-empty" }, "Nenhuma região selecionada. Clique no modelo ou escolha na lista.");
    const noGeoNote = h("p", { class: "ccd-a3d__note", "data-a3d": "no-geometry", hidden: true });
    const zoomBtn = /** @type {HTMLButtonElement} */ (h("button", {
      type: "button", class: "ccd-btn ccd-btn--soft ccd-btn--sm", "data-a3d": "zoom-selection", disabled: true,
      onclick: () => handlers.onZoom(),
    }, "Aproximar"));
    const clearBtn = /** @type {HTMLButtonElement} */ (h("button", {
      type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", "data-a3d": "clear-selection", disabled: true,
      onclick: () => handlers.onClear(),
    }, "Limpar seleção"));
    const confirmBtn = /** @type {HTMLButtonElement} */ (h("button", {
      type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--sm", "data-a3d": "confirm-region", disabled: true,
      onclick: () => handlers.onConfirm(),
    }, "Confirmar região"));

    // ---------- direita: localização ----------
    const progress = h("p", { class: "ccd-a3d__progress", "data-a3d": "location-progress" });
    const finalizeBtn = /** @type {HTMLButtonElement} */ (h("button", {
      type: "button", class: "ccd-btn ccd-btn--soft ccd-btn--sm", "data-a3d": "finalize-partial", disabled: true,
      onclick: () => handlers.onFinalize(),
    }, "Finalizar como localização parcial"));
    const finalizeHint = h("p", { class: "ccd-a3d__sidehint", "data-a3d": "finalize-hint" });
    const result = h("div", { class: "ccd-a3d__result", "data-a3d": "location-result", hidden: true });
    const snapImg = /** @type {HTMLImageElement} */ (h("img", { class: "ccd-a3d__snapimg", "data-a3d": "snapshot", alt: "" }));
    const snapCap = h("figcaption", { class: "ccd-a3d__sidehint" }, "Captura que vai para o registro, o compilado e o anexo.");
    const snapFig = h("figure", { class: "ccd-a3d__snap", hidden: true }, snapImg, snapCap);
    const useBtn = /** @type {HTMLButtonElement} */ (h("button", {
      type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--sm", "data-a3d": "use-location",
      onclick: () => handlers.onUseLocation(),
    }, "Usar esta localização no registro"));
    const editBtn = /** @type {HTMLButtonElement} */ (h("button", {
      type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", "data-a3d": "edit-location",
      onclick: () => handlers.onEdit(),
    }, "Editar localização"));

    // ---------- direita: ponto da não conformidade (Fase 5) ----------
    const markBtn = /** @type {HTMLButtonElement} */ (h("button", {
      type: "button", class: "ccd-btn ccd-btn--soft ccd-btn--sm", "data-a3d": "mark-mode", "aria-pressed": "false", disabled: true,
      onclick: () => handlers.onMarkMode(),
    }, "Marcar ponto da não conformidade"));
    const centerBtn = /** @type {HTMLButtonElement} */ (h("button", {
      type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", "data-a3d": "mark-center", hidden: true,
      title: "Marca o ponto sob a mira no centro da tela; gire a vista com as setas",
      onclick: () => handlers.onMarkCenter(),
    }, "Marcar no centro da tela"));
    const removeBtn = /** @type {HTMLButtonElement} */ (h("button", {
      type: "button", class: "ccd-btn ccd-btn--ghost ccd-btn--sm", "data-a3d": "remove-marker", hidden: true,
      onclick: () => handlers.onRemoveMarker(),
    }, "Remover"));
    const confirmPointBtn = /** @type {HTMLButtonElement} */ (h("button", {
      type: "button", class: "ccd-btn ccd-btn--primary ccd-btn--sm", "data-a3d": "confirm-point", hidden: true,
      onclick: () => handlers.onConfirmPoint(),
    }, "Confirmar ponto"));
    const pointHint = h("p", { class: "ccd-a3d__sidehint", "data-a3d": "mark-hint" });
    const pointStatus = h("p", { class: "ccd-a3d__pointstatus", "data-a3d": "marker-status", hidden: true });
    const pointDl = h("dl", { class: "ccd-a3d__summary", "data-a3d": "marker-summary", hidden: true });
    const pointBox = h("section", { class: "ccd-a3d__box", "aria-labelledby": "ccdA3dPointTitle", "data-a3d": "point-box" },
      h("h3", { class: "ccd-a3d__sidetitle", id: "ccdA3dPointTitle" }, "Ponto da não conformidade"),
      pointStatus, pointDl, pointHint,
      h("div", { class: "ccd-a3d__sideactions" }, markBtn, centerBtn, removeBtn, confirmPointBtn));

    /** @param {HierarchyViewState} s */
    function renderPoint(s) {
      const mk = s.marker;
      const done = s.location !== null;
      markBtn.textContent = mk ? "Reposicionar" : "Marcar ponto da não conformidade";
      markBtn.setAttribute("aria-pressed", String(s.markMode));
      markBtn.disabled = !s.canMark || Boolean(mk && mk.confirmed);
      centerBtn.hidden = !s.markMode;
      removeBtn.hidden = !mk;
      removeBtn.disabled = done;
      confirmPointBtn.hidden = !mk;
      confirmPointBtn.disabled = !mk || mk.confirmed || done || s.markMode;
      pointStatus.hidden = !mk;
      pointStatus.classList.toggle("is-confirmed", Boolean(mk && mk.confirmed));
      pointStatus.textContent = mk ? (mk.confirmed ? CONFIRM_TEXT : PENDING_TEXT) : "";
      pointDl.hidden = !mk;
      if (mk) {
        const row = (/** @type {string} */ k, /** @type {string} */ v, /** @type {string} */ key) =>
          [h("dt", null, k), h("dd", { "data-field": key }, v)];
        pointDl.replaceChildren(
          ...row("Região", RG.get(mk.regionId).label, "region"),
          ...row("Superfície", mk.meshName, "mesh"),
          ...row("Posição (m)", fmtVec(mk.worldPosition), "world"),
          ...row("Normal", fmtVec(mk.surfaceNormal), "normal"),
          ...row("Vista", VIEW_LABEL[mk.referenceView], "view"));
      }
      const focus = RG.get(s.focusId);
      pointHint.textContent = !s.canMark && !done
        ? "Confirme ao menos a grande região (nível 2) para marcar o ponto."
        : s.markMode
          ? `Clique sobre ${focus.label} para ${mk ? "mover" : "marcar"} o ponto. Arrastar gira a vista. Esc sai do modo.`
          : mk && !mk.confirmed
            ? "Arraste o pino para ajustar, ou use Reposicionar. Confirme o ponto para concluir a localização."
            : done ? "" : "Opcional: indique o ponto exato sobre a superfície da região confirmada.";
      pointHint.hidden = !pointHint.textContent;
    }

    const live = h("p", { class: "ccd-a3d__sr", "aria-live": "polite", "data-a3d": "selection-live" });
    const selectionBox = h("section", { class: "ccd-a3d__box", "aria-labelledby": "ccdA3dSelTitle", "data-a3d": "selection-box" },
      h("h3", { class: "ccd-a3d__sidetitle", id: "ccdA3dSelTitle" }, "Seleção"),
      empty, dl, noGeoNote,
      h("div", { class: "ccd-a3d__sideactions" }, zoomBtn, clearBtn, confirmBtn));
    const locationBox = h("section", { class: "ccd-a3d__box", "aria-labelledby": "ccdA3dLocTitle", "data-a3d": "location-box" },
      h("h3", { class: "ccd-a3d__sidetitle", id: "ccdA3dLocTitle" }, "Localização"),
      progress, finalizeBtn, finalizeHint, result);
    const right = h("aside", { class: "ccd-a3d__side ccd-a3d__side--summary", "aria-label": "Seleção e localização" },
      selectionBox, pointBox, locationBox, live);

    /** @type {string | null} */
    let renderedSel = null;

    /** @param {string | null} id */
    function renderSummary(id) {
      renderedSel = id;
      empty.hidden = Boolean(id);
      dl.hidden = !id;
      noGeoNote.hidden = true;
      if (!id) {
        dl.replaceChildren();
        return;
      }
      const r = RG.get(id);
      const geo = handlers.geometryOf(id);
      const row = (/** @type {string} */ k, /** @type {string} */ v, /** @type {string} */ key) =>
        [h("dt", null, k), h("dd", { "data-field": key }, v)];
      dl.replaceChildren(
        ...row("Região", r.label, "label"),
        ...row("ID", r.id, "id"),
        ...row("Nível", `${r.level} · ${RG.LEVEL_LABELS[r.level]}`, "level"),
        ...row("Lado", SIDE_LABEL[r.side], "side"),
        ...row("Caminho", RG.pathOf(id).map((p) => RG.get(p).label).join(" › "), "path"),
        ...row("No modelo 3D", !geo ? "sem geometria" : geo.own ? "geometria própria" : `realce em ${RG.get(geo.regionId).label}`, "geometry"));
      if (geo && !geo.own) {
        noGeoNote.hidden = false;
        noGeoNote.textContent = `Subdivisão demonstrativa sem geometria própria no modelo: o destaque cobre ${RG.get(geo.regionId).label} inteira(o). A posição exata será indicada pelo marcador (Fase 5).`;
      }
    }

    /** @param {HierarchyViewState} s */
    function renderLocation(s) {
      const depth = s.confirmedPath.length - 1;
      const done = s.location !== null;
      if (!done) {
        progress.textContent = depth
          ? `Confirmado até o nível ${RG.get(s.confirmedPath[depth]).level}: ${s.confirmedPath.slice(1).map((id) => RG.get(id).label).join(" › ")}`
          : "Nenhuma região confirmada ainda.";
        finalizeHint.textContent = !depth
          ? "Confirme ao menos a grande região (nível 2) para finalizar."
          : s.marker
            ? "Há um ponto marcado: confirme o ponto ou remova-o para finalizar sem ele."
            : "Encerra a localização neste nível, sem marcar o ponto.";
      }
      progress.hidden = done;
      finalizeBtn.hidden = done;
      finalizeHint.hidden = done;
      result.hidden = !done;
      if (done && s.location) {
        const loc = s.location;
        snapFig.hidden = !s.snapshot;
        if (s.snapshot && snapImg.src !== s.snapshot) snapImg.src = s.snapshot;
        snapImg.alt = `Captura do modelo 3D: ${RG.labelOf(loc)}${loc.defectPosition ? ", com o ponto marcado" : ""}.`;
        useBtn.disabled = !enabled;
        const lastId = loc.locationIds[loc.locationIds.length - 1];
        const lvl = RG.get(lastId).level;
        result.replaceChildren(
          h("p", { class: "ccd-a3d__resulttitle", "data-a3d": "confirm-text" }, CONFIRM_TEXT),
          h("p", { class: `ccd-a3d__badge${loc.partial ? "" : " is-point"}`, "data-a3d": "partial-badge" }, loc.partial
            ? `Parcial · até o nível ${lvl} (${RG.LEVEL_LABELS[lvl]})`
            : `Com ponto marcado · nível ${lvl} (${RG.LEVEL_LABELS[lvl]}) + ponto (nível 6)`),
          h("p", { class: "ccd-a3d__resultlabel", "data-a3d": "location-label" }, RG.labelOf(loc)),
          snapFig,
          useBtn,
          editBtn);
      }
    }

    /** @param {HierarchyViewState} s */
    function update(s) {
      last = s;
      if (s.focusId !== renderedFocus) renderList(s);
      // re-renderiza o breadcrumb só quando muda (senão um hover no meio do clique troca o botão)
      const crumbKey = `${s.confirmedPath.join("/")}|${enabled}|${s.location !== null}`;
      if (crumbKey !== renderedCrumbs) { renderedCrumbs = crumbKey; renderCrumbs(s); }
      const locked = !enabled || s.location !== null;
      for (const b of buttons) {
        const id = b.dataset.regionId;
        b.setAttribute("aria-pressed", String(id === s.selectedId));
        b.classList.toggle("is-hover", id === s.hoverId);
        b.disabled = locked;
      }
      if (s.selectedId !== renderedSel) renderSummary(s.selectedId);
      zoomBtn.disabled = locked || !s.selectedId;
      clearBtn.disabled = locked || !s.selectedId;
      confirmBtn.disabled = locked || !s.selectedId;
      backBtn.disabled = locked || s.confirmedPath.length < 2;
      finalizeBtn.disabled = locked || s.confirmedPath.length < 2 || s.marker !== null;
      renderPoint(s);
      renderLocation(s);
    }

    /** @param {string} text */
    const announce = (text) => { live.textContent = text; };

    /** @param {boolean} on */
    function setEnabled(on) {
      enabled = on;
      if (last) update(last);
    }

    renderSummary(null);
    return { left, right, update, setEnabled, announce };
  }

  window.CtrlCD3D.panels = Object.freeze({ createPanels, CONFIRM_TEXT, PENDING_TEXT });
})();

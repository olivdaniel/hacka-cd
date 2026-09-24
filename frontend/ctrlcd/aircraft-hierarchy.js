// @ts-check
/* ==========================================================================
   CTRL+CD — hierarquia de localização na aeronave (fonte única do 2D e do 3D).

   87 regiões em 5 níveis estáticos, com os mesmos IDs e rótulos da fonte única do protótipo 2D
   (aircraft-artifact/tools/regions_spec.py). Níveis: 1 aeronave · 2 grande região · 3 seção ·
   4 sistema ou estrutura · 5 componente · 6 área da não conformidade (nunca estática: é marcada
   pelo usuário no modelo).

   As subdivisões são DEMONSTRATIVAS: não correspondem a limites reais de painéis ou
   componentes da aeronave.

   Usada por ctrlcd/aircraft.js (localizador 2D) e por aircraft3d/regions.js (visualizador 3D),
   para que os dois produzam o mesmo texto de localização.
   Exposto em window.CtrlCDAircraftHierarchy.
   ========================================================================== */
(() => {
  "use strict";

  /** @type {AircraftRegion3D[]} */
  const REGIONS = [
    { id: "aircraft", label: "E195-E2 demonstrativo", level: 1, side: "center", category: "aircraft", selectable: false },
    { id: "fuselage", label: "Fuselagem", level: 2, parentId: "aircraft", side: "center", category: "fuselage", selectable: true },
    { id: "nose", label: "Nariz / radome", level: 3, parentId: "fuselage", side: "center", category: "fuselage", selectable: true },
    { id: "cockpit", label: "Cabine de comando", level: 3, parentId: "fuselage", side: "center", category: "fuselage", selectable: true },
    { id: "fuselage_forward", label: "Fuselagem dianteira", level: 3, parentId: "fuselage", side: "center", category: "fuselage", selectable: true },
    { id: "fuselage_forward_doors", label: "Portas dianteiras", level: 4, parentId: "fuselage_forward", side: "center", category: "door", selectable: true },
    { id: "door_forward_left", label: "Porta dianteira esquerda", level: 5, parentId: "fuselage_forward_doors", side: "left", category: "door", selectable: true },
    { id: "door_forward_right", label: "Porta dianteira direita", level: 5, parentId: "fuselage_forward_doors", side: "right", category: "door", selectable: true },
    { id: "fuselage_center", label: "Fuselagem central", level: 3, parentId: "fuselage", side: "center", category: "fuselage", selectable: true },
    { id: "fuselage_center_exits", label: "Saídas sobre a asa", level: 4, parentId: "fuselage_center", side: "center", category: "door", selectable: true },
    { id: "exit_overwing_left_1", label: "Saída sobre a asa esquerda 1", level: 5, parentId: "fuselage_center_exits", side: "left", category: "door", selectable: true },
    { id: "exit_overwing_left_2", label: "Saída sobre a asa esquerda 2", level: 5, parentId: "fuselage_center_exits", side: "left", category: "door", selectable: true },
    { id: "exit_overwing_right_1", label: "Saída sobre a asa direita 1", level: 5, parentId: "fuselage_center_exits", side: "right", category: "door", selectable: true },
    { id: "exit_overwing_right_2", label: "Saída sobre a asa direita 2", level: 5, parentId: "fuselage_center_exits", side: "right", category: "door", selectable: true },
    { id: "fuselage_rear", label: "Fuselagem traseira", level: 3, parentId: "fuselage", side: "center", category: "fuselage", selectable: true },
    { id: "fuselage_rear_doors", label: "Portas traseiras", level: 4, parentId: "fuselage_rear", side: "center", category: "door", selectable: true },
    { id: "door_aft_left", label: "Porta traseira esquerda", level: 5, parentId: "fuselage_rear_doors", side: "left", category: "door", selectable: true },
    { id: "door_aft_right", label: "Porta traseira direita", level: 5, parentId: "fuselage_rear_doors", side: "right", category: "door", selectable: true },
    { id: "tail_cone", label: "Cone de cauda", level: 3, parentId: "fuselage", side: "center", category: "fuselage", selectable: true },
    { id: "wing_left", label: "Asa esquerda", level: 2, parentId: "aircraft", side: "left", category: "wing", selectable: true },
    { id: "wing_left_leading_edge", label: "Bordo de ataque", level: 3, parentId: "wing_left", side: "left", category: "wing", selectable: true },
    { id: "wing_left_le_structure", label: "Estrutura externa", level: 4, parentId: "wing_left_leading_edge", side: "left", category: "structure", selectable: true },
    { id: "wing_left_le_inboard_panel", label: "Painel interno do bordo de ataque", level: 5, parentId: "wing_left_le_structure", side: "left", category: "structure", selectable: true },
    { id: "wing_left_le_devices", label: "Dispositivos hipersustentadores", level: 4, parentId: "wing_left_leading_edge", side: "left", category: "control_surface", selectable: true },
    { id: "slat_left", label: "Slats – asa esquerda", level: 5, parentId: "wing_left_le_devices", side: "left", category: "control_surface", selectable: true },
    { id: "wing_left_upper_surface", label: "Extradorso (caixa da asa)", level: 3, parentId: "wing_left", side: "left", category: "wing", selectable: true },
    { id: "wing_left_upper_structure", label: "Estrutura externa", level: 4, parentId: "wing_left_upper_surface", side: "left", category: "structure", selectable: true },
    { id: "wing_left_upper_panel_inboard", label: "Painel superior interno", level: 5, parentId: "wing_left_upper_structure", side: "left", category: "structure", selectable: true },
    { id: "wing_left_upper_panel_outboard", label: "Painel superior externo", level: 5, parentId: "wing_left_upper_structure", side: "left", category: "structure", selectable: true },
    { id: "wing_left_upper_controls", label: "Superfícies de comando", level: 4, parentId: "wing_left_upper_surface", side: "left", category: "control_surface", selectable: true },
    { id: "spoiler_left", label: "Spoilers – asa esquerda", level: 5, parentId: "wing_left_upper_controls", side: "left", category: "control_surface", selectable: true },
    { id: "wing_left_trailing_edge", label: "Bordo de fuga", level: 3, parentId: "wing_left", side: "left", category: "wing", selectable: true },
    { id: "wing_left_te_devices", label: "Superfícies de comando e hipersustentadores", level: 4, parentId: "wing_left_trailing_edge", side: "left", category: "control_surface", selectable: true },
    { id: "flap_left", label: "Flaps – asa esquerda", level: 5, parentId: "wing_left_te_devices", side: "left", category: "control_surface", selectable: true },
    { id: "aileron_left", label: "Aileron esquerdo", level: 5, parentId: "wing_left_te_devices", side: "left", category: "control_surface", selectable: true },
    { id: "wing_left_tip", label: "Ponta de asa enflechada", level: 3, parentId: "wing_left", side: "left", category: "wing", selectable: true },
    { id: "wing_right", label: "Asa direita", level: 2, parentId: "aircraft", side: "right", category: "wing", selectable: true },
    { id: "wing_right_leading_edge", label: "Bordo de ataque", level: 3, parentId: "wing_right", side: "right", category: "wing", selectable: true },
    { id: "wing_right_le_structure", label: "Estrutura externa", level: 4, parentId: "wing_right_leading_edge", side: "right", category: "structure", selectable: true },
    { id: "wing_right_le_inboard_panel", label: "Painel interno do bordo de ataque", level: 5, parentId: "wing_right_le_structure", side: "right", category: "structure", selectable: true },
    { id: "wing_right_le_devices", label: "Dispositivos hipersustentadores", level: 4, parentId: "wing_right_leading_edge", side: "right", category: "control_surface", selectable: true },
    { id: "slat_right", label: "Slats – asa direita", level: 5, parentId: "wing_right_le_devices", side: "right", category: "control_surface", selectable: true },
    { id: "wing_right_upper_surface", label: "Extradorso (caixa da asa)", level: 3, parentId: "wing_right", side: "right", category: "wing", selectable: true },
    { id: "wing_right_upper_structure", label: "Estrutura externa", level: 4, parentId: "wing_right_upper_surface", side: "right", category: "structure", selectable: true },
    { id: "wing_right_upper_panel_inboard", label: "Painel superior interno", level: 5, parentId: "wing_right_upper_structure", side: "right", category: "structure", selectable: true },
    { id: "wing_right_upper_panel_outboard", label: "Painel superior externo", level: 5, parentId: "wing_right_upper_structure", side: "right", category: "structure", selectable: true },
    { id: "wing_right_upper_controls", label: "Superfícies de comando", level: 4, parentId: "wing_right_upper_surface", side: "right", category: "control_surface", selectable: true },
    { id: "spoiler_right", label: "Spoilers – asa direita", level: 5, parentId: "wing_right_upper_controls", side: "right", category: "control_surface", selectable: true },
    { id: "wing_right_trailing_edge", label: "Bordo de fuga", level: 3, parentId: "wing_right", side: "right", category: "wing", selectable: true },
    { id: "wing_right_te_devices", label: "Superfícies de comando e hipersustentadores", level: 4, parentId: "wing_right_trailing_edge", side: "right", category: "control_surface", selectable: true },
    { id: "flap_right", label: "Flaps – asa direita", level: 5, parentId: "wing_right_te_devices", side: "right", category: "control_surface", selectable: true },
    { id: "aileron_right", label: "Aileron direito", level: 5, parentId: "wing_right_te_devices", side: "right", category: "control_surface", selectable: true },
    { id: "wing_right_tip", label: "Ponta de asa enflechada", level: 3, parentId: "wing_right", side: "right", category: "wing", selectable: true },
    { id: "powerplant_left", label: "Grupo motor esquerdo", level: 2, parentId: "aircraft", side: "left", category: "powerplant", selectable: true },
    { id: "engine_left", label: "Motor esquerdo", level: 3, parentId: "powerplant_left", side: "left", category: "powerplant", selectable: true },
    { id: "engine_left_nacelle", label: "Nacele (estrutura externa)", level: 4, parentId: "engine_left", side: "left", category: "structure", selectable: true },
    { id: "engine_left_inlet", label: "Entrada de ar", level: 5, parentId: "engine_left_nacelle", side: "left", category: "structure", selectable: true },
    { id: "engine_left_fan_cowl", label: "Carenagem do fan", level: 5, parentId: "engine_left_nacelle", side: "left", category: "structure", selectable: true },
    { id: "engine_left_exhaust", label: "Bocal de exaustão", level: 5, parentId: "engine_left_nacelle", side: "left", category: "structure", selectable: true },
    { id: "pylon_left", label: "Pilone esquerdo", level: 3, parentId: "powerplant_left", side: "left", category: "powerplant", selectable: true },
    { id: "powerplant_right", label: "Grupo motor direito", level: 2, parentId: "aircraft", side: "right", category: "powerplant", selectable: true },
    { id: "engine_right", label: "Motor direito", level: 3, parentId: "powerplant_right", side: "right", category: "powerplant", selectable: true },
    { id: "engine_right_nacelle", label: "Nacele (estrutura externa)", level: 4, parentId: "engine_right", side: "right", category: "structure", selectable: true },
    { id: "engine_right_inlet", label: "Entrada de ar", level: 5, parentId: "engine_right_nacelle", side: "right", category: "structure", selectable: true },
    { id: "engine_right_fan_cowl", label: "Carenagem do fan", level: 5, parentId: "engine_right_nacelle", side: "right", category: "structure", selectable: true },
    { id: "engine_right_exhaust", label: "Bocal de exaustão", level: 5, parentId: "engine_right_nacelle", side: "right", category: "structure", selectable: true },
    { id: "pylon_right", label: "Pilone direito", level: 3, parentId: "powerplant_right", side: "right", category: "powerplant", selectable: true },
    { id: "empennage", label: "Empenagem", level: 2, parentId: "aircraft", side: "center", category: "empennage", selectable: true },
    { id: "horizontal_stabilizer_left", label: "Estabilizador horizontal esquerdo", level: 3, parentId: "empennage", side: "left", category: "empennage", selectable: true },
    { id: "horizontal_stabilizer_left_structure", label: "Estrutura externa", level: 4, parentId: "horizontal_stabilizer_left", side: "left", category: "structure", selectable: true },
    { id: "horizontal_stabilizer_left_panel", label: "Painel do estabilizador", level: 5, parentId: "horizontal_stabilizer_left_structure", side: "left", category: "structure", selectable: true },
    { id: "horizontal_stabilizer_left_controls", label: "Superfícies de comando", level: 4, parentId: "horizontal_stabilizer_left", side: "left", category: "control_surface", selectable: true },
    { id: "elevator_left", label: "Profundor esquerdo", level: 5, parentId: "horizontal_stabilizer_left_controls", side: "left", category: "control_surface", selectable: true },
    { id: "horizontal_stabilizer_right", label: "Estabilizador horizontal direito", level: 3, parentId: "empennage", side: "right", category: "empennage", selectable: true },
    { id: "horizontal_stabilizer_right_structure", label: "Estrutura externa", level: 4, parentId: "horizontal_stabilizer_right", side: "right", category: "structure", selectable: true },
    { id: "horizontal_stabilizer_right_panel", label: "Painel do estabilizador", level: 5, parentId: "horizontal_stabilizer_right_structure", side: "right", category: "structure", selectable: true },
    { id: "horizontal_stabilizer_right_controls", label: "Superfícies de comando", level: 4, parentId: "horizontal_stabilizer_right", side: "right", category: "control_surface", selectable: true },
    { id: "elevator_right", label: "Profundor direito", level: 5, parentId: "horizontal_stabilizer_right_controls", side: "right", category: "control_surface", selectable: true },
    { id: "vertical_stabilizer", label: "Estabilizador vertical", level: 3, parentId: "empennage", side: "center", category: "empennage", selectable: true },
    { id: "vertical_stabilizer_structure", label: "Estrutura externa", level: 4, parentId: "vertical_stabilizer", side: "center", category: "structure", selectable: true },
    { id: "vertical_stabilizer_panel", label: "Painel da deriva", level: 5, parentId: "vertical_stabilizer_structure", side: "center", category: "structure", selectable: true },
    { id: "vertical_stabilizer_controls", label: "Superfícies de comando", level: 4, parentId: "vertical_stabilizer", side: "center", category: "control_surface", selectable: true },
    { id: "rudder", label: "Leme de direção", level: 5, parentId: "vertical_stabilizer_controls", side: "center", category: "control_surface", selectable: true },
    { id: "landing_gear", label: "Trens de pouso", level: 2, parentId: "aircraft", side: "center", category: "landing_gear", selectable: true },
    { id: "landing_gear_nose", label: "Trem de pouso do nariz", level: 3, parentId: "landing_gear", side: "center", category: "landing_gear", selectable: true },
    { id: "landing_gear_main_left", label: "Trem de pouso principal esquerdo", level: 3, parentId: "landing_gear", side: "left", category: "landing_gear", selectable: true },
    { id: "landing_gear_main_right", label: "Trem de pouso principal direito", level: 3, parentId: "landing_gear", side: "right", category: "landing_gear", selectable: true },
  ];

  /** @type {Readonly<Record<RegionLevel, string>>} */
  const LEVEL_LABELS = Object.freeze({
    1: "Aeronave", 2: "Grande região", 3: "Seção", 4: "Sistema ou estrutura", 5: "Componente", 6: "Área da não conformidade",
  });
  const ROOT_ID = "aircraft";
  /** separador do texto de localização (compatível com regionSelected) */
  const SEPARATOR = " · ";

  /** @type {Record<string, AircraftRegion3D>} */
  const BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
  /** @type {Record<string, string[]>} */
  const CHILDREN = {};
  for (const r of REGIONS) if (r.parentId) (CHILDREN[r.parentId] ||= []).push(r.id);

  /** Caminho da raiz até a região (inclusive). @param {string} id */
  function pathOf(id) {
    /** @type {string[]} */
    const p = [];
    /** @type {AircraftRegion3D | undefined} */
    let c = BY_ID[id];
    for (; c; c = c.parentId ? BY_ID[c.parentId] : undefined) p.unshift(c.id);
    return p;
  }

  /** @param {string} id @param {string} ancestorId */
  const isDescendantOf = (id, ancestorId) => id !== ancestorId && pathOf(id).includes(ancestorId);
  /** Regiões logo abaixo de `id`. @param {string} id */
  const childrenOf = (id) => (CHILDREN[id] || []).map((c) => BY_ID[c]);
  /** @param {string} id */
  const hasChildren = (id) => Boolean(CHILDREN[id] && CHILDREN[id].length);

  /** Texto da localização a partir de um caminho de IDs (a raiz é omitida). @param {readonly string[]} ids */
  const labelFor = (ids) => ids.filter((id) => BY_ID[id] && BY_ID[id].level > 1).map((id) => BY_ID[id].label).join(SEPARATOR);

  /**
   * Caminho de IDs (com a raiz) correspondente a um texto de localização, casando os rótulos
   * nível a nível a partir da raiz; para no primeiro rótulo que não casa.
   * @param {string} text
   * @returns {string[]}
   */
  function pathFromLabel(text) {
    const path = [ROOT_ID];
    for (const part of String(text || "").split(SEPARATOR).map((s) => s.trim()).filter(Boolean)) {
      const next = childrenOf(path[path.length - 1]).find((c) => c.label === part);
      if (!next) break;
      path.push(next.id);
    }
    return path;
  }

  /**
   * Localização estruturada e serializável a partir do caminho confirmado pelo usuário
   * (IDs da raiz até a região mais profunda). Usada pelo 3D e pelo 2D.
   * @param {readonly string[]} confirmedPath @param {{ view: AircraftView, partial: boolean }} o
   * @returns {AircraftLocation}
   */
  function locationFrom(confirmedPath, o) {
    const ids = confirmedPath.filter((id) => BY_ID[id] && BY_ID[id].level > 1);
    const at = (/** @type {number} */ level) => ids.find((id) => BY_ID[id].level === level);
    /** @type {AircraftLocation} */
    const loc = {
      aircraftModel: "E195-E2-demonstrativo",
      currentView: o.view,
      locationPath: ids.map((id) => BY_ID[id].label),
      locationIds: ids,
      partial: o.partial,
      confirmed: true,
      confirmedBy: "user",
    };
    const regionId = at(2), sectionId = at(3), structureId = at(4), componentId = at(5);
    if (regionId) loc.regionId = regionId;
    if (sectionId) loc.sectionId = sectionId;
    if (structureId) loc.structureId = structureId;
    if (componentId) loc.componentId = componentId;
    return loc;
  }

  window.CtrlCDAircraftHierarchy = Object.freeze({
    locationFrom,
    REGIONS: Object.freeze(REGIONS), LEVEL_LABELS, ROOT_ID, SEPARATOR,
    get: (/** @type {string} */ id) => BY_ID[id], pathOf, isDescendantOf, childrenOf, hasChildren, labelFor, pathFromLabel,
  });
})();

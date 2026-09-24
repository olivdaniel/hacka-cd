// @ts-check
/* ==========================================================================
   CTRL+CD 3D — regiões da aeronave e correspondência com os nós do GLB
   (aircraftRegions + aircraftMeshMap).

   Hierarquia: vem de ctrlcd/aircraft-hierarchy.js (window.CtrlCDAircraftHierarchy), fonte única
   compartilhada com o localizador 2D: 87 regiões em 5 níveis estáticos (o nível 6 é a área
   marcada no modelo). Este arquivo acrescenta só o que é do 3D: correspondência com os nós do
   GLB, região-mãe com geometria e a AircraftLocation estruturada.

   As subdivisões abaixo das malhas do GLB (seções da asa, níveis 4 e 5) são DEMONSTRATIVAS:
   não correspondem a limites reais de painéis ou componentes e não têm geometria própria no
   modelo. Elas são escolhidas pela lista textual, e o 3D realça a região-mãe mais próxima que
   tem geometria (geometryFor). Nenhuma zona é calculada ou desenhada sobre a malha.

   O GLB tem nomes semânticos iguais aos IDs (auditoria da Fase 0). O mapa fica explícito para
   que um GLB futuro com outros nomes funcione sem renomear nada no arquivo.
   Exposto em window.CtrlCD3D.regions.
   ========================================================================== */
(() => {
  "use strict";

  const shared = window.CtrlCDAircraftHierarchy;
  // sem a hierarquia compartilhada o módulo não é registrado: o visualizador aponta os módulos
  // ausentes e o localizador 2D continua disponível
  if (!shared) return;
  const H = shared;
  const AIRCRAFT_REGIONS = H.REGIONS;

  /**
   * Região lógica → nomes aceitos para o nó/malha no GLB (o primeiro que existir é usado).
   * @type {Record<string, string[]>}
   */
  const AIRCRAFT_MESH_MAP = {
    nose: ["nose", "Nose", "radome"],
    cockpit: ["cockpit", "Cockpit"],
    fuselage_forward: ["fuselage_forward"],
    fuselage_center: ["fuselage_center"],
    fuselage_rear: ["fuselage_rear"],
    tail_cone: ["tail_cone", "TailCone"],
    wing_left: ["wing_left", "Wing_L", "LeftWing"],
    wing_right: ["wing_right", "Wing_R", "RightWing"],
    engine_left: ["engine_left", "Engine_L"],
    engine_right: ["engine_right", "Engine_R"],
    pylon_left: ["pylon_left"],
    pylon_right: ["pylon_right"],
    horizontal_stabilizer_left: ["horizontal_stabilizer_left"],
    horizontal_stabilizer_right: ["horizontal_stabilizer_right"],
    vertical_stabilizer: ["vertical_stabilizer"],
    landing_gear_nose: ["landing_gear_nose"],
    landing_gear_main_left: ["landing_gear_main_left"],
    landing_gear_main_right: ["landing_gear_main_right"],
  };

  /** Nó auxiliar (faixa escura atrás das janelas, faces de até 27 m): nunca é alvo direto. */
  const AUXILIARY_NODES = ["fuselage_window_background"];

  /** Estações longitudinais da fuselagem no GLB (x em metros a partir do nariz), iguais às do corte das regiões. */
  const FUSELAGE_STATIONS = /** @type {[string, number][]} */ ([
    ["nose", 1.4], ["cockpit", 4.6], ["fuselage_forward", 15.5], ["fuselage_center", 21.1], ["fuselage_rear", 37.5], ["tail_cone", Infinity],
  ]);

  const LEVEL_LABELS = H.LEVEL_LABELS;

  const pathOf = H.pathOf;
  const isDescendantOf = H.isDescendantOf;

  /**
   * Resolve o nó do GLB atingido para uma região folha lógica com malha (nível 3, ou 2 nas asas).
   * O nó auxiliar das janelas é redirecionado para a seção da fuselagem pela coordenada x.
   * @param {string} nodeName @param {number} x
   * @returns {string | null}
   */
  function leafForNode(nodeName, x) {
    if (AUXILIARY_NODES.includes(nodeName)) {
      return (FUSELAGE_STATIONS.find(([, xmax]) => x < xmax) || FUSELAGE_STATIONS[FUSELAGE_STATIONS.length - 1])[0];
    }
    for (const [id, names] of Object.entries(AIRCRAFT_MESH_MAP)) if (names.includes(nodeName)) return id;
    return null;
  }

  /**
   * Região que um clique deve selecionar, dado o foco atual da hierarquia: o ancestral da folha
   * que é filho direto do foco (nunca avança mais de um nível). null se a folha estiver fora do
   * foco ou for o próprio foco.
   * @param {string} leafId @param {string} focusId
   * @returns {string | null}
   */
  function targetFor(leafId, focusId) {
    const p = pathOf(leafId);
    const i = p.indexOf(focusId);
    if (i < 0 || i === p.length - 1) return null;
    return p[i + 1];
  }

  /**
   * Nome do nó do GLB que representa a região, se existir no arquivo (malha ou grupo).
   * @param {string} id @param {readonly string[]} available nomes de nós do GLB
   * @returns {string | null}
   */
  function nodeFor(id, available) {
    const alt = AIRCRAFT_MESH_MAP[id];
    if (alt) return alt.find((n) => available.includes(n)) || null;
    return available.includes(id) ? id : null;
  }

  /**
   * Região com geometria que representa `id` no 3D: ela mesma ou o ancestral mais próximo que
   * tem nó no GLB. `own` indica se a geometria é da própria região.
   * @param {string} id @param {readonly string[]} available
   * @returns {{ regionId: string, node: string, own: boolean } | null}
   */
  function geometryFor(id, available) {
    const p = pathOf(id);
    for (let i = p.length - 1; i >= 0; i--) {
      const node = nodeFor(p[i], available);
      if (node) return { regionId: p[i], node, own: i === p.length - 1 };
    }
    return null;
  }

  /**
   * Nomes de nós do GLB que pertencem a uma região (ela mesma ou descendentes).
   * @param {string} id @param {string[]} available
   */
  function meshNodesOf(id, available) {
    /** @type {string[]} */
    const out = [];
    const walk = (/** @type {string} */ rid) => {
      const names = AIRCRAFT_MESH_MAP[rid];
      if (names) {
        const hit = names.find((n) => available.includes(n));
        if (hit) out.push(hit);
      }
      for (const c of H.childrenOf(rid)) walk(c.id);
    };
    walk(id);
    if (id === "fuselage" || id === "aircraft") out.push(...AUXILIARY_NODES.filter((n) => available.includes(n)));
    return out;
  }

  const childrenOf = H.childrenOf;
  const hasChildren = H.hasChildren;

  /** Localização estruturada (mesma função do localizador 2D, na hierarquia compartilhada). */
  const locationFrom = H.locationFrom;

  /** Rótulo resumido (compatível com o texto de regionSelected), ex.: "Asa esquerda · Bordo de ataque". @param {AircraftLocation} loc */
  const labelOf = (loc) => loc.locationPath.join(H.SEPARATOR);

  window.CtrlCD3D.regions = Object.freeze({
    AIRCRAFT_REGIONS: Object.freeze(AIRCRAFT_REGIONS), AIRCRAFT_MESH_MAP: Object.freeze(AIRCRAFT_MESH_MAP),
    AUXILIARY_NODES, ROOT_ID: H.ROOT_ID, LEVEL_LABELS,
    get: H.get, pathOf, isDescendantOf, leafForNode, targetFor, nodeFor, geometryFor,
    meshNodesOf, childrenOf, hasChildren, locationFrom, labelOf,
  });
})();

// @ts-check
/* ==========================================================================
   CTRL+CD 3D — vistas predefinidas (aircraftViewPresets).

   Eixos do GLB: nariz em −X, cauda em +X, lado ESQUERDO da aeronave em +Z, altura em +Y.
   A câmera orbita o alvo com yaw medido no plano XZ a partir de +X:
     yaw = π   → observador à frente do nariz      yaw = 0    → observador atrás da cauda
     yaw = π/2 → observador do lado esquerdo (+Z)  yaw = −π/2 → observador do lado direito
   Superior e inferior usam elevação de ±89,4° (e não 90°), para que o vetor "para cima" da tela
   continue definido, sem saltos de orientação. A superior olha do lado da cauda (yaw 0) e a
   inferior do lado do nariz (yaw π): nas duas, o nariz fica para o alto da tela.
   Cada vista é enquadrada pela caixa envolvente, na direção da própria vista.
   Exposto em window.CtrlCD3D.viewPresets.
   ========================================================================== */
(() => {
  "use strict";

  const CU = /** @type {CameraUtilsApi} */ (window.CtrlCD3D.cameraUtils);
  const POLE = Math.PI / 2 - 0.01;

  /** @type {ViewPreset[]} */
  const PRESETS = [
    { id: "perspective", label: "Perspectiva", shortLabel: "Persp.", yaw: CU.INITIAL_VIEW.yaw, pitch: CU.INITIAL_VIEW.pitch,
      description: "Vista em perspectiva pela frente e pela esquerda da aeronave" },
    { id: "isometric", label: "Isométrica", shortLabel: "Isom.", yaw: (3 * Math.PI) / 4, pitch: Math.atan(1 / Math.SQRT2),
      description: "Direção isométrica (45° no plano e 35,3° de elevação) pela frente e pela esquerda" },
    { id: "top", label: "Superior", shortLabel: "Sup.", yaw: 0, pitch: POLE,
      description: "Vista de cima, nariz para o alto da tela, asa esquerda à esquerda" },
    { id: "bottom", label: "Inferior", shortLabel: "Inf.", yaw: Math.PI, pitch: -POLE,
      description: "Vista de baixo, nariz para o alto da tela, asa esquerda à direita" },
    { id: "front", label: "Frontal", shortLabel: "Front.", yaw: Math.PI, pitch: 0,
      description: "Observador à frente do nariz; asa esquerda à direita da tela" },
    { id: "rear", label: "Traseira", shortLabel: "Tras.", yaw: 0, pitch: 0,
      description: "Observador atrás da cauda; asa esquerda à esquerda da tela" },
    { id: "left", label: "Lateral esquerda", shortLabel: "Lat. esq.", yaw: Math.PI / 2, pitch: 0,
      description: "Observador do lado esquerdo; nariz à esquerda da tela" },
    { id: "right", label: "Lateral direita", shortLabel: "Lat. dir.", yaw: -Math.PI / 2, pitch: 0,
      description: "Observador do lado direito; nariz à direita da tela" },
  ];

  /** @param {AircraftView} id */
  const get = (id) => PRESETS.find((p) => p.id === id) || PRESETS[0];

  /**
   * Estado de câmera que enquadra a aeronave inteira na vista pedida.
   * @param {AircraftView} id @param {GlbBounds} bounds @param {number} fovY @param {number} aspect
   * @returns {CameraState}
   */
  function cameraFor(id, bounds, fovY, aspect) {
    const p = get(id);
    return CU.fitCameraToObject(bounds, fovY, aspect, { yaw: p.yaw, pitch: p.pitch });
  }

  window.CtrlCD3D.viewPresets = Object.freeze({ PRESETS: Object.freeze(PRESETS), get, cameraFor });
})();

// @ts-check
/* ==========================================================================
   CTRL+CD 3D — utilitários de câmera (órbita em torno de um alvo).

   A câmera é descrita por { target, distance, yaw, pitch }: um estado serializável, sem
   objetos gráficos. O enquadramento sempre sai da caixa envolvente do modelo (nunca de
   coordenadas fixas), porque a origem do GLB fica na ponta do nariz, e não no centro.
   Exposto em window.CtrlCD3D.cameraUtils.
   ========================================================================== */
(() => {
  "use strict";

  const M = /** @type {MathApi} */ (window.CtrlCD3D.math);

  /** Vista inicial: perspectiva pela frente e pela esquerda da aeronave, levemente de cima.
   *  No GLB: nariz em −X, lado esquerdo em +Z, altura em +Y. */
  const INITIAL_VIEW = Object.freeze({ yaw: 2.35, pitch: 0.38 });

  /** @param {GlbModel} model @returns {GlbBounds} */
  function calculateObjectBounds(model) {
    return model.bounds;
  }

  /**
   * Distância mínima para que os 8 cantos da caixa envolvente caibam no campo de visão
   * (vertical e horizontal), vistos na direção pedida, com margem.
   * @param {GlbBounds} bounds @param {number} fovY @param {number} aspect
   * @param {{ yaw: number, pitch: number }} [view] @param {number} [margin]
   */
  function fitDistance(bounds, fovY, aspect, view = INITIAL_VIEW, margin = 1.1) {
    const tanY = Math.tan(fovY / 2) / margin;
    const tanX = (Math.tan(fovY / 2) * aspect) / margin;
    const cp = Math.cos(view.pitch);
    // direção da câmera para o alvo (f), direita (r) e cima (u) da tela
    const f = M.normalize([-cp * Math.cos(view.yaw), -Math.sin(view.pitch), -cp * Math.sin(view.yaw)]);
    let r = M.cross(f, [0, 1, 0]);
    r = M.length(r) < 1e-6 ? [Math.sin(view.yaw), 0, -Math.cos(view.yaw)] : M.normalize(r);
    const u = M.cross(r, f);
    let d = 0;
    for (const x of [bounds.min[0], bounds.max[0]]) {
      for (const y of [bounds.min[1], bounds.max[1]]) {
        for (const z of [bounds.min[2], bounds.max[2]]) {
          const v = M.sub([x, y, z], bounds.center);
          const depth = M.dot(v, f); // positivo = mais longe da câmera
          d = Math.max(d, Math.abs(M.dot(v, r)) / tanX - depth, Math.abs(M.dot(v, u)) / tanY - depth);
        }
      }
    }
    return Math.max(d, bounds.radius * 0.6);
  }

  /**
   * @param {GlbBounds} bounds @param {number} fovY @param {number} aspect
   * @param {{ yaw: number, pitch: number }} [view]
   * @returns {CameraState}
   */
  function fitCameraToObject(bounds, fovY, aspect, view = INITIAL_VIEW) {
    return { target: [...bounds.center], distance: fitDistance(bounds, fovY, aspect, view), yaw: view.yaw, pitch: view.pitch };
  }

  /**
   * Limites da órbita. A distância mínima (≈ 45 % do raio envolvente, a partir de um alvo que
   * fica sempre dentro da caixa da aeronave) impede que a câmera entre na fuselagem.
   * @param {GlbBounds} bounds @param {number} fitDist @returns {CameraLimits}
   */
  function cameraLimits(bounds, fitDist) {
    const pad = 0.05;
    return {
      minDistance: bounds.radius * 0.45,
      maxDistance: Math.max(fitDist * 2.5, bounds.radius * 4),
      // ±89,4°: permite as vistas superior e inferior sem o vetor "para cima" ficar indefinido
      minPitch: -(Math.PI / 2 - 0.01),
      maxPitch: Math.PI / 2 - 0.01,
      targetMin: [bounds.min[0] - bounds.size[0] * pad, bounds.min[1] - bounds.size[1] * pad, bounds.min[2] - bounds.size[2] * pad],
      targetMax: [bounds.max[0] + bounds.size[0] * pad, bounds.max[1] + bounds.size[1] * pad, bounds.max[2] + bounds.size[2] * pad],
    };
  }

  /** @param {CameraState} s @returns {Vec3} */
  function eyePosition(s) {
    const cp = Math.cos(s.pitch);
    return [
      s.target[0] + s.distance * cp * Math.cos(s.yaw),
      s.target[1] + s.distance * Math.sin(s.pitch),
      s.target[2] + s.distance * cp * Math.sin(s.yaw),
    ];
  }

  /**
   * Raio que sai da câmera pelo ponto da tela (coordenadas normalizadas de −1 a 1, y para cima).
   * Usa a mesma base de câmera do renderer (vetor "para cima" = +Y).
   * @param {CameraState} s @param {number} fovY @param {number} aspect @param {number} ndcX @param {number} ndcY
   * @returns {{ origin: Vec3, dir: Vec3 }}
   */
  function rayFromScreen(s, fovY, aspect, ndcX, ndcY) {
    const eye = eyePosition(s);
    const f = M.normalize(M.sub(s.target, eye));
    let r = M.cross(f, [0, 1, 0]);
    r = M.length(r) < 1e-6 ? [Math.sin(s.yaw), 0, -Math.cos(s.yaw)] : M.normalize(r);
    const u = M.cross(r, f);
    const t = Math.tan(fovY / 2);
    const dir = M.normalize(M.add(f, M.add(M.scale(r, ndcX * t * aspect), M.scale(u, ndcY * t))));
    return { origin: eye, dir };
  }

  /**
   * Projeta um ponto do mundo na tela (coordenadas normalizadas −1..1, y para cima), com a mesma
   * câmera do renderer. `inFront` é falso se o ponto estiver atrás da câmera.
   * @param {CameraState} s @param {number} fovY @param {number} aspect @param {Vec3} p
   * @returns {{ ndcX: number, ndcY: number, depth: number, inFront: boolean }}
   */
  function projectPoint(s, fovY, aspect, p) {
    const eye = eyePosition(s);
    const f = M.normalize(M.sub(s.target, eye));
    let r = M.cross(f, [0, 1, 0]);
    r = M.length(r) < 1e-6 ? [Math.sin(s.yaw), 0, -Math.cos(s.yaw)] : M.normalize(r);
    const u = M.cross(r, f);
    const v = M.sub(p, eye);
    const depth = M.dot(v, f);
    const t = Math.tan(fovY / 2);
    const z = Math.max(depth, 1e-6);
    return { ndcX: M.dot(v, r) / (z * t * aspect), ndcY: M.dot(v, u) / (z * t), depth, inFront: depth > 1e-6 };
  }

  /** Caixa envolvente (mín./máx.) no formato usado pelo enquadramento. @param {Vec3} min @param {Vec3} max @returns {GlbBounds} */
  function boundsFromBox(min, max) {
    /** @type {Vec3} */
    const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    return { min, max, size, center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], radius: M.length(size) / 2 };
  }

  const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  /**
   * Interpola a câmera (alvo, distância e ângulos) com suavização. Devolve uma função de cancelamento.
   * Com prefers-reduced-motion, aplica o estado final imediatamente.
   * @param {CameraState} from @param {CameraState} to @param {number} ms
   * @param {(s: CameraState) => void} onFrame @param {() => void} [onDone]
   */
  function animateCameraToTarget(from, to, ms, onFrame, onDone) {
    if (reducedMotion() || ms <= 0) {
      onFrame({ ...to, target: [...to.target] });
      onDone?.();
      return () => {};
    }
    // caminho angular mais curto no yaw
    let dyaw = (to.yaw - from.yaw) % (2 * Math.PI);
    if (dyaw > Math.PI) dyaw -= 2 * Math.PI;
    if (dyaw < -Math.PI) dyaw += 2 * Math.PI;
    const t0 = performance.now();
    let raf = 0;
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / ms);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      onFrame({
        target: [
          from.target[0] + (to.target[0] - from.target[0]) * e,
          from.target[1] + (to.target[1] - from.target[1]) * e,
          from.target[2] + (to.target[2] - from.target[2]) * e,
        ],
        distance: from.distance + (to.distance - from.distance) * e,
        yaw: from.yaw + dyaw * e,
        pitch: from.pitch + (to.pitch - from.pitch) * e,
      });
      if (t < 1) raf = requestAnimationFrame(step);
      else onDone?.();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }

  /**
   * Volta ao enquadramento inicial (animado).
   * @param {CameraState} current @param {CameraState} initial
   * @param {(s: CameraState) => void} onFrame @param {() => void} [onDone]
   */
  function resetCamera(current, initial, onFrame, onDone) {
    return animateCameraToTarget(current, initial, 450, onFrame, onDone);
  }

  window.CtrlCD3D.cameraUtils = Object.freeze({
    calculateObjectBounds, fitDistance, fitCameraToObject, cameraLimits, eyePosition,
    animateCameraToTarget, resetCamera, rayFromScreen, projectPoint, boundsFromBox, INITIAL_VIEW,
  });
})();

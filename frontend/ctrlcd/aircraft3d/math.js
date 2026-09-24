// @ts-check
/* ==========================================================================
   CTRL+CD 3D — utilitários de matriz e vetor (coluna principal, como no WebGL/glTF).
   Sem dependências. Exposto em window.CtrlCD3D.math.
   ========================================================================== */
(() => {
  "use strict";

  /** @returns {Float32Array} */
  function identity() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  }

  /**
   * @param {ArrayLike<number>} a
   * @param {ArrayLike<number>} b
   * @returns {Float32Array} a × b
   */
  function multiply(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
    }
    return o;
  }

  /**
   * @param {number} fovY radianos
   * @param {number} aspect
   * @param {number} near
   * @param {number} far
   */
  function perspective(fovY, aspect, near, far) {
    const f = 1 / Math.tan(fovY / 2);
    const o = new Float32Array(16);
    o[0] = f / aspect;
    o[5] = f;
    o[10] = (far + near) / (near - far);
    o[11] = -1;
    o[14] = (2 * far * near) / (near - far);
    return o;
  }

  /** @param {Vec3} a @param {Vec3} b @returns {Vec3} */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  /** @param {Vec3} a @param {Vec3} b @returns {Vec3} */
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  /** @param {Vec3} a @param {number} s @returns {Vec3} */
  const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  /** @param {Vec3} a @param {Vec3} b */
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  /** @param {Vec3} a @param {Vec3} b @returns {Vec3} */
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  /** @param {Vec3} a */
  const length = (a) => Math.hypot(a[0], a[1], a[2]);
  /** @param {Vec3} a @returns {Vec3} */
  const normalize = (a) => {
    const l = length(a) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };

  /**
   * Matriz de visão (câmera olhando para target).
   * @param {Vec3} eye @param {Vec3} target @param {Vec3} up
   */
  function lookAt(eye, target, up) {
    const z = normalize(sub(eye, target));
    let x = cross(up, z);
    if (length(x) < 1e-6) x = cross([0, 0, 1], z); // up paralelo à direção de visão
    x = normalize(x);
    const y = cross(z, x);
    const o = identity();
    o[0] = x[0]; o[4] = x[1]; o[8] = x[2];
    o[1] = y[0]; o[5] = y[1]; o[9] = y[2];
    o[2] = z[0]; o[6] = z[1]; o[10] = z[2];
    o[12] = -dot(x, eye); o[13] = -dot(y, eye); o[14] = -dot(z, eye);
    return o;
  }

  /**
   * Matriz a partir de translação, rotação (quatérnio xyzw) e escala do glTF.
   * @param {number[]=} t @param {number[]=} q @param {number[]=} s
   */
  function fromTRS(t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) {
    const [x, y, z, w] = q;
    const o = identity();
    o[0] = (1 - 2 * (y * y + z * z)) * s[0]; o[1] = 2 * (x * y + z * w) * s[0]; o[2] = 2 * (x * z - y * w) * s[0];
    o[4] = 2 * (x * y - z * w) * s[1]; o[5] = (1 - 2 * (x * x + z * z)) * s[1]; o[6] = 2 * (y * z + x * w) * s[1];
    o[8] = 2 * (x * z + y * w) * s[2]; o[9] = 2 * (y * z - x * w) * s[2]; o[10] = (1 - 2 * (x * x + y * y)) * s[2];
    o[12] = t[0]; o[13] = t[1]; o[14] = t[2];
    return o;
  }

  /** @param {ArrayLike<number>} m @param {Vec3} p @returns {Vec3} */
  function transformPoint(m, p) {
    return [
      m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
      m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
      m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
    ];
  }

  /** @param {ArrayLike<number>} m */
  function isIdentity(m) {
    for (let i = 0; i < 16; i++) if (Math.abs(m[i] - (i % 5 === 0 ? 1 : 0)) > 1e-9) return false;
    return true;
  }

  const clamp = (/** @type {number} */ v, /** @type {number} */ lo, /** @type {number} */ hi) => Math.min(hi, Math.max(lo, v));

  window.CtrlCD3D = window.CtrlCD3D || {};
  /**
   * Inversa de uma matriz 4×4 (coluna principal). null se for singular.
   * @param {ArrayLike<number>} m @returns {Float32Array | null}
   */
  function invert(m) {
    const a = Array.from(m);
    const o = new Float32Array(16);
    o[0] = a[5] * a[10] * a[15] - a[5] * a[11] * a[14] - a[9] * a[6] * a[15] + a[9] * a[7] * a[14] + a[13] * a[6] * a[11] - a[13] * a[7] * a[10];
    o[4] = -a[4] * a[10] * a[15] + a[4] * a[11] * a[14] + a[8] * a[6] * a[15] - a[8] * a[7] * a[14] - a[12] * a[6] * a[11] + a[12] * a[7] * a[10];
    o[8] = a[4] * a[9] * a[15] - a[4] * a[11] * a[13] - a[8] * a[5] * a[15] + a[8] * a[7] * a[13] + a[12] * a[5] * a[11] - a[12] * a[7] * a[9];
    o[12] = -a[4] * a[9] * a[14] + a[4] * a[10] * a[13] + a[8] * a[5] * a[14] - a[8] * a[6] * a[13] - a[12] * a[5] * a[10] + a[12] * a[6] * a[9];
    o[1] = -a[1] * a[10] * a[15] + a[1] * a[11] * a[14] + a[9] * a[2] * a[15] - a[9] * a[3] * a[14] - a[13] * a[2] * a[11] + a[13] * a[3] * a[10];
    o[5] = a[0] * a[10] * a[15] - a[0] * a[11] * a[14] - a[8] * a[2] * a[15] + a[8] * a[3] * a[14] + a[12] * a[2] * a[11] - a[12] * a[3] * a[10];
    o[9] = -a[0] * a[9] * a[15] + a[0] * a[11] * a[13] + a[8] * a[1] * a[15] - a[8] * a[3] * a[13] - a[12] * a[1] * a[11] + a[12] * a[3] * a[9];
    o[13] = a[0] * a[9] * a[14] - a[0] * a[10] * a[13] - a[8] * a[1] * a[14] + a[8] * a[2] * a[13] + a[12] * a[1] * a[10] - a[12] * a[2] * a[9];
    o[2] = a[1] * a[6] * a[15] - a[1] * a[7] * a[14] - a[5] * a[2] * a[15] + a[5] * a[3] * a[14] + a[13] * a[2] * a[7] - a[13] * a[3] * a[6];
    o[6] = -a[0] * a[6] * a[15] + a[0] * a[7] * a[14] + a[4] * a[2] * a[15] - a[4] * a[3] * a[14] - a[12] * a[2] * a[7] + a[12] * a[3] * a[6];
    o[10] = a[0] * a[5] * a[15] - a[0] * a[7] * a[13] - a[4] * a[1] * a[15] + a[4] * a[3] * a[13] + a[12] * a[1] * a[7] - a[12] * a[3] * a[5];
    o[14] = -a[0] * a[5] * a[14] + a[0] * a[6] * a[13] + a[4] * a[1] * a[14] - a[4] * a[2] * a[13] - a[12] * a[1] * a[6] + a[12] * a[2] * a[5];
    o[3] = -a[1] * a[6] * a[11] + a[1] * a[7] * a[10] + a[5] * a[2] * a[11] - a[5] * a[3] * a[10] - a[9] * a[2] * a[7] + a[9] * a[3] * a[6];
    o[7] = a[0] * a[6] * a[11] - a[0] * a[7] * a[10] - a[4] * a[2] * a[11] + a[4] * a[3] * a[10] + a[8] * a[2] * a[7] - a[8] * a[3] * a[6];
    o[11] = -a[0] * a[5] * a[11] + a[0] * a[7] * a[9] + a[4] * a[1] * a[11] - a[4] * a[3] * a[9] - a[8] * a[1] * a[7] + a[8] * a[3] * a[5];
    o[15] = a[0] * a[5] * a[10] - a[0] * a[6] * a[9] - a[4] * a[1] * a[10] + a[4] * a[2] * a[9] + a[8] * a[1] * a[6] - a[8] * a[2] * a[5];
    const det = a[0] * o[0] + a[1] * o[4] + a[2] * o[8] + a[3] * o[12];
    if (Math.abs(det) < 1e-12) return null;
    for (let i = 0; i < 16; i++) o[i] /= det;
    return o;
  }

  window.CtrlCD3D.math = Object.freeze({ identity, multiply, perspective, lookAt, fromTRS, transformPoint, isIdentity, invert, sub, add, scale, dot, cross, length, normalize, clamp });
})();

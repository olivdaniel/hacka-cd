// @ts-check
/* ==========================================================================
   CTRL+CD 3D — raycasting com hierarquia de volumes envolventes (BVH), sem dependências.

   - Montada UMA vez por modelo (fica em cache junto com ele), depois do primeiro quadro.
   - Divisão por SAH com 12 compartimentos no eixo mais longo; folhas de até 8 triângulos.
   - Interseção raio-triângulo de Möller–Trumbore, dupla face (os materiais do GLB são
     doubleSided). Devolve o triângulo mais próximo: distância, ponto, normal da face voltada
     para a câmera, primitiva e nó do GLB.
   - Filtro opcional por primitiva (a Fase 5 restringe o marcador à região escolhida).
   Os dados ficam em arrays tipados; nada disso vai para o estado serializável.
   Exposto em window.CtrlCD3D.raycaster.
   ========================================================================== */
(() => {
  "use strict";

  const M = /** @type {MathApi} */ (window.CtrlCD3D.math);
  const LEAF = 8;
  const BINS = 12;
  const EPS = 1e-9;
  /** @type {WeakMap<GlbModel, RayIndex>} */
  const cache = new WeakMap();

  /**
   * Construção do índice em etapas (gerador): cede a vez a cada ~4 mil operações, para que a
   * versão assíncrona não bloqueie a interface numa tarefa longa (Fase 7).
   * @param {GlbModel} model @returns {Generator<void, RayIndex, void>}
   */
  function* buildSteps(model) {
    const t0 = performance.now();
    let work = 0;
    let nTri = 0;
    for (const p of model.primitives) nTri += p.triangles;
    const V = new Float32Array(nTri * 9);   // vértices dos triângulos no espaço do mundo
    const P = new Int32Array(nTri);         // primitiva de cada triângulo
    const C = new Float32Array(nTri * 3);   // centróides
    let t = 0;
    for (let pi = 0; pi < model.primitives.length; pi++) {
      const p = model.primitives[pi];
      const pos = p.positions;
      const idx = p.indices;
      const identity = M.isIdentity(p.world);
      for (let k = 0; k < p.triangles; k++) {
        if ((++work & 4095) === 0) yield;
        for (let j = 0; j < 3; j++) {
          const vi = idx ? idx[k * 3 + j] : k * 3 + j;
          let x = pos[vi * 3], y = pos[vi * 3 + 1], z = pos[vi * 3 + 2];
          if (!identity) [x, y, z] = M.transformPoint(p.world, [x, y, z]);
          V[t * 9 + j * 3] = x; V[t * 9 + j * 3 + 1] = y; V[t * 9 + j * 3 + 2] = z;
        }
        for (let a = 0; a < 3; a++) C[t * 3 + a] = (V[t * 9 + a] + V[t * 9 + 3 + a] + V[t * 9 + 6 + a]) / 3;
        P[t] = pi;
        t += 1;
      }
    }

    const order = new Uint32Array(nTri);
    for (let i = 0; i < nTri; i++) order[i] = i;
    let cap = Math.max(64, Math.ceil(nTri / 2));
    let bmin = new Float32Array(cap * 3), bmax = new Float32Array(cap * 3);
    let first = new Int32Array(cap), count = new Int32Array(cap);
    let nodes = 0;
    const alloc = () => {
      if (nodes >= cap) {
        cap *= 2;
        const g = (/** @type {Float32Array} */ a) => { const b = new Float32Array(cap * 3); b.set(a); return b; };
        const gi = (/** @type {Int32Array} */ a) => { const b = new Int32Array(cap); b.set(a); return b; };
        bmin = g(bmin); bmax = g(bmax); first = gi(first); count = gi(count);
      }
      return nodes++;
    };
    const binCount = new Int32Array(BINS);
    const binMin = new Float32Array(BINS * 3), binMax = new Float32Array(BINS * 3);

    /** caixa de um intervalo de triângulos em order[s..e) @param {number} node @param {number} s @param {number} e */
    const bounds = (node, s, e) => {
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
      for (let i = s; i < e; i++) {
        const o = order[i] * 9;
        for (let j = 0; j < 9; j += 3) {
          const x = V[o + j], y = V[o + j + 1], z = V[o + j + 2];
          if (x < x0) x0 = x; if (y < y0) y0 = y; if (z < z0) z0 = z;
          if (x > x1) x1 = x; if (y > y1) y1 = y; if (z > z1) z1 = z;
        }
      }
      bmin[node * 3] = x0; bmin[node * 3 + 1] = y0; bmin[node * 3 + 2] = z0;
      bmax[node * 3] = x1; bmax[node * 3 + 1] = y1; bmax[node * 3 + 2] = z1;
    };
    const area = (/** @type {number} */ dx, /** @type {number} */ dy, /** @type {number} */ dz) => dx * dy + dy * dz + dz * dx;

    const root = alloc();
    /** @type {number[]} */
    const stack = [root, 0, nTri];
    while (stack.length) {
      work += 1;
      if ((work & 255) === 0) yield;
      const e = /** @type {number} */ (stack.pop()), s = /** @type {number} */ (stack.pop()), node = /** @type {number} */ (stack.pop());
      bounds(node, s, e);
      const n = e - s;
      if (n <= LEAF) { first[node] = s; count[node] = n; continue; }
      // caixa dos centróides e eixo mais longo
      let c0 = [Infinity, Infinity, Infinity], c1 = [-Infinity, -Infinity, -Infinity];
      for (let i = s; i < e; i++) {
        const o = order[i] * 3;
        for (let a = 0; a < 3; a++) { const v = C[o + a]; if (v < c0[a]) c0[a] = v; if (v > c1[a]) c1[a] = v; }
      }
      let axis = 0;
      for (let a = 1; a < 3; a++) if (c1[a] - c0[a] > c1[axis] - c0[axis]) axis = a;
      const ext = c1[axis] - c0[axis];
      if (ext < 1e-7) { first[node] = s; count[node] = n; continue; }
      // SAH por compartimentos
      binCount.fill(0); binMin.fill(Infinity); binMax.fill(-Infinity);
      const k = BINS / ext;
      for (let i = s; i < e; i++) {
        const tri = order[i];
        const b = Math.min(BINS - 1, Math.floor((C[tri * 3 + axis] - c0[axis]) * k));
        binCount[b] += 1;
        const o = tri * 9;
        for (let j = 0; j < 9; j += 3) {
          for (let a = 0; a < 3; a++) {
            const v = V[o + j + a];
            if (v < binMin[b * 3 + a]) binMin[b * 3 + a] = v;
            if (v > binMax[b * 3 + a]) binMax[b * 3 + a] = v;
          }
        }
      }
      let bestCost = Infinity, bestSplit = -1;
      for (let split = 1; split < BINS; split++) {
        let nl = 0, nr = 0;
        const l0 = [Infinity, Infinity, Infinity], l1 = [-Infinity, -Infinity, -Infinity];
        const r0 = [Infinity, Infinity, Infinity], r1 = [-Infinity, -Infinity, -Infinity];
        for (let b = 0; b < BINS; b++) {
          if (!binCount[b]) continue;
          const left = b < split;
          if (left) nl += binCount[b]; else nr += binCount[b];
          for (let a = 0; a < 3; a++) {
            if (left) { l0[a] = Math.min(l0[a], binMin[b * 3 + a]); l1[a] = Math.max(l1[a], binMax[b * 3 + a]); }
            else { r0[a] = Math.min(r0[a], binMin[b * 3 + a]); r1[a] = Math.max(r1[a], binMax[b * 3 + a]); }
          }
        }
        if (!nl || !nr) continue;
        const cost = nl * area(l1[0] - l0[0], l1[1] - l0[1], l1[2] - l0[2]) + nr * area(r1[0] - r0[0], r1[1] - r0[1], r1[2] - r0[2]);
        if (cost < bestCost) { bestCost = cost; bestSplit = split; }
      }
      let mid = s;
      if (bestSplit > 0) {
        let lo = s, hi = e - 1;
        while (lo <= hi) {
          const tri = order[lo];
          const b = Math.min(BINS - 1, Math.floor((C[tri * 3 + axis] - c0[axis]) * k));
          if (b < bestSplit) lo += 1;
          else { order[lo] = order[hi]; order[hi] = tri; hi -= 1; }
        }
        mid = lo;
      }
      if (mid === s || mid === e) {
        // distribuição degenerada: divisão pela mediana
        const sub = Array.from(order.subarray(s, e)).sort((a, b) => C[a * 3 + axis] - C[b * 3 + axis]);
        order.set(sub, s);
        mid = s + (n >> 1);
      }
      const l = alloc();
      const r = alloc();
      first[node] = l; count[node] = 0;
      stack.push(r, mid, e, l, s, mid);
    }

    /** @type {RayIndex} */
    const index = { V, P, order, bmin, bmax, first, count, nodes, triangles: nTri, buildMs: Math.round(performance.now() - t0) };
    return index;
  }

  /** Construção síncrona (usada quando o índice é pedido antes de ficar pronto). @param {GlbModel} model @returns {RayIndex} */
  function build(model) {
    const hit = cache.get(model);
    if (hit) return hit;
    const gen = buildSteps(model);
    let r = gen.next();
    while (!r.done) r = gen.next();
    cache.set(model, r.value);
    return r.value;
  }

  /** @type {WeakMap<GlbModel, Promise<RayIndex>>} */
  const pendingBuilds = new WeakMap();
  /**
   * Construção em fatias de ~12 ms (setTimeout), sem tarefa longa na thread principal.
   * `buildMs` passa a ser o tempo total decorrido (inclui as pausas entre fatias).
   * @param {GlbModel} model @returns {Promise<RayIndex>}
   */
  function buildAsync(model) {
    const hit = cache.get(model);
    if (hit) return Promise.resolve(hit);
    const running = pendingBuilds.get(model);
    if (running) return running;
    const gen = buildSteps(model);
    const promise = new Promise((resolve) => {
      const slice = () => {
        if (cache.has(model)) { resolve(/** @type {RayIndex} */ (cache.get(model))); return; }
        const until = performance.now() + 12;
        let r = gen.next();
        while (!r.done && performance.now() < until) r = gen.next();
        if (r.done) {
          cache.set(model, r.value);
          pendingBuilds.delete(model);
          resolve(r.value);
        } else {
          setTimeout(slice, 0);
        }
      };
      setTimeout(slice, 0);
    });
    pendingBuilds.set(model, promise);
    return promise;
  }

  /**
   * Triângulo mais próximo atingido pelo raio (ou null).
   * @param {GlbModel} model @param {RayIndex} ix @param {Vec3} origin @param {Vec3} dir direção unitária
   * @param {(primitiveIndex: number) => boolean} [accept]
   * @returns {RayHit | null}
   */
  function raycast(model, ix, origin, dir, accept) {
    const { V, P, order, bmin, bmax, first, count } = ix;
    const inv = [1 / (dir[0] || EPS), 1 / (dir[1] || EPS), 1 / (dir[2] || EPS)];
    const [ox, oy, oz] = origin;
    const [dx, dy, dz] = dir;
    let best = Infinity, bestTri = -1, bu = 0, bv = 0;
    const stack = new Int32Array(128);
    let sp = 0;
    stack[sp++] = 0;
    while (sp) {
      const node = stack[--sp];
      // teste de caixa (slab)
      let tmin = 0, tmax = best;
      for (let a = 0; a < 3; a++) {
        const o = a === 0 ? ox : a === 1 ? oy : oz;
        let t1 = (bmin[node * 3 + a] - o) * inv[a];
        let t2 = (bmax[node * 3 + a] - o) * inv[a];
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        if (t1 > tmin) tmin = t1;
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) break;
      }
      if (tmin > tmax) continue;
      const c = count[node];
      if (c === 0) {
        if (sp + 2 > stack.length) continue;
        stack[sp++] = first[node] + 1;
        stack[sp++] = first[node];
        continue;
      }
      for (let i = first[node], end = first[node] + c; i < end; i++) {
        const tri = order[i];
        if (accept && !accept(P[tri])) continue;
        const o = tri * 9;
        const e1x = V[o + 3] - V[o], e1y = V[o + 4] - V[o + 1], e1z = V[o + 5] - V[o + 2];
        const e2x = V[o + 6] - V[o], e2y = V[o + 7] - V[o + 1], e2z = V[o + 8] - V[o + 2];
        const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-12) continue;
        const id = 1 / det;
        const tx = ox - V[o], ty = oy - V[o + 1], tz = oz - V[o + 2];
        const u = (tx * px + ty * py + tz * pz) * id;
        if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
        const v = (dx * qx + dy * qy + dz * qz) * id;
        if (v < 0 || u + v > 1) continue;
        const tt = (e2x * qx + e2y * qy + e2z * qz) * id;
        if (tt > 1e-6 && tt < best) { best = tt; bestTri = tri; bu = u; bv = v; }
      }
    }
    if (bestTri < 0) return null;
    const o = bestTri * 9;
    /** @type {Vec3} */
    const a = [V[o], V[o + 1], V[o + 2]];
    let n = M.normalize(M.cross([V[o + 3] - a[0], V[o + 4] - a[1], V[o + 5] - a[2]], [V[o + 6] - a[0], V[o + 7] - a[1], V[o + 8] - a[2]]));
    if (M.dot(n, dir) > 0) n = M.scale(n, -1); // normal voltada para quem olha (dupla face)
    const prim = model.primitives[P[bestTri]];
    return {
      distance: best,
      point: [ox + dx * best, oy + dy * best, oz + dz * best],
      normal: n,
      triangle: bestTri,
      primitiveIndex: P[bestTri],
      nodeName: prim.nodeName,
      barycentric: [1 - bu - bv, bu, bv],
    };
  }

  window.CtrlCD3D.raycaster = Object.freeze({ build, buildAsync, raycast, isBuilt: (/** @type {GlbModel} */ m) => cache.has(m) });
})();

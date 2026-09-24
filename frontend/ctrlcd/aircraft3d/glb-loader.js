// @ts-check
/* ==========================================================================
   CTRL+CD 3D — leitura do arquivo GLB (glTF 2.0 binário), sem dependências.

   - Baixa o arquivo LOCAL (mesma origem) uma única vez por sessão: a promessa fica em cache,
     então reabrir o visualizador, trocar de vista ou selecionar NÃO baixa de novo.
     A requisição revalida o cache HTTP ("no-cache"): se o GLB for substituído no servidor,
     a versão nova é usada; se não mudou, o servidor responde 304 sem reenviar o arquivo.
   - Informa o progresso (bytes recebidos / total) e aceita cancelamento (AbortSignal).
   - Valida o formato e recusa recursos que este leitor não suporta (Draco, extensões
     obrigatórias, primitivas não triangulares) com mensagens claras.
   - NÃO altera o arquivo: só lê posições, normais, índices, materiais e a hierarquia de nós.
   Exposto em window.CtrlCD3D.loader.
   ========================================================================== */
(() => {
  "use strict";

  const M = /** @type {MathApi} */ (window.CtrlCD3D.math);
  const GLB_MAGIC = 0x46546c67; // "glTF"
  const CHUNK_JSON = 0x4e4f534a;
  const CHUNK_BIN = 0x004e4942;
  /** @type {Record<number, { size: number, make: (b: ArrayBuffer, n: number) => Uint8Array | Uint16Array | Uint32Array | Float32Array }>} */
  const COMPONENT = {
    5121: { size: 1, make: (b, n) => new Uint8Array(b, 0, n) },
    5123: { size: 2, make: (b, n) => new Uint16Array(b, 0, n) },
    5125: { size: 4, make: (b, n) => new Uint32Array(b, 0, n) },
    5126: { size: 4, make: (b, n) => new Float32Array(b, 0, n) },
  };
  /** @type {Record<string, number>} */
  const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

  /** @type {Map<string, Promise<GlbModel>>} */
  const cache = new Map();
  let downloads = 0;

  /**
   * @typedef {{ bufferView?: number, byteOffset?: number, componentType: number, count: number, type: string, min?: number[], max?: number[] }} Accessor
   * @typedef {{ byteOffset?: number, byteLength: number, byteStride?: number }} BufferView
   * @typedef {{ name?: string, children?: number[], mesh?: number, matrix?: number[], translation?: number[], rotation?: number[], scale?: number[] }} GltfNode
   * @typedef {{ attributes: Record<string, number>, indices?: number, material?: number, mode?: number, extensions?: Record<string, unknown> }} GltfPrimitive
   * @typedef {{ name?: string, pbrMetallicRoughness?: { baseColorFactor?: number[], roughnessFactor?: number, metallicFactor?: number } }} GltfMaterial
   * @typedef {{ asset?: { version?: string, generator?: string, extras?: { aviso?: string } }, scene?: number, scenes?: { nodes?: number[] }[], nodes?: GltfNode[], meshes?: { primitives: GltfPrimitive[] }[], materials?: GltfMaterial[], accessors?: Accessor[], bufferViews?: BufferView[], extensionsRequired?: string[] }} Gltf
   */

  /** Erro com mensagem já adequada ao usuário. */
  class GlbError extends Error {
    /** @param {string} message @param {string} code */
    constructor(message, code) {
      super(message);
      this.name = "GlbError";
      this.code = code;
    }
  }

  /**
   * Copia os dados de um accessor para um array tipado próprio (alinhado).
   * @param {Gltf} g @param {DataView} bin @param {number} index
   */
  function readAccessor(g, bin, index) {
    const a = g.accessors?.[index];
    if (!a || a.bufferView === undefined) throw new GlbError("Accessor inválido no arquivo do modelo.", "accessor");
    const bv = g.bufferViews?.[a.bufferView];
    const comp = COMPONENT[a.componentType];
    const n = NCOMP[a.type];
    if (!bv || !comp || !n) throw new GlbError("Formato de dados não suportado no arquivo do modelo.", "accessor");
    const count = a.count * n;
    const start = bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0);
    const stride = bv.byteStride || comp.size * n;
    const out = new ArrayBuffer(count * comp.size);
    const dst = new Uint8Array(out);
    const src = new Uint8Array(bin.buffer);
    if (stride === comp.size * n) {
      if (start + count * comp.size > bin.byteOffset + bin.byteLength) throw new GlbError("Arquivo do modelo truncado.", "truncated");
      dst.set(src.subarray(start, start + count * comp.size));
    } else {
      const elem = comp.size * n;
      for (let k = 0; k < a.count; k++) dst.set(src.subarray(start + k * stride, start + k * stride + elem), k * elem);
    }
    return { data: comp.make(out, count), accessor: a };
  }

  /**
   * @param {ArrayBuffer} buffer
   * @param {string} url
   * @param {number} loadMs
   * @returns {GlbModel}
   */
  function parseGlb(buffer, url, loadMs) {
    if (buffer.byteLength < 20) throw new GlbError("O arquivo do modelo está vazio ou incompleto.", "empty");
    const dv = new DataView(buffer);
    if (dv.getUint32(0, true) !== GLB_MAGIC) throw new GlbError("O arquivo recebido não é um modelo GLB.", "magic");
    if (dv.getUint32(4, true) !== 2) throw new GlbError("Versão de glTF não suportada (esperado 2.0).", "version");
    /** @type {Gltf | null} */
    let g = null;
    /** @type {DataView | null} */
    let bin = null;
    let off = 12;
    while (off + 8 <= buffer.byteLength) {
      const len = dv.getUint32(off, true);
      const type = dv.getUint32(off + 4, true);
      if (off + 8 + len > buffer.byteLength) throw new GlbError("Arquivo do modelo truncado.", "truncated");
      if (type === CHUNK_JSON) g = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, off + 8, len)));
      else if (type === CHUNK_BIN) bin = new DataView(buffer, off + 8, len);
      off += 8 + len;
    }
    if (!g || !bin) throw new GlbError("O arquivo do modelo não tem os blocos esperados.", "chunks");
    const gltf = /** @type {Gltf} */ (g);
    const binView = /** @type {DataView} */ (bin);
    if (gltf.extensionsRequired && gltf.extensionsRequired.length) {
      throw new GlbError(`O modelo exige recursos não suportados: ${gltf.extensionsRequired.join(", ")}.`, "extensions");
    }
    const nodes = gltf.nodes || [];
    const materials = (gltf.materials || []).map((m, i) => ({
      name: m.name || `material ${i}`,
      color: /** @type {Vec3} */ ((m.pbrMetallicRoughness?.baseColorFactor || [0.8, 0.8, 0.8, 1]).slice(0, 3)),
      roughness: m.pbrMetallicRoughness?.roughnessFactor ?? 1,
      metallic: m.pbrMetallicRoughness?.metallicFactor ?? 1,
    }));
    const fallbackMaterial = { name: "padrão", color: /** @type {Vec3} */ ([0.8, 0.8, 0.8]), roughness: 0.6, metallic: 0 };

    /** @type {GlbPrimitive[]} */
    const primitives = [];
    const min = /** @type {Vec3} */ ([Infinity, Infinity, Infinity]);
    const max = /** @type {Vec3} */ ([-Infinity, -Infinity, -Infinity]);
    /** @type {string[]} */
    const nodeNames = [];
    /** @type {string[]} */
    const meshNodeNames = [];
    let triangles = 0;

    /** @param {number} i @param {Float32Array} parentWorld @param {string[]} parentPath */
    const walk = (i, parentWorld, parentPath) => {
      const n = nodes[i];
      if (!n) return;
      const name = n.name || `node_${i}`;
      const local = n.matrix ? Float32Array.from(n.matrix) : M.fromTRS(n.translation, n.rotation, n.scale);
      const world = M.multiply(parentWorld, local);
      const path = [...parentPath, name];
      nodeNames.push(name);
      if (n.mesh !== undefined) {
        const mesh = gltf.meshes?.[n.mesh];
        if (!mesh) throw new GlbError("Malha ausente no arquivo do modelo.", "mesh");
        meshNodeNames.push(name);
        for (const p of mesh.primitives) {
          if ((p.mode ?? 4) !== 4) throw new GlbError("O modelo contém primitivas que não são triângulos.", "mode");
          if (p.extensions && "KHR_draco_mesh_compression" in p.extensions) {
            throw new GlbError("O modelo usa compressão Draco, não suportada neste visualizador.", "draco");
          }
          const pos = readAccessor(gltf, binView, p.attributes.POSITION);
          const nrm = p.attributes.NORMAL !== undefined ? readAccessor(gltf, binView, p.attributes.NORMAL).data : null;
          const idx = p.indices !== undefined ? readAccessor(gltf, binView, p.indices).data : null;
          const positions = /** @type {Float32Array} */ (pos.data);
          const count = idx ? idx.length : positions.length / 3;
          const tri = Math.floor(count / 3);
          triangles += tri;
          const amin = pos.accessor.min;
          const amax = pos.accessor.max;
          const corners = amin && amax
            ? [[amin[0], amin[1], amin[2]], [amax[0], amax[1], amax[2]], [amin[0], amax[1], amin[2]], [amax[0], amin[1], amax[2]],
               [amin[0], amin[1], amax[2]], [amax[0], amax[1], amin[2]], [amin[0], amax[1], amax[2]], [amax[0], amin[1], amin[2]]]
            : null;
          if (corners) {
            for (const c of corners) {
              const w = M.transformPoint(world, /** @type {Vec3} */ (c));
              for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], w[k]); max[k] = Math.max(max[k], w[k]); }
            }
          } else {
            for (let v = 0; v < positions.length; v += 3) {
              const w = M.transformPoint(world, [positions[v], positions[v + 1], positions[v + 2]]);
              for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], w[k]); max[k] = Math.max(max[k], w[k]); }
            }
          }
          primitives.push({
            nodeName: name,
            nodePath: path,
            world,
            positions,
            normals: nrm ? /** @type {Float32Array} */ (nrm) : null,
            indices: idx ? /** @type {Uint8Array | Uint16Array | Uint32Array} */ (idx) : null,
            material: p.material !== undefined && materials[p.material] ? materials[p.material] : fallbackMaterial,
            triangles: tri,
          });
        }
      }
      for (const c of n.children || []) walk(c, world, path);
    };
    const roots = gltf.scenes?.[gltf.scene ?? 0]?.nodes
      || nodes.map((_, i) => i).filter((i) => !nodes.some((n) => (n.children || []).includes(i)));
    for (const r of roots) walk(r, M.identity(), []);
    if (!primitives.length || !Number.isFinite(min[0])) throw new GlbError("O arquivo do modelo não contém geometria.", "empty");

    const size = /** @type {Vec3} */ ([max[0] - min[0], max[1] - min[1], max[2] - min[2]]);
    return {
      url,
      bytes: buffer.byteLength,
      loadMs,
      primitives,
      nodeNames,
      meshNodeNames,
      triangles,
      bounds: {
        min, max, size,
        center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
        radius: M.length(size) / 2,
      },
      generator: gltf.asset?.generator || "",
      notice: gltf.asset?.extras?.aviso || null,
    };
  }

  /**
   * Baixa o GLB com progresso. Lança GlbError com mensagem para o usuário.
   * @param {string} url @param {AbortSignal | undefined} signal @param {((p: LoadProgress) => void) | undefined} onProgress
   */
  async function download(url, signal, onProgress) {
    let response;
    try {
      response = await fetch(url, { signal, cache: "no-cache", credentials: "same-origin" });
    } catch (err) {
      if (signal?.aborted) throw err;
      throw new GlbError("O arquivo do modelo não pôde ser acessado. Verifique se a aplicação está sendo servida por um servidor HTTP.", "network");
    }
    if (!response.ok) throw new GlbError(`O arquivo do modelo não foi encontrado (HTTP ${response.status}).`, "http");
    downloads += 1;
    const totalHeader = Number(response.headers.get("content-length"));
    const total = Number.isFinite(totalHeader) && totalHeader > 0 ? totalHeader : null;
    if (!response.body || !onProgress) return response.arrayBuffer();
    const reader = response.body.getReader();
    /** @type {Uint8Array[]} */
    const parts = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      loaded += value.byteLength;
      onProgress({ loaded, total });
    }
    const out = new Uint8Array(loaded);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.byteLength; }
    return out.buffer;
  }

  /**
   * Carrega e interpreta o modelo, com cache por URL durante a sessão.
   * @param {string} url
   * @param {{ signal?: AbortSignal, onProgress?: (p: LoadProgress) => void }} [opts]
   * @returns {Promise<GlbModel>}
   */
  function loadModel(url, opts = {}) {
    const hit = cache.get(url);
    if (hit) return hit;
    const t0 = performance.now();
    const promise = download(url, opts.signal, opts.onProgress)
      .then((buf) => parseGlb(buf, url, Math.round(performance.now() - t0)));
    cache.set(url, promise);
    promise.catch(() => cache.delete(url)); // falhas e cancelamentos não ficam em cache
    return promise;
  }

  window.CtrlCD3D.loader = Object.freeze({
    loadModel,
    parseGlb,
    clearCache: () => cache.clear(),
    get downloads() { return downloads; },
  });
})();

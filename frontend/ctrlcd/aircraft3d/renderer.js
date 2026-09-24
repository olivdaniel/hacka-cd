// @ts-check
/* ==========================================================================
   CTRL+CD 3D — renderizador WebGL2 do modelo da aeronave, sem dependências.

   - Um programa de sombreamento para a aeronave: luz ambiente em hemisfério, luz principal,
     luz de preenchimento e um brilho especular discreto (Blinn-Phong), a partir da cor,
     rugosidade e metalicidade dos materiais do GLB. Materiais de dupla face.
   - Grade técnica discreta no plano do chão (altura mínima do modelo), com esmaecimento.
   - Renderização sob demanda (quem chama decide quando desenhar), resolução limitada
     (maxPixelRatio) e tratamento de perda de contexto gráfico.
   - Destaque de regiões (Fase 3): cor de realce por uniforme no momento do desenho — os
     materiais do GLB NUNCA são alterados nem clonados — e contorno em espaço de tela, a partir
     de uma máscara das regiões em hover/seleção (só as partes visíveis recebem contorno).
   - dispose() libera buffers, texturas, programas e o próprio contexto.
   Exposto em window.CtrlCD3D.renderer.
   ========================================================================== */
(() => {
  "use strict";

  const M = /** @type {MathApi} */ (window.CtrlCD3D.math);
  const CU = /** @type {CameraUtilsApi} */ (window.CtrlCD3D.cameraUtils);

  const MESH_VS = `#version 300 es
in vec3 aPos;
in vec3 aNrm;
uniform mat4 uViewProj;
uniform mat4 uModel;
out vec3 vNormal;
out vec3 vWorld;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  vWorld = w.xyz;
  vNormal = mat3(uModel) * aNrm;
  gl_Position = uViewProj * w;
}`;

  const MESH_FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vWorld;
uniform vec3 uColor;
uniform float uRough;
uniform float uMetal;
uniform vec3 uEye;
uniform vec3 uKeyDir;
uniform vec3 uFillDir;
uniform vec4 uTint;
out vec4 outColor;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(uEye - vWorld);
  if (dot(n, v) < 0.0) n = -n;                                   // material de dupla face
  float hemi = 0.5 + 0.5 * n.y;
  vec3 ambient = mix(vec3(0.20, 0.21, 0.23), vec3(0.42, 0.45, 0.50), hemi);
  float key = max(dot(n, uKeyDir), 0.0);
  float fill = max(dot(n, uFillDir), 0.0);
  vec3 diffuse = uColor * (ambient + vec3(1.0, 0.98, 0.95) * key * 0.78 + vec3(0.70, 0.78, 0.90) * fill * 0.30);
  vec3 h = normalize(uKeyDir + v);
  float shininess = mix(90.0, 10.0, uRough);
  float spec = pow(max(dot(n, h), 0.0), shininess) * mix(0.28, 0.05, uRough);
  vec3 specColor = mix(vec3(1.0), uColor, uMetal);
  vec3 c = diffuse * (1.0 - 0.35 * uMetal) + specColor * spec;
  c = mix(c, uTint.rgb, uTint.a);                                // realce de hover/seleção
  outColor = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);                 // saída em sRGB
}`;

  const GRID_VS = `#version 300 es
in vec3 aPos;
uniform mat4 uViewProj;
out vec3 vWorld;
void main() { vWorld = aPos; gl_Position = uViewProj * vec4(aPos, 1.0); }`;

  const GRID_FS = `#version 300 es
precision highp float;
in vec3 vWorld;
uniform vec3 uCenter;
uniform float uFade;
uniform vec4 uColor;
out vec4 outColor;
void main() {
  float d = length(vWorld.xz - uCenter.xz) / uFade;
  outColor = vec4(uColor.rgb, uColor.a * clamp(1.0 - d * d, 0.0, 1.0));
}`;

  // máscara das regiões destacadas (R = hover, G = seleção, B = confirmação) com profundidade
  const MASK_FS = `#version 300 es
precision highp float;
uniform vec4 uMask;
out vec4 outColor;
void main() { outColor = uMask; }`;

  // contorno: pixel fora da região com algum vizinho dentro dela, até uWidth pixels
  const OUTLINE_VS = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
  const OUTLINE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uMask;
uniform vec2 uTexel;
uniform float uWidth;
uniform vec3 uColorHover;
uniform vec3 uColorSel;
uniform vec3 uColorConf;
out vec4 outColor;
void main() {
  vec3 c = texture(uMask, vUv).rgb;
  vec3 near = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    float a = float(i) * 0.3926991;
    vec2 o = vec2(cos(a), sin(a)) * uTexel * uWidth;
    near = max(near, texture(uMask, vUv + o).rgb);
    near = max(near, texture(uMask, vUv + o * 0.5).rgb);
  }
  vec3 edge = step(0.5, near) * (1.0 - step(0.5, c));
  if (edge.b > 0.0) outColor = vec4(uColorConf, 1.0);
  else if (edge.g > 0.0) outColor = vec4(uColorSel, 1.0);
  else if (edge.r > 0.0) outColor = vec4(uColorHover, 0.9);
  else discard;
}`;

  // marcador da não conformidade (Fase 5): haste na direção da normal + disco de tamanho fixo em
  // tela; sem buffers (os dois vértices vêm de uniforms pelo gl_VertexID)
  const MARKER_VS = `#version 300 es
uniform mat4 uViewProj;
uniform vec3 uA;
uniform vec3 uB;
uniform float uSize;
void main() {
  vec3 p = gl_VertexID == 0 ? uA : uB;
  gl_Position = uViewProj * vec4(p, 1.0);
  gl_Position.z -= 0.002 * gl_Position.w;   // leve viés para a câmera: sem z-fighting com a superfície
  gl_PointSize = uSize;
}`;
  const MARKER_FS = `#version 300 es
precision highp float;
uniform vec3 uColor;
uniform float uAlpha;
uniform int uPoint;
out vec4 outColor;
void main() {
  if (uPoint == 0) { outColor = vec4(uColor, uAlpha); return; }
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = length(c);
  if (r > 1.0) discard;
  vec3 col = r > 0.62 ? vec3(1.0) : (r < 0.22 ? vec3(1.0) : uColor);
  if (r > 0.9) col = vec3(0.04, 0.09, 0.16);
  outColor = vec4(col, uAlpha);
}`;

  function isWebGL2Available() {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2");
      const ok = Boolean(gl);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      return ok;
    } catch {
      return false;
    }
  }

  /**
   * @param {WebGL2RenderingContext} gl @param {string} vs @param {string} fs @param {string[]} attribs
   */
  function program(gl, vs, fs, attribs) {
    const p = gl.createProgram();
    if (!p) throw new Error("Falha ao criar o programa gráfico.");
    for (const [type, src] of /** @type {[number, string][]} */ ([[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]])) {
      const sh = gl.createShader(type);
      if (!sh) throw new Error("Falha ao criar o sombreador.");
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost()) {
        throw new Error("Sombreador inválido: " + gl.getShaderInfoLog(sh));
      }
      gl.attachShader(p, sh);
      gl.deleteShader(sh);
    }
    attribs.forEach((name, i) => gl.bindAttribLocation(p, i, name));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
      throw new Error("Programa gráfico inválido: " + gl.getProgramInfoLog(p));
    }
    return p;
  }

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {GlbModel} model
   * @param {RendererOptions} opts
   * @returns {AircraftRenderer}
   */
  function createRenderer(canvas, model, opts) {
    const ctx = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" });
    if (!ctx) throw new Error("WebGL2 indisponível.");
    const gl = ctx;
    /** @type {WebGLBuffer[]} */
    const buffers = [];
    /** @type {WebGLVertexArrayObject[]} */
    const vaos = [];
    let disposed = false;
    let frames = 0;
    let lastFrameMs = 0;

    const onLost = (/** @type {Event} */ e) => {
      e.preventDefault();
      if (!disposed) opts.onContextLost();
    };
    canvas.addEventListener("webglcontextlost", onLost);

    const meshProg = program(gl, MESH_VS, MESH_FS, ["aPos", "aNrm"]);
    const gridProg = program(gl, GRID_VS, GRID_FS, ["aPos"]);
    const maskProg = program(gl, MESH_VS, MASK_FS, ["aPos", "aNrm"]);
    const outlineProg = program(gl, OUTLINE_VS, OUTLINE_FS, []);
    const markerProg = program(gl, MARKER_VS, MARKER_FS, []);
    const pointRange = /** @type {Float32Array | null} */ (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE));
    const maxPoint = pointRange ? pointRange[1] : 1;
    const emptyVao = gl.createVertexArray();
    /** @param {WebGLProgram} p @param {string} n */
    const U = (p, n) => gl.getUniformLocation(p, n);
    const uMesh = {
      viewProj: U(meshProg, "uViewProj"), model: U(meshProg, "uModel"), color: U(meshProg, "uColor"),
      rough: U(meshProg, "uRough"), metal: U(meshProg, "uMetal"), eye: U(meshProg, "uEye"),
      key: U(meshProg, "uKeyDir"), fill: U(meshProg, "uFillDir"), tint: U(meshProg, "uTint"),
    };
    const uMarker = {
      viewProj: U(markerProg, "uViewProj"), a: U(markerProg, "uA"), b: U(markerProg, "uB"), size: U(markerProg, "uSize"),
      color: U(markerProg, "uColor"), alpha: U(markerProg, "uAlpha"), point: U(markerProg, "uPoint"),
    };
    const uMask = { viewProj: U(maskProg, "uViewProj"), model: U(maskProg, "uModel"), mask: U(maskProg, "uMask") };
    const uOutline = {
      mask: U(outlineProg, "uMask"), texel: U(outlineProg, "uTexel"), width: U(outlineProg, "uWidth"),
      hover: U(outlineProg, "uColorHover"), sel: U(outlineProg, "uColorSel"), conf: U(outlineProg, "uColorConf"),
    };
    /** @type {{ fbo: WebGLFramebuffer, tex: WebGLTexture, depth: WebGLRenderbuffer, w: number, h: number } | null} */
    let maskTarget = null;
    const ensureMaskTarget = () => {
      const w = canvas.width, hgt = canvas.height;
      if (maskTarget && maskTarget.w === w && maskTarget.h === hgt) return maskTarget;
      if (maskTarget) { gl.deleteFramebuffer(maskTarget.fbo); gl.deleteTexture(maskTarget.tex); gl.deleteRenderbuffer(maskTarget.depth); }
      const tex = gl.createTexture(), fbo = gl.createFramebuffer(), depth = gl.createRenderbuffer();
      if (!tex || !fbo || !depth) throw new Error("Falha ao alocar memória gráfica.");
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, hgt, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, hgt);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      maskTarget = { fbo, tex, depth, w, h: hgt };
      return maskTarget;
    };
    const uGrid = { viewProj: U(gridProg, "uViewProj"), center: U(gridProg, "uCenter"), fade: U(gridProg, "uFade"), color: U(gridProg, "uColor") };

    /** @param {number} target @param {ArrayBufferView} data */
    const buffer = (target, data) => {
      const b = gl.createBuffer();
      if (!b) throw new Error("Falha ao alocar memória gráfica.");
      gl.bindBuffer(target, b);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      buffers.push(b);
      return b;
    };

    // ---------- geometria da aeronave (enviada uma vez por visualizador) ----------
    const draws = model.primitives.map((p) => {
      const vao = gl.createVertexArray();
      if (!vao) throw new Error("Falha ao alocar memória gráfica.");
      vaos.push(vao);
      gl.bindVertexArray(vao);
      buffer(gl.ARRAY_BUFFER, p.positions);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      if (p.normals) {
        buffer(gl.ARRAY_BUFFER, p.normals);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
      } else {
        gl.disableVertexAttribArray(1);
        gl.vertexAttrib3f(1, 0, 1, 0);
      }
      let count = p.positions.length / 3;
      let type = 0;
      if (p.indices) {
        buffer(gl.ELEMENT_ARRAY_BUFFER, p.indices);
        count = p.indices.length;
        type = p.indices instanceof Uint32Array ? gl.UNSIGNED_INT : p.indices instanceof Uint16Array ? gl.UNSIGNED_SHORT : gl.UNSIGNED_BYTE;
      }
      gl.bindVertexArray(null);
      return { vao, count, type, world: p.world, material: p.material, path: p.nodePath };
    });

    // ---------- grade no plano do chão ----------
    const b = model.bounds;
    const groundY = b.min[1] - 0.02;
    const extent = Math.max(b.size[0], b.size[2]) * 0.85;
    /** @type {number[]} */
    const minor = [];
    /** @type {number[]} */
    const major = [];
    const cx = Math.round(b.center[0]);
    const cz = Math.round(b.center[2]);
    const n = Math.ceil(extent);
    for (let i = -n; i <= n; i++) {
      const dst = i % 5 === 0 ? major : minor;
      dst.push(cx + i, groundY, cz - n, cx + i, groundY, cz + n);
      dst.push(cx - n, groundY, cz + i, cx + n, groundY, cz + i);
    }
    /** @param {number[]} pts */
    const lineVao = (pts) => {
      const vao = gl.createVertexArray();
      if (!vao) throw new Error("Falha ao alocar memória gráfica.");
      vaos.push(vao);
      gl.bindVertexArray(vao);
      buffer(gl.ARRAY_BUFFER, new Float32Array(pts));
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      return { vao, count: pts.length / 3 };
    };
    const gridMinor = lineVao(minor);
    const gridMajor = lineVao(major);

    const keyDir = M.normalize([-0.45, 0.85, 0.35]);
    const fillDir = M.normalize([0.6, 0.25, -0.55]);

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio);
      const w = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const h = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      return { width: w, height: h };
    }

    const aspect = () => Math.max(0.1, (canvas.clientWidth || 1) / (canvas.clientHeight || 1));

    const TINT_NONE = [0, 0, 0, 0];
    const TINT_HOVER = [0.62, 0.80, 1.0, 0.22];
    const TINT_SEL = [0.23, 0.51, 0.96, 0.36];
    const TINT_CONF = [0.13, 0.63, 0.42, 0.36];
    // fora da região em foco (Fase 4): esmaecido para o tom do fundo, sem esconder a aeronave
    const TINT_DIM = [0.07, 0.13, 0.21, 0.5];
    /** @param {string[]} path @param {string | null | undefined} id */
    const inRegion = (path, id) => Boolean(id) && path.includes(/** @type {string} */ (id));

    /** @param {CameraState} state @param {RenderHighlight} [hl] @param {{ grid?: boolean }} [opt] */
    function render(state, hl, opt) {
      if (disposed || gl.isContextLost()) return;
      const t0 = performance.now();
      resize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const eye = CU.eyePosition(state);
      const r = b.radius;
      // a geometria pode estar a até 2 raios do alvo (alvo numa ponta da caixa envolvente)
      const near = Math.max(state.distance - r * 2.2, r * 0.01);
      const far = state.distance + r * 3.5;
      // "para cima" sempre +Y: com a elevação limitada a ±89,4° a orientação é contínua e,
      // nas vistas superior/inferior, o nariz fica para o alto da tela (sem saltos perto dos polos)
      const up = /** @type {Vec3} */ ([0, 1, 0]);
      const viewProj = M.multiply(M.perspective(opts.fovY, aspect(), near, far), M.lookAt(eye, state.target, up));

      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      gl.useProgram(meshProg);
      gl.uniformMatrix4fv(uMesh.viewProj, false, viewProj);
      gl.uniform3fv(uMesh.eye, eye);
      gl.uniform3fv(uMesh.key, keyDir);
      gl.uniform3fv(uMesh.fill, fillDir);
      for (const d of draws) {
        const conf = inRegion(d.path, hl?.confirmed);
        const sel = inRegion(d.path, hl?.selected);
        const hov = inRegion(d.path, hl?.hover);
        const dim = Boolean(hl?.focus) && !inRegion(d.path, hl?.focus);
        // prioridade: seleção (candidata) > hover > confirmado (a região em foco inteira) > esmaecido
        gl.uniform4fv(uMesh.tint, sel ? TINT_SEL : hov ? TINT_HOVER : conf ? TINT_CONF : dim ? TINT_DIM : TINT_NONE);
        gl.uniformMatrix4fv(uMesh.model, false, d.world);
        gl.uniform3fv(uMesh.color, d.material.color);
        gl.uniform1f(uMesh.rough, d.material.roughness);
        gl.uniform1f(uMesh.metal, d.material.metallic);
        gl.bindVertexArray(d.vao);
        if (d.type) gl.drawElements(gl.TRIANGLES, d.count, d.type, 0);
        else gl.drawArrays(gl.TRIANGLES, 0, d.count);
      }

      // grade: transparente, sem escrever profundidade (não cobre a aeronave); omitida na captura
      if (!opt || opt.grid !== false) drawGrid(viewProj);

      // contorno das regiões destacadas (máscara com oclusão + detecção de borda em tela)
      if (hl && (hl.hover || hl.selected || hl.confirmed)) {
        const mt = ensureMaskTarget();
        gl.bindFramebuffer(gl.FRAMEBUFFER, mt.fbo);
        gl.viewport(0, 0, mt.w, mt.h);
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(maskProg);
        gl.uniformMatrix4fv(uMask.viewProj, false, viewProj);
        for (const d of draws) {
          gl.uniform4f(uMask.mask, inRegion(d.path, hl.hover) ? 1 : 0, inRegion(d.path, hl.selected) ? 1 : 0, inRegion(d.path, hl.confirmed) ? 1 : 0, 1);
          gl.uniformMatrix4fv(uMask.model, false, d.world);
          gl.bindVertexArray(d.vao);
          if (d.type) gl.drawElements(gl.TRIANGLES, d.count, d.type, 0);
          else gl.drawArrays(gl.TRIANGLES, 0, d.count);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(outlineProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, mt.tex);
        gl.uniform1i(uOutline.mask, 0);
        gl.uniform2f(uOutline.texel, 1 / mt.w, 1 / mt.h);
        gl.uniform1f(uOutline.width, Math.max(2, 2 * Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio)));
        gl.uniform3f(uOutline.hover, 0.86, 0.93, 1.0);
        gl.uniform3f(uOutline.sel, 0.38, 0.68, 1.0);
        gl.uniform3f(uOutline.conf, 0.30, 0.85, 0.55);
        gl.bindVertexArray(emptyVao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
        gl.enable(gl.DEPTH_TEST);
      }

      if (hl && hl.marker) drawMarker(viewProj, state, hl.marker);
      frames += 1;
      lastFrameMs = performance.now() - t0;
    }

    /** @param {Float32Array} viewProj */
    function drawGrid(viewProj) {
      gl.enable(gl.BLEND);
      // canvas com alfa pré-multiplicado: a cor é ponderada pelo alfa; o alfa, não
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.useProgram(gridProg);
      gl.uniformMatrix4fv(uGrid.viewProj, false, viewProj);
      gl.uniform3fv(uGrid.center, b.center);
      gl.uniform1f(uGrid.fade, extent);
      gl.uniform4fv(uGrid.color, [0.55, 0.64, 0.75, 0.16]);
      gl.bindVertexArray(gridMinor.vao);
      gl.drawArrays(gl.LINES, 0, gridMinor.count);
      gl.uniform4fv(uGrid.color, [0.60, 0.70, 0.82, 0.34]);
      gl.bindVertexArray(gridMajor.vao);
      gl.drawArrays(gl.LINES, 0, gridMajor.count);
      gl.bindVertexArray(null);
      gl.depthMask(true);
    }

    /**
     * Pino do marcador: haste da superfície até a ponta (na normal, comprimento proporcional à
     * distância da câmera = tamanho estável na tela) e disco na ponta. Duas passadas: translúcida
     * sem teste de profundidade (continua visível atrás da aeronave) e opaca com teste.
     * @param {Float32Array} viewProj @param {CameraState} state @param {RenderMarker} mk
     */
    function drawMarker(viewProj, state, mk) {
      const eye = CU.eyePosition(state);
      const dist = Math.hypot(mk.position[0] - eye[0], mk.position[1] - eye[1], mk.position[2] - eye[2]);
      const stem = dist * 0.045;
      /** @type {Vec3} */
      const base = [mk.position[0] + mk.normal[0] * b.radius * 0.0005, mk.position[1] + mk.normal[1] * b.radius * 0.0005, mk.position[2] + mk.normal[2] * b.radius * 0.0005];
      /** @type {Vec3} */
      const tip = [mk.position[0] + mk.normal[0] * stem, mk.position[1] + mk.normal[1] * stem, mk.position[2] + mk.normal[2] * stem];
      const color = mk.confirmed ? [0.13, 0.63, 0.42] : [0.23, 0.51, 0.96];
      const size = Math.min(maxPoint, 18 * Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio));
      gl.useProgram(markerProg);
      gl.bindVertexArray(emptyVao);
      gl.uniformMatrix4fv(uMarker.viewProj, false, viewProj);
      gl.uniform3fv(uMarker.color, color);
      gl.uniform1f(uMarker.size, size);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      for (const pass of [{ depth: false, alpha: 0.35 }, { depth: true, alpha: 1 }]) {
        if (pass.depth) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
        gl.uniform1f(uMarker.alpha, pass.alpha);
        gl.uniform1i(uMarker.point, 0);
        gl.uniform3fv(uMarker.a, base);
        gl.uniform3fv(uMarker.b, tip);
        gl.drawArrays(gl.LINES, 0, 2);
        gl.uniform1i(uMarker.point, 1);
        gl.uniform3fv(uMarker.a, tip);
        gl.drawArrays(gl.POINTS, 0, 1);
      }
      gl.depthMask(true);
      gl.enable(gl.DEPTH_TEST);
      gl.bindVertexArray(null);
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener("webglcontextlost", onLost);
      if (!gl.isContextLost()) {
        vaos.forEach((v) => gl.deleteVertexArray(v));
        buffers.forEach((x) => gl.deleteBuffer(x));
        gl.deleteProgram(meshProg);
        gl.deleteProgram(gridProg);
        gl.deleteProgram(maskProg);
        gl.deleteProgram(outlineProg);
        gl.deleteProgram(markerProg);
        if (emptyVao) gl.deleteVertexArray(emptyVao);
        if (maskTarget) { gl.deleteFramebuffer(maskTarget.fbo); gl.deleteTexture(maskTarget.tex); gl.deleteRenderbuffer(maskTarget.depth); }
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
      vaos.length = 0;
      buffers.length = 0;
      maskTarget = null;
    }

    return {
      render, resize, aspect, dispose,
      get frames() { return frames; },
      get lastFrameMs() { return lastFrameMs; },
    };
  }

  window.CtrlCD3D.renderer = Object.freeze({ createRenderer, isWebGL2Available });
})();

"""Teste de ponta a ponta — os 25 passos e as validações visuais da seção 26 da especificação.

Uso:  python3 tests/aircraft3d/test_e2e_secao26.py [pasta_de_capturas]
Um único fluxo de usuário, do formulário ao compilado, mais erro, fallback e celular.
"""
import json, math, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
LOCAL_API = "http://127.0.0.1:8001/"  # back-end local de usuários/registros (não é requisição externa)

sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_fase1 as F1  # noqa: E402
import test_fase2 as F2  # noqa: E402
import test_fase3 as F3  # noqa: E402
import test_fase4 as F4  # noqa: E402
import test_fase5 as F5  # noqa: E402

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else F1.ROOT / "tests" / "aircraft3d" / "capturas"
OUT.mkdir(parents=True, exist_ok=True)
ok_all, results = True, []


def check(cond, msg):
    global ok_all
    results.append(("OK   " if cond else "FALHA") + " " + msg)
    print(results[-1]); ok_all &= bool(cond)


def sel(pg):
    return F2.state(pg)["selection"]


def cam(pg):
    return F2.state(pg)["camera"]


GEOM_JS = """window.CtrlCD3D.loader.loadModel(window.CtrlCDAircraft3D.modelUrl()).then(m => {
  const boxes = m.primitives.map(p => { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let i = 0; i < p.positions.length; i += 3) { const w = window.CtrlCD3D.math.transformPoint(p.world, [p.positions[i], p.positions[i + 1], p.positions[i + 2]]);
      for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], w[a]); mx[a] = Math.max(mx[a], w[a]); } }
    return { node: p.nodeName, tris: p.triangles, mn, mx }; });
  const gap = (a, b) => { let d = 0; for (let k = 0; k < 3; k++) d = Math.max(d, a.mn[k] - b.mx[k], b.mn[k] - a.mx[k]); return d; };
  const floating = boxes.filter((a, i) => boxes.every((b, j) => i === j || gap(a, b) > 0.05)).map(b => b.node);
  const sig = boxes.map(b => b.node + ':' + b.tris + ':' + b.mn.map(v => v.toFixed(3)) + b.mx.map(v => v.toFixed(3)));
  return { meshes: m.meshNodeNames, nodes: m.nodeNames, floating, dupSig: sig.length - new Set(sig).size, bounds: m.bounds }; })"""


def main():
    s1 = F1.serve(F1.FRONT, 4173)
    time.sleep(1.0)
    base = "http://127.0.0.1:4173/"
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
            ctx = b.new_context(viewport={"width": 1440, "height": 900})
            ctx.add_init_script(F1.SESSION)
            pg = ctx.new_page()
            errors, requests = [], []
            pg.on("console", lambda m: m.type == "error" and "/api/" not in (m.location or {}).get("url", "") and errors.append(m.text))
            pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.on("request", lambda r: None if r.url.startswith(LOCAL_API) else requests.append(r.url))
            F1.goto_step2(pg, base)

            # 1–3
            pg.click("[data-fk=open-3d]")
            check(pg.locator(".ccd-a3d").count() == 1, "1. abrir o visualizador (botão principal da Etapa 2)")
            F1.wait_ready(pg, 60000); F2.wait_idle(pg)
            pg.wait_for_function("window.CtrlCDAircraft3D.inspect().selection.raycastReady", timeout=30000)
            glb = [u for u in requests if u.endswith(".glb")]
            check(len(glb) == 1 and glb[0].startswith(base), "2. carregar o GLB local (1 requisição, mesma origem)")
            bb = F2.ink_bbox(F1.canvas_png(pg))
            g = pg.evaluate(GEOM_JS)
            c0 = cam(pg)
            centered = all(abs(c0["target"][i] - g["bounds"]["center"][i]) < 1e-3 for i in range(3))
            check(bb and bb[0] > 0.01 and bb[2] < 0.99 and bb[1] > 0.01 and bb[3] < 0.99 and centered,
                  f"3. aeronave completa na tela e centralizada (alvo no centro da caixa; área {bb[0]:.2f}–{bb[2]:.2f} × {bb[1]:.2f}–{bb[3]:.2f})")
            # validações visuais do modelo
            meshes = g["meshes"]
            check(sorted(k for k in meshes if k.startswith("wing_")) == ["wing_left", "wing_right"], "validação: exatamente duas asas (sem terceira asa)")
            check(sorted(k for k in meshes if k.startswith("engine_")) == ["engine_left", "engine_right"], "validação: exatamente dois motores")
            check(len(g["nodes"]) == len(set(g["nodes"])) and g["dupSig"] == 0, "validação: sem peças duplicadas (nomes únicos; nenhuma malha repetida)")
            check(not g["floating"], f"validação: sem geometria flutuante (toda malha toca outra; isoladas: {g['floating']})")
            (OUT / "e2e-03-inicial.png").write_bytes(pg.locator(".ccd-a3d").screenshot())

            # 4–6
            box = pg.locator(".ccd-a3d__canvas").bounding_box()
            cx, cy = box["x"] + box["width"] * 0.3, box["y"] + box["height"] * 0.8
            pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx + 120, cy, steps=6); pg.mouse.up(); pg.wait_for_timeout(500)
            c1 = cam(pg)
            check(abs(c1["yaw"] - c0["yaw"]) > 0.1, f"4. girar (arrasto: {math.degrees(c1['yaw'] - c0['yaw']):.0f}°)")
            pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2); pg.mouse.wheel(0, -400); pg.wait_for_timeout(600)
            c2 = cam(pg)
            check(c2["distance"] < c1["distance"] * 0.95, f"5. aplicar zoom (roda: {c1['distance']:.1f} → {c2['distance']:.1f} m)")
            pg.keyboard.down("Shift"); pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx + 80, cy - 40, steps=6); pg.mouse.up(); pg.keyboard.up("Shift"); pg.wait_for_timeout(500)
            c3 = cam(pg)
            check(math.dist(c3["target"], c2["target"]) > 0.2, f"6. mover (Shift + arrastar: alvo deslocado {math.dist(c3['target'], c2['target']):.1f} m)")

            # 7–10
            pg.click("[data-a3d-view=top]"); F2.wait_idle(pg)
            R = F3.scan(pg)["regions"]
            mid = box["x"] + box["width"] / 2
            F3.hover(pg, R["wing_left"])
            tip = pg.inner_text("[data-a3d=tooltip]") if pg.is_visible("[data-a3d=tooltip]") else ""
            check(tip.startswith("Asa esquerda") and sel(pg)["hoverId"] == "wing_left" and R["wing_left"]["cx"] < mid,
                  "8. ver tooltip; validação: região correta em hover (asa esquerda, à esquerda da tela na vista superior)")
            F3.click(pg, R["wing_left"])
            check(sel(pg)["selectedId"] == "wing_left" and F3.summary(pg).get("side") == "Esquerdo", "7. selecionar asa esquerda; validação: região correta selecionada")
            d_before = cam(pg)["distance"]
            pg.click("[data-a3d=confirm-region]"); pg.wait_for_timeout(150); F2.wait_idle(pg)
            check(sel(pg)["confirmedPath"] == ["aircraft", "wing_left"], "9. confirmar região (verde, foco no nível seguinte)")
            check(cam(pg)["distance"] < d_before * 0.8, f"10. aproximar (automático ao confirmar: {d_before:.1f} → {cam(pg)['distance']:.1f} m)")

            # 11
            for rid in ("wing_left_leading_edge", "wing_left_le_devices", "slat_left"):
                F4.list_select(pg, rid); F4.confirm(pg)
            check(sel(pg)["confirmedPath"][-1] == "slat_left", "11. selecionar componente (nível 5: Slats – asa esquerda)")

            # 12–16
            pg.click("[data-a3d-view=top]"); F2.wait_idle(pg)
            pg.click("[data-a3d=mark-mode]"); pg.wait_for_timeout(100)
            check(sel(pg)["markMode"], "12. ativar modo de marcação")
            R = F3.scan(pg)["regions"]
            F3.click(pg, R["wing_left"])
            mk = sel(pg)["marker"]
            check(mk and mk["meshName"] == "wing_left" and mk["regionId"] == "slat_left", "13. marcar ponto (na asa, atribuído ao componente confirmado)")
            pc = pg.evaluate("window.CtrlCD3D.cameraUtils.eyePosition(window.CtrlCDAircraft3D.inspect().camera)")
            pg.mouse.move(box["x"] + 60, box["y"] + box["height"] - 60); pg.mouse.down()
            pg.mouse.move(box["x"] + 140, box["y"] + box["height"] - 90, steps=6); pg.mouse.up(); pg.wait_for_timeout(500)
            pg.click("[data-a3d-view=top]"); F2.wait_idle(pg)
            pp = F5.pin(pg)
            hit = pg.evaluate("([x, y]) => window.CtrlCDAircraft3D.pick(x, y)", [pp["base"]["x"], pp["base"]["y"]])
            eye = pg.evaluate("window.CtrlCD3D.cameraUtils.eyePosition(window.CtrlCDAircraft3D.inspect().camera)")
            dist = math.dist(eye, mk["worldPosition"])
            check(sel(pg)["marker"] == mk and hit and abs(hit["distance"] - dist) < 0.05,
                  f"14. girar e conferir: o marcador permanece na superfície (raio {hit and hit['distance']:.3f} m × ponto {dist:.3f} m)")
            pg.mouse.move(pp["tip"]["x"], pp["tip"]["y"]); pg.mouse.down()
            pg.mouse.move(pp["tip"]["x"] + 25, pp["tip"]["y"] + 15, steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
            mk2 = sel(pg)["marker"]
            check(mk2["worldPosition"] != mk["worldPosition"] and mk2["meshName"] == "wing_left", "15. reposicionar (arrastando o pino sobre a asa)")
            pg.click("[data-a3d=confirm-point]"); pg.wait_for_timeout(400)
            s = sel(pg)
            check(s["location"] and s["marker"]["confirmed"] and pg.inner_text("[data-a3d=marker-status]").strip() == "Localização confirmada pelo usuário.",
                  "16. confirmar ('Localização confirmada pelo usuário.')")

            # 17–21
            check((s["snapshot"] or "").startswith("data:image/jpeg"), "17. gerar snapshot (automático após confirmar)")
            (OUT / "e2e-17-visualizador.png").write_bytes(pg.locator(".ccd-a3d").screenshot())
            pg.click("[data-a3d=use-location]"); pg.wait_for_timeout(700)
            reg = pg.evaluate("window.CtrlCD.state.rec.regionSelected")
            check(pg.locator(".ccd-a3d").count() == 0 and reg == "Asa esquerda · Bordo de ataque · Dispositivos hipersustentadores · Slats – asa esquerda",
                  f"18. retornar ao formulário ('{reg}')")
            pg.wait_for_function("(() => { const i = document.querySelector('[data-fk=location-snapshot]'); return !!i && i.complete && i.naturalWidth > 0; })()", timeout=5000)
            check("ponto marcado" in pg.inner_text("[data-fk=location-detail]"), "19. ver resumo (Etapa 2: texto, detalhe e captura)")
            pg.evaluate("(() => { const S = window.CtrlCD.state; S.rec.maxStep = Math.max(S.rec.maxStep, 4); S.rec.currentStep = 4; window.CtrlCD.render(); })()")
            pg.wait_for_timeout(400)
            comp = pg.inner_text(".ccd-compiled")
            check("Slats – asa esquerda" in comp and "Ponto da não conformidade" in comp, "20. abrir compilado (localização e ponto)")
            pg.wait_for_function("(() => { const i = document.querySelector('[data-fk=compiled-snapshot] img'); return !!i && i.complete && i.naturalWidth > 0; })()", timeout=5000)
            check(True, "21. ver snapshot no compilado")
            (OUT / "e2e-21-compilado.png").write_bytes(pg.locator("[data-fk=compiled-snapshot]").screenshot())

            # 22
            pg.evaluate("(() => { const S = window.CtrlCD.state; S.rec.currentStep = 2; window.CtrlCD.render(); })()")
            pg.wait_for_timeout(300)
            pg.click("[data-fk=edit-location]"); F1.wait_ready(pg, 20000); F2.wait_idle(pg)
            s = sel(pg)
            restored = s["confirmedPath"][-1] == "slat_left" and s["marker"]["confirmed"]
            pg.keyboard.press("Escape"); pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
            check(restored and pg.locator(".ccd-a3d").count() == 0 and pg.evaluate("window.CtrlCD.state.rec.regionSelected") == reg
                  and len([u for u in requests if u.endswith(".glb")]) == 1,
                  "22. fechar e reabrir o modal (estado restaurado, sem novo download do GLB)")
            check(not errors and not [u for u in requests if not u.startswith((base, "blob:", "data:"))], "fluxo principal sem erros e sem requisições externas")

            # 23–24
            q = ctx.new_page(); qerr = []
            q.on("pageerror", lambda e: qerr.append(str(e)))
            q.route("**/*.glb", lambda r: r.fulfill(status=404, body=""))
            F1.goto_step2(q, base)
            q.click("[data-fk=open-3d]"); q.wait_for_selector("[data-a3d=error]", timeout=8000)
            opts = [q.is_visible(f"[data-a3d={k}]") for k in ("retry", "fallback", "manual", "error-close")]
            check(all(opts), "23. testar erro de carregamento (mensagem + tentar de novo, vistas técnicas, informar manualmente, fechar)")
            q.click("[data-a3d=fallback]"); q.wait_for_timeout(500)
            q.click(".ccd-ac__option[data-region-id=empennage]"); q.wait_for_timeout(300)
            q.click("[data-ac=confirm]"); q.wait_for_timeout(1500)
            check(q.evaluate("window.CtrlCD.state.rec.regionSelected") == "Empenagem" and not qerr, "24. testar fallback (vistas técnicas 2D → formulário)")
            q.close()

            # 25
            mctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
            mctx.add_init_script(F1.SESSION)
            mp = mctx.new_page()
            F2.open_viewer(mp, base)
            over = mp.evaluate("document.documentElement.scrollWidth > window.innerWidth")
            check(not over and mp.is_visible("[data-a3d=mobilebar]") and not mp.is_visible("[data-fk=mascot]"),
                  "25. layout móvel (sem estouro, barra de ação fixa, Assistente CTRL fora do caminho)")
            (OUT / "e2e-25-celular.png").write_bytes(mp.screenshot())
            mctx.close()
            b.close()
    finally:
        s1.terminate()
    print(f"\n{sum(r.startswith('OK') for r in results)}/{len(results)} verificações OK")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()

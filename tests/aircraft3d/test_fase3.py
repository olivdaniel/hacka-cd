"""Testes da Fase 3 do visualizador 3D — seleção (Playwright + Chromium, WebGL por software).

Uso:  python3 tests/aircraft3d/test_fase3.py [pasta_de_capturas]
Regressão: test_fase1.py (40) e test_fase2.py (28) continuam valendo e rodam separados.

Os pontos de tela de cada região são encontrados por varredura com a própria API de raycast
(window.CtrlCDAircraft3D.pick), escolhendo pontos cercados pela mesma região; a orientação na tela
é conferida separadamente (asa esquerda à esquerda na vista superior, à direita na frontal).
"""
import io, json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
LOCAL_API = "http://127.0.0.1:8001/"  # back-end local de usuários/registros (não é requisição externa)
from PIL import Image, ImageChops

sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_fase1 as F1  # noqa: E402
import test_fase2 as F2  # noqa: E402

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else F1.ROOT / "tests" / "aircraft3d" / "capturas"
OUT.mkdir(parents=True, exist_ok=True)
ok_all, results = True, []


def check(cond, msg):
    global ok_all
    results.append(("OK   " if cond else "FALHA") + " " + msg)
    print(results[-1]); ok_all &= bool(cond)


SCAN_JS = """(step) => {
  const c = document.querySelector('.ccd-a3d__canvas').getBoundingClientRect();
  const grid = new Map(); const byLeaf = {};
  for (let y = c.top + step; y < c.bottom - step; y += step)
    for (let x = c.left + step; x < c.right - step; x += step) {
      const p = window.CtrlCDAircraft3D.pick(x, y);
      if (!p) continue;
      grid.set(x + ',' + y, p.leafId);
      (byLeaf[p.leafId] ||= []).push([x, y]);
    }
  const out = {};
  for (const [leaf, pts] of Object.entries(byLeaf)) {
    const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const inner = pts.filter(([x, y]) => [[step, 0], [-step, 0], [0, step], [0, -step], [step, step], [-step, -step]]
      .every(([dx, dy]) => grid.get((x + dx) + ',' + (y + dy)) === leaf));
    const pool = inner.length ? inner : pts;
    pool.sort((a, b) => Math.hypot(a[0] - mx, a[1] - my) - Math.hypot(b[0] - mx, b[1] - my));
    out[leaf] = { x: pool[0][0], y: pool[0][1], n: pts.length, cx: mx, inner: inner.length };
  }
  return { regions: out, canvas: { left: c.left, top: c.top, width: c.width, height: c.height } };
}"""


def scan(pg, step=8):
    return pg.evaluate(SCAN_JS, step)


def sel(pg):
    return F2.state(pg)["selection"]


def cam_eq(a, b, tol=1e-6):
    return (abs(a["distance"] - b["distance"]) < tol and abs(a["yaw"] - b["yaw"]) < tol and abs(a["pitch"] - b["pitch"]) < tol
            and all(abs(a["target"][i] - b["target"][i]) < tol for i in range(3)))


def outline_pixels(png, rgb=(97, 173, 255), tol=40):
    im = Image.open(io.BytesIO(png)).convert("RGB")
    r0, g0, b0 = rgb
    return sum(1 for r, g, b in im.getdata() if abs(r - r0) < tol and abs(g - g0) < tol and abs(b - b0) < tol)


def img_diff(a, b):
    ia, ib = Image.open(io.BytesIO(a)).convert("RGB"), Image.open(io.BytesIO(b)).convert("RGB")
    d = ImageChops.difference(ia, ib).convert("L")
    return sum(1 for v in d.getdata() if v > 24) / (ia.width * ia.height)


def click(pg, pt, wait=450):
    pg.mouse.click(pt["x"], pt["y"]); pg.wait_for_timeout(wait)


def hover(pg, pt, wait=250):
    pg.mouse.move(pt["x"], pt["y"]); pg.wait_for_timeout(wait)


def summary(pg):
    return pg.evaluate("""Object.fromEntries([...document.querySelectorAll('[data-a3d=summary] dd')].map(d => [d.dataset.field, d.textContent]))""")


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
            F2.open_viewer(pg, base)
            pg.wait_for_function("window.CtrlCDAircraft3D.inspect().selection.raycastReady", timeout=30000)
            materials0 = pg.evaluate("window.CtrlCD3D.loader.loadModel(window.CtrlCDAircraft3D.modelUrl()).then(m => JSON.stringify(m.primitives.map(p => p.material)))")
            base_png = F1.canvas_png(pg)

            # ---------- estado inicial ----------
            m = pg.evaluate("window.CtrlCDAircraft3D.lastMetrics")
            check(pg.evaluate("window.CtrlCDAircraft3D.version").startswith("fase-") and isinstance(m.get("raycastBuildMs"), (int, float))
                  and m.get("raycastTriangles") == m["triangles"],
                  f"índice de raycast pronto após o 1º quadro: {m.get('raycastBuildMs')} ms para {m.get('raycastTriangles')} triângulos (todos)")
            items = pg.eval_on_selector_all("[data-region-id]", "els => els.map(e => [e.dataset.regionId, e.getAttribute('aria-pressed')])")
            check([i[0] for i in items] == ["fuselage", "wing_left", "wing_right", "powerplant_left", "powerplant_right", "empennage", "landing_gear"]
                  and all(i[1] == "false" for i in items),
                  f"lista textual com as {len(items)} grandes regiões (nível 2) abaixo da aeronave, nenhuma pressionada")
            conf = pg.locator("[data-a3d=confirm-region]")
            # (Fase 4) Confirmar região passou a existir: começa desabilitado porque não há seleção
            check(conf.is_disabled()
                  and pg.locator("[data-a3d=zoom-selection]").is_disabled() and pg.locator("[data-a3d=summary-empty]").is_visible(),
                  "resumo vazio; Aproximar e Confirmar região desabilitados sem seleção")
            check(pg.locator("#ccdA3dNotice").inner_text().strip() == F1.DISCLAIMER, "aviso demonstrativo continua visível")

            # ---------- vista superior: hover na asa esquerda ----------
            pg.click("[data-a3d-view=top]"); F2.wait_idle(pg)
            sc = scan(pg)
            R = sc["regions"]; cv = sc["canvas"]; mid_x = cv["left"] + cv["width"] / 2
            leaves = sorted(R)
            check({"wing_left", "wing_right", "engine_left", "engine_right", "fuselage_center", "horizontal_stabilizer_left"} <= set(leaves),
                  f"raycast atinge as regiões esperadas na vista superior ({len(leaves)} folhas: {', '.join(leaves)})")
            check(R["wing_left"]["cx"] < mid_x < R["wing_right"]["cx"],
                  "vista superior: 'wing_left' está à esquerda da tela e 'wing_right' à direita (lado da aeronave, não da tela)")
            cam0 = F2.state(pg)["camera"]
            hover(pg, R["wing_left"])
            tip = pg.locator("[data-a3d=tooltip]")
            tip_txt = tip.inner_text() if tip.is_visible() else ""
            s = sel(pg)
            check(tip.is_visible() and tip_txt.startswith("Asa esquerda") and "Nível 2" in tip_txt and s["hoverId"] == "wing_left"
                  and s["selectedId"] is None and s["focusId"] == "aircraft",
                  f"hover: dica '{tip_txt.splitlines()[0] if tip_txt else '-'}', região em hover = wing_left, sem selecionar, sem avançar de nível")
            check(cam_eq(cam0, F2.state(pg)["camera"]), "hover não move a câmera")
            check(pg.get_attribute("[data-region-id=wing_left]", "class").find("is-hover") >= 0,
                  "hover no 3D destaca o item correspondente na lista")
            hover_png = F1.canvas_png(pg)
            pg.mouse.move(cv["left"] + 4, cv["top"] + cv["height"] - 4); pg.wait_for_timeout(250)
            top_png = F1.canvas_png(pg)
            check(sel(pg)["hoverId"] is None and not tip.is_visible() and img_diff(hover_png, top_png) > 0.002,
                  f"realce de hover visível ({img_diff(hover_png, top_png) * 100:.2f} % dos pixels) e removido ao sair da região")

            # ---------- clique seleciona ----------
            click(pg, R["wing_left"])
            s = sel(pg)
            sm = summary(pg)
            check(s["selectedId"] == "wing_left" and sm.get("label") == "Asa esquerda" and sm.get("id") == "wing_left"
                  and sm.get("level") == "2 · Grande região" and sm.get("side") == "Esquerdo"
                  and sm.get("path") == "E195-E2 demonstrativo › Asa esquerda",
                  f"clique seleciona a asa esquerda; painel: {sm}")
            check(pg.get_attribute("[data-region-id=wing_left]", "aria-pressed") == "true"
                  and not pg.locator("[data-a3d=zoom-selection]").is_disabled() and not pg.locator("[data-a3d=confirm-region]").is_disabled(),
                  "lista marca a seleção (aria-pressed); Aproximar e Confirmar região habilitados")
            check(cam_eq(cam0, F2.state(pg)["camera"]), "clique simples não move a câmera")
            pg.mouse.move(cv["left"] + 4, cv["top"] + cv["height"] - 4); pg.wait_for_timeout(250)
            sel_png = F1.canvas_png(pg)
            n_out = outline_pixels(sel_png) - outline_pixels(top_png)
            check(n_out > 150, f"contorno de seleção desenhado ({n_out} pixels azuis a mais)")
            (OUT / "f3-1-selecao-asa.png").write_bytes(pg.locator(".ccd-a3d").screenshot())

            # alvo = grande região com o foco na aeronave
            pk = pg.evaluate("([x, y]) => window.CtrlCDAircraft3D.pick(x, y)", [R["engine_left"]["x"], R["engine_left"]["y"]])
            check(pk and pk["leafId"] == "engine_left" and pk["targetId"] == "powerplant_left" and pk["nodeName"] == "engine_left"
                  and len(pk["point"]) == 3 and json.loads(json.dumps(pk)) == pk,
                  "raycast no motor: folha engine_left → alvo powerplant_left (nível 2); resultado serializável")
            for leaf, expect in (("engine_left", "powerplant_left"), ("fuselage_center", "fuselage"),
                                 ("horizontal_stabilizer_left", "empennage"), ("wing_right", "wing_right")):
                click(pg, R[leaf])
                check(sel(pg)["selectedId"] == expect, f"clique em {leaf} seleciona {expect}")
            # clique no vazio não desfaz
            click(pg, {"x": cv["left"] + 6, "y": cv["top"] + cv["height"] - 6})
            check(sel(pg)["selectedId"] == "wing_right", "clique no fundo não desfaz a seleção")
            # arrasto não seleciona
            cam_a = F2.state(pg)["camera"]
            pg.mouse.move(R["wing_left"]["x"], R["wing_left"]["y"]); pg.mouse.down()
            pg.mouse.move(R["wing_left"]["x"] + 30, R["wing_left"]["y"] + 10, steps=6); pg.mouse.up(); pg.wait_for_timeout(500)
            check(sel(pg)["selectedId"] == "wing_right" and not cam_eq(cam_a, F2.state(pg)["camera"], 1e-4),
                  "arrastar sobre uma região gira a câmera e não seleciona")

            # ---------- vista inferior: trem de pouso ----------
            pg.click("[data-a3d-view=bottom]"); F2.wait_idle(pg)
            Rb = scan(pg, 6)["regions"]
            gear = next((k for k in ("landing_gear_main_left", "landing_gear_main_right", "landing_gear_nose") if k in Rb), None)
            if gear:
                click(pg, Rb[gear])
            check(gear is not None and sel(pg)["selectedId"] == "landing_gear", f"clique no trem de pouso ({gear}) seleciona landing_gear")

            # ---------- vista frontal: lado da aeronave ----------
            pg.click("[data-a3d-view=front]"); F2.wait_idle(pg)
            sf = scan(pg, 6); Rf = sf["regions"]; midf = sf["canvas"]["left"] + sf["canvas"]["width"] / 2
            check("wing_left" in Rf and "wing_right" in Rf and Rf["wing_right"]["cx"] < midf < Rf["wing_left"]["cx"],
                  "vista frontal: a asa à esquerda da tela é 'wing_right' (asa direita da aeronave)")
            click(pg, Rf["wing_right"])
            check(sel(pg)["selectedId"] == "wing_right" and summary(pg).get("side") == "Direito",
                  "vista frontal: clicar na asa à esquerda da tela seleciona a asa direita")

            # ---------- Aproximar e duplo clique ----------
            pg.click("[data-a3d-view=top]"); F2.wait_idle(pg)
            R = scan(pg)["regions"]
            click(pg, R["engine_left"])
            d0 = F2.state(pg)["camera"]["distance"]
            pg.click("[data-a3d=zoom-selection]"); F2.wait_idle(pg)
            st = F2.state(pg)
            eng_box = pg.evaluate("""window.CtrlCD3D.loader.loadModel(window.CtrlCDAircraft3D.modelUrl()).then(m => {
              const ix = window.CtrlCD3D.raycaster.build(m); let mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9];
              for (let t = 0; t < ix.triangles; t++) { if (!m.primitives[ix.P[t]].nodePath.includes('powerplant_left')) continue;
                for (let k = 0; k < 9; k++) { const a = k % 3; mn[a] = Math.min(mn[a], ix.V[t*9+k]); mx[a] = Math.max(mx[a], ix.V[t*9+k]); } }
              return mn.map((v, i) => (v + mx[i]) / 2); })""")
            tgt_ok = all(abs(st["camera"]["target"][i] - eng_box[i]) < 0.05 for i in range(3))
            check(st["camera"]["distance"] < d0 * 0.5 and tgt_ok and st["preset"] is None and st["selection"]["selectedId"] == "powerplant_left",
                  f"Aproximar enquadra a região: distância {d0:.1f} → {st['camera']['distance']:.1f} m, alvo no centro do grupo motor")
            (OUT / "f3-2-aproximar-motor.png").write_bytes(pg.locator(".ccd-a3d").screenshot())
            pg.click("[data-a3d-view=top]"); F2.wait_idle(pg)
            R = scan(pg)["regions"]
            d1 = F2.state(pg)["camera"]["distance"]
            pg.mouse.dblclick(R["vertical_stabilizer"]["x"] if "vertical_stabilizer" in R else R["horizontal_stabilizer_right"]["x"],
                              R["vertical_stabilizer"]["y"] if "vertical_stabilizer" in R else R["horizontal_stabilizer_right"]["y"])
            pg.wait_for_timeout(200); F2.wait_idle(pg)
            st = F2.state(pg)
            check(st["selection"]["selectedId"] == "empennage" and st["camera"]["distance"] < d1 * 0.6,
                  f"duplo clique seleciona e aproxima (empenagem; distância {d1:.1f} → {st['camera']['distance']:.1f} m)")

            # ---------- teclado na lista ----------
            pg.click("[data-a3d-view=perspective]"); F2.wait_idle(pg)
            pg.focus("[data-region-id=fuselage]")
            check(sel(pg)["hoverId"] == "fuselage", "foco no item da lista realça a região no 3D (hover sincronizado)")
            pg.keyboard.press("ArrowDown"); pg.wait_for_timeout(100)
            focused = pg.evaluate("document.activeElement.dataset.regionId")
            pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
            s = sel(pg)
            check(focused == "wing_left" and s["selectedId"] == "wing_left" and s["hoverId"] == "wing_left",
                  "seta para baixo percorre a lista; Enter seleciona (asa esquerda)")
            pg.keyboard.press("ArrowDown"); pg.keyboard.press("ArrowDown"); pg.keyboard.press(" "); pg.wait_for_timeout(200)
            check(sel(pg)["selectedId"] == "powerplant_left" and pg.evaluate("document.querySelector('[data-a3d=selection-live]').textContent").startswith("Grupo motor esquerdo"),
                  "Espaço seleciona (grupo motor esquerdo) e a seleção é anunciada ao leitor de tela")
            pg.hover("[data-region-id=landing_gear]"); pg.wait_for_timeout(150)
            check(sel(pg)["hoverId"] == "landing_gear", "mouse sobre o item da lista realça a região no 3D")
            live_png_ok = img_diff(F1.canvas_png(pg), base_png) > 0.002
            check(live_png_ok, "o realce vindo da lista aparece no canvas")

            # ---------- Escape: primeiro a dica, depois o modal ----------
            pg.mouse.move(10, 10); pg.wait_for_timeout(150)
            pg.click("[data-a3d-view=top]"); F2.wait_idle(pg)
            R = scan(pg)["regions"]
            hover(pg, R["fuselage_center"])
            vis_before = pg.locator("[data-a3d=tooltip]").is_visible()
            pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
            still_open = pg.locator("[data-a3d=overlay]").count() == 1
            check(vis_before and still_open and not pg.locator("[data-a3d=tooltip]").is_visible(),
                  "Escape fecha primeiro a dica e mantém o modal aberto")

            # ---------- rotação automática x seleção ----------
            pg.click("[data-a3d=autorotate]"); pg.wait_for_timeout(200)
            check(not F2.state(pg)["autoRotate"], "com uma região selecionada, a rotação automática não inicia")
            pg.click("[data-a3d=clear-selection]"); pg.wait_for_timeout(200)
            s = sel(pg)
            check(s["selectedId"] is None and pg.locator("[data-a3d=summary-empty]").is_visible()
                  and pg.eval_on_selector_all("[data-region-id][aria-pressed=true]", "e => e.length") == 0,
                  "Limpar seleção esvazia o resumo e a lista")
            pg.click("[data-a3d=autorotate]"); pg.wait_for_timeout(300)
            running = F2.state(pg)["autoRotate"]
            pg.mouse.move(10, 10)
            click(pg, R["fuselage_center"])
            check(running and not F2.state(pg)["autoRotate"], "clicar no modelo pausa a rotação automática")

            # ---------- materiais intactos e sem vazamento de estado ----------
            pg.click("[data-a3d=clear-selection]"); pg.mouse.move(10, 10)
            pg.click("[data-a3d=reset]"); F2.wait_idle(pg); pg.wait_for_timeout(200)
            after_png = F1.canvas_png(pg)
            materials1 = pg.evaluate("window.CtrlCD3D.loader.loadModel(window.CtrlCDAircraft3D.modelUrl()).then(m => JSON.stringify(m.primitives.map(p => p.material)))")
            d = img_diff(base_png, after_png)
            check(materials0 == materials1 and d < 0.001,
                  f"materiais do GLB inalterados; sem seleção, a imagem volta a ser idêntica à inicial ({d * 100:.3f} % de diferença)")
            snap = F2.state(pg)
            check(json.loads(json.dumps(snap)) == snap and all(isinstance(v, (str, bool, type(None))) or (isinstance(v, list) and all(isinstance(x, str) for x in v))
                                                        for k, v in snap["selection"].items() if k != "location"),
                  "estado do visualizador serializável; seleção guarda só IDs (strings)")
            t_pick = pg.evaluate("""(() => { const c = document.querySelector('.ccd-a3d__canvas').getBoundingClientRect();
              const t0 = performance.now(); let n = 0;
              for (let i = 0; i < 400; i++) { window.CtrlCDAircraft3D.pick(c.left + (i * 37) % c.width, c.top + (i * 53) % c.height); n++; }
              return (performance.now() - t0) / n; })()""")
            check(t_pick < 2.0, f"raycast rápido: {t_pick:.3f} ms por consulta (média de 400)")

            # ---------- fechar, reabrir: sem novo download, índice reaproveitado ----------
            pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
            check(pg.locator("[data-a3d=overlay]").count() == 0, "Escape (sem dica aberta) fecha o modal")
            pg.click("[data-fk=open-3d]"); F1.wait_ready(pg); F2.wait_idle(pg)
            pg.wait_for_function("window.CtrlCDAircraft3D.inspect().selection.raycastReady", timeout=10000)
            m2 = pg.evaluate("window.CtrlCDAircraft3D.lastMetrics")
            glb = [u for u in requests if u.endswith(".glb")]
            check(len(glb) == 1 and m2["downloads"] == 1 and m2["raycastBuildMs"] == 0,
                  f"reabrir não baixa o GLB de novo ({len(glb)} requisição) e reaproveita o índice de raycast")
            ext = [u for u in requests if not u.startswith(base)]
            check(not ext, f"nenhuma requisição externa ({len(ext)})")
            check(not errors, f"console sem erros ({len(errors)}){': ' + errors[0] if errors else ''}")
            pg.keyboard.press("Escape")

            # ---------- celular: toque ----------
            mctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
            mctx.add_init_script(F1.SESSION)
            mp = mctx.new_page()
            merr = []
            mp.on("pageerror", lambda e: merr.append(str(e)))
            F2.open_viewer(mp, base)
            mp.wait_for_function("window.CtrlCDAircraft3D.inspect().selection.raycastReady", timeout=30000)
            Rm = scan(mp, 6)["regions"]
            target = Rm.get("fuselage_center") or Rm.get("fuselage_forward")
            mp.touchscreen.tap(target["x"], target["y"]); mp.wait_for_timeout(500)
            over = mp.evaluate("document.documentElement.scrollWidth > window.innerWidth")
            stage_h = mp.locator(".ccd-a3d__stage").bounding_box()["height"]
            check(sel(mp)["selectedId"] == "fuselage" and not over and stage_h > 280 and not merr,
                  f"celular: toque seleciona a fuselagem; sem estouro horizontal; palco com {stage_h:.0f} px de altura")
            (OUT / "f3-3-celular.png").write_bytes(mp.screenshot())
            mctx.close()
            b.close()
    finally:
        s1.terminate()
    print(f"\n{sum(r.startswith('OK') for r in results)}/{len(results)} verificações OK")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()

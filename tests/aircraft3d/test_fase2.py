"""Testes da Fase 2 do visualizador 3D — navegação (Playwright + Chromium, WebGL por software).

Uso:  python3 tests/aircraft3d/test_fase2.py [pasta_de_capturas]
Os 40 testes da Fase 1 continuam em test_fase1.py (regressão).
"""
import io, json, math, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
LOCAL_API = "http://127.0.0.1:8001/"  # back-end local de usuários/registros (não é requisição externa)
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_fase1 as F1  # noqa: E402  (servidor, sessão fictícia e navegação até a Etapa 2)

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else F1.ROOT / "tests" / "aircraft3d" / "capturas"
OUT.mkdir(parents=True, exist_ok=True)
VIEWS = ["perspective", "isometric", "top", "bottom", "front", "rear", "left", "right"]
EXPECTED = {  # (yaw, pitch) das vistas, em radianos
    "perspective": (2.35, 0.38), "isometric": (3 * math.pi / 4, math.atan(1 / math.sqrt(2))),
    "top": (0.0, math.pi / 2 - 0.01), "bottom": (math.pi, -(math.pi / 2 - 0.01)),
    "front": (math.pi, 0.0), "rear": (0.0, 0.0), "left": (math.pi / 2, 0.0), "right": (-math.pi / 2, 0.0),
}
ok_all, results = True, []


def check(cond, msg):
    global ok_all
    results.append(("OK   " if cond else "FALHA") + " " + msg)
    print(results[-1]); ok_all &= bool(cond)


def ang_eq(a, b, tol=1e-3):
    d = (a - b) % (2 * math.pi)
    return min(d, 2 * math.pi - d) < tol


# ---------- projeção: réplica exata da câmera do renderer.js (para conferir a orientação) ----------
def project(cam, aspect, p, fov=math.radians(40)):
    t, d, yaw, pitch = cam["target"], cam["distance"], cam["yaw"], cam["pitch"]
    eye = [t[0] + d * math.cos(pitch) * math.cos(yaw), t[1] + d * math.sin(pitch), t[2] + d * math.cos(pitch) * math.sin(yaw)]
    z = [eye[i] - t[i] for i in range(3)]; zl = math.sqrt(sum(c * c for c in z)); z = [c / zl for c in z]
    up = [0, 1, 0]
    x = [up[1] * z[2] - up[2] * z[1], up[2] * z[0] - up[0] * z[2], up[0] * z[1] - up[1] * z[0]]
    xl = math.sqrt(sum(c * c for c in x)); x = [c / xl for c in x]
    y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]]
    v = [p[i] - eye[i] for i in range(3)]
    cx, cy, cz = sum(v[i] * x[i] for i in range(3)), sum(v[i] * y[i] for i in range(3)), sum(v[i] * z[i] for i in range(3))
    f = 1 / math.tan(fov / 2)
    return (f / aspect * cx / -cz, -(f * cy / -cz))   # x para a direita, y para baixo (tela)


def ink_bbox(png):
    im = Image.open(io.BytesIO(png)).convert("RGB")
    w, h = im.size
    small = im.resize((w // 4, h // 4))
    px = small.load()
    xs, ys = [], []
    for j in range(small.height):
        for i in range(small.width):
            r, g, b = px[i, j]
            if r > 110 and g > 110 and b > 110:
                xs.append(i); ys.append(j)
    if not xs:
        return None
    return (min(xs) / small.width, min(ys) / small.height, max(xs) / small.width, max(ys) / small.height)


def state(pg):
    return pg.evaluate("window.CtrlCDAircraft3D.inspect()")


def wait_idle(pg, timeout=5000):
    pg.wait_for_function("(() => { const s = window.CtrlCDAircraft3D.inspect(); return s && s.ready && !s.animating; })()", timeout=timeout)
    pg.wait_for_timeout(200)


def open_viewer(pg, base):
    F1.goto_step2(pg, base)
    pg.click("[data-fk=open-3d]")
    F1.wait_ready(pg, 60000)
    wait_idle(pg)


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
            open_viewer(pg, base)

            n_views = pg.locator("[data-a3d-view]").count()
            pressed = pg.get_attribute("[data-a3d-view=perspective]", "aria-pressed")
            check(n_views == 8 and pressed == "true", f"8 vistas na barra; Perspectiva ativa ao abrir ({n_views} botões)")
            bounds = pg.evaluate("window.CtrlCD3D.loader.loadModel(window.CtrlCDAircraft3D.modelUrl()).then(m => m.bounds)")
            mn, mx, c = bounds["min"], bounds["max"], bounds["center"]
            nose, tail = [mn[0], c[1], 0.0], [mx[0], c[1], 0.0]
            ltip, rtip = [c[0], c[1], mx[2]], [c[0], c[1], mn[2]]   # +Z = asa esquerda

            # ---------- as 8 vistas ----------
            box = pg.locator(".ccd-a3d__canvas").bounding_box()
            aspect = box["width"] / box["height"]
            shots = []
            orient_ok = {}
            for v in VIEWS:
                pg.click(f"[data-a3d-view={v}]")
                if v == "top":
                    pg.wait_for_timeout(120)
                    mid = state(pg)
                    check(mid["animating"], "transição animada entre vistas (câmera em movimento no meio da troca)")
                wait_idle(pg)
                s = state(pg)
                ey, ep = EXPECTED[v]
                cam = s["camera"]
                ok_angles = ang_eq(cam["yaw"], ey, 2e-3) and abs(cam["pitch"] - ep) < 2e-3
                ok_target = all(abs(cam["target"][i] - c[i]) < 1e-3 for i in range(3))
                png = pg.locator(".ccd-a3d__canvas").screenshot()
                shots.append((v, png))
                bb = ink_bbox(png)
                inside = bb is not None and bb[0] > 0.01 and bb[1] > 0.01 and bb[2] < 0.99 and bb[3] < 0.99
                size = (max(bb[2] - bb[0], bb[3] - bb[1]) if bb else 0)
                P = {k: project(cam, aspect, q) for k, q in (("nose", nose), ("tail", tail), ("L", ltip), ("R", rtip))}
                rule = {
                    "top": P["nose"][1] < P["tail"][1] and P["L"][0] < P["R"][0],
                    "bottom": P["nose"][1] < P["tail"][1] and P["L"][0] > P["R"][0],
                    "front": P["L"][0] > P["R"][0], "rear": P["L"][0] < P["R"][0],
                    "left": P["nose"][0] < P["tail"][0], "right": P["nose"][0] > P["tail"][0],
                    "perspective": True, "isometric": True,
                }[v]
                orient_ok[v] = rule
                check(s["preset"] == v and pg.get_attribute(f"[data-a3d-view={v}]", "aria-pressed") == "true"
                      and ok_angles and ok_target and inside and size > 0.35 and rule,
                      f"vista {v}: ângulos {math.degrees(cam['yaw']) % 360:.1f}°/{math.degrees(cam['pitch']):.1f}°, alvo no centro, "
                      f"aeronave inteira na tela (ocupa {size * 100:.0f} %), orientação {'correta' if rule else 'ERRADA'}")
            # prancha com as 8 vistas
            ims = [Image.open(io.BytesIO(pn)).convert("RGB") for _, pn in shots]
            w, h = ims[0].size
            sheet = Image.new("RGB", (w * 4 // 2, h * 2 // 2), "white")
            for i, im in enumerate(ims):
                sheet.paste(im.resize((w // 2, h // 2)), ((i % 4) * w // 2, (i // 4) * h // 2))
            sheet.save(OUT / "f2-1-oito-vistas.png")
            check(pg.evaluate("window.CtrlCD3D.loader.downloads") == 1 and len([u for u in requests if u.endswith('.glb')]) == 1,
                  "trocar entre as 8 vistas não baixa o GLB de novo (1 download)")

            # ---------- zoom por botões e limites ----------
            pg.click("[data-a3d-view=perspective]"); wait_idle(pg)
            d0 = state(pg)["camera"]["distance"]
            pg.click("[data-a3d=zoom-in]"); wait_idle(pg)
            d1 = state(pg)["camera"]["distance"]
            pg.click("[data-a3d=zoom-out]"); wait_idle(pg); pg.click("[data-a3d=zoom-out]"); wait_idle(pg)
            d2 = state(pg)["camera"]["distance"]
            check(abs(d1 - d0 * 0.8) < 1e-3 and d2 > d1, f"botões − e + ajustam o zoom ({d0:.1f} → {d1:.1f} → {d2:.1f} m)")
            for _ in range(25):
                pg.click("[data-a3d=zoom-in]"); pg.wait_for_timeout(30)
            wait_idle(pg)
            dmin = state(pg)["camera"]["distance"]
            check(abs(dmin - bounds["radius"] * 0.45) < 1e-3, f"zoom respeita a distância mínima ({dmin:.2f} m = 0,45 × raio)")

            # ---------- teclado no canvas ----------
            pg.click("[data-a3d-view=perspective]"); wait_idle(pg)
            pg.focus(".ccd-a3d__canvas")
            y0 = state(pg)["camera"]["yaw"]
            pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(150)
            s = state(pg)
            check(abs(s["camera"]["yaw"] - y0 - math.radians(5)) < 1e-4 and s["preset"] is None
                  and pg.locator("[data-a3d-view][aria-pressed=true]").count() == 0,
                  "seta → gira 5° e desmarca a vista predefinida (vista livre)")
            t0 = s["camera"]["target"]; dist0 = s["camera"]["distance"]
            pg.keyboard.press("Shift+ArrowLeft"); pg.keyboard.press("+"); pg.wait_for_timeout(150)
            s = state(pg)
            check(s["camera"]["target"] != t0 and s["camera"]["distance"] < dist0, "Shift+seta move e a tecla + aproxima")
            pg.keyboard.press("-"); pg.keyboard.press("ArrowUp"); pg.wait_for_timeout(150)

            # ---------- Ajustar à tela ----------
            for _ in range(4):
                pg.keyboard.press("Shift+ArrowRight"); pg.keyboard.press("+")
            pg.wait_for_timeout(200)
            before = state(pg)["camera"]
            pg.click("[data-a3d=fit]"); wait_idle(pg)
            after = state(pg)["camera"]
            bb = ink_bbox(pg.locator(".ccd-a3d__canvas").screenshot())
            check(all(abs(after["target"][i] - c[i]) < 1e-3 for i in range(3)) and ang_eq(after["yaw"], before["yaw"]) and abs(after["pitch"] - before["pitch"]) < 1e-6
                  and bb and bb[0] > 0.01 and bb[2] < 0.99 and bb[1] > 0.01 and bb[3] < 0.99,
                  "Ajustar à tela recentraliza e enquadra a aeronave inteira, mantendo a direção de observação")

            # ---------- tela cheia (nativa) ----------
            pg.click("[data-a3d-view=left]"); wait_idle(pg)
            cam_before = state(pg)["camera"]
            pg.click("[data-a3d=fullscreen]"); pg.wait_for_timeout(700)
            fs = pg.evaluate("document.fullscreenElement && document.fullscreenElement.dataset.a3d")
            # Fase 3: o canvas divide a largura com a lista e o resumo; quem ocupa a tela é o modal (.ccd-a3d)
            cbox = pg.locator(".ccd-a3d").bounding_box()
            vw = pg.evaluate("[window.innerWidth, window.innerHeight]")
            s = state(pg)
            check(s["fullscreen"] and fs == "overlay" and cbox["width"] >= vw[0] - 2 and s["preset"] == "left"
                  and s["camera"] == cam_before and pg.get_attribute("[data-a3d=fullscreen]", "aria-pressed") == "true",
                  f"tela cheia: modal ocupa a tela ({cbox['width']:.0f} px de {vw[0]}), vista e câmera preservadas "
                  f"[fs={s['fullscreen']} el={fs} preset={s['preset']} cam={s['camera'] == cam_before} "
                  f"pressed={pg.get_attribute('[data-a3d=fullscreen]', 'aria-pressed')}]")
            pg.screenshot(path=str(OUT / "f2-2-tela-cheia.png"))
            pg.click("[data-a3d=fullscreen]"); pg.wait_for_timeout(700)
            check(not state(pg)["fullscreen"] and pg.evaluate("document.fullscreenElement") is None and pg.locator(".ccd-a3d").count() == 1,
                  "sair da tela cheia volta ao modal, sem fechá-lo")

            # ---------- rotação automática ----------
            check(pg.get_attribute("[data-a3d=autorotate]", "aria-pressed") == "false" and not state(pg)["autoRotate"],
                  "rotação automática desligada por padrão")
            pg.click("[data-a3d=autorotate]"); ya = state(pg)["camera"]["yaw"]; pg.wait_for_timeout(1200)
            s = state(pg)
            check(s["autoRotate"] and s["camera"]["yaw"] > ya + math.radians(3) and "Pausar" in pg.inner_text("[data-a3d=autorotate]"),
                  f"Iniciar rotação: câmera gira ({math.degrees(s['camera']['yaw'] - ya):.1f}° em 1,2 s) e o botão vira 'Pausar rotação'")
            cb = pg.locator(".ccd-a3d__canvas").bounding_box()
            pg.mouse.move(cb["x"] + 50, cb["y"] + cb["height"] - 80); pg.mouse.down(); pg.mouse.up()
            yb = state(pg)["camera"]["yaw"]; pg.wait_for_timeout(1200)
            s = state(pg)
            check(not s["autoRotate"] and abs(s["camera"]["yaw"] - yb) < 1e-3 and "Iniciar" in pg.inner_text("[data-a3d=autorotate]"),
                  "primeiro contato do usuário pausa a rotação e ela não volta sozinha")
            pg.click("[data-a3d=autorotate]"); pg.wait_for_timeout(300)
            pg.click("[data-a3d-view=front]"); wait_idle(pg)
            check(not state(pg)["autoRotate"] and state(pg)["preset"] == "front", "escolher uma vista pausa a rotação")
            glb = [u for u in requests if u.endswith(".glb")]
            check(len(glb) == 1 and not errors and all(u.startswith("http://127.0.0.1") for u in requests),
                  f"sem novo download, sem erros de console e sem requisições externas {errors[:2]}")
            pg.close()

            # ---------- tela cheia simulada (navegador sem Fullscreen API) ----------
            pg = ctx.new_page()
            pg.add_init_script("Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false });")
            open_viewer(pg, base)
            pg.click("[data-a3d=fullscreen]"); pg.wait_for_timeout(400)
            sb = pg.locator(".ccd-a3d").bounding_box()
            check(pg.evaluate("document.querySelector('.ccd-a3d-overlay').classList.contains('is-pseudo-fullscreen')")
                  and sb["width"] >= 1438 and sb["height"] >= 898, "sem Fullscreen API: tela cheia simulada por CSS")
            pg.click("[data-a3d=fullscreen]"); pg.wait_for_timeout(300)
            check(not pg.evaluate("document.querySelector('.ccd-a3d-overlay').classList.contains('is-pseudo-fullscreen')"),
                  "sair da tela cheia simulada")
            pg.close()

            # ---------- movimento reduzido ----------
            rctx = b.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
            rctx.add_init_script(F1.SESSION)
            pg = rctx.new_page()
            open_viewer(pg, base)
            pg.click("[data-a3d-view=top]"); pg.wait_for_timeout(50)
            s = state(pg)
            check(not s["animating"] and abs(s["camera"]["pitch"] - EXPECTED["top"][1]) < 1e-6,
                  "prefers-reduced-motion: troca de vista instantânea")
            check(pg.is_disabled("[data-a3d=autorotate]") and "movimento reduzido" in (pg.get_attribute("[data-a3d=autorotate]", "title") or ""),
                  "prefers-reduced-motion: rotação automática indisponível, com o motivo")
            rctx.close()

            # ---------- celular ----------
            mctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
            mctx.add_init_script(F1.SESSION)
            pg = mctx.new_page()
            F1.goto_step2(pg, base)
            pg.locator("[data-fk=open-3d]").tap(); F1.wait_ready(pg, 60000); wait_idle(pg)
            overflow = pg.evaluate("document.querySelector('.ccd-a3d').scrollWidth > document.querySelector('.ccd-a3d').clientWidth")
            small = pg.evaluate("[...document.querySelectorAll('.ccd-a3d__view, .ccd-a3d__tool')].filter(b => { const r = b.getBoundingClientRect(); return r.width < 32 || r.height < 32; }).length")
            pg.locator("[data-a3d-view=top]").tap(); wait_idle(pg)
            check(not overflow and small == 0 and state(pg)["preset"] == "top",
                  "celular: barra sem estouro horizontal, alvos de toque ≥ 32 px, vista por toque")
            pg.screenshot(path=str(OUT / "f2-3-celular.png"))
            mctx.close()
            b.close()
    finally:
        s1.terminate()
    (OUT / "resultado_fase2.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\nAPROVADO" if ok_all else "\nREPROVADO", f"({sum(r.startswith('OK') for r in results)}/{len(results)})")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()

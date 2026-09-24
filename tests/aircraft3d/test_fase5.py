"""Testes da Fase 5 do visualizador 3D — marcador da não conformidade (Playwright + Chromium).

Uso:  python3 tests/aircraft3d/test_fase5.py [pasta_de_capturas]
Regressão: test_fase1..4 e test_hierarquia_2d rodam separados.
"""
import io, json, math, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
LOCAL_API = "http://127.0.0.1:8001/"  # back-end local de usuários/registros (não é requisição externa)
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_fase1 as F1  # noqa: E402
import test_fase2 as F2  # noqa: E402
import test_fase3 as F3  # noqa: E402
import test_fase4 as F4  # noqa: E402

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else F1.ROOT / "tests" / "aircraft3d" / "capturas"
OUT.mkdir(parents=True, exist_ok=True)
CONFIRM = "Localização confirmada pelo usuário."
PENDING = "Ponto marcado, aguardando confirmação."
ok_all, results = True, []

PIN_JS = """(() => {
  const s = window.CtrlCDAircraft3D.inspect(); const mk = s.selection.marker; if (!mk) return null;
  const c = document.querySelector('.ccd-a3d__canvas').getBoundingClientRect();
  const CU = window.CtrlCD3D.cameraUtils; const cam = s.camera; const eye = CU.eyePosition(cam);
  const d = Math.hypot(...mk.worldPosition.map((v, i) => v - eye[i])) * 0.045;
  const tip = mk.worldPosition.map((v, i) => v + mk.surfaceNormal[i] * d);
  const px = (p) => { const q = CU.projectPoint(cam, 40 * Math.PI / 180, c.width / c.height, p);
    return { x: c.left + (q.ndcX + 1) / 2 * c.width, y: c.top + (1 - q.ndcY) / 2 * c.height }; };
  return { tip: px(tip), base: px(mk.worldPosition), canvas: { x: c.left, y: c.top, w: c.width, h: c.height } };
})()"""


def check(cond, msg):
    global ok_all
    results.append(("OK   " if cond else "FALHA") + " " + msg)
    print(results[-1]); ok_all &= bool(cond)


def sel(pg):
    return F2.state(pg)["selection"]


def pin(pg):
    return pg.evaluate(PIN_JS)


def disc_pixels(pg, pt, kind="blue", half=18):
    """pixels da cor do disco numa janela ao redor da ponta do pino (captura do canvas)."""
    png = F1.canvas_png(pg)
    im = Image.open(io.BytesIO(png)).convert("RGB")
    c = pin(pg)["canvas"]
    cx, cy = int(pt["x"] - c["x"]), int(pt["y"] - c["y"])
    n = 0
    for y in range(max(0, cy - half), min(im.height, cy + half)):
        for x in range(max(0, cx - half), min(im.width, cx + half)):
            r, g, b = im.getpixel((x, y))
            if kind == "blue" and b > 200 and r < 110 and 95 < g < 170:
                n += 1
            if kind == "green" and g > 130 and r < 90 and b < 140 and g > b + 20:
                n += 1
    return n


def text(pg, s):
    return (pg.locator(s).text_content() or "").strip()


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

            mark = pg.locator("[data-a3d=mark-mode]")
            check(pg.evaluate("window.CtrlCDAircraft3D.version").startswith("fase-") and mark.is_disabled()
                  and "grande região" in text(pg, "[data-a3d=mark-hint]"),
                  "sem região confirmada, 'Marcar ponto da não conformidade' fica desabilitado, com o motivo")

            # ---------- confirmar a asa esquerda e entrar no modo ----------
            F4.list_select(pg, "wing_left"); F4.confirm(pg)
            pg.click("[data-a3d-view=top]"); F2.wait_idle(pg)
            R = F3.scan(pg)["regions"]
            mark.click(); pg.wait_for_timeout(150)
            s = sel(pg)
            check(s["markMode"] and mark.get_attribute("aria-pressed") == "true" and pg.locator("[data-a3d=crosshair]").is_visible()
                  and pg.locator("[data-a3d=mark-center]").is_visible(),
                  "modo de marcação ativo: botão pressionado, mira central e 'Marcar no centro da tela' visíveis")
            F3.hover(pg, R["wing_left"])
            t_ok = text(pg, "[data-a3d=mark-tooltip]")
            F3.hover(pg, R["engine_left"])
            t_out = text(pg, "[data-a3d=mark-tooltip]")
            check("Clique para marcar o ponto aqui" in t_ok and "Fora de Asa esquerda" in t_out,
                  f"dica do modo: sobre a asa '{t_ok}'; sobre o motor '{t_out}'")
            F3.click(pg, R["engine_left"])
            check(sel(pg)["marker"] is None and sel(pg)["markMode"],
                  "clique fora da região confirmada (motor) não marca o ponto e o modo continua")
            cam0 = F2.state(pg)["camera"]
            pk = pg.evaluate("([x, y]) => window.CtrlCDAircraft3D.pick(x, y)", [R["wing_left"]["x"], R["wing_left"]["y"]])
            F3.click(pg, R["wing_left"])
            s = sel(pg); mk = s["marker"]
            eye = pg.evaluate("window.CtrlCD3D.cameraUtils.eyePosition(window.CtrlCDAircraft3D.inspect().camera)")
            to_eye = [eye[i] - mk["worldPosition"][i] for i in range(3)] if mk else [0, 0, 0]
            nlen = math.sqrt(sum(v * v for v in mk["surfaceNormal"])) if mk else 0
            check(mk and mk["regionId"] == "wing_left" and mk["meshRegionId"] == "wing_left" and mk["meshName"] == "wing_left"
                  and all(abs(mk["worldPosition"][i] - pk["point"][i]) < 1e-3 for i in range(3))
                  and abs(nlen - 1) < 1e-3 and sum(mk["surfaceNormal"][i] * to_eye[i] for i in range(3)) > 0
                  and mk["referenceView"] == "top" and mk["confirmed"] is False,
                  f"clique na asa marca o ponto: malha {mk and mk['meshName']}, posição {mk and mk['worldPosition']}, normal unitária voltada à câmera, vista 'top'")
            local_ok = pg.evaluate("""(() => { const mk = window.CtrlCDAircraft3D.inspect().selection.marker;
              return window.CtrlCD3D.loader.loadModel(window.CtrlCDAircraft3D.modelUrl()).then(m => {
                const prim = m.primitives.find(p => p.nodeName === mk.meshName);
                const w = window.CtrlCD3D.math.transformPoint(prim.world, mk.localPosition);
                return w.every((v, i) => Math.abs(v - mk.worldPosition[i]) < 1e-3); }); })()""")
            check(local_ok, "posição local × matriz da malha = posição global (conversão conferida)")
            check(not s["markMode"] and text(pg, "[data-a3d=marker-status]") == PENDING
                  and not pg.locator("[data-a3d=confirm-point]").is_disabled() and pg.locator("[data-a3d=finalize-partial]").is_disabled()
                  and F3.cam_eq(cam0, F2.state(pg)["camera"]),
                  f"após marcar: modo encerrado, '{PENDING}', Confirmar ponto habilitado, Finalizar parcial bloqueado, câmera parada")
            pp = pin(pg)
            n_top = disc_pixels(pg, pp["tip"])
            check(n_top > 40, f"marcador azul desenhado na ponta do pino ({n_top} pixels azuis)")
            (OUT / "f5-1-ponto-marcado.png").write_bytes(pg.locator(".ccd-a3d").screenshot())
            # superfície e tamanho estável
            ray_d = pg.evaluate("([x, y]) => window.CtrlCDAircraft3D.pick(x, y)", [pp["base"]["x"], pp["base"]["y"]])
            dist_mk = math.sqrt(sum((mk["worldPosition"][i] - eye[i]) ** 2 for i in range(3)))
            check(ray_d and abs(ray_d["distance"] - dist_mk) < 0.05,
                  f"o ponto está sobre a superfície (raio da câmera até o ponto: {ray_d and ray_d['distance']:.3f} m × {dist_mk:.3f} m)")
            pg.click("[data-a3d=zoom-in]"); F2.wait_idle(pg); pg.click("[data-a3d=zoom-in]"); F2.wait_idle(pg)
            n_zoom = disc_pixels(pg, pin(pg)["tip"])
            check(n_zoom > 40 and 0.6 < n_zoom / n_top < 1.6, f"tamanho estável na tela após o zoom ({n_top} → {n_zoom} pixels)")
            # girar e trocar de vista: o ponto não muda
            for v in ("perspective", "left", "rear"):
                pg.click(f"[data-a3d-view={v}]"); F2.wait_idle(pg)
            same = sel(pg)["marker"] == mk
            n_rear = disc_pixels(pg, pin(pg)["tip"])
            check(same and n_rear > 10, f"trocar de vista preserva a posição 3D; o pino continua visível (vista traseira: {n_rear} pixels)")
            (OUT / "f5-2-ponto-outra-vista.png").write_bytes(F1.canvas_png(pg))

            # ---------- arrastar o marcador ----------
            pg.click("[data-a3d-view=top]"); F2.wait_idle(pg)
            pp = pin(pg); cam1 = F2.state(pg)["camera"]; before = sel(pg)["marker"]["worldPosition"]
            pg.mouse.move(pp["tip"]["x"], pp["tip"]["y"]); pg.mouse.down()
            pg.mouse.move(pp["tip"]["x"] - 40, pp["tip"]["y"] + 25, steps=8); pg.mouse.up(); pg.wait_for_timeout(300)
            after = sel(pg)["marker"]
            moved = math.dist(before, after["worldPosition"])
            check(moved > 0.3 and after["meshRegionId"] == "wing_left" and F3.cam_eq(cam1, F2.state(pg)["camera"])
                  and "reposicionado" in pg.evaluate("document.querySelector('[data-a3d=selection-live]').textContent"),
                  f"arrastar o pino move o ponto sobre a asa ({moved:.2f} m) sem girar a câmera")
            pg.mouse.move(pp["tip"]["x"] + 120, pp["tip"]["y"] - 120); pg.mouse.down()
            pg.mouse.move(pp["tip"]["x"] + 180, pp["tip"]["y"] - 100, steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
            check(sel(pg)["marker"] == after and not F3.cam_eq(cam1, F2.state(pg)["camera"], 1e-4),
                  "arrastar longe do pino gira a câmera e não mexe no ponto")

            # ---------- reposicionar e remover ----------
            pg.click("[data-a3d-view=top]"); F2.wait_idle(pg)
            R = F3.scan(pg)["regions"]
            check(text(pg, "[data-a3d=mark-mode]") == "Reposicionar", "com ponto marcado, o botão vira 'Reposicionar'")
            mark.click(); pg.wait_for_timeout(100)
            # ponto da asa longe do pino (perto do pino o gesto vira arrasto do marcador)
            tipnow = pin(pg)["tip"]
            cands = [{"x": R["wing_left"]["x"] + dx, "y": R["wing_left"]["y"] + dy} for dx in (-40, 0, 40) for dy in (-15, 0, 15)]
            cands = [c for c in cands if pg.evaluate("([x, y]) => { const p = window.CtrlCDAircraft3D.pick(x, y); return !!p && p.leafId === 'wing_left'; }", [c["x"], c["y"]])]
            wl = max(cands, key=lambda c: math.dist((c["x"], c["y"]), (tipnow["x"], tipnow["y"])))
            F3.click(pg, wl)
            m2 = sel(pg)["marker"]
            check(m2 and m2["worldPosition"] != after["worldPosition"] and not sel(pg)["markMode"],
                  "Reposicionar: o próximo clique na asa move o ponto e encerra o modo")
            mark.click(); pg.wait_for_timeout(100)
            pg.mouse.move(5, 5); pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
            check(not sel(pg)["markMode"] and pg.locator("[data-a3d=overlay]").count() == 1,
                  "Escape sai do modo de marcação sem fechar o modal")
            pg.click("[data-a3d=remove-marker]"); pg.wait_for_timeout(150)
            check(sel(pg)["marker"] is None and text(pg, "[data-a3d=mark-mode]") == "Marcar ponto da não conformidade"
                  and not pg.locator("[data-a3d=finalize-partial]").is_disabled(),
                  "Remover apaga o ponto; Finalizar parcial volta a ficar disponível")

            # ---------- teclado: marcar no centro da tela; troca de nível remove o ponto fora da região ----------
            pg.click("[data-crumb='0']"); pg.wait_for_timeout(200); F2.wait_idle(pg)
            check(pg.locator("[data-a3d=mark-mode]").is_disabled(), "na aeronave inteira não há como marcar")
            F4.list_select(pg, "fuselage")
            pg.focus("[data-a3d=confirm-region]"); pg.keyboard.press("Enter"); F2.wait_idle(pg)
            pg.focus("[data-a3d=mark-mode]"); pg.keyboard.press("Enter"); pg.wait_for_timeout(150)
            pg.focus("[data-a3d=mark-center]"); pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
            mk3 = sel(pg)["marker"]
            check(mk3 and mk3["regionId"] == "fuselage" and mk3["meshRegionId"].startswith("fuselage_")
                  and pg.evaluate("document.activeElement.dataset.a3d") == "confirm-point",
                  f"teclado: 'Marcar no centro da tela' marca na fuselagem ({mk3 and mk3['meshRegionId']}) e o foco vai para Confirmar ponto")
            here = mk3["meshRegionId"]
            F4.list_select(pg, here); F4.confirm(pg)
            check(sel(pg)["marker"] and sel(pg)["marker"]["regionId"] == here,
                  f"confirmar a seção que contém o ponto ({here}) mantém o ponto, agora nessa região")
            pg.click("[data-a3d=back-level]"); pg.wait_for_timeout(200); F2.wait_idle(pg)
            other = "fuselage_forward" if here != "fuselage_forward" else "fuselage_rear"
            F4.list_select(pg, other); F4.confirm(pg)
            live = pg.evaluate("document.querySelector('[data-a3d=selection-live]').textContent")
            check(sel(pg)["marker"] is None and "foi removido" in live,
                  f"confirmar outra seção ({other}) remove o ponto que ficou fora dela, com aviso")

            # ---------- confirmar o ponto ----------
            pg.click("[data-a3d-view=left]"); F2.wait_idle(pg)
            mark.click(); pg.wait_for_timeout(100)
            pg.locator("[data-a3d=mark-center]").click(); pg.wait_for_timeout(200)
            if not sel(pg)["marker"]:
                pg.click("[data-a3d=fit]"); F2.wait_idle(pg)
                Rl = F3.scan(pg, 6)["regions"]
                F3.click(pg, Rl[other])
            mk4 = sel(pg)["marker"]
            pg.click("[data-a3d=confirm-point]"); pg.wait_for_timeout(250)
            s = sel(pg); loc = s["location"]
            check(mk4 and s["marker"]["confirmed"] and text(pg, "[data-a3d=marker-status]") == CONFIRM
                  and text(pg, "[data-a3d=confirm-text]") == CONFIRM,
                  f"Confirmar ponto: marcador confirmado e o texto exato '{CONFIRM}'")
            expected_dp = dict(s["marker"])
            check(loc and loc["partial"] is False and loc["confirmed"] and loc["confirmedBy"] == "user"
                  and loc["locationIds"] == ["fuselage", other] and loc["defectPosition"] == expected_dp
                  and json.loads(json.dumps(loc)) == loc and "Com ponto marcado" in text(pg, "[data-a3d=partial-badge]"),
                  f"localização com ponto: partial=false, defectPosition completo e serializável ({', '.join(sorted(expected_dp))})")
            pp = pin(pg)
            n_green = disc_pixels(pg, pp["tip"], "green")
            check(n_green > 40 and disc_pixels(pg, pp["tip"], "blue") < 10, f"marcador verde depois da confirmação ({n_green} pixels verdes)")
            (OUT / "f5-3-ponto-confirmado.png").write_bytes(pg.locator(".ccd-a3d").screenshot())
            cam2 = F2.state(pg)["camera"]
            pg.mouse.move(pp["tip"]["x"], pp["tip"]["y"]); pg.mouse.down()
            pg.mouse.move(pp["tip"]["x"] + 40, pp["tip"]["y"], steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
            check(sel(pg)["marker"] == s["marker"] and not F3.cam_eq(cam2, F2.state(pg)["camera"], 1e-4)
                  and pg.locator("[data-a3d=remove-marker]").is_disabled() and pg.locator("[data-a3d=mark-mode]").is_disabled(),
                  "ponto confirmado não se move (o arrasto gira a vista); Remover e Reposicionar bloqueados")
            modal = pg.locator(".ccd-a3d").inner_text().lower()
            check("validad" not in modal and "identificad" not in modal, "sem textos de validação técnica ou identificação automática")
            pg.click("[data-a3d=edit-location]"); pg.wait_for_timeout(200)
            check(sel(pg)["location"] is None and sel(pg)["marker"]["confirmed"] is False and text(pg, "[data-a3d=marker-status]") == PENDING,
                  "Editar localização: o ponto volta a aguardar confirmação (azul)")
            check(len([u for u in requests if u.endswith(".glb")]) == 1 and not [u for u in requests if not u.startswith(base)],
                  "1 download do GLB; nenhuma requisição externa")
            check(not errors, f"console sem erros ({len(errors)}){': ' + errors[0] if errors else ''}")

            # ---------- celular: toque ----------
            mctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
            mctx.add_init_script(F1.SESSION)
            mp = mctx.new_page(); merr = []
            mp.on("pageerror", lambda e: merr.append(str(e)))
            F2.open_viewer(mp, base)
            mp.wait_for_function("window.CtrlCDAircraft3D.inspect().selection.raycastReady", timeout=30000)
            mp.locator("[data-region-id=fuselage]").tap(); mp.locator("[data-a3d=confirm-region]").tap(); mp.wait_for_timeout(900)
            mp.locator("[data-a3d=mark-mode]").tap(); mp.wait_for_timeout(900)   # (Fase 7) o palco volta à vista ao entrar no modo
            Rm = F3.scan(mp, 6)["regions"]
            fz = next((Rm[k] for k in ("fuselage_center", "fuselage_forward", "fuselage_rear") if k in Rm), None)
            if fz:
                mp.touchscreen.tap(fz["x"], fz["y"]); mp.wait_for_timeout(400)
            mm = sel(mp)["marker"]
            over = mp.evaluate("document.documentElement.scrollWidth > window.innerWidth")
            check(mm is not None and not over and not merr, "celular: toque no modo de marcação marca o ponto; sem estouro horizontal")
            (OUT / "f5-4-celular.png").write_bytes(mp.screenshot())
            mctx.close()
            b.close()
    finally:
        s1.terminate()
    print(f"\n{sum(r.startswith('OK') for r in results)}/{len(results)} verificações OK")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()

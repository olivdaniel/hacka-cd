"""Testes da Fase 4 do visualizador 3D — hierarquia (Playwright + Chromium, WebGL por software).

Uso:  python3 tests/aircraft3d/test_fase4.py [pasta_de_capturas]
Regressão: test_fase1.py (40), test_fase2.py (28) e test_fase3.py (43) rodam separados.
"""
import io, json, sys, time
from collections import Counter
from pathlib import Path
from playwright.sync_api import sync_playwright
LOCAL_API = "http://127.0.0.1:8001/"  # back-end local de usuários/registros (não é requisição externa)
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_fase1 as F1  # noqa: E402
import test_fase2 as F2  # noqa: E402
import test_fase3 as F3  # noqa: E402

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else F1.ROOT / "tests" / "aircraft3d" / "capturas"
OUT.mkdir(parents=True, exist_ok=True)
CONFIRM = "Localização confirmada pelo usuário."
ok_all, results = True, []


def check(cond, msg):
    global ok_all
    results.append(("OK   " if cond else "FALHA") + " " + msg)
    print(results[-1]); ok_all &= bool(cond)


def sel(pg):
    return F2.state(pg)["selection"]


def crumbs(pg):
    return pg.eval_on_selector_all("[data-crumb]", "els => els.map(e => [e.textContent, e.tagName, e.getAttribute('aria-current')])")


def list_ids(pg):
    return pg.eval_on_selector_all("[data-region-id]", "els => els.map(e => e.dataset.regionId)")


def list_select(pg, rid):
    pg.focus(f"[data-region-id={rid}]"); pg.keyboard.press("Enter"); pg.wait_for_timeout(150)


def confirm(pg):
    pg.click("[data-a3d=confirm-region]"); pg.wait_for_timeout(150); F2.wait_idle(pg)


def green_pixels(png):
    im = Image.open(io.BytesIO(png)).convert("RGB").resize((404, 346))
    return sum(1 for r, g, b in im.getdata() if g > r + 45 and g > b + 15)


def lum_at(png, box, pt):
    im = Image.open(io.BytesIO(png)).convert("L")
    sx, sy = im.width / box["width"], im.height / box["height"]
    x, y = int((pt["x"] - box["x"]) * sx), int((pt["y"] - box["y"]) * sy)
    vals = [im.getpixel((x + dx, y + dy)) for dx in (-2, 0, 2) for dy in (-2, 0, 2)]
    return sum(vals) / len(vals)


def text(pg, sel_):
    return (pg.locator(sel_).text_content() or "").strip()


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

            # ---------- dados da hierarquia ----------
            data = pg.evaluate("""window.CtrlCD3D.loader.loadModel(window.CtrlCDAircraft3D.modelUrl()).then(m => {
              const RG = window.CtrlCD3D.regions;
              const regs = RG.AIRCRAFT_REGIONS.map(r => ({ id: r.id, level: r.level, parentId: r.parentId || null, label: r.label }));
              const meshOk = Object.keys(RG.AIRCRAFT_MESH_MAP).every(id => RG.nodeFor(id, m.nodeNames) !== null);
              const noGeo = regs.filter(r => !RG.geometryFor(r.id, m.nodeNames).own).map(r => r.id);
              return { regs, meshOk, noGeo, nodeNames: m.nodeNames };
            })""")
            regs = data["regs"]
            by = {r["id"]: r for r in regs}
            lv = Counter(r["level"] for r in regs)
            parents_ok = all(r["parentId"] is None or (r["parentId"] in by and by[r["parentId"]]["level"] == r["level"] - 1) for r in regs)
            check(len(regs) == 87 and lv == Counter({1: 1, 2: 7, 3: 24, 4: 21, 5: 34}) and parents_ok and len({r["id"] for r in regs}) == 87,
                  f"hierarquia de 87 regiões (níveis {dict(sorted(lv.items()))}); cada pai existe e está um nível acima; IDs únicos")
            check(data["meshOk"] and "wing_left_leading_edge" in data["noGeo"] and "slat_left" in data["noGeo"] and "engine_left" not in data["noGeo"],
                  f"as 18 malhas do mapa existem no GLB; {len(data['noGeo'])} regiões sem geometria própria (seções da asa, níveis 4 e 5) são realçadas pela região-mãe")
            ids = [r["id"] for r in regs]
            check(sum(1 for i in ids if i in ("wing_left", "wing_right")) == 2 and sum(1 for i in ids if i.startswith("engine_") and by[i]["level"] == 3) == 2,
                  "2 asas e 2 motores na hierarquia (mesmos IDs do protótipo 2D)")

            # ---------- estado inicial ----------
            c0 = crumbs(pg)
            check(c0 == [["Aeronave", "SPAN", "step"]] and pg.locator("[data-a3d=back-level]").is_disabled()
                  and pg.locator("[data-a3d=finalize-partial]").is_disabled()
                  and text(pg, "#ccdA3dListTitle") == "Nível 2 · Grande região" and len(list_ids(pg)) == 7,
                  "início: breadcrumb 'Aeronave' (atual), Voltar e Finalizar desabilitados, lista do nível 2 com 7 regiões")

            # ---------- selecionar e confirmar a asa esquerda (3D) ----------
            pg.click("[data-a3d-view=top]"); F2.wait_idle(pg)
            sc = F3.scan(pg); R = sc["regions"]
            box = pg.locator(".ccd-a3d__canvas").bounding_box()
            png_before = F1.canvas_png(pg)
            fus_pt = R["fuselage_rear"]
            F3.click(pg, R["wing_left"])
            cam_sel = F2.state(pg)["camera"]
            check(sel(pg)["selectedId"] == "wing_left" and sel(pg)["confirmedPath"] == ["aircraft"],
                  "clique seleciona a asa esquerda sem confirmar (caminho continua só com a aeronave)")
            confirm(pg)
            s = sel(pg); st = F2.state(pg)
            check(s["confirmedPath"] == ["aircraft", "wing_left"] and s["focusId"] == "wing_left" and s["selectedId"] is None,
                  "Confirmar região: caminho [aeronave, asa esquerda]; o foco avança um nível; a seleção candidata é limpa")
            check(st["camera"]["distance"] < cam_sel["distance"] * 0.8 and abs(st["camera"]["yaw"] - cam_sel["yaw"]) < 1e-6,
                  f"confirmar aproxima a região mantendo a direção ({cam_sel['distance']:.1f} → {st['camera']['distance']:.1f} m)")
            cr = crumbs(pg)
            check([c[0] for c in cr] == ["Aeronave", "Asa esquerda"] and cr[0][1] == "BUTTON" and cr[1][2] == "step",
                  f"breadcrumb: {' › '.join(c[0] for c in cr)} (Aeronave clicável, Asa esquerda atual)")
            kids = list_ids(pg)
            metas = pg.eval_on_selector_all("[data-region-id] .ccd-a3d__regionmeta", "els => els.map(e => e.textContent)")
            check(kids == ["wing_left_leading_edge", "wing_left_upper_surface", "wing_left_trailing_edge", "wing_left_tip"]
                  and text(pg, "#ccdA3dListTitle") == "Nível 3 · Seção" and all(m_ == "sem geometria própria" for m_ in metas),
                  "lista passa ao nível 3 da asa (bordo de ataque, extradorso, bordo de fuga, ponta), marcadas 'sem geometria própria'")
            live = pg.evaluate("document.querySelector('[data-a3d=selection-live]').textContent")
            check(live.startswith("Região confirmada: Asa esquerda.") and "nível 3" in live, f"confirmação anunciada: '{live}'")
            # destaque verde e esmaecimento (mesma vista, antes da aproximação: refaz a vista superior sem perder o caminho)
            pg.click("[data-a3d-view=top]"); F2.wait_idle(pg)
            png_conf = F1.canvas_png(pg)
            g0, g1 = green_pixels(png_before), green_pixels(png_conf)
            l0, l1 = lum_at(png_before, box, fus_pt), lum_at(png_conf, box, fus_pt)
            check(g1 > g0 + 300, f"região confirmada em verde ({g1 - g0} pixels verdes a mais)")
            check(l1 < l0 * 0.8, f"fora do foco esmaecido (fuselagem: luminância {l0:.0f} → {l1:.0f})")
            check(sel(pg)["confirmedPath"] == ["aircraft", "wing_left"] and len([u for u in requests if u.endswith(".glb")]) == 1,
                  "trocar de vista preserva o caminho confirmado e não baixa o GLB de novo")
            (OUT / "f4-1-asa-confirmada.png").write_bytes(pg.locator(".ccd-a3d").screenshot())

            # ---------- o clique não avança nem troca de ramo ----------
            R = F3.scan(pg)["regions"]
            F3.click(pg, R["wing_left"])
            tip = pg.locator("[data-a3d=tooltip]")
            tip_in = tip.inner_text() if tip.is_visible() else ""
            check(sel(pg)["selectedId"] is None and sel(pg)["confirmedPath"] == ["aircraft", "wing_left"] and "Escolha: Seção" in tip_in,
                  f"clique na própria asa em foco não avança de nível; dica orienta: '{tip_in.replace(chr(10), ' | ')}'")
            F3.click(pg, R["engine_left"])
            tip_out = tip.inner_text() if tip.is_visible() else ""
            check(sel(pg)["selectedId"] is None and sel(pg)["focusId"] == "wing_left" and "Fora de Asa esquerda" in tip_out,
                  f"clique fora do foco (motor) não seleciona nem troca de ramo; dica: '{tip_out.replace(chr(10), ' | ')}'")
            pg.mouse.move(5, 5)

            # ---------- descer pela lista até o nível 5 ----------
            cam_a = F2.state(pg)["camera"]
            list_select(pg, "wing_left_leading_edge")
            sm = F3.summary(pg)
            check(sel(pg)["selectedId"] == "wing_left_leading_edge" and sm.get("geometry") == "realce em Asa esquerda"
                  and pg.locator("[data-a3d=no-geometry]").is_visible(),
                  "seção sem geometria própria: resumo indica 'realce em Asa esquerda' e mostra o aviso de subdivisão demonstrativa")
            pg.focus("[data-a3d=confirm-region]"); pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
            check(sel(pg)["confirmedPath"][-1] == "wing_left_leading_edge" and F3.cam_eq(cam_a, F2.state(pg)["camera"])
                  and list_ids(pg) == ["wing_left_le_structure", "wing_left_le_devices"] and text(pg, "#ccdA3dListTitle") == "Nível 4 · Sistema ou estrutura",
                  "Confirmar pelo teclado (Enter): nível 3 confirmado; sem geometria nova, a câmera não se move; lista do nível 4")
            check(pg.evaluate("document.activeElement && document.activeElement.dataset.regionId") == "wing_left_le_structure",
                  "após confirmar pelo painel, o foco vai para o primeiro item do novo nível")
            list_select(pg, "wing_left_le_devices"); confirm(pg)
            list_select(pg, "slat_left"); confirm(pg)
            s = sel(pg)
            check(s["confirmedPath"] == ["aircraft", "wing_left", "wing_left_leading_edge", "wing_left_le_devices", "slat_left"]
                  and list_ids(pg) == [] and pg.locator("[data-a3d=list-empty]").is_visible()
                  and len(crumbs(pg)) == 5,
                  "nível 5 (Slats – asa esquerda) confirmado; sem subdivisões abaixo; breadcrumb com 5 níveis")

            # ---------- voltar um nível e breadcrumb ----------
            pg.click("[data-a3d=back-level]"); pg.wait_for_timeout(200)
            s = sel(pg)
            check(s["confirmedPath"][-1] == "wing_left_le_devices" and s["selectedId"] == "slat_left"
                  and pg.get_attribute("[data-region-id=slat_left]", "aria-pressed") == "true",
                  "Voltar um nível: foco volta ao nível 4; a região de onde saiu fica selecionada, sem confirmação")
            pg.click("[data-crumb='1']"); pg.wait_for_timeout(200); F2.wait_idle(pg)
            s = sel(pg)
            check(s["confirmedPath"] == ["aircraft", "wing_left"] and s["selectedId"] is None and len(list_ids(pg)) == 4,
                  "clique em 'Asa esquerda' no breadcrumb desfaz as confirmações abaixo e volta ao nível 3")
            pg.click("[data-crumb='0']"); pg.wait_for_timeout(200); F2.wait_idle(pg)
            s = sel(pg); st = F2.state(pg)
            png_root = F1.canvas_png(pg)
            check(s["confirmedPath"] == ["aircraft"] and len(list_ids(pg)) == 7 and st["camera"]["distance"] > 40
                  and green_pixels(png_root) < 200,
                  f"breadcrumb 'Aeronave': volta à raiz, aeronave inteira enquadrada ({st['camera']['distance']:.1f} m), sem verde nem esmaecimento")

            # ---------- localização parcial ----------
            list_select(pg, "fuselage"); confirm(pg)
            R = F3.scan(pg)["regions"]
            F3.click(pg, R["fuselage_center"])
            check(sel(pg)["selectedId"] == "fuselage_center", "com o foco na fuselagem, o clique seleciona a seção (nível 3)")
            confirm(pg)
            pg.click("[data-a3d-view=left]"); F2.wait_idle(pg)
            check(sel(pg)["confirmedPath"] == ["aircraft", "fuselage", "fuselage_center"],
                  "trocar para a vista lateral esquerda preserva o caminho confirmado e o breadcrumb")
            prog = text(pg, "[data-a3d=location-progress]")
            pg.click("[data-a3d=finalize-partial]"); pg.wait_for_timeout(200)
            loc = sel(pg)["location"]
            expected = {"aircraftModel": "E195-E2-demonstrativo", "currentView": "left", "locationPath": ["Fuselagem", "Fuselagem central"],
                        "locationIds": ["fuselage", "fuselage_center"], "partial": True, "confirmed": True, "confirmedBy": "user",
                        "regionId": "fuselage", "sectionId": "fuselage_center",
                        "source": "3d"}  # (Fase 6) origem da localização
            check(loc == expected, f"Finalizar como localização parcial gera o objeto serializável esperado: {json.dumps(loc, ensure_ascii=False)}")
            check(text(pg, "[data-a3d=confirm-text]") == CONFIRM and text(pg, "[data-a3d=partial-badge]") == "Parcial · até o nível 3 (Seção)"
                  and text(pg, "[data-a3d=location-label]") == "Fuselagem · Fuselagem central" and prog.startswith("Confirmado até o nível 3"),
                  f"resultado: '{CONFIRM}' + 'Parcial · até o nível 3 (Seção)' + 'Fuselagem · Fuselagem central'")
            modal_txt = pg.locator(".ccd-a3d").inner_text().lower()
            check("validad" not in modal_txt and "identificad" not in modal_txt and "certificad" in modal_txt,
                  "nenhum texto de validação técnica ou identificação automática; o aviso demonstrativo continua")
            n_enabled = pg.eval_on_selector_all("[data-region-id]:not(:disabled), [data-a3d=confirm-region]:not(:disabled), [data-a3d=back-level]:not(:disabled), button[data-crumb]:not(:disabled)", "e => e.length")
            R = F3.scan(pg)["regions"]
            some = R.get("fuselage_forward") or next(iter(R.values()))
            F3.click(pg, some)
            check(n_enabled == 0 and sel(pg)["selectedId"] is None and F2.state(pg)["autoRotate"] is False,
                  "localização finalizada trava lista, breadcrumb, Confirmar e o clique no 3D")
            pg.click("[data-a3d=autorotate]"); pg.wait_for_timeout(200)
            check(not F2.state(pg)["autoRotate"], "rotação automática indisponível durante a localização")
            (OUT / "f4-2-localizacao-parcial.png").write_bytes(pg.locator(".ccd-a3d").screenshot())
            pg.click("[data-a3d=edit-location]"); pg.wait_for_timeout(200)
            check(sel(pg)["location"] is None and sel(pg)["confirmedPath"] == ["aircraft", "fuselage", "fuselage_center"]
                  and not pg.locator("[data-a3d=back-level]").is_disabled(),
                  "Editar localização reabre o fluxo com o caminho preservado")

            # ---------- onConfirm continua intocado (Fase 6) ----------
            pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
            pg.evaluate("""window.__calls = []; window.__closed = 0;
              window.CtrlCDAircraft3D.open({ current: 'x', onConfirm: (v) => window.__calls.push(v), onClose: () => { window.__closed++; } })""")
            F1.wait_ready(pg); F2.wait_idle(pg)
            pg.wait_for_function("window.CtrlCDAircraft3D.inspect().selection.raycastReady", timeout=10000)
            list_select(pg, "empennage"); confirm(pg)
            pg.click("[data-a3d=finalize-partial]"); pg.wait_for_timeout(150)
            loc2 = sel(pg)["location"]
            pg.click("[data-a3d=close]"); pg.wait_for_timeout(300)
            calls, closed = pg.evaluate("[window.__calls, window.__closed]")
            check(loc2 and loc2["regionId"] == "empennage" and "sectionId" not in loc2 and calls == [] and closed == 1,
                  "localização parcial só de nível 2 (Empenagem) é aceita; onConfirm não é chamado nesta fase; onClose sim")
            check(len([u for u in requests if u.endswith(".glb")]) == 1 and not [u for u in requests if not u.startswith(base)],
                  "1 download do GLB em toda a sessão; nenhuma requisição externa")
            check(not errors, f"console sem erros ({len(errors)}){': ' + errors[0] if errors else ''}")

            # ---------- celular ----------
            mctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
            mctx.add_init_script(F1.SESSION)
            mp = mctx.new_page()
            merr = []
            mp.on("pageerror", lambda e: merr.append(str(e)))
            F2.open_viewer(mp, base)
            mp.wait_for_function("window.CtrlCDAircraft3D.inspect().selection.raycastReady", timeout=30000)
            Rm = F3.scan(mp, 6)["regions"]
            t = Rm.get("wing_left") or Rm.get("wing_right")
            mp.touchscreen.tap(t["x"], t["y"]); mp.wait_for_timeout(400)
            mp.locator("[data-a3d=confirm-region]").tap(); mp.wait_for_timeout(900)
            over = mp.evaluate("document.documentElement.scrollWidth > window.innerWidth")
            s = sel(mp)
            check(len(s["confirmedPath"]) == 2 and s["confirmedPath"][1].startswith("wing_") and not over and not merr,
                  f"celular: toque seleciona, 'Confirmar região' por toque confirma ({s['confirmedPath'][1]}); sem estouro horizontal")
            (OUT / "f4-3-celular.png").write_bytes(mp.screenshot())
            mctx.close()
            b.close()
    finally:
        s1.terminate()
    print(f"\n{sum(r.startswith('OK') for r in results)}/{len(results)} verificações OK")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()

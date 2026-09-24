"""Testes da Fase 6 — integração do 3D com o formulário (Playwright + Chromium).

Uso:  python3 tests/aircraft3d/test_fase6.py [pasta_de_capturas]
Cobre os passos 16 a 22 da seção 26: confirmar, gerar snapshot, retornar ao formulário, ver o
resumo, abrir o compilado, ver o snapshot, fechar e reabrir — além do anexo impresso, da
persistência local e da compatibilidade com o localizador 2D.
"""
import base64, io, json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
LOCAL_API = "http://127.0.0.1:8001/"  # back-end local de usuários/registros (não é requisição externa)
from PIL import Image, ImageStat

sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_fase1 as F1  # noqa: E402
import test_fase2 as F2  # noqa: E402
import test_fase4 as F4  # noqa: E402

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else F1.ROOT / "tests" / "aircraft3d" / "capturas"
OUT.mkdir(parents=True, exist_ok=True)
ok_all, results = True, []


def check(cond, msg):
    global ok_all
    results.append(("OK   " if cond else "FALHA") + " " + msg)
    print(results[-1]); ok_all &= bool(cond)


def sel(pg):
    return F2.state(pg)["selection"]


def rec(pg):
    return pg.evaluate("JSON.parse(JSON.stringify(window.CtrlCD.state.rec, (k, v) => (k === 'photos' ? undefined : v)))")


def img_loaded(pg, selector):
    return pg.evaluate(f"(() => {{ const i = document.querySelector('{selector}'); return !!i && i.complete && i.naturalWidth > 0; }})()")


def goto_step(pg, n):
    pg.evaluate(f"(() => {{ const S = window.CtrlCD.state; S.rec.maxStep = Math.max(S.rec.maxStep, {n}); S.rec.currentStep = {n}; window.CtrlCD.render(); }})()")
    pg.wait_for_timeout(400)


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

            btn = pg.locator("[data-fk=open-3d]")
            check(btn.inner_text().strip() == "Selecionar no modelo da aeronave" and pg.is_visible("[data-fk=open-2d]"),
                  "Etapa 2: botão principal 'Selecionar no modelo da aeronave' e alternativa 'Usar vistas técnicas (2D)'")
            btn.click(); F1.wait_ready(pg, 60000); F2.wait_idle(pg)
            pg.wait_for_function("window.CtrlCDAircraft3D.inspect().selection.raycastReady", timeout=30000)
            check(pg.locator(".ccd-a3d").count() == 1 and pg.locator(".ccd-ac").count() == 0, "o botão principal abre o visualizador 3D (2D só como alternativa)")

            # ---------- localizar: fuselagem → seção → ponto → confirmar ----------
            F4.list_select(pg, "fuselage"); F4.confirm(pg)
            pg.click("[data-a3d=mark-mode]"); pg.wait_for_timeout(100)
            pg.click("[data-a3d=mark-center]"); pg.wait_for_timeout(200)
            mk = sel(pg)["marker"]
            leaf = mk["meshRegionId"]
            F4.list_select(pg, leaf); F4.confirm(pg)
            pg.click("[data-a3d=confirm-point]"); pg.wait_for_timeout(400)
            s = sel(pg)
            snap = s["snapshot"] or ""
            check(snap.startswith("data:image/jpeg;base64,") and s["location"] and not s["location"]["partial"],
                  f"passo 17: captura gerada automaticamente após confirmar ({len(snap) // 1024} KB, JPEG)")
            im = Image.open(io.BytesIO(base64.b64decode(snap.split(",", 1)[1]))).convert("RGB")
            st = ImageStat.Stat(im)
            px = list(im.resize((200, 120)).getdata())
            greens = sum(1 for r, g, b_ in px if g > r + 45 and g > b_ + 15)
            check(im.width >= 600 and max(st.stddev) > 20 and greens > 20,
                  f"captura com conteúdo real ({im.width}×{im.height}, desvio {max(st.stddev):.0f}) e região realçada em verde ({greens} px na miniatura)")
            (OUT / "f6-1-captura.jpg").write_bytes(base64.b64decode(snap.split(",", 1)[1]))
            check(pg.locator("[data-a3d=snapshot]").is_visible() and img_loaded(pg, "[data-a3d=snapshot]")
                  and pg.locator("[data-a3d=use-location]").is_visible(),
                  "prévia da captura e 'Usar esta localização no registro' no painel do visualizador")
            (OUT / "f6-2-visualizador-resultado.png").write_bytes(pg.locator(".ccd-a3d").screenshot())

            # ---------- retornar ao formulário ----------
            label_expected = "Fuselagem · " + {"fuselage_forward": "Fuselagem dianteira", "fuselage_center": "Fuselagem central",
                                                "fuselage_rear": "Fuselagem traseira", "nose": "Nariz / radome", "cockpit": "Cabine de comando",
                                                "tail_cone": "Cone de cauda"}[leaf]
            pg.click("[data-a3d=use-location]"); pg.wait_for_timeout(600)
            r = rec(pg)
            loc = r.get("aircraftLocation") or {}
            check(pg.locator(".ccd-a3d").count() == 0 and r["regionSelected"] == label_expected,
                  f"passo 18: volta ao formulário; regionSelected = '{r['regionSelected']}' (texto compatível)")
            check(loc.get("source") == "3d" and loc.get("locationIds") == ["fuselage", leaf] and loc.get("defectPosition", {}).get("confirmed") is True
                  and loc.get("snapshot", {}).get("bytes", 0) > 1000 and loc.get("confirmedBy") == "user",
                  "localização estruturada no registro (caminho, ponto confirmado, metadados da captura)")
            pg.wait_for_function("(() => { const i = document.querySelector('[data-fk=location-snapshot]'); return !!i && i.complete && i.naturalWidth > 0; })()", timeout=5000)
            detail = pg.inner_text("[data-fk=location-detail]")
            box = pg.inner_text(".ccd-confirmbox")
            check("Localização confirmada pelo usuário" in box and "ponto marcado" in detail and img_loaded(pg, "[data-fk=location-snapshot]"),
                  f"passo 19: resumo da Etapa 2 com texto, detalhe ('{detail}') e captura")
            (OUT / "f6-3-resumo-etapa2.png").write_bytes(pg.locator(".ccd-confirmbox").screenshot())
            draft = pg.evaluate("(() => { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.includes('draft')) return localStorage.getItem(k); } return ''; })()")
            check(draft and "data:image" not in draft and len(draft) < 60000 and '"aircraftLocation"' in draft,
                  f"rascunho local guarda a localização sem a imagem ({len(draft or '') // 1024} KB); a captura fica em IndexedDB")
            stored = pg.evaluate("window.CtrlCDAircraftLocation.SnapshotStore.load(window.CtrlCD.state.rec.id).then(u => !!u)")
            check(stored, "captura persistida no IndexedDB local (banco próprio, separado das fotos)")

            # ---------- fechar e reabrir ----------
            pg.click("[data-fk=edit-location]"); F1.wait_ready(pg, 20000); F2.wait_idle(pg)
            pg.wait_for_function("(() => { const s = window.CtrlCDAircraft3D.inspect(); return s && s.selection.snapshot; })()", timeout=10000)
            s = sel(pg)
            check(s["confirmedPath"] == ["aircraft", "fuselage", leaf] and s["location"] and s["marker"]["confirmed"]
                  and s["marker"]["worldPosition"] == mk["worldPosition"],
                  "passo 22: reabrir restaura caminho, ponto confirmado e localização (e refaz a captura)")
            pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
            check(rec(pg)["regionSelected"] == label_expected and pg.locator(".ccd-a3d").count() == 0,
                  "fechar sem usar não altera a localização do registro")

            # ---------- compilado ----------
            goto_step(pg, 4)
            comp = pg.inner_text(".ccd-compiled")
            pg.wait_for_function("(() => { const i = document.querySelector('[data-fk=compiled-snapshot] img'); return !!i && i.complete && i.naturalWidth > 0; })()", timeout=5000)
            check(label_expected in comp and "Localização — detalhe" in comp and "Ponto da não conformidade" in comp
                  and "Localização confirmada pelo usuário." in comp,
                  "passo 20: compilado preliminar com localização, detalhe, ponto e confirmação")
            check(img_loaded(pg, "[data-fk=compiled-snapshot] img"), "passo 21: captura no compilado preliminar")
            (OUT / "f6-4-compilado.png").write_bytes(pg.locator("[data-fk=compiled-snapshot]").screenshot())

            # ---------- anexo impresso ----------
            pg.evaluate("""(() => { const S = window.CtrlCD.state; S.rec.pdfGenerated = true; S.rec.completedAt = '24/09/2026 03:00';
              S.rec.versions = [{ version: 1, at: '24/09/2026 03:00', by: 'Teste' }]; window.print = () => {}; })()""")
            goto_step(pg, 5)
            pg.get_by_role("button", name="Baixar PDF (imprimir)").click(); pg.wait_for_timeout(300)
            annex = pg.inner_text("#ccdPrint") if pg.locator("#ccdPrint").count() else ""
            check("Ponto da não conformidade" in annex and pg.locator("[data-fk=print-snapshot] img").count() == 1,
                  "documento final (anexo) com a captura e as linhas de localização")
            pg.evaluate("document.getElementById('ccdPrint')?.remove()")

            # ---------- 2D substitui a localização estruturada ----------
            goto_step(pg, 2)
            pg.click("[data-fk=open-2d]"); pg.wait_for_timeout(400)
            pg.locator(".ccd-ac__option").first.click(); pg.wait_for_timeout(150)
            pg.get_by_role("button", name="Confirmar localização").click(); pg.wait_for_timeout(1500)
            r = rec(pg)
            # o 2D abre com o caminho atual pré-selecionado; a primeira opção é o nível seguinte
            check(r["regionSelected"].startswith(label_expected + " · ") and (r.get("aircraftLocation") or {}).get("source") == "2d",
                  f"localizador 2D (contrato de texto) substitui a localização: '{r['regionSelected']}', estruturada = {json.dumps(r.get('aircraftLocation'))[:60]}")
            check("Vistas técnicas (2D)" in pg.inner_text("[data-fk=location-detail]"), "(Fase 7) a captura e o detalhe passam a ser os do 2D, que substituem os do 3D")

            ext = [u for u in requests if not u.startswith(base) and not u.startswith("blob:") and not u.startswith("data:")]
            check(not ext, f"nenhuma requisição externa ({len(ext)}): a localização e a captura não saem do navegador")
            check(not errors, f"console sem erros ({len(errors)}){': ' + errors[0] if errors else ''}")
            b.close()
    finally:
        s1.terminate()
    print(f"\n{sum(r.startswith('OK') for r in results)}/{len(results)} verificações OK")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()

"""Fase 7 — fallback 2D (vistas técnicas corrigidas) e caminhos de fallback do 3D (Playwright).

Uso:  python3 tests/aircraft3d/test_fallback_2d.py [pasta_de_capturas]
Seção 18: sem WebGL, GLB com falha, 3D desligado ou escolha do usuário → vistas técnicas, que
permitem selecionar a grande região, marcar ponto aproximado, confirmar localização parcial e
continuar o formulário.
"""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
LOCAL_API = "http://127.0.0.1:8001/"  # back-end local de usuários/registros (não é requisição externa)

sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_fase1 as F1  # noqa: E402

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else F1.ROOT / "tests" / "aircraft3d" / "capturas"
OUT.mkdir(parents=True, exist_ok=True)
ok_all, results = True, []
NO_WEBGL2 = """(() => { const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) { return type === 'webgl2' ? null : orig.call(this, type, ...a); }; })()"""


def check(cond, msg):
    global ok_all
    results.append(("OK   " if cond else "FALHA") + " " + msg)
    print(results[-1]); ok_all &= bool(cond)


def rec(pg):
    return pg.evaluate("JSON.parse(JSON.stringify({ r: window.CtrlCD.state.rec.regionSelected, l: window.CtrlCD.state.rec.aircraftLocation }))")


def point_in(pg, rid):
    """ponto de tela sobre uma forma da região (que resolve para ela mesma ou descendente)."""
    return pg.evaluate("""(rid) => {
      const g = document.querySelector(`.ccd-ac2__svg g.region[data-region-id="${rid}"]`);
      for (const s of g.querySelectorAll('.shape')) {
        const b = s.getBoundingClientRect();
        for (let i = 1; i < 8; i++) for (let j = 1; j < 8; j++) {
          const x = b.left + b.width * i / 8, y = b.top + b.height * j / 8;
          const el = document.elementFromPoint(x, y);
          if (el && g.contains(el)) return { x, y };
        }
      }
      return null; }""", rid)


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

            # ---------- desenho corrigido ----------
            pg.click("[data-fk=open-2d]"); pg.wait_for_timeout(500)
            n = pg.eval_on_selector_all(".ccd-ac2__svg g.region", "e => e.length")
            old = pg.eval_on_selector_all(".ac-zone, .ac-body", "e => e.length")
            ids = pg.eval_on_selector_all(".ccd-ac2__svg g.region", "e => e.map(g => g.dataset.regionId)")
            same = pg.evaluate("(ids) => ids.every(id => !!window.CtrlCDAircraftHierarchy.get(id)) && ids.length === window.CtrlCDAircraftHierarchy.REGIONS.length", ids)
            check(n == 87 and old == 0 and same, f"vista superior corrigida com as {n} regiões da hierarquia compartilhada; desenho antigo removido")
            check("Não representa geometria CAD" in pg.inner_text("#ccdAcNotice"), "aviso demonstrativo visível no 2D")
            pe = pg.evaluate("getComputedStyle(document.querySelector('.ccd-ac2__svg g[data-region-id=pylon_left]')).pointerEvents")
            check(pe == "none", "pilone (oculto na vista superior) não responde ao clique antes do nível que o distingue")

            # ---------- clique no desenho: um nível por vez ----------
            pt = point_in(pg, "wing_left")
            pg.mouse.move(pt["x"], pt["y"]); pg.wait_for_timeout(150)
            tip = pg.inner_text("[data-ac=tooltip]") if pg.is_visible("[data-ac=tooltip]") else ""
            pg.mouse.click(pt["x"], pt["y"]); pg.wait_for_timeout(700)
            crumb = pg.inner_text(".ccd-ac__crumb")
            check(tip.startswith("Asa esquerda") and crumb == "Asa esquerda", f"hover mostra '{tip.splitlines()[0] if tip else '-'}'; o clique seleciona só o nível 2 ({crumb})")
            pt = point_in(pg, "wing_left_trailing_edge")
            pg.mouse.click(pt["x"], pt["y"]); pg.wait_for_timeout(700)
            check(pg.inner_text(".ccd-ac__crumb") == "Asa esquerda › Bordo de fuga", "segundo clique desce para a seção (nível 3)")
            ptr = point_in(pg, "engine_left") or point_in(pg, "wing_right")
            if ptr:
                pg.mouse.move(ptr["x"], ptr["y"]); pg.wait_for_timeout(150)
            out_tip = pg.inner_text("[data-ac=tooltip]") if ptr and pg.is_visible("[data-ac=tooltip]") else ""
            check("Fora de Bordo de fuga" in out_tip, f"fora da região atual a dica orienta ('{out_tip.replace(chr(10), ' | ')}')")

            # ---------- ponto aproximado ----------
            pg.click("[data-ac=mark-point]"); pg.wait_for_timeout(100)
            if ptr:
                pg.mouse.click(ptr["x"], ptr["y"]); pg.wait_for_timeout(150)
            check(pg.locator("[data-ac=pin]").count() == 0, "clique fora da região no modo de marcação não marca")
            pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
            check(pg.locator(".ccd-ac").count() == 1 and pg.get_attribute("[data-ac=mark-point]", "aria-pressed") == "false",
                  "Escape sai do modo de marcação sem fechar o localizador")
            pg.click("[data-ac=mark-point]"); pg.wait_for_timeout(100)
            pt = point_in(pg, "wing_left_trailing_edge")
            pg.mouse.click(pt["x"], pt["y"]); pg.wait_for_timeout(200)
            check(pg.locator("[data-ac=pin]").count() == 1 and "aguardando confirmação" in pg.inner_text("[data-ac=point-status]"),
                  "ponto aproximado marcado sobre a região (azul, aguardando confirmação)")
            (OUT / "f7-1-fallback-2d.png").write_bytes(pg.locator(".ccd-ac").screenshot())
            pg.click("[data-ac=confirm]"); pg.wait_for_timeout(1500)
            st = rec(pg)
            ap = (st["l"] or {}).get("approximatePoint") or {}
            check(st["r"] == "Asa esquerda · Bordo de fuga" and st["l"]["source"] == "2d" and st["l"]["partial"] is False
                  and ap.get("confirmed") and ap.get("lateral_m", 0) < -2 and 10 < ap.get("longitudinal_m", 0) < 35,
                  f"confirmação: texto compatível + localização estruturada 2D com ponto aproximado ({ap.get('longitudinal_m')} m do nariz; {ap.get('lateral_m')} m, lado esquerdo)")
            pg.wait_for_function("(() => { const i = document.querySelector('[data-fk=location-snapshot]'); return !!i && i.complete && i.naturalWidth > 0; })()", timeout=5000)
            check("Vistas técnicas (2D)" in pg.inner_text("[data-fk=location-detail]"), "resumo da Etapa 2 indica a origem 2D e mostra a captura do desenho")

            # ---------- reabrir o 2D: caminho e ponto restaurados ----------
            pg.click("[data-fk=open-2d]"); pg.wait_for_timeout(500)
            check(pg.inner_text(".ccd-ac__crumb") == "Asa esquerda › Bordo de fuga" and pg.locator("[data-ac=pin]").count() == 1,
                  "reabrir restaura o caminho e o ponto aproximado")
            # teclado: Alterar → lista → Enter; marcar no centro
            pg.locator(".ccd-ac__level").nth(1).get_by_role("button", name="Alterar").click(); pg.wait_for_timeout(300)
            pg.focus(".ccd-ac__option[data-region-id=empennage]"); pg.keyboard.press("Enter"); pg.wait_for_timeout(600)
            pg.focus("[data-ac=mark-point]"); pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
            pg.focus("[data-ac=mark-center]"); pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
            check(pg.inner_text(".ccd-ac__crumb") == "Empenagem" and pg.locator("[data-ac=pin]").count() == 1,
                  "teclado: Alterar, escolher na lista com Enter e 'Marcar no centro da região'")
            pg.focus("[data-ac=confirm]"); pg.keyboard.press("Enter"); pg.wait_for_timeout(1500)
            check(rec(pg)["r"] == "Empenagem", "confirmação só com a grande região (localização parcial + ponto) continua o formulário")

            # ---------- 3D indisponível: fallback ----------
            for label, prep in (("sem WebGL 2", lambda c: c.add_init_script(NO_WEBGL2)),
                                ("GLB com falha (404)", None),
                                ("3D desligado (CTRLCD_3D_ENABLED = false)", lambda c: c.add_init_script("window.CTRLCD_3D_ENABLED = false"))):
                c2 = b.new_context(viewport={"width": 1280, "height": 800})
                c2.add_init_script(F1.SESSION)
                if prep:
                    prep(c2)
                q = c2.new_page(); errs = []
                q.on("pageerror", lambda e: errs.append(str(e)))
                if label.startswith("GLB"):
                    q.route("**/*.glb", lambda r: r.fulfill(status=404, body=""))
                F1.goto_step2(q, base)
                q.click("[data-fk=open-3d]"); q.wait_for_timeout(800)
                if q.locator("[data-a3d=error]").count():
                    q.click("[data-a3d=fallback]"); q.wait_for_timeout(500)
                opened_2d = q.locator(".ccd-ac2").count() == 1
                if opened_2d:
                    q.click(".ccd-ac__option[data-region-id=landing_gear]"); q.wait_for_timeout(300)
                    q.click("[data-ac=confirm]"); q.wait_for_timeout(1200)
                got = q.evaluate("window.CtrlCD.state.rec.regionSelected")
                check(opened_2d and got == "Trens de pouso" and not errs, f"{label}: o fluxo cai nas vistas técnicas e a localização chega ao formulário ('{got}')")
                c2.close()

            # ---------- celular ----------
            mctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
            mctx.add_init_script(F1.SESSION)
            mp = mctx.new_page()
            F1.goto_step2(mp, base)
            mp.locator("[data-fk=open-2d]").tap(); mp.wait_for_timeout(500)
            over = mp.evaluate("document.documentElement.scrollWidth > window.innerWidth")
            vis = mp.locator(".ccd-ac2 .ccd-ac__option").first.is_visible() and mp.locator("[data-ac=confirm]").is_visible()
            mp.locator(".ccd-ac__option[data-region-id=fuselage]").tap(); mp.wait_for_timeout(500)
            check(not over and vis and mp.inner_text(".ccd-ac__crumb") == "Fuselagem",
                  "celular: lista de níveis visível (alternativa textual), botão de confirmar visível, sem estouro horizontal")
            (OUT / "f7-2-fallback-2d-celular.png").write_bytes(mp.screenshot())
            mctx.close()

            ext = [u for u in requests if not u.startswith(base) and not u.startswith("blob:") and not u.startswith("data:")]
            check(not ext and not errors, f"sem requisições externas ({len(ext)}) e console sem erros ({len(errors)}){': ' + errors[0] if errors else ''}")
            b.close()
    finally:
        s1.terminate()
    print(f"\n{sum(r.startswith('OK') for r in results)}/{len(results)} verificações OK")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()

"""Testes da Fase 1 do visualizador 3D (Playwright + Chromium, WebGL por software).

Uso:  python3 tests/aircraft3d/test_fase1.py [pasta_de_capturas]
Sobe dois servidores estáticos locais (raiz e subpasta), sem back-end, e injeta uma sessão fictícia.
"""
import hashlib, json, os, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
LOCAL_API = "http://127.0.0.1:8001/"  # back-end local de usuários/registros (não é requisição externa)

ROOT = Path(__file__).resolve().parents[2]          # .../backend
FRONT = ROOT / "frontend"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "tests" / "aircraft3d" / "capturas"
OUT.mkdir(parents=True, exist_ok=True)
APPROVED_SHA = "86db982c43a2a9e32974accc0ffd385d6452c360580cee3f4af524c6367c5169"
DISCLAIMER = "Modelo visual demonstrativo. Não representa geometria CAD oficial ou certificada."
ok_all, results = True, []


def check(cond, msg):
    global ok_all
    results.append(("OK   " if cond else "FALHA") + " " + msg)
    print(results[-1]); ok_all &= bool(cond)


def serve(directory, port):
    return subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1", "--directory", str(directory)],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


SESSION = "sessionStorage.setItem('hackaemb.session', JSON.stringify({token:'t',user:{id:1,name:'Teste',email:'teste@example.invalid'},authenticatedAt:new Date().toISOString()}))"


def goto_step2(pg, base):
    pg.goto(base + "#registro"); pg.wait_for_timeout(600)
    pg.get_by_role("button", name="Novo registro").first.click(); pg.wait_for_timeout(300)
    pg.locator("[data-fk=nc-search]").fill("vaza"); pg.wait_for_timeout(300)
    pg.locator("[role=option]").first.click()
    pg.locator("[data-fk=nc-confirm]").click()
    pg.locator("[data-fk=step1-next]").click(); pg.wait_for_timeout(400)
    pg.locator("[data-fk=hasar-Não]").click()
    pg.locator("[data-fk=installed-Sim]").click(); pg.wait_for_timeout(300)


def canvas_png(pg):
    return pg.locator(".ccd-a3d__canvas").screenshot()


def ink(pg):
    """fração do canvas ocupada pela aeronave (pixels claros sobre o fundo azul-escuro), pela captura de tela."""
    import io
    from PIL import Image
    im = Image.open(io.BytesIO(canvas_png(pg))).convert("RGB").resize((240, 140))
    px = [im.getpixel((x, y)) for y in range(im.height) for x in range(im.width)]
    return sum(1 for r, g, b in px if r > 110 and g > 110) / len(px)


def wait_ready(pg, timeout=60000):
    pg.wait_for_function("window.CtrlCDAircraft3D.lastMetrics && window.CtrlCDAircraft3D.lastMetrics.firstFrameMs !== null", timeout=timeout)
    pg.wait_for_timeout(250)


def main():
    sha = hashlib.sha256((FRONT / "models" / "e195-e2-demonstrativo.glb").read_bytes()).hexdigest()
    check(sha == APPROVED_SHA, f"1. GLB em frontend/models/ idêntico ao aprovado (SHA-256 {sha[:12]}…)")
    s1, s2 = serve(FRONT, 4173), serve(ROOT, 4174)
    time.sleep(1.0)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
            ctx = b.new_context(viewport={"width": 1440, "height": 900})
            ctx.add_init_script(SESSION)
            pg = ctx.new_page()
            errors, requests = [], []
            pg.on("console", lambda m: m.type == "error" and "/api/" not in (m.location or {}).get("url", "") and errors.append(m.text))
            pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.on("request", lambda r: None if r.url.startswith(LOCAL_API) else requests.append(r.url))
            base = "http://127.0.0.1:4173/"

            # ---------- abertura e carregamento (com atraso artificial para observar o estado) ----------
            goto_step2(pg, base)
            check(pg.is_visible("[data-fk=open-3d]") and pg.is_visible("[data-fk=open-2d]"),
                  "(Fase 6) Etapa 2: 'Selecionar no modelo da aeronave' abre o 3D; 'Usar vistas técnicas (2D)' fica como alternativa")
            # observa o painel de carregamento no navegador (sem depender do tempo de download)
            pg.evaluate("""(() => { window.__load = { text: '', bar: false, cancel: false, maxPct: 0 };
              new MutationObserver(() => { const el = document.querySelector('[data-a3d=loading]'); if (!el) return;
                const L = window.__load; L.text = L.text || el.innerText; L.bar = L.bar || !!el.querySelector('[role=progressbar]');
                L.cancel = L.cancel || !!el.querySelector('[data-a3d=cancel]');
                const v = Number(el.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow') || 0); L.maxPct = Math.max(L.maxPct, v);
              }).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); })()""")
            pg.click("[data-fk=open-3d]")
            wait_ready(pg)
            L = pg.evaluate("window.__load")
            check("Carregando modelo da aeronave..." in L["text"] and L["bar"] and L["cancel"] and L["maxPct"] > 0,
                  f"3. estado de carregamento: texto, barra de progresso (até {L['maxPct']} %) e Cancelar")
            m = pg.evaluate("window.CtrlCDAircraft3D.lastMetrics")
            check(m["triangles"] == 321814, f"modelo carregado: {m['triangles']} triângulos, {m['bytes']} bytes, leitura {m['loadMs']} ms, 1º quadro {m['firstFrameMs']} ms")
            names = pg.evaluate("window.CtrlCD3D.loader.loadModel(window.CtrlCDAircraft3D.modelUrl()).then(m => m.meshNodeNames)")
            wings = [n for n in names if n.startswith("wing_")]
            engines = [n for n in names if n.startswith("engine_")]
            hs = [n for n in names if n.startswith("horizontal_stabilizer_")]
            vs = [n for n in names if n == "vertical_stabilizer"]
            check(len(wings) == 2 and len(engines) == 2 and len(hs) == 2 and len(vs) == 1,
                  f"4. exatamente 2 asas {wings}, 2 motores {engines}, 2 estab. horizontais e 1 vertical")
            fr = ink(pg)
            check(0.03 < fr < 0.6, f"4. aeronave desenhada e enquadrada ({fr * 100:.1f} % do canvas)")
            check(DISCLAIMER in pg.inner_text(".ccd-a3d"), "9. aviso demonstrativo visível")
            pg.screenshot(path=str(OUT / "f1-1-inicial.png"))
            img0 = canvas_png(pg)

            # ---------- controles ----------
            box = pg.locator(".ccd-a3d__canvas").bounding_box()
            cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
            pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx + 160, cy + 40, steps=8); pg.mouse.up()
            pg.wait_for_timeout(900)
            img1 = canvas_png(pg)
            check(img1 != img0, "5. arrastar gira a aeronave")
            pg.screenshot(path=str(OUT / "f1-2-girado.png"))
            pg.mouse.move(cx, cy); pg.mouse.wheel(0, -600); pg.wait_for_timeout(900)
            fr_zoom = ink(pg)
            check(fr_zoom > fr, f"5. roda aproxima ({fr * 100:.1f} % → {fr_zoom * 100:.1f} % do canvas)")
            pg.mouse.move(cx, cy); pg.mouse.down(button="right"); pg.mouse.move(cx - 120, cy, steps=6); pg.mouse.up(button="right")
            pg.wait_for_timeout(500)
            img2 = canvas_png(pg)
            pg.keyboard.down("Shift"); pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx, cy + 80, steps=6); pg.mouse.up(); pg.keyboard.up("Shift")
            pg.wait_for_timeout(500)
            check(img2 != img1 and canvas_png(pg) != img2, "5. botão direito e Shift + arrastar movem a vista")
            for _ in range(12):
                pg.mouse.wheel(0, -1500); pg.wait_for_timeout(60)
            pg.wait_for_timeout(1200)
            fr_min = ink(pg)
            pg.screenshot(path=str(OUT / "f1-3-zoom-maximo.png"))
            check(fr_min < 0.999, f"5. zoom máximo limitado: câmera não entra no modelo ({fr_min * 100:.1f} % do canvas coberto)")
            for _ in range(12):
                pg.mouse.wheel(0, 1500); pg.wait_for_timeout(60)
            pg.wait_for_timeout(1200)
            fr_max = ink(pg)
            check(fr_max > 0.005, f"5. zoom mínimo limitado: aeronave continua visível ({fr_max * 100:.2f} %)")
            pg.keyboard.press("r"); pg.wait_for_timeout(900)
            fr_r = ink(pg)
            check(abs(fr_r - fr) < 0.02, f"5. tecla R redefine a vista ({fr_r * 100:.1f} % ≈ {fr * 100:.1f} %)")
            pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx - 200, cy, steps=5); pg.mouse.up(); pg.wait_for_timeout(700)
            pg.click("[data-a3d=reset]"); pg.wait_for_timeout(900)
            check(abs(ink(pg) - fr) < 0.02, "5. botão Redefinir vista volta ao enquadramento inicial")

            # ---------- fechar e reabrir: sem novo download ----------
            region_before = pg.evaluate("document.querySelector('[data-fk=open-3d]') !== null")
            pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
            check(pg.locator(".ccd-a3d").count() == 0 and region_before and pg.is_visible("[data-fk=open-3d]"),
                  "10. Esc fecha e devolve à Etapa 2 sem alterar a localização")
            glb_reqs = [u for u in requests if u.endswith(".glb")]
            for i in range(10):
                pg.click("[data-fk=open-3d]"); wait_ready(pg, 20000)
                if i % 2:
                    pg.click("[data-a3d=close]")
                else:
                    pg.mouse.click(5, 5)  # clique fora do diálogo
                pg.wait_for_timeout(120)
            glb_reqs = [u for u in requests if u.endswith(".glb")]
            check(len(glb_reqs) == 1 and pg.evaluate("window.CtrlCD3D.loader.downloads") == 1,
                  f"6. GLB baixado uma única vez em 11 aberturas ({len(glb_reqs)} requisição)")
            check(pg.locator(".ccd-a3d, .ccd-a3d__canvas").count() == 0, "11. abrir e fechar 10 vezes não deixa visualizadores nem canvas no DOM")
            pg.click("[data-fk=open-3d]"); wait_ready(pg, 20000)
            check(ink(pg) > 0.03, "11. após 11 aberturas o contexto WebGL ainda funciona (contextos liberados)")
            pg.click("[data-a3d=legacy]"); pg.wait_for_timeout(400)
            check(pg.locator(".ccd-ac").count() == 1 and pg.locator(".ccd-a3d").count() == 0, "7. 'Usar vistas técnicas (2D)' abre o localizador atual")
            pg.locator(".ccd-ac__option").first.click(); pg.wait_for_timeout(200)
            pg.get_by_role("button", name="Confirmar localização").click(); pg.wait_for_timeout(1200)
            check("Localização confirmada pelo usuário" in pg.inner_text("#experimentSlot"),
                  "10. localizador 2D aberto a partir do 3D continua confirmando a localização no formulário")
            external = [u for u in requests if not u.startswith(("http://127.0.0.1", "blob:", "data:"))]  # blob:/data: = captura local
            check(not external, f"11. nenhuma requisição externa {external[:3]}")
            check(not errors, f"11. console sem erros {errors[:3]}")
            pg.close()

            # ---------- erro: arquivo ausente e corrompido ----------
            for label, handler in (("ausente (404)", lambda r: r.fulfill(status=404, body="")),
                                   ("corrompido", lambda r: r.fulfill(status=200, body=b"nao e um glb" * 100))):
                pg = ctx.new_page(); errs = []
                pg.on("pageerror", lambda e: errs.append(str(e)))
                pg.route("**/*.glb", handler)
                goto_step2(pg, base)
                pg.click("[data-fk=open-3d]")
                pg.wait_for_selector("[data-a3d=error]", timeout=10000)
                t = pg.inner_text("[data-a3d=error]")
                btns = [pg.is_visible(f"[data-a3d={k}]") for k in ("retry", "fallback", "manual", "error-close")]
                check("Não foi possível carregar o modelo 3D." in t and all(btns),
                      f"7. GLB {label}: mensagem e as 4 ações ({pg.inner_text('.ccd-a3d__paneldetail')})")
                if label.startswith("ausente"):
                    pg.screenshot(path=str(OUT / "f1-4-erro.png"))
                    pg.unroute("**/*.glb")
                    pg.click("[data-a3d=retry]"); wait_ready(pg, 30000)
                    check(ink(pg) > 0.03, "7. 'Tentar novamente' carrega o modelo depois que o arquivo volta")
                    pg.click("[data-a3d=close]")
                else:
                    pg.click("[data-a3d=fallback]"); pg.wait_for_timeout(300)
                    check(pg.locator(".ccd-ac").count() == 1, "7. 'Usar vistas técnicas' abre o localizador 2D")
                    pg.keyboard.press("Escape")
                check(pg.is_visible("[data-fk=installed-Sim]") and not errs, "7. Etapa 2 continua utilizável e sem erros de página")
                pg.close()

            # ---------- sem WebGL 2 ----------
            pg = ctx.new_page()
            pg.add_init_script("const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, o) { return t === 'webgl2' ? null : g.call(this, t, o); };")
            goto_step2(pg, base)
            pg.click("[data-fk=open-3d]"); pg.wait_for_selector("[data-a3d=error]", timeout=5000)
            check("WebGL 2" in pg.inner_text("[data-a3d=error]") and not pg.is_visible("[data-a3d=retry]"),
                  "8. sem WebGL 2: vai direto às alternativas, com aviso")
            pg.close()

            # ---------- correções da revisão (M1, M2, B1, B4, B7) ----------
            pg = ctx.new_page(); errs = []; hdrs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("requestfinished", lambda r: r.url.endswith(".glb") and hdrs.append(r))
            goto_step2(pg, base)
            pg.click("[data-fk=open-3d]"); wait_ready(pg, 60000)
            h0 = hdrs[0].all_headers() if hdrs else {}
            st0 = hdrs[0].response().status if hdrs else None
            cc = h0.get("cache-control", "")
            check("no-cache" in cc or "max-age=0" in cc or "if-modified-since" in h0,
                  f"B1. GLB revalidado no servidor a cada sessão (Cache-Control: {h0.get('cache-control', '—')}; "
                  f"If-Modified-Since: {'sim' if 'if-modified-since' in h0 else 'não'}; resposta HTTP {st0})")
            check(pg.get_attribute(".ccd-a3d__status", "aria-live") is None, "B4. progresso sem região aria-live (sem anúncios repetidos)")
            pg.evaluate("document.querySelector('.ccd-a3d__canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()")
            pg.wait_for_selector("[data-a3d=error]", timeout=5000)
            check("contexto gráfico" in pg.inner_text("[data-a3d=error]") and pg.is_visible("[data-a3d=retry]"),
                  "M1. perda do contexto gráfico mostra o erro com 'Tentar novamente'")
            pg.click("[data-a3d=retry]"); pg.wait_for_timeout(1500)
            lost = pg.evaluate("document.querySelector('.ccd-a3d__canvas').getContext('webgl2').isContextLost()")
            fr_retry = ink(pg)
            check(not lost and 0.02 < fr_retry < 0.6 and not pg.is_visible("[data-a3d=error]") and pg.locator(".ccd-a3d__canvas").count() == 1,
                  f"M1. 'Tentar novamente' recria o canvas e volta a desenhar ({fr_retry * 100:.1f} % do canvas)")
            pg.screenshot(path=str(OUT / "f1-6-apos-perda-de-contexto.png"))
            inside = []
            for _ in range(10):
                pg.keyboard.press("Tab"); inside.append(pg.evaluate("!!document.activeElement.closest('.ccd-a3d')"))
            back = []
            for _ in range(10):
                pg.keyboard.press("Shift+Tab"); back.append(pg.evaluate("!!document.activeElement.closest('.ccd-a3d')"))
            check(all(inside) and all(back), "M2. Tab e Shift+Tab circulam só dentro do modal")
            pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
            pg.keyboard.press("Tab")
            check(pg.locator(".ccd-a3d").count() == 0 and not pg.evaluate("!!document.activeElement.closest('.ccd-a3d')"),
                  "M2. depois de fechar, o foco volta a circular pela página normalmente")
            check(not errs, f"M1/M2 sem erros de página {errs[:2]}")
            pg.close()
            pg = ctx.new_page(); errs = []; warns = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: m.type == "warning" and warns.append(m.text))
            pg.route("**/aircraft3d/renderer.js", lambda r: r.fulfill(status=404, body=""))
            goto_step2(pg, base)
            pg.click("[data-fk=open-3d]"); pg.wait_for_timeout(300)   # (Fase 6) sem 3D, o botão principal abre o 2D
            check(pg.evaluate("typeof window.CtrlCDAircraft3D") == "undefined" and not pg.is_visible("[data-fk=open-2d]")
                  and pg.locator(".ccd-ac").count() == 1 and any("renderer.js" in w for w in warns) and not errs,
                  "B7. módulo ausente: 3D desativado sem erro, botão oculto, localizador 2D disponível")
            pg.close()

            # ---------- subpasta ----------
            pg = ctx.new_page(); reqs = []
            pg.on("request", lambda r: None if r.url.startswith(LOCAL_API) else reqs.append(r.url))
            goto_step2(pg, "http://127.0.0.1:4174/frontend/")
            pg.click("[data-fk=open-3d]"); wait_ready(pg, 60000)
            glb = [u for u in reqs if u.endswith(".glb")]
            check(glb == ["http://127.0.0.1:4174/frontend/models/e195-e2-demonstrativo.glb"] and ink(pg) > 0.03,
                  "2. hospedado em subpasta (/frontend/): caminho relativo correto e modelo exibido")
            pg.close()

            # ---------- celular ----------
            mctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
            mctx.add_init_script(SESSION)
            pg = mctx.new_page()
            goto_step2(pg, base)
            pg.locator("[data-fk=open-3d]").tap(); wait_ready(pg, 60000)
            w = pg.evaluate("document.querySelector('.ccd-a3d').getBoundingClientRect().width")
            check(abs(w - 390) < 2 and ink(pg) > 0.01, "layout de celular: visualizador em tela cheia")
            pg.screenshot(path=str(OUT / "f1-5-celular.png"))
            mctx.close()
            b.close()

        # ---------- file:// ----------
        with sync_playwright() as p:
            b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
            ctx = b.new_context(viewport={"width": 1280, "height": 800}); ctx.add_init_script(SESSION)
            pg = ctx.new_page()
            goto_step2(pg, (FRONT / "index.html").as_uri())
            pg.click("[data-fk=open-3d]"); pg.wait_for_selector("[data-a3d=error]", timeout=5000)
            check("file://" in pg.inner_text("[data-a3d=error]") and pg.is_visible("[data-a3d=fallback]"),
                  "8. aberto por file://: explica o motivo e oferece as vistas técnicas")
            b.close()
    finally:
        s1.terminate(); s2.terminate()
    (OUT / "resultado.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\nAPROVADO" if ok_all else "\nREPROVADO", f"({sum(r.startswith('OK') for r in results)}/{len(results)})")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()

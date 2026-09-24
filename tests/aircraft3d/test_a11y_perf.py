"""Fase 7 — acessibilidade, responsividade e desempenho (Playwright + Chromium).

Uso:  python3 tests/aircraft3d/test_a11y_perf.py [pasta_de_capturas]
Sem axe-core (sem acesso ao npm): as regras são conferidas diretamente no DOM — nomes
acessíveis, foco visível, contraste WCAG 2.x calculado, movimento reduzido, diálogo modal,
Assistente CTRL sem sobreposição, tablet e celular, e métricas de desempenho.
"""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_fase1 as F1  # noqa: E402
import test_fase2 as F2  # noqa: E402
import test_fase3 as F3  # noqa: E402

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else F1.ROOT / "tests" / "aircraft3d" / "capturas"
OUT.mkdir(parents=True, exist_ok=True)
ok_all, results = True, []
METRICS = {}

UNNAMED_JS = """(root) => [...document.querySelectorAll(root + ' button, ' + root + ' [role=option], ' + root + ' canvas')]
  .filter((el) => el.getClientRects().length && !(el.getAttribute('aria-label') || el.textContent.trim() || el.getAttribute('title')))
  .map((el) => el.outerHTML.slice(0, 90))"""

CONTRAST_JS = """(sels) => {
  const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const over = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
  const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); const c = parse(cs.backgroundColor);
      if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } else if (cs.backgroundImage && cs.backgroundImage !== 'none') { layers.push([15, 31, 51, 1]); break; } }
    let acc = [255, 255, 255, 1]; for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc); return acc; };
  const out = [];
  for (const sel of sels) for (const el of document.querySelectorAll(sel)) {
    if (!el.getClientRects().length || !el.textContent.trim()) continue;
    const cs = getComputedStyle(el); const fg = parse(cs.color); const bg = bgOf(el); const f = over(fg, bg);
    const L1 = lum(f), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    out.push({ sel, text: el.textContent.trim().slice(0, 40), ratio: Math.round(ratio * 100) / 100, need: large ? 3 : 4.5 });
    break;
  }
  return out; }"""


def check(cond, msg):
    global ok_all
    results.append(("OK   " if cond else "FALHA") + " " + msg)
    print(results[-1]); ok_all &= bool(cond)


def main():
    s1 = F1.serve(F1.FRONT, 4173)
    time.sleep(1.0)
    base = "http://127.0.0.1:4173/"
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
            ctx = b.new_context(viewport={"width": 1440, "height": 900})
            ctx.add_init_script(F1.SESSION)
            ctx.add_init_script("""window.__long = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push({ t: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch {}""")
            pg = ctx.new_page()
            errors = []
            pg.on("pageerror", lambda e: errors.append(str(e)))
            F1.goto_step2(pg, base)

            mascot_before = pg.is_visible("[data-fk=mascot]")
            t_open = pg.evaluate("performance.now()")
            pg.click("[data-fk=open-3d]"); F1.wait_ready(pg, 60000)
            t_first = pg.evaluate("performance.now()")
            pg.wait_for_function("window.CtrlCDAircraft3D.inspect().selection.raycastReady", timeout=30000)
            t_ready = pg.evaluate("performance.now()")
            F2.wait_idle(pg)
            longs = [l for l in pg.evaluate("window.__long") if l["t"] >= t_first]
            m = pg.evaluate("window.CtrlCDAircraft3D.lastMetrics")
            max_long = max([l["d"] for l in longs], default=0)
            METRICS.update({"glb_bytes": m["bytes"], "glb_load_ms": m["loadMs"], "triangles": m["triangles"], "first_frame_ms": m["firstFrameMs"],
                            "raycast_build_ms_total": m["raycastBuildMs"], "ready_after_first_frame_ms": round(t_ready - t_first),
                            "max_long_task_after_first_frame_ms": round(max_long), "long_tasks_after_first_frame": len(longs)})
            lt_ok = pg.evaluate("PerformanceObserver.supportedEntryTypes.includes('longtask')")
            all_long = pg.evaluate("window.__long.length")
            METRICS["long_tasks_total_session"] = all_long
            check(lt_ok and all_long > 0, f"medição de tarefas longas ativa (API longtask; {all_long} tarefas longas na sessão, p.ex. leitura do GLB)")
            check(max_long < 400, f"índice de raycast em fatias: maior tarefa longa após o 1º quadro = {max_long:.0f} ms (antes: ~1070 ms numa única tarefa)")

            # ---------- diálogo, nomes, foco ----------
            dlg = pg.evaluate("(() => { const d = document.querySelector('[data-a3d=overlay]'); return [d.getAttribute('role'), d.getAttribute('aria-modal'), !!document.getElementById(d.getAttribute('aria-labelledby')), !!document.getElementById(d.getAttribute('aria-describedby'))]; })()")
            check(dlg == ["dialog", "true", True, True], "3D: diálogo modal com título e descrição (aviso demonstrativo) associados")
            unnamed = pg.evaluate(UNNAMED_JS, ".ccd-a3d")
            check(not unnamed, f"3D: todos os botões e o canvas têm nome acessível ({len(unnamed)} sem nome){': ' + unnamed[0] if unnamed else ''}")
            live = pg.eval_on_selector_all(".ccd-a3d [aria-live]", "e => e.length")
            check(live >= 2 and pg.get_attribute(".ccd-a3d__canvas", "role") == "img", f"3D: {live} regiões aria-live para estados textuais; canvas com papel e descrição dos controles")
            pg.focus("[data-a3d-view=top]"); pg.keyboard.press("Tab")
            ow = pg.evaluate("(() => { const cs = getComputedStyle(document.activeElement); return [cs.outlineStyle, parseFloat(cs.outlineWidth)]; })()")
            check(ow[0] != "none" and ow[1] >= 2, f"3D: foco visível no teclado (contorno {ow[0]} {ow[1]} px)")
            check(not pg.is_visible("[data-fk=mascot]") and mascot_before, "Assistente CTRL oculto enquanto o visualizador 3D está aberto")

            # ---------- contraste ----------
            F3.hover(pg, F3.scan(pg)["regions"]["wing_left"])
            sels = [".ccd-a3d__disclaimer", ".ccd-a3d__help", ".ccd-a3d__sidehint", ".ccd-a3d__regionname", ".ccd-a3d__regionmeta",
                    ".ccd-a3d__sidetitle", ".ccd-a3d__view", ".ccd-a3d__tiptitle", ".ccd-a3d__tipmeta", ".ccd-a3d__phase", ".ccd-a3d__metrics", ".ccd-a3d__crumbcur"]
            cr = pg.evaluate(CONTRAST_JS, sels)
            bad = [c for c in cr if c["ratio"] < c["need"]]
            METRICS["contrast"] = cr
            check(not bad and len(cr) >= 10, f"3D: contraste WCAG AA em {len(cr)} tipos de texto (mínimo {min(c['ratio'] for c in cr):.2f}:1){'; abaixo: ' + json.dumps(bad, ensure_ascii=False) if bad else ''}")
            pg.keyboard.press("Escape"); pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
            check(pg.is_visible("[data-fk=mascot]"), "Assistente CTRL volta ao fechar o visualizador")

            # ---------- 2D ----------
            pg.click("[data-fk=open-2d]"); pg.wait_for_timeout(500)
            unnamed2 = pg.evaluate(UNNAMED_JS, ".ccd-ac")
            cr2 = pg.evaluate(CONTRAST_JS, [".ccd-ac2__notice", ".ccd-ac__levelname", ".ccd-ac__option", ".ccd-ac__optionshead", ".ccd-ac__status", ".ccd-ac__model"])
            bad2 = [c for c in cr2 if c["ratio"] < c["need"]]
            check(not unnamed2 and not pg.is_visible("[data-fk=mascot]"), f"2D: botões com nome acessível ({len(unnamed2)} sem nome); Assistente CTRL oculto")
            check(not bad2, f"2D: contraste WCAG AA em {len(cr2)} tipos de texto (mínimo {min(c['ratio'] for c in cr2):.2f}:1){'; abaixo: ' + json.dumps(bad2, ensure_ascii=False) if bad2 else ''}")
            pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
            check(not errors, f"sem erros de página ({len(errors)})")

            # ---------- movimento reduzido ----------
            rctx = b.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce")
            rctx.add_init_script(F1.SESSION)
            rp = rctx.new_page()
            F2.open_viewer(rp, base)
            rp.click("[data-a3d-view=front]"); rp.wait_for_timeout(60)
            instant = not F2.state(rp)["animating"] and F2.state(rp)["preset"] == "front"
            rot_disabled = rp.locator("[data-a3d=autorotate]").is_disabled()
            rp.keyboard.press("Escape"); rp.wait_for_timeout(200)
            rp.click("[data-fk=open-2d]"); rp.wait_for_timeout(300)
            rp.click(".ccd-ac__option[data-region-id=wing_left]"); rp.wait_for_timeout(40)
            vb2 = rp.get_attribute(".ccd-ac2__svg", "viewBox")
            rp.wait_for_timeout(500)
            check(instant and rot_disabled and vb2 == rp.get_attribute(".ccd-ac2__svg", "viewBox"),
                  "prefers-reduced-motion: troca de vista instantânea, rotação automática indisponível, enquadramento 2D sem animação")
            rctx.close()

            # ---------- tablet ----------
            tctx = b.new_context(viewport={"width": 820, "height": 1180}, has_touch=True)
            tctx.add_init_script(F1.SESSION)
            tp = tctx.new_page()
            F2.open_viewer(tp, base)
            h0 = tp.locator(".ccd-a3d__canvas").bounding_box()["height"]
            tp.click("[data-a3d=toggle-panels]"); tp.wait_for_timeout(300)
            h1 = tp.locator(".ccd-a3d__canvas").bounding_box()["height"]
            check(tp.is_visible("[data-a3d=toggle-panels]") and tp.get_attribute("[data-a3d=toggle-panels]", "aria-expanded") == "false" and h1 > h0 + 100,
                  f"tablet: painéis recolhíveis ampliam o visualizador ({h0:.0f} → {h1:.0f} px)")
            (OUT / "f7-3-tablet.png").write_bytes(tp.screenshot())
            tctx.close()

            # ---------- celular ----------
            mctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
            mctx.add_init_script(F1.SESSION)
            mp = mctx.new_page()
            F2.open_viewer(mp, base)
            mp.wait_for_function("window.CtrlCDAircraft3D.inspect().selection.raycastReady", timeout=30000)
            bar = mp.locator("[data-a3d=mobilebar]")
            bb = bar.bounding_box()
            fixed = bb and bb["y"] + bb["height"] <= 844 - 40
            Rm = F3.scan(mp, 6)["regions"]
            w = Rm.get("wing_left") or Rm.get("wing_right")
            mp.touchscreen.tap(w["x"], w["y"]); mp.wait_for_timeout(300)
            label = mp.inner_text("[data-a3d=mobile-action]")
            mp.locator("[data-a3d=mobile-action]").tap(); mp.wait_for_timeout(900)
            conf = F2.state(mp)["selection"]["confirmedPath"]
            stage_h = mp.locator(".ccd-a3d__stage").bounding_box()["height"]
            check(bar.is_visible() and fixed and label == "Confirmar região" and len(conf) == 2 and stage_h > 844 * 0.5 and not mp.is_visible("[data-fk=mascot]"),
                  f"celular: barra fixa com o próximo passo ('{label}') confirma por toque; palco com {stage_h:.0f} px; Assistente oculto")
            (OUT / "f7-4-celular-barra.png").write_bytes(mp.screenshot())
            mctx.close()
            b.close()
    finally:
        s1.terminate()
    (OUT / "metricas-desempenho.json").write_text(json.dumps(METRICS, ensure_ascii=False, indent=2), encoding="utf-8")
    print("MÉTRICAS", json.dumps({k: v for k, v in METRICS.items() if k != "contrast"}, ensure_ascii=False))
    print(f"\n{sum(r.startswith('OK') for r in results)}/{len(results)} verificações OK")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()

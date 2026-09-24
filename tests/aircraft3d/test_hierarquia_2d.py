"""Localizador 2D com a hierarquia compartilhada do 3D (Playwright + Chromium).

Uso:  python3 tests/aircraft3d/test_hierarquia_2d.py
Confere que o localizador 2D (ctrlcd/aircraft.js) usa a mesma hierarquia de 87 regiões do
visualizador 3D e produz o mesmo texto de localização, preservando o contrato onConfirm(string).
"""
import sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
LOCAL_API = "http://127.0.0.1:8001/"  # back-end local de usuários/registros (não é requisição externa)

sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_fase1 as F1  # noqa: E402

ok_all, results = True, []


def check(cond, msg):
    global ok_all
    results.append(("OK   " if cond else "FALHA") + " " + msg)
    print(results[-1]); ok_all &= bool(cond)


def options(pg):
    return pg.eval_on_selector_all(".ccd-ac__option", "els => els.map(e => e.dataset.regionId)")


def pick(pg, rid):
    pg.click(f".ccd-ac__option[data-region-id={rid}]"); pg.wait_for_timeout(150)


def main():
    s1 = F1.serve(F1.FRONT, 4173)
    time.sleep(1.0)
    base = "http://127.0.0.1:4173/"
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            ctx = b.new_context(viewport={"width": 1440, "height": 900})
            ctx.add_init_script(F1.SESSION)
            pg = ctx.new_page()
            errors, requests = [], []
            pg.on("console", lambda m: m.type == "error" and "/api/" not in (m.location or {}).get("url", "") and errors.append(m.text))
            pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.on("request", lambda r: None if r.url.startswith(LOCAL_API) else requests.append(r.url))
            F1.goto_step2(pg, base)

            same = pg.evaluate("""(() => { const H = window.CtrlCDAircraftHierarchy, R = window.CtrlCD3D.regions;
              return H.REGIONS.length === 87 && R.AIRCRAFT_REGIONS === H.REGIONS; })()""")
            check(same, "2D e 3D usam o mesmo objeto de hierarquia (87 regiões, fonte única ctrlcd/aircraft-hierarchy.js)")

            pg.click("[data-fk=open-2d]"); pg.wait_for_timeout(400)   # (Fase 6) o 2D é a alternativa ao 3D
            levels = pg.eval_on_selector_all(".ccd-ac__levelname", "els => els.map(e => e.textContent)")
            check(levels == ["Aeronave", "Grande região", "Seção", "Sistema ou estrutura", "Componente", "Área da não conformidade"],
                  f"2D mostra os 6 níveis do 3D: {levels}")
            check(options(pg) == ["fuselage", "wing_left", "wing_right", "powerplant_left", "powerplant_right", "empennage", "landing_gear"]
                  and pg.get_by_role("button", name="Confirmar localização").is_disabled(),
                  "primeira lista = 7 grandes regiões (nível 2); Confirmar desabilitado sem grande região")
            pick(pg, "wing_left")
            check(options(pg) == ["wing_left_leading_edge", "wing_left_upper_surface", "wing_left_trailing_edge", "wing_left_tip"],
                  "Asa esquerda → lista das seções da asa (nível 3), iguais às do 3D")
            pick(pg, "wing_left_leading_edge"); pick(pg, "wing_left_le_devices"); pick(pg, "slat_left")
            head = pg.inner_text(".ccd-ac__optionshead")
            status = pg.inner_text(".ccd-ac__status")
            check(options(pg) == [] and "sem subdivisões" in head and "Nível 5 de 6" in status
                  and pg.inner_text(".ccd-ac__crumb") == "Asa esquerda › Bordo de ataque › Dispositivos hipersustentadores › Slats – asa esquerda",
                  "descida até o nível 5 (Slats – asa esquerda); nível 6 fica para o marcador")
            # Alterar um nível
            pg.locator(".ccd-ac__level").nth(2).get_by_role("button", name="Alterar").click(); pg.wait_for_timeout(150)
            check(options(pg)[0] == "wing_left_leading_edge" and pg.inner_text(".ccd-ac__crumb") == "Asa esquerda",
                  "'Alterar' no nível 3 desfaz esse nível e os de baixo")
            pick(pg, "wing_left_leading_edge")
            pg.get_by_role("button", name="Confirmar localização").click(); pg.wait_for_timeout(1500)
            slot = pg.inner_text("#experimentSlot")
            check("Localização confirmada pelo usuário" in slot and "Asa esquerda · Bordo de ataque" in slot,
                  "onConfirm(string) mantido: o formulário recebe 'Asa esquerda · Bordo de ataque'")
            text3d = pg.evaluate("""window.CtrlCD3D.regions.labelOf(window.CtrlCD3D.regions.locationFrom(
              ['aircraft', 'wing_left', 'wing_left_leading_edge'], { view: 'top', partial: true }))""")
            check(text3d == "Asa esquerda · Bordo de ataque", "o 3D gera exatamente o mesmo texto para o mesmo caminho")

            # reabrir: pré-seleção pelo texto
            pg.click("[data-fk=open-2d]"); pg.wait_for_timeout(400)
            check(pg.inner_text(".ccd-ac__crumb") == "Asa esquerda › Bordo de ataque" and options(pg) == ["wing_left_le_structure", "wing_left_le_devices"]
                  and pg.evaluate("document.querySelector('.ccd-ac2__svg g[data-region-id=wing_left_leading_edge]').classList.contains('is-current')"),
                  "reabrir pré-seleciona o caminho a partir do texto e destaca a região no desenho")
            # (Fase 7) o painel de zona do desenho antigo foi removido junto com o desenho; a troca de ramo é por "Alterar"
            pg.locator(".ccd-ac__level").nth(1).get_by_role("button", name="Alterar").click(); pg.wait_for_timeout(300)
            pg.click(".ccd-ac__option[data-region-id=powerplant_right]"); pg.wait_for_timeout(300)
            pg.click(".ccd-ac__option[data-region-id=engine_right]"); pg.wait_for_timeout(300)
            check(pg.inner_text(".ccd-ac__crumb") == "Grupo motor direito › Motor direito" and options(pg) == ["engine_right_nacelle"],
                  "'Alterar' no nível 2 e escolha do motor direito; a lista segue para o nível 4")
            pg.get_by_role("button", name="Confirmar localização").click(); pg.wait_for_timeout(1500)
            check("Grupo motor direito · Motor direito" in pg.inner_text("#experimentSlot"), "confirmação grava 'Grupo motor direito · Motor direito'")

            # texto no formato antigo: pré-seleção pela seção
            pg.evaluate("""window.__got = null; window.CtrlCDAircraft.open({ current: 'Fuselagem – Seção central · Estrutura primária', onConfirm: (v) => { window.__got = v; } })""")
            pg.wait_for_timeout(300)
            crumb = pg.inner_text(".ccd-ac__crumb")
            pg.get_by_role("button", name="Confirmar localização").click(); pg.wait_for_timeout(1500)
            check(crumb == "Fuselagem › Fuselagem central" and pg.evaluate("window.__got") == "Fuselagem · Fuselagem central",
                  "texto no formato antigo ('Fuselagem – Seção central …') é convertido para o caminho da nova hierarquia")
            check(not errors and not [u for u in requests if not u.startswith((base, "blob:", "data:"))], f"console sem erros ({len(errors)}); nenhuma requisição externa")
            b.close()
    finally:
        s1.terminate()
    print(f"\n{sum(r.startswith('OK') for r in results)}/{len(results)} verificações OK")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()

"""Teste de ponta a ponta da versão integrada (Fases 1-7 + back-end novo + feature tipo de NC).

Uso (na raiz do projeto):
    python tests/integracao/test_integracao_completa.py [pasta_de_capturas]

- Sobe um simulador local do Experimental Lab (lab_stub.py, HTTPS autoassinado): nenhuma chave real é usada.
- Abre o projeto pelo lançador (iniciar_ctrlcd.py): serve.py na 4173 e o back-end de usuários na 8001.
- Percorre: login real → Assistente CTRL (pop-up e página de chat) → tipo de NC do Anexo 6.2 →
  requisitos AS IS/TO BE → localização 3D → evidências (vídeo) → compilado com normas → revisão.
Requer Playwright + Chromium e as dependências do requirements.txt (ou equivalentes no PYTHONPATH).
"""
from __future__ import annotations

import os
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "capturas"
OUT.mkdir(parents=True, exist_ok=True)
STUB_PORT = 18443
BASE = "http://127.0.0.1:4173/"
results, ok_all = [], True


def check(cond, msg):
    global ok_all
    results.append(("OK   " if cond else "FALHA") + " " + msg)
    print(results[-1], flush=True)
    ok_all &= bool(cond)


def port_open(port):
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def main():
    tmp = Path(tempfile.mkdtemp(prefix="ctrlcd-int-"))
    # cópia do projeto sem .env (a chave real nunca é lida) e sem estado local
    work = tmp / "projeto"
    shutil.copytree(ROOT, work, ignore=shutil.ignore_patterns(".git", ".env", ".venv", "__pycache__", "capturas"))
    check(not (work / ".env").exists(), "Cópia de teste sem .env (usa só o simulador do Lab)")
    env = {**os.environ,
           "EXPERIMENTAL_LAB_API_URL": f"https://127.0.0.1:{STUB_PORT}/aws-bedrock",
           "EXPERIMENTAL_LAB_API_KEY": "chave-ficticia-de-teste",
           "EXPERIMENTAL_LAB_VERIFY_TLS": "false",
           "EXPERIMENTAL_LAB_REQUEST_TIMEOUT_SECONDS": "20",
           "PYTHONUNBUFFERED": "1"}
    stub = subprocess.Popen([sys.executable, str(HERE / "lab_stub.py"), "--port", str(STUB_PORT), "--log", str(tmp / "lab.jsonl")],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)
    launcher = subprocess.Popen([sys.executable, "iniciar_ctrlcd.py", "--sem-navegador"], cwd=work, env=env,
                                stdout=(tmp / "lancador.log").open("w"), stderr=subprocess.STDOUT)
    try:
        for _ in range(80):
            if port_open(4173) and port_open(8001):
                break
            time.sleep(0.5)
        time.sleep(1.0)
        log = (tmp / "lancador.log").read_text(encoding="utf-8", errors="replace")
        check("serve.py" in log, "Lançador sobe a interface pelo serve.py (páginas + Assistente CTRL)")
        with sync_playwright() as p:
            b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
            pg = b.new_page(viewport={"width": 1440, "height": 900})
            errors, external = [], []
            pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.on("request", lambda r: None if r.url.startswith(("http://127.0.0.1:4173/", "http://127.0.0.1:8001/", "data:", "blob:")) else external.append(r.url))

            # login real no back-end de usuários
            pg.goto(BASE)
            pg.wait_for_url("**/auth/**")
            pg.fill("#email", "admin.demo@example.com")
            pg.fill("#password", "admin123")
            pg.click("button[type=submit]")
            pg.wait_for_selector("[data-fk=mascot]", timeout=15000)
            check(pg.is_visible("#pageExperiment"), "Login real → Registro de NC (tela principal)")
            pg.wait_for_function("() => document.getElementById('connectionStatus')?.dataset.status !== 'checking'", timeout=20000)
            check(pg.text_content("#connectionStatus").strip() == "Experimental Lab conectado", "serve.py /api/health → agente → Lab: \"Experimental Lab conectado\"")

            # Assistente CTRL no pop-up (back-end novo)
            pg.click("[data-fk=mascot]")
            pg.click(".ccd-assistant__suggestion >> nth=0")
            pg.wait_for_selector(".ccd-assistant__message--assistant", timeout=20000)
            answer = pg.inner_text(".ccd-assistant__message--assistant")
            check("Resposta simulada" in answer and pg.locator(".ccd-assistant__message--assistant strong").count() >= 1 and "**" not in answer, f"Pop-up do Assistente CTRL responde pelo agente ({answer[:40]!r}…)")
            pg.screenshot(path=str(OUT / "int-1-popup.png"))
            pg.fill("[data-fk=assistant-input]", "E sobre fotos?")
            pg.keyboard.press("Enter")
            pg.wait_for_function("() => document.querySelectorAll('.ccd-assistant__message--assistant').length === 2", timeout=20000)
            check("histórico recebido: 3" in pg.inner_text(".ccd-assistant__message--assistant >> nth=1"), "Segunda pergunta mantém o histórico da conversa no agente")
            pg.keyboard.press("Escape")

            # Tipo de NC (feature): lista oficial do Anexo 6.2, normas e requisitos AS IS / TO BE
            pg.get_by_role("button", name="Novo registro").first.click()
            pg.locator("[data-fk=nc-search]").fill("vazamento")
            pg.locator("[role=option]", has_text="Vazamento").first.click()
            hint = pg.locator(".ccd-hint").first.inner_text()
            pg.hover(".ccd-info__btn")
            tip = pg.inner_text(".ccd-info__tooltip")
            check("lista oficial do Anexo 6.2" in hint and tip.strip() != "", f"Etapa 1: lista do Anexo 6.2 ({hint.split(' tipos')[0]} tipos) e normas no ícone i ({tip.splitlines()[0] if tip else ''})")
            pg.locator("[data-fk=nc-confirm]").click()
            pg.locator("[data-fk=step1-next]").click()
            pg.locator("[data-fk=hasar-Não]").click()
            pg.locator("[data-fk=installed-Sim]").click()
            rows = pg.locator(".ccd-reqrow").count()
            rec = pg.evaluate("(() => { const r = window.CtrlCD.state.rec; return { n: r.requirements.length, src: r.requirementSource, std: r.applicableStandards }; })()")
            check(rows == rec["n"] and rows > 0 and rec["src"].startswith("Anexo 02 - 5529"), f"Etapa 2: {rows} requisitos do Anexo 6.2 com AS IS / TO BE; fonte e normas no registro ({rec['std']})")
            first = pg.locator("[data-fk$='-asis']").first
            first.fill("Gotejamento na conexão")
            pg.locator("[data-fk$='-tobe']").first.fill("Sem vazamento")

            # Localização 3D (Fases 1-7) continua no formulário integrado
            pg.click("[data-fk=open-3d]")
            pg.wait_for_function("window.CtrlCDAircraft3D && window.CtrlCDAircraft3D.lastMetrics && window.CtrlCDAircraft3D.lastMetrics.firstFrameMs !== null", timeout=60000)
            check(pg.is_visible(".ccd-a3d canvas"), "Localizador 3D abre a partir da Etapa 2 integrada")
            pg.keyboard.press("Escape")
            pg.wait_for_timeout(400)

            # Evidências (back-end novo): zona de vídeo para Vazamento
            pg.evaluate("(() => { window.CtrlCD.state.rec.currentStep = 3; window.CtrlCD.render(); })()")
            check(pg.get_by_text("Vídeo da não conformidade").count() >= 1, "Etapa 3: zona de vídeo exigida para Vazamento")

            # Compilado (integração): normas e itens do Anexo 6.2
            pg.evaluate("(() => { window.CtrlCD.state.rec.currentStep = 4; window.CtrlCD.render(); })()")
            comp = pg.inner_text(".ccd-compiled >> nth=0") + "\n" + (pg.inner_text("[data-fk=compiled-requirements]") if pg.locator("[data-fk=compiled-requirements]").count() else "")
            check("Normas aplicáveis" in comp and "Gotejamento na conexão" in comp, "Etapa 4: compilado mostra normas aplicáveis e o AS IS/TO BE dos itens")
            pg.screenshot(path=str(OUT / "int-2-compilado.png"), full_page=True)
            pg.click("[data-fk=run-ai]")
            pg.wait_for_function("() => window.CtrlCD.state.rec.aiDone", timeout=20000)
            rv = pg.evaluate("""(() => { const r = window.CtrlCD.state.rec; return { src: r.aiSource, err: r.aiError, op: r.aiOpinion,
                sug: r.aiSuggestions.map((s) => ({ id: s.id, target: s.target, applicable: s.applicable })), missing: r.aiMissing }; })()""")
            check(rv["src"] == "ctrl-cd-agent" and rv["op"].startswith("Parecer simulado") and not rv["err"],
                  f"Etapa 4: revisão por IA pelo agente (registro gravado em /api/records → agente → Lab): {rv['op'][:60]}")
            targets = {s["id"]: s for s in rv["sug"]}
            check(targets.get("r1", {}).get("target") == "asIs" and str(targets.get("r2", {}).get("target", "")).startswith("req:") and targets.get("r3", {}).get("applicable") is False,
                  f"Sugestões do agente mapeadas para campos aplicáveis (AS IS, item do Anexo 6.2) ou observação ({[s['target'] for s in rv['sug']]})")
            check("Referência de desenho não informada" in pg.inner_text("#pageExperiment"), "Lacunas apontadas pelo agente aparecem na Etapa 4")
            cards = pg.locator(".ccd-suggestion")
            cards.nth(0).get_by_role("button", name="Aceitar").click()
            cards.nth(1).get_by_role("button", name="Aceitar").click()
            cards.nth(2).get_by_role("button", name="Ciente").click()
            after = pg.evaluate("(() => { const r = window.CtrlCD.state.rec; return { asIs: r.asIs, req: r.requirements[0].toBe, pend: r.aiSuggestions.filter((s) => s.status === 'pending').length }; })()")
            check("Medição registrada" in after["asIs"] and after["req"].startswith("Sem vazamento visível") and after["pend"] == 0,
                  "Aceitar aplica a sugestão no AS IS e no item do Anexo 6.2; a observação não altera o registro")
            pg.screenshot(path=str(OUT / "int-3-revisao-ia.png"), full_page=True)

            # Página de chat (back-end novo)
            pg.click(".rail__item[data-route=chat]")
            pg.fill("#input", "Qual a diferença entre Nota CD e AR?")
            pg.keyboard.press("Enter")
            pg.wait_for_function("() => !document.querySelector('#messages .thinking') && document.querySelectorAll('#messages .msg--ai').length", timeout=20000)
            check("Resposta simulada" in pg.inner_text("#messages .msg--ai >> nth=-1"), "Página de chat responde pelo agente")
            # Assistente em todas as telas: também na página de chat, acima da caixa de mensagem
            mb = pg.locator("[data-fk=mascot]").bounding_box()
            cb = pg.locator("#composerBox").bounding_box()
            check(pg.is_visible("[data-fk=mascot]") and mb and cb and mb["y"] + mb["height"] <= cb["y"] + 2,
                  "Pop-up do Assistente disponível também na página de chat, sem cobrir a caixa de mensagem")
            pg.click("[data-fk=mascot]")
            check(pg.locator(".ccd-assistant__message--assistant").count() == 2 and pg.evaluate("document.activeElement?.dataset.fk") == "assistant-input",
                  "A conversa do pop-up continua a mesma em outra tela; o foco vai para a pergunta")
            pg.keyboard.press("Escape")
            check(not pg.is_visible(".ccd-assistant") and pg.evaluate("document.activeElement?.dataset.fk") == "mascot", "Escape fecha o pop-up em qualquer tela e devolve o foco ao ícone")

            # Visão gerencial com os registros reais do servidor (perfil administrador vê todos)
            pg.click(".rail__item[data-route=experiment]")
            pg.click(".ccd-navitem:has-text('Visão gerencial')")
            pg.wait_for_function("() => window.CtrlCD.state.dashboard.server.state === 'ok'", timeout=15000)
            badge = pg.inner_text(".ccd-dash__badge")
            srv_n = pg.evaluate("window.CtrlCD.state.dashboard.server.items.length")
            check(badge.startswith("Registros reais") and srv_n >= 14, f"Visão gerencial: registros reais do servidor ({badge})")
            wing = pg.locator("g.ccd-dash__region[data-region-id=wing_right]")
            label = wing.get_attribute("aria-label")
            fill = wing.locator(".shape").first.get_attribute("fill")
            check("Asa direita" in label and fill != "#eff0f1", f"Mapa da aeronave colorido pela quantidade de NCs ({label})")
            wing.click()
            pg.wait_for_selector("[data-fk=dash-detail]")
            det = pg.inner_text("[data-fk=dash-detail]")
            check("Asa direita" in det and "tipos de nc nesta região" in det.lower() and pg.locator("[data-fk=dash-detail] .ccd-dash__hbar").count() >= 1,
                  "Clique na asa abre o gráfico de NCs da asa (tipos, seções, status e registros)")
            pg.locator(".ccd-dash__card--map").screenshot(path=str(OUT / "int-4-visao-gerencial-mapa.png"))
            pg.click("[data-fk=dash-source-demo]")
            check(pg.inner_text(".ccd-dash__badge") == "Dados fictícios para demonstração", "Alternância para dados fictícios, identificados como tal")
            check(not errors, f"Sem erros de JavaScript ({errors[:2]})")
            fonts = [x for x in external if x.startswith(("https://fonts.googleapis.com/", "https://fonts.gstatic.com/"))]
            check(not [x for x in external if x not in fonts], f"Sem requisições externas pelo navegador além das fontes do Google já usadas pela tela de login ({len(fonts)})")
            b.close()
    finally:
        launcher.send_signal(signal.SIGINT)
        try:
            launcher.wait(timeout=10)
        except subprocess.TimeoutExpired:
            launcher.kill()
        stub.terminate()
    time.sleep(1)
    check(not port_open(4173) and not port_open(8001), "Ao encerrar o lançador, as portas 4173 e 8001 são liberadas")
    total, falhas = len(results), sum(r.startswith("FALHA") for r in results)
    print(f"\n{total - falhas}/{total} verificações aprovadas")
    (OUT / "resultado-integracao-completa.txt").write_text("\n".join(results) + f"\n\n{total - falhas}/{total}\n", encoding="utf-8")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()

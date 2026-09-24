(() => {
  "use strict";

  const SESSION_KEY = "hackaemb.session";
  const API_BASE = "http://127.0.0.1:8001";
  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const feedback = document.getElementById("feedback");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    feedback.textContent = "Entrando...";
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: passwordInput.value }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.title || "Não foi possível entrar.");
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: result.token, user: result.user, authenticatedAt: new Date().toISOString() }));
      localStorage.setItem("hackaemb.account", JSON.stringify(result.user));
      const returnTarget = new URLSearchParams(window.location.search).get("return");
      window.location.href = returnTarget === "../management/" ? returnTarget : "../index.html";
    } catch (error) {
      feedback.textContent = error.message === "Failed to fetch" ? "Servidor de usuários indisponível." : error.message;
    }
  });
})();

(() => {
  "use strict";

  const USERS_KEY = "hackaemb.users";
  const SESSION_KEY = "hackaemb.session";
  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const feedback = document.getElementById("feedback");

  async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function readUsers() {
    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      return Array.isArray(users) ? users : [];
    } catch {
      return [];
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    const passwordHash = await hashPassword(passwordInput.value);
    const user = readUsers().find((item) => item.email.toLowerCase() === email);
    if (!user || !user.passwordHash || user.passwordHash !== passwordHash) {
      feedback.textContent = "E-mail ou senha inválidos.";
      return;
    }
    if (!user.active || user.blocked) {
      feedback.textContent = "Esta conta está desativada ou bloqueada.";
      return;
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, authenticatedAt: new Date().toISOString() }));
    localStorage.setItem("hackaemb.account", JSON.stringify(user));
    window.location.href = "../index.html";
  });
})();

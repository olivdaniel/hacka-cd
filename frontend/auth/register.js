(() => {
  "use strict";

  const API_BASE = "https://hacka-cd.onrender.com";
  const form = document.getElementById("registerForm");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const passwordConfirmationInput = document.getElementById("passwordConfirmation");
  const feedback = document.getElementById("feedback");

  document.querySelectorAll("[data-password-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordTarget);
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.textContent = visible ? "Mostrar" : "Ocultar";
      button.setAttribute("aria-label", `${visible ? "Mostrar" : "Ocultar"} senha`);
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    if (password !== passwordConfirmationInput.value) {
      feedback.textContent = "As senhas não coincidem.";
      passwordConfirmationInput.focus();
      return;
    }
    feedback.textContent = "Criando conta...";
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.title || "Não foi possível criar a conta.");
      feedback.textContent = "Conta criada. Redirecionando para o acesso...";
      window.setTimeout(() => { window.location.href = "index.html"; }, 500);
    } catch (error) {
      feedback.textContent = error.message === "Failed to fetch" ? "Servidor de usuários indisponível." : error.message;
    }
  });
})();

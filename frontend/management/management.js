(() => {
  "use strict";

  const API_BASE = "https://hacka-cd.onrender.com";
  const SESSION_KEY = "hackaemb.session";
  const form = document.getElementById("userForm");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const passwordConfirmationInput = document.getElementById("passwordConfirmation");
  const roleInput = document.getElementById("role");
  const list = document.getElementById("usersList");
  const count = document.getElementById("count");
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

  function session() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function setFeedback(message, isError = false) {
    feedback.textContent = message;
    feedback.classList.toggle("error", isError);
  }

  async function api(path, options = {}) {
    const current = session();
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (current?.token) headers.Authorization = `Bearer ${current.token}`;
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const result = response.status === 204 ? {} : await response.json();
    if (!response.ok) throw new Error(result.title || "Operação não concluída.");
    return result;
  }

  function initials(name) {
    return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  }

  function actionButton(user, action, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "user-action";
    button.dataset.action = action;
    button.dataset.id = user.id;
    button.textContent = label;
    return button;
  }

  function roleEditor(user) {
    const wrapper = document.createElement("div");
    wrapper.className = "user-role-editor";
    const select = document.createElement("select");
    select.className = "user-role-select";
    select.dataset.roleId = user.id;
    for (const role of ["SOLICITANTE", "ANALISTA", "VERIFICADOR", "APROVADOR", "ADMINISTRADOR", "CONSULTA"]) {
      const option = document.createElement("option");
      option.value = role;
      option.textContent = role;
      option.selected = role === user.role;
      select.appendChild(option);
    }
    const save = actionButton(user, "role", "Salvar perfil");
    save.disabled = user.id === session()?.user?.id;
    wrapper.append(select, save);
    return wrapper;
  }

  function render(users) {
    count.textContent = String(users.length);
    list.replaceChildren();
    if (!users.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "Nenhuma conta cadastrada.";
      list.appendChild(empty);
      return;
    }
    for (const user of users) {
      const row = document.createElement("article");
      row.className = `user-row${user.active ? "" : " is-inactive"}`;
      const info = document.createElement("div");
      const name = document.createElement("strong");
      name.className = "user-name";
      name.textContent = `${initials(user.name)} · ${user.name}`;
      const meta = document.createElement("small");
      meta.className = "user-meta";
      meta.textContent = `${user.email} · ${user.role} · ${user.blocked ? "Bloqueado" : user.active ? "Ativo" : "Desativado"}`;
      info.append(name, meta);
      const actions = document.createElement("div");
      actions.className = "user-actions";
      actions.append(roleEditor(user));
      actions.append(actionButton(user, user.active ? "deactivate" : "activate", user.active ? "Desativar" : "Ativar"));
      actions.append(actionButton(user, user.blocked ? "unblock" : "block", user.blocked ? "Desbloquear" : "Bloquear"));
      actions.append(actionButton(user, "reset-password", "Redefinir senha"));
      const remove = actionButton(user, "delete", "Excluir conta");
      remove.classList.add("danger");
      remove.disabled = user.id === session()?.user?.id;
      actions.append(remove);
      row.append(info, actions);
      list.appendChild(row);
    }
  }

  async function loadUsers() {
    try {
      const result = await api("/api/users");
      render(result.items || []);
    } catch (error) {
      if (error.message === "Autenticação necessária" || error.message === "Permissão insuficiente") {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = "../auth/index.html?return=../management/";
        return;
      }
      setFeedback(error.message === "Failed to fetch" ? "Backend de usuários indisponível." : error.message, true);
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (passwordInput.value !== passwordConfirmationInput.value) {
      setFeedback("As senhas não coincidem.", true);
      passwordConfirmationInput.focus();
      return;
    }
    try {
      await api("/api/users", { method: "POST", body: JSON.stringify({ name: nameInput.value.trim(), email: emailInput.value.trim(), password: passwordInput.value, role: roleInput.value }) });
      form.reset();
      setFeedback("Usuário criado no backend.");
      await loadUsers();
    } catch (error) {
      setFeedback(error.message === "Failed to fetch" ? "Backend de usuários indisponível." : error.message, true);
    }
  });

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    try {
      if (button.dataset.action === "role") {
        const select = list.querySelector(`select[data-role-id="${button.dataset.id}"]`);
        await api(`/api/users/${button.dataset.id}`, { method: "PATCH", body: JSON.stringify({ role: select.value }) });
        setFeedback("Perfil atualizado no backend.");
        await loadUsers();
        return;
      }
      if (button.dataset.action === "delete") {
        if (!window.confirm("Excluir esta conta? O acesso será removido, mas o histórico será preservado.")) return;
        await api(`/api/users/${button.dataset.id}`, { method: "DELETE" });
        setFeedback("Conta excluída logicamente. O histórico foi preservado.");
        await loadUsers();
        return;
      }
      if (button.dataset.action === "reset-password") {
        const password = window.prompt("Digite a nova senha (mínimo de 8 caracteres):");
        if (password === null) return;
        const confirmation = window.prompt("Digite a nova senha novamente:");
        if (password !== confirmation) {
          setFeedback("As senhas não coincidem.", true);
          return;
        }
        await api(`/api/users/${button.dataset.id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword: password }) });
        setFeedback("Senha redefinida. O usuário precisará entrar novamente.");
        return;
      }
      await api(`/api/users/${button.dataset.id}/${button.dataset.action}`, { method: "POST" });
      await loadUsers();
    } catch (error) {
      setFeedback(error.message, true);
    }
  });

  loadUsers();
})();

/* ==========================================================================
   HackaEmb-web — lógica do front local
   Contrato SSE espelhado de aiframework-web/src/models/stream.model.ts
   ========================================================================== */
(() => {
  "use strict";

  const MAX_CHARS = 20000;
  const STORAGE_KEY = "hackaemb.chats";
  const ACTIVE_KEY = "hackaemb.activeId";

  /* ------------------------------------------------------------------ */
  /* Markdown mínimo — sem dependências, funciona offline                 */
  /* ------------------------------------------------------------------ */
  const Markdown = {
    escape(text) {
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },

    // Só http(s) e caminhos relativos; bloqueia javascript:, data:, etc.
    safeUrl(url) {
      const trimmed = url.trim();
      return /^(https?:\/\/|\/|#)/i.test(trimmed) ? trimmed : "#";
    },

    inline(text) {
      return text
        .replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`)
        .replace(
          /\[([^\]]+)\]\(([^)\s]+)\)/g,
          (_, label, url) =>
            `<a href="${Markdown.safeUrl(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
        )
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    },

    render(source) {
      const lines = Markdown.escape(source).split("\n");
      const out = [];
      let paragraph = [];
      let list = null;
      let codeLines = null;

      const flushParagraph = () => {
        if (paragraph.length) {
          out.push(`<p>${Markdown.inline(paragraph.join(" "))}</p>`);
          paragraph = [];
        }
      };
      const flushList = () => {
        if (list) {
          out.push(`<${list.tag}>${list.items.join("")}</${list.tag}>`);
          list = null;
        }
      };
      const flushAll = () => {
        flushParagraph();
        flushList();
      };

      for (const line of lines) {
        const fence = line.match(/^\s*```(.*)$/);

        if (codeLines !== null) {
          if (fence) {
            out.push(`<pre><code>${codeLines.join("\n")}</code></pre>`);
            codeLines = null;
          } else {
            codeLines.push(line);
          }
          continue;
        }

        if (fence) {
          flushAll();
          codeLines = [];
          continue;
        }

        if (!line.trim()) {
          flushAll();
          continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
          flushAll();
          const level = Math.min(heading[1].length, 6);
          out.push(`<h${level}>${Markdown.inline(heading[2])}</h${level}>`);
          continue;
        }

        const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
        const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
        if (bullet || ordered) {
          flushParagraph();
          const tag = bullet ? "ul" : "ol";
          if (!list || list.tag !== tag) {
            flushList();
            list = { tag, items: [] };
          }
          list.items.push(`<li>${Markdown.inline((bullet || ordered)[1])}</li>`);
          continue;
        }

        const quote = line.match(/^\s*&gt;\s?(.*)$/);
        if (quote) {
          flushAll();
          out.push(`<blockquote>${Markdown.inline(quote[1])}</blockquote>`);
          continue;
        }

        flushList();
        paragraph.push(line.trim());
      }

      if (codeLines !== null) out.push(`<pre><code>${codeLines.join("\n")}</code></pre>`);
      flushAll();
      return out.join("");
    },
  };

  /* ------------------------------------------------------------------ */
  /* Cliente de API — portado de src/services/api/chatService.ts         */
  /* ------------------------------------------------------------------ */
  const API = {
    async getUser() {
      return {
        name: "Ananda Soares",
        initials: "AS",
        agentName: "Ctrl + CD",
        email: "demo.ctrl-cd@example.invalid",
      };
    },

    async uploadFiles(files, chatId) {
      return {
        results: Array.from(files || []).map((file) => ({
          fileName: file.name,
          status: "ERROR",
          fileId: null,
          errorMessage: "Anexos disponíveis em uma etapa futura.",
        })),
      };
    },

    async verifyFile(fileId) {
      return {
        fileId,
        status: "ERROR",
        errorMessage: "Anexos disponíveis em uma etapa futura.",
      };
    },

    /**
     * MODO DEMONSTRAÇÃO (Skill 01, Marco 3): resposta simulada, sem rede.
     * Mantém o contrato público: onMetadata → onDelta → onComplete.
     * A Skill 02 substituirá somente esta implementação pela chamada ao
     * servidor Python local, sem alterar sendMessage() nem a interface.
     */
    async streamMessage(payload, callbacks = {}, signal) {
      const wait = (ms) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, ms);
          signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Cancelado", "AbortError"));
          });
        });

      try {
        if (signal?.aborted) return;
        await wait(700);
        callbacks.onMetadata?.({
          chatId: payload.chatId || null,
          title: String(payload.message || "Nova conversa").slice(0, 40),
        });
        const answer = [
          "**Resposta simulada — modo demonstração.**",
          "",
          "O Assistente CTRL ainda não está conectado às normas e aos documentos cadastrados. Por isso, não posso responder a esta pergunta com uma referência documental.",
          "",
          "> Não localizei essa informação nas normas e nos documentos disponíveis.",
          "",
          "Quando a base documental for conectada (Skills 02 a 05), cada resposta trará a norma, o documento, a seção e o link da referência.",
        ].join("\n");
        for (const chunk of answer.match(/[^\n]*\n?/g).filter(Boolean)) {
          await wait(60);
          callbacks.onDelta?.({ message: chunk });
        }
        callbacks.onComplete?.({ sources: [] });
      } catch (error) {
        if (error?.name === "AbortError") return;
        callbacks.onError?.({
          type: "error",
          detail: { title: "Modo demonstração", detail: "Falha ao gerar a resposta simulada." },
        });
      }
    },
  };

  /* ------------------------------------------------------------------ */
  /* Store — histórico em localStorage (substitui o backend da plataforma) */
  /* ------------------------------------------------------------------ */
  const Store = {
    chats: [],
    activeId: null,

    load() {
      try {
        Store.chats = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      } catch {
        Store.chats = [];
      }
      const saved = localStorage.getItem(ACTIVE_KEY);
      Store.activeId = Store.chats.some((chat) => chat.id === saved) ? saved : null;
    },

    save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Store.chats));
      if (Store.activeId) localStorage.setItem(ACTIVE_KEY, Store.activeId);
      else localStorage.removeItem(ACTIVE_KEY);
    },

    active() {
      return Store.chats.find((chat) => chat.id === Store.activeId) || null;
    },

    create(id, title) {
      const chat = {
        id: id || `local-${Date.now()}`,
        title: title || "Nova conversa",
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      Store.chats.unshift(chat);
      Store.activeId = chat.id;
      Store.save();
      return chat;
    },

    remove(id) {
      Store.chats = Store.chats.filter((chat) => chat.id !== id);
      if (Store.activeId === id) Store.activeId = null;
      Store.save();
    },

    touch(chat) {
      chat.updatedAt = new Date().toISOString();
      Store.chats = [chat, ...Store.chats.filter((item) => item.id !== chat.id)];
      Store.save();
    },
  };

  /* ------------------------------------------------------------------ */
  /* Elementos                                                           */
  /* ------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);
  const el = {
    rail: $("rail"),
    railToggle: $("railToggle"),
    userName: $("userName"),
    userEmail: $("userEmail"),
    userInitials: $("userInitials"),
    greetingName: $("greetingName"),
    agentChip: $("agentChip"),
    pageChat: $("pageChat"),
    pageHacka: $("pageHacka"),
    pageExperiment: $("pageExperiment"),
    chatScroll: $("chatScroll"),
    welcome: $("welcome"),
    messages: $("messages"),
    composerBox: $("composerBox"),
    uploads: $("uploads"),
    input: $("input"),
    counter: $("counter"),
    sendBtn: $("sendBtn"),
    attachBtn: $("attachBtn"),
    fileInput: $("fileInput"),
    history: $("history"),
    historyOpen: $("historyOpen"),
    historyClose: $("historyClose"),
    historyList: $("historyList"),
    historySearch: $("historySearch"),
    newChatBtn: $("newChatBtn"),
  };

  const icon = (name, extra = "") =>
    `<svg class="icon icon--sm ${extra}"><use href="#i-${name}" /></svg>`;

  let pendingFiles = [];
  let streaming = false;

  /* ------------------------------------------------------------------ */
  /* Renderização de mensagens                                           */
  /* ------------------------------------------------------------------ */
  function buildMessageNode(message) {
    const wrapper = document.createElement("div");
    wrapper.className = `msg msg--${message.role === "user" ? "user" : "ai"}`;
    if (message.error) wrapper.classList.add("msg--error");

    const card = document.createElement("div");
    card.className = "msg__card";

    if (message.role === "assistant" && message.reasoning) {
      card.appendChild(buildReasoningNode(message.reasoning));
    }

    const text = document.createElement("div");
    text.className = "msg__text";
    if (message.role === "user") {
      text.textContent = message.content;
    } else {
      text.innerHTML = Markdown.render(message.content || "");
    }
    card.appendChild(text);

    if (message.sources?.length) card.appendChild(buildSourcesNode(message.sources));

    if (message.role === "assistant" && !message.error && message.content) {
      card.appendChild(buildActionsNode(message.content));
    }

    wrapper.appendChild(card);
    return wrapper;
  }

  function buildReasoningNode(content) {
    const box = document.createElement("div");
    box.className = "reasoning is-collapsed";
    box.innerHTML = `
      <button class="reasoning__toggle" type="button">
        ${icon("bulb")}<span>Raciocínio</span>${icon("chevron-down", "reasoning__chevron")}
      </button>
      <div class="reasoning__body"></div>`;
    box.querySelector(".reasoning__body").textContent = content;
    box.querySelector(".reasoning__toggle").addEventListener("click", () =>
      box.classList.toggle("is-collapsed")
    );
    return box;
  }

  function buildSourcesNode(sources) {
    const list = document.createElement("div");
    list.className = "sources";
    for (const source of sources) {
      const chip = document.createElement(source.url ? "a" : "span");
      chip.className = "source-chip";
      if (source.url) {
        chip.href = Markdown.safeUrl(source.url);
        chip.target = "_blank";
        chip.rel = "noopener noreferrer";
      }
      chip.innerHTML = icon(source.url ? "link" : "file");
      chip.appendChild(document.createTextNode(source.name || "source"));
      list.appendChild(chip);
    }
    return list;
  }

  function buildActionsNode(content) {
    const actions = document.createElement("div");
    actions.className = "msg__actions";

    const copy = document.createElement("button");
    copy.className = "msg__action";
    copy.title = "Copiar";
    copy.setAttribute("aria-label", "Copiar resposta");
    copy.innerHTML = icon("copy");
    copy.addEventListener("click", () => {
      navigator.clipboard?.writeText(content);
      toast("Copiado para a área de transferência");
    });

    const regenerate = document.createElement("button");
    regenerate.className = "msg__action";
    regenerate.title = "Gerar novamente";
    regenerate.setAttribute("aria-label", "Gerar a resposta novamente");
    regenerate.innerHTML = icon("refresh");
    regenerate.addEventListener("click", () => regenerateLast());

    actions.append(copy, regenerate);
    return actions;
  }

  function renderMessages() {
    const chat = Store.active();
    const hasMessages = Boolean(chat?.messages.length);

    el.welcome.classList.toggle("is-hidden", hasMessages);
    el.messages.classList.toggle("is-hidden", !hasMessages);
    el.messages.innerHTML = "";

    if (!chat) return;
    for (const message of chat.messages) el.messages.appendChild(buildMessageNode(message));
    scrollToBottom();
  }

  function scrollToBottom() {
    el.chatScroll.scrollTop = el.chatScroll.scrollHeight;
  }

  /* ------------------------------------------------------------------ */
  /* Chat history                                                        */
  /* ------------------------------------------------------------------ */
  function groupChats(chats) {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      "Últimos 7 dias": chats.filter((chat) => new Date(chat.updatedAt).getTime() >= cutoff),
      "Mais antigas": chats.filter((chat) => new Date(chat.updatedAt).getTime() < cutoff),
    };
  }

  function renderHistory() {
    const term = el.historySearch.value.trim().toLowerCase();
    const visible = term
      ? Store.chats.filter((chat) => chat.title.toLowerCase().includes(term))
      : Store.chats;

    el.historyList.innerHTML = "";

    if (!visible.length) {
      el.historyList.innerHTML = `<p class="history__empty">Nenhuma conversa ainda.</p>`;
      return;
    }

    for (const [label, chats] of Object.entries(groupChats(visible))) {
      if (!chats.length) continue;

      const section = document.createElement("section");
      section.className = "history__section";
      section.innerHTML = `
        <button class="history__sectiontitle" type="button">
          <span>${label}</span>${icon("chevron-down")}
        </button>
        <ul class="history__list"></ul>`;

      section
        .querySelector(".history__sectiontitle")
        .addEventListener("click", () => section.classList.toggle("is-collapsed"));

      const list = section.querySelector(".history__list");
      for (const chat of chats) {
        const item = document.createElement("li");
        item.className = "history__item";
        if (chat.id === Store.activeId) item.classList.add("is-active");

        const link = document.createElement("button");
        link.className = "history__link";
        link.textContent = chat.title;
        link.addEventListener("click", () => openChat(chat.id));

        const remove = document.createElement("button");
        remove.className = "history__delete";
        remove.title = "Excluir conversa";
        remove.setAttribute("aria-label", `Excluir conversa ${chat.title}`);
        remove.innerHTML = icon("trash");
        remove.addEventListener("click", (event) => {
          event.stopPropagation();
          Store.remove(chat.id);
          renderHistory();
          renderMessages();
        });

        item.append(link, remove);
        list.appendChild(item);
      }

      el.historyList.appendChild(section);
    }
  }

  function openChat(id) {
    Store.activeId = id;
    Store.save();
    renderHistory();
    renderMessages();
    updatePlaceholder();
  }

  /* ------------------------------------------------------------------ */
  /* Uploads                                                             */
  /* ------------------------------------------------------------------ */
  function renderUploads() {
    el.uploads.classList.toggle("is-hidden", !pendingFiles.length);
    el.uploads.innerHTML = "";

    pendingFiles.forEach((entry, index) => {
      const chip = document.createElement("div");
      chip.className = "upload-chip";
      chip.dataset.status = entry.status;
      chip.innerHTML = icon("file");

      const name = document.createElement("span");
      name.className = "upload-chip__name";
      name.textContent = entry.name;

      const status = document.createElement("span");
      status.className = "upload-chip__status";
      status.textContent = entry.status;

      const remove = document.createElement("button");
      remove.className = "upload-chip__remove";
      remove.title = "Remover";
      remove.innerHTML = icon("x");
      remove.addEventListener("click", () => {
        pendingFiles.splice(index, 1);
        renderUploads();
      });

      chip.append(name, status, remove);
      el.uploads.appendChild(chip);
    });
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const staged = files.map((file) => ({ name: file.name, status: "UPLOADING", fileId: null }));
    pendingFiles.push(...staged);
    renderUploads();

    try {
      const response = await API.uploadFiles(files, Store.activeId);
      for (const result of response.results || []) {
        const entry = pendingFiles.find((item) => item.name === result.fileName);
        if (!entry) continue;
        entry.status = result.status || "UPLOADED";
        entry.fileId = result.fileId || null;
        if (result.errorMessage) entry.error = result.errorMessage;
      }
      renderUploads();
      pollVectorization();
    } catch (error) {
      for (const entry of staged) entry.status = "ERROR";
      renderUploads();
      toast(`Falha no upload: ${error.message}`);
    }
  }

  function pollVectorization() {
    const pending = pendingFiles.filter((entry) => entry.fileId && entry.status === "UPLOADED");
    if (!pending.length) return;

    setTimeout(async () => {
      for (const entry of pending) {
        try {
          const info = await API.verifyFile(entry.fileId);
          entry.status = info.status || entry.status;
          if (info.errorMessage) entry.error = info.errorMessage;
        } catch {
          /* mantém o status atual e tenta de novo no próximo ciclo */
        }
      }
      renderUploads();
      pollVectorization();
    }, 2000);
  }

  /* ------------------------------------------------------------------ */
  /* Envio de mensagem                                                   */
  /* ------------------------------------------------------------------ */
  async function sendMessage() {
    const content = el.input.value.trim();
    if (!content || streaming) return;

    let chat = Store.active() || Store.create(null, content.slice(0, 30));
    chat.messages.push({ role: "user", content });

    const assistant = { role: "assistant", content: "", reasoning: "", sources: [] };
    chat.messages.push(assistant);

    el.input.value = "";
    autoResize();
    updateCounter();
    updateSendState();
    renderMessages();

    streaming = true;
    const node = el.messages.lastElementChild;
    const textNode = node.querySelector(".msg__text");
    textNode.innerHTML = `<div class="thinking"><span class="spinner"></span>Consultando (simulação)…</div>`;

    const files = pendingFiles.filter((entry) => entry.fileId).map((entry) => entry.fileId);

    try {
      await API.streamMessage(
        {
          chatId: chat.id.startsWith("local-") ? null : chat.id,
          message: content,
          hasStartedWithFile: files.length > 0,
          fileIds: files,
        },
        {
          onMetadata: (event) => {
            if (event.chatId && event.chatId !== chat.id) {
              chat.id = event.chatId;
              Store.activeId = event.chatId;
            }
            if (event.title) chat.title = event.title;
            renderHistory();
          },
          onReasoning: (event) => {
            assistant.reasoning += event.message || "";
            repaintAssistant(node, assistant);
          },
          onDelta: (event) => {
            assistant.content += event.message || "";
            repaintAssistant(node, assistant);
          },
          onComplete: (event) => {
            if (event.sources?.length) assistant.sources = event.sources;
            if (event.chatTitle) chat.title = event.chatTitle;
            if (event.isBlockedByGuardrails && !assistant.content) {
              assistant.content = "Esta resposta foi bloqueada pelos guardrails.";
            }
          },
          onError: (event) => {
            assistant.error = true;
            assistant.content =
              `**${event.detail?.title || "Erro"}** — ` +
              (event.detail?.detail || "Falha ao comunicar com o agente.");
          },
        }
      );
    } catch (error) {
      assistant.error = true;
      assistant.content = `**Conexão interrompida** — ${error.message}`;
    } finally {
      streaming = false;
      pendingFiles = [];
      renderUploads();
      Store.touch(chat);
      renderMessages();
      renderHistory();
      updatePlaceholder();
    }
  }

  function repaintAssistant(node, message) {
    const card = node.querySelector(".msg__card");
    const existingReasoning = card.querySelector(".reasoning");

    if (message.reasoning && !existingReasoning) {
      card.insertBefore(buildReasoningNode(message.reasoning), card.firstChild);
    } else if (message.reasoning && existingReasoning) {
      existingReasoning.querySelector(".reasoning__body").textContent = message.reasoning;
    }

    const text = card.querySelector(".msg__text");
    text.innerHTML = message.content
      ? Markdown.render(message.content)
      : `<div class="thinking"><span class="spinner"></span>Pensando…</div>`;
    scrollToBottom();
  }

  function regenerateLast() {
    const chat = Store.active();
    if (!chat || streaming) return;
    const lastUser = [...chat.messages].reverse().find((message) => message.role === "user");
    if (!lastUser) return;
    chat.messages = chat.messages.slice(0, chat.messages.lastIndexOf(lastUser));
    Store.save();
    el.input.value = lastUser.content;
    sendMessage();
  }

  /* ------------------------------------------------------------------ */
  /* UI: contador, resize, rotas, toggles                                */
  /* ------------------------------------------------------------------ */
  function updateCounter() {
    const length = el.input.value.length;
    el.counter.textContent = `${length}/${MAX_CHARS}`;
    el.counter.classList.toggle("is-over", length >= MAX_CHARS);
  }

  function updateSendState() {
    el.sendBtn.disabled = !el.input.value.trim() || streaming;
  }

  function autoResize() {
    el.input.style.height = "0px";
    el.input.style.height = `${Math.min(el.input.scrollHeight, 520)}px`;
  }

  function updatePlaceholder() {
    const text = "Descreva sua dúvida sobre o registro de não conformidade.";
    el.input.placeholder = text;
    el.input.setAttribute("aria-label", text);
  }

  let historyOpen = false;

  function showPage(route) {
    el.pageChat.classList.toggle("is-hidden", route !== "chat");
    el.pageHacka.classList.toggle("is-hidden", route !== "hacka");
    el.pageExperiment.classList.toggle("is-hidden", route !== "experiment");
    for (const item of document.querySelectorAll(".rail__item")) {
      item.classList.toggle("is-active", item.dataset.route === route);
    }
    el.history.classList.toggle("is-closed", route !== "chat" || !historyOpen);
    el.historyOpen.classList.toggle("is-hidden", route !== "chat" || historyOpen);
  }

  function toggleHistory(open) {
    historyOpen = open;
    el.history.classList.toggle("is-closed", !open);
    el.historyOpen.classList.toggle("is-hidden", open);
  }

  function toast(message) {
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2600);
  }

  /* ------------------------------------------------------------------ */
  /* Bootstrap                                                           */
  /* ------------------------------------------------------------------ */
  function bindEvents() {
    el.railToggle.addEventListener("click", () => {
      const open = el.rail.classList.toggle("is-open");
      el.railToggle.setAttribute("aria-expanded", String(open));
    });

    for (const item of document.querySelectorAll(".rail__item")) {
      item.addEventListener("click", () => showPage(item.dataset.route));
    }

    el.historyOpen.addEventListener("click", () => toggleHistory(true));
    el.historyClose.addEventListener("click", () => toggleHistory(false));
    el.historySearch.addEventListener("input", renderHistory);

    el.newChatBtn.addEventListener("click", () => {
      Store.activeId = null;
      Store.save();
      pendingFiles = [];
      renderUploads();
      renderMessages();
      renderHistory();
      updatePlaceholder();
      el.input.focus();
    });

    el.input.addEventListener("input", () => {
      autoResize();
      updateCounter();
      updateSendState();
    });

    el.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });

    el.sendBtn.addEventListener("click", sendMessage);

    for (const card of document.querySelectorAll(".welcome__card")) {
      card.addEventListener("click", () => {
        el.input.value = card.dataset.prompt;
        autoResize();
        updateCounter();
        updateSendState();
        el.input.focus();
      });
    }

    for (const type of ["dragenter", "dragover"]) {
      el.composerBox.addEventListener(type, (event) => {
        event.preventDefault();
        el.composerBox.classList.add("is-dragover");
      });
    }
    for (const type of ["dragleave", "drop"]) {
      el.composerBox.addEventListener(type, (event) => {
        event.preventDefault();
        el.composerBox.classList.remove("is-dragover");
      });
    }
    el.composerBox.addEventListener("drop", () => {
      toast("Anexos disponíveis em uma etapa futura.");
    });
  }

  /* Página inicial ao abrir o app. "experiment" = Registro de NC (Ctrl + CD).
     Use "chat" se precisar validar a Skill 01, que espera abrir no chat.
     Também é possível forçar pela URL: index.html#registro, #chat ou #hacka. */
  const DEFAULT_ROUTE = "experiment";
  const HASH_ROUTES = { registro: "experiment", chat: "chat", assistente: "chat", hacka: "hacka" };

  function initialRoute() {
    const key = window.location.hash.replace("#", "").toLowerCase();
    return HASH_ROUTES[key] || DEFAULT_ROUTE;
  }

  async function init() {
    Store.load();
    bindEvents();
    showPage(initialRoute());
    renderHistory();
    renderMessages();
    updateCounter();

    try {
      const user = await API.getUser();
      el.userName.textContent = user.name;
      el.userEmail.textContent = user.email;
      el.userInitials.textContent = user.initials;
      el.greetingName.textContent = user.name;
      if (user.agentName) el.agentChip.textContent = user.agentName;
    } catch {
      toast("Não foi possível carregar o perfil local.");
    }

    updatePlaceholder();
  }

  window.API = API;
  window.Markdown = Markdown;
  document.addEventListener("DOMContentLoaded", init);
})();

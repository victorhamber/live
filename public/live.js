(function () {
  const cfg = window.__LIVE__ || {};
  const MAX = 90;
  const seen = new Set();
  let viewers = Number(cfg.viewersBase || 2284);
  let visitor = null;
  let pendingText = "";
  let elapsedFallback = 0;
  let descExpanded = true;

  const $ = (id) => document.getElementById(id);
  const initials = (name) =>
    String(name || "VC")
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  function sanitize(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function linkify(escaped) {
    return escaped.replace(/(https?:\/\/[^\s<]+)/gi, function (url) {
      const href = url.replace(/[),.;!?]+$/, "");
      const trailing = url.slice(href.length);
      return (
        '<a class="msg-link" href="' +
        href +
        '" target="_blank" rel="noopener noreferrer">' +
        href +
        "</a>" +
        trailing
      );
    });
  }

  function formatText(text, authorType) {
    const escaped = sanitize(text);
    if (authorType === "agent") return linkify(escaped);
    return escaped;
  }

  function showToast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2500);
  }

  function getVideoTime() {
    try {
      const player = document.querySelector("vturb-smartplayer");
      if (player && typeof player.currentTime === "number" && player.currentTime > 0) {
        return player.currentTime;
      }
    } catch (e) {}
    return elapsedFallback;
  }

  function appendMsg({ name, text, authorType, mine, isSuperchat, superAmount, color }, scroll) {
    const chat = $("chat-messages");
    if (isSuperchat) {
      const d = document.createElement("div");
      d.className = "superchat";
      d.style.background = "#f97316";
      d.innerHTML =
        '<div class="superchat-name" style="color:#000"> ' +
        sanitize(name) +
        (superAmount ? " · " + sanitize(superAmount) : "") +
        "</div>" +
        '<div class="superchat-text" style="color:rgba(0,0,0,.72)">' +
        sanitize(text) +
        "</div>";
      chat.appendChild(d);
    } else {
      const d = document.createElement("div");
      d.className = "msg" + (mine ? " user-msg" : "");
      const ini = initials(name);
      const bg = color || (authorType === "agent" ? "#0369a1" : mine ? "#0f766e" : "#334155");
      const badge = authorType === "agent" ? '<span class="msg-badge">MOD</span>' : "";
      const nameClass = mine ? " you" : authorType === "agent" ? " agent" : "";
      d.innerHTML =
        '<div class="msg-avatar" style="background:' +
        bg +
        ';color:#fff">' +
        ini +
        "</div><div class='msg-body'><span class='msg-name" +
        nameClass +
        "'>" +
        badge +
        sanitize(name) +
        '</span><span class="msg-text"> ' +
        formatText(text, authorType) +
        "</span></div>";
      chat.appendChild(d);
    }
    while (chat.children.length > MAX) chat.removeChild(chat.firstChild);
    if (scroll !== false) chat.scrollTop = chat.scrollHeight;
  }

  function ingest(items) {
    const nearBottom =
      $("chat-messages").scrollHeight - $("chat-messages").scrollTop - $("chat-messages").clientHeight < 80;
    items.forEach((item) => {
      const key = item.kind + ":" + item.id;
      if (seen.has(key)) return;
      seen.add(key);
      appendMsg(
        {
          name: item.name,
          text: item.text,
          authorType: item.authorType,
          mine: item.mine,
          isSuperchat: item.isSuperchat,
          superAmount: item.superAmount,
          color: item.color,
        },
        nearBottom
      );
    });
  }

  async function pollFeed() {
    const t = Math.floor(getVideoTime());
    try {
      const res = await fetch("/api/p/" + encodeURIComponent(cfg.slug) + "/feed?t=" + t);
      if (!res.ok) return;
      const data = await res.json();
      if (data.visitor) {
        visitor = data.visitor;
        $("user-avatar").textContent = initials(visitor.name);
      }
      const merged = []
        .concat(data.events || [], data.comments || [])
        .sort((a, b) => a.timestampSec - b.timestampSec);
      ingest(merged);
    } catch (e) {}
  }

  function openIdentity(text) {
    pendingText = text;
    $("identity-modal").hidden = false;
    $("identity-name").focus();
  }

  function closeIdentity() {
    $("identity-modal").hidden = true;
  }

  let sending = false;

  function clearInput() {
    const input = $("chat-input");
    if (!input) return;
    input.value = "";
    toggleSend(input);
  }

  async function sendUserMsg() {
    if (sending) return;
    const input = $("chat-input");
    const text = input.value.trim();
    if (!text) return;
    if (!visitor) {
      openIdentity(text);
      return;
    }
    sending = true;
    try {
      await postComment(text);
    } finally {
      sending = false;
    }
  }

  async function postComment(text, identity) {
    const payload = {
      text,
      videoTimestamp: Math.floor(getVideoTime()),
    };
    if (identity) {
      payload.name = identity.name;
      payload.email = identity.email;
    }
    const res = await fetch("/api/p/" + encodeURIComponent(cfg.slug) + "/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) {
        openIdentity(text);
        return;
      }
      showToast(data.error || "Não foi possível enviar");
      return;
    }
    if (data.comment) ingest([{ ...data.comment, kind: "comment" }]);
    if (data.agent) {
      setTimeout(() => ingest([{ ...data.agent, kind: "comment" }]), 900);
    }
    clearInput();
    return true;
  }

  function toggleSend(inp) {
    $("send-btn").classList.toggle("active", inp.value.trim().length > 0);
  }

  function fluctuateViewers() {
    setInterval(() => {
      viewers = Math.max(Math.floor(cfg.viewersBase * 0.82), viewers + Math.floor(Math.random() * 40) - 14);
      const fmt = viewers.toLocaleString("pt-BR");
      $("viewer-count").textContent = fmt;
      $("chat-viewers").textContent = fmt;
      $("desc-views-label").textContent = fmt + " visualizações ao vivo";
    }, 3800);
  }

  function init() {
    $("desc-box").addEventListener("click", () => {
      descExpanded = !descExpanded;
      $("desc-text").classList.toggle("collapsed", !descExpanded);
      $("desc-toggle").textContent = descExpanded ? "Mostrar menos" : "...mais";
    });
    $("chat-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendUserMsg();
    });
    $("chat-input").addEventListener("input", (e) => toggleSend(e.target));
    $("send-btn").addEventListener("click", sendUserMsg);
    $("identity-submit").addEventListener("click", async () => {
      const name = $("identity-name").value.trim();
      const email = $("identity-email").value.trim();
      if (!name || !email) return showToast("Preencha nome e e-mail");
      visitor = { name, email };
      $("user-avatar").textContent = initials(name);
      closeIdentity();
      const text = pendingText;
      pendingText = "";
      clearInput();
      if (text) {
        sending = true;
        try {
          await postComment(text, visitor);
        } finally {
          sending = false;
        }
      }
    });

    setInterval(() => {
      elapsedFallback += 1;
    }, 1000);
    setInterval(pollFeed, 2000);
    pollFeed();
    fluctuateViewers();
  }

  window.addEventListener("DOMContentLoaded", init);
})();

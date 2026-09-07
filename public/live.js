(function () {
  const cfg = window.__LIVE__ || {};
  const MAX = 90;
  const ANON_KEY = "live_anon_id";
  const seen = new Set();
  const pendingMine = new Set();
  let viewers = Number(cfg.viewersBase || 2284);
  let visitor = null;
  let pendingText = "";
  let elapsedFallback = 0;
  let descExpanded = true;
  let lastFeedT = -1;
  let sending = false;
  let visitId = "";
  let identifiedSent = false;

  const $ = (id) => document.getElementById(id);
  const initials = (name) =>
    String(name || "VC")
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  function getAnonId() {
    try {
      let id = localStorage.getItem(ANON_KEY);
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(ANON_KEY, id);
      }
      return id;
    } catch (e) {
      return "anon-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
  }

  const anonId = getAnonId();

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
    if (!t) return;
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

  function track(type, extra) {
    const payload = {
      type: type,
      anonId: anonId,
      visitId: visitId || undefined,
      referrer: document.referrer || "",
      label: extra && extra.label,
      url: extra && extra.url,
    };
    const body = JSON.stringify(payload);
    const endpoint = "/api/p/" + encodeURIComponent(cfg.slug) + "/track";
    if ((type === "leave" || type === "heartbeat") && navigator.sendBeacon && document.visibilityState === "hidden") {
      try {
        navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
        return;
      } catch (e) {}
    }
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      keepalive: type === "leave",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.visitId) visitId = data.visitId;
      })
      .catch(function () {});
  }

  function bindTracking() {
    document.addEventListener(
      "click",
      function (e) {
        const a = e.target.closest("a[href]");
        if (!a) return;
        const href = a.getAttribute("href") || "";
        if (!href || href === "#" || href.indexOf("javascript:") === 0) return;
        const label = (a.getAttribute("data-track-label") || a.textContent || "").trim().slice(0, 80);
        track("click", { label: label || "link", url: href });
      },
      true
    );
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") track("heartbeat");
    });
    window.addEventListener("pagehide", function () {
      track("leave");
    });
    setInterval(function () {
      if (!document.hidden) track("heartbeat");
    }, 15000);
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
      if (item.mine && pendingMine.has(item.text)) {
        pendingMine.delete(item.text);
        seen.add(key);
        return;
      }
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
    if (document.hidden) return;
    const t = Math.floor(getVideoTime());
    const from = lastFeedT >= 0 ? lastFeedT : "";
    try {
      const url =
        "/api/p/" +
        encodeURIComponent(cfg.slug) +
        "/feed?t=" +
        t +
        (from === "" ? "" : "&from=" + from);
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data.visitor) {
        const first = !visitor;
        visitor = data.visitor;
        $("user-avatar").textContent = initials(visitor.name);
        if (first && !identifiedSent) {
          identifiedSent = true;
          track("identify");
        }
      }
      const merged = []
        .concat(data.events || [], data.comments || [])
        .sort((a, b) => a.timestampSec - b.timestampSec);
      ingest(merged);
      lastFeedT = t;
    } catch (e) {}
  }

  function burstPoll() {
    let n = 0;
    const id = setInterval(() => {
      pollFeed();
      if (++n >= 8) clearInterval(id);
    }, 700);
  }

  function openIdentity(text) {
    pendingText = text;
    $("identity-modal").hidden = false;
    $("identity-name").focus();
  }

  function closeIdentity() {
    $("identity-modal").hidden = true;
  }

  function clearInput() {
    const input = $("chat-input");
    if (!input) return;
    input.value = "";
    toggleSend(input);
  }

  function paintMine(text) {
    pendingMine.add(text);
    appendMsg(
      {
        name: visitor.name,
        text,
        authorType: "user",
        mine: true,
      },
      true
    );
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
    clearInput();
    paintMine(text);
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
      pendingMine.delete(text);
      if (res.status === 401) {
        openIdentity(text);
        return;
      }
      showToast(data.error || "Não foi possível enviar");
      return;
    }
    if (data.comment && data.comment.id) {
      seen.add("comment:" + data.comment.id);
      pendingMine.delete(text);
    }
    track("comment");
    burstPoll();
    return true;
  }

  function toggleSend(inp) {
    $("send-btn").classList.toggle("active", inp.value.trim().length > 0);
  }

  function fluctuateViewers() {
    const viewsLabel = cfg.viewsLabel || "visualizações ao vivo";
    setInterval(() => {
      viewers = Math.max(Math.floor(cfg.viewersBase * 0.82), viewers + Math.floor(Math.random() * 40) - 14);
      const fmt = viewers.toLocaleString("pt-BR");
      if ($("viewer-count")) $("viewer-count").textContent = fmt;
      if ($("chat-viewers")) $("chat-viewers").textContent = fmt;
      if ($("desc-views-label")) $("desc-views-label").textContent = fmt + " " + viewsLabel;
    }, 3800);
  }

  function init() {
    track("pageview");
    bindTracking();
    if ($("desc-box")) {
      $("desc-box").addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        descExpanded = !descExpanded;
        if ($("desc-text")) $("desc-text").classList.toggle("collapsed", !descExpanded);
        if ($("desc-toggle")) $("desc-toggle").textContent = descExpanded ? "Mostrar menos" : "...mais";
      });
    }
    if (!$("chat-input") || !$("send-btn")) return;
    $("chat-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendUserMsg();
    });
    $("chat-input").addEventListener("input", (e) => toggleSend(e.target));
    $("send-btn").addEventListener("click", sendUserMsg);
    if ($("identity-submit")) $("identity-submit").addEventListener("click", async () => {
      const name = $("identity-name").value.trim();
      const email = $("identity-email").value.trim();
      if (!name || !email) return showToast("Preencha nome e e-mail");
      visitor = { name, email };
      $("user-avatar").textContent = initials(name);
      closeIdentity();
      if (!identifiedSent) {
        identifiedSent = true;
        track("identify");
      }
      const text = pendingText;
      pendingText = "";
      clearInput();
      if (text) {
        sending = true;
        paintMine(text);
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
    setInterval(pollFeed, 3000);
    pollFeed();
    fluctuateViewers();
  }

  window.addEventListener("DOMContentLoaded", init);
})();

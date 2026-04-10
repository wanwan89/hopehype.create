 

import { createClient } from "https://esm.sh/@supabase/supabase-js";

// ===== Supabase config =====
const SUPABASE_URL = "https://hqetnqnvmdxdgfnnluew.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Audio Config =====
const sendSound = new Audio("asets/sound/send.mp3");
const receiveSound = new Audio("asets/sound/receive.mp3");

// ===== Global State =====
let currentRoomId = "room-1";
let currentReplyId = null;
let currentUser = null;
let myUsername = "Guest";
let myRole = "user";
let presenceChannel = null;
let globalPresenceChannel = null; 
let messageChannel = null;
let typingTimeout = null;
let isCurrentlyTyping = false;
let selectedMessageId = null;
let isFirstMessageLoad = true; 
let totalOnlineUsers = 0; 
let isSidebarLoading = false; 
let selectedGroupFile = null;
let callRoom; // Ini buat nyimpen instance room LiveKit pas telponan



// ===== DOM =====
const messagesEl = document.getElementById("chat-messages");
const inputEl = document.getElementById("chat-input");
const Btn = document.getElementById("send-btn");
const membersEl = document.getElementById("chat-members");
const typingEl = document.getElementById("typing-indicator");

const sidebar = document.querySelector(".sidebar");
const overlay = document.querySelector(".sidebar-overlay");
const hamburger = document.querySelector(".hamburger-btn");

const menuBtn = document.getElementById("menu-btn");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const inputSearchId = document.getElementById("input-search-id");
const btnSearchId = document.getElementById("btn-search-id");
const sideUsername = document.getElementById("side-username");
const sideAvatar = document.getElementById("side-avatar");
const myUniqueId = document.getElementById("my-unique-id");
const privateChatList = document.getElementById("private-chat-list");

const stickerMenu = document.getElementById("sticker-menu");
const stickerList = document.getElementById("sticker-list");
const searchInput = document.getElementById("sticker-search-input");
const searchBtn = document.getElementById("sticker-search-btn");

// MEMORI INTERNAL BIAR GAK TANYA DATABASE TERUS
const profileCache = new Map();

async function getCachedProfile(userId) {
  if (profileCache.has(userId)) return profileCache.get(userId);

  const localKey = `hh_profile_${userId}`;
  const cached = localStorage.getItem(localKey);
  if (cached) {
    const data = JSON.parse(cached);
    profileCache.set(userId, data); 
    return data;
  }

  console.log("Minta data ke DB untuk user:", userId);
  const { data } = await supabase
    .from('profiles')
    .select('username, avatar_url, role, short_id, gender')
    .eq('id', userId)
    .single();

  if (data) {
    localStorage.setItem(localKey, JSON.stringify(data));
    profileCache.set(userId, data);
  }
  return data;
}

// ===== [FIX EGRESS] DEBOUNCE UNTUK SIDEBAR =====
let chatHistoryDebounce;
function triggerLoadChatHistory() {
  clearTimeout(chatHistoryDebounce);
  chatHistoryDebounce = setTimeout(() => refreshSidebar(), 1500); 
}

// ===== Helpers =====
function scrollToBottom() {
  if (messagesEl) {
    messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
  }
}

function closeSidebar() {
  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.style.display = "none";
  if (sidebarOverlay) sidebarOverlay.style.display = "none";
}

function openSidebar() {
  if (sidebar) sidebar.classList.add("open");
  if (overlay) overlay.style.display = "block";
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTime(dateString) {
  const d = new Date(dateString);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// ==========================================
// [FIX NOTIF BYPASS] FUNGSI PEMICU PUSH NOTIF
// ==========================================
function triggerPushNotif(teksPesan) {
  const partnerId = getPartnerIdFromRoom(currentRoomId);
  if (!partnerId) return; 

  fetch("https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/send-chat-notif", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}` 
    },
    body: JSON.stringify({
      record: {
        sender_id: currentUser.id,
        receiver_id: partnerId,
        content: teksPesan
      }
    })
  })
  .then(res => res.text()) 
  .then(text => console.log("JAWABAN ASLI SERVER FIREBASE:", text))
  .catch(err => console.error("Gagal kirim sinyal notif:", err));
}

function showToast(message) {
  let container = document.getElementById("toast");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast-card";
  toast.innerHTML = `
    <div class="toast-icon-wrap warning">
      <span class="toast-icon">!</span>
    </div>
    <div class="toast-content">
      <span class="toast-title">Pemberitahuan</span>
      <span class="toast-subtitle">${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => { toast.classList.add("show"); });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showChatLoading() {
  if (!messagesEl) return;
  messagesEl.innerHTML = `
    <div class="chat-loading-screen">
      <div class="skeleton-msg left"><div class="skeleton-avatar shimmer"></div><div class="skeleton-bubble"><div class="shimmer skeleton-line w1"></div><div class="shimmer skeleton-line w2"></div><div class="shimmer skeleton-line w3"></div></div></div>
      <div class="skeleton-msg right"><div class="skeleton-bubble me"><div class="shimmer skeleton-line w4"></div><div class="shimmer skeleton-line w5"></div></div></div>
      <div class="skeleton-msg left"><div class="skeleton-avatar shimmer"></div><div class="skeleton-bubble typing-bubble"><span></span><span></span><span></span></div></div>
      <div class="loading-chat-hint">Menyambungkan percakapan...</div>
    </div>
  `;
}

function getStatusIcon(status) {
  switch (status) {
    case "sending": return `<span class="status-icon sending"><span class="sending-dot">.</span><span class="sending-dot">.</span><span class="sending-dot">.</span></span>`;
    case "sent": return `<span class="status-icon sent" title="Terkirim"><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
    case "delivered": return `<span class="status-icon delivered" title="Terkirim"><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M1.8 8.5L5 11.5L11.8 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.8 8.5L9 11.5L15 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
    case "read": return `<span class="status-icon read" title="Dibaca"><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M1.8 8.5L5 11.5L11.8 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.8 8.5L9 11.5L15 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
    default: return "";
  }
}

function getBadge(role) {
  if (!role) return "";
  role = role.toLowerCase().trim();
  if (role === "admin") return `<span class="badge" style="background:#ff4757; font-size:7px; padding:0 4px; border-radius:3px; margin-left:2px; font-weight:600;">🛡 Admin</span>`;
  if (role === "verified") return `<span class="verified-icon" style="margin-left:4px; display:inline-flex; align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1DA1F2"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  const crownBadges = { crown1: "asets/png/crown1.png", crown2: "asets/png/crown2.png", crown3: "asets/png/crown3.png" };
  if (crownBadges[role]) return `<img src="${crownBadges[role]}" alt="${role}" style="width:16px;height:16px;margin-left:4px;vertical-align:middle;object-fit:contain;display:inline-block;" onerror="this.style.display='none';">`;
  return "";
}

function getPartnerIdFromRoom(roomId) {
  if (!roomId.startsWith("pv_")) return null;
  return roomId.replace("pv_", "").split("_").find((id) => id !== currentUser?.id) || null;
}

// ===== Global window funcs =====
window.cancelReply = function () {
  currentReplyId = null;
  const preview = document.getElementById("reply-preview-box");
  if (inputEl) { inputEl.dataset.replyTo = ""; inputEl.placeholder = "Tulis pesan..."; }
  if (preview) { preview.style.display = "none"; preview.innerHTML = ""; }
};

window.closeBioModal = () => {
  const modal = document.getElementById("bio-modal");
  if (modal) modal.style.display = "none";
};

window.copyMyID = (id) => {
  navigator.clipboard.writeText(id).then(() => {
      showToast("ID berhasil disalin: #" + id);
      const idEl = document.getElementById("my-unique-id");
      if (idEl) { idEl.style.color = "#00d2ff"; setTimeout(() => (idEl.style.color = ""), 500); }
      if (navigator.vibrate) navigator.vibrate(50);
    }).catch(() => showToast("Gagal menyalin ID"));
};

window.scrollToMessage = function (id) {
  const el = document.getElementById(`msg-${id}`);
  if (!el) { showToast("Pesan asli sudah terlalu lama atau telah dihapus."); return; }
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.style.background = "#fff3b0";
  setTimeout(() => { el.style.background = el.classList.contains("self") ? "rgba(220,248,198,0.9)" : "rgba(255,255,255,0.9)"; }, 1000);
};

window.tutupDoiCard = function () {
  const modal = document.getElementById("doi-card-modal");
  if (modal) modal.style.display = "none";
};

// ===== Auth =====
async function requireLogin() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session || !session.user) {
    showToast("Kamu harus login dulu!");
    window.location.href = "login.html";
    return false;
  }
  currentUser = { id: session.user.id };

  const myProfile = await getCachedProfile(session.user.id);
  myUsername = myProfile?.username || session.user.email || "Guest";
  myRole = myProfile?.role || "user";
  return true;
}

// ===== [FULL FIX EGRESS] Presence / Typing =====
async function initPresence() {
  if (!currentUser) return;
  
  if (presenceChannel) { await supabase.removeChannel(presenceChannel); presenceChannel = null; }
  presenceChannel = supabase.channel(`presence-${currentRoomId}`, { config: { presence: { key: currentUser.id } } });

  presenceChannel.on("presence", { event: "sync" }, () => {
    const state = presenceChannel.presenceState();
    const typingHeader = document.getElementById("typing-header");
    const statusHeader = document.getElementById("status-header");

    if (!typingHeader || !statusHeader) return;
    const typingUsers = [];

    for (const userId in state) {
      if (userId !== currentUser.id && state[userId].some((p) => p.isTyping)) {
        typingUsers.push(state[userId][0].username);
      }
    }

    if (typingUsers.length > 0) {
      statusHeader.style.display = "none";
      typingHeader.style.display = "inline";
      typingHeader.textContent = `${typingUsers[0]} sedang mengetik...`;
    } else {
      statusHeader.style.display = "inline";
      typingHeader.style.display = "none";
    }
  });

  presenceChannel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") await presenceChannel.track({ isTyping: false, username: myUsername });
  });

  if (inputEl) {
    inputEl.removeEventListener("input", handleTypingInput);
    inputEl.addEventListener("input", handleTypingInput);
  }

  if (!globalPresenceChannel) {
    globalPresenceChannel = supabase.channel(`global-online-users`, { config: { presence: { key: currentUser.id } } });
    
    globalPresenceChannel.on("presence", { event: "sync" }, () => {
      const state = globalPresenceChannel.presenceState();
      totalOnlineUsers = Object.keys(state).length;
      updateHeaderStatus();
    });

    globalPresenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await globalPresenceChannel.track({ online: true, last_seen: new Date().toISOString() });
    });
  }
}

async function handleTypingInput() {
  if (!presenceChannel) return;
  if (!isCurrentlyTyping) {
    isCurrentlyTyping = true;
    await presenceChannel.track({ isTyping: true, username: myUsername });
  }
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(async () => {
    isCurrentlyTyping = false;
    if (presenceChannel) await presenceChannel.track({ isTyping: false, username: myUsername });
  }, 3000);
}

function updateHeaderStatus() {
  const headerStatusEl = document.getElementById("status-header");
  if (!headerStatusEl || !currentUser) return;

  if (membersEl) membersEl.innerHTML = `<span class="online-dot"></span> ${totalOnlineUsers} user online`;

  if (currentRoomId === "room-1") {
    if (totalOnlineUsers <= 1) { 
      headerStatusEl.innerHTML = `<span style="opacity:0.8;">Hanya kamu yang online</span>`; 
    } else { 
      headerStatusEl.innerHTML = `<span class="online-dot" style="background:#fff; width:7px; height:7px; display:inline-block; border-radius:50%; margin-right:4px;"></span> ${totalOnlineUsers} users online`; 
    }
    return;
  }

  const partnerId = getPartnerIdFromRoom(currentRoomId);
  if (!partnerId) return;

  const state = globalPresenceChannel ? globalPresenceChannel.presenceState() : {};
  const isOnline = !!state[partnerId];

  if (isOnline) { 
    headerStatusEl.innerHTML = `<span class="online-dot" style="background:#2ecc71; width:8px; height:8px; display:inline-block; border-radius:50%; margin-right:4px;"></span> Sedang online`; 
  } else { 
    headerStatusEl.innerHTML = `<span style="opacity:0.8;">Offline</span>`; 
  }
}

// ===== FULL RENDER MESSAGE DENGAN SYSTEM MESSAGE =====
function renderMessage(msg) {
  if (!messagesEl) return;
  if (document.getElementById(`msg-${msg.id}`)) return;

  // [NEW FITUR] PESAN SISTEM (Keluar, Masuk, Kick)
  if (msg.is_system) {
    const sysEl = document.createElement("div");
    sysEl.id = `msg-${msg.id}`;
    sysEl.className = "system-message-container";
    sysEl.style = "display: flex; justify-content: center; margin: 12px 0; width: 100%; animation: fadeIn 0.3s ease;";
    sysEl.innerHTML = `
      <div style="background: rgba(0, 0, 0, 0.06); color: #555; font-size: 11px; padding: 5px 14px; border-radius: 20px; font-weight: 500; border: 1px solid rgba(0,0,0,0.03);">
        ${escapeHtml(msg.message)}
      </div>
    `;
    messagesEl.appendChild(sysEl);
    return; 
  }

  const msgEl = document.createElement("div");
  msgEl.id = `msg-${msg.id}`;
  msgEl.className = `chat-message ${msg.user_id === currentUser.id ? "self" : "other"}`;

  const currentUsername = msg.profiles?.username || msg.username || "User";
  const avatarUrl = msg.profiles?.avatar_url || msg.avatar || "asets/png/profile.png";
  const currentRole = msg.profiles?.role || msg.role || "user";
  const statusIcon = msg.user_id === currentUser.id ? getStatusIcon(msg.status || "sent") : "";

  let replyTextContent = msg.reply_to_msg?.message || "";
  if (!replyTextContent && msg.reply_to_msg?.sticker_url) replyTextContent = "🖼 Stiker";
  if (!replyTextContent && msg.reply_to_msg?.audio_url) replyTextContent = "🎤 Voice Note";

  const replyHtml = msg.reply_to_msg
    ? `<div class="reply-preview-in-chat" onclick="window.scrollToMessage('${msg.reply_to_msg.id}')" style="cursor:pointer; background:rgba(0,0,0,0.08); border-left:3px solid #0088cc; padding:5px 8px; border-radius:4px; margin-bottom:5px;">
        <div style="font-size:10px; color:#0088cc; font-weight:bold;">${escapeHtml(msg.reply_to_msg.username)}</div>
        <div style="font-size:11px; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(replyTextContent)}</div>
      </div>`
    : "";

  let contentHtml = "";
  if (msg.sticker_url) {
    contentHtml = `<img src="${msg.sticker_url}" style="width:100px;height:100px;border-radius:12px;object-fit:cover;">`;
  } else if (msg.audio_url) {
    contentHtml = `
      <div class="vn-custom-player">
        <button class="vn-play-btn" onclick="playVN(this, '${msg.audio_url}')"><svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M8 5v14l11-7z"/></svg></button>
        <div class="vn-waveform"><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>
        <div class="vn-time">Voice Note</div>
      </div>`;
  } else {
    contentHtml = escapeHtml(msg.message || "");
  }

  const reactions = msg.reactions || {};
  const reactionIcons = Object.values(reactions); 
  const uniqueIcons = [...new Set(reactionIcons)].slice(0, 3);
  
  const reactionsHtml = uniqueIcons.length > 0 ? `
    <div class="message-reactions" onclick="event.stopPropagation(); window.openReactionMenu('${msg.id}', event)">
      ${uniqueIcons.join("")} 
      ${reactionIcons.length > 1 ? `<span style="font-size:9px; color:#999; margin-left:2px;">${reactionIcons.length}</span>` : ""}
    </div>` : "";

  const isMe = msg.user_id === currentUser.id;

  msgEl.innerHTML = `
    <img class="avatar" src="${avatarUrl}" onerror="this.src='asets/png/profile.png'">
    <div class="content" onclick="window.openReactionMenu('${msg.id}', event)" ${isMe ? `oncontextmenu="window.showDeleteMenu('${msg.id}'); return false;"` : ""} style="position: relative; min-width: 80px; transition: transform 0.2s ease; margin-bottom: ${uniqueIcons.length > 0 ? '15px' : '5px'};">
      <div class="username">${escapeHtml(currentUsername)}${getBadge(currentRole)}</div>
      ${replyHtml}
      <div class="text" style="${msg.message === "Pesan ini telah dihapus" ? "font-style:italic;color:#aaa;" : ""} padding-bottom: 12px;">${contentHtml}</div>
      ${reactionsHtml}
      <div class="message-info" style="position: absolute; bottom: 4px; right: 8px; display:flex; align-items:center; gap:2px;">
        <span class="timestamp" style="font-size:9px; opacity:0.5;">${formatTime(msg.created_at)}</span>
        ${statusIcon}
      </div>
    </div>`;

  let startX = 0; let currentX = 0; let swiping = false;

  msgEl.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; currentX = startX; swiping = true; msgEl.style.transition = "none"; }, { passive: true });
  msgEl.addEventListener("touchmove", (e) => {
    if (!swiping) return;
    currentX = e.touches[0].clientX; let diff = currentX - startX;
    if (msgEl.classList.contains("self")) { if (diff < 0) { if (diff < -70) diff = -70; msgEl.style.transform = `translateX(${diff}px)`; } } 
    else { if (diff > 0) { if (diff > 70) diff = 70; msgEl.style.transform = `translateX(${diff}px)`; } }
  }, { passive: true });

  msgEl.addEventListener("touchend", () => {
    let diff = currentX - startX;
    msgEl.style.transition = "transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)"; msgEl.style.transform = "translateX(0)";

    const isSelf = msgEl.classList.contains("self");
    if ((isSelf && diff < -50) || (!isSelf && diff > 50)) {
      currentReplyId = msg.id;
      if (inputEl) inputEl.dataset.replyTo = msg.id;
      const replyBox = document.getElementById("reply-preview-box");
      if (replyBox) {
        let previewText = msg.message;
        if (msg.sticker_url) previewText = "Stiker";
        if (msg.audio_url) previewText = "Voice Note";
        replyBox.style.display = "flex";
        replyBox.innerHTML = `<div class="reply-content-wrapper"><div class="reply-title">Membalas ${escapeHtml(currentUsername)}</div><div class="reply-text-preview">${escapeHtml(previewText || "")}</div></div><div class="close-reply-btn" onclick="window.cancelReply()">&times;</div>`;
      }
      if (inputEl) inputEl.focus();
      if (navigator.vibrate) navigator.vibrate(30);
    }
    swiping = false; currentX = 0;
  });

  messagesEl.appendChild(msgEl);
}

function updateMessageStatusUI(messageId, status) {
  const msgEl = document.getElementById(`msg-${messageId}`);
  if (!msgEl) return;
  const infoEl = msgEl.querySelector(".message-info");
  const timeEl = msgEl.querySelector(".timestamp");
  if (!infoEl || !timeEl) return;
  const oldStatus = infoEl.querySelector(".status-icon");
  if (oldStatus) oldStatus.remove();
  timeEl.insertAdjacentHTML("afterend", getStatusIcon(status));
}

// ===== Load Messages =====
async function loadMessages() {
  if (!messagesEl || !currentUser) return;
  if (isFirstMessageLoad) showChatLoading();

  const start = Date.now();
  const waktu24JamLalu = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("messages")
    .select(`*, reply_to_msg:reply_to(id, username, message), profiles:profiles!messages_user_id_fkey(username, avatar_url, role)`)
    .eq("room_id", currentRoomId)
    .gte("created_at", waktu24JamLalu) 
    .order("created_at", { ascending: false }) 
    .limit(20); 

  const elapsed = Date.now() - start;
  const minDelay = 700;
  if (isFirstMessageLoad && elapsed < minDelay) await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed));

  if (error) {
    messagesEl.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:40px 20px; margin-top:20px; color:#ff4d4f;"><div style="font-size:26px;">⚠️</div><div style="font-size:14px; font-weight:600;">Gagal memuat pesan</div></div>`;
    return;
  }

  messagesEl.innerHTML = "";
  isFirstMessageLoad = false;

  if (!data || data.length === 0) {
    messagesEl.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:40px 20px; margin-top:20px; color:#8696a0;"><div style="font-size:28px;">💬</div><div style="font-size:14px; font-weight:600;">Belum ada pesan</div></div>`;
    await markRoomAsRead();
    return;
  }

  const sortedData = data.reverse();
  sortedData.forEach((msg) => renderMessage(msg));

  setTimeout(scrollToBottom, 100);
  await markRoomAsRead();
}

async function markRoomAsRead() {
  if (!currentUser) return;
  await supabase.from("messages")
    .update({ status: "read" })
    .eq("room_id", currentRoomId)
    .neq("user_id", currentUser.id)
    .in("status", ["sent", "delivered"]);
}

// FULL FIX: MULTI-CHANNEL MESSAGE FUNCTION
async function Message() {
  const text = chatInput?.value.trim();
  if (!text || !currentUser) return;

  const replyTo = chatInput.dataset.replyTo || null;
  const tempId = "temp-" + Date.now();
  let replyData = null;

  if (replyTo) {
    const repliedEl = document.getElementById(`msg-${replyTo}`);
    if (repliedEl) {
      replyData = {
        id: replyTo,
        username: repliedEl.querySelector(".username")?.innerText || "User",
        message: repliedEl.querySelector(".text")?.innerText || "",
      };
    }
  }

  const optimisticMsg = {
    id: tempId,
    message: text,
    user_id: currentUser.id,
    username: myUsername,
    avatar: sideAvatar?.src || "asets/png/profile.png",
    role: myRole || "user",
    created_at: new Date().toISOString(),
    room_id: currentRoomId, 
    status: "sending", 
    reply_to_msg: replyData,
  };

  renderMessage(optimisticMsg);
  scrollToBottom();

  chatInput.value = ""; 
  chatInput.style.height = "auto";
  window.cancelReply();
  if (sendSound) sendSound.play().catch(() => {});

  try {
    const payload = { 
      message: text, 
      user_id: currentUser.id, 
      username: myUsername, 
      room_id: currentRoomId,
      reply_to: replyTo, 
      status: "sent" 
    };

    if (window.currentChatMode === 'group' && window.activeGroupId) {
      payload.group_id = window.activeGroupId;
    }

    const { data, error } = await supabase.from("messages").insert([payload]).select().single();

    if (error) throw error;

    const tempEl = document.getElementById(`msg-${tempId}`);
    if (tempEl && data) { 
        tempEl.id = `msg-${data.id}`; 
        updateMessageStatusUI(data.id, "sent"); 
        if (typeof triggerPushNotif === "function") triggerPushNotif(text); 
    }

  } catch (err) {
    console.error("Gagal kirim:", err);
    showToast("Gagal mengirim pesan");
    const failEl = document.getElementById(`msg-${tempId}`);
    if (failEl) failEl.querySelector(".message-info")?.insertAdjacentHTML("beforeend", `<span style="font-size:10px; color:#ff4d4f; margin-left:4px;">failed</span>`);
  }
}

if (Btn) Btn.onclick = Message;

if (inputEl) {
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); Message(); }
  });
}

async function sendAudioMessage(url) {
  const tempId = "temp-" + Date.now();
  renderMessage({ id: tempId, message: "🎤 Voice Note", audio_url: url, user_id: currentUser.id, username: myUsername, avatar: sideAvatar?.src || "asets/png/profile.png", role: myRole || "user", created_at: new Date().toISOString(), room_id: currentRoomId, status: "sending" });
  scrollToBottom();

  try {
    const { data, error } = await supabase.from("messages").insert([{ message: "🎤 Voice Note", audio_url: url, user_id: currentUser.id, username: myUsername, room_id: currentRoomId, status: "sent" }]).select().single();
    if (error) throw error;
    const tempEl = document.getElementById(`msg-${tempId}`);
    if (tempEl && data) { 
        tempEl.id = `msg-${data.id}`; 
        updateMessageStatusUI(data.id, "sent"); 
        triggerPushNotif("🎤 Voice Note");
    }
  } catch (err) { showToast("Gagal mengirim VN ke chat"); }
}

// ===== Realtime Messages =====
function initRealtimeMessages() {
  if (!currentUser) return;
  if (messageChannel) {
    supabase.removeChannel(messageChannel);
    messageChannel = null;
  }

  messageChannel = supabase
    .channel(`messages-global-monitor`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
      const newMsg = payload.new;

      // 1. REFRESH SIDEBAR JIKA ADA PESAN MASUK
      if (newMsg.room_id.startsWith("pv_") || newMsg.room_id.startsWith("group_")) {
        triggerLoadChatHistory();
      }

      // ==========================================
      // 🔥 [LOGIKA BARU] DETEKSI SINYAL TELPON 🔥
      // ==========================================
      if (newMsg.is_system) {
        // A. Deteksi Panggilan Masuk (Untuk Penerima)
        if (newMsg.message.includes("📞 Memanggil")) {
          if (newMsg.user_id !== currentUser.id) {
            // Pastikan fungsi showIncomingCall sudah kamu buat di bagian bawah file
            if (typeof showIncomingCall === "function") {
              showIncomingCall(newMsg);
            }
          }
        }

        // B. Deteksi Panggilan Ditolak (Untuk Penelepon)
        if (newMsg.message.includes("🚫 Panggilan Ditolak")) {
          if (newMsg.user_id !== currentUser.id) {
            if (typeof window.endCall === "function") window.endCall();
            showToast("Panggilan ditolak oleh lawan bicara.");
          }
        }
      }
      // ==========================================

      // 2. LOGIKA RENDER PESAN KE UI CHAT
      if (newMsg.room_id === currentRoomId) {
        if (document.getElementById(`msg-${newMsg.id}`)) return;

        const senderProfile = await getCachedProfile(newMsg.user_id);
        newMsg.profiles = {
          username: senderProfile?.username || "User",
          avatar_url: senderProfile?.avatar_url || "asets/png/profile.png",
          role: senderProfile?.role || "user"
        };

        if (newMsg.user_id === currentUser.id && !newMsg.is_system) {
          const tempEl = document.querySelector(`[id^="msg-temp-"]`);
          if (tempEl) tempEl.remove();
          renderMessage(newMsg);
        } else {
          renderMessage(newMsg);
          if (!newMsg.is_system) receiveSound.play().catch(() => {});

          if (newMsg.status !== "read" && !document.hidden && !newMsg.is_system) {
            await supabase.from("messages").update({ status: "read" }).eq("id", newMsg.id);
          }
        }
        scrollToBottom();
      }
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
      const updated = payload.new;
      const old = payload.old;

      // Logika Update Status (Read/Delivered)
      if (updated.status !== old?.status && Object.keys(updated).length <= 5) {
        if (updated.user_id === currentUser.id) {
          updateMessageStatusUI(updated.id, updated.status || "sent");
        }
        return;
      }

      if (updated.room_id !== currentRoomId) return;

      // Logika Hapus Pesan
      if (updated.message === "Pesan ini telah dihapus") {
        const msgEl = document.getElementById(`msg-${updated.id}`);
        if (msgEl) {
          const textEl = msgEl.querySelector(".text");
          if (textEl) {
            textEl.innerHTML = "<i>Pesan ini telah dihapus</i>";
            textEl.style.color = "#aaa";
            textEl.querySelectorAll("img, .vn-custom-player").forEach(m => m.remove());
          }
        }
        return;
      }

      // Logika Reactions
      if (updated.reactions) {
        const msgEl = document.getElementById(`msg-${updated.id}`);
        if (msgEl) {
          const contentEl = msgEl.querySelector(".content");
          const reactions = updated.reactions || {};
          const reactionIcons = Object.values(reactions);
          const uniqueIcons = [...new Set(reactionIcons)].slice(0, 3);
          const reactionsHtml = uniqueIcons.length > 0 ? `${uniqueIcons.join("")} ${reactionIcons.length > 1 ? `<span style="font-size:9px; color:#999; margin-left:2px;">${reactionIcons.length}</span>` : ""}` : "";

          let badgeEl = contentEl.querySelector(".message-reactions");
          if (reactionsHtml) {
            if (!badgeEl) {
              badgeEl = document.createElement("div");
              badgeEl.className = "message-reactions";
              contentEl.insertBefore(badgeEl, contentEl.querySelector(".message-info"));
            }
            badgeEl.innerHTML = reactionsHtml;
            contentEl.style.marginBottom = "15px";
          } else if (badgeEl) {
            badgeEl.remove();
            contentEl.style.marginBottom = "5px";
          }
        }
      }
    }).subscribe();
}

if (hamburger) {
  hamburger.addEventListener("click", () => {
    if (!sidebar) return; sidebar.classList.toggle("open");
    if (overlay) overlay.style.display = sidebar.classList.contains("open") ? "block" : "none";
  });
}
if (overlay) overlay.addEventListener("click", closeSidebar);

// ===== Profile Sidebar =====
async function loadProfile() {
  const profile = await getCachedProfile(currentUser.id);
  if (!profile) return;
  myUsername = profile.username || myUsername;
  myRole = profile.role || myRole;
  if (sideUsername) sideUsername.textContent = profile.username;
  if (myUniqueId) {
    myUniqueId.textContent = "#" + (profile.short_id || "N/A");
    myUniqueId.style.cursor = "pointer";
    myUniqueId.onclick = () => window.copyMyID(profile.short_id);
  }
  if (sideAvatar) sideAvatar.src = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}`;
}

// ===== Render Global Chat Item =====
function renderGlobalChatItem(container) {
  const globalBtn = document.createElement("div");
  globalBtn.innerHTML = `
    <div style="display:flex; align-items:center; padding:12px; border-bottom:2px solid #f0f0f0; cursor:pointer; background:#f9fbff;">
      <div style="width:40px; height:40px; border-radius:50%; background:linear-gradient(45deg, #0088cc, #00d2ff); display:flex; align-items:center; justify-content:center; margin-right:12px;">
        <span style="color:white; font-size:18px;">🌍</span>
      </div>
      <div>
        <strong style="font-size:14px; color:#0088cc;">Chat Global</strong><br>
        <span style="font-size:11px; color:#888;">Obrolan Umum</span>
      </div>
    </div>`;
globalBtn.onclick = async () => {
    window.currentChatMode = null;
    window.activeGroupId = null;
    currentRoomId = "room-1"; 
    
    if (btnOpenInvite) btnOpenInvite.style.display = 'none';
    
    // Sembunyikan tombol telpon (Hapus duplikatnya)
    const btnCall = document.getElementById('btn-start-call');
    if (btnCall) btnCall.style.display = 'none';
    
    const headerTitle = document.querySelector(".chat-header h3");
    if (headerTitle) headerTitle.textContent = "HopeTalk Globe";
    
    messagesEl.innerHTML = ""; 
    initPresence(); 
    await loadMessages(); 
    closeSidebar();
};

  container.appendChild(globalBtn);
}

async function loadChatHistory() {
  const privateList = document.getElementById("private-chat-list");
  if (!privateList || !currentUser || isSidebarLoading) return;
  isSidebarLoading = true; 

  try {
    const waktu24JamLalu = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: messages, error } = await supabase
      .from("messages")
      .select("room_id, message, created_at, sticker_url, user_id, status, is_system")
      .ilike("room_id", "pv_%").ilike("room_id", `%${currentUser.id}%`)
      .gte("created_at", waktu24JamLalu).order("created_at", { ascending: false });

    if (error) { isSidebarLoading = false; return; }

    const lastMessagesMap = new Map();
    const unreadCountMap = new Map();

    messages.forEach((msg) => {
      const parts = msg.room_id.replace("pv_", "").split("_");
      const partnerId = parts.find((id) => id !== currentUser.id);
      if (!partnerId) return;
      if (!lastMessagesMap.has(partnerId)) lastMessagesMap.set(partnerId, msg);
      if (msg.user_id !== currentUser.id && msg.status !== "read" && !msg.is_system) unreadCountMap.set(partnerId, (unreadCountMap.get(partnerId) || 0) + 1);
    });

    const label = document.createElement("div"); 
    label.innerHTML = `<div style="padding:10px 15px; font-size:11px; color:#999; font-weight:bold; background:#f8f9fa; border-top:1px solid #eee; margin-top:10px;">RIWAYAT CHAT PRIBADI</div>`; 
    privateList.appendChild(label);

    if (lastMessagesMap.size === 0) {
      privateList.innerHTML += `<div style="text-align:center; opacity:0.5; padding:20px; font-size:12px;">Belum ada riwayat chat</div>`;
      isSidebarLoading = false; return;
    }

    const partnerIds = Array.from(lastMessagesMap.keys());
    const missingIds = [];
    const profileMap = new Map();

    partnerIds.forEach(id => {
      const cached = sessionStorage.getItem(`hh_profile_${id}`);
      if(cached) profileMap.set(id, JSON.parse(cached));
      else missingIds.push(id);
    });

    if (missingIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url, short_id, role").in("id", missingIds);
      profiles?.forEach(p => {
        sessionStorage.setItem(`hh_profile_${p.id}`, JSON.stringify(p));
        profileMap.set(p.id, p);
      });
    }

    lastMessagesMap.forEach((chat, partnerId) => {
      const partner = profileMap.get(partnerId);
      if (!partner) return;
      const name = partner.username || "User";
      const avatar = partner.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
      const unreadCount = unreadCountMap.get(partnerId) || 0;
      const myLastMsgIcon = chat.user_id === currentUser.id && !chat.is_system ? getStatusIcon(chat.status || "sent") : "";
      
      let lastMsg = chat.sticker_url ? "🖼 Stiker" : (chat.message || "Klik untuk chat");
      if (chat.is_system) lastMsg = chat.message;
      if (chat.message === "Pesan ini telah dihapus") lastMsg = "🚫 Pesan dihapus";

      const chatEl = document.createElement("div");
      chatEl.className = `sidebar-chat-item ${unreadCount > 0 ? "unread" : ""}`;
      chatEl.innerHTML = `
        <div style="display: flex; align-items: center; padding: 12px 15px; border-bottom: 1px solid rgba(0,0,0,0.03); cursor: pointer;">
          <div style="position: relative;">
            <img src="${avatar}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
            ${unreadCount > 0 ? `<div class="unread-badge" style="position: absolute; top: -2px; right: -2px; background: #ff4757; color: white; font-size: 10px; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white;">${unreadCount}</div>` : ""}
          </div>
          <div style="flex: 1; margin-left: 12px; overflow: hidden;">
            <div style="display: flex; justify-content: space-between;">
              <strong style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</strong>
              <span style="font-size: 10px; color: #999;">${formatTime(chat.created_at)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #666;">
               ${myLastMsgIcon} <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lastMsg}</span>
            </div>
          </div>
        </div>`;
      chatEl.onclick = () => bukaChatPribadi(partnerId, name, partner.short_id || "");
      privateList.appendChild(chatEl);
    });
  } catch (err) { console.error("Gagal muat sidebar:", err); } 
  finally { isSidebarLoading = false; }
}

if (btnSearchId) {
  btnSearchId.addEventListener("click", async () => {
    const searchValue = inputSearchId?.value.trim().toUpperCase();
    const cleanId = (searchValue || "").replace("#", "");
    if (!cleanId) { showToast("Masukkan ID (contoh: 0E870)"); return; }
    const { data: friend, error } = await supabase.from("profiles").select("id, username, short_id").eq("short_id", cleanId).single();
    if (error || !friend) { showToast("ID tidak ditemukan!"); return; }
    if (friend.id === currentUser.id) { showToast("Ini ID kamu sendiri."); return; }
    await bukaChatPribadi(friend.id, friend.username, friend.short_id || "");
    showToast(`Chat dengan ${friend.username} dibuka`);
  });
}

async function bukaChatPribadi(partnerId, partnerName, partnerShortId = "") {
  window.currentChatMode = 'private';
  window.activeGroupId = null;

  const btnInvite = document.getElementById('btn-open-invite');
  if (btnInvite) btnInvite.style.display = 'none';

  // ✅ PASTIKAN ID NYA btn-start-call SESUAI HTML
  const btnCall = document.getElementById('btn-start-call'); 
  if (btnCall) {
    btnCall.style.setProperty('display', 'flex', 'important'); // Paksa muncul
    btnCall.dataset.targetId = partnerId;
    btnCall.dataset.targetName = partnerName;
    btnCall.onclick = () => window.startLiveKitCall();
  }

  const ids = [currentUser.id, partnerId].sort();
  currentRoomId = `pv_${ids[0]}_${ids[1]}`; 
  
  isFirstMessageLoad = true; 
  initPresence(); 

  const headerTitle = document.querySelector(".chat-header h3");
  if (headerTitle) {
    headerTitle.innerHTML = `${escapeHtml(partnerName)} <span style="font-size:10px; opacity:0.5;">#${escapeHtml(partnerShortId)}</span>`;
  }
  
  const statusHeader = document.getElementById('status-header');
  if (statusHeader) statusHeader.innerText = "Menghubungkan...";

  updateHeaderStatus(); 
  await loadMessages(); 
  closeSidebar(); 
  scrollToBottom();

  localStorage.setItem(`last_read_${currentRoomId}`, new Date().toISOString());
  if (typeof triggerLoadChatHistory === "function") triggerLoadChatHistory();
}

const apiKey = "vPUlBU5Qfz2ZygoEtKXVUqmIEAEcIB08";
async function fetchStickers(query = "") {
  if (!stickerList) return;
  stickerList.innerHTML = "<p style='font-size:12px; color:#999; text-align:center; width:100%;'>Mencari...</p>";
  const endpoint = query ? `https://api.giphy.com/v1/stickers/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=30&rating=g` : `https://api.giphy.com/v1/stickers/trending?api_key=${apiKey}&limit=20&rating=g`;
  try {
    const res = await fetch(endpoint); const data = await res.json(); stickerList.innerHTML = "";
    data.data.forEach((sticker) => {
      const img = document.createElement("img"); img.src = sticker.images.fixed_width_small.webp;
      img.style.cssText = "width:75px; height:75px; margin:4px; cursor:pointer; border-radius:8px; background:#eee;";
      img.loading = "lazy"; img.onclick = () => sendSticker(sticker.images.fixed_width.url);
      stickerList.appendChild(img);
    });
  } catch (err) { stickerList.innerHTML = "<p style='font-size:12px; color:red;'>Gagal memuat stiker.</p>"; }
}

async function sendSticker(url) {
  const tempId = "temp-" + Date.now();
  try {
    const profile = await getCachedProfile(currentUser.id);
    renderMessage({ id: tempId, message: "", user_id: currentUser.id, username: profile?.username || "User", avatar: profile?.avatar_url || "asets/png/profile.png", role: profile?.role || "user", sticker_url: url, created_at: new Date().toISOString(), room_id: currentRoomId, status: "sending" });
    scrollToBottom(); sendSound.play().catch(() => {});
    const { data, error } = await supabase.from("messages").insert([{ message: "", user_id: currentUser.id, username: profile?.username || "User", avatar: profile?.avatar_url || "asets/png/profile.png", role: profile?.role || "user", sticker_url: url, room_id: currentRoomId, status: "sent" }]).select().single();
    
    if (error) throw error;
    const tempEl = document.getElementById(`msg-${tempId}`);
    if (tempEl && data) { 
        tempEl.id = `msg-${data.id}`; 
        updateMessageStatusUI(data.id, "sent"); 
        triggerPushNotif("🖼 Mengirim Stiker");
    }
    if (stickerMenu) stickerMenu.style.display = "none";
  } catch (err) { showToast("Gagal kirim stiker"); }
}

if (searchBtn) searchBtn.onclick = () => fetchStickers(searchInput?.value || "");
if (searchInput) searchInput.onkeydown = (e) => { if (e.key === "Enter") fetchStickers(searchInput.value); };
const stickerBtn = document.getElementById("sticker-btn");
if (stickerBtn) { stickerBtn.onclick = () => { if (!stickerMenu) return; stickerMenu.style.display = stickerMenu.style.display === "none" || stickerMenu.style.display === "" ? "flex" : "none"; }; }

window.showDeleteMenu = function(id) {
  selectedMessageId = id; const overlayDelete = document.getElementById("delete-overlay");
  if (overlayDelete) { overlayDelete.style.display = "flex"; if (navigator.vibrate) navigator.vibrate(50); }
};

const confirmDeleteBtn = document.getElementById("confirm-delete");
if (confirmDeleteBtn) {
  confirmDeleteBtn.onclick = async () => {
    if (!selectedMessageId) return;
    confirmDeleteBtn.innerText = "Menghapus..."; confirmDeleteBtn.disabled = true;
    try {
      const { error } = await supabase.from("messages").update({ message: "Pesan ini telah dihapus", sticker_url: null, audio_url: null }).eq("id", selectedMessageId);
      if (error) throw error;
      document.getElementById("delete-overlay").style.display = "none"; showToast("Pesan dihapus");
      const msgEl = document.getElementById(`msg-${selectedMessageId}`);
      if (msgEl) { const textEl = msgEl.querySelector(".text"); if (textEl) { textEl.innerHTML = "<i>Pesan ini telah dihapus</i>"; textEl.style.color = "#aaa"; } }
    } catch (err) { showToast("Gagal menghapus pesan"); } 
    finally { confirmDeleteBtn.innerText = "Hapus"; confirmDeleteBtn.disabled = false; selectedMessageId = null; }
  };
}

window.openEditProfile = async () => {
  const modal = document.getElementById("bio-modal"); if (!modal) return; modal.style.display = "flex";
  const { data: profile } = await supabase.from("profiles").select("umur, gender, zodiak, hobi, pekerjaan").eq("id", currentUser.id).single();
  
  if (profile) {
    if (document.getElementById("in-umur")) document.getElementById("in-umur").value = profile.umur || "";
    if (document.getElementById("in-gender")) document.getElementById("in-gender").value = profile.gender || "Pria";
    if (document.getElementById("in-zodiak")) document.getElementById("in-zodiak").value = profile.zodiak || "Aries";
    if (document.getElementById("in-hobi")) document.getElementById("in-hobi").value = profile.hobi || "";
    if (document.getElementById("in-kerja")) document.getElementById("in-kerja").value = profile.pekerjaan || ""; 
  }
};

const saveBtnElement = document.getElementById("btn-save-bio");
if (saveBtnElement) {
  saveBtnElement.onclick = async () => {
    saveBtnElement.innerText = "Menyimpan..."; 
    saveBtnElement.disabled = true;
    
    try {
      const { data, error } = await supabase.from("profiles").update({
          umur: Number(document.getElementById("in-umur")?.value) || null, 
          gender: document.getElementById("in-gender")?.value, 
          zodiak: document.getElementById("in-zodiak")?.value, 
          hobi: document.getElementById("in-hobi")?.value
        }).eq("id", currentUser.id).select(); 
        
      if (error) throw error;
      if (!data || data.length === 0) {
          showToast("Gagal! Database menolak data. Cek izin (RLS) di Supabase.");
          saveBtnElement.innerText = "Simpan & Cari"; saveBtnElement.disabled = false; return; 
      }
      
      const cacheKey = `hh_profile_${currentUser.id}`;
      const existingCache = JSON.parse(localStorage.getItem(cacheKey) || "{}");
      const updatedCache = { ...existingCache, ...data[0] };
      localStorage.setItem(cacheKey, JSON.stringify(updatedCache));
      
      showToast("Biodata berhasil disimpan permanen!"); 
      window.closeBioModal();
      
    } catch (err) { showToast("Gagal simpan: " + err.message); } 
    finally { saveBtnElement.innerText = "Simpan & Cari"; saveBtnElement.disabled = false; }
  };
}

function tampilkanDoiCard(doi) {
  const modal = document.getElementById("doi-card-modal"); if (!doi || !modal) return;
  const photoEl = document.getElementById("doi-photo"); const nameAgeEl = document.getElementById("doi-name-age"); const zodiacEl = document.getElementById("doi-zodiac"); const jobEl = document.getElementById("doi-job"); const hobbyEl = document.getElementById("doi-hobby"); const gasBtn = document.getElementById("btn-gas-chat");
  if (photoEl) photoEl.src = doi.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(doi.username)}`;
  if (nameAgeEl) nameAgeEl.innerText = `${doi.username}, ${doi.age || "?"}`;
  if (zodiacEl) zodiacEl.innerText = doi.zodiac || "Rahasia";
  if (jobEl) jobEl.innerText = doi.occupation || "Professional";
  if (hobbyEl) hobbyEl.innerText = doi.hobby || "-";
  if (gasBtn) { gasBtn.onclick = async () => { await bukaChatPribadi(doi.id, doi.username, doi.short_id || ""); window.tutupDoiCard(); }; }
  modal.style.display = "flex";
}

const btnCariDoiActual = document.getElementById("btn-sidebar-search");
if (btnCariDoiActual) {
  btnCariDoiActual.onclick = async () => {
    const myProfile = await getCachedProfile(currentUser.id); 
    if (!myProfile?.gender) { showToast("Setel GENDER kamu dulu di Edit Biodata!"); window.openEditProfile(); return; }
    
    closeSidebar();
    const loadingOverlay = document.createElement("div"); 
    loadingOverlay.className = "searching-overlay"; 
    loadingOverlay.innerHTML = `<div class="radar"></div><div class="searching-text">MENCARI PASANGAN...</div><div style="font-size:10px; margin-top:10px; opacity:0.6;">Menghubungkan ke server HopeTalk...</div>`; 
    document.body.appendChild(loadingOverlay);
    
    const lawanJenis = myProfile.gender === "Pria" ? "Wanita" : "Pria";
    
    setTimeout(async () => {
      const { data: users } = await supabase.from("profiles").select("*").neq("id", currentUser.id).eq("gender", lawanJenis);
      loadingOverlay.remove();
      if (!users || users.length === 0) { showToast(`Waduh, belum ada ${lawanJenis} yang tersedia.`); return; }
      tampilkanDoiCard(users[Math.floor(Math.random() * users.length)]);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }, 2500);
  };
}

document.addEventListener("visibilitychange", async () => { if (!document.hidden) await markRoomAsRead(); });

const actionBtn = document.getElementById("action-btn"); const chatInput = document.getElementById("chat-input"); const vnOverlay = document.getElementById("vn-overlay"); const vnTimer = document.getElementById("vn-timer");
let holdTimer, timerInterval; let isRecording = false; let startX = 0; let seconds = 0;

function startTimer() { seconds = 0; vnTimer.innerText = "00:00"; timerInterval = setInterval(() => { seconds++; let m = Math.floor(seconds / 60).toString().padStart(2, "0"); let s = (seconds % 60).toString().padStart(2, "0"); vnTimer.innerText = `${m}:${s}`; }, 1000); }
function stopTimer() { clearInterval(timerInterval); }

let mediaRecorder; let audioChunks = []; let isCanceledGlobal = false;
async function startVN(e) {
  isRecording = true; audioChunks = []; startX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunks.push(event.data); };
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      if (!isCanceledGlobal && audioChunks.length > 0) { uploadToCloudinary(new Blob(audioChunks, { type: "audio/mpeg" })); }
    };
    mediaRecorder.start(); actionBtn.classList.add("is-recording"); chatInput.style.visibility = "hidden"; vnOverlay.style.display = "flex";
    if (navigator.vibrate) navigator.vibrate(60); startTimer();
  } catch (err) { showToast("Gagal akses mic. Pastikan izin diberikan!"); isRecording = false; }
}

function stopVN(isCanceled = false) {
  if (!isRecording) return;
  isRecording = false; isCanceledGlobal = isCanceled; stopTimer();
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  actionBtn.classList.remove("is-recording"); chatInput.style.visibility = "visible"; vnOverlay.style.display = "none";
  if (isCanceled) { showToast("VN Dibatalkan"); if (navigator.vibrate) navigator.vibrate([30, 30]); } 
  else { if (seconds < 1) { isCanceledGlobal = true; showToast("Tahan lebih lama untuk merekam"); } }
}

let reactionTargetId = null;
window.openReactionMenu = function(msgId, event) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  reactionTargetId = msgId; const menu = document.getElementById("reaction-menu"); const msgEl = document.getElementById(`msg-${msgId}`);
  if (!menu || !msgEl) return;
  const rect = msgEl.getBoundingClientRect();
  menu.style.display = "flex"; menu.style.position = "fixed"; menu.style.zIndex = "100000"; 
  menu.style.left = `${rect.left + (rect.width / 2)}px`; menu.style.top = `${rect.top - 60}px`; menu.style.transform = "translateX(-50%)";
  if (navigator.vibrate) navigator.vibrate(40);
  const closeMenu = (e) => { if (!menu.contains(e.target)) { menu.style.display = "none"; document.removeEventListener('mousedown', closeMenu); document.removeEventListener('touchstart', closeMenu); } };
  document.addEventListener('mousedown', closeMenu); document.addEventListener('touchstart', closeMenu);
};

window.sendReaction = async function(emoji) {
  if (!reactionTargetId) return;
  try {
    const { data: msg } = await supabase.from("messages").select("reactions").eq("id", reactionTargetId).single();
    let newReactions = msg.reactions || {};
    if (newReactions[currentUser.id] === emoji) delete newReactions[currentUser.id]; else newReactions[currentUser.id] = emoji;
    await supabase.from("messages").update({ reactions: newReactions }).eq("id", reactionTargetId);
    document.getElementById("reaction-menu").style.display = "none";
  } catch (err) { showToast("Gagal memberikan emoji"); }
};

actionBtn.onclick = () => { if (chatInput && chatInput.value.trim() !== "") Message(); };
actionBtn.addEventListener("mousedown", (e) => { if (chatInput.value.trim() === "") holdTimer = setTimeout(() => startVN(e), 300); });
window.addEventListener("mousemove", (e) => { if (isRecording) { if (startX - e.clientX > 100) stopVN(true); } });
window.addEventListener("mouseup", () => { clearTimeout(holdTimer); if (isRecording) stopVN(false); });
actionBtn.addEventListener("touchstart", (e) => { if (chatInput.value.trim() === "") holdTimer = setTimeout(() => startVN(e), 300); }, { passive: true });
actionBtn.addEventListener("touchmove", (e) => { if (isRecording) { if (startX - e.touches[0].clientX > 80) stopVN(true); } }, { passive: true });
actionBtn.addEventListener("touchend", () => { clearTimeout(holdTimer); if (isRecording) stopVN(false); });

async function uploadToCloudinary(blob) {
  const formData = new FormData(); formData.append("file", blob); formData.append("upload_preset", "hopehype_preset"); formData.append("resource_type", "video");
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/dhhmkb8kl/upload`, { method: "POST", body: formData });
    const data = await res.json();
    if (data.secure_url) sendAudioMessage(data.secure_url); else showToast("Gagal upload: " + (data.error?.message || "Unknown error"));
  } catch (err) { showToast("Koneksi bermasalah saat mengirim VN"); }
}

window.playVN = function (btn, audioUrl) {
  if (window.currentAudio && !window.currentAudio.paused) {
    window.currentAudio.pause();
    document.querySelectorAll(".vn-custom-player").forEach((p) => p.classList.remove("playing"));
    document.querySelectorAll(".vn-play-btn").forEach((b) => { b.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M8 5v14l11-7z"/></svg>`; });
    if (window.currentAudio.src === audioUrl) { window.currentAudio = null; return; }
  }
  const audio = new Audio(audioUrl); window.currentAudio = audio; const playerContainer = btn.closest(".vn-custom-player");
  audio.play().then(() => { playerContainer.classList.add("playing"); btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`; }).catch(() => showToast("Gagal memutar pesan suara."));
  audio.onended = () => { playerContainer.classList.remove("playing"); btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M8 5v14l11-7z"/></svg>`; window.currentAudio = null; };
};

const urlParams = new URLSearchParams(window.location.search);
const fromId = urlParams.get('from');

if (fromId) {
    setTimeout(() => {
        if (typeof bukaChatPribadi === "function") {
            bukaChatPribadi(fromId, "Memuat chat..."); 
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, 2000);
}

const groupPhotoInput = document.getElementById('group-photo-input');
if (groupPhotoInput) {
    groupPhotoInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedGroupFile = file; 
            document.getElementById('group-photo-preview').src = URL.createObjectURL(file);
        }
    };
}

// =======================
// GROUP CHAT SYSTEM
// =======================

document.getElementById('btn-open-group-modal').onclick = () => {
    document.getElementById('group-modal').style.display = 'flex';
};

document.getElementById('btn-create-group').onclick = async () => {
    const btn = document.getElementById('btn-create-group');
    const groupName = document.getElementById('in-group-name').value.trim();
    
    if (!groupName) return showToast("Beri nama grup dulu bro!");

    btn.innerText = "Mengunggah...";
    btn.disabled = true;

    try {
        let finalPhotoUrl = "asets/png/profile.png";

        if (selectedGroupFile) {
            const fd = new FormData();
            fd.append("file", selectedGroupFile);
            fd.append("upload_preset", "post_hope");

            const res = await fetch("https://api.cloudinary.com/v1_1/dhhmkb8kl/image/upload", { 
                method: "POST", body: fd 
            });
            const cData = await res.json();
            
            if (cData.secure_url) finalPhotoUrl = cData.secure_url;
        }

        const { data: { user } } = await supabase.auth.getUser();

        const { data: group, error: groupErr } = await supabase
            .from('groups')
            .insert([{ name: groupName, created_by: user.id, photo_url: finalPhotoUrl }])
            .select().single();

        if (groupErr) throw groupErr;

        await supabase.from('group_members').insert([{ group_id: group.id, user_id: user.id }]);

        showToast(`Berhasil! Grup ${groupName} sudah dibuat`);
        
        document.getElementById('group-modal').style.display = 'none';
        document.getElementById('in-group-name').value = '';
        document.getElementById('group-photo-preview').src = 'asets/png/profile.png';
        selectedGroupFile = null;

        await refreshSidebar();

    } catch (err) { showToast("Gagal bikin grup"); } 
    finally { btn.innerText = "Buat Sekarang"; btn.disabled = false; }
};

async function loadGroupList() {
    const { data: { user } } = await supabase.auth.getUser();
    const listContainer = document.getElementById('private-chat-list');
    
    const { data: memberships, error } = await supabase
        .from('group_members')
        .select(`group_id, groups(id, name, photo_url)`)
        .eq('user_id', user.id);

    if (error || !memberships) return;

    const label = document.createElement("div");
    label.innerHTML = `<div style="padding:10px 15px; font-size:11px; color:#999; font-weight:bold; background:#f8f9fa; border-top:1px solid #eee; margin-top:5px;">GRUP SAYA</div>`;
    listContainer.appendChild(label);

    memberships.forEach(item => {
        const group = item.groups;
        if (!group) return;

        const groupEl = document.createElement('div');
        groupEl.className = 'sidebar-chat-item';
        groupEl.style = "padding: 12px 15px; border-bottom: 1px solid rgba(0,0,0,0.03); cursor: pointer; display: flex; align-items: center; gap: 12px;";
        
        const avatarHtml = group.photo_url 
            ? `<img src="${group.photo_url}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 1px solid #eee;">`
            : `<div style="width: 45px; height: 45px; border-radius: 50%; background: #3a7bd5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">${group.name.substring(0, 2).toUpperCase()}</div>`;

        groupEl.innerHTML = `
            ${avatarHtml}
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 14px; color: #333;">${group.name}</div>
              <div style="font-size: 11px; color: #aaa;">Grup Chat aktif</div>
            </div>
        `;
        
        groupEl.onclick = () => mulaiChatGrup(group.id, group.name);
        listContainer.appendChild(groupEl);
    });
}

const btnOpenInvite = document.getElementById('btn-open-invite');

function mulaiChatGrup(groupId, groupName) {
    window.currentChatMode = 'group';
    window.activeGroupId = groupId;
    currentRoomId = `group_${groupId}`; 

    // 1. SEMBUNYIKAN TOMBOL TELPON (Cukup panggil sekali saja)
    const btnCall = document.getElementById('btn-start-call');
    if (btnCall) {
        btnCall.style.display = 'none';
    }

    const btnInvite = document.getElementById('btn-open-invite');
    if (btnInvite) btnInvite.style.display = 'flex'; 

    // 2. LOGIKA HEADER & IKON GEAR
    const headerTitle = document.querySelector('.chat-header h3');
    if (headerTitle) {
      const customIcon = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" 
             style="vertical-align: middle; cursor: pointer; margin-left: 8px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15)); transition: transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);" 
             onclick="window.openGroupSettings()" 
             onmouseover="this.style.transform='rotate(90deg) scale(1.1)'" 
             onmouseout="this.style.transform='rotate(0deg) scale(1)'"
             ontouchstart="this.style.transform='rotate(90deg) scale(1.1)'"
             ontouchend="this.style.transform='rotate(0deg) scale(1)'"
             title="Pengaturan Grup">
          <rect x="2" y="2" width="20" height="20" rx="7" fill="rgba(255, 255, 255, 0.2)" stroke="rgba(255, 255, 255, 0.6)" stroke-width="1.5"/>
          <circle cx="12" cy="12" r="2.5" fill="#ffffff"/>
          <path d="M12 6V8M12 16V18M6 12H8M16 12H18M8 8L9.5 9.5M14.5 14.5L16 16M8 16L9.5 14.5M14.5 9.5L16 8" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
      headerTitle.innerHTML = `${escapeHtml(groupName)} ${customIcon}`;
    }
    
    const statusHeader = document.getElementById('status-header');
    if (statusHeader) statusHeader.innerText = "Grup Chat Terbuka";

    // 3. RESET TAMPILAN PESAN
    document.getElementById('chat-messages').innerHTML = ''; 
    if (window.innerWidth <= 768) closeSidebar();

    isFirstMessageLoad = true; 
    loadMessages(); 
    initPresence(); 
}

async function refreshSidebar() {
  const privateList = document.getElementById("private-chat-list");
  if (!privateList) return;
  privateList.innerHTML = "";
  renderGlobalChatItem(privateList);
  await loadGroupList();
  await loadChatHistory();
}

if (btnOpenInvite) {
  btnOpenInvite.onclick = (e) => {
    e.preventDefault(); e.stopPropagation(); 
    const modal = document.getElementById('invite-modal');
    if (modal) { modal.style.display = 'flex'; if (navigator.vibrate) navigator.vibrate(40); }
  };
}

// [NEW FITUR] PESAN SISTEM SAAT INVITE
const btnInviteNow = document.getElementById('btn-invite-now');
if (btnInviteNow) {
  btnInviteNow.onclick = async () => {
    let input = document.getElementById('in-invite-search').value.trim();
    input = input.replace('@', '').replace('#', ''); 

    if (!input) return showToast("Isi ID atau Username dulu!");
    if (!window.activeGroupId) return showToast("Grup belum terpilih!");

    btnInviteNow.innerText = "Mencari...";
    btnInviteNow.disabled = true;

    try {
      const { data: targetUser, error: findError } = await supabase
        .from('profiles').select('id, username')
        .or(`short_id.eq.${input.toUpperCase()},username.ilike.${input}`).maybeSingle();

      if (findError || !targetUser) throw new Error("User tidak ditemukan!");

      const { data: isMember } = await supabase
        .from('group_members').select('id')
        .eq('group_id', window.activeGroupId).eq('user_id', targetUser.id).maybeSingle();

      if (isMember) throw new Error("Dia sudah ada di grup ini!");

      const { error: insertError } = await supabase
        .from('group_members').insert([{ group_id: window.activeGroupId, user_id: targetUser.id }]);
      if (insertError) throw insertError;

      // [KIRIM PESAN SISTEM]
      const systemMsg = `${myUsername} mengundang ${targetUser.username}`;
      await supabase.from('messages').insert([{
          room_id: `group_${window.activeGroupId}`,
          message: systemMsg,
          user_id: currentUser.id,
          is_system: true
      }]);

      showToast(`Berhasil! ${targetUser.username} bergabung!`);
      document.getElementById('invite-modal').style.display = 'none';
      document.getElementById('in-invite-search').value = '';

    } catch (err) { showToast(err.message); } 
    finally { btnInviteNow.innerText = "Tambah Member"; btnInviteNow.disabled = false; }
  };
}


// ==========================================
// [NEW FITUR] LOGIKA PENGATURAN GRUP FULL
// ==========================================

// Variabel untuk menyimpan file foto yang dipilih saat edit
let selectedEditGroupFile = null;

// Logika Preview Foto Edit Grup
const editGroupPhotoInput = document.getElementById('edit-group-photo-input');
if (editGroupPhotoInput) {
    editGroupPhotoInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedEditGroupFile = file; // Simpan ke memori
            document.getElementById('edit-group-photo-preview').src = URL.createObjectURL(file); // Tampilkan langsung
        }
    };
}

window.openGroupSettings = async () => {
    if (!window.activeGroupId || window.currentChatMode !== 'group') return;
    
    const modal = document.getElementById('group-settings-modal');
    if(modal) modal.style.display = 'flex';

    const container = document.getElementById('member-list-container');
    if(container) container.innerHTML = "<div style='font-size:12px; color:#666; text-align:center;'>Memuat anggota...</div>";

    try {
        const { data: group, error: groupErr } = await supabase
            .from('groups').select('*').eq('id', window.activeGroupId).single();
            
        if (groupErr) throw groupErr;
        
        const isAdmin = group && group.created_by === currentUser.id;
        
        // Isi Nama Grup
        const editNameInput = document.getElementById('edit-group-name');
        if(editNameInput && group) editNameInput.value = group.name || '';

        // [NEW] Isi Foto Grup Saat Ini
        const editPhotoPreview = document.getElementById('edit-group-photo-preview');
        if (editPhotoPreview && group) editPhotoPreview.src = group.photo_url || 'asets/png/profile.png';
        
        // Reset file memori agar tidak bentrok dengan sisa foto sebelumnya
        selectedEditGroupFile = null;

        const { data: members, error: membersErr } = await supabase
            .from('group_members')
            .select(`user_id, profiles(username, avatar_url)`)
            .eq('group_id', window.activeGroupId);

        if (membersErr) throw membersErr;

        if(container) {
            container.innerHTML = "";
            if (members && members.length > 0) {
                members.forEach(m => {
                    const profileName = m.profiles?.username || "User";
                    const profileAvatar = m.profiles?.avatar_url || 'asets/png/profile.png';
                    const isMe = m.user_id === currentUser.id;
                    
                    const div = document.createElement('div');
                    div.style = "display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #eee;";
                    div.innerHTML = `
                        <img src="${profileAvatar}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">
                        <span style="font-size:13px; font-weight:500;">${profileName} ${isMe ? '(Anda)' : ''}</span>
                        ${isAdmin && !isMe ? `<button onclick="window.kickMember('${m.user_id}', '${profileName}')" style="margin-left:auto; background:#ff4757; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:10px; cursor:pointer;">Tendang</button>` : ''}
                    `;
                    container.appendChild(div);
                });
            } else {
                container.innerHTML = "<div style='font-size:12px; color:#666; text-align:center;'>Belum ada anggota.</div>";
            }
        }
    } catch (err) {
        if(container) container.innerHTML = "<div style='font-size:12px; color:#ff4757; text-align:center;'>Gagal memuat data.</div>";
    }
};

window.updateGroupInfo = async () => {
    const newName = document.getElementById('edit-group-name')?.value.trim();
    const btn = document.getElementById('btn-save-group-info');
    
    // Cek kalau user gak ngubah apa-apa (gak ganti nama & gak ganti foto)
    if (!newName && !selectedEditGroupFile) {
        return showToast("Tidak ada yang diubah");
    }

    if(btn) { btn.innerText = "Mengunggah..."; btn.disabled = true; }

    try {
        let finalPhotoUrl = null;

        // [NEW] LOGIKA UPLOAD KE CLOUDINARY (Sama persis kayak pas bikin grup)
        if (selectedEditGroupFile) {
            const fd = new FormData();
            fd.append("file", selectedEditGroupFile);
            fd.append("upload_preset", "post_hope"); 

            const res = await fetch("https://api.cloudinary.com/v1_1/dhhmkb8kl/image/upload", { 
                method: "POST", body: fd 
            });
            const cData = await res.json();
            
            if (cData.secure_url) {
                finalPhotoUrl = cData.secure_url;
            } else {
                throw new Error("Gagal mengunggah foto ke server");
            }
        }

        // Siapkan paket data yang mau dikirim ke Supabase
        const updateData = {};
        if (newName) updateData.name = newName;
        if (finalPhotoUrl) updateData.photo_url = finalPhotoUrl;

        // Tembak ke Supabase untuk Update
        const { error } = await supabase.from('groups').update(updateData).eq('id', window.activeGroupId);
        if(error) throw error;
        
        showToast("Info grup berhasil diperbarui!");
        
        // Update Nama & Ikon di Header Chat secara instan
        if (newName) {
            const headerTitle = document.querySelector('.chat-header h3');
            if(headerTitle) {
                const customIcon = `
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="vertical-align: middle; cursor: pointer; margin-left: 8px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15)); transition: transform 0.3s;" onclick="window.openGroupSettings()" onmouseover="this.style.transform='rotate(90deg) scale(1.1)'" onmouseout="this.style.transform='rotate(0deg) scale(1)'">
                    <rect x="2" y="2" width="20" height="20" rx="7" fill="rgba(255, 255, 255, 0.2)" stroke="rgba(255, 255, 255, 0.6)" stroke-width="1.5"/>
                    <circle cx="12" cy="12" r="2.5" fill="#ffffff"/>
                    <path d="M12 6V8M12 16V18M6 12H8M16 12H18M8 8L9.5 9.5M14.5 14.5L16 16M8 16L9.5 14.5M14.5 9.5L16 8" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                `;
                headerTitle.innerHTML = `${escapeHtml(newName)} ${customIcon}`;
            }
        }
        
        // Bersihkan memori dan segarkan sidebar biar foto baru muncul
        selectedEditGroupFile = null;
        refreshSidebar();
        document.getElementById('group-settings-modal').style.display = 'none';

    } catch(err) { 
        showToast("Gagal: " + err.message); 
    } finally { 
        if(btn) { btn.innerText = "Simpan Perubahan"; btn.disabled = false; } 
    }
};

window.leaveGroup = async () => {
    if(!confirm("Yakin mau keluar dari grup ini?")) return;
    try {
        const { error } = await supabase.from('group_members').delete()
            .eq('group_id', window.activeGroupId).eq('user_id', currentUser.id);
        if (error) throw error;
        
        // Kirim Notifikasi Sistem
        await supabase.from('messages').insert([{
            room_id: `group_${window.activeGroupId}`,
            message: `${myUsername} telah meninggalkan grup`,
            user_id: currentUser.id,
            is_system: true
        }]);

        showToast("Kamu telah keluar dari grup");
        
        const modal = document.getElementById('group-settings-modal');
        if(modal) modal.style.display = 'none';
        
        // Reset Chat ke Global
        window.currentChatMode = null;
        window.activeGroupId = null;
        currentRoomId = "room-1";
        const headerTitle = document.querySelector(".chat-header h3");
        if (headerTitle) headerTitle.textContent = "HopeTalk Globe";
        const btnInvite = document.getElementById('btn-open-invite');
        if (btnInvite) btnInvite.style.display = 'none';
        
        initPresence();
        await refreshSidebar();
        await loadMessages();
    } catch(err) { showToast("Gagal keluar dari grup"); }
};

window.kickMember = async (targetId, targetName) => {
    if(!confirm(`Keluarkan ${targetName} dari grup?`)) return;
    try {
        const { error } = await supabase.from('group_members').delete()
            .eq('group_id', window.activeGroupId).eq('user_id', targetId);
        if (error) throw error;
        
        showToast(`${targetName} dikeluarkan`);
        window.openGroupSettings(); // Refresh list member
        
        await supabase.from('messages').insert([{
            room_id: `group_${window.activeGroupId}`,
            message: `${targetName} telah dikeluarkan oleh admin`,
            user_id: currentUser.id,
            is_system: true
        }]);
    } catch(err) { showToast("Gagal mengeluarkan member"); }
};

window.updateGroupInfo = async () => {
    const newName = document.getElementById('edit-group-name')?.value.trim();
    if(!newName) return;
    const btn = document.getElementById('btn-save-group-info');
    if(btn) { btn.innerText = "Menyimpan..."; btn.disabled = true; }
    try {
        const { error } = await supabase.from('groups').update({ name: newName }).eq('id', window.activeGroupId);
        if(error) throw error;
        showToast("Info grup diperbarui");
        
        // Langsung update nama di Header Chat
        const headerTitle = document.querySelector('.chat-header h3');
        if(headerTitle) headerTitle.innerHTML = `${newName} <span style="font-size:14px; cursor:pointer; margin-left:8px;" onclick="window.openGroupSettings()">⚙️</span>`;
        
        refreshSidebar();
    } catch(err) { showToast("Gagal update grup"); } 
    finally { if(btn) { btn.innerText = "Simpan Perubahan"; btn.disabled = false; } }
};
// ==========================================
// 🔥 VARIABEL TIMER TELPON 🔥
// ==========================================
let callRingingTimeout = null; 
let callTalkTimer = null;      
let callSeconds = 0;           

function startCallTimer() {
    const statusEl = document.getElementById('call-status');
    callSeconds = 0;
    if (callTalkTimer) clearInterval(callTalkTimer);
    
    callTalkTimer = setInterval(() => {
        callSeconds++;
        const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
        const s = String(callSeconds % 60).padStart(2, '0');
        if (statusEl) statusEl.innerText = `${m}:${s}`;
    }, 1000);
}

function stopCallTimer() {
    if (callTalkTimer) {
        clearInterval(callTalkTimer);
        callTalkTimer = null;
    }
}

// ==========================================
// 🔥 FUNGSI TELPON UTAMA 🔥
// ==========================================
window.startLiveKitCall = async () => {
    const btn = document.getElementById('btn-start-call');
    const partnerId = btn.dataset.targetId;
    const partnerName = btn.dataset.targetName;
    if (!partnerId) return;

    const overlay = document.getElementById('call-overlay');
    const statusEl = document.getElementById('call-status');
    const nameEl = document.getElementById('call-name');
    const avatarEl = document.getElementById('call-avatar');

    if (overlay) overlay.style.display = 'flex';
    if (nameEl) nameEl.innerText = partnerName;
    if (statusEl) statusEl.innerText = "MEMANGGIL...";

    const profile = await getCachedProfile(partnerId);
    if (profile && avatarEl) {
        avatarEl.src = profile.avatar_url || 'asets/png/profile.png';
    }

    try {
        // 1. Kirim Sinyal Dulu Biar HP Lawan Bunyi
        await supabase.from('messages').insert([{
            room_id: currentRoomId,
            message: `📞 Memanggil ${partnerName}...`,
            user_id: currentUser.id,
            is_system: true
        }]);

        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        // 2. Pasang Bom Waktu 30 Detik (Missed Call)
        callRingingTimeout = setTimeout(async () => {
            window.endCall();
            await supabase.from('messages').insert([{
                room_id: currentRoomId,
                message: `☎️ Panggilan tak terjawab`,
                user_id: currentUser.id,
                is_system: true
            }]);
        }, 30000);

        // 3. Kita (Penelepon) masuk ke Room duluan nunggu diangkat
        await connectToCall(currentRoomId);

    } catch (err) {
        console.error("Panggilan Gagal:", err);
        showToast("Gagal menyambung audio.");
        window.endCall();
    }
};

window.endCall = () => {
    // Matikan semua timer
    clearTimeout(callRingingTimeout);
    stopCallTimer();

    // Putus koneksi
    if (callRoom) {
        callRoom.disconnect();
        callRoom = null;
    }
    
    const callOverlay = document.getElementById('call-overlay');
    if (callOverlay) callOverlay.style.display = 'none';

    const incomingOverlay = document.getElementById('incoming-call-overlay');
    if (incomingOverlay) incomingOverlay.style.display = 'none';
    
    // Kasih tau durasi telpon pas dimatiin
    if (callSeconds > 0) {
        const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
        const s = String(callSeconds % 60).padStart(2, '0');
        showToast(`Panggilan berakhir (${m}:${s})`);
    } else {
        showToast("Panggilan berakhir");
    }
};

let callSignalData = null;

// Tampilkan Pop-up buat Penerima
window.showIncomingCall = function(msgData) {
    callSignalData = msgData; // Simpan data buat dipake pas angkat
    const overlay = document.getElementById('incoming-call-overlay');
    const nameEl = document.getElementById('incoming-name');
    
    if (overlay) overlay.style.display = 'flex';
    if (nameEl) nameEl.innerText = msgData.username || "Teman";
};

// AKSI: Lawan bicara mencet ANGKAT
window.answerCall = async () => {
    const incomingOverlay = document.getElementById('incoming-call-overlay');
    if (incomingOverlay) incomingOverlay.style.display = 'none';

    const callOverlay = document.getElementById('call-overlay');
    if (callOverlay) callOverlay.style.display = 'flex';

    const callStatus = document.getElementById('call-status');
    if (callStatus) callStatus.innerText = "CONNECTING...";

    if (callSignalData) {
        await connectToCall(callSignalData.room_id);
        if (callStatus) callStatus.innerText = "ON CALL";
    }
};

// AKSI: Lawan bicara mencet TOLAK
window.rejectCall = async () => {
    const incomingOverlay = document.getElementById('incoming-call-overlay');
    if (incomingOverlay) incomingOverlay.style.display = 'none';
    
    if (callSignalData) {
        await supabase.from('messages').insert([{
            room_id: callSignalData.room_id,
            message: `🚫 Panggilan Ditolak`,
            user_id: currentUser.id,
            is_system: true
        }]);
        callSignalData = null;
    }
};

async function connectToCall(roomName) {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-livekit-token`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'apikey': SUPABASE_ANON_KEY, 
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}` 
            },
            body: JSON.stringify({ username: myUsername, identity: currentUser.id, roomName: roomName })
        });
        
        const data = await response.json();

        callRoom = new LivekitClient.Room({ adaptiveStream: true, dynacast: true });

        callRoom.on(LivekitClient.RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === "audio") {
                const element = track.attach();
                document.body.appendChild(element);
                element.play().catch(() => {});
            }
        });

        // 🔥 DETEKSI KALAU LAWAN UDAH MASUK ROOM 🔥
        callRoom.on(LivekitClient.RoomEvent.ParticipantConnected, (participant) => {
            clearTimeout(callRingingTimeout); // Batalin missed call
            startCallTimer(); // Mulai ngitung 00:01
        });

        const LIVEKIT_URL = "wss://voicegrup-zxmeibkn.livekit.cloud"; 
        await callRoom.connect(LIVEKIT_URL, data.token);
        await callRoom.localParticipant.setMicrophoneEnabled(true);

        // Kalau pas kita connect, ternyata lawan udah di dalam (buat penerima yang angkat telpon)
        if (callRoom.remoteParticipants.size > 0) {
            clearTimeout(callRingingTimeout);
            startCallTimer();
        }

    } catch (e) {
        console.error("Gagal koneksi LiveKit:", e.message);
        showToast("Gagal terhubung ke server panggilan.");
        window.endCall();
    }
}

async function init() {
  try {
    const ok = await requireLogin(); 
    if (!ok) return;

    await loadProfile(); 
    await initPresence(); 
    await refreshSidebar(); 
    initRealtimeMessages(); 
    await loadMessages(); 
    updateHeaderStatus(); 
    fetchStickers(); 
    
    scrollToBottom();
  } catch (err) { console.error("Gagal memulai aplikasi:", err); }
}

init();

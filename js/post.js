// Ganti namanya biar gak bentrok sama library (Recursion Fix)
function showNotif(msg, type = "info") {
  console.log(`[Notif]: ${msg} (${type})`);
  if (typeof window.toast === "function" && window.toast !== showNotif) {
    const title = type === "success" ? "Berhasil" : type === "error" ? "Gagal" : "Info";
    try {
      window.toast(title, msg, type);
      return;
    } catch (e) {
      console.warn("Gagal panggil library toast, pakai fallback alert.");
    }
  }
  alert(`${type.toUpperCase()}: ${msg}`);
}

console.log("JS CONNECTED - EGRESS OPTIMIZED 🔥");
const CLOUDINARY_CLOUD_NAME = "dhhmkb8kl";
const CLOUDINARY_UPLOAD_PRESET = "post_hope";

// =======================
// SUPABASE INIT
// =======================
const SUPABASE_URL = "https://hqetnqnvmdxdgfnnluew.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA"; 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentPostId = null;
let currentPostCreator = null; 
let replyTo = null;
let replyToUsername = null;
let giftState = { postId: null, creatorId: null, creatorName: "", userCoins: 0, selectedAmount: 0 };

// =======================
// CACHE HELPER (OPTIMIZED)
// =======================
async function getMyProfile(userId) {
  const cacheKey = `hh_profile_${userId}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // FIX: Hanya ambil kolom yang ditampilkan
  const { data } = await supabaseClient.from("profiles")
    .select("username, role, coins, avatar_url")
    .eq("id", userId)
    .single();
    
  if (data) sessionStorage.setItem(cacheKey, JSON.stringify(data));
  return data;
}

// [FUNGSI BARU DITAMBAHKAN] - Panggil ini saat tombol Ganti Foto Profil diklik!
async function updateProfileAvatar(file) {
  if (!file) return;
  showNotif("Sedang mengunggah foto profil...", "info");
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return openLogin();

    // 1. Upload ke Cloudinary biar IRIT
    const cData = await uploadImageToCloudinary(file);
    const linkIrit = cData.secure_url;

    // 2. Simpan link-nya aja ke Supabase
    const { error } = await supabaseClient
      .from("profiles")
      .update({ avatar_url: linkIrit })
      .eq("id", session.user.id);

    if (error) throw error;

    sessionStorage.removeItem(`hh_profile_${session.user.id}`);
    showNotif("Foto profil diperbarui!", "success");
    setTimeout(() => location.reload(), 1000);
  } catch (err) {
    showNotif("Gagal update profil: " + err.message, "error");
  }
}

// =======================
// CREATE NOTIFICATION
// =======================
async function createNotification({ user_id, actor_id, post_id, type, message }) {
  try {
    const finalActorId = actor_id; 
    let finalTargetUserId = user_id;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(finalTargetUserId)) return;
    if (finalTargetUserId === finalActorId) return;

    await supabaseClient.from("notifications").insert({
      user_id: finalTargetUserId,
      actor_id: finalActorId,
      post_id: parseInt(post_id),
      type: type,
      message: message,
      is_read: false,
    });
  } catch (err) {
    console.error("❌ Error System Notif:", err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const startApp = async () => {
    try {
      await getUser();
      await fetchPosts("all");
    } catch (err) {
      fetchPosts("all");
    }

    const safeInit = (name, fn) => {
      try { if (typeof fn === "function") fn(); } catch (e) {}
    };

    safeInit("Search", initSearch);
    safeInit("ReplyClick", initReplyClick);
    safeInit("Auth", initAuth);
    safeInit("Realtime", initRealtime);
    safeInit("CloseButtons", initCloseButtons);
    safeInit("PostModal", initPostModal);
    if (typeof initGiftSheet === "function") safeInit("GiftSheet", initGiftSheet);
  };

  startApp();

  const navItems = document.querySelectorAll(".nav-item");
  const sidebar = document.querySelector(".sidebar");
  const menuBtn = document.getElementById("mobileMenuBtn");

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      if (item.id === "adminPanelBtn") return;
      e.preventDefault();
      navItems.forEach((n) => n.classList.remove("active"));
      item.classList.add("active");
      fetchPosts(item.getAttribute("data-category"));
      if (sidebar) sidebar.classList.remove("active");
    });
  });

  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("active");
    });
    document.addEventListener("click", (e) => {
      if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
        sidebar.classList.remove("active");
      }
    });
  }
});

// Taruh variabel ini di paling atas file JS kamu (di luar fungsi)
let isFetchingPosts = false;

async function fetchPosts(category = "all") {
  // [ANTI-SPAM] Cegah pemanggilan ganda yang bikin egress bengkak 2x lipat
  if (isFetchingPosts) return;
  isFetchingPosts = true;

  const gallery = document.getElementById("mainGallery");
  if (!gallery) { isFetchingPosts = false; return; }

  // Tampilkan loading skeleton
  gallery.innerHTML = `<div class="skeleton-wrapper" style="grid-column: 1/-1; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; width: 100%;">${Array(6).fill(0).map(() => `<div class="skeleton-card"><div class="skeleton-shimmer"></div></div>`).join("")}</div>`;

  try {
    // [FIX 1] !inner DIHAPUS DISINI. Diganti jadi 'profiles' biasa biar gak ngilangin PP.
    let query = supabaseClient
      .from("posts")
      .select(`
        id, 
        image_url, 
        created_at, 
        creator_id, 
        profiles (username, role, avatar_url)
      `) 
      .eq("status", "approved")
      .limit(10); 

    if (category && category !== "all") {
      query = query.ilike("category", `%${category.trim()}%`);
    }

    const { data: posts, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    gallery.innerHTML = "";

    if (!posts || posts.length === 0) {
      gallery.innerHTML = '<p style="color:gray; text-align:center; grid-column:1/-1; padding:50px;">Tidak ada postingan.</p>';
      isFetchingPosts = false;
      return;
    }

    const postIds = posts.map(p => p.id);

    // [FIX 2] MINIMALIST ENGAGEMENT: Tarik post_id saja, jangan yang lain!
    const [likesRes, commentsRes] = await Promise.all([
      supabaseClient.from("likes").select("post_id").in("post_id", postIds),
      supabaseClient.from("comments").select("post_id").in("post_id", postIds)
    ]);

    const likeCounts = {};
    const commentCounts = {};
    postIds.forEach(id => { likeCounts[id] = 0; commentCounts[id] = 0; });
    
    if (likesRes.data) likesRes.data.forEach(l => { if(likeCounts[l.post_id] !== undefined) likeCounts[l.post_id]++; });
    if (commentsRes.data) commentsRes.data.forEach(c => { if(commentCounts[c.post_id] !== undefined) commentCounts[c.post_id]++; });

    // --- RENDER ---
    posts.forEach((post) => {
      const card = document.createElement("div");
      card.className = "card post-fade-in";
      
      const userRole = (post.profiles?.role || "user").toLowerCase().trim();
      const badge = getUserBadge(userRole);
      
      // Pakai tanggal pendek: "6 Apr"
      const dateObj = new Date(post.created_at);
      const formattedDate = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

      card.innerHTML = `
        <div class="slider">
          <img src="${post.image_url || "asets/png/karya.png"}" class="active" loading="lazy">
          <div class="watermark-overlay"><img src="asets/svg/watermark.svg"></div>
        </div>
        <div class="overlay">
          <h2 class="name" onclick="window.location.href='data.html?id=${post.creator_id}'" style="cursor:pointer; display:flex; align-items:center;">
            ${post.profiles?.username || "User"} ${badge} 
          </h2>
          <div class="post-date-wrapper" style="margin-bottom: 8px;">
            <span style="font-size: 10px; color: rgba(255,255,255,0.5);">Diunggah ${formattedDate}</span>
          </div>
          <div class="actions">
            <a href="data.html?id=${post.creator_id}" class="primary">Detail</a>
            <div class="engagement-group">
               <button class="icon-btn gift-btn" data-post="${post.id}" data-creator="${post.creator_id}" data-name="${post.profiles?.username}"><svg viewBox="0 0 24 24" class="icon"><path d="M20 7h-2.18A3 3 0 0 0 12 3a3 3 0 0 0-5.82 4H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-8-2a1 1 0 0 1 1 1v1h-2V6a1 1 0 0 1 1-1Zm-4 1a1 1 0 0 1 2 0v1H8a1 1 0 0 1 0-2Zm9 13h-4v-7h4Zm-6 0H7v-7h4Zm8-9H5V9h14Z"/></svg></button>
               <button class="icon-btn like-btn" data-post="${post.id}" data-creator="${post.creator_id}"><svg viewBox="0 0 24 24" class="icon heart"><path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 12.28 18.6 15.36 13.55 20.04z"/></svg><span class="like-count">${likeCounts[post.id]}</span></button>
               <button class="icon-btn comment-toggle" data-post="${post.id}" data-creator="${post.creator_id}"><svg viewBox="0 0 24 24" class="icon"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg><span class="comment-count">${commentCounts[post.id]}</span></button>
            </div>
          </div>
        </div>`;
      gallery.appendChild(card);
    });

    initGiftButtons(); initLikeButtons(); initComments(); loadLikes(); 
  } catch (err) {
    console.error(err);
  } finally {
    // Selesai, buka kunci agar bisa dipanggil lagi nanti
    isFetchingPosts = false;
  }
}

// =======================
// GIFT SYSTEM
// =======================
function initGiftButtons() {
  document.querySelectorAll(".gift-btn").forEach((btn) => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) { openLogin(); return; }

      const postId = newBtn.dataset.post;
      const creatorId = newBtn.dataset.creator;
      if (session.user.id === creatorId) { showNotif("Gak bisa gift diri sendiri", "warning"); return; }

      const prof = await getMyProfile(session.user.id);
      openGiftSheet({ postId, creatorId, creatorName: newBtn.dataset.name, userCoins: prof?.coins || 0 });
    });
  });
}

function openGiftSheet({ postId, creatorId, creatorName, userCoins }) {
  const sheet = document.getElementById("giftSheet");
  if (!sheet) return;
  giftState = { postId, creatorId, creatorName, userCoins, selectedAmount: 0 };
  document.getElementById("giftUserCoins").textContent = userCoins;
  const sendBtn = document.getElementById("sendGiftBtn");
  sendBtn.disabled = true; sendBtn.textContent = "Kirim";
  document.querySelectorAll(".gift-item").forEach((i) => i.classList.remove("active"));
  sheet.classList.add("active");
  document.body.style.overflow = "hidden";
}

let selectedGiftImage = null;
function selectGift(element, amount, imageName) {
  document.querySelectorAll(".gift-item").forEach((item) => item.classList.remove("selected-gift"));
  element.classList.add("selected-gift");
  selectedGiftImage = imageName;
  giftState.selectedAmount = amount;
  const sendBtn = document.getElementById("sendGiftBtn");
  sendBtn.disabled = false; sendBtn.textContent = `Kirim (${amount} Koin)`;
}

async function processGiftTransaction() {
  const amount = giftState.selectedAmount;
  const sendBtn = document.getElementById("sendGiftBtn");
  if (!selectedGiftImage || amount <= 0) return;
  if (amount > giftState.userCoins) { showNotif("Koin tidak cukup", "error"); return; }
  sendBtn.disabled = true; sendBtn.textContent = "Mengirim...";

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const { error: rpcErr } = await supabaseClient.rpc("transfer_coins", { sender_id: session.user.id, receiver_id: giftState.creatorId, amount });
    if (rpcErr) throw rpcErr;

    await supabaseClient.from("gift_transactions").insert({ sender_id: session.user.id, receiver_id: giftState.creatorId, post_id: parseInt(giftState.postId), amount });
    showBigImage(selectedGiftImage);
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

    const sProf = await getMyProfile(session.user.id);
    await createNotification({ user_id: giftState.creatorId, actor_id: session.user.id, post_id: giftState.postId, type: "gift", message: `${sProf?.username} mengirim ${amount} coin ke karyamu` });

    giftState.userCoins -= amount;
    document.getElementById("giftUserCoins").textContent = giftState.userCoins;
    
    sProf.coins = giftState.userCoins;
    sessionStorage.setItem(`hh_profile_${session.user.id}`, JSON.stringify(sProf));
    
    closeGiftSheet();
  } catch (err) { showNotif("Gagal: " + err.message, "error"); }
  finally { sendBtn.disabled = false; sendBtn.textContent = "Kirim"; }
}

function showBigImage(imageName) {
  const container = document.getElementById("giftAnimationContainer");
  if (!container) return;
  container.innerHTML = `<img src="${imageName}" class="gift-main-img">`;
  setTimeout(() => { container.innerHTML = ""; }, 2500);
}

function closeGiftSheet() {
  const sheet = document.getElementById("giftSheet");
  if (sheet) sheet.classList.remove("active");
  document.body.style.overflow = "";
}

// =======================
// COMMENTS SYSTEM (OPTIMIZED)
// =======================
function initComments() {
  const modal = document.getElementById("commentModal");
  if (!modal) return;
  const list = modal.querySelector(".comment-list");
  const input = modal.querySelector(".comment-input");

  document.querySelectorAll(".comment-toggle").forEach((btn) => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) { openLogin(); return; }
      currentPostId = newBtn.dataset.post;
      currentPostCreator = newBtn.dataset.creator; 
      modal.classList.add("active");
      list.innerHTML = "<li style='color:#aaa; text-align:center; padding:20px;'>Loading...</li>";
      await loadCommentsStructured();
    });
  });

  input.onkeydown = async (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      e.preventDefault();
      const content = input.value.trim();
      const sReplyTo = replyTo;
      const sReplyUser = replyToUsername;
      input.value = ""; input.placeholder = "Mengirim...";
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        await supabaseClient.from("comments").insert({ post_id: parseInt(currentPostId), user_id: session.user.id, content, parent_id: sReplyTo ? parseInt(sReplyTo) : null, reply_to_username: sReplyUser || null });
        replyTo = null; replyToUsername = null; input.placeholder = "Tulis komentar...";
        
        const sProf = await getMyProfile(session.user.id);
        await createNotification({ user_id: currentPostCreator, actor_id: session.user.id, post_id: currentPostId, type: "comment", message: `${sProf?.username} mengomentari karyamu` });
        
        await updateCommentCount(currentPostId);
        await loadCommentsStructured();
      } catch (err) { input.placeholder = "Gagal..."; }
    }
  };
}

function createComment(comment, isReply, postOwnerId) {
  const div = document.createElement("div");
  div.className = isReply ? "comment-item reply" : "comment-item";
  const isPostOwner = comment.user_id === postOwnerId;
  const creatorBadge = isPostOwner ? `<span style="background:#444; color:#eee; padding:2px 6px; border-radius:4px; font-size:9px; margin-left:5px; font-weight:800;">CREATOR</span>` : "";
  const p = comment.profiles;
  div.innerHTML = `<div class="comment-left"><img class="comment-avatar" src="${p?.avatar_url || "https://via.placeholder.com/40"}" onclick="window.location.href='data.html?id=${p?.id}'"></div><div class="comment-right"><div class="comment-topline"><span class="comment-username" onclick="window.location.href='data.html?id=${p?.id}'">${p?.username} ${getUserBadge(p?.role, true)} ${creatorBadge}</span></div><div class="comment-text">${comment.reply_to_username ? `<span class="reply-tag">@${comment.reply_to_username}</span> ` : ""}${comment.content}</div><div class="comment-actions"><span class="reply-btn" data-id="${comment.id}">Balas</span></div></div>`;
  return div;
}

async function loadCommentsStructured() {
  const list = document.querySelector(".comment-list");
  if (!list || !currentPostId) return;
  
  // FIX: Seleksi kolom profil agar tidak boros
  const { data } = await supabaseClient.from("comments")
    .select("id, content, created_at, user_id, parent_id, reply_to_username, profiles(id, username, avatar_url, role)")
    .eq("post_id", currentPostId)
    .order("created_at", { ascending: true });
  
  const ownerId = currentPostCreator;
  list.innerHTML = (!data || data.length === 0) ? "<li style='text-align:center; padding:20px; color:#aaa;'>Belum ada komentar.</li>" : "";
  if(!data) return;

  const parents = data.filter(c => !c.parent_id);
  parents.forEach(p => {
    const wrap = document.createElement("div"); wrap.className = "comment-thread";
    wrap.appendChild(createComment(p, false, ownerId));
    
    const childs = data.filter(r => String(r.parent_id) === String(p.id));
    if (childs.length > 0) {
      const toggleBtn = document.createElement("div");
      toggleBtn.className = "view-replies-btn";
      toggleBtn.style.cssText = "margin-left: 55px; font-size: 11px; color: #aaa; cursor: pointer; padding: 5px 0; font-weight: bold;";
      toggleBtn.innerHTML = `——— Lihat ${childs.length} balasan`;

      const replyWrap = document.createElement("div");
      replyWrap.className = "reply-group";
      replyWrap.style.display = "none"; 

      childs.forEach(c => replyWrap.appendChild(createComment(c, true, ownerId)));

      toggleBtn.onclick = () => {
        const isHidden = replyWrap.style.display === "none";
        replyWrap.style.display = isHidden ? "block" : "none";
        toggleBtn.innerHTML = isHidden ? `——— Sembunyikan balasan` : `——— Lihat ${childs.length} balasan`;
      };

      wrap.appendChild(toggleBtn);
      wrap.appendChild(replyWrap);
    }
    list.appendChild(wrap);
  });
}

function initReplyClick() {
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("reply-btn")) {
      replyTo = e.target.dataset.id;
      replyToUsername = e.target.closest(".comment-item").querySelector(".comment-username").childNodes[0].textContent.trim();
      const input = document.querySelector(".comment-input");
      if (input) { input.placeholder = "Membalas @" + replyToUsername + "..."; input.focus(); }
    }
  });
}

// =======================
// LIKES SYSTEM (CLEAN OPTIMIZED)
// =======================
function initLikeButtons() {
  document.querySelectorAll(".like-btn").forEach((btn) => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) { openLogin(); return; }
      
      const pId = newBtn.dataset.post;
      const creatorId = newBtn.dataset.creator; 
      const isCurrentlyLiked = newBtn.classList.contains("liked");
      let currentCount = parseInt(newBtn.querySelector(".like-count").textContent || "0");

      if (isCurrentlyLiked) {
        newBtn.classList.remove("liked");
        newBtn.querySelector(".like-count").textContent = Math.max(0, currentCount - 1);
        await supabaseClient.from("likes").delete().match({ post_id: pId, user_id: session.user.id });
      } else {
        newBtn.classList.add("liked");
        newBtn.querySelector(".like-count").textContent = currentCount + 1;
        await supabaseClient.from("likes").insert({ post_id: pId, user_id: session.user.id });
        
        const sP = await getMyProfile(session.user.id);
        await createNotification({ user_id: creatorId, actor_id: session.user.id, post_id: pId, type: "like", message: `${sP?.username} menyukai karyamu` });
      }
    });
  });
}

async function loadLikes() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return; 

  const likeBtns = document.querySelectorAll(".like-btn");
  if (likeBtns.length === 0) return;

  const postIds = Array.from(likeBtns).map(btn => btn.dataset.post);

  // FIX: Gunakan .in untuk request borongan tunggal
  const { data } = await supabaseClient.from("likes")
      .select("post_id")
      .eq("user_id", session.user.id)
      .in("post_id", postIds);

  const myLikedPostIds = data ? data.map(row => String(row.post_id)) : [];
  likeBtns.forEach(btn => {
      if (myLikedPostIds.includes(btn.dataset.post)) btn.classList.add("liked");
  });
}

async function updateCommentCount(postId) {
  const { count } = await supabaseClient.from("comments").select("id", { count: "exact", head: true }).eq("post_id", postId);
  const el = document.querySelector(`.comment-toggle[data-post="${postId}"] .comment-count`);
  if (el) el.textContent = count || 0;
}

// =======================
// AUTH & UTILS
// =======================
async function getUser() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    currentUser = session.user;
    const prof = await getMyProfile(currentUser.id); 
    currentUser.role = prof?.role || "user";
    const adminBtn = document.getElementById("adminPanelBtn");
    if (adminBtn) adminBtn.style.display = currentUser.role === "admin" ? "flex" : "none";
  }
}

function getUserBadge(role, isComment = false) {
  const r = (role || "user").toLowerCase().trim();
  let b = "";
  if (r === "admin") b += `<span class="admin-badge" style="background:#ff4757; color:white; padding:2px 8px; border-radius:4px; font-size:10px; margin-left:5px; font-weight:bold;">🛡 Dev</span>`;
  const crowns = { crown1: "asets/png/crown1.png", crown2: "asets/png/crown2.png", crown3: "asets/png/crown3.png" };
  if (isComment && crowns[r]) b += `<img src="${crowns[r]}" style="width:18px; margin-left:5px; vertical-align:middle;">`;
  else if (r === "verified" || (!isComment && crowns[r])) b += `<span class="verified-badge" style="margin-left:5px;"><svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1DA1F2"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  return b;
}

function initSearch() {
  const input = document.getElementById("searchCreator");
  input?.addEventListener("input", () => {
    const val = input.value.toLowerCase();
    document.querySelectorAll(".card").forEach((c) => c.style.display = c.innerText.toLowerCase().includes(val) ? "block" : "none");
  });
}

function initAuth() {
  const form = document.querySelector(".form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabaseClient.auth.signInWithPassword({ email: form.querySelectorAll("input")[0].value, password: form.querySelectorAll("input")[1].value });
    if (error) showNotif(error.message, "error"); else location.reload();
  });
}

function openLogin() { const p = document.getElementById("loginPopup"); if (p) p.style.display = "flex"; }

function initCloseButtons() {
  document.querySelector(".comment-close")?.addEventListener("click", () => document.getElementById("commentModal").classList.remove("active"));
  document.querySelector(".close-login")?.addEventListener("click", () => document.getElementById("loginPopup").style.display = "none");
}

function initRealtime() {
  supabaseClient.channel("updates").on("postgres_changes", { event: "*", schema: "public", table: "comments" }, (payload) => {
    if(payload.new && payload.new.post_id) updateCommentCount(payload.new.post_id);
  }).subscribe();
}

function initPostModal() {
  const modal = document.getElementById("postModal");
  document.getElementById("openPostModalBtn")?.addEventListener("click", async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { openLogin(); return; }
    modal.classList.add("active");
  });
  document.getElementById("closePostModalBtn")?.addEventListener("click", () => modal.classList.remove("active"));
  document.getElementById("postUploadArea")?.addEventListener("click", () => document.getElementById("postImageInput").click());
  document.getElementById("postImageInput")?.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) { selectedPostFile = f; const r = new FileReader(); r.onload = (ev) => { document.getElementById("postPreviewImage").src = ev.target.result; document.getElementById("postPreviewImage").style.display = "block"; document.getElementById("postUploadPlaceholder").style.display = "none"; }; r.readAsDataURL(f); }
  });
  document.getElementById("postForm")?.addEventListener("submit", handlePostSubmit);
  setupCustomCategory();
}

function setupCustomCategory() {
  const d = document.getElementById("categoryDropdown");
  if (!d) return;
  d.querySelector(".select-trigger").onclick = () => d.classList.toggle("active");
  d.querySelectorAll(".option-item").forEach(o => {
    o.onclick = () => { document.getElementById("selectedCategoryText").innerText = o.innerText; document.getElementById("postCategory").value = o.dataset.value; d.classList.remove("active"); };
  });
}

async function handlePostSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById("submitPostBtn");
  if (!selectedPostFile) return showNotif("Pilih foto dulu", "warning");
  btn.disabled = true; btn.textContent = "Mengirim...";
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const cData = await uploadImageToCloudinary(selectedPostFile);
    const prof = await getMyProfile(session.user.id);
    await supabaseClient.from("posts").insert({ creator_id: session.user.id, name: prof.username, bio: document.getElementById("postCaption").value, category: document.getElementById("postCategory").value, image_url: cData.secure_url, status: "pending" });
    showNotif("Karya dikirim! Menunggu review", "success");
    document.getElementById("postModal").classList.remove("active");
  } catch (err) { showNotif(err.message, "error"); }
  finally { btn.disabled = false; btn.textContent = "Kirim ke Review"; }
}

async function uploadImageToCloudinary(file) {
  const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
  return await res.json();
}

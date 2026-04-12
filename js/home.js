// =======================
// SUPABASE INIT
// =======================
const SUPABASE_URL = "https://hqetnqnvmdxdgfnnluew.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =======================
// MAINTENANCE SYSTEM (FIX EGRESS CACHE)
// =======================
async function checkMaintenance() {
    try {
        // Cek Cache di Memori HP dulu
        const cachedMaint = sessionStorage.getItem('hh_maintenance');
        let isMaintenance = false;

        if (cachedMaint !== null) {
            isMaintenance = cachedMaint === 'true';
        } else {
            const { data, error } = await db.from('app_settings').select('value').eq('key', 'maintenance_mode').maybeSingle();
            isMaintenance = data && data.value === 'true';
            sessionStorage.setItem('hh_maintenance', isMaintenance);
        }
        
        if (isMaintenance) {
            const adBanner = document.querySelector('.ad-banner-container');
            if (adBanner) adBanner.style.display = 'none';

            document.body.innerHTML = `
                <div style="
                    height: 100vh; width: 100vw;
                    display: flex; flex-direction: column; justify-content: center; align-items: center;
                    text-align: center; padding: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background: #ffffff; color: #000000;
                    position: fixed; top: 0; left: 0; z-index: 999999;
                ">
                    <div style="max-width: 280px; width: 100%;">
                        <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 12px; letter-spacing: -1px; text-transform: uppercase;">
                            HopeHype
                        </h1>
                        <div style="height: 1px; width: 40px; background: #000; margin: 0 auto 24px;"></div>
                        <p style="font-size: 15px; font-weight: 600; margin-bottom: 8px;">Lagi rehat sebentar.</p>
                        <p style="color: #666; font-size: 13px; line-height: 1.6; margin-bottom: 40px;">Sistem lagi dirapiin biar makin asik dipake.</p>
                        <div style="width: 100%; height: 2px; background: #f0f0f0; position: relative; overflow: hidden;">
                            <div style="position: absolute; width: 40%; height: 100%; background: #000; animation: lineMove 1.5s infinite ease-in-out;"></div>
                        </div>
                        <p style="margin-top: 15px; font-size: 10px; color: #aaa; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Maintenance Mode</p>
                    </div>
                    <style>
                        @keyframes lineMove { 0% { left: -40%; } 100% { left: 100%; } }
                        body { overflow: hidden !important; margin: 0 !important; padding: 0 !important; }
                    </style>
                </div>`;
            return true; 
        }
    } catch (err) {
        console.error("Gagal cek status maintenance:", err);
    }
    return false;
}

// Eksekusi Pengecekan
checkMaintenance().then((isMaintenance) => {
    if (!isMaintenance) {
        initApp();
    }
});

// =======================
// MIDTRANS INIT
// =======================
let isMidtransLoading = false;
function loadMidtrans() {
  if (window.snap || isMidtransLoading) return;
  isMidtransLoading = true;
  const script = document.createElement("script");
  script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
  script.setAttribute("data-client-key", "SB-Mid-client-G2wOVrrTwcffYhkC");
  script.async = true;
  script.onload = () => { isMidtransLoading = false; };
  script.onerror = () => { isMidtransLoading = false; };
  document.head.appendChild(script);
}
loadMidtrans();

// =======================
// DYNAMIC BADGE SYSTEM
// =======================
function getUserBadge(role) {
  let badge = "";
  if (role === "admin") {
    badge += `<span class="admin-badge" style="background: #ff4757; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 5px; display: inline-flex; align-items: center; vertical-align: middle; line-height: 1; font-weight: bold; height: 16px;">🛡 Dev</span>`;
  }
  if (role === "verified") {
    badge += `<span class="verified-badge" style="margin-left:5px;"><svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align:middle;"><circle cx="12" cy="12" r="10" fill="#1DA1F2"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }
  const crowBadges = { crown1: "asets/png/crown1.png", crown2: "asets/png/crown2.png", crown3: "asets/png/crown3.png" };
  if (crowBadges[role]) {
    badge += `<img src="${crowBadges[role]}" style="width:18px;height:18px;margin-left:5px;vertical-align:middle;object-fit:contain;display:inline-block;" alt="${role}">`;
  }
  return badge;
}

// =======================
// AUDIO PLAYER
// =======================
const audioPlayer = document.getElementById("audio-player");
const savedSong = localStorage.getItem("currentSong");
const savedTime = localStorage.getItem("currentTime");
if (savedSong && audioPlayer) {
  audioPlayer.src = savedSong;
  audioPlayer.addEventListener("loadedmetadata", () => {
    audioPlayer.currentTime = savedTime ? parseFloat(savedTime) : 0;
    audioPlayer.play().catch(() => { console.log("Autoplay dicegah browser."); });
  });
}

// =======================
// CARDS & THEME
// =======================
const karyaCard = document.querySelector(".job-card.karya-card");
const musicCard = document.querySelector(".job-card.music-card");
const toggleBtn = document.querySelector(".toggle-dark");

function CardImages(isDark) {
  if (!karyaCard || !musicCard) return;
  if (isDark) {
    karyaCard.style.setProperty("background-image", "url('asets/png/job1.png')", "important");
    musicCard.style.setProperty("background-image", "url('asets/png/job.png')", "important");
  } else {
    karyaCard.style.setProperty("background-image", "url('asets/png/art.png')", "important");
    musicCard.style.setProperty("background-image", "url('asets/png/song.png')", "important");
  }
}

function applyTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  CardImages(isDark);
  if (toggleBtn) toggleBtn.checked = isDark;
}

if (toggleBtn) {
  const savedTheme = localStorage.getItem("theme");
  const isAutoDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = savedTheme ? savedTheme === "dark" : isAutoDark;
  applyTheme(isDark);

  toggleBtn.addEventListener("change", () => {
    document.body.classList.add("theme-transition");
    const newDark = toggleBtn.checked;
    applyTheme(newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");
    setTimeout(() => { document.body.classList.remove("theme-transition"); }, 400);
  });
} else {
  const savedTheme = localStorage.getItem("theme");
  const isAutoDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = savedTheme ? savedTheme === "dark" : isAutoDark;
  applyTheme(isDark);
}

// =======================
// 3D HOVER TILT
// =======================
document.querySelectorAll(".job-card, .recent-card").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = -(y - rect.height / 2) / 12;
    const rotateY = (x - rect.width / 2) / 12;
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = "rotateX(0) rotateY(0)";
  });
});

// =======================
// SEARCH FILTER
// =======================
const searchInput = document.querySelector(".search input") || document.getElementById("searchInput") || document.querySelector('input[type="search"]');
const cards = document.querySelectorAll(".job-card, .recent-card");
if (searchInput) {
  searchInput.addEventListener("keyup", function () {
    const value = this.value.toLowerCase();
    cards.forEach((card) => {
      const text = card.innerText.toLowerCase();
      card.style.display = text.includes(value) ? "" : "none";
    });
  });
}

// =======================
// CARD BUTTON REDIRECT
// =======================
const artButton = document.getElementById("artButton");
if (artButton && karyaCard) {
  artButton.addEventListener("click", (e) => {
    e.preventDefault();
    karyaCard.style.setProperty("background-image", "url('asets/png/art.png')", "important");
    setTimeout(() => (window.location.href = "post.html"), 100);
  });
}
const songButton = document.querySelector(".music-card .button");
if (songButton && musicCard) {
  songButton.addEventListener("click", (e) => {
    e.preventDefault();
    musicCard.style.setProperty("background-image", "url('asets/png/song.png')", "important");
    setTimeout(() => (window.location.href = "music.html"), 100);
  });
}

// =======================
// PRELOAD IMAGES
// =======================
function preloadImages(urls, callback) {
  let loaded = 0;
  if (!urls.length) { if (callback) callback(); return; }
  urls.forEach((url) => {
    const img = new Image();
    img.src = url;
    img.onload = () => { loaded++; if (loaded === urls.length && callback) callback(); };
    img.onerror = () => { loaded++; if (loaded === urls.length && callback) callback(); };
  });
}
preloadImages(["asets/png/job1.png", "asets/png/job.png", "asets/png/art.png", "asets/png/song.png"], () => {
  CardImages(document.body.classList.contains("dark"));
});

// =======================
// PROFILE & AVATAR MENU
// =======================
const profile = document.getElementById("userProfile");
const menu = document.getElementById("profileMenu");
if (profile && menu) {
  profile.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === "flex" ? "none" : "flex";
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !profile.contains(e.target)) menu.style.display = "none";
  });
}

const avatar = document.getElementById("avatar");
const avatarMenu = document.getElementById("avatarMenu");
if (avatar && avatarMenu) {
  avatar.addEventListener("click", (e) => {
    e.stopPropagation();
    avatarMenu.style.display = avatarMenu.style.display === "flex" ? "none" : "flex";
  });
  document.addEventListener("click", (e) => {
    if (!avatarMenu.contains(e.target) && e.target !== avatar) avatarMenu.style.display = "none";
  });
}

// =======================
// SETTINGS MODAL + PROFILE (EGRESS FIX 🛡️)
// =======================
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.getElementById("closeSettings");
const saveSettings = document.getElementById("saveSettings");
const newUsernameInput = document.getElementById("newUsername");
const avatarPreview = document.getElementById("avatarPreview");
const avatarUpload = document.getElementById("avatarUpload");
const avatarOptions = document.querySelectorAll("#avatarOptions .avatar-choice");

let selectedAvatar = null;
let uploadedAvatarFile = null; // KITA SIMPAN FILE ASLINYA, BUKAN BASE64

if (settingsBtn && settingsModal) {
  settingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("active");
    avatarMenu && (avatarMenu.style.display = "none");
    const usernameEl = document.getElementById("username");
    if (usernameEl && newUsernameInput) {
      const clone = usernameEl.cloneNode(true);
      clone.querySelectorAll(".admin-badge, .verified-badge, img").forEach((el) => el.remove());
      newUsernameInput.value = clone.textContent.trim();
    }
  });
}

if (closeSettings && settingsModal) {
  closeSettings.addEventListener("click", () => settingsModal.classList.remove("active"));
}
if (settingsModal) {
  settingsModal.addEventListener("click", (e) => { if (e.target === settingsModal) settingsModal.classList.remove("active"); });
}

avatarOptions.forEach((img) => {
  img.addEventListener("click", () => {
    selectedAvatar = img.getAttribute("src");
    uploadedAvatarFile = null;
    if (avatarPreview) avatarPreview.src = selectedAvatar;
    avatarOptions.forEach((i) => i.classList.remove("selected"));
    img.classList.add("selected");
  });
});

// PREVIEW FOTO TANPA BASE64 (0 EGRESS)
if (avatarUpload && avatarPreview) {
  avatarUpload.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    uploadedAvatarFile = file;
    selectedAvatar = null;
    avatarPreview.src = URL.createObjectURL(file); // Cepat & ringan
    avatarOptions.forEach((i) => i.classList.remove("selected"));
  });
}

// PROSES SIMPAN (UPLOAD KE CLOUDINARY DULU)
if (saveSettings) {
  saveSettings.addEventListener("click", async () => {
    const originalText = saveSettings.innerText;
    saveSettings.innerText = "Menyimpan...";
    saveSettings.disabled = true;

    try {
      const { data: { user }, error: userError } = await db.auth.getUser();
      if (userError || !user) { showToast("Belum login", "Silakan login dulu", "warning"); return; }

      const newUsername = newUsernameInput?.value?.trim();
      if (!newUsername) { showToast("Username kosong", "Isi username terlebih dahulu", "warning"); return; }

      let finalAvatarUrl = selectedAvatar;

      // JIKA USER UPLOAD FOTO DARI HP -> KIRIM KE CLOUDINARY
      if (uploadedAvatarFile) {
        showToast("Sedang mengunggah foto...", "Mohon tunggu", "info");
        const fd = new FormData();
        fd.append("file", uploadedAvatarFile);
        fd.append("upload_preset", "post_hope"); // Sesuai preset Cloudinary kamu

        const res = await fetch("https://api.cloudinary.com/v1_1/dhhmkb8kl/image/upload", { 
          method: "POST", body: fd 
        });
        
        if (!res.ok) throw new Error("Gagal mengunggah gambar ke server");
        const cData = await res.json();
        finalAvatarUrl = cData.secure_url; // Dapat deh link iritnya!
      }

      const updatePayload = { username: newUsername };
      if (finalAvatarUrl) updatePayload.avatar_url = finalAvatarUrl;

      // UPDATE KE SUPABASE (HANYA MENGIRIM LINK URL PENDEK)
      const { data: updatedProfile, error } = await db
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id)
        .select("username, role, avatar_url") 
        .single();

      if (error) {
        if (error.code === "23505" || error.message.includes("unique")) { showToast("Gagal Update", "Username sudah terpakai!", "error"); return; }
        throw error;
      }

      sessionStorage.setItem(`hh_profile_${user.id}`, JSON.stringify(updatedProfile));
      
      showToast("Profil diperbarui", "Foto berhasil diubah!", "success");
      setTimeout(() => location.reload(), 1200); // Reload biar bersih semuanya
      
    } catch (err) {
      showToast("Gagal update profil", err.message, "error");
    } finally {
      saveSettings.innerText = originalText;
      saveSettings.disabled = false;
    }
  });
}

/* =======================
   TOAST MODERN
======================= */
let toastTimer;
function showToast(title, message = "", type = "info") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }
  clearTimeout(toastTimer);
  toast.className = "";
  toast.innerHTML = `
    <div class="toast-icon-wrap ${type}"><div class="toast-icon">${getToastIcon(type)}</div></div>
    <div class="toast-content"><div class="toast-title">${title}</div>${message ? `<div class="toast-subtitle">${message}</div>` : ""}</div>
    <button class="toast-close" aria-label="Close">✕</button>
  `;
  toast.classList.add("toast-card", type);
  requestAnimationFrame(() => toast.classList.add("show"));
  const closeBtn = toast.querySelector(".toast-close");
  if (closeBtn) closeBtn.onclick = () => hideToast();
  toastTimer = setTimeout(() => hideToast(), 3200);
}

function hideToast() {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.classList.remove("show");
  setTimeout(() => { toast.className = ""; toast.innerHTML = ""; }, 260);
}

function getToastIcon(type) {
  switch (type) { case "success": return "✓"; case "warning": return "⚠"; case "error": return "!"; default: return "i"; }
}

// =======================
// POPUP CHECK (FIX EGRESS CACHE)
// =======================
async function checkPopup() {
  try {
    const cachedPopup = sessionStorage.getItem('hh_popup');
    let popupData = null;

    if (cachedPopup) {
      popupData = JSON.parse(cachedPopup);
    } else {
      // Hapus select(*) ganti spesifik
      const { data, error } = await db.from("site_settings").select("popup_active, popup_text, popup_image").eq("id", 1).single();
      if (error || !data) return;
      popupData = data;
      sessionStorage.setItem('hh_popup', JSON.stringify(popupData));
    }

    if (popupData && popupData.popup_active) {
        const popup = document.getElementById("ad-popup");
        const desc = document.getElementById("popup-desc");
        const img = document.getElementById("popup-img");

        if (desc) desc.textContent = popupData.popup_text || "";
        if (img) {
            if (popupData.popup_image) {
                img.src = popupData.popup_image;
                img.style.display = "block";
            } else {
                img.style.display = "none";
            }
        }
        if (popup) popup.style.display = "flex";
    }
  } catch (err) {
    console.error("checkPopup error:", err);
  }
}

// =======================
// LOGIN / LOGOUT & PROFILE (FIX EGRESS CACHE)
// =======================
async function loadUser() {
  try {
    const { data: { session }, error: sessionError } = await db.auth.getSession();
    if (sessionError || !session) return;

    const user = session.user;
    
    // --- TAMBAHKAN BARIS INI ---
    // Panggil fungsi notifikasi segera setelah user terdeteksi login
    aktifkanNotifikasi(user.id); 
    // ---------------------------

    const cacheKey = `hh_profile_${user.id}`;
    // ... sisa kode loadUser kamu dibawahnya ...

    let profile = null;

    // Cek Profile di Memori (Biar Hemat Egress)
    const cachedProfileStr = sessionStorage.getItem(cacheKey);
    if (cachedProfileStr) {
      profile = JSON.parse(cachedProfileStr);
    } else {
      const { data, error: profileError } = await db
        .from("profiles")
        .select("username, role, avatar_url, coins") // FIX EGRESS
        .eq("id", user.id)
        .single();
        
      if (profileError) return;
      profile = data;
      if (profile) sessionStorage.setItem(cacheKey, JSON.stringify(profile));
    }

    if (profile) {
      if (profile.role === 'banned') {
        showToast("Akun Anda telah ditangguhkan oleh Admin!");
        await db.auth.signOut(); 
        window.location.href = "login.html"; 
        return; 
      }

      const usernameEl = document.getElementById("username");
      const avatarEl = document.getElementById("avatar");
      const coinEl = document.getElementById("coinAmount");

      if (usernameEl) usernameEl.innerHTML = `${profile.username || user.email.split("@")[0]} ${getUserBadge(profile.role)}`;
      if (avatarEl) {
        if (profile.avatar_url) {
          const avatarSrc = profile.avatar_url.startsWith("data:image") ? profile.avatar_url : profile.avatar_url + "?t=" + Date.now();
          avatarEl.src = avatarSrc;
          if (typeof avatarPreview !== 'undefined' && avatarPreview) avatarPreview.src = avatarSrc;
        } else {
          avatarEl.src = "default-avatar.png";
          if (typeof avatarPreview !== 'undefined' && avatarPreview) avatarPreview.src = "default-avatar.png";
        }
      }
      if (coinEl) coinEl.textContent = profile.coins ?? 0;
    }
  } catch (err) {
    console.error("loadUser error:", err);
  }
}

// =======================
// TOMBOL PRO & LIVECHAT
// =======================
const buyBtnElement = document.getElementById("buyVerified");
const bSheet = document.getElementById("vip-bottom-sheet");
const bOverlay = document.querySelector(".sheet-overlay");

if (buyBtnElement && bSheet) {
  buyBtnElement.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    bSheet.style.display = "flex";
    if (window.LiveChatWidget && typeof window.LiveChatWidget.call === "function") {
      try { window.LiveChatWidget.call("hide_widget"); } catch (err) {}
    }
    setTimeout(() => bSheet.classList.add("active"), 10);
  };
}

if (bOverlay && bSheet) {
  bOverlay.onclick = () => {
    bSheet.classList.remove("active");
    if (window.LiveChatWidget && typeof window.LiveChatWidget.call === "function") {
      try { window.LiveChatWidget.call("maximize_widget"); } catch (err) {}
    }
    setTimeout(() => bSheet.style.display = "none", 400);
  };
}

// =======================
// AUTH MENU
// =======================
async function updateAuthMenu() {
  try {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;
    const { data: { session } } = await db.auth.getSession();
    logoutBtn.textContent = session?.user ? "Logout" : "Login";
  } catch (err) {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.textContent = "Login";
  }
}

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  try {
    if (notifChannel) { db.removeChannel(notifChannel); notifChannel = null; }
    const { data: { session } } = await db.auth.getSession();
    if (session) {
      const { error } = await db.auth.signOut();
      if (error && error.message !== "Auth session missing!") throw error;
    }
    localStorage.clear();
    sessionStorage.clear(); // Bersihkan semua cache
    window.location.href = "login.html";
  } catch (err) {
    if (err.message === "Auth session missing!") {
      localStorage.clear(); sessionStorage.clear(); window.location.href = "index.html"; return;
    }
    showToast("Gagal logout", err.message, "error");
  }
});

// =======================
// INIT APP (OPTIMIZED WITH SKELETON)
// =======================
const initApp = async () => {
  const skeleton = document.getElementById('skeleton-screen');
  const mainContent = document.querySelector('.container');

  try {
    // Jalankan semua proses secara PARALEL (Barengan) biar hemat waktu
    await Promise.all([
      updateAuthMenu(),
      loadUser(),
      loadUnreadNotifications(),
      loadUnreadChats(),
      subscribeNotifications(),
      checkPopup()
    ]);
  } catch (err) {
    console.error("initApp error:", err);
  } finally {
    // Matikan skeleton dan munculkan konten utama
    if (skeleton) skeleton.style.display = 'none';
    if (mainContent) {
      mainContent.style.display = 'block';
      // Pastikan loader spinner lama (jika ada) juga hilang
      const oldLoader = document.querySelector('.loader');
      if (oldLoader) oldLoader.style.display = 'none';
    }
  }
};

// ==========================================
// PARTICLES
// ==========================================
function createParticles(x, y) {
  const colors = ["#f09f33", "#00d2ff", "#4ade80", "#ff758c", "#ffffff"];
  for (let i = 0; i < 15; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = Math.random() * 8 + 4;
    p.style.width = `${size}px`; p.style.height = `${size}px`;
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = `${x}px`; p.style.top = `${y}px`;
    p.style.position = "fixed"; p.style.pointerEvents = "none";
    p.style.borderRadius = "50%"; p.style.zIndex = "10001";
    document.body.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 100 + 50;
    const destinationX = Math.cos(angle) * velocity;
    const destinationY = Math.sin(angle) * velocity;

    p.animate([
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${destinationX}px, ${destinationY}px) scale(0)`, opacity: 0 },
    ], { duration: 600 + Math.random() * 400, easing: "cubic-bezier(0, .9, .57, 1)", fill: "forwards" });
    setTimeout(() => p.remove(), 1000);
  }
}

// ==========================================
// PAYMENT LOGIC 1: BELI PREMIUM 
// ==========================================
document.querySelectorAll(".buy-now-btn").forEach((button) => {
  button.onclick = async (e) => {
    const btn = e.currentTarget;
    createParticles(e.clientX, e.clientY);
    btn.classList.add("btn-loading");

    const card = btn.closest(".product-card");
    if (!card) return btn.classList.remove("btn-loading");

    const price = card.getAttribute("data-price");
    const role = card.getAttribute("data-role");
    const name = card.querySelector(".p-name")?.innerText || "Premium";

    try {
      const { data: { user }, error: userError } = await db.auth.getUser();
      if (userError || !user) throw new Error("Silakan login dulu!");

      const { data: { session }, error: sessionError } = await db.auth.getSession();
      if (sessionError || !session) throw new Error("Silakan login ulang.");

      if (!window.snap) {
        loadMidtrans(); btn.classList.remove("btn-loading");
        return showToast("Menyiapkan koneksi", "Silakan klik lagi", "info");
      }

      const response = await fetch("https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-premium", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId: user.id, email: user.email, amount: parseInt(price, 10), item_name: name, role_target: role }),
      });

      if (!response.ok) throw new Error("Gagal menghubungi server");
      const result = await response.json();
      const token = result?.token;
      btn.classList.remove("btn-loading");

      if (!token) throw new Error("Token tidak ditemukan");

      window.snap.pay(token, {
        onSuccess: () => {
          sessionStorage.removeItem(`hh_profile_${user.id}`); // Clear cache biar data update
          showToast("Pembayaran berhasil", "Status akun akan diperbarui", "success");
          setTimeout(() => location.reload(), 1200);
        },
        onPending: () => showToast("Menunggu pembayaran", "Selesaikan transaksi terlebih dahulu", "warning"),
        onError: () => showToast("Pembayaran gagal", "Silakan coba lagi", "error"),
        onClose: async () => {
          try {
            await db.from("notifications").insert({ user_id: user.id, type: "payment_pending", message: `Kamu punya transaksi paket ${name} yang tertunda. Klik di sini untuk melanjutkan.`, token: token, is_read: false });
            showToast("Tersimpan!", "Cek lonceng notifikasi ya", "success");
            if (typeof loadUnreadNotifications === "function") loadUnreadNotifications();
          } catch (err) {}
        },
      });
    } catch (err) {
      btn.classList.remove("btn-loading"); showToast("Koneksi gagal", err.message, "error");
    }
  };
});

// =======================
// TOMBOL KOIN + SLIDE UP
// =======================
const topupKoinBtn = document.getElementById("topupKoinBtn");
const coinSheet = document.getElementById("coin-bottom-sheet");
const coinOverlay = document.querySelector(".coin-sheet-overlay");

if (topupKoinBtn && coinSheet) {
  topupKoinBtn.onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
    coinSheet.style.display = "flex";
    if (window.LiveChatWidget && typeof window.LiveChatWidget.call === "function") { try { window.LiveChatWidget.call("hide_widget"); } catch (err) {} }
    setTimeout(() => coinSheet.classList.add("active"), 10);
  };
}

if (coinOverlay && coinSheet) {
  coinOverlay.onclick = () => {
    coinSheet.classList.remove("active");
    if (window.LiveChatWidget && typeof window.LiveChatWidget.call === "function") { try { window.LiveChatWidget.call("maximize_widget"); } catch (err) {} }
    setTimeout(() => coinSheet.style.display = "none", 400);
  };
}

// ==========================================
// PAYMENT LOGIC 2: BELI PAKET KOIN
// ==========================================
document.querySelectorAll(".buy-coin-btn").forEach((button) => {
  button.onclick = async (e) => {
    const btn = e.currentTarget;
    btn.classList.add("btn-loading");

    const card = btn.closest(".coin-product-card");
    if (!card) return btn.classList.remove("btn-loading");

    const price = parseInt(card.getAttribute("data-price") || "0", 10);
    const coins = parseInt(card.getAttribute("data-coins") || "0", 10);
    const name = card.querySelector(".p-name")?.innerText || "Top Up Koin";

    try {
      const { data: { user }, error: userError } = await db.auth.getUser();
      if (userError || !user) throw new Error("Silakan login dulu!");
      const { data: { session }, error: sessionError } = await db.auth.getSession();
      if (sessionError || !session) throw new Error("Silakan login ulang");

      if (!window.snap) {
        loadMidtrans(); btn.classList.remove("btn-loading");
        return showToast("Menyiapkan pembayaran", "Silakan klik beli lagi", "info");
      }

      const response = await fetch("https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-coins", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId: user.id, email: user.email, amount: price, coins: coins, item_name: name }),
      });

      const rawText = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status} - ${rawText}`);
      let result; try { result = JSON.parse(rawText); } catch (jsonErr) { throw new Error("Response bukan JSON valid"); }

      const token = result?.token;
      btn.classList.remove("btn-loading");
      if (!token) throw new Error("Token pembayaran tidak ditemukan");

      window.snap.pay(token, {
        onSuccess: function () {
          sessionStorage.removeItem(`hh_profile_${user.id}`); // Clear Cache
          showToast("Pembayaran berhasil", "Koin akan masuk setelah dikonfirmasi", "success");
          setTimeout(() => location.reload(), 1200);
        },
        onPending: function () { showToast("Menunggu pembayaran", "Selesaikan transaksi terlebih dahulu", "warning"); },
        onError: function () { showToast("Pembayaran gagal", "Terjadi kesalahan", "error"); },
        onClose: async function () {
          try {
            await db.from("notifications").insert({ user_id: user.id, type: "payment_pending", message: `Kamu punya transaksi ${name} yang tertunda. Klik di sini untuk melanjutkan.`, token: token, is_read: false });
            showToast("Tersimpan!", "Cek lonceng notifikasi ya", "success");
            if (typeof loadUnreadNotifications === "function") loadUnreadNotifications();
          } catch (err) {}
        },
      });
    } catch (err) { btn.classList.remove("btn-loading"); showToast("Gagal", err.message, "error"); }
  };
});

// ==========================================
// PAYMENT LOGIC 3: KOIN CUSTOM
// ==========================================
(() => {
  const COIN_PRICE = 100;
  const MIN_TRANSACTION = 10000;
  const MAX_COINS = 5000;
  const customInput = document.getElementById("custom-coins");
  const customBtn = document.getElementById("buy-custom-coin-btn");
  const priceDisplay = document.getElementById("custom-price-display");

  if (!customInput || !customBtn || !priceDisplay) return;

  customInput.addEventListener("input", () => {
    const coins = parseInt(customInput.value) || 0;
    const price = coins * COIN_PRICE;
    if (coins > 0) {
      priceDisplay.textContent = `Total: Rp ${price.toLocaleString("id-ID")}`;
      priceDisplay.style.color = price < MIN_TRANSACTION ? "#ff4757" : "#4ade80";
    } else { priceDisplay.textContent = ""; }
  });

  customBtn.addEventListener("click", async () => {
    const coins = parseInt(customInput.value);
    const price = coins * COIN_PRICE;

    if (!coins || coins <= 0) return showToast("Masukkan jumlah koin!", "", "warning");
    if (price < MIN_TRANSACTION) return showToast("Minimal Rp 10.000", `Butuh minimal ${MIN_TRANSACTION / COIN_PRICE} koin untuk lanjut.`, "warning");
    if (coins > MAX_COINS) return showToast(`Maksimal ${MAX_COINS} koin`, "", "warning");

    if (typeof createParticles === "function") createParticles(window.innerWidth / 2, window.innerHeight / 2);
    customBtn.classList.add("btn-loading");

    try {
      const { data: { user }, error: userError } = await db.auth.getUser();
      if (userError || !user) throw new Error("Silakan login terlebih dahulu!");
      const { data: { session }, error: sessionError } = await db.auth.getSession();
      if (sessionError || !session) throw new Error("Sesi habis, silakan login ulang.");

      if (!window.snap) { showToast("Menyiapkan sistem...", "Tunggu sebentar", "info"); loadMidtrans(); return; }

      const response = await fetch("https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-coins", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId: user.id, email: user.email, amount: price, coins: coins, item_name: `${coins} Koin (Custom)` }),
      });

      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || "Gagal membuat transaksi"); }
      const result = await response.json();
      const token = result?.token;
      if (!token) throw new Error("Token pembayaran tidak ditemukan.");

      window.snap.pay(token, {
        onSuccess: () => {
          sessionStorage.removeItem(`hh_profile_${user.id}`); // Clear Cache
          showToast("Berhasil!", "Koin segera ditambahkan", "success");
          setTimeout(() => location.reload(), 1500);
        },
        onPending: () => showToast("Menunggu pembayaran", "", "warning"),
        onError: () => showToast("Pembayaran gagal", "", "error"),
        onClose: async () => {
          try {
            await db.from("notifications").insert({ user_id: user.id, type: "payment_pending", message: `Kamu punya transaksi ${coins} Koin (Custom) yang tertunda. Klik di sini untuk melanjutkan.`, token: token, is_read: false });
            showToast("Tersimpan!", "Cek lonceng notifikasi ya", "success");
            if (typeof loadUnreadNotifications === "function") loadUnreadNotifications();
          } catch (err) {}
        },
      });
    } catch (err) { showToast("Gagal", err.message, "error"); } finally { customBtn.classList.remove("btn-loading"); }
  });
})();

// =======================
// NOTIFICATION SYSTEM
// =======================
const notifBell = document.getElementById("notifBell");
const notifCountEl = document.getElementById("notifCount");
let notifList = document.getElementById("notificationList");
let notifChannel = null;
let currentUserId = null;
let notificationsPaused = false;

function updateHopeTalkBadge(count) {
  const badge = document.getElementById('hopeTalkBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : String(count); badge.style.display = 'flex';
    badge.animate([{ transform: "translateY(-50%) scale(1)" }, { transform: "translateY(-50%) scale(1.3)" }, { transform: "translateY(-50%) scale(1)" }], { duration: 300, easing: "ease-out" });
  } else { badge.style.display = 'none'; }
}

function updateNotifBadge(count) {
  if (!notifCountEl) return;
  if (!count || count <= 0) { notifCountEl.style.display = "none"; notifCountEl.textContent = "0"; return; }
  notifCountEl.style.display = "flex"; notifCountEl.textContent = count > 99 ? "99+" : String(count);
  notifCountEl.animate([{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }], { duration: 300, easing: "ease-out" });
}

async function loadUnreadNotifications() {
  try {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return updateNotifBadge(0);
    currentUserId = user.id;
    // count: exact, head: true -> INI SANGAT HEMAT EGRESS KARENA GAK NGAMBIL BARIS DATA
    const { count, error } = await db.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false);
    if (!error) updateNotifBadge(count || 0);
  } catch (err) {}
}

async function loadUnreadChats() {
  try {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return updateHopeTalkBadge(0);
    const lastRead = localStorage.getItem("lastReadHypetalk");
    let query = db.from("messages").select("*", { count: "exact", head: true }).neq("user_id", user.id);
    if (lastRead) { query = query.gt("created_at", lastRead); } else { query = query.eq("status", "sent"); }
    const { count, error } = await query;
    if (!error) updateHopeTalkBadge(count || 0);
  } catch (err) {}
}

const hopeTalkBoxElement = document.getElementById("hopeTalkBox");
if (hopeTalkBoxElement) {
  hopeTalkBoxElement.addEventListener("click", () => {
    localStorage.setItem("lastReadHypetalk", new Date().toISOString()); updateHopeTalkBadge(0);
  });
}

// ===== LOAD NOTIF LIST (FIX EGRESS: SELECT SPESIFIK) =====
async function loadNotificationList() {
  if (!currentUserId) return;
  if (!notifList) {
    notifList = document.createElement("div"); notifList.id = "notificationList"; document.body.appendChild(notifList);
  }

  try {
    // FIX EGRESS: Hapus * dan ganti dengan kolom spesifik
    const { data, error } = await db
      .from("notifications")
      .select("id, type, message, created_at, is_read, post_id, token") 
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    const isDark = document.body.classList.contains("dark");
    const headerBorder = isDark ? "#3f445e" : "#f0f0f0";
    const titleColor = isDark ? "#ffffff" : "#1a1a1a";

    notifList.innerHTML = `
      <div style="padding:5px 5px 15px 5px; border-bottom:1px solid ${headerBorder}; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
        <h2 style="margin:0; font-size:18px; font-weight:800; color:${titleColor};">Notifikasi</h2>
        <span style="background:#1DA1F2; color:white; padding:4px 10px; border-radius:20px; font-size:9px; font-weight:700;">HopeHype</span>
      </div>
      <ul id="notifItemsContainer" style="margin:0; padding:0; list-style:none;"></ul>
    `;

    const container = notifList.querySelector("#notifItemsContainer");
    if (!data || data.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:40px 10px; color:#bbb; font-size:13px;">Belum ada kabar terbaru... 🍃</div>`;
      return;
    }

    data.forEach((n) => {
      const li = document.createElement("li");
      const bgUnread = isDark ? "rgba(29,161,242,0.15)" : "rgba(29,161,242,0.05)";
      const bgRead = isDark ? "#363b5e" : "#ffffff";
      const borderColor = n.is_read ? (isDark ? "#444b75" : "#f0f0f0") : "rgba(29,161,242,0.2)";
      const textColor = isDark ? "#eeeeee" : "#333333";
      const type = n.type ? n.type.toLowerCase() : "";

      let iconName = type === "like" ? "favorite" : type === "comment" ? "chat_bubble" : type === "follow" ? "person_add" : type === "withdraw" ? "payments" : type === "payment_pending" ? "account_balance_wallet" : "notifications";
      let iconColor = type === "like" ? "#FF3040" : type === "comment" ? "#00D084" : type === "follow" ? "#9b59b6" : type === "withdraw" ? "#f09f33" : type === "payment_pending" ? "#e67e22" : "#1DA1F2";
      const time = n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

      Object.assign(li.style, {
        padding: "14px", marginBottom: "10px", borderRadius: "18px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", background: n.is_read ? bgRead : bgUnread, border: "1px solid " + borderColor, transition: "all 0.2s ease"
      });

      li.innerHTML = `
        <div style="background:${iconColor}20; width:38px; height:38px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <span class="material-icons" style="color:${iconColor}; font-size:18px;">${iconName}</span>
        </div>
        <div style="flex:1;">
          <p style="margin:0; font-size:12px; color:${textColor}; line-height:1.4; font-weight:500;">${n.message}</p>
          <span style="font-size:10px; color:#888; margin-top:4px; display:block;">${time}</span>
        </div>
        ${!n.is_read ? '<div style="width:6px; height:6px; background:#1DA1F2; border-radius:50%;"></div>' : ""}
      `;

      li.onclick = async () => {
        try {
          await db.from("notifications").update({ is_read: true }).eq("id", n.id);
          switch (type) {
            case "payment_pending":
              if (n.token) {
                closeNotif();
                if (!window.snap) { loadMidtrans(); showToast("Menyiapkan pembayaran...", "Tunggu sebentar", "info"); }
                setTimeout(() => {
                  if (window.snap) {
                    window.snap.pay(n.token, {
                      onSuccess: () => { showToast("Berhasil!", "Pembayaran selesai", "success"); setTimeout(() => location.reload(), 1200); },
                      onPending: () => showToast("Pending", "Selesaikan pembayaranmu", "warning"),
                      onError: () => showToast("Gagal", "Pembayaran gagal", "error"),
                      onClose: () => showToast("Popup ditutup", "Buka notifikasi lagi jika ingin lanjut", "info")
                    });
                  }
                }, 800);
              }
              break;
            case "follow":
              const { data: prof } = await db.from("profiles").select("username").eq("id", n.post_id).single();
              if (prof?.username) window.location.href = `data.html?id=${prof.username}`;
              break;
            case "withdraw": window.location.href = "saldo.html"; break;
            default:
              if (n.post_id) { window.location.href = `post.html?id=${n.post_id}`; } else { closeNotif(); }
              break;
          }
        } catch (e) { console.error("Redirect error:", e); }
      };
      container.appendChild(li);
    });
  } catch (err) {}
}

async function subscribeNotifications() {
  try {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;
    currentUserId = user.id;

    if (notifChannel) db.removeChannel(notifChannel);
    notifChannel = db.channel("user-notifications").on(
      "postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
      async (payload) => {
        if (!notificationsPaused) {
          await loadUnreadNotifications();
          const cleanMsg = payload.new.message.replace(/<[^>]*>/g, "");
          showToast("Notifikasi Baru", cleanMsg, "info");
        }
      }
    ).subscribe();
  } catch (err) {}
}

if (notifBell) {
  notifBell.onclick = async (e) => {
    e.stopPropagation();
    notificationsPaused = true;
    if (notifCountEl) { notifCountEl.style.display = "none"; notifCountEl.textContent = "0"; }
    try { await db.from("notifications").update({ is_read: true }).eq("user_id", currentUserId).eq("is_read", false); } catch (err) {}
    await loadNotificationList();
    setTimeout(() => notificationsPaused = false, 2000);

    let overlay = document.getElementById("notifOverlay");
    if (!overlay) { overlay = document.createElement("div"); overlay.id = "notifOverlay"; document.body.appendChild(overlay); }

    Object.assign(overlay.style, {
      display: "block", position: "fixed", top: "0", left: "0", width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", zIndex: "10000", opacity: "0", transition: "opacity 0.3s ease"
    });
    overlay.onclick = closeNotif;

    Object.assign(notifList.style, {
      display: "flex", flexDirection: "column", position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
      width: "88vw", maxWidth: "380px", maxHeight: "75vh", background: document.body.classList.contains("dark") ? "#2b3050" : "#ffffff",
      zIndex: "10001", borderRadius: "28px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", padding: "20px", overflowY: "auto",
      opacity: "0", transition: "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    });

    requestAnimationFrame(() => { overlay.style.opacity = "1"; notifList.style.opacity = "1"; });
  };
}

function closeNotif() {
  const overlay = document.getElementById("notifOverlay");
  if (notifList) notifList.style.opacity = "0";
  if (overlay) overlay.style.opacity = "0";
  setTimeout(() => { if (notifList) notifList.style.display = "none"; if (overlay) overlay.remove(); }, 300);
}

// ==========================================
// PUSH NOTIFICATION SYSTEM (HOPECREATE FULL)
// ==========================================

async function aktifkanNotifikasi(userId) {
  // 1. Tunggu sampai SDK Firebase terload
  if (typeof firebase === 'undefined') {
    setTimeout(() => aktifkanNotifikasi(userId), 1000);
    return;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyCRnwkcydQK2LkdQj7H3WmIKdEyZ9giD9I",
    authDomain: "hopecreate-b21d8.firebaseapp.com",
    projectId: "hopecreate-b21d8",
    storageBucket: "hopecreate-b21d8.firebasestorage.app",
    messagingSenderId: "313569930727",
    appId: "1:313569930727:web:afd1e2757cd0fe0867a142"
  };

  try {
    // 2. Inisialisasi Firebase
    if (firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
      console.log("Firebase HopeCreate Siap! 🚀");
    }

    const messaging = firebase.messaging();
    
    // 3. DAFTARKAN SERVICE WORKER SECARA MANUAL (SOLUSI STUCK)
    console.log("Mendaftarkan Satpam (SW)...");
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    
    // Tunggu sampai SW benar-benar aktif
    await navigator.serviceWorker.ready;
    console.log("Satpam Aktif & Siap Jaga! ✅");

    // 4. Minta Izin Notifikasi
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        console.log("Izin ditolak. Klik ikon gembok di browser lalu 'Reset Permission'!");
        return;
    }

    // 5. Ambil Token (Gunakan registration agar tidak 'No Active SW')
    console.log("Sedang mengambil token...");
const token = await messaging.getToken({ 
  serviceWorkerRegistration: registration,
vapidKey: 'BJ-fS0SMZxgXvwFL8AGRf4dxL9ijWXAONctGak7-4SGM0UxojMSeWpufhfE_kiIbBBx4iFtWUkYyks-8n36ztYo'
});


    if (token) {
      // 6. Simpan ke Supabase
      const { error } = await db.from('user_push_tokens').upsert({ 
        user_id: userId, 
        token: token 
      }, { onConflict: 'user_id' }); // Update jika user_id sudah ada

      if (error) {
        console.error("Gagal simpan ke Supabase:", error.message);
      } else {
        console.log("Notifikasi HopeHype Aktif! ✅ Token aman di database.");
      }
    }
  } catch (err) {
    console.error("DEBUG ERROR NOTIF:", err.message);
    
    // Jika error karena 'Permission Denied' atau 403, sarankan hapus DB
    if (err.message.includes('403') || err.message.includes('permission')) {
        console.log("Saran: Jalankan perintah 'indexedDB.deleteDatabase' di console.");
    }
  }
}
  // 1. Kita pilih elemen slider-nya
  const slider = document.querySelector('.ad-slider');
  let autoSlideTimer;

  // 2. Fungsi untuk mulai geser otomatis
  function startAutoSlide() {
    autoSlideTimer = setInterval(() => {
      // Cek apakah slider sudah mentok di ujung kanan
      // (Kita beri toleransi -5 pixel agar perhitungannya aman di semua HP)
      if (slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 5) {
        // Kalau sudah di ujung, kembalikan ke iklan pertama (kiri mentok)
        slider.scrollLeft = 0; 
      } else {
        // Kalau belum di ujung, geser sejauh 1 lebar iklan
        slider.scrollLeft += slider.clientWidth; 
      }
    }, 5000); // Angka 4000 = 4 detik. Kamu bisa ubah kecepatan gantinya di sini!
  }

  // 3. Fungsi untuk menyetop otomatis (saat user sedang geser manual)
  function stopAutoSlide() {
    clearInterval(autoSlideTimer);
  }

  // 4. Jalankan slide otomatis saat halaman dibuka
  startAutoSlide();

  // 5. Logika pintar: Stop otomatis kalau user sedang menyentuh/menggeser, 
  // dan nyalakan lagi kalau jarinya sudah dilepas agar tidak bentrok.
  slider.addEventListener('touchstart', stopAutoSlide); // Jari nempel di HP
  slider.addEventListener('touchend', startAutoSlide);  // Jari lepas dari HP
  slider.addEventListener('mouseenter', stopAutoSlide); // Mouse masuk (di laptop)
  slider.addEventListener('mouseleave', startAutoSlide);// Mouse keluar (di laptop)
// =======================
// PWA INSTALL SYSTEM
// =======================
const installAdBtn = document.getElementById('installPwaAd');

if (installAdBtn) {
  installAdBtn.addEventListener('click', async () => {
    // Kita cek variabel window.pwaPrompt yang ditangkap HTML tadi
    if (window.pwaPrompt) {
      window.pwaPrompt.prompt(); // Munculkan popup install
      
      const { outcome } = await window.pwaPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('PWA diinstal!');
      }
      
      window.pwaPrompt = null; // Kosongkan setelah dipakai
    } else {
      showToast("Info", "Aplikasi sudah terinstal, atau gunakan menu 'Add to Home Screen' di browser kamu.", "info");
    }
  });
}

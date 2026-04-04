let activeSongId = null;
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

function getUserBadge(role) {
  let badge = "";

  if (role === "admin") {
    badge += `<span class="admin-badge" style="background: #ff4757; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 5px; display: inline-flex; align-items: center; vertical-align: middle; line-height: 1; font-weight: bold; height: 16px;">🛡 Dev</span>`;
  }

  if (role === "verified") {
    badge += `
      <span class="verified-badge" style="margin-left:5px;">
        <svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align:middle;">
          <circle cx="12" cy="12" r="10" fill="#1DA1F2"/>
          <path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>`;
  }

  const crowBadges = {
    crown1: "asets/png/crown1.png",
    crown2: "asets/png/crown2.png",
    crown3: "asets/png/crown3.png",
  };

  if (crowBadges[role]) {
    badge += `<img src="${crowBadges[role]}" style="width:18px;height:18px;margin-left:5px;vertical-align:middle;object-fit:contain;display:inline-block;" alt="${role}">`;
  }

  return badge;
}

// ================= SUPABASE CONFIG =================
const _supabaseUrl = "https://hqetnqnvmdxdgfnnluew.supabase.co";
const _supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA";
const _supabase = createClient(_supabaseUrl, _supabaseKey);

// ================= SELECT ELEMENTS =================
const playlistGrid = document.getElementById("playlistGrid");
const searchInput = document.getElementById("search-input");
const audio = document.getElementById("audio-player");
const miniPlayer = document.getElementById("miniPlayer");
const miniCover = document.getElementById("mini-cover");
const miniTitle = document.getElementById("mini-title");
const miniArtist = document.getElementById("mini-artist");
const playBtn = document.getElementById("play-btn");
const progress = document.getElementById("progress");
const progressContainer = document.getElementById("progress-container");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");

const popup = document.getElementById("singerPopup");
const popupCover = document.getElementById("popup-cover");
const popupName = document.getElementById("popup-name");
const popupBio = document.getElementById("popup-bio");
const closeBtn = document.getElementById("closePopup");

const openSidebar = document.getElementById("openSidebar");
const closeSidebar = document.getElementById("closeSidebar");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

const commentSheet = document.getElementById("commentSheet");
const commentOverlay = document.getElementById("commentOverlay");
const sendCommentBtn = document.getElementById("sendCommentBtn");
const commentInput = document.getElementById("commentInput");
const commentList = document.getElementById("commentList");

// STATE
let allSongs = [];
let currentSongsList = [];
let currentSongIndex = -1;

// ================= 1. CORE FUNCTIONS (DATA & RENDER) =================
async function loadMusicLibrary() {
  const { data: { user } } = await _supabase.auth.getUser();

  // [FIX EGRESS]: Panggil kolom spesifik, dan jangan filter pakai .eq di child table (likes) karena bisa memfilter data lagu utamanya
  const { data, error } = await _supabase
    .from("songs")
    .select(`
        id, title, artist, cover_url, audio_src, created_at, play_count, status, category,
        comments(count),
        likes(count),
        user_liked:likes(user_id)
    `)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal muat musik:", error.message);
    return;
  }

  const userId = user?.id;

  allSongs = data.map((song) => {
    // Cari apakah ada baris like dari user yang sedang login di array user_liked
    const userLikedIt = song.user_liked ? song.user_liked.some(l => l.user_id === userId) : false;

    return {
      ...song,
      comment_count: song.comments?.[0]?.count || 0,
      like_count: song.likes?.[0]?.count || 0,
      is_liked: userLikedIt
    };
  });

  renderPlaylist(allSongs);
}

function renderPlaylist(songs) {
  if (!playlistGrid) return;
  playlistGrid.innerHTML = "";
  currentSongsList = songs;

  songs.forEach((song, index) => {
    const card = document.createElement("div");
    const isActive = index === currentSongIndex ? "active-card" : "";
    card.className = `playlist-card ${isActive}`;
    card.dataset.songId = song.id; // Untuk referensi gampang

    const isLiked = song.is_liked;
    const heartIcon = isLiked ? "favorite" : "favorite_border";
    const activeClass = isLiked ? "is-liked" : "";

    const plays = (song.play_count || 0).toLocaleString("id-ID");
    const likes = (song.like_count || 0).toLocaleString("id-ID");
    const comments = (song.comment_count || 0).toLocaleString("id-ID");

    card.innerHTML = `
            <div class="card-cover-wrapper">
                <img src="${song.cover_url}" alt="${song.title}" loading="lazy">
            </div>
            <div class="card-text-info">
                <h3 class="song-title">${song.title}</h3>
                <p class="artist-name">${song.artist}</p>
            </div>
            <div class="card-stats-footer">
                <div class="stat-item play-stat">
                    <span class="material-icons">headphones</span>
                    <span class="play-count-num">${plays}</span>
                </div>
                <div class="stat-group">
                    <div class="stat-item interactive ${activeClass}" onclick="event.stopPropagation(); window.handleLike(${song.id}, event)">
                        <span class="material-icons">${heartIcon}</span>
                        <span class="like-count-num">${likes}</span>
                    </div>
                    <div class="stat-item interactive" onclick="event.stopPropagation(); window.openComments(${song.id})">
                        <span class="material-icons">chat_bubble_outline</span>
                        <span id="comment-count-${song.id}">${comments}</span>
                    </div>
                </div>
            </div>
        `;

    card.addEventListener("click", () => {
      currentSongIndex = index;
      playSong(song);
    });
    playlistGrid.appendChild(card);
  });
}

// ================= LIKE SYSTEM (FIX EGRESS: OPTIMISTIC UI) =================
window.handleLike = async function (songId, event) {
  const statItem = event.currentTarget;
  const clickedElement = statItem.querySelector(".material-icons");
  const countSpan = statItem.querySelector(".like-count-num");

  if (clickedElement) {
    clickedElement.classList.add("heart-pop");
    setTimeout(() => clickedElement.classList.remove("heart-pop"), 400);
  }

  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) return alert("Login dulu bro!");

  // Cek database beneran (background)
  const { data: existingLike } = await _supabase
    .from("likes")
    .select("id")
    .eq("song_id", songId)
    .eq("user_id", user.id)
    .maybeSingle();

  let currentCount = parseInt(countSpan.textContent.replace(/\./g, '')) || 0;

  // Optimistic UI Update (Update layar duluan)
  const songInList = allSongs.find(s => s.id === songId);
  
  if (existingLike) {
    // UNLIKE
    statItem.classList.remove('is-liked');
    clickedElement.textContent = 'favorite_border';
    currentCount = Math.max(0, currentCount - 1);
    countSpan.textContent = currentCount.toLocaleString("id-ID");
    
    if(songInList) { songInList.is_liked = false; songInList.like_count = currentCount; }
    await _supabase.from("likes").delete().eq("id", existingLike.id);
  } else {
    // LIKE
    statItem.classList.add('is-liked');
    clickedElement.textContent = 'favorite';
    currentCount = currentCount + 1;
    countSpan.textContent = currentCount.toLocaleString("id-ID");
    
    if(songInList) { songInList.is_liked = true; songInList.like_count = currentCount; }
    await _supabase.from("likes").insert({ song_id: songId, user_id: user.id });
  }

  // NGGAK ADA LAGI loadMusicLibrary() di sini! 
};

// ================= 2. PLAYER LOGIC =================
let playTimer = null;

function playSong(song) {
  if (!miniPlayer || !audio) return;

  if (playTimer) {
    clearTimeout(playTimer);
    playTimer = null;
  }

  miniPlayer.style.display = "flex";

  audio.src = song.audio_src.startsWith("http")
    ? song.audio_src
    : `songs/${song.audio_src}`;
  audio.play();

  playTimer = setTimeout(async () => {
    if (!audio.paused && currentSongsList[currentSongIndex]?.id === song.id) {
      console.log("Valid 1 menit! Menambah play count untuk:", song.title);
      await updatePlayCount(song.id);
    }
  }, 60000);

  if (miniCover) miniCover.src = song.cover_url;
  if (miniTitle) miniTitle.textContent = song.title;
  if (miniArtist) miniArtist.textContent = song.artist;

  document.body.style.background = `linear-gradient(to bottom, rgba(13, 17, 23, 0.9), #0d1117), url('${song.cover_url}') center/cover no-repeat`;

  document.querySelectorAll(".playlist-card").forEach((card, idx) => {
    card.style.borderColor = idx === currentSongIndex ? "#1f3cff" : "#30363d";
  });
}

if (audio) {
  audio.addEventListener("ended", () => {
    currentSongIndex++;
    if (currentSongIndex < currentSongsList.length) {
      playSong(currentSongsList[currentSongIndex]);
    } else {
      currentSongIndex = 0;
      playSong(currentSongsList[0]);
    }
  });

  audio.addEventListener("play", () => {
    if (playBtn) playBtn.textContent = "pause";
  });
  audio.addEventListener("pause", () => {
    if (playBtn) playBtn.textContent = "play_arrow";
  });

  audio.addEventListener("timeupdate", () => {
    if (audio.duration && progress) {
      const percent = (audio.currentTime / audio.duration) * 100;
      progress.style.width = `${percent}%`;
      if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
      if (durationEl) durationEl.textContent = formatTime(audio.duration);
    }
  });
}

if (playBtn) {
  playBtn.addEventListener("click", () =>
    audio.paused ? audio.play() : audio.pause()
  );
}

function formatTime(time) {
  const min = Math.floor(time / 60);
  const sec = Math.floor(time % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

if (progressContainer) {
  progressContainer.addEventListener("click", (e) => {
    audio.currentTime =
      (e.offsetX / progressContainer.clientWidth) * audio.duration;
  });
}

// ================= UPDATE PLAY COUNT (FIX EGRESS) =================
async function updatePlayCount(songId) {
  try {
    const { data: songData } = await _supabase
      .from("songs")
      .select("play_count")
      .eq("id", songId)
      .single();

    const currentCount = songData?.play_count || 0;
    const newCount = currentCount + 1;

    const { error } = await _supabase
      .from("songs")
      .update({ play_count: newCount })
      .eq("id", songId);

    if (error) throw error;

    // Update Array Lokal (Biar gak ilang pas search)
    const songObj = allSongs.find(s => s.id === songId);
    if(songObj) songObj.play_count = newCount;

    // Update DOM Langsung tanpa me-refresh seluruh halaman
    const cardEl = document.querySelector(`.playlist-card[data-song-id="${songId}"]`);
    if(cardEl) {
      const countEl = cardEl.querySelector('.play-count-num');
      if(countEl) countEl.textContent = newCount.toLocaleString("id-ID");
    }

    console.log("Play count updated! +1");
    // NGGAK ADA LAGI loadMusicLibrary() di sini!
  } catch (err) {
    console.error("Gagal update play count:", err.message);
  }
}

// ================= 3. COMMENT SYSTEM =================
window.openComments = function (songId) {
  activeSongId = songId;
  if (commentSheet && commentOverlay) {
    commentOverlay.style.display = "block";
    setTimeout(() => {
      commentSheet.classList.add("active");
    }, 10);
    loadComments(songId);
  }
};

window.hideComments = function () {
  if (!commentSheet || !commentOverlay) return;
  commentSheet.classList.remove("active");
  setTimeout(() => {
    commentOverlay.style.display = "none";
  }, 400);
};

async function loadComments(songId) {
  if (!commentList) return;

  commentList.innerHTML = Array(3).fill(0).map(() => `
        <div class="skeleton-comment" style="display:flex; gap:12px; margin-bottom:20px; padding:10px; animation: pulse-bg 1.5s infinite;">
            <div style="width:32px; height:32px; background:#222; border-radius:50%;"></div>
            <div style="flex:1;">
                <div style="width:30%; height:10px; background:#222; margin-bottom:8px; border-radius:4px;"></div>
                <div style="width:80%; height:10px; background:#222; border-radius:4px;"></div>
            </div>
        </div>
    `).join("");

  const { data: allComments, error } = await _supabase
    .from("comments")
    .select("id, content, created_at, parent_id, profiles!inner(username, avatar_url, role)")
    .eq("song_id", songId)
    .order("created_at", { ascending: true });

  if (error) {
    commentList.innerHTML = '<p style="text-align:center; color:#ff4757; padding:20px;">Gagal memuat obrolan 😭</p>';
    return;
  }

  if (!allComments || allComments.length === 0) {
    commentList.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">Belum ada komentar.</p>';
    return;
  }

  const parents = allComments.filter((c) => !c.parent_id);
  const replies = allComments.filter((c) => c.parent_id);
  let finalHtml = "";

  parents.forEach((parent) => {
    const user = parent.profiles;
    const timeAgo = timeSince(new Date(parent.created_at));
    const childReplies = replies.filter((r) => r.parent_id === parent.id);
    const hasReplies = childReplies.length > 0;

    finalHtml += `
            <div class="comment-item" id="comment-${parent.id}" style="margin-bottom: 20px; display: flex; gap: 12px;">
                <img src="${user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}`}" class="comment-avatar" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                <div class="comment-content-wrapper" style="flex:1;">
                    <div class="comment-header-row" style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:bold; color:#fff; font-size:14px;">${user?.username}</span>
                        ${getUserBadge(user?.role)}
                        <span style="color:#666; font-size:11px;">${timeAgo}</span>
                    </div>
                    <p style="color:#ccc; margin:4px 0; font-size:14px; line-height:1.4;">${parent.content}</p>
                    <button class="reply-btn" onclick="replyTo('${user?.username}', ${parent.id})" style="background:none; border:none; color:#888; font-size:11px; cursor:pointer; padding:0;">Balas</button>
                    
                    ${hasReplies ? `
                        <div class="reply-section" style="margin-top: 10px;">
                            <button id="toggle-btn-${parent.id}" class="toggle-replies-btn" onclick="toggleReplies(${parent.id})" style="color: #1DA1F2; font-size: 11px; background: none; border: none; cursor: pointer; padding: 0; font-weight:500;">
                                ——— Lihat ${childReplies.length} balasan
                            </button>
                            
                            <div id="reply-container-${parent.id}" data-count="${childReplies.length}" style="display: none; margin-left: 10px; border-left: 1px solid #333; padding-left: 15px; margin-top: 10px;">
                                ${childReplies.map((reply) => `
                                    <div class="comment-item" id="comment-${reply.id}" style="margin-bottom: 12px; display: flex; gap: 10px;">
                                        <img src="${reply.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${reply.profiles?.username}`}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;">
                                        <div style="flex:1;">
                                            <div style="display:flex; align-items:center; gap:5px;">
                                                <span style="font-size:13px; font-weight:bold; color:#fff;">${reply.profiles?.username}</span>
                                                ${getUserBadge(reply.profiles?.role)}
                                                <span style="font-size:10px; color:#666;">${timeSince(new Date(reply.created_at))}</span>
                                            </div>
                                            <p style="font-size:13px; color:#ccc; margin:2px 0;">${reply.content}</p>
                                            <button class="reply-btn" onclick="replyTo('${reply.profiles?.username}', ${parent.id})" style="background:none; border:none; color:#888; font-size:10px; cursor:pointer; padding:0;">Balas</button>
                                        </div>
                                    </div>
                                `).join("")}
                            </div>
                        </div>
                    ` : ""}
                </div>
            </div>`;
  });
  commentList.innerHTML = finalHtml;
}

window.toggleReplies = function (parentId) {
  const container = document.getElementById(`reply-container-${parentId}`);
  const btn = document.getElementById(`toggle-btn-${parentId}`);
  const count = container.getAttribute("data-count");

  if (container.style.display === "none") {
    container.style.display = "block";
    btn.innerText = "——— Sembunyikan balasan";
  } else {
    container.style.display = "none";
    btn.innerText = `——— Lihat ${count} balasan`;
  }
};

window.replyTo = function (username, parentId = null) {
  if (commentInput) {
    commentInput.value = `@${username} `;
    commentInput.focus();
    commentInput.dataset.replyTo = parentId;
  }
};

// ================= SEND COMMENT =================
let cachedUserProfile = null;

async function handleSendComment() {
  const text = commentInput.value.trim();
  if (!text || !activeSongId) return;

  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) { alert("Login dulu bro!"); return; }

  // [FIX EGRESS] Cek Profile pake Cache Session
  if (!cachedUserProfile) {
    const cached = sessionStorage.getItem(`hh_profile_${user.id}`);
    if(cached) {
      cachedUserProfile = JSON.parse(cached);
    } else {
      const { data: profile } = await _supabase.from("profiles").select("username, avatar_url, role").eq("id", user.id).single();
      cachedUserProfile = profile;
      if(profile) sessionStorage.setItem(`hh_profile_${user.id}`, JSON.stringify(profile));
    }
  }

  const profile = cachedUserProfile;
  const replyData = commentInput.dataset.replyTo;
  const parentId = replyData && replyData.trim() !== "" ? Number(replyData) : null;
  const tempId = Date.now();
  const avatar = profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username}`;
  const isReply = parentId !== null;

  const tempHtml = `
        <div class="comment-item" id="temp-${tempId}" style="display: flex; gap: 10px; opacity: 0.6; margin-bottom: 15px;">
            <img src="${avatar}" style="width:${isReply ? "24px" : "32px"}; height:${isReply ? "24px" : "32px"}; border-radius:50%;">
            <div style="flex:1;">
                <div style="display:flex; align-items:center; gap:5px;">
                    <span style="font-weight:bold; color:#fff; font-size:14px;">${profile.username}</span>
                    <span style="font-size:11px; color:#888;">Mengirim...</span>
                </div>
                <p style="color:#ccc; font-size:14px; margin:0;">${text}</p>
            </div>
        </div>
    `;

  if (isReply) {
    const container = document.getElementById(`reply-container-${parentId}`);
    if (container) { container.insertAdjacentHTML("beforeend", tempHtml); container.style.display = "block"; }
  } else {
    commentList.insertAdjacentHTML("beforeend", tempHtml);
  }

  setTimeout(() => {
    const tempEl = document.getElementById(`temp-${tempId}`);
    if (tempEl) tempEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 50);

  commentInput.value = "";
  commentInput.dataset.replyTo = "";
  commentInput.placeholder = "Tulis komentar...";

  const { error } = await _supabase.from("comments").insert({
    song_id: activeSongId, user_id: user.id, content: text, parent_id: parentId,
  });

  if (error) {
    console.error(error);
    document.getElementById(`temp-${tempId}`)?.remove();
    alert("Komentar gagal terkirim!");
  } else {
    setTimeout(() => {
      loadComments(activeSongId);
      const countEl = document.getElementById(`comment-count-${activeSongId}`);
      if (countEl) {
        const currentCount = parseInt(countEl.innerText.replace(/\./g, '')) || 0;
        countEl.innerText = (currentCount + 1).toLocaleString("id-ID"); 
      }
      const songIndex = allSongs.findIndex(s => s.id === activeSongId);
      if (songIndex !== -1) { allSongs[songIndex].comment_count = (allSongs[songIndex].comment_count || 0) + 1; }
    }, 300);
  }
}

function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + "y";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + "mo";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + "d";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + "h";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + "m";
  return Math.floor(seconds) + "s";
}

if (sendCommentBtn) sendCommentBtn.addEventListener("click", handleSendComment);
if (commentInput) commentInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSendComment(); });
if (commentOverlay) commentOverlay.addEventListener("click", () => { hideComments(); });

// ================= 4. UI EXTRA =================
window.toggleSidebar = function () {
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  if (sidebar && sidebarOverlay) {
    sidebar.classList.toggle("active"); sidebarOverlay.classList.toggle("active");
  }
};

if (openSidebar) openSidebar.addEventListener("click", window.toggleSidebar);
if (closeSidebar) closeSidebar.addEventListener("click", window.toggleSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener("click", window.toggleSidebar);

document.querySelectorAll(".category-tabs button").forEach((tab) => {
  tab.addEventListener("click", () => {
    const activeTab = document.querySelector(".category-tabs .active");
    if (activeTab) activeTab.classList.remove("active");
    tab.classList.add("active");
    const cat = tab.getAttribute("data-cat");
    const filtered = cat === "all" ? allSongs : allSongs.filter((s) => s.category === cat);
    renderPlaylist(filtered);
  });
});

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allSongs.filter((s) => s.title.toLowerCase().includes(query) || s.artist.toLowerCase().includes(query));
    renderPlaylist(filtered);
  });
}

// ================= 5. RBAC & UPLOAD =================
async function checkAdminAccess() {
  const adminPanelBtn = document.getElementById("adminPanelBtn");
  if (!adminPanelBtn) return;
  adminPanelBtn.style.setProperty("display", "none", "important");

  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) return;

  // [FIX EGRESS] Cek Cache
  let profile = JSON.parse(sessionStorage.getItem(`hh_profile_${session.user.id}`));
  if(!profile) {
      const { data } = await _supabase.from("profiles").select("role, username, avatar_url").eq("id", session.user.id).single();
      profile = data;
      if(profile) sessionStorage.setItem(`hh_profile_${session.user.id}`, JSON.stringify(profile));
  }

  if (profile?.role === "admin") {
    adminPanelBtn.style.setProperty("display", "block", "important");
  }
}

const uploadSheet = document.getElementById("uploadSheet");
const uploadOverlay = document.getElementById("uploadOverlay");
const openUploadBtn = document.getElementById("openUploadModal");

window.closeUpload = function () {
  uploadSheet.classList.remove("active");
  setTimeout(() => { uploadOverlay.style.display = "none"; }, 400);
};

if (openUploadBtn) {
  openUploadBtn.addEventListener("click", () => {
    uploadOverlay.style.display = "block";
    setTimeout(() => { uploadSheet.classList.add("active"); }, 10);
  });
}

const CLOUD_NAME = "dhhmkb8kl"; 
const UPLOAD_PRESET = "hopehype_preset"; 

window.handleUploadMusik = async function () {
  const title = document.getElementById("upTitle").value;
  const audioFile = document.getElementById("upAudioFile").files[0];
  const coverFile = document.getElementById("upCoverFile").files[0];
  const status = document.getElementById("uploadStatus");

  if (!title || !audioFile || !coverFile) {
    status.innerText = "Lengkapi judul lagu, file audio, dan cover dulu bro!";
    return;
  }

  try {
    status.innerText = "Sedang mengupload... ☁️";
    document.getElementById("btnUpload").disabled = true;

    const { data: { user }, error: authErr } = await _supabase.auth.getUser();
    if (authErr || !user) throw new Error("Kamu harus login dulu!");

    // [FIX EGRESS] Ambil username dari cache
    let profile = JSON.parse(sessionStorage.getItem(`hh_profile_${user.id}`));
    if(!profile) {
        const { data } = await _supabase.from("profiles").select("username").eq("id", user.id).single();
        profile = data;
    }
    const artistName = profile?.username || "Unknown";

    const uploadFile = async (file) => {
      const formData = new FormData();
      formData.append("file", file); formData.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      return data.secure_url;
    };

    const audioUrl = await uploadFile(audioFile);
    const coverUrl = await uploadFile(coverFile);

    const { error } = await _supabase.from("songs").insert({
      title: title, artist: artistName, audio_src: audioUrl, cover_url: coverUrl,
    });

    if (error) throw error;

    status.innerText = "Berhasil! 🎉";
    setTimeout(() => { closeUpload(); loadMusicLibrary(); }, 1500);
  } catch (err) {
    status.innerText = "Gagal: " + err.message;
  } finally {
    document.getElementById("btnUpload").disabled = false;
  }
};

window.updateAudioName = function (event) {
  const file = event.target.files[0];
  const display = document.getElementById("audioFileName");
  if (file && display) { display.innerText = file.name; display.style.color = "#fff"; }
};

window.previewImage = function (event) {
  const file = event.target.files[0];
  const preview = document.getElementById("imagePreview");
  const container = document.getElementById("previewContainer");
  const fileNameDisplay = document.getElementById("coverFileName");

  if (file) {
    if (fileNameDisplay) { fileNameDisplay.innerText = file.name; fileNameDisplay.style.color = "#fff"; }
    const reader = new FileReader();
    reader.onload = function (e) {
      if (preview && container) { preview.src = e.target.result; container.style.display = "block"; }
    };
    reader.readAsDataURL(file);
  }
};

const originalCloseUpload = window.closeUpload;
window.closeUpload = function () {
  if (typeof originalCloseUpload === "function") originalCloseUpload();
  setTimeout(() => {
    const previewCont = document.getElementById("previewContainer");
    if (previewCont) previewCont.style.display = "none";
    const imgPrev = document.getElementById("imagePreview");
    if (imgPrev) imgPrev.src = "";
    const fields = ["upTitle", "upArtist", "upAudioFile", "upCoverFile"];
    fields.forEach((id) => { const el = document.getElementById(id); if (el) el.value = ""; });
    const audioLabel = document.getElementById("audioFileName");
    if (audioLabel) { audioLabel.innerText = "Pilih lagu favoritmu..."; audioLabel.style.color = "#888"; }
    const coverLabel = document.getElementById("coverFileName");
    if (coverLabel) { coverLabel.innerText = "Pilih cover yang keren..."; coverLabel.style.color = "#888"; }
    const status = document.getElementById("uploadStatus");
    if (status) status.innerText = "";
  }, 400);
};

async function initApp() {
  await loadMusicLibrary();
  await checkAdminAccess();
  _supabase.auth.onAuthStateChange(() => checkAdminAccess());
}

initApp();

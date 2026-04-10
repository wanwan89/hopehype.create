let activeSongId = null;
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ================= YOUTUBE API SETUP =================
let ytPlayer;
let isYTReady = false;
const YOUTUBE_API_KEY = "AIzaSyBoh5i7piZl5mFqXM0XBpCzO_Qtu_TG-kQ";

window.onYouTubeIframeAPIReady = function() {
  ytPlayer = new YT.Player('yt-player-hidden', {
    height: '300', width: '300',
    videoId: 'dQw4w9WgXcQ', // Dummy video standby
    playerVars: { 
      'playsinline': 1, 
      'controls': 0
    },
    events: {
      'onReady': () => { 
        isYTReady = true;
        console.log("✅ Mesin YouTube SUDAH SIAP!"); 
      },
      'onStateChange': (event) => {
        if (event.data === YT.PlayerState.ENDED) {
          currentSongIndex++;
          if (currentSongIndex < currentSongsList.length) playSong(currentSongsList[currentSongIndex]);
          else { currentSongIndex = 0; playSong(currentSongsList[0]); }
        }
      }
    }
  });
};

// SUNTIK SCRIPT MANUAL BIAR TIMING PAS!
if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0] || document.head;
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// ... lanjut kode lu ...


// ================= BADGE SYSTEM =================
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
  console.log("1. Memulai loadMusicLibrary...");
  const { data: { user } } = await _supabase.auth.getUser();

  console.log("2. Mengambil data dari Supabase...");
  const { data, error } = await _supabase
    .from("songs")
    .select(`id, title, artist, cover_url, audio_src, created_at, play_count, status, category, comments(count), likes(count), user_liked:likes(user_id)`)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const userId = user?.id;
  const localSongs = data ? data.map((song) => {
    const userLikedIt = song.user_liked ? song.user_liked.some(l => l.user_id === userId) : false;
    return {
      ...song, source: 'local', comment_count: song.comments?.[0]?.count || 0,
      like_count: song.likes?.[0]?.count || 0, is_liked: userLikedIt
    };
  }) : [];

  console.log("3. Lagu lokal dapet:", localSongs.length);
  allSongs = [...localSongs];
  renderPlaylist(allSongs);

  console.log("4. Mencoba tembak YouTube API...");
  try {
    // ID PLAYLIST POP INDO HITS TERBARU (PASTI ADA)
    // GANTI JADI INI:
const MY_PLAYLIST = "PLFcGX84jKOu7DYhWdfpOfgDcEyRzTXFE9";

    // Kita buat URL-nya pake URLSearchParams biar gak ada typo spasi atau karakter aneh
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId: MY_PLAYLIST,
      maxResults: '50',
      key: YOUTUBE_API_KEY
    });

    const ytApiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`;

    const res = await fetch(ytApiUrl);
    console.log("5. Respon YouTube dapet, status:", res.status);
    
    const json = await res.json();
    
    if (json.items) {
      console.log("6. Berhasil dapet", json.items.length, "lagu dari YouTube");
      const apiSongs = json.items
        .filter(item => item.snippet.title !== "Private video" && item.snippet.title !== "Deleted video")
        .map((item) => {
          let cleanTitle = item.snippet.title.replace(/\[.*?\]|\(.*?\)|Official|Video|Music|Audio|Lyrics|Lirik/gi, '').trim();
          let channelName = item.snippet.videoOwnerChannelTitle ? item.snippet.videoOwnerChannelTitle.replace(' - Topic', '').replace('VEVO', '') : 'Unknown Artist';

          return {
            id: `yt-${item.snippet.resourceId.videoId}`,
            title: cleanTitle,
            artist: channelName,
            cover_url: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || 'asets/png/music.png',
            audio_src: '', 
            source: 'youtube',
            play_count: Math.floor(Math.random() * 5000), 
            like_count: 0, comment_count: 0, is_liked: false, category: 'hits'
          };
        });

      allSongs = [...localSongs, ...apiSongs];
      renderPlaylist(allSongs);
      console.log("7. ✅ SELESAI: Playlist Hybrid Rendered!");
    } else {
      console.error("⚠️ YouTube balikin data kosong. Cek pesan error ini:", json.error?.message);
    }
  } catch (err) {
    console.error("❌ Error fetch YouTube:", err);
  }
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

    // --- LOGIKA HYBRID BADGE ---
    const isApi = String(song.id).startsWith("api-") || song.source === 'youtube';
    const badgeHtml = isApi 
      ? `<span style="position:absolute; top:8px; left:8px; background:rgba(0, 210, 255, 0.9); color:white; font-size:9px; padding:2px 6px; border-radius:4px; font-weight:bold; z-index:10; backdrop-filter:blur(4px);">HITS</span>`
      : `<span style="position:absolute; top:8px; left:8px; background:rgba(255, 71, 87, 0.9); color:white; font-size:9px; padding:2px 6px; border-radius:4px; font-weight:bold; z-index:10; backdrop-filter:blur(4px);">HYPE</span>`;

    const isLiked = song.is_liked;
    const heartIcon = isLiked ? "favorite" : "favorite_border";
    const activeClass = isLiked ? "is-liked" : "";

    const plays = (song.play_count || 0).toLocaleString("id-ID");
    const likes = (song.like_count || 0).toLocaleString("id-ID");
    const comments = (song.comment_count || 0).toLocaleString("id-ID");

    const interactionHtml = isApi 
      ? `<div style="font-size:10px; color:#666; font-style:italic; margin-left:auto;">Official Music</div>`
      : `
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
      `;

    // 2. Pasang Lazy Loading di Tag IMG
card.innerHTML = `
    <div class="card-cover-wrapper" style="position:relative;">
        ${badgeHtml}
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
                ${interactionHtml}
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
};

// ================= 2. PLAYER LOGIC =================
let playTimer = null;

async function playSong(song) {
  if (!miniPlayer || !audio) return;

  // Reset timer hitung putar lagu lama
  if (playTimer) {
    clearTimeout(playTimer);
    playTimer = null;
  }

  // Munculin bar kontrol di bawah
  miniPlayer.style.display = "flex";

  // 1. MATIKAN AUDIO LOKAL (BIAR GAK TABRAKAN)
  audio.pause();

  // 🔥 [PENTING] UNLOCK MESIN YOUTUBE DI MOBILE 🔥
  // Kita pancing perintah play & pause sekejap saat stack klik user masih aktif.
  // Ini kunci biar browser HP ngijinin audio YouTube keluar.
  if (isYTReady && ytPlayer) {
    ytPlayer.playVideo();
    ytPlayer.pauseVideo();
    if (typeof ytPlayer.unMute === 'function') ytPlayer.unMute();
    if (typeof ytPlayer.setVolume === 'function') ytPlayer.setVolume(100);
  }

  // 2. LOGIKA PEMILIHAN PLAYER (HYBRID)
  if (song.source === 'api') {
    if (miniTitle) miniTitle.textContent = "Mencari lagu...";
    
    const query = encodeURIComponent(`${song.title} ${song.artist} official audio`);
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}&maxResults=1`;

    try {
      const res = await fetch(apiUrl);
      const data = await res.json();
      
      if (data.items && data.items.length > 0) {
        const videoId = data.items[0].id.videoId;
        if (isYTReady && ytPlayer) {
          // ✅ Pake format objek biar lebih stabil di Android/iOS
          ytPlayer.loadVideoById({
            videoId: videoId,
            startSeconds: 0
          });
          
          // Kasih jeda 600ms nunggu buffering awal, baru paksa PLAY
          setTimeout(() => {
            ytPlayer.playVideo();
            if (playBtn) playBtn.textContent = "pause";
          }, 600);
          console.log("✅ Memutar dari YouTube API:", videoId);
        }
      } else {
        throw new Error("Video Gak Ketemu");
      }
    } catch (e) {
      console.error("YouTube API Gagal, balik ke audio lokal:", e.message);
      audio.src = song.audio_src;
      audio.play();
    }
  } 
  else if (song.source === 'youtube') {
    const ytId = String(song.id).replace('yt-', '');
    if (isYTReady && ytPlayer) { 
      ytPlayer.loadVideoById(ytId); 
      // Delay dikit buat handshake mobile
      setTimeout(() => ytPlayer.playVideo(), 300);
    }
  } 
  else {
    // LAGU LOKAL (DARI SUPABASE)
    audio.src = song.audio_src.startsWith("http") ? song.audio_src : `songs/${song.audio_src}`;
    audio.play().catch(err => console.log("Autoplay di-block browser:", err));
  }

  // 3. TIMER HITUNG JUMLAH PUTAR (60 DETIK)
  playTimer = setTimeout(async () => {
    const isPlayingAudio = !audio.paused;
    const isPlayingYT = isYTReady && ytPlayer && ytPlayer.getPlayerState && ytPlayer.getPlayerState() === 1;
    
    if ((isPlayingAudio || isPlayingYT) && currentSongsList[currentSongIndex]?.id === song.id) {
      if (song.source === 'local') {
        await updatePlayCount(song.id);
      }
    }
  }, 60000);

  // 4. UPDATE TAMPILAN MINI PLAYER & TOMBOL
  if (miniCover) miniCover.src = song.cover_url;
  if (miniTitle) miniTitle.textContent = song.title;
  if (miniArtist) miniArtist.textContent = song.artist;
  if (playBtn) playBtn.textContent = "pause"; 

  // 5. MEDIA SESSION (BIAR BISA DIKONTROL DARI NOTIFIKASI HP)
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      artwork: [
        { src: song.cover_url, sizes: '512x512', type: 'image/png' }
      ]
    });

    navigator.mediaSession.setActionHandler('play', () => {
      if (song.source === 'youtube' || song.source === 'api') ytPlayer.playVideo();
      else audio.play();
      if (playBtn) playBtn.textContent = "pause";
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      if (song.source === 'youtube' || song.source === 'api') ytPlayer.pauseVideo();
      else audio.pause();
      if (playBtn) playBtn.textContent = "play_arrow";
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => { window.skipNext(); });
    navigator.mediaSession.setActionHandler('previoustrack', () => { window.skipPrevious(); });
  }

  // 6. UPDATE VISUAL BACKGROUND & BORDER
  document.body.style.background = `linear-gradient(to bottom, rgba(13, 17, 23, 0.9), #0d1117), url('${song.cover_url}') center/cover no-repeat`;

  document.querySelectorAll(".playlist-card").forEach((card, idx) => {
    card.style.borderColor = idx === currentSongIndex ? "#1f3cff" : "#30363d";
  });
}

window.skipNext = function() {
  currentSongIndex++;
  if (currentSongIndex >= currentSongsList.length) currentSongIndex = 0;
  playSong(currentSongsList[currentSongIndex]);
};

window.skipPrevious = function() {
  currentSongIndex--;
  if (currentSongIndex < 0) currentSongIndex = currentSongsList.length - 1;
  playSong(currentSongsList[currentSongIndex]);
};

// ================= EVENT LISTENER AUDIO LOKAL =================
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
  // (timeupdate dihapus dari sini, diganti setInterval di bawah)
}

// ================= TOMBOL PLAY/PAUSE HYBRID =================
if (playBtn) {
  playBtn.addEventListener("click", () => {
    const song = currentSongsList[currentSongIndex];
    
    // Jika lagu berasal dari API atau YouTube, kontrol YouTube Player
    if (song?.source === 'api' || song?.source === 'youtube') {
      if (isYTReady && ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
        const state = ytPlayer.getPlayerState();
        if (state === 1) { // 1 = Playing
          ytPlayer.pauseVideo();
          playBtn.textContent = "play_arrow";
        } else {
          ytPlayer.playVideo();
          playBtn.textContent = "pause";
        }
      }
    } else {
      // Jika lagu lokal, kontrol HTML5 Audio
      if (audio.paused) {
        audio.play();
        playBtn.textContent = "pause";
      } else {
        audio.pause();
        playBtn.textContent = "play_arrow";
      }
    }
  });
}

function formatTime(time) {
  const min = Math.floor(time / 60);
  const sec = Math.floor(time % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// ================= PROGRESS BAR HYBRID (JALAN OTOMATIS) =================
setInterval(() => {
  const song = currentSongsList[currentSongIndex];
  if (!song || !progress) return;

  let currentTime = 0;
  let duration = 0;

  // Cek apakah yang lagi muter YouTube atau Lokal
  if ((song.source === 'api' || song.source === 'youtube') && isYTReady && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
    currentTime = ytPlayer.getCurrentTime() || 0;
    duration = ytPlayer.getDuration() || 0;
  } else {
    currentTime = audio.currentTime || 0;
    duration = audio.duration || 0;
  }

  // Update garis UI-nya
  if (duration > 0) {
    const percent = (currentTime / duration) * 100;
    progress.style.width = `${percent}%`;
    
    if (typeof currentTimeEl !== 'undefined' && currentTimeEl) currentTimeEl.textContent = formatTime(currentTime);
    if (typeof durationEl !== 'undefined' && durationEl) durationEl.textContent = formatTime(duration);
  }
}, 500); // Cek dan geser garis setiap setengah detik

// ================= KLIK PROGRESS BAR BUAT CEPETIN/MUNDURIN =================
if (progressContainer) {
  progressContainer.addEventListener("click", (e) => {
    const song = currentSongsList[currentSongIndex];
    if (!song) return;
    
    // Hitung posisi klik lu di layar (dalam persen)
    const percent = e.offsetX / progressContainer.clientWidth;

    if (song.source === 'api' || song.source === 'youtube') {
      if (isYTReady && ytPlayer && typeof ytPlayer.getDuration === 'function') {
        const newTime = percent * ytPlayer.getDuration();
        ytPlayer.seekTo(newTime, true); // Suruh YouTube loncat ke detik itu
      }
    } else {
      if (audio.duration) {
        audio.currentTime = percent * audio.duration; // Suruh Audio lokal loncat
      }
    }
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
// Tambahin ini di paling bawah music.js
window.showSection = function(sectionId) {
  // Sembunyiin semua section utama (misal .playlist-grid dan header)
  // TAPI JANGAN sembunyiin #miniPlayer dan #yt-player-hidden
  const grid = document.getElementById("playlistGrid");
  const header = document.querySelector(".header-container");
  
  if (sectionId === 'home') {
    grid.style.display = 'grid';
    header.style.display = 'block';
    // Sembunyiin halaman lain kalau lo punya (misal profile/upload)
  } else {
    grid.style.display = 'none';
    header.style.display = 'none';
    // Tampilkan sectionId yang lain
  }
  
  console.log("Pindah ke halaman:", sectionId);
};


async function initApp() {
  await loadMusicLibrary();
  await checkAdminAccess();
  _supabase.auth.onAuthStateChange(() => checkAdminAccess());
}

initApp();


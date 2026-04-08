

// ===== [VOICE.JS - THE REAL FULL COMPLETE FIX 100%] =====

// 1. PARAMETER URL & GLOBAL STATE
const urlParams = new URLSearchParams(window.location.search);
const CURRENT_ROOM_ID = urlParams.get('id'); 
const CURRENT_ROOM_NAME = urlParams.get('name') || "Voice Room";

let IS_OWNER = false; 
let myRole = "user"; 
let myUsername = "Guest";
let MY_USER_ID = null;
let selectedTargetId = null; 
let selectedTargetName = "";

// STATE BARU UNTUK LEVELING
let myTotalGiftSent = 0; 
let myLevel = 1;

// 🔥 STATE UNTUK COMBO CHAT (ANTI-SPAM) 🔥
let isInsertingGift = false; 
let localChatCombo = 0;
let lastComboMsgId = null;
let lastGiftSentName = "";
let comboTimeout = null;


document.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.querySelector('.room-title');
    if (titleEl) titleEl.innerText = CURRENT_ROOM_NAME.toUpperCase();
});

// --- UI HELPERS & BADGES ---
function getLevelStyle(level) {
    const lvl = parseInt(level) || 1;
    if (lvl >= 5) return { color: "#FF0055", textShadow: "0 0 8px rgba(255, 0, 85, 0.8)", title: "LGDN" };
    if (lvl === 4) return { color: "#00E5FF", textShadow: "0 0 5px rgba(0, 229, 255, 0.7)", title: "SLTN" };
    if (lvl === 3) return { color: "#BB86FC", textShadow: "none", title: "PATRON" };
    if (lvl === 2) return { color: "#FFD700", textShadow: "none", title: "SPTR" };
    return { color: "inherit", textShadow: "none", title: "" };
}

function getLevelBadgeHTML(level) {
    const style = getLevelStyle(level);
    if (!style.title) return ""; 
    return `<span style="font-size: 9px; font-weight: 800; background: ${style.color}; color: #000; padding: 2px 4px; border-radius: 3px; margin-left: 5px; vertical-align: middle;">${style.title}</span>`;
}

function getUserBadge(role) {
  if (!role) return "";
  let badge = "";
  const r = role.toLowerCase();
  if (r === "admin") badge += `<span class="admin-badge" style="background: #ff4757; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 5px; font-weight: bold; height: 16px; display: inline-flex; align-items: center; vertical-align: middle;">DEV</span>`;
  if (r === "verified") badge += `<span class="verified-badge" style="margin-left:5px; vertical-align:middle;"><svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1DA1F2"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  const crowBadges = { crown1: "asets/png/crown1.png", crown2: "asets/png/crown2.png", crown3: "asets/png/crown3.png" };
  if (crowBadges[r]) badge += `<img src="${crowBadges[r]}" style="width:18px;height:18px;margin-left:5px;vertical-align:middle;object-fit:contain;display:inline-block;" alt="${r}">`;
  return badge;
}

// FUNGSI: Efek Masuk Room VIP (SULTAN & LEGEND)
function playVIPEntrance(username, level) {
    if (level < 4) return; 

    if (!document.getElementById('vip-anim-styles-clean')) {
        const style = document.createElement('style');
        style.id = 'vip-anim-styles-clean';
        style.innerHTML = `
            @keyframes vipSlideInClean {
                0% { transform: translate(-150vw, -50%); opacity: 0; }
                15% { transform: translate(-50%, -50%); opacity: 1; }
                85% { transform: translate(-50%, -50%); opacity: 1; } 
                100% { transform: translate(150vw, -50%); opacity: 0; }
            }
            @keyframes vipShineClean {
                0% { left: -100%; }
                20% { left: 100%; }
                100% { left: 100%; }
            }
            .vip-banner-clean {
                position: fixed;
                top: 60%; 
                left: 50%;
                z-index: 1000000;
                padding: 12px 28px;
                border-radius: 12px; 
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                overflow: hidden;
                pointer-events: none;
                width: max-content;
                max-width: 90%;
                animation: vipSlideInClean 4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            }
            .vip-shine-clean {
                position: absolute;
                top: 0; left: -100%;
                width: 50%; height: 100%;
                background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
                transform: skewX(-20deg);
                animation: vipShineClean 2s infinite ease-in-out;
            }
        `;
        document.head.appendChild(style);
    }

    let overlay = document.getElementById('vip-entrance-overlay');
    if (overlay) overlay.remove(); 

    overlay = document.createElement('div');
    overlay.id = 'vip-entrance-overlay';
    overlay.className = 'vip-banner-clean';
    
    let bgStyle, textHTML;

    if (level === 4) { 
        bgStyle = "background: rgba(14, 165, 233, 0.95); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 25px rgba(14, 165, 233, 0.4); backdrop-filter: blur(10px);";
        textHTML = `<span style="color:#fff; font-size: 13px; font-weight: 600; letter-spacing: 1px;">SULTAN</span> <b style="color:#fff; font-size: 15px; font-weight: 800; text-transform: uppercase; margin: 0 4px;">${username}</b> <span style="color:#fff; font-size: 13px; font-weight: 600;">MEMASUKI ROOM</span>`;
    } else if (level >= 5) { 
        bgStyle = "background: rgba(225, 29, 72, 0.95); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 25px rgba(225, 29, 72, 0.4); backdrop-filter: blur(10px);";
        textHTML = `<span style="color:#fff; font-size: 13px; font-weight: 600; letter-spacing: 1px;">LEGEND</span> <b style="color:#fff; font-size: 15px; font-weight: 800; text-transform: uppercase; margin: 0 4px;">${username}</b> <span style="color:#fff; font-size: 13px; font-weight: 600;">MEMASUKI ROOM</span>`;
    }

    overlay.style.cssText += bgStyle;
    overlay.innerHTML = `<div class="vip-shine-clean"></div><div style="display: flex; align-items: center;">${textHTML}</div>`;
    document.body.appendChild(overlay);

    setTimeout(() => { if (overlay) overlay.remove(); }, 4100);
}

// 2. KONFIGURASI SUPABASE
const supabaseUrl = 'https://hqetnqnvmdxdgfnnluew.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA';
const sb = supabase.createClient(supabaseUrl, supabaseKey);

async function getCachedProfile(userId) {
  const key = `hh_profile_${userId}`;
  const cachedData = sessionStorage.getItem(key);
  if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      if (parsedData.level !== undefined && parsedData.total_gift_sent !== undefined) return parsedData; 
  }
  const { data } = await sb.from('profiles').select('username, avatar_url, role, coins, total_gift_sent, level').eq('id', userId).single();
  if (data) {
      sessionStorage.setItem(key, JSON.stringify(data));
      return data;
  }
  return null;
}

// 3. KONFIGURASI LIVEKIT
const LIVEKIT_URL = "wss://voicegrup-zxmeibkn.livekit.cloud"; 
let room;

async function initApp() {
    const canEnter = await checkUser(); 
    if (!canEnter) return; 
    initLiveKit(); 
    listenRealtime(); 
}

async function initLiveKit() {
    if (typeof LivekitClient === 'undefined') return console.error("SDK LiveKit Hilang!");
    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/get-livekit-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
            body: JSON.stringify({ username: myUsername, identity: MY_USER_ID })
        });
        const data = await response.json();
        room = new LivekitClient.Room({ adaptiveStream: true, dynacast: true });
        
        room.on(LivekitClient.RoomEvent.ActiveSpeakersChanged, (speakers) => {
            document.querySelectorAll('.avatar').forEach(el => el.classList.remove('speaking'));
            speakers.forEach((s) => {
                let el = document.querySelector(`[data-user-id="${s.identity}"]`);
                if (!el && s.isLocal) el = document.querySelector(`[data-user-id="${MY_USER_ID}"]`);
                if (el) el.classList.add('speaking');
            });
        });

        room.on(LivekitClient.RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === "audio") {
                const element = track.attach();
                document.body.appendChild(element);
                element.play().catch(() => {});
            }
        });

        await room.connect(LIVEKIT_URL, data.token);
        await room.localParticipant.setMicrophoneEnabled(false);
    } catch (e) { console.error("LiveKit Error:", e.message); }
}

// 4. LOGIKA PANGGUNG
async function fetchStage() {
    if (!CURRENT_ROOM_ID || CURRENT_ROOM_ID === "null") return;
    let { data: slots } = await sb.from('room_slots').select(`slot_index, profile_id, profiles (username, avatar_url, role, mic_off, level)`).eq('room_id', CURRENT_ROOM_ID).order('slot_index', { ascending: true });
    
    if (!slots || slots.length === 0) {
        const newSlots = Array.from({length: 6}, (_, i) => ({ room_id: CURRENT_ROOM_ID, slot_index: i, profile_id: null }));
        await sb.from('room_slots').insert(newSlots);
        return renderStage(newSlots); 
    }
    renderStage(slots);
}

function renderStage(slots) {
    const grid = document.getElementById('stage-grid');
    if (!grid) return;
    grid.innerHTML = "";
    slots.forEach((slot, i) => {
        const user = slot.profiles;
        const isMe = slot.profile_id === MY_USER_ID;
        const item = document.createElement('div');
        item.className = 'speaker-item';
        
        if (user) {
            const lvlStyle = getLevelStyle(user.level || 1);
            const lvlBadge = getLevelBadgeHTML(user.level || 1);
            item.innerHTML = `
                <div class="avatar ${isMe ? 'active' : ''}" data-user-id="${slot.profile_id}" onclick="${isMe ? `turunMic(${i})` : `toggleKickBtn(this, ${IS_OWNER && !isMe})`}">
                    <img src="${user.avatar_url || 'asets/png/profile.png'}">
                    <div class="mute-badge" style="display: ${user.mic_off ? 'flex' : 'none'}; position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.7); border-radius: 50%; width: 22px; height: 22px; align-items: center; justify-content: center; border: 2px solid white; z-index: 10;">
                        <span class="material-icons" style="color: #e74c3c; font-size: 14px;">mic_off</span>
                    </div>
                    ${(IS_OWNER && !isMe) ? `<div class="kick-btn-wrapper" style="display:none;"><div class="kick-btn" onclick="event.stopPropagation(); kickUser('${slot.profile_id}', '${user.username}')"><span class="material-icons">close</span></div></div>` : ''}
                </div>
                <span class="name-label" style="color: ${lvlStyle.color}; text-shadow: ${lvlStyle.textShadow};">${user.username}${lvlBadge}${getUserBadge(user.role)}</span>`;
        } else {
            item.innerHTML = `<div class="avatar" onclick="naikKeStage(${i})"><span class="material-icons" style="color: #444; font-size: 30px;">add</span></div><span class="name-label">KOSONG</span>`;
        }
        grid.appendChild(item);
    });
}

// 5. ANIMASI GIFT COMBO
let giftComboCount = 0;
let lastGiftId = null;
let giftAnimTimer = null;

function playGiftAnimation(giftId) {
    const id = giftId || 1;
    const gifPath = `asets/gif/giftvid${id}.gif`; 
    
    if (lastGiftId === id) {
        giftComboCount++;
    } else {
        giftComboCount = 1;
        lastGiftId = id;
    }

    let overlay = document.getElementById('gift-anim-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'gift-anim-overlay';
        overlay.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:9999999; display:none; justify-content:center; align-items:center; background:rgba(0,0,0,0.2); opacity:0; transition:opacity 0.3s;";
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; position:relative;">
            <img id="gift-anim-img" src="${gifPath}?t=${Date.now()}" 
                 style="width:280px; max-width:85%; object-fit:contain; filter:drop-shadow(0 0 20px gold);">
            <div id="gift-combo-text" 
                 style="font-family:'Inter',sans-serif; font-size:80px; font-weight:900; color:#ffeb3b; 
                        text-shadow:4px 4px 0px #f44336, 0 0 20px rgba(255,255,0,0.8); 
                        transform:rotate(-15deg) scale(0); transition:transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
                        margin-top:-60px; z-index:100;">
            </div>
        </div>`;

    const comboEl = document.getElementById('gift-combo-text');
    overlay.style.display = 'flex';
    setTimeout(() => { overlay.style.opacity = '1'; }, 10);

    if (giftComboCount > 1) {
        comboEl.innerText = "x" + giftComboCount;
        setTimeout(() => { comboEl.style.transform = "rotate(-15deg) scale(1.2)"; }, 50);
    }

    if (giftAnimTimer) clearTimeout(giftAnimTimer);
    giftAnimTimer = setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => { 
            overlay.style.display = 'none'; 
            giftComboCount = 0; 
            lastGiftId = null;
        }, 300);
    }, 3000); 
}

function listenRealtime() {
    if (!CURRENT_ROOM_ID || !MY_USER_ID) return;
    const roomChannel = sb.channel(`room_active_${CURRENT_ROOM_ID}`, { config: { presence: { key: MY_USER_ID } } });

    roomChannel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, () => { fetchStage(); })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => { fetchStage(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, (p) => {
        const chatBox = document.getElementById('chat-box');
        if (!chatBox) return;

        if (p.eventType === 'UPDATE') {
            const oldMsg = document.getElementById(`msg-${p.old.id}`);
            if (oldMsg) oldMsg.remove();
        }

        const isGift = p.new.username === "SISTEM_GIFT";
        const isDariSaya = isGift && p.new.text.includes(myUsername);
        const div = document.createElement('div'); 
        div.id = `msg-${p.new.id}`;
        
        if (isGift) {
            div.className = 'msg system-gift'; 
            div.innerHTML = `<span>🎁 ${p.new.text}</span>`;
            if (!isDariSaya) playGiftAnimation(parseInt(p.new.role));
        } else {
            const isSystem = p.new.username.startsWith("SISTEM");
            div.className = isSystem ? 'msg system' : 'msg';
            const style = getLevelStyle(p.new.level || 1);
            div.innerHTML = isSystem ? `<span>${p.new.text}</span>` : `<span style="color:${style.color}; font-weight:bold;">${p.new.username}:</span> <span>${p.new.text}</span>`;
        }
        chatBox.appendChild(div); 
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    })
    .on('presence', { event: 'sync' }, () => {
        const countEl = document.getElementById('online-count');
        if (countEl) countEl.innerText = Object.keys(roomChannel.presenceState()).length;
    })
    .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach(p => { if (p.key !== MY_USER_ID && p.level >= 4) playVIPEntrance(p.username, p.level); });
    })
    .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await roomChannel.track({ online_at: new Date().toISOString(), username: myUsername, level: myLevel });
    });
}

// 7. LEVELING LOGIC
const LEVEL_THRESHOLDS = { 1: 0, 2: 1000, 3: 5000, 4: 20000, 5: 50000 };

function checkLevelUp(totalGiftSent) {
    if (totalGiftSent >= LEVEL_THRESHOLDS[5]) return { level: 5, name: "LEGEND", color: "#FF0055" };
    if (totalGiftSent >= LEVEL_THRESHOLDS[4]) return { level: 4, name: "SULTAN", color: "#00E5FF" };
    if (totalGiftSent >= LEVEL_THRESHOLDS[3]) return { level: 3, name: "PATRON", color: "#BB86FC" };
    if (totalGiftSent >= LEVEL_THRESHOLDS[2]) return { level: 2, name: "SUPPORTER", color: "#FFD700" };
    return { level: 1, name: "NEWBIE", color: "#FFFFFF" };
}

function updateLevelProgressUI() {
    const container = document.getElementById('level-progress-container');
    if (!container) return; 
    let prevTarget = 0, currentTarget = 0, currentName = "";
    if (myLevel === 1) { prevTarget = 0; currentTarget = 1000; currentName = "NEWBIE"; }
    else if (myLevel === 2) { prevTarget = 1000; currentTarget = 5000; currentName = "SUPPORTER"; }
    else if (myLevel === 3) { prevTarget = 5000; currentTarget = 20000; currentName = "PATRON"; }
    else if (myLevel === 4) { prevTarget = 20000; currentTarget = 50000; currentName = "SULTAN"; }
    else { container.innerHTML = `<div style="text-align:center; font-size: 13px; color: #FF0055; font-weight: bold; margin: 15px 0;">LEVEL MAX (LEGEND)</div>`; return; }
    let needed = currentTarget - myTotalGiftSent;
    let percent = ((myTotalGiftSent - prevTarget) / (currentTarget - prevTarget)) * 100;
    if (percent > 100) percent = 100;
    container.innerHTML = `<div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa; margin-bottom: 6px; padding: 0 5px;"><span>LVL ${myLevel} (${currentName})</span><span>Butuh <b style="color:#f1c40f">${needed} koin</b> lagi</span></div><div style="width: 100%; height: 6px; background: #333; border-radius: 4px; overflow: hidden;"><div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, #00ff88, #00d2ff); transition: width 0.5s ease-out;"></div></div>`;
}

async function sendGift(giftName, harga, giftId) {
    if (!selectedTargetId) return alert("Pilih target!");
    
    // --- 1. OPTIMISTIC UI (Koin langsung berkurang di HP lu) ---
    const coinDisplay = document.getElementById('user-coins');
    let saldoSkrg = parseInt(coinDisplay.innerText.replace(/[,.]/g, ''));
    let hargaGift = parseInt(harga); 

    if (saldoSkrg < hargaGift) return alert("Koin kurang!");
    
    const saldoBaru = saldoSkrg - hargaGift;
    coinDisplay.innerText = saldoBaru.toLocaleString();

    // --- 2. LOGIKA COMBO LOKAL ---
    if (lastGiftSentName === giftName) {
        localChatCombo++;
    } else {
        localChatCombo = 1;
        lastGiftSentName = giftName;
        lastComboMsgId = null; // Reset ID jika ganti jenis gift
    }

    // Timer reset: Jika 5 detik ga klik, combo dianggap selesai
    if (comboTimeout) clearTimeout(comboTimeout);
    comboTimeout = setTimeout(() => {
        localChatCombo = 0;
        lastComboMsgId = null;
        lastGiftSentName = "";
    }, 5000);

    // --- 3. LOCKING SYSTEM (Mencegah baris x1 berderet saat spam) ---
    while (isInsertingGift) {
        await new Promise(r => setTimeout(r, 50)); // Tunggu 50ms per antrean
    }

    try {
        let newTotalGift = myTotalGiftSent + hargaGift;
        let levelData = checkLevelUp(newTotalGift);
        let oldLevel = myLevel;
        
        // Update database profil (Koin & Progres Level)
        await sb.from('profiles').update({ 
            coins: saldoBaru,
            total_gift_sent: newTotalGift,
            level: levelData.level
        }).eq('id', MY_USER_ID);

        myTotalGiftSent = newTotalGift; 
        myLevel = levelData.level;
        if (typeof updateLevelProgressUI === "function") updateLevelProgressUI(); 

        const teksBasis = `${myUsername} mengirim ${giftName}`;

        // --- 4. DATABASE CHAT LOGIC ---
        if (lastComboMsgId) {
            // Jika ID sudah ada, lu tinggal UPDATE teksnya (x2, x3, dst)
            await sb.from('room_messages')
                .update({ 
                    text: `${teksBasis} x${localChatCombo} ke ${selectedTargetName}`,
                    created_at: new Date().toISOString() // Biar naik ke urutan chat terbaru
                })
                .eq('id', lastComboMsgId);
        } else {
            // Jika klik pertama, lu INSERT baris baru dan KUNCI antrean
            isInsertingGift = true;
            const { data, error } = await sb.from('room_messages').insert([{ 
                room_id: CURRENT_ROOM_ID, 
                username: "SISTEM_GIFT", 
                text: `${teksBasis} x1 ke ${selectedTargetName}`, 
                role: giftId.toString(), 
                level: myLevel 
            }]).select();

            if (data && data.length > 0) {
                lastComboMsgId = data[0].id; // Simpan ID-nya buat dipake klik berikutnya
            }
            isInsertingGift = false; // Buka kunci antrean
        }

        // Notifikasi Level Up (Opsional)
        if (myLevel > oldLevel) {
            await sb.from('room_messages').insert([{ 
                room_id: CURRENT_ROOM_ID, 
                username: "SISTEM", 
                text: `⭐ SELAMAT! ${myUsername} naik ke Level ${myLevel}!`, 
                role: "admin" 
            }]);
        }

        // Jalankan Animasi
        if (typeof playGiftAnimation === "function") playGiftAnimation(giftId);

    } catch (e) { 
        isInsertingGift = false; // Pastikan kunci dibuka kalo error
        console.error("Error sistem gift:", e.message); 
    }
}

// 8. UI INTERAKSI LAINNYA
async function kirimKomentar() {
    try {
        const inputEl = document.getElementById('chat-input');
        const text = inputEl.value.trim();
        if (!text) return; 
        await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: myUsername, text: text, role: myRole, level: myLevel }]);
        inputEl.value = ""; 
    } catch (err) { console.error(err); }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

async function toggleMicSidebar() {
    if (!room || !room.localParticipant) return alert("Belum naik panggung!");
    try {
        const isMicOn = room.localParticipant.isMicrophoneEnabled;
        const newStatus = !isMicOn; 
        
        // 1. Matikan Mic di LiveKit
        await room.localParticipant.setMicrophoneEnabled(newStatus);
        
        // 2. Update database agar orang lain bisa lihat icon mic mati
        await sb.from('profiles').update({ mic_off: !newStatus }).eq('id', MY_USER_ID);
        
        // 3. Update UI tombol di sidebar
        const micIcon = document.getElementById('mic-icon');
        const micText = document.getElementById('mic-text');
        
        if (newStatus) { 
            if(micIcon) { micIcon.innerText = "mic"; micIcon.style.color = "#2ecc71"; }
            if(micText) micText.innerText = "Matikan Mic"; 
        } else { 
            if(micIcon) { micIcon.innerText = "mic_off"; micIcon.style.color = "#e74c3c"; }
            if(micText) micText.innerText = "Hidupkan Mic";
        }

        // Panggil fetchStage agar icon mic kamu langsung muncul di layar kamu sendiri
        fetchStage(); 

    } catch (err) { 
        alert("Gagal mengubah status Mic!"); 
    }
}

function toggleGiftDrawer() {
    document.getElementById('gift-drawer').classList.toggle('open');
    document.getElementById('drawer-overlay').classList.toggle('show');
    if (document.getElementById('gift-drawer').classList.contains('open')) {
        updateGiftTargets();
        updateLevelProgressUI(); 
    }
}

async function updateGiftTargets() {
    const targetContainer = document.getElementById('gift-targets');
    if (!targetContainer) return;
    const { data: slots } = await sb.from('room_slots').select(`profile_id, profiles (username, avatar_url)`).eq('room_id', CURRENT_ROOM_ID).not('profile_id', 'is', null);
    targetContainer.innerHTML = "";
    if (!slots || slots.length === 0) return targetContainer.innerHTML = "<span style='font-size:12px; color:#555;'>Panggung kosong</span>";
    slots.forEach((slot, index) => {
        const div = document.createElement('div'); div.className = `target-user ${selectedTargetId === slot.profile_id ? 'selected' : ''}`;
        div.onclick = () => { selectedTargetId = slot.profile_id; selectedTargetName = slot.profiles.username; updateGiftTargets(); };
        div.innerHTML = `<img src="${slot.profiles.avatar_url || 'asets/png/profile.png'}" class="target-avatar"><span class="target-name">${slot.profiles.username}</span>`;
        targetContainer.appendChild(div);
        if (!selectedTargetId && index === 0) { selectedTargetId = slot.profile_id; selectedTargetName = slot.profiles.username; div.classList.add('selected'); }
    });
}

function toggleKickBtn(el, canKick) {
    if (!canKick) return;
    const wrapper = el.querySelector('.kick-btn-wrapper');
    document.querySelectorAll('.kick-btn-wrapper').forEach(w => { if (w !== wrapper) w.style.display = 'none'; });
    if(wrapper) wrapper.style.display = wrapper.style.display === 'none' ? 'flex' : 'none';
}

async function mintaNaik() {
    const { data: allSlots } = await sb.from('room_slots').select('slot_index, profile_id').order('slot_index', { ascending: true });
    const slotKosong = allSlots.find(s => !s.profile_id);
    if (slotKosong) naikKeStage(slotKosong.slot_index); else alert("Panggung penuh!");
}

async function naikKeStage(index) {
    if (!MY_USER_ID) return alert("Login dulu!");
    try {
        const { data: checkSlot } = await sb.from('room_slots').select('profile_id').match({ room_id: CURRENT_ROOM_ID, slot_index: index }).single();
        if (checkSlot && checkSlot.profile_id !== null) return alert("Kursi sudah ada yang menempati!");
        await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID);
        await new Promise(r => setTimeout(r, 300));
        await sb.from('room_slots').update({ profile_id: MY_USER_ID }).match({ room_id: CURRENT_ROOM_ID, slot_index: index });
        if (room && room.state === "connected") await room.localParticipant.setMicrophoneEnabled(true);
    } catch (err) {}
}

function turunMic(index) {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.style.display = 'flex';
}

async function prosesTurunMic() {
    document.getElementById('confirm-modal').style.display = 'none';
    await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID);
    if (room && room.localParticipant) await room.localParticipant.setMicrophoneEnabled(false);
}

async function kickUser(targetId, targetName) {
    if (!confirm(`Kick ${targetName}?`)) return;
    await sb.from('room_slots').update({ profile_id: null }).match({ room_id: CURRENT_ROOM_ID, profile_id: targetId });
    await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: `${targetName} dikeluarkan.` }]);
}

async function keluarRoom() {
    if (IS_OWNER && confirm("Tutup panggung sementara dan keluar?")) {
        await sb.from('room_slots').update({ profile_id: null }).eq('room_id', CURRENT_ROOM_ID);
        await sb.from('rooms').update({ is_active: false }).eq('id', CURRENT_ROOM_ID);
    }
    window.location.href = 'lobby.html';
}

async function openRoomSetting() {
    if (!IS_OWNER) return alert("Hanya Owner!");
    const { data } = await sb.from('rooms').select('name').eq('id', CURRENT_ROOM_ID).single();
    if (data) document.getElementById('edit-room-name').value = data.name;
    toggleSidebar(); 
    document.getElementById('setting-modal').style.display = 'flex';
}

function closeRoomSetting() { document.getElementById('setting-modal').style.display = 'none'; }

async function saveRoomSetting() {
    const newName = document.getElementById('edit-room-name').value;
    const sysMsg = document.getElementById('system-message').value;
    if (!newName) return alert("Nama room tidak boleh kosong!");
    try {
        await sb.from('rooms').update({ name: newName }).eq('id', CURRENT_ROOM_ID);
        if (sysMsg) await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: `PENGUMUMAN: ${sysMsg}`, role: "admin" }]);
        const url = new URL(window.location); url.searchParams.set('name', newName); window.history.pushState({}, '', url); 
        document.querySelector('.room-title').innerText = newName.toUpperCase();
        closeRoomSetting();
    } catch (e) { alert("Gagal simpan: " + e.message); }
}

function fixMobileHeight() { document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`); }
window.addEventListener('resize', fixMobileHeight); fixMobileHeight();

async function checkUser() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return false; }
    MY_USER_ID = session.user.id;
    const myProfile = await getCachedProfile(MY_USER_ID);
    const { data: roomData } = await sb.from('rooms').select('owner_id, is_active').eq('id', CURRENT_ROOM_ID).maybeSingle();
    if (myProfile) {
        myUsername = myProfile.username; 
        myRole = myProfile.role || "user";
        myTotalGiftSent = myProfile.total_gift_sent || 0; 
        myLevel = myProfile.level || 1;
        if (document.getElementById('sidebar-username')) document.getElementById('sidebar-username').innerText = myUsername;
        if (document.getElementById('sidebar-avatar')) document.getElementById('sidebar-avatar').src = myProfile.avatar_url || 'asets/png/profile.png';
        if (document.getElementById('user-coins')) document.getElementById('user-coins').innerText = (myProfile.coins || 0).toLocaleString();
        if (myLevel >= 4) setTimeout(() => playVIPEntrance(myUsername, myLevel), 1500); 
    }
    if (roomData) {
        IS_OWNER = roomData.owner_id === MY_USER_ID;
        if (IS_OWNER) {
            if (document.getElementById('menu-setting')) document.getElementById('menu-setting').style.display = 'flex'; 
            await sb.from('rooms').update({ is_active: true }).eq('id', CURRENT_ROOM_ID);
        } else if (!roomData.is_active) { alert("Room tutup!"); window.location.href = 'lobby.html'; return false; }
    }
    fetchStage();
    return true; 
}

window.naikKeStage = naikKeStage;
window.turunMic = turunMic;
window.prosesTurunMic = prosesTurunMic;
window.toggleSidebar = toggleSidebar;
window.toggleMicSidebar = toggleMicSidebar;
window.toggleGiftDrawer = toggleGiftDrawer;
window.toggleKickBtn = toggleKickBtn;
window.sendGift = sendGift;
window.kickUser = kickUser;
window.kirimKomentar = kirimKomentar;
window.mintaNaik = mintaNaik;
window.keluarRoom = keluarRoom;
window.openRoomSetting = openRoomSetting;
window.closeRoomSetting = closeRoomSetting;
window.saveRoomSetting = saveRoomSetting;
window.closeConfirmModal = () => { document.getElementById('confirm-modal').style.display = 'none'; };

initApp();

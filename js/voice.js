

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
fetchTopGifters(); 
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
            
            // --- FIX DI SINI: Tutup backtick-nya dengan benar ---
            item.innerHTML = `
                <div class="avatar ${isMe ? 'active' : ''}" data-user-id="${slot.profile_id}" onclick="${isMe ? `turunMic(${i})` : `toggleKickBtn(this, ${IS_OWNER && !isMe})`}">
                    <img src="${user.avatar_url || 'asets/png/profile.png'}">
                    <div class="mute-badge" style="display: ${user.mic_off ? 'flex' : 'none'}; position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.7); border-radius: 50%; width: 22px; height: 22px; align-items: center; justify-content: center; border: 2px solid white; z-index: 10;">
                        <span class="material-icons" style="color: #e74c3c; font-size: 14px;">mic_off</span>
                    </div>
                    ${(IS_OWNER && !isMe) ? `<div class="kick-btn-wrapper" style="display:none;"><div class="kick-btn" onclick="event.stopPropagation(); kickUser('${slot.profile_id}', '${user.username}')"><span class="material-icons">close</span></div></div>` : ''}
                </div>
                <span class="name-label" 
                      onclick="window.location.href='data.html?username=${encodeURIComponent(user.username)}'" 
                      style="color: ${lvlStyle.color}; cursor: pointer; font-weight: bold;">
                      ${user.username}${lvlBadge}${getUserBadge(user.role)}
                </span>`; // <--- Backtick penutup di sini!
        } else {
            // Blok ELSE kalau slot kosong
            item.innerHTML = `
                <div class="avatar" onclick="naikKeStage(${i})">
                    <span class="material-icons" style="color: #444; font-size: 30px;">add</span>
                </div>
                <span class="name-label">KOSONG</span>`;
        }
        grid.appendChild(item);
    });
}

// 5. ANIMASI GIFT COMBO
let giftComboCount = 0;
let lastGiftId = null;
let giftAnimTimer = null;

// 👇 FIX BUG 2: Tambah parameter 'forcedCombo' 👇
function playGiftAnimation(giftId, forcedCombo = null) {
    const id = giftId || 1;
    const gifPath = `asets/gif/giftvid${id}.gif`; 
    
    // Jika forcedCombo ada isinya (dari Realtime database), pakai itu.
    // Jika tidak (dari klik layar sendiri), hitung manual.
    if (forcedCombo !== null) {
        giftComboCount = forcedCombo;
        lastGiftId = id;
    } else {
        if (lastGiftId === id) {
            giftComboCount++;
        } else {
            giftComboCount = 1;
            lastGiftId = id;
        }
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, () => { 
        fetchStage(); 
    })
    // 👇 FIX: Update koin di layar penerima secara realtime! 👇
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (p) => { 
        fetchStage(); 
        
        // Cek kalau yang di-update itu adalah profil kita sendiri
        if (p.new && p.new.id === MY_USER_ID) {
            const coinDisplay = document.getElementById('user-coins');
            if (coinDisplay) {
                // Update angka koin di UI langsung!
                coinDisplay.innerText = (p.new.coins || 0).toLocaleString();
            }
        }
    })
    // 👆 END FIX 👆
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, (p) => {
        const chatBox = document.getElementById('chat-box');
        if (!chatBox) return;

        // Jika ada update, hapus pesan lama biar gak numpuk
        if (p.eventType === 'UPDATE' || p.eventType === 'INSERT') {
            const existingMsg = document.getElementById(`msg-${p.new.id}`);
            if (existingMsg) existingMsg.remove();
        }

        const isGift = p.new.username === "SISTEM_GIFT";
        
        let isDariSaya = false;
        let comboValue = 1;
        
        if (isGift) {
            const match = p.new.text.match(/^(.+) mengirim .+ x(\d+) ke/);
            
            if (match) {
                const pengirim = match[1]; 
                comboValue = parseInt(match[2]); 
                isDariSaya = (pengirim === myUsername);
            } else {
                isDariSaya = p.new.text.startsWith(`${myUsername} `);
            }
        }

        const div = document.createElement('div'); 
        div.id = `msg-${p.new.id}`;
        
        if (isGift) {
            div.className = 'msg system-gift'; 
            div.innerHTML = `<span>🎁 ${p.new.text}</span>`;
            
            if (!isDariSaya) {
                playGiftAnimation(parseInt(p.new.role), comboValue);
            }
        } else {
            const isSystem = p.new.username.startsWith("SISTEM");
            div.className = isSystem ? 'msg system' : 'msg';
            
            const style = getLevelStyle(p.new.level || 1);
            const lvlBadge = getLevelBadgeHTML(p.new.level || 1);
            const roleBadge = getUserBadge(p.new.role || '');
            
            const userLink = `
                <span onclick="window.location.href='data.html?username=${encodeURIComponent(p.new.username)}'" 
                      style="color:${style.color}; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; position:relative; z-index:10; pointer-events:auto;">
                    ${p.new.username}${lvlBadge}${roleBadge}
                </span>`;
            
            div.innerHTML = isSystem 
                ? `<span>${p.new.text}</span>` 
                : `${userLink}<span>: ${p.new.text}</span>`;
        }

        chatBox.appendChild(div); 
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
        
        fetchTopGifters(); 
    })
    .on('presence', { event: 'sync' }, () => {
        const countEl = document.getElementById('online-count');
        if (countEl) countEl.innerText = Object.keys(roomChannel.presenceState()).length;
    })
    .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach(p => { 
            if (p.key !== MY_USER_ID && p.level >= 4) playVIPEntrance(p.username, p.level); 
        });
    })
    .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await roomChannel.track({ 
                online_at: new Date().toISOString(), 
                username: myUsername, 
                level: myLevel 
            });
        }
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

let activeCombos = {}; 

async function sendGift(giftName, harga, giftId, jumlah = 1) {
    // --- VALIDASI AWAL ---
    if (!selectedTargetId) return alert("Pilih target!");

    if (selectedTargetId === MY_USER_ID) {
        if (typeof toast === "function") toast("Waduh", "Masa nyawer diri sendiri?", "warning");
        return alert("Nggak bisa gift ke diri sendiri, Bree!");
    }
    
    // --- 1. UI INSTAN (Biar kerasa responsif pas dispam) ---
    const coinDisplay = document.getElementById('user-coins');
    let saldoSkrg = parseInt(coinDisplay.innerText.replace(/[,.]/g, ''));
    let totalHarga = parseInt(harga) * jumlah; 

    if (saldoSkrg < totalHarga) {
        return alert("Koin lo kurang Bree!");
    }
    
    // Potong koin di UI duluan biar animasi cepat
    saldoSkrg -= totalHarga;
    coinDisplay.innerText = saldoSkrg.toLocaleString(); 
    
    if (typeof playGiftAnimation === "function") playGiftAnimation(giftId);

    // --- 2. SISTEM PENGEPUL (Anti Spam) ---
    // Kunci target saat ini
    const targetIdDikunci = selectedTargetId; 
    const targetNameDikunci = selectedTargetName;
    const comboKey = `${giftName}_${targetIdDikunci}`;

    if (!activeCombos[comboKey]) {
        activeCombos[comboKey] = { 
            targetId: targetIdDikunci,
            targetName: targetNameDikunci,
            count: 0, 
            pendingCoins: 0, 
            msgId: null,
            syncTimer: null 
        };
    }

    const combo = activeCombos[comboKey];
    combo.count += jumlah; 
    combo.pendingCoins += totalHarga; 

    if (combo.syncTimer) clearTimeout(combo.syncTimer);
    
    combo.syncTimer = setTimeout(async () => {
        // --- 3. AMBIL DATA DARI PENGEPUL & HAPUS DARI ANTREAN ---
        const coinsToDeduct = combo.pendingCoins;
        const currentCount = combo.count;
        const finalTargetId = combo.targetId;
        const finalTargetName = combo.targetName;
        const savedMsgId = combo.msgId;

        // Kosongkan combo
        delete activeCombos[comboKey]; 

        try {
            // 👇 MENEMBUS RLS SUPABASE 👇
            const { data: newTotalGift, error } = await sb.rpc('transfer_gift', {
                sender_id: MY_USER_ID,
                receiver_id: finalTargetId || selectedTargetId, // <--- Tambahin ini ya Bree!
                amount: coinsToDeduct
            });
            if (error) {
                console.error("Gagal transfer di server:", error.message);
                
                // 👇 POPUP MUNCUL KALAU DATABASE NOLAK 👇
                alert("Gagal kirim kado! Error Database: " + error.message); 
                
                // Kembalikan koin di layar kalau server nolak
                const koinBalik = parseInt(document.getElementById('user-coins').innerText.replace(/[,.]/g, '')) + coinsToDeduct;
                document.getElementById('user-coins').innerText = koinBalik.toLocaleString();
                return; 
            }

            // --- UPDATE LEVEL PENGIRIM (Kalau naik level) ---
            let levelData = checkLevelUp(newTotalGift);

            if (levelData.level !== myLevel) {
                await sb.from('profiles').update({ level: levelData.level }).eq('id', MY_USER_ID);
                await sb.from('room_messages').insert([{ 
                    room_id: CURRENT_ROOM_ID, 
                    username: "SISTEM", 
                    text: `⭐ SELAMAT! ${myUsername} naik ke Level ${levelData.level}!`, 
                    role: "admin" 
                }]);
            }

            // Update variabel lokal progress bar
            myTotalGiftSent = newTotalGift; 
            myLevel = levelData.level;
            if (typeof updateLevelProgressUI === "function") updateLevelProgressUI(); 

            // --- KIRIM CHAT COMBO ---
            const teksFinal = `${myUsername} mengirim ${giftName} x${currentCount} ke ${finalTargetName}`;

            if (savedMsgId) {
                await sb.from('room_messages').update({ text: teksFinal }).eq('id', savedMsgId);
            } else {
                const { data } = await sb.from('room_messages').insert([{ 
                    room_id: CURRENT_ROOM_ID, 
                    username: "SISTEM_GIFT", 
                    text: teksFinal, 
                    role: giftId.toString(), 
                    level: myLevel 
                }]).select();
                
                // Simpan ID pesannya siapa tahu diklik lagi pas jeda
                if (data && data.length > 0) activeCombos[comboKey] = { ...activeCombos[comboKey], msgId: data[0].id };
            }

        } catch (e) { 
            console.error("Error eksekusi sistem gift:", e.message); 
        }

    }, 600); 
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

    // 👇 FILTER: Ambil semua yang di panggung, KECUALI diri sendiri (.neq)
    const { data: slots } = await sb.from('room_slots')
        .select(`profile_id, profiles (username, avatar_url)`)
        .eq('room_id', CURRENT_ROOM_ID)
        .not('profile_id', 'is', null)
        .neq('profile_id', MY_USER_ID); 

    targetContainer.innerHTML = "";

    // Jika nggak ada orang lain di panggung (cuma ada lo doang)
    if (!slots || slots.length === 0) {
        selectedTargetId = null; // Reset target
        selectedTargetName = "";
        return targetContainer.innerHTML = "<span style='font-size:12px; color:#888; padding: 10px;'>Cuma ada kamu disi</span>";
    }

    slots.forEach((slot, index) => {
        const isSelected = selectedTargetId === slot.profile_id;
        const div = document.createElement('div'); 
        
        // Pakai classList biar lebih aman dari error syntax 'class'
        div.classList.add('target-user');
        if (isSelected) div.classList.add('selected');
        
        div.onclick = () => { 
            selectedTargetId = slot.profile_id; 
            selectedTargetName = slot.profiles.username; 
            updateGiftTargets(); 
        };

        // Pastikan pakai backtick (`) di awal dan akhir template string ini
        div.innerHTML = `
            <img src="${slot.profiles.avatar_url || 'asets/png/profile.png'}" class="target-avatar">
            <span class="target-name">${slot.profiles.username}</span>
        `;
        
        targetContainer.appendChild(div);

        if (!selectedTargetId && index === 0) { 
            selectedTargetId = slot.profile_id; 
            selectedTargetName = slot.profiles.username; 
            div.classList.add('selected'); 
        }
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
    if (IS_OWNER && confirm("Tutup panggung dan bersihkan riwayat? (Leaderboard akan direset)")) {
        // Kosongin kursi panggung
        await sb.from('room_slots').update({ profile_id: null }).eq('room_id', CURRENT_ROOM_ID);
        
        // Tutup panggung biar ga keliatan di Lobby
        await sb.from('rooms').update({ is_active: false }).eq('id', CURRENT_ROOM_ID);
        
        // 👇 INI YANG BIKIN RESET BREE 👇
        // Hapus semua chat & riwayat kado di panggung ini biar kalau dibuka lagi mulai dari 0 koin
        await sb.from('room_messages').delete().eq('room_id', CURRENT_ROOM_ID);
    }
    
    // Lempar user balik ke Lobby
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
// --- FUNGSI LOAD TOP 3 GIFTER ---
async function fetchTopGifters() {
    try {
        // Ambil maksimal 3 user dengan pengeluaran kado terbanyak (lebih dari 0)
        const { data: topUsers, error } = await sb
            .from('profiles')
            .select('username, avatar_url, total_gift_sent')
            .gt('total_gift_sent', 0) // 👇 TAMBAHIN BARIS INI JUGA BREE 👇
            .order('total_gift_sent', { ascending: false })
            .limit(3); 

        if (error) throw error;
        if (!topUsers || topUsers.length === 0) return;

        const container = document.getElementById('top-gifters-container');
        if (!container) return; // Kalau div-nya ga ada di HTML, skip aja

        // Render HTML-nya: Tulisan TOP + 3 Avatar numpuk
        let html = `<span style="font-size: 11px; color: #FFD700; font-weight: 800; margin-right: 6px; letter-spacing: 0.5px;">🏆 TOP</span>`;
        html += `<div style="display: flex; align-items: center;">`;
        
        // Warna border: Juara 1 Emas, 2 Perak, 3 Perunggu
        const bingkaiWarna = ['#FFD700', '#C0C0C0', '#CD7F32']; 
        
        topUsers.forEach((user, index) => {
            const marginKiri = index === 0 ? '0' : '-12px'; // Biar fotonya numpuk
            const zIndex = 3 - index; // Juara 1 posisinya paling depan
            
            html += `
                <img src="${user.avatar_url || 'asets/png/profile.png'}" 
                     title="${user.username} (Total: ${user.total_gift_sent} koin)"
                     style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; 
                            border: 2px solid ${bingkaiWarna[index]}; 
                            margin-left: ${marginKiri}; 
                            z-index: ${zIndex}; position: relative; background: #222;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
            `;
        });
        
        html += `</div>`;
        container.innerHTML = html;

    } catch (err) {
        console.error("Gagal memuat Top Gifters:", err.message);
    }
}
// ==========================================
// --- 1. FITUR HITUNG KOIN PER PANGGUNG ---
// ==========================================
async function getRoomLeaderboard() {
    try {
        // Tarik semua pesan sistem "GIFT" khusus di room ini aja
        const { data: messages, error } = await sb
            .from('room_messages')
            .select('text, role')
            .eq('room_id', CURRENT_ROOM_ID)
            .eq('username', 'SISTEM_GIFT');
        
        if (error || !messages) return [];

        // Daftar harga kado berdasarkan ID (sesuai HTML lo)
        const hargaKado = { '1': 1, '2': 10, '3': 50, '4': 100, '5': 2000 };
        let totalPerUser = {};

        // Bedah teks chatnya buat ngitung koin (Contoh: "hype mengirim Love x5 ke devhope")
        messages.forEach(m => {
            const match = m.text.match(/^(.+) mengirim (.+) x(\d+) ke/);
            if (match) {
                const pengirim = match[1];
                const jumlah = parseInt(match[3]);
                const harga = hargaKado[m.role] || 0;
                
                if (!totalPerUser[pengirim]) totalPerUser[pengirim] = 0;
                totalPerUser[pengirim] += (harga * jumlah); // Tambahin ke total
            }
        });

        // Urutkan dari yang terbanyak dan ambil Top 10
        const namaSultan = Object.keys(totalPerUser).sort((a, b) => totalPerUser[b] - totalPerUser[a]).slice(0, 10);
        if (namaSultan.length === 0) return [];

        // Tarik foto profil mereka dari database
        const { data: profiles } = await sb.from('profiles').select('username, avatar_url, level, role').in('username', namaSultan);
        if (!profiles) return [];

        // Gabungin data profil sama jumlah koin panggung ini
        let leaderboard = profiles.map(p => ({
            ...p,
            room_total: totalPerUser[p.username]
        })).sort((a, b) => b.room_total - a.room_total); 

        return leaderboard;
    } catch (err) {
        console.error("Gagal hitung koin panggung:", err);
        return [];
    }
}

// ==========================================
// --- 2. RENDER TOP 3 AVATAR DI ATAS ---
// ==========================================
async function fetchTopGifters() {
    const topUsers = await getRoomLeaderboard();
    const container = document.getElementById('top-gifters-container');
    if (!container) return;

    if (topUsers.length === 0) {
        container.innerHTML = ''; // Sembunyikan kalau room belum ada yang nyawer
        return;
    }

    const top3 = topUsers.slice(0, 3); // Ambil 3 aja buat header
    let html = `<span style="font-size: 11px; color: #FFD700; font-weight: 800; margin-right: 6px; letter-spacing: 0.5px;">🏆 TOP</span>`;
    html += `<div style="display: flex; align-items: center;">`;
    
    const bingkaiWarna = ['#FFD700', '#C0C0C0', '#CD7F32']; 
    
    top3.forEach((user, index) => {
        const marginKiri = index === 0 ? '0' : '-12px';
        const zIndex = 3 - index; 
        
        html += `
            <img src="${user.avatar_url || 'asets/png/profile.png'}" 
                 title="${user.username} (${user.room_total} koin)"
                 style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; 
                        border: 2px solid ${bingkaiWarna[index]}; 
                        margin-left: ${marginKiri}; z-index: ${zIndex}; position: relative; background: #222;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

// ==========================================
// --- 3. MODAL LEADERBOARD PERSESI ---
// ==========================================
async function openTopGiftersModal() {
    const modal = document.getElementById('top-gifters-modal');
    const listContainer = document.getElementById('top-gifters-list');
    if (!modal || !listContainer) return;

    modal.style.display = 'flex';
    listContainer.innerHTML = '<div style="text-align:center; color:#fff; padding: 20px;">Menghitung koin panggung... </div>';

    // Kita ganti judulnya biar sesuai
    const titleEl = modal.querySelector('.modal-header h3');
    if (titleEl) titleEl.innerHTML = 'THE SULTAN';

    const topUsers = await getRoomLeaderboard();

    listContainer.innerHTML = '';
    if (topUsers.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; color:#888;">Belum ada kado di panggung ini. Ayo kirim yang pertama!</div>';
        return;
    }

    topUsers.forEach((user, index) => {
        let rankHtml = '';
        if (index === 0) rankHtml = `<div style="background: linear-gradient(135deg, #FFDF00, #D4AF37); color: #000; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 15px; box-shadow: 0 2px 8px rgba(255,215,0,0.5);">1</div>`;
        else if (index === 1) rankHtml = `<div style="background: linear-gradient(135deg, #FFFFFF, #A9A9A9); color: #000; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 15px; box-shadow: 0 2px 8px rgba(192,192,192,0.3);">2</div>`;
        else if (index === 2) rankHtml = `<div style="background: linear-gradient(135deg, #FFB37C, #C56F28); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 15px; box-shadow: 0 2px 8px rgba(205,127,50,0.3);">3</div>`;
        else rankHtml = `<div style="color: #94a3b8; font-weight: 900; font-size: 16px; width: 28px; text-align: center;">${index + 1}</div>`;

        const bgGradient = index === 0 ? 'background: linear-gradient(90deg, rgba(255, 215, 0, 0.15), transparent); border-left: 4px solid #FFD700;' : 
                           index === 1 ? 'background: linear-gradient(90deg, rgba(192, 192, 192, 0.1), transparent); border-left: 4px solid #C0C0C0;' : 
                           index === 2 ? 'background: linear-gradient(90deg, rgba(205, 127, 50, 0.1), transparent); border-left: 4px solid #CD7F32;' : 
                           'background: #2a3648; border-left: 4px solid transparent;';

        const lvlBadge = getLevelBadgeHTML(user.level || 1);
        const roleBadge = getUserBadge(user.role || '');

        listContainer.innerHTML += `
    <div style="display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 6px; ${bgGradient}">
        <div style="width: 30px; display: flex; justify-content: center;">${rankHtml}</div>
        <img src="${user.avatar_url || 'asets/png/profile.png'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #555;">
        <div style="flex: 1; min-width: 0;">
            <div onclick="window.location.href='data.html?username=${encodeURIComponent(user.username)}'" 
                 style="color: #fff; font-weight: bold; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; cursor: pointer;">
                ${user.username} ${lvlBadge} ${roleBadge}
            </div>
            <div style="color: #FFD700; font-size: 12px; margin-top: 2px; font-weight: 600;">
                 ${(user.room_total || 0).toLocaleString()} koin
            </div>
        </div>
    </div>
`;

    });
}

// --- FUNGSI TUTUP MODAL ---
function closeTopGiftersModal() {
    document.getElementById('top-gifters-modal').style.display = 'none';
}

// BIAR MODAL BISA DIKLIK, update sedikit fungsi fetchTopGifters lo:
// Cari baris `container.innerHTML = html;` di dalam fungsi fetchTopGifters yang barusan lo buat.
// Terus tambahin ini di bawahnya:
// container.onclick = openTopGiftersModal;


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

// 👇 TAMBAHIN DUA BARIS INI BREE 👇
window.openTopGiftersModal = openTopGiftersModal;
window.closeTopGiftersModal = closeTopGiftersModal;

initApp();

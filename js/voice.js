// ===== [VOICE.JS - THE REAL FULL COMPLETE FIX] =====

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

document.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.querySelector('.room-title');
    if (titleEl) titleEl.innerText = CURRENT_ROOM_NAME.toUpperCase();
});

// --- UI HELPERS & BADGES ---
function getUserBadge(role) {
  if (!role) return "";
  let badge = "";
  const r = role.toLowerCase();
  if (r === "admin") badge += `<span class="admin-badge" style="background: #ff4757; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 5px; font-weight: bold; height: 16px; display: inline-flex; align-items: center; vertical-align: middle;">🛡 Dev</span>`;
  if (r === "verified") badge += `<span class="verified-badge" style="margin-left:5px; vertical-align:middle;"><svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1DA1F2"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  const crowBadges = { crown1: "asets/png/crown1.png", crown2: "asets/png/crown2.png", crown3: "asets/png/crown3.png" };
  if (crowBadges[r]) badge += `<img src="${crowBadges[r]}" style="width:18px;height:18px;margin-left:5px;vertical-align:middle;object-fit:contain;display:inline-block;" alt="${r}">`;
  return badge;
}

// 2. KONFIGURASI SUPABASE
const supabaseUrl = 'https://hqetnqnvmdxdgfnnluew.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA';
const sb = supabase.createClient(supabaseUrl, supabaseKey);

async function getCachedProfile(userId) {
  const key = `hh_profile_${userId}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);
  const { data } = await sb.from('profiles').select('username, avatar_url, role, coins').eq('id', userId).single();
  if (data) sessionStorage.setItem(key, JSON.stringify(data));
  return data;
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
    if (typeof LivekitClient === 'undefined') return;
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
                if (el) el.classList.add('speaking');
            });
        });
        room.on(LivekitClient.RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === "audio") document.body.appendChild(track.attach()); 
        });
        await room.connect(LIVEKIT_URL, data.token);
        await room.localParticipant.setMicrophoneEnabled(false);
    } catch (e) { console.error("LiveKit Error:", e.message); }
}

// 4. LOGIKA PANGGUNG
async function fetchStage() {
    if (!CURRENT_ROOM_ID || CURRENT_ROOM_ID === "null") return;
    let { data: slots } = await sb.from('room_slots').select(`slot_index, profile_id, profiles (username, avatar_url, role, mic_off)`).eq('room_id', CURRENT_ROOM_ID).order('slot_index', { ascending: true });
    
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
            item.innerHTML = `
                <div class="avatar ${isMe ? 'active' : ''}" data-user-id="${slot.profile_id}" onclick="${isMe ? `turunMic(${i})` : `toggleKickBtn(this, ${IS_OWNER && !isMe})`}">
                    <img src="${user.avatar_url || 'asets/png/profile.png'}">
                    <div class="mute-badge" style="display: ${user.mic_off ? 'flex' : 'none'}; position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.7); border-radius: 50%; width: 22px; height: 22px; align-items: center; justify-content: center; border: 2px solid white; z-index: 10;">
                        <span class="material-icons" style="color: #e74c3c; font-size: 14px;">mic_off</span>
                    </div>
                    ${(IS_OWNER && !isMe) ? `<div class="kick-btn-wrapper" style="display:none;"><div class="kick-btn" onclick="event.stopPropagation(); kickUser('${slot.profile_id}', '${user.username}')"><span class="material-icons">close</span></div></div>` : ''}
                </div>
                <span class="name-label">${user.username} ${getUserBadge(user.role)}</span>`;
        } else {
            item.innerHTML = `<div class="avatar" onclick="naikKeStage(${i})"><span class="material-icons" style="color: #444; font-size: 30px;">add</span></div><span class="name-label">KOSONG</span>`;
        }
        grid.appendChild(item);
    });
}

function playGiftAnimation(giftId) {
    const id = giftId || 1;
    const gifPath = `asets/gif/giftvid${id}.gif`; 
    
    let overlay = document.getElementById('gift-anim-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'gift-anim-overlay';
        const img = document.createElement('img');
        img.id = 'gift-anim-img';
        overlay.appendChild(img);
        document.body.appendChild(overlay);
    }
    
    const img = document.getElementById('gift-anim-img');
    img.src = gifPath + "?t=" + Date.now(); 
    
    overlay.style.display = 'flex';
    setTimeout(() => { 
        overlay.classList.add('show');
        overlay.style.opacity = '1'; 
    }, 50);

    setTimeout(() => {
        overlay.classList.remove('show');
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; }, 500);
    }, 4000); 
}

// 6. REALTIME LISTENER (ANTI-DOBEL TEXT & ANIMASI)
function listenRealtime() {
    if (!CURRENT_ROOM_ID || !MY_USER_ID) return;
    const roomChannel = sb.channel(`room_active_${CURRENT_ROOM_ID}`, { config: { presence: { key: MY_USER_ID } } });

    roomChannel.on('presence', { event: 'sync' }, () => {
        const countEl = document.getElementById('online-count');
        if (countEl) countEl.innerText = Object.keys(roomChannel.presenceState()).length;
    })
    .on('presence', { event: 'join' }, ({ newPresences }) => {
        const chatBox = document.getElementById('chat-box');
        newPresences.forEach(p => {
            if (p.key !== MY_USER_ID) { 
                const div = document.createElement('div'); div.className = 'msg system';
                div.innerHTML = `<span style="color: #00ff88;">👋 <b>${p.username}</b> bergabung!</span>`;
                chatBox?.appendChild(div); if(chatBox) chatBox.scrollTop = chatBox.scrollHeight; 
            }
        });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, () => fetchStage())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, (p) => {
        const chatBox = document.getElementById('chat-box');
        if (!chatBox) return;
        
        const isGift = p.new.username === "SISTEM_GIFT";
        const isSystem = p.new.username.startsWith("SISTEM");
        
        // Cek apakah kado dikirim oleh diri kita sendiri (dari nama user kita)
        const isDariSaya = isGift && p.new.text.includes(myUsername);

        // Kalau kado dari gue sendiri, stop di sini. Biar gak muncul dobel dari server
        if (isDariSaya) return;

        const div = document.createElement('div'); 
        div.className = isSystem ? 'msg system' : 'msg';

        if (isGift) {
            // Teks kado warna kuning emas untuk user lain yang liat
            div.innerHTML = `<span style="color: #f1c40f; font-weight: bold;">${p.new.text}</span>`;
        } else {
            div.innerHTML = isSystem ? `<span>${p.new.text}</span>` : `<span class="user">${p.new.username}${getUserBadge(p.new.role)}:</span> ${p.new.text}`;
        }
        
        chatBox.appendChild(div); 
        chatBox.scrollTop = chatBox.scrollHeight;

        // Puter animasi untuk user lain yang menerima/melihat kado
        if (isGift) {
            if (typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            playGiftAnimation(parseInt(p.new.role) || 1);
        }
    })
    .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await roomChannel.track({ online_at: new Date().toISOString(), username: myUsername });
    });
}

// 7. UI TOGGLES
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

function toggleGiftDrawer() {
    document.getElementById('gift-drawer').classList.toggle('open');
    document.getElementById('drawer-overlay').classList.toggle('show');
    if (document.getElementById('gift-drawer').classList.contains('open')) updateGiftTargets();
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

// 8. INTERACTION LOGIC
async function naikKeStage(index) {
    if (!MY_USER_ID) return alert("Login dulu!");
    try {
        await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID);
        await new Promise(r => setTimeout(r, 200));
        await sb.from('room_slots').update({ profile_id: MY_USER_ID }).match({ room_id: CURRENT_ROOM_ID, slot_index: index });
        if (room) await room.localParticipant.setMicrophoneEnabled(true);
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
    await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: `🚫 ${targetName} ditendang.` }]);
}

// 9. LOGIKA SEND GIFT (LANGSUNG MUNCUL TANPA DELAY)
async function sendGift(giftName, harga, giftId) {
    if (!selectedTargetId) return alert("Pilih target!");
    const coinDisplay = document.getElementById('user-coins');
    let saldoSkrg = parseInt(coinDisplay.innerText.replace(/[,.]/g, ''));
    if (saldoSkrg < harga) return alert("Koin kurang!");
    
    try {
        await sb.from('profiles').update({ coins: saldoSkrg - harga }).eq('id', MY_USER_ID);
        const { data: tData } = await sb.from('profiles').select('coins').eq('id', selectedTargetId).single();
        await sb.from('profiles').update({ coins: (tData.coins || 0) + harga }).eq('id', selectedTargetId);
        coinDisplay.innerText = (saldoSkrg - harga).toLocaleString();
        
        // Teks yang dikirim
        const teksPengumuman = ` ${myUsername} mengirim ${giftName} ke ${selectedTargetName}!`;
        
        await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM_GIFT", text: teksPengumuman, role: giftId.toString() }]);
        
        toggleGiftDrawer();

        // 🔥 PAKSA MUNCUL ANIMASI DI HP PENGIRIM 🔥
        if (typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        playGiftAnimation(giftId);

        // 🔥 PAKSA MUNCUL TEKS DI CHATBOX HP PENGIRIM 🔥
        const chatBox = document.getElementById('chat-box');
        if (chatBox) {
            const div = document.createElement('div'); 
            div.className = 'msg system';
            div.innerHTML = `<span style="color: #f1c40f; font-weight: bold;">${teksPengumuman}</span>`;
            chatBox.appendChild(div); 
            chatBox.scrollTop = chatBox.scrollHeight;
        }

    } catch (e) { alert(e.message); }
}

// 10. AUTH & INIT
async function checkUser() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return false; }
    MY_USER_ID = session.user.id;
    const myProfile = await getCachedProfile(MY_USER_ID);
    const { data: roomData } = await sb.from('rooms').select('owner_id, is_active').eq('id', CURRENT_ROOM_ID).maybeSingle();
    if (myProfile) {
        myUsername = myProfile.username; myRole = myProfile.role || "user";
        if (document.getElementById('sidebar-username')) document.getElementById('sidebar-username').innerText = myUsername;
        if (document.getElementById('sidebar-avatar')) document.getElementById('sidebar-avatar').src = myProfile.avatar_url || 'asets/png/profile.png';
        if (document.getElementById('user-coins')) document.getElementById('user-coins').innerText = (myProfile.coins || 0).toLocaleString();
    }
    if (roomData) {
        IS_OWNER = roomData.owner_id === MY_USER_ID;
        if (IS_OWNER) await sb.from('rooms').update({ is_active: true }).eq('id', CURRENT_ROOM_ID);
        else if (!roomData.is_active) { alert("Room tutup!"); window.location.href = 'lobby.html'; return false; }
    }
    fetchStage();
    return true; 
}

// EXPOSE TO WINDOW
window.naikKeStage = naikKeStage;
window.turunMic = turunMic;
window.prosesTurunMic = prosesTurunMic;
window.toggleSidebar = toggleSidebar;
window.toggleGiftDrawer = toggleGiftDrawer;
window.toggleKickBtn = toggleKickBtn;
window.sendGift = sendGift;
window.kickUser = kickUser;
window.closeConfirmModal = () => document.getElementById('confirm-modal').style.display = 'none';

initApp();

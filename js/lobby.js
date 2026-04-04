// Ganti dengan API Key lo Bree
const supabaseUrl = 'https://hqetnqnvmdxdgfnnluew.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA';
const sb = supabase.createClient(supabaseUrl, supabaseKey);

// Variabel Global
let MY_USER_ID = null; 
let kategoriAktif = 'Populer'; // Default saat pertama buka

// --- [FIX EGRESS] CACHE HELPER ---
async function getCachedProfile(userId) {
    const key = `hh_profile_${userId}`;
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached);
    
    const { data } = await sb.from('profiles').select('username, avatar_url, coins').eq('id', userId).single();
    if (data) sessionStorage.setItem(key, JSON.stringify(data));
    return data;
}

async function initLobby() {
    await loadUserProfile();
    await loadRooms();
}

// --- FUNGSI LOAD PROFILE ---
async function loadUserProfile() {
    const { data: { session } } = await sb.auth.getSession();
    
    if (session && session.user) {
        MY_USER_ID = session.user.id; 

        // [FIX EGRESS] Pake cache biar gak nembak tabel profiles terus
        const profile = await getCachedProfile(MY_USER_ID);

        if (profile) {
            document.getElementById('lobby-username').innerText = profile.username;
            document.getElementById('lobby-coins').innerText = (profile.coins || 0).toLocaleString();
            
            if (profile.avatar_url) {
                document.getElementById('lobby-avatar').src = profile.avatar_url;
            }
        }
        
        console.log("✅ Session Aktif untuk ID:", MY_USER_ID);
    } else {
        console.warn("⚠️ Kamu belum login, Bree. Fitur buat room bakal macet.");
    }
}

// --- FUNGSI KLIK TAB KATEGORI ---
function filterKategori(kategori, elemen) {
    kategoriAktif = kategori;

    const semuaTab = document.querySelectorAll('.tabs span');
    semuaTab.forEach(tab => tab.classList.remove('active'));
    if (elemen) elemen.classList.add('active');

    loadRooms(); 
}

// --- FUNGSI LOAD ROOMS ---
async function loadRooms() {
    const list = document.getElementById('room-list');
    list.innerHTML = '<div class="loader">Memanggil Panggung...</div>';
    
    // [FIX EGRESS] Cuma tarik kolom yang dibutuhkan
    let query = sb.from('rooms').select('id, name, description').eq('is_active', true);

    if (kategoriAktif !== 'Populer') {
        query = query.eq('category', kategoriAktif); 
    } else {
        query = query.order('created_at', { ascending: false }); 
    }

    const { data: rooms, error } = await query;

    if (error) {
        return list.innerHTML = `<div style="text-align:center; padding: 20px; color: #ff4d4d;">Gagal memuat room: ${error.message}</div>`;
    }

    list.innerHTML = "";

    if (!rooms || rooms.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding: 20px; color: #888;">Belum ada panggung ${kategoriAktif} yang aktif.</div>`;
        return;
    }

    // --- [FIX EGRESS PENTING] ANTI N+1 QUERY ---
    // Daripada ngitung slot di dalem loop (bikin API meledak), 
    // kita narik data slot yang keisi cuma dengan SATU TEMBAKAN API!
    const roomIds = rooms.map(r => r.id);
    const { data: occupiedSlots } = await sb.from('room_slots')
        .select('room_id')
        .in('room_id', roomIds)
        .not('profile_id', 'is', null);

    // Hitung secara kilat di JavaScript (Gak pake internet/API lagi)
    const onlineCounts = {};
    if (occupiedSlots) {
        occupiedSlots.forEach(slot => {
            onlineCounts[slot.room_id] = (onlineCounts[slot.room_id] || 0) + 1;
        });
    }

    for (const room of rooms) {
        // Ambil angka dari hitungan JS tadi
        const onlineCount = onlineCounts[room.id] || 0; 

        const card = document.createElement('div');
        card.className = 'room-card';
        card.onclick = () => window.location.href = `voice.html?id=${room.id}&name=${encodeURIComponent(room.name)}`;
        
        card.innerHTML = `
            <div class="room-thumb">
                <span class="material-icons">graphic_eq</span>
            </div>
            <div class="room-info">
                <h4>${room.name.toUpperCase()}</h4>
                <p>${room.description || 'Ayo nyanyi bareng di panggung ini!'}</p>
            </div>
            <div class="room-status">
                <div class="online-pill">🔥 ${onlineCount} Online</div>
            </div>
        `;
        list.appendChild(card);
    }
}

// --- FUNGSI MODAL BIKIN ROOM ---
function createRoom() {
    document.getElementById('modal-create').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-create').style.display = 'none';
}

// --- FUNGSI BUAT ROOM ---
async function confirmCreateRoom() {
    const name = document.getElementById('new-room-name').value;
    const desc = document.getElementById('new-room-desc').value;
    const category = document.getElementById('new-room-category').value;

    if (!name) {
        if (typeof toast === "function") return toast("Waduh", "Kasih nama panggung dulu dong, Bree!", "warning");
        return alert("Nama panggung wajib diisi!");
    }

    if (!MY_USER_ID) {
        if (typeof toast === "function") return toast("Error", "Login dulu bree!", "error");
        return alert("Login dulu bree!");
    }

    try {
        const { data: newRoom, error: roomError } = await sb.from('rooms').insert([{
            name: name,
            description: desc,
            category: category,
            owner_id: MY_USER_ID,
            is_active: true
        }]).select().single();

        if (roomError) throw roomError;

        const roomId = newRoom.id;

        const slots = [];
        for (let i = 0; i < 6; i++) {
            slots.push({ room_id: roomId, slot_index: i, profile_id: null });
        }
        
        const { error: slotError } = await sb.from('room_slots').insert(slots);
        if (slotError) throw slotError;

        if (typeof toast === "function") toast("Berhasil", `Panggung ${category} lo udah siap!`, "success");
        
        closeModal();

        setTimeout(() => {
            window.location.href = `voice.html?id=${roomId}&name=${encodeURIComponent(name)}`;
        }, 1200);

    } catch (e) {
        console.error(e);
        if (typeof toast === "function") toast("Error", "Gagal bikin panggung nih.", "error");
        else alert("Gagal bikin panggung!");
    }
}

// --- FUNGSI TOMBOL MULAI NYANYI (HERO SECTION) ---
async function handleStartSinging() {
    if (!MY_USER_ID) {
        if (typeof toast === "function") return toast("Waduh", "Login dulu Bree!", "warning");
        return alert("Login dulu Bree!");
    }

    console.log("🔍 Mengecek apakah lo udah punya panggung...");

    const { data: existingRoom, error } = await sb.from('rooms')
        .select('id, name')
        .eq('owner_id', MY_USER_ID)
        .single(); 

    if (existingRoom) {
        console.log("🚀 Lo udah punya room, meluncur...");
        window.location.href = `voice.html?id=${existingRoom.id}&name=${encodeURIComponent(existingRoom.name)}`;
    } else {
        createRoom();
    }
}

// JALANKAN APLIKASI
initLobby();

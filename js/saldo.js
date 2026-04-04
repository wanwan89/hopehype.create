/**
 * HOPEHYPE WALLET LOGIC (EGRESS OPTIMIZED 🔥)
 * Mengatur tampilan saldo, konversi IDR, dan tombol Withdraw
 */

// 1. Cek koneksi Supabase agar tidak bentrok
if (typeof window.supabaseClient === 'undefined') {
    const supabaseUrl = 'https://hqetnqnvmdxdgfnnluew.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA';
    window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
}

const IDR_RATE = 70; // 1 Koin = Rp 70

async function initWallet() {
    try {
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        
        if (authError || !user) {
            console.log("User tidak terdeteksi. Silahkan login.");
            return;
        }

        const userId = user.id;

        // [FIX EGRESS] 1. Tampilkan dari Cache dulu biar INSTAN (Gak pake loading)
        const cacheKey = `hh_profile_${userId}`;
        const cachedProfileStr = sessionStorage.getItem(cacheKey);
        let currentCoins = 0;

        if (cachedProfileStr) {
            const cachedProfile = JSON.parse(cachedProfileStr);
            currentCoins = cachedProfile.coins || 0;
            updateWalletUI(currentCoins);
        }

        // [FIX EGRESS] 2. Ambil koin terbaru di background (Cuma 1 kolom, irit banget)
        // Kenapa tetep nembak? Karena ini SALDO, harus akurat 100% kalau ada trx pas user offline.
        const { data: profile, error: profileError } = await window.supabaseClient
            .from('profiles')
            .select('coins')
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;

        // Kalau koin di database beda sama di cache HP, update layar dan cachenya!
        if (profile && profile.coins !== currentCoins) {
            updateWalletUI(profile.coins);
            
            if (cachedProfileStr) {
                const updatedCache = JSON.parse(cachedProfileStr);
                updatedCache.coins = profile.coins;
                sessionStorage.setItem(cacheKey, JSON.stringify(updatedCache));
            } else {
                sessionStorage.setItem(cacheKey, JSON.stringify({ coins: profile.coins }));
            }
        }

        fetchLastTransaction(userId);
        subscribeToCoinChanges(userId);

    } catch (err) {
        console.error("Wallet Error:", err.message);
    }
}

// Fungsi Update Angka di Layar
function updateWalletUI(coins) {
    const coinElement = document.getElementById('coinDisplay');
    const idrElement = document.getElementById('idrDisplay');

    if (coinElement) {
        coinElement.innerText = (coins || 0).toLocaleString('id-ID');
    }

    if (idrElement) {
        const totalIDR = (coins || 0) * IDR_RATE;
        idrElement.innerText = totalIDR.toLocaleString('id-ID', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}

// [FIX EGRESS] Fungsi Ambil Riwayat Terakhir pakai Cache Lokal
async function fetchLastTransaction(userId) {
    const lastTrxElement = document.getElementById('lastTrx');
    if (!lastTrxElement) return;

    // Cek cache transaksi terakhir
    const trxCacheKey = `hh_last_trx_${userId}`;
    const cachedTrx = sessionStorage.getItem(trxCacheKey);

    if (cachedTrx) {
        lastTrxElement.innerText = cachedTrx;
    }

    // Silent fetch buat ngecek ada trx baru apa nggak
    const { data: lastTrx } = await window.supabaseClient
        .from('gift_transactions')
        .select('amount')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (lastTrx) {
        const trxText = `Terakhir: ${lastTrx.amount} Koin`;
        lastTrxElement.innerText = trxText;
        sessionStorage.setItem(trxCacheKey, trxText);
    }
}

// Fungsi Realtime
function subscribeToCoinChanges(userId) {
    window.supabaseClient
        .channel('public:profiles_wallet')
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles', 
            filter: `id=eq.${userId}` 
        }, (payload) => {
            const newCoins = payload.new.coins;
            updateWalletUI(newCoins);

            // [FIX EGRESS PENTING] Update Cache HP saat Realtime masuk!
            // Biar pas balik ke halaman Home, koin di header nggak balik ke angka lama.
            const cacheKey = `hh_profile_${userId}`;
            const cachedStr = sessionStorage.getItem(cacheKey);
            if (cachedStr) {
                const cached = JSON.parse(cachedStr);
                cached.coins = newCoins;
                sessionStorage.setItem(cacheKey, JSON.stringify(cached));
            }
        })
        .subscribe();
}

/**
 * FUNGSI TOMBOL WITHDRAW
 * Ini yang bikin tombolnya bisa diklik dan pindah halaman
 */
function openWithdrawModal() {
    console.log("Mengarahkan ke halaman withdraw...");
    window.location.href = 'penarikan.html';
}

// Jalankan saat halaman siap
document.addEventListener('DOMContentLoaded', initWallet);

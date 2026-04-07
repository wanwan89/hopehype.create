// KONFIGURASI FIREBASE (PROJECT: HOPECREATE)
const firebaseConfig = {
  apiKey: "AIzaSyCRnwkcydQK2LkdQj7H3WmIKdEyZ9giD9I",
  authDomain: "hopecreate-b21d8.firebaseapp.com",
  projectId: "hopecreate-b21d8",
  storageBucket: "hopecreate-b21d8.firebasestorage.app",
  messagingSenderId: "313569930727",
  appId: "1:313569930727:web:afd1e2757cd0fe0867a142",
  measurementId: "G-K92MZL0TEP"
};

// Inisialisasi
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const messaging = firebase.messaging();

async function aktifkanNotifikasi(userId) {
    try {
        // 1. Minta Izin ke User
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log("Izin notifikasi ditolak user.");
            return;
        }

        // 2. Ambil Token dengan VAPID Key BARU kamu
        const token = await messaging.getToken({ 
            vapidKey: 'BJ-fSO8MZxyXnvFL6AGRf4dsl-9lWXAONrtSaI6T-4SGM0UxojM5vVfpu9YIE_kiIbBBxl4RWUkYykx-8n3etYo' 
        });

        if (token) {
            console.log("Token Baru Berhasil Didapat: ", token);
            
            // 3. Simpan/Update ke Supabase
            const { error } = await db.from('user_push_tokens').upsert({ 
                user_id: userId, 
                token: token 
            });

            if (error) {
                console.error("Gagal simpan ke Supabase: ", error.message);
            } else {
                console.log("Notifikasi HopeHype Aktif! ✅ Data masuk Supabase.");
            }
        }
    } catch (err) {
        console.error("Error Sistem Notif: ", err);
    }
}

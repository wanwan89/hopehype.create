// FIREBASE SERVICE WORKER (CHAT STYLE VERSION)
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

const firebaseConfig = {
  apiKey: "AIzaSyCRnwkcydQK2LkdQj7H3WmIKdEyZ9giD9I",
  authDomain: "hopecreate-b21d8.firebaseapp.com",
  projectId: "hopecreate-b21d8",
  storageBucket: "hopecreate-b21d8.firebasestorage.app",
  messagingSenderId: "313569930727",
  appId: "1:313569930727:web:afd1e2757cd0fe0867a142",
  measurementId: "G-K92MZL0TEP"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 1. Biarkan Firebase nampilin notif otomatis (Biar nggak duplikat)
messaging.onBackgroundMessage(function(payload) {
  console.log('[sw.js] Pesan Background Diterima: ', payload);
});

// 2. LOGIKA KLIK (Biar pas diklik langsung buka aplikasi/chat)
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Tutup notifnya setelah diklik

  // Ambil link tujuan dari payload (click_action yang kita set di Edge Function)
  const clickAction = event.notification.click_action || '/chat.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Kalau web HopeHype sudah terbuka di salah satu tab, fokus ke tab itu saja
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes('chat.html') && 'focus' in client) {
          return client.focus();
        }
      }
      // Kalau web belum terbuka, buka tab baru
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});

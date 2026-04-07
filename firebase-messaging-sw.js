// FIREBASE SERVICE WORKER (FXIX EVALUATION)
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

// Inisialisasi Firebase di Worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Menangani notifikasi saat browser ditutup (Background)
messaging.onBackgroundMessage(function(payload) {
  console.log('[sw.js] Pesan Background Diterima: ', payload);
  
  const notificationTitle = payload.notification.title || "HopeCreate Notif";
  const notificationOptions = {
    body: payload.notification.body || "Ada kabar baru buat kamu!",
    icon: '/asets/png/book.png', 
    badge: '/asets/png/book.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

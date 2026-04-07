// FIREBASE SERVICE WORKER (FIX DUPLIKAT NOTIF)
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

// Menangani pesan saat di Background
messaging.onBackgroundMessage(function(payload) {
  console.log('[sw.js] Pesan Background Diterima: ', payload);
  
  // KITA HAPUS BAGIAN SHOW NOTIFICATION DI SINI
  // Biarkan Chrome & Firebase yang otomatis nampilin pop-up-nya!
});

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Pakai config Firebase yang sama dengan di home.js kamu
const firebaseConfig = {
  apiKey: "AIzaSyDuUj8xP6v91pBG9wR6OBN2f-DptYQYL8c",
  projectId: "hopeproject-b829d",
  messagingSenderId: "49713254002",
  appId: "1:49713254002:web:e3f898b36873998f828d9d"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Ini opsional, buat nangkep pesan pas browser lagi ditutup
messaging.onBackgroundMessage(function(payload) {
  console.log('[sw.js] Pesan masuk di background: ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/asets/png/book.png' // Ganti ke icon Hope Hype kamu
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

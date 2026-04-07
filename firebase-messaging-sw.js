importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyDuUj8xP6v91pBG9wR6OBN2f-DptYQYL8c",
  projectId: "hopeproject-b829d",
  messagingSenderId: "49713254002",
  appId: "1:49713254002:web:e3f898b36873998f828d9d"
});

const messaging = firebase.messaging();

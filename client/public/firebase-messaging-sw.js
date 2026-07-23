importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBTQ5h9h0teHhiy3KadiH801MJ127DYp2I",
  authDomain: "zoodevcore.firebaseapp.com",
  projectId: "zoodevcore",
  storageBucket: "zoodevcore.firebasestorage.app",
  messagingSenderId: "250144911259",
  appId: "1:250144911259:web:d73e9b702116814c353b3e"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Thông báo ZOO Workshop';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/favicon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

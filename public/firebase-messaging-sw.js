importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCI6aRv9HmUmnBS2zJRtWBHcabT_6hcGI0",
  authDomain: "masrytv-be1be.firebaseapp.com",
  projectId: "masrytv-be1be",
  storageBucket: "masrytv-be1be.firebasestorage.app",
  messagingSenderId: "725960187583",
  appId: "1:725960187583:web:f6eb2f0ab0094cabc2f00a"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'إشعار جديد';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/icon.png',
    data: payload.data, // Attach data for the click handler
    badge: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Default target URL
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it and navigate
        if (clientList.length > 0) {
          let client = clientList[0];
          for (let i = 0; i < clientList.length; i++) {
            if (clientList[i].focused) {
              client = clientList[i];
              break;
            }
          }
          return client.focus().then(() => client.navigate(targetUrl));
        }
        // Otherwise, open a new window
        return clients.openWindow(targetUrl);
      })
  );
});

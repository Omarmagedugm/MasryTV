importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const genLangConfig = {
  apiKey: "AIzaSyAHBnY47VrR4L4i9dRDhPdyYKE2GadvZAs",
  authDomain: "gen-lang-client-0195841357.firebaseapp.com",
  projectId: "gen-lang-client-0195841357",
  storageBucket: "gen-lang-client-0195841357.firebasestorage.app",
  messagingSenderId: "783975227149",
  appId: "1:783975227149:web:a222c629a5212da0d19a44"
};

const customConfig = {
  apiKey: "AIzaSyCI6aRv9HmUmnBS2zJRtWBHcabT_6hcGI0",
  authDomain: "masrytv-be1be.firebaseapp.com",
  projectId: "masrytv-be1be",
  storageBucket: "masrytv-be1be.appspot.com",
  messagingSenderId: "725960187583",
  appId: "1:725960187583:web:da952e463a8be708e0da41"
};

firebase.initializeApp(customConfig);

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

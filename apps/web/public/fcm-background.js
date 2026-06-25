try {
  importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-messaging-compat.js');
  importScripts('/firebase-messaging-config.js');

  if (self.FIREBASE_CONFIG?.apiKey) {
    firebase.initializeApp(self.FIREBASE_CONFIG);
    firebase.messaging().onBackgroundMessage((payload) => {
      const title = payload.data?.title || payload.notification?.title || 'Wab-infos';
      const body = payload.data?.body || payload.notification?.body || '';
      const url = payload.data?.url || self.FCM_DEFAULT_URL || '/';

      return self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { url },
        tag: self.FCM_NOTIFICATION_TAG || 'wab-fcm-notification',
      });
    });
  }
} catch {
  // Firebase non configuré — alertes push désactivées
}

try {
  importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');
  importScripts('/firebase-messaging-config.js');

  if (self.FIREBASE_CONFIG?.apiKey) {
    if (!firebase.apps.length) {
      firebase.initializeApp(self.FIREBASE_CONFIG);
    }
    firebase.messaging().onBackgroundMessage((payload) => {
      const title = payload.data?.title || payload.notification?.title || 'Wab Rédaction';
      const body = payload.data?.body || payload.notification?.body || '';
      const url = payload.data?.url || self.FCM_DEFAULT_URL || '/comments';

      return self.registration.showNotification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        data: { url },
        tag: self.FCM_NOTIFICATION_TAG || 'wab-redaction-notification',
      });
    });
  }
} catch (error) {
  console.error('[fcm-background]', error);
}

package com.wabinfos.app;

import android.util.Log;

import com.google.firebase.messaging.FirebaseMessaging;

/**
 * Abonne automatiquement l'appareil au topic "all_users" afin de recevoir
 * toutes les notifications de nouvelles publications sans avoir besoin de
 * gérer manuellement les tokens FCM individuels côté serveur.
 */
public class WabInfosFcmInit {

    private static final String TAG = "WabInfosFcmInit";
    public static final String TOPIC_ALL_USERS = "all_users";
    public static final String TOPIC_NEWS = "news";

    public static void subscribeToDefaultTopics() {
        try {
            FirebaseMessaging.getInstance().subscribeToTopic(TOPIC_ALL_USERS)
                    .addOnCompleteListener(task -> {
                        if (task.isSuccessful()) {
                            Log.d(TAG, "Abonné au topic " + TOPIC_ALL_USERS);
                        } else {
                            Log.w(TAG, "Échec abonnement topic " + TOPIC_ALL_USERS, task.getException());
                        }
                    });
            FirebaseMessaging.getInstance().subscribeToTopic(TOPIC_NEWS);
        } catch (Exception e) {
            Log.w(TAG, "Firebase Messaging indisponible: " + e.getMessage());
        }
    }
}

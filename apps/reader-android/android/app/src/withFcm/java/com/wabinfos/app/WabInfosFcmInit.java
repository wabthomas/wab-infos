package com.wabinfos.app;

import android.content.Context;
import android.util.Log;

import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.installations.FirebaseInstallations;
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

    public static void unsubscribeFromDefaultTopics() {
        try {
            FirebaseMessaging.getInstance().unsubscribeFromTopic(TOPIC_ALL_USERS);
            FirebaseMessaging.getInstance().unsubscribeFromTopic(TOPIC_NEWS);
            Log.d(TAG, "Désabonné des topics push");
        } catch (Exception e) {
            Log.w(TAG, "Désabonnement topics impossible: " + e.getMessage());
        }
    }

    public interface TokenCallback {
        void onResult(String token, String error);
    }

    /** Récupère le token FCM appareil (abonnement individuel côté rédaction). */
    public static void fetchDeviceToken(TokenCallback callback) {
        fetchDeviceToken(null, callback);
    }

    public static void fetchDeviceToken(Context context, TokenCallback callback) {
        requestToken(false, context, callback);
    }

    private static void requestToken(boolean afterReset, Context context, TokenCallback callback) {
        try {
            FirebaseMessaging.getInstance().getToken()
                    .addOnCompleteListener(task -> {
                        if (task.isSuccessful() && task.getResult() != null && !task.getResult().isEmpty()) {
                            callback.onResult(task.getResult(), null);
                            return;
                        }
                        Exception ex = task.getException();
                        String message = ex != null ? String.valueOf(ex.getMessage()) : "Token FCM vide";
                        Log.w(TAG, "getToken échoué: " + message, ex);
                        if (!afterReset && isFisAuthError(message)) {
                            resetInstallationsThenRetry(context, callback);
                            return;
                        }
                        callback.onResult(null, humanizeFisError(message));
                    });
        } catch (Exception e) {
            Log.w(TAG, "Firebase Messaging indisponible: " + e.getMessage());
            String message = e.getMessage() != null ? e.getMessage() : "Firebase indisponible";
            if (!afterReset && isFisAuthError(message)) {
                resetInstallationsThenRetry(context, callback);
                return;
            }
            callback.onResult(null, humanizeFisError(message));
        }
    }

    private static void resetInstallationsThenRetry(Context context, TokenCallback callback) {
        Log.w(TAG, "FIS_AUTH_ERROR — reset Firebase Installations puis nouvel essai");
        try {
            maybeReinitWithFallbackApiKey(context);
            FirebaseInstallations.getInstance().delete()
                    .addOnCompleteListener(deleteTask -> requestToken(true, context, callback));
        } catch (Exception e) {
            Log.w(TAG, "Reset installations impossible", e);
            requestToken(true, context, callback);
        }
    }

    /**
     * Si la clé Android du google-services.json est restreinte au package lecteur,
     * réessaie avec la clé Web (déjà publique dans l’app rédaction).
     */
    private static void maybeReinitWithFallbackApiKey(Context context) {
        if (context == null) return;
        String fallback = BuildConfig.FIREBASE_FALLBACK_API_KEY;
        if (fallback == null || fallback.isEmpty()) return;
        try {
            FirebaseApp app = FirebaseApp.getInstance();
            FirebaseOptions current = app.getOptions();
            if (fallback.equals(current.getApiKey())) return;
            String appId = current.getApplicationId();
            String projectId = current.getProjectId();
            String senderId = current.getGcmSenderId();
            if (appId == null || projectId == null) return;
            app.delete();
            FirebaseOptions options = new FirebaseOptions.Builder()
                    .setApplicationId(appId)
                    .setApiKey(fallback)
                    .setProjectId(projectId)
                    .setGcmSenderId(senderId != null ? senderId : "")
                    .build();
            FirebaseApp.initializeApp(context.getApplicationContext(), options);
            Log.w(TAG, "Firebase réinitialisé avec la clé API de repli");
        } catch (Exception e) {
            Log.w(TAG, "Reinit Firebase fallback impossible", e);
        }
    }

    private static boolean isFisAuthError(String message) {
        return message != null && message.toUpperCase().contains("FIS_AUTH");
    }

    private static String humanizeFisError(String message) {
        if (isFisAuthError(message)) {
            return "Firebase refuse l’app Android (clé API / SHA). "
                    + "Dans Google Cloud → Identifiants, ajoutez le package com.wabinfos.redaction "
                    + "et l’empreinte SHA-1 du keystore à la restriction Android de la clé API. "
                    + "Sinon désinstallez complètement l’APK puis réinstallez.";
        }
        return message != null ? message : "Token FCM indisponible";
    }
}

package com.wabinfos.app;

import android.content.Context;

/**
 * Version sans Firebase : ne fait rien, permet au reste du code de compiler
 * de la même manière que le flavor withFcm.
 */
public class WabInfosFcmInit {
    public static void subscribeToDefaultTopics() {
        // Pas de Firebase dans ce build.
    }

    public static void unsubscribeFromDefaultTopics() {
        // Pas de Firebase dans ce build.
    }

    public interface TokenCallback {
        void onResult(String token, String error);
    }

    public static void fetchDeviceToken(TokenCallback callback) {
        fetchDeviceToken(null, callback);
    }

    public static void fetchDeviceToken(Context context, TokenCallback callback) {
        callback.onResult(null, "Firebase non inclus dans ce build (noFcm)");
    }
}

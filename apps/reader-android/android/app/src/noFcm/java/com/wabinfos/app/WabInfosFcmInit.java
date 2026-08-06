package com.wabinfos.app;

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
}

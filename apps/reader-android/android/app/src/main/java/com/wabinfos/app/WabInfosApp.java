package com.wabinfos.app;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;

public class WabInfosApp extends Application {

    public static final String CHANNEL_ID = "wabinfos_notifications";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        WabInfosFcmInit.subscribeToDefaultTopics();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Actualités Wab-infos",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications de nouvelles publications sur Wab-infos");
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 250, 150, 250});
            channel.setShowBadge(true);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}

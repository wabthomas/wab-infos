package com.wabinfos.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Affichage classique (non plein écran) — aligné sur le comportement APK 1.0.2.
 */
public class MainActivity extends BridgeActivity {
    public static final String NEWS_CHANNEL_ID = "wab_infos_news";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdatePlugin.class);
        SplashScreen.installSplashScreen(this);
        createNewsNotificationChannel();
        super.onCreate(savedInstanceState);
        applyClassicWindowLayout();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyClassicWindowLayout();
    }

    private void applyClassicWindowLayout() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_NEVER;
        }
    }

    private void createNewsNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            NEWS_CHANNEL_ID,
            "Actualités Wab-infos",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Nouvelles publications et alertes");
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[] { 0, 300, 200, 300 });
        channel.enableLights(true);
        channel.setShowBadge(true);

        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .build();
        channel.setSound(sound, audioAttributes);

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}

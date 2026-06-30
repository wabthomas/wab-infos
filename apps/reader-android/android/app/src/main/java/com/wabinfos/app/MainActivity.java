package com.wabinfos.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public static final String NEWS_CHANNEL_ID = "wab_infos_news";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        createNewsNotificationChannel();
        super.onCreate(savedInstanceState);
        tuneWebViewForScroll();
    }

    @Override
    public void onResume() {
        super.onResume();
        tuneWebViewForScroll();
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

    private void tuneWebViewForScroll() {
        Bridge bridge = getBridge();
        if (bridge == null) {
            return;
        }

        WebView webView = bridge.getWebView();
        if (webView == null) {
            return;
        }

        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
    }
}

package com.wabinfos.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.capacitorjs.plugins.statusbar.StatusBar;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    public static final String NEWS_CHANNEL_ID = "wab_infos_news";
    private static final int STATUS_BAR_COLOR = Color.parseColor("#111111");
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private boolean safeAreaInjected = false;
    private boolean webViewListenerAttached = false;
    private StatusBar statusBarHelper;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdatePlugin.class);
        SplashScreen.installSplashScreen(this);
        createNewsNotificationChannel();
        super.onCreate(savedInstanceState);
        attachWebViewListener();
        applyStatusBarNative();
        scheduleStatusBarRefresh();
        tuneWebViewForScroll();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyStatusBarNative();
        tuneWebViewForScroll();
    }

    private void scheduleStatusBarRefresh() {
        mainHandler.post(this::applyStatusBarNative);
        mainHandler.postDelayed(this::applyStatusBarNative, 400);
        mainHandler.postDelayed(this::applyStatusBarNative, 1500);
        mainHandler.postDelayed(this::markNativeShellOnce, 600);
    }

    private void ensureStatusBarHelper() {
        if (statusBarHelper == null) {
            statusBarHelper = new StatusBar(this);
        }
    }

    @SuppressWarnings("deprecation")
    private void applyStatusBarNative() {
        View decorView = getWindow().getDecorView();

        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        getWindow().clearFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN
                | WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_NEVER;
        }

        try {
            ensureStatusBarHelper();
            statusBarHelper.setOverlaysWebView(false);
            statusBarHelper.setBackgroundColor(STATUS_BAR_COLOR);
            statusBarHelper.setStyle("DARK");
        } catch (Exception ignored) {
            getWindow().setStatusBarColor(STATUS_BAR_COLOR);
        }

        WindowInsetsControllerCompat insetsController =
            WindowCompat.getInsetsController(getWindow(), decorView);
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(false);
        }
    }

    private void attachWebViewListener() {
        if (webViewListenerAttached) {
            return;
        }

        Bridge bridge = getBridge();
        if (bridge == null) {
            return;
        }

        bridge.addWebViewListener(
            new WebViewListener() {
                @Override
                public void onPageStarted(WebView webView) {
                    safeAreaInjected = false;
                }

                @Override
                public void onPageLoaded(WebView webView) {
                    applyStatusBarNative();
                    markNativeShellOnce();
                }
            }
        );
        webViewListenerAttached = true;
    }

    private int getSystemBarHeight(String name) {
        int id = getResources().getIdentifier(name, "dimen", "android");
        return id > 0 ? getResources().getDimensionPixelSize(id) : 0;
    }

    private void markNativeShellOnce() {
        if (safeAreaInjected) {
            return;
        }

        Bridge bridge = getBridge();
        if (bridge == null) {
            return;
        }

        WebView webView = bridge.getWebView();
        if (webView == null) {
            return;
        }

        int bottom = getSystemBarHeight("navigation_bar_height");
        String script =
            "(function(){"
                + "var r=document.documentElement,b="
                + bottom
                + ";"
                + "r.classList.add('native-capacitor');"
                + "if(b>0){r.style.setProperty('--cap-safe-bottom',b+'px');r.classList.add('cap-insets-ready');}"
                + "document.body.style.paddingTop='';"
                + "})();";
        webView.evaluateJavascript(script, null);
        safeAreaInjected = true;
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
        attachWebViewListener();
        markNativeShellOnce();
    }
}

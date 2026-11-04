package com.wabinfos.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.content.ContentValues;
import android.content.Intent;
import android.Manifest;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.animation.AnimationUtils;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.auth.api.signin.GoogleSignInStatusCodes;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.CommonStatusCodes;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import org.json.JSONObject;

public class MainActivity extends AppCompatActivity {

    private static final String SITE_URL = BuildConfig.SITE_URL;
    private static final String REDACTION_SITE_URL = "https://app.wab-infos.com";
    private static final int PERMISSION_REQUEST_CODE = 4321;
    private static final int PUSH_PERMISSION_REQUEST_CODE = 4322;
    private static final int SAVE_FILE_REQUEST_CODE = 4323;
    private static final int MAX_NATIVE_FILE_BYTES = 25 * 1024 * 1024;

    private View rootLayout;
    private WebView webView;
    private MediaPlayer rhVoicePlayer;
    private SwipeRefreshLayout swipeRefresh;
    private ProgressBar progressBar;
    private View offlineLayout;
    private View launchOverlay;
    private boolean launchOverlayDismissed = false;
    /** Mis ÃƒÆ’Ã‚Â  jour par le JS de la page (conteneurs internes type #redaction-main-scroll). */
    private volatile boolean webCanScrollUp = false;

    // Gestion de l'upload de fichiers depuis le WebView (<input type="file">)
    private ValueCallback<Uri[]> filePathCallback;
    private String cameraPhotoPath;
    private byte[] pendingSaveFileBytes;
    private ActivityResultLauncher<Intent> fileChooserLauncher;
    private ActivityResultLauncher<Intent> googleSignInLauncher;
    private GoogleSignInClient googleSignInClient;
    private String pendingGoogleCompleteUrl;
    private boolean pendingGoogleRemember = true;
    private String defaultWebViewUserAgent;
    private boolean googleOAuthChromeUaActive = false;
    private String lastRequestedUrl = SITE_URL;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable offlineReconnectRunnable = new Runnable() {
        @Override
        public void run() {
            if (offlineLayout == null || offlineLayout.getVisibility() != View.VISIBLE) {
                return;
            }
            if (isOnline()) {
                hideOffline();
                loadUrlInWebView(lastRequestedUrl);
                return;
            }
            mainHandler.postDelayed(this, 5000);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        // SDK 36 : edge-to-edge obligatoire ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â on insette le contenu sous les barres systÃƒÆ’Ã‚Â¨me.
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);
        rootLayout = findViewById(R.id.rootLayout);
        applySystemBarInsets();
        ensureSystemBarsVisible();

        webView = findViewById(R.id.webView);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        progressBar = findViewById(R.id.progressBar);
        offlineLayout = findViewById(R.id.offlineLayout);
        launchOverlay = findViewById(R.id.launchOverlay);
        Button retryButton = findViewById(R.id.retryButton);

        playLaunchOverlayEntrance();
        registerFileChooserLauncher();
        registerGoogleSignInLauncher();
        setupWebView();
        requestRuntimePermissionsIfNeeded();

        configurePullToRefresh();

        swipeRefresh.setOnRefreshListener(() -> {
            if (isOnline()) {
                webView.reload();
            } else {
                swipeRefresh.setRefreshing(false);
                showOffline();
            }
        });

        retryButton.setOnClickListener(v -> {
            if (isOnline()) {
                hideOffline();
                loadUrlInWebView(lastRequestedUrl);
            }
        });

        UpdateManager.bindActivity(this);
        UpdateManager.registerPlayInAppUpdates(this);
        // Toast Ãƒâ€šÃ‚Â« ÃƒÆ’Ã‚Â  jour Ãƒâ€šÃ‚Â» uniquement au froid (ÃƒÆ’Ã‚Â©vite doublon onResume).
        UpdateManager.showUpdatedToastIfNeeded(this);
        // Sideload : le bandeau web (NativeAppUpdate) gÃƒÆ’Ã‚Â¨re la MAJ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â©vite 2 dialogues.
        // Play Store : on garde la vÃƒÆ’Ã‚Â©rif native in-app.
        mainHandler.postDelayed(() -> {
            if (UpdateManager.shouldUsePlayStoreUpdate(MainActivity.this)) {
                UpdateManager.checkForUpdate(MainActivity.this);
            }
        }, 2800);

        String targetUrl = resolveTargetUrl(getIntent());
        if (isOnline()) {
            loadUrlInWebView(targetUrl);
        } else {
            lastRequestedUrl = targetUrl;
            showOffline();
        }

    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String targetUrl = resolveTargetUrl(intent);
        if (isOnline()) {
            loadUrlInWebView(targetUrl);
        } else {
            lastRequestedUrl = targetUrl;
            showOffline();
        }
    }

    private String resolveTargetUrl(Intent intent) {
        if (intent == null) return SITE_URL;
        String extraUrl = firstNotificationUrl(intent);
        if (extraUrl != null && !extraUrl.isEmpty()) {
            return sanitizeDeepLinkUrl(extraUrl);
        }
        Uri data = intent.getData();
        if (data != null) {
            String scheme = data.getScheme();
            if ("wabinfos".equalsIgnoreCase(scheme)) {
                // wabinfos://article/<category>/<slug>  ou  wabinfos://article?url=https://...
                String queryUrl = data.getQueryParameter("url");
                if (queryUrl != null && !queryUrl.isEmpty()) {
                    return sanitizeDeepLinkUrl(queryUrl);
                }
                String path = data.getPath();
                if (path != null && path.length() > 1) {
                    return sanitizeDeepLinkUrl(SITE_URL + (path.startsWith("/") ? path : "/" + path));
                }
                List<String> segments = data.getPathSegments();
                if (segments != null && segments.size() >= 2) {
                    return sanitizeDeepLinkUrl(SITE_URL + "/" + segments.get(0) + "/" + segments.get(1));
                }
                return SITE_URL;
            }
            return sanitizeDeepLinkUrl(data.toString());
        }
        return SITE_URL;
    }

    /**
     * FCM (barre systÃƒÆ’Ã‚Â¨me, app en fond) passe le data payload en extras
     * ({@code url}), pas {@code open_url} (utilisÃƒÆ’Ã‚Â© par notre FcmService).
     */
    private String firstNotificationUrl(Intent intent) {
        String[] keys = new String[] { "open_url", "url", "link" };
        for (String key : keys) {
            String value = intent.getStringExtra(key);
            if (value != null && !value.trim().isEmpty()) {
                return value.trim();
            }
        }
        Bundle extras = intent.getExtras();
        if (extras == null) return null;
        for (String key : extras.keySet()) {
            Object value = extras.get(key);
            if (!(value instanceof String)) continue;
            String text = ((String) value).trim();
            if ((text.startsWith("https://") || text.startsWith("http://"))
                    && text.toLowerCase(Locale.ROOT).contains("wab-infos.com")) {
                return text;
            }
            if (text.startsWith("/") && text.length() > 2 && text.indexOf('/', 1) > 0) {
                return text;
            }
        }
        return null;
    }

    /** Normalise www ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ apex et refuse les hÃƒÆ’Ã‚Â´tes hors domaine. */
    private String sanitizeDeepLinkUrl(String raw) {
        if (raw == null || raw.isEmpty()) return SITE_URL;
        try {
            Uri uri = Uri.parse(raw);
            String host = uri.getHost();
            if (host == null) return SITE_URL;
            String lower = host.toLowerCase(Locale.ROOT);
            if (!lower.equals("wab-infos.com")
                    && !lower.equals("www.wab-infos.com")
                    && !lower.endsWith(".wab-infos.com")) {
                return SITE_URL;
            }
            if ("www.wab-infos.com".equals(lower)) {
                return uri.buildUpon().authority("wab-infos.com").build().toString();
            }
            return uri.toString();
        } catch (Exception ignored) {
            return SITE_URL;
        }
    }

    private void playLaunchOverlayEntrance() {
        if (launchOverlay == null) return;
        View logo = launchOverlay.findViewById(R.id.launchLogo);
        View title = launchOverlay.findViewById(R.id.launchTitle);
        View tagline = launchOverlay.findViewById(R.id.launchTagline);
        View progress = launchOverlay.findViewById(R.id.launchProgress);

        if (logo != null) logo.startAnimation(AnimationUtils.loadAnimation(this, R.anim.launch_logo_in));
        if (title != null) title.startAnimation(AnimationUtils.loadAnimation(this, R.anim.launch_text_in));
        if (tagline != null) tagline.startAnimation(AnimationUtils.loadAnimation(this, R.anim.launch_text_in));
        if (progress != null) progress.startAnimation(AnimationUtils.loadAnimation(this, R.anim.launch_text_in));

        // Filet de sÃƒÆ’Ã‚Â©curitÃƒÆ’Ã‚Â© : si la page met trop de temps, on masque quand mÃƒÆ’Ã‚Âªme
        // l'overlay aprÃƒÆ’Ã‚Â¨s un dÃƒÆ’Ã‚Â©lai maximum pour ne jamais bloquer l'utilisateur.
        launchOverlay.postDelayed(this::dismissLaunchOverlay, 6000);
    }

    private void dismissLaunchOverlay() {
        if (launchOverlay == null || launchOverlayDismissed) return;
        launchOverlayDismissed = true;
        android.view.animation.Animation anim = AnimationUtils.loadAnimation(this, R.anim.launch_overlay_out);
        anim.setAnimationListener(new android.view.animation.Animation.AnimationListener() {
            @Override public void onAnimationStart(android.view.animation.Animation animation) {}
            @Override public void onAnimationEnd(android.view.animation.Animation animation) {
                launchOverlay.setVisibility(View.GONE);
            }
            @Override public void onAnimationRepeat(android.view.animation.Animation animation) {}
        });
        launchOverlay.startAnimation(anim);
    }

    private void configurePullToRefresh() {
        swipeRefresh.setColorSchemeResources(R.color.brand_primary);
        swipeRefresh.setProgressBackgroundColorSchemeResource(android.R.color.white);
        swipeRefresh.setDistanceToTriggerSync((int) (getResources().getDisplayMetrics().density * 120));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            swipeRefresh.setOnChildScrollUpCallback((parent, child) -> canWebContentScrollUp());
        }
    }

    private boolean canWebContentScrollUp() {
        return webCanScrollUp || webView.getScrollY() > 0 || webView.canScrollVertically(-1);
    }

    private void requestRuntimePermissionsIfNeeded() {
        List<String> toRequest = new ArrayList<>();
        toRequest.add(android.Manifest.permission.CAMERA);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            toRequest.add(android.Manifest.permission.POST_NOTIFICATIONS);
            // Galerie via ACTION_GET_CONTENT ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â pas besoin de READ_MEDIA_* (Play Policy).
        } else if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
            toRequest.add(android.Manifest.permission.READ_EXTERNAL_STORAGE);
            toRequest.add(android.Manifest.permission.WRITE_EXTERNAL_STORAGE);
        }

        List<String> missing = new ArrayList<>();
        for (String permission : toRequest) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                missing.add(permission);
            }
        }
        if (!missing.isEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    private boolean areSystemNotificationsEnabled() {
        return androidx.core.app.NotificationManagerCompat.from(this).areNotificationsEnabled();
    }

    private boolean hasPostNotificationsPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return true;
        }
        return ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
    }

    /** granted | denied | prompt ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â exposÃƒÆ’Ã‚Â© au site via AndroidBridge. */
    private String resolvePushPermissionStatus() {
        if (!hasPostNotificationsPermission()) {
            return "prompt";
        }
        if (!areSystemNotificationsEnabled()) {
            return "denied";
        }
        return "granted";
    }

    private void notifyWebPushPermissionResult(boolean granted) {
        if (webView == null) return;
        String js =
                "window.dispatchEvent(new CustomEvent('wab-android-push-permission',{detail:{granted:"
                        + (granted ? "true" : "false")
                        + "}}));";
        webView.evaluateJavascript(js, null);
    }

    private void notifyWebFcmToken(String token, String error) {
        if (webView == null) return;
        org.json.JSONObject detail = new org.json.JSONObject();
        try {
            if (token != null && !token.isEmpty()) {
                detail.put("token", token);
            }
            if (error != null && !error.isEmpty()) {
                detail.put("error", error);
            }
        } catch (Exception e) {
            Log.w("WabInfos", "notifyWebFcmToken JSON", e);
        }
        String js =
                "window.dispatchEvent(new CustomEvent('wab-android-fcm-token',{detail:"
                        + detail
                        + "}));";
        webView.evaluateJavascript(js, null);
    }

    private void fetchFcmTokenForWeb() {
        WabInfosFcmInit.fetchDeviceToken(this, (token, error) ->
                runOnUiThread(() -> notifyWebFcmToken(token, error)));
    }

    private boolean isRedactionProduct() {
        return "com.wabinfos.redaction".equals(getPackageName());
    }

    private void requestPushPermissionFromWeb() {
        if (hasPostNotificationsPermission() && areSystemNotificationsEnabled()) {
            if (!isRedactionProduct()) {
                WabInfosFcmInit.subscribeToDefaultTopics();
            }
            notifyWebPushPermissionResult(true);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && !hasPostNotificationsPermission()) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                    PUSH_PERMISSION_REQUEST_CODE
            );
            return;
        }

        // Permission runtime OK mais notifications systÃƒÆ’Ã‚Â¨me coupÃƒÆ’Ã‚Â©es ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ouvrir les rÃƒÆ’Ã‚Â©glages app.
        try {
            Intent intent = new Intent();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent.setAction(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, getPackageName());
            } else {
                intent.setAction(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getPackageName()));
            }
            startActivity(intent);
        } catch (Exception e) {
            Log.w("WabInfos", "Impossible d'ouvrir les rÃƒÆ’Ã‚Â©glages notifications", e);
        }
        notifyWebPushPermissionResult(areSystemNotificationsEnabled());
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != PUSH_PERMISSION_REQUEST_CODE) {
            return;
        }
        boolean granted = grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED
                && areSystemNotificationsEnabled();
        if (granted) {
            WabInfosFcmInit.subscribeToDefaultTopics();
        }
        notifyWebPushPermissionResult(granted);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setUserAgentString(
                settings.getUserAgentString() + " " + BuildConfig.UA_MARKER + "/" + BuildConfig.VERSION_NAME
        );
        defaultWebViewUserAgent = settings.getUserAgentString();
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // --- Optimisations de fluiditÃƒÆ’Ã‚Â© et de vitesse ---
        settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
        settings.setOffscreenPreRaster(true);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        WebView.setWebContentsDebuggingEnabled(false);
        try {
            WebView.enableSlowWholeDocumentDraw();
        } catch (Throwable ignored) {
        }
        // Cookies persistants (connexion, prÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences) et acceptÃƒÆ’Ã‚Â©s y compris multi-domaines (CDN images)
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // Pont JavaScript : partage natif depuis le site (window.AndroidBridge.share(...))
        webView.addJavascriptInterface(new NativeBridge(), "AndroidBridge");

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) ->
                startNativeDownload(url, userAgent, contentDisposition, mimeType));

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                Uri parsed = Uri.parse(url);
                String host = parsed.getHost();
                if (isNativeGoogleStartUrl(parsed)) {
                    // preferWeb=1 ou app sans Google natif ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ OAuth dans la WebView (UA Chrome).
                    if ("1".equals(parsed.getQueryParameter("preferWeb")) || !BuildConfig.USE_NATIVE_GOOGLE) {
                        beginGoogleOAuthInWebView(url);
                        return true;
                    }
                    startNativeGoogleSignIn(true);
                    return true;
                }
                if (isGoogleOAuthCallbackUrl(parsed)) {
                    String sanitized = sanitizeGoogleOAuthCallbackUrl(parsed);
                    if (sanitized != null) {
                        view.loadUrl(sanitized);
                        return true;
                    }
                }
                // Pendant la connexion Google : rester dans lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢APK (ne pas ouvrir Chrome).
                if (googleOAuthChromeUaActive) {
                    String scheme = parsed.getScheme();
                    if (scheme != null
                            && !"http".equalsIgnoreCase(scheme)
                            && !"https".equalsIgnoreCase(scheme)) {
                        return true; // ignore intent:/market: pendant OAuth
                    }
                    return false;
                }
                if (isGoogleOAuthHost(host)) {
                    return false;
                }
                if (url.startsWith(SITE_URL) || (host != null && host.endsWith("wab-infos.com"))) {
                    return false;
                }
                // Liens externes : ouvrir dans le navigateur du systÃƒÆ’Ã‚Â¨me
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, parsed);
                    startActivity(intent);
                } catch (Exception ignored) {
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url != null && !url.isEmpty()) {
                    lastRequestedUrl = url;
                }
                maybeRestoreDefaultUserAgent(url);
                swipeRefresh.setRefreshing(false);
                progressBar.setVisibility(View.GONE);
                if (isOnline()) {
                    hideOffline();
                }
                injectNativeShareBridge(view);
                injectStatusBarColorSync(view);
                injectPullRefreshScrollSync(view);
                dismissLaunchOverlay();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request == null || !request.isForMainFrame()) return;
                runOnUiThread(MainActivity.this::showOffline);
            }

            @Override
            @SuppressWarnings("deprecation")
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) return;
                runOnUiThread(MainActivity.this::showOffline);
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                super.onReceivedHttpError(view, request, errorResponse);
                if (request == null || !request.isForMainFrame() || errorResponse == null) return;
                int statusCode = errorResponse.getStatusCode();
                if (statusCode == 502 || statusCode == 503 || statusCode == 504) {
                    runOnUiThread(MainActivity.this::showOffline);
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback,
                                              FileChooserParams fileChooserParams) {
                // LibÃƒÆ’Ã‚Â¨re un ÃƒÆ’Ã‚Â©ventuel callback prÃƒÆ’Ã‚Â©cÃƒÆ’Ã‚Â©dent restÃƒÆ’Ã‚Â© en attente (ÃƒÆ’Ã‚Â©vite les blocages
                // si l'utilisateur ouvre plusieurs fois le sÃƒÆ’Ã‚Â©lecteur de fichiers rapidement).
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                    filePathCallback = null;
                }
                filePathCallback = callback;
                try {
                    Intent chooserIntent = buildFileChooserIntent(fileChooserParams);
                    fileChooserLauncher.launch(chooserIntent);
                } catch (Exception e) {
                    Log.e("WabInfos", "onShowFileChooser: ÃƒÆ’Ã‚Â©chec ouverture du sÃƒÆ’Ã‚Â©lecteur", e);
                    filePathCallback = null;
                    Toast.makeText(MainActivity.this,
                            "Impossible d'ouvrir le sÃƒÆ’Ã‚Â©lecteur de fichiers", Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });
    }

    /** Combine prise de photo directe + sÃƒÆ’Ã‚Â©lecteur de fichiers/galerie dans un seul chooser. */
    private Intent buildFileChooserIntent(WebChromeClient.FileChooserParams params) {
        cameraPhotoPath = null;
        Intent takePictureIntent = tryBuildCameraIntent();

        Intent contentSelectionIntent = new Intent(Intent.ACTION_GET_CONTENT);
        contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
        boolean allowMultiple = params != null && params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE;
        contentSelectionIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, allowMultiple);
        String[] acceptTypes = params != null ? params.getAcceptTypes() : null;
        if (acceptTypes != null && acceptTypes.length > 0 && !acceptTypes[0].isEmpty()) {
            contentSelectionIntent.setType(acceptTypes[0]);
        } else {
            contentSelectionIntent.setType("*/*");
        }

        Intent[] intentArray = (takePictureIntent != null)
                ? new Intent[]{takePictureIntent}
                : new Intent[]{};

        Intent chooserIntent = new Intent(Intent.ACTION_CHOOSER);
        chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent);
        chooserIntent.putExtra(Intent.EXTRA_TITLE, "Choisir un fichier");
        chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, intentArray);
        return chooserIntent;
    }

    /**
     * PrÃƒÆ’Ã‚Â©pare l'intent de prise de photo directe. Toute erreur ici (permission camÃƒÆ’Ã‚Â©ra
     * manquante, FileProvider mal configurÃƒÆ’Ã‚Â©, etc.) est absorbÃƒÆ’Ã‚Â©e sans jamais empÃƒÆ’Ã‚Âªcher
     * l'ouverture du sÃƒÆ’Ã‚Â©lecteur de fichiers/galerie, qui doit toujours fonctionner.
     */
    private Intent tryBuildCameraIntent() {
        try {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.CAMERA)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.w("WabInfos", "tryBuildCameraIntent: permission camÃƒÆ’Ã‚Â©ra non accordÃƒÆ’Ã‚Â©e, option camÃƒÆ’Ã‚Â©ra masquÃƒÆ’Ã‚Â©e");
                return null;
            }
            Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            if (takePictureIntent.resolveActivity(getPackageManager()) == null) {
                return null;
            }
            File photoFile = createImageFile();
            cameraPhotoPath = "file:" + photoFile.getAbsolutePath();
            Uri photoUri = FileProvider.getUriForFile(this,
                    getPackageName() + ".fileprovider", photoFile);
            takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri);
            takePictureIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            return takePictureIntent;
        } catch (Exception e) {
            Log.w("WabInfos", "tryBuildCameraIntent: option camÃƒÆ’Ã‚Â©ra indisponible, on continue avec la galerie seule", e);
            cameraPhotoPath = null;
            return null;
        }
    }

    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        return File.createTempFile("IMG_" + timeStamp, ".jpg", storageDir);
    }

    private void registerFileChooserLauncher() {
        fileChooserLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (filePathCallback == null) return;

                    Uri[] results = null;
                    if (result.getResultCode() == Activity.RESULT_OK) {
                        Intent data = result.getData();
                        if (data == null || (data.getData() == null && data.getClipData() == null)) {
                            // Aucune sÃƒÆ’Ã‚Â©lection de fichier : c'est probablement une photo prise ÃƒÆ’Ã‚Â  l'instant
                            if (cameraPhotoPath != null) {
                                results = new Uri[]{Uri.parse(cameraPhotoPath)};
                            }
                        } else if (data.getClipData() != null) {
                            // SÃƒÆ’Ã‚Â©lection multiple de fichiers
                            int count = data.getClipData().getItemCount();
                            results = new Uri[count];
                            for (int i = 0; i < count; i++) {
                                results[i] = data.getClipData().getItemAt(i).getUri();
                            }
                        } else if (data.getData() != null) {
                            results = new Uri[]{data.getData()};
                        }
                    }
                    filePathCallback.onReceiveValue(results);
                    filePathCallback = null;
                });
    }

    private void registerGoogleSignInLauncher() {
        googleSignInLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (googleSignInClient == null) {
                        return;
                    }
                    try {
                        GoogleSignInAccount account = GoogleSignIn
                                .getSignedInAccountFromIntent(result.getData())
                                .getResult(ApiException.class);
                        String authCode = account != null ? account.getServerAuthCode() : null;
                        if (authCode == null || authCode.isEmpty() || pendingGoogleCompleteUrl == null || pendingGoogleCompleteUrl.isEmpty()) {
                            throw new IllegalStateException("Code Google manquant");
                        }

                        String completeUrl = pendingGoogleCompleteUrl
                                + "?code=" + URLEncoder.encode(authCode, "UTF-8")
                                + "&remember=" + (pendingGoogleRemember ? "1" : "0");
                        loadUrlInWebView(completeUrl);
                    } catch (ApiException e) {
                        progressBar.setVisibility(View.GONE);
                        int status = e.getStatusCode();
                        // Annulation utilisateur : ne pas forcer le repli web.
                        if (status == GoogleSignInStatusCodes.SIGN_IN_CANCELLED
                                || status == CommonStatusCodes.CANCELED) {
                            Toast.makeText(MainActivity.this, "Connexion Google annulÃƒÆ’Ã‚Â©e", Toast.LENGTH_SHORT).show();
                            return;
                        }
                        // Ex. DEVELOPER_ERROR (10) si le package nÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢est pas enregistrÃƒÆ’Ã‚Â© dans Google Cloud.
                        Log.w("WabInfos", "Google Sign-In natif ÃƒÆ’Ã‚Â©chouÃƒÆ’Ã‚Â© (status=" + status + "), repli web", e);
                        fallbackGoogleWebSignIn(resolveRedactionBaseUrl(webView != null ? webView.getUrl() : null));
                    } catch (Exception e) {
                        Log.w("WabInfos", "Google Sign-In natif impossible, repli web", e);
                        progressBar.setVisibility(View.GONE);
                        fallbackGoogleWebSignIn(resolveRedactionBaseUrl(webView != null ? webView.getUrl() : null));
                    }
                });
    }

    private void startNativeDownload(String url, String userAgent, String contentDisposition, String mimeType) {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P
                && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 7311);
            Toast.makeText(this, "Autorisez le stockage pour tÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©charger, puis rÃƒÆ’Ã‚Â©essayez.", Toast.LENGTH_LONG).show();
            return;
        }
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setMimeType(mimeType);
            String cookies = CookieManager.getInstance().getCookie(url);
            if (cookies != null && !cookies.isEmpty()) request.addRequestHeader("cookie", cookies);
            request.addRequestHeader("User-Agent", userAgent);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
            request.allowScanningByMediaScanner();

            DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            if (dm != null) {
                dm.enqueue(request);
                Toast.makeText(this, "TÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©chargement dÃƒÆ’Ã‚Â©marrÃƒÆ’Ã‚Â© : " + fileName, Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            Toast.makeText(this, "Impossible de dÃƒÆ’Ã‚Â©marrer le tÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©chargement", Toast.LENGTH_SHORT).show();
        }
    }

    private void promptSaveNativeFile(byte[] bytes, String fileName, String mimeType) {
        if (bytes == null || bytes.length == 0 || bytes.length > MAX_NATIVE_FILE_BYTES) {
            Toast.makeText(this, "Fichier vide ou trop volumineux (maximum 25 Mo).", Toast.LENGTH_LONG).show();
            return;
        }
        pendingSaveFileBytes = bytes;
        String safeName = fileName == null ? "document.pdf" : fileName
                .replace('/', '_').replace('\\', '_').replace(':', '_')
                .replace('*', '_').replace('?', '_').replace('"', '_')
                .replace('<', '_').replace('>', '_').replace('|', '_');
        if (safeName.trim().isEmpty()) safeName = "document.pdf";
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType == null || mimeType.isEmpty() ? "application/octet-stream" : mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, safeName);
        try {
            Toast.makeText(this, "Choisissez oÃƒÆ’Ã‚Â¹ enregistrer le fichier.", Toast.LENGTH_SHORT).show();
            startActivityForResult(intent, SAVE_FILE_REQUEST_CODE);
        } catch (Exception error) {
            pendingSaveFileBytes = null;
            Toast.makeText(this, "Le sÃƒÆ’Ã‚Â©lecteur de fichiers Android nÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢est pas disponible.", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != SAVE_FILE_REQUEST_CODE) return;
        byte[] bytes = pendingSaveFileBytes;
        pendingSaveFileBytes = null;
        Uri destination = data == null ? null : data.getData();
        if (resultCode != Activity.RESULT_OK || destination == null || bytes == null) return;
        try (OutputStream output = getContentResolver().openOutputStream(destination, "w")) {
            if (output == null) throw new IOException("Ouverture du fichier impossible");
            output.write(bytes);
            output.flush();
            Toast.makeText(this, "Fichier enregistrÃƒÆ’Ã‚Â©.", Toast.LENGTH_SHORT).show();
        } catch (Exception error) {
            Log.e("WabInfos", "ÃƒÆ’Ã¢â‚¬Â°chec de lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢enregistrement du fichier", error);
            Toast.makeText(this, "Impossible dÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢enregistrer le fichier.", Toast.LENGTH_LONG).show();
        }
    }

    private void printCurrentWebView() {
        runOnUiThread(() -> {
            if (webView == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.KITKAT) {
                Toast.makeText(this, "LÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢impression nÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢est pas disponible sur cet appareil.", Toast.LENGTH_LONG).show();
                return;
            }
            try {
                PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                if (printManager == null) throw new IllegalStateException("Service dÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢impression indisponible");
                PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter("Wab-infos-RH");
                PrintAttributes attributes = new PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                        .setResolution(new PrintAttributes.Resolution("wabinfos", "Wab-infos", 300, 300))
                        .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                        .build();
                printManager.print("Wab-infos-RH", adapter, attributes);
            } catch (Exception error) {
                Log.e("WabInfos", "Impossible dÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ouvrir lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢impression Android", error);
                Toast.makeText(this, "Impossible dÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ouvrir lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢impression Android.", Toast.LENGTH_LONG).show();
            }
        });
    }

    /**
     * Redirige l'API Web standard navigator.share() vers le partage natif Android,
     * pour que les boutons "Partager" du site fonctionnent sans code spÃƒÆ’Ã‚Â©cifique.
     */
    private void injectNativeShareBridge(WebView view) {
        String script =
                "(function(){" +
                "  if (!window.AndroidBridge) return;" +
                "  navigator.share = function(data){" +
                "    try {" +
                "      var title = (data && data.title) || document.title || '';" +
                "      var text = (data && data.text) || '';" +
                "      var url = (data && data.url) || location.href;" +
                "      window.AndroidBridge.share(title, text, url);" +
                "      return Promise.resolve();" +
                "    } catch (e) { return Promise.reject(e); }" +
                "  };" +
                "  var originalPrint = window.print ? window.print.bind(window) : null;" +
                "  window.print = function(){" +
                "    try { if (window.AndroidBridge.printPage) { window.AndroidBridge.printPage(); return; } } catch (e) {}" +
                "    if (originalPrint) originalPrint();" +
                "  };" +
                "})();";
        view.evaluateJavascript(script, null);
    }

    /**
     * DÃƒÆ’Ã‚Â©termine la couleur de thÃƒÆ’Ã‚Â¨me rÃƒÆ’Ã‚Â©ellement appliquÃƒÆ’Ã‚Â©e par le site en lisant l'ÃƒÆ’Ã‚Â©tat
     * visuel effectif de la page (classe "dark"/"light" posÃƒÆ’Ã‚Â©e par next-themes sur <html>,
     * qui reflÃƒÆ’Ã‚Â¨te aussi bien le choix manuel de l'utilisateur que le mode systÃƒÆ’Ã‚Â¨me),
     * puis l'applique ÃƒÆ’Ã‚Â  la barre de statut Android avec des icÃƒÆ’Ã‚Â´nes claires ou sombres
     * choisies automatiquement selon la luminositÃƒÆ’Ã‚Â© de cette couleur pour rester lisible.
     */
    /**
     * Synchronise l'ÃƒÆ’Ã‚Â©tat de scroll avec SwipeRefreshLayout : fenÃƒÆ’Ã‚Âªtre + conteneurs internes
     * (rÃƒÆ’Ã‚Â©daction #redaction-main-scroll, ÃƒÆ’Ã‚Â©diteur, etc.) pour ne pas bloquer le scroll.
     */
    private void injectPullRefreshScrollSync(WebView view) {
        String script =
                "(function(){" +
                "  if (window.__wabInfosPullRefreshSync) return;" +
                "  window.__wabInfosPullRefreshSync = true;" +
                "  var roots = ['#redaction-main-scroll', '.jetpack-editor-scroll'];" +
                "  function computeCanScrollUp() {" +
                "    if (document.documentElement && document.documentElement.classList.contains('redaction-writing')) return true;" +
                "    if (document.querySelector('.jetpack-editor-screen')) return true;" +
                "    if (window.scrollY > 2) return true;" +
                "  if (document.documentElement && document.documentElement.scrollTop > 2) return true;" +
                "    for (var i = 0; i < roots.length; i++) {" +
                "      var el = document.querySelector(roots[i]);" +
                "      if (el && el.scrollTop > 2) return true;" +
                "    }" +
                "    return false;" +
                "  }" +
                "  function notify() {" +
                "    if (!window.AndroidBridge || !window.AndroidBridge.setWebCanScrollUp) return;" +
                "    try { window.AndroidBridge.setWebCanScrollUp(computeCanScrollUp()); } catch (e) {}" +
                "  }" +
                "  document.addEventListener('scroll', notify, true);" +
                "  window.addEventListener('scroll', notify, { passive: true });" +
                "  window.addEventListener('touchstart', notify, { passive: true });" +
                "  window.addEventListener('touchend', notify, { passive: true });" +
                "  new MutationObserver(notify).observe(document.documentElement, { childList: true, subtree: true });" +
                "  notify();" +
                "})();";
        view.evaluateJavascript(script, null);
    }

    private void injectStatusBarColorSync(WebView view) {
        String script =
                "(function(){" +
                "  if (!window.AndroidBridge) return '';" +
                "  var root = document.documentElement;" +
                "  var isDark = root.classList.contains('dark') || root.getAttribute('data-theme') === 'dark';" +
                "  var wantedMedia = isDark ? 'dark' : 'light';" +
                "  var metas = document.querySelectorAll('meta[name=\"theme-color\"]');" +
                "  var fallback = '', match = '';" +
                "  for (var i = 0; i < metas.length; i++) {" +
                "    var media = metas[i].getAttribute('media') || '';" +
                "    var content = metas[i].getAttribute('content');" +
                "    if (!media) { fallback = content; continue; }" +
                "    if (media.indexOf('prefers-color-scheme: ' + wantedMedia) !== -1) match = content;" +
                "  }" +
                "  return match || fallback;" +
                "})();";
        view.evaluateJavascript(script, value -> {
            if (value == null) return;
            String color = value.replace("\"", "");
            if (color.isEmpty() || "null".equals(color)) return;
            runOnUiThread(() -> applyStatusBarColor(color));
        });

        // Observe les changements de classe sur <html> (bascule manuelle du thÃƒÆ’Ã‚Â¨me sur le
        // site, ou changement systÃƒÆ’Ã‚Â¨me) pour resynchroniser la barre de statut en direct,
        // sans attendre un rechargement de page.
        String observerScript =
                "(function(){" +
                "  if (window.__wabInfosThemeObserverAttached) return;" +
                "  window.__wabInfosThemeObserverAttached = true;" +
                "  var notify = function(){ if (window.AndroidBridge) { window.AndroidBridge.requestStatusBarSync(); } };" +
                "  var observer = new MutationObserver(notify);" +
                "  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });" +
                "  var mq = window.matchMedia('(prefers-color-scheme: dark)');" +
                "  if (mq.addEventListener) mq.addEventListener('change', notify);" +
                "  else if (mq.addListener) mq.addListener(notify);" +
                "})();";
        view.evaluateJavascript(observerScript, null);
    }

    /**
     * SDK 36 impose le edge-to-edge (plus dÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢opt-out). On pad le layout racine avec
     * les insets statut / navigation / cutout pour que la WebView ne passe pas
     * sous la barre de notification.
     * LÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢IME nÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢est PAS paddÃƒÆ’Ã‚Â© ici : adjustResize + visualViewport JS gÃƒÆ’Ã‚Â¨rent le clavier
     * (sinon double offset et barre dÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢outils instable dans la rÃƒÆ’Ã‚Â©daction).
     */
    private void applySystemBarInsets() {
        if (rootLayout == null) return;
        ViewCompat.setOnApplyWindowInsetsListener(rootLayout, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars()
                            | WindowInsetsCompat.Type.displayCutout()
            );
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);

            Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            // La WebView est dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  paddÃƒÆ’Ã‚Â©e des system bars : ne pas recompter la nav
            // (sinon un trou entre barre dÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢outils et clavier).
            final int imeForWeb = Math.max(0, ime.bottom - bars.bottom);
            notifyWebImeBottom(imeForWeb);

            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(rootLayout);
    }

    /** Pousse la hauteur clavier vers le JS en CSS px (WebView). */
    private void notifyWebImeBottom(int imeBottomPx) {
        if (webView == null) return;
        final float density = Math.max(0.5f, getResources().getDisplayMetrics().density);
        // WindowInsets = px ÃƒÆ’Ã‚Â©cran ; TipTap / CSS utilisent des CSS px (= px / density).
        final int cssBottom = Math.max(0, Math.round(imeBottomPx / density));
        webView.post(() -> {
            if (webView == null) return;
            String script =
                    "(function(){" +
                    "  window.__wabImeBottom=" + cssBottom + ";" +
                    "  try {" +
                    "    document.documentElement.style.setProperty('--wab-ime-bottom','" + cssBottom + "px');" +
                    "    document.documentElement.setAttribute('data-wab-ime', String(" + cssBottom + "));" +
                    "  } catch (e) {}" +
                    "  try { window.dispatchEvent(new CustomEvent('wab-ime',{detail:{bottom:" + cssBottom + "}})); } catch (e) {}" +
                    "})();";
            webView.evaluateJavascript(script, null);
        });
    }

    /** Garde la barre de statut / navigation visibles (pas de mode immersif). */
    private void ensureSystemBarsVisible() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.show(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_DEFAULT);
        }
    }

    private void applyStatusBarColor(String colorString) {
        try {
            ensureSystemBarsVisible();
            int color = android.graphics.Color.parseColor(colorString);
            // En edge-to-edge la couleur de barre peut ÃƒÆ’Ã‚Âªtre ignorÃƒÆ’Ã‚Â©e : on colore aussi
            // la zone de padding du layout racine (derriÃƒÆ’Ã‚Â¨re statut / navigation).
            getWindow().setStatusBarColor(color);
            getWindow().setNavigationBarColor(color);
            if (rootLayout != null) {
                rootLayout.setBackgroundColor(color);
            }

            double luminance = (0.299 * android.graphics.Color.red(color)
                    + 0.587 * android.graphics.Color.green(color)
                    + 0.114 * android.graphics.Color.blue(color)) / 255;
            boolean useDarkIcons = luminance > 0.5;

            WindowInsetsControllerCompat controller =
                    WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            if (controller != null) {
                controller.setAppearanceLightStatusBars(useDarkIcons);
                controller.setAppearanceLightNavigationBars(useDarkIcons);
            }
        } catch (Exception ignored) {
            // Couleur invalide : on garde la barre de statut telle quelle.
        }
    }

    private boolean isOnline() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
        return activeNetwork != null && activeNetwork.isConnectedOrConnecting();
    }

    private void showOffline() {
        offlineLayout.setVisibility(View.VISIBLE);
        webView.setVisibility(View.GONE);
        swipeRefresh.setRefreshing(false);
        progressBar.setVisibility(View.GONE);
        dismissLaunchOverlay();
        mainHandler.removeCallbacks(offlineReconnectRunnable);
        mainHandler.postDelayed(offlineReconnectRunnable, 5000);
    }

    private void hideOffline() {
        mainHandler.removeCallbacks(offlineReconnectRunnable);
        offlineLayout.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
    }

    private void loadUrlInWebView(String url) {
        lastRequestedUrl = (url != null && !url.isEmpty()) ? url : SITE_URL;
        webView.loadUrl(lastRequestedUrl);
    }

    private boolean isNativeGoogleStartUrl(Uri uri) {
        if (uri == null) return false;
        String host = uri.getHost();
        String path = uri.getPath();
        return host != null
                && host.endsWith("wab-infos.com")
                && "/api/redaction/auth/google/start".equals(path);
    }

    /** Domaines Google ÃƒÆ’Ã‚Â  garder dans la WebView pour lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢OAuth (sinon Chrome externe). */
    private boolean isGoogleOAuthHost(String host) {
        if (host == null || host.isEmpty()) return false;
        String h = host.toLowerCase(Locale.ROOT);
        return h.equals("accounts.google.com")
                || h.equals("accounts.youtube.com")
                || h.equals("myaccount.google.com")
                || h.equals("oauthaccountmanager.googleapis.com")
                || h.endsWith(".google.com")
                || h.endsWith(".googleusercontent.com")
                || h.endsWith(".googleapis.com")
                || h.equals("gstatic.com")
                || h.endsWith(".gstatic.com");
    }

    /** Retour Google OAuth web : le WAF N0C bloque `iss=accounts.google.com` (403). */
    private boolean isGoogleOAuthCallbackUrl(Uri uri) {
        if (uri == null) return false;
        String host = uri.getHost();
        String path = uri.getPath();
        return host != null
                && host.endsWith("wab-infos.com")
                && "/api/redaction/auth/google/oauth-callback".equals(path)
                && uri.getQueryParameter("code") != null;
    }

    private String sanitizeGoogleOAuthCallbackUrl(Uri uri) {
        if (uri == null) return null;
        Uri.Builder builder = uri.buildUpon().clearQuery();
        String code = uri.getQueryParameter("code");
        String state = uri.getQueryParameter("state");
        if (code == null || code.isEmpty()) return null;
        builder.appendQueryParameter("code", code);
        if (state != null && !state.isEmpty()) {
            builder.appendQueryParameter("state", state);
        }
        return builder.build().toString();
    }

    private void startNativeGoogleSignIn(boolean remember) {
        pendingGoogleRemember = remember;
        String currentUrl = webView != null ? webView.getUrl() : null;
        String configBase = resolveRedactionBaseUrl(currentUrl);

        // Wab-Redaction : pas encore de client OAuth Android pour com.wabinfos.redaction
        // ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ OAuth web direct (ÃƒÆ’Ã‚Â©vite DEVELOPER_ERROR + toast trompeur).
        if (!BuildConfig.USE_NATIVE_GOOGLE) {
            fallbackGoogleWebSignIn(configBase);
            return;
        }

        progressBar.setVisibility(View.VISIBLE);
        progressBar.setIndeterminate(true);

        // WebView doit ÃƒÆ’Ã‚Âªtre lu uniquement sur le thread UI (sinon crash silencieux ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ toast).
        new Thread(() -> {
            try {
                GoogleNativeConfig config = fetchGoogleNativeConfig(configBase);
                pendingGoogleCompleteUrl = config.completeUrl;

                runOnUiThread(() -> {
                    try {
                        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                                .requestEmail()
                                .requestProfile()
                                .requestServerAuthCode(config.serverClientId, false)
                                .build();

                        googleSignInClient = GoogleSignIn.getClient(MainActivity.this, gso);
                        googleSignInClient.signOut().addOnCompleteListener(task -> {
                            if (googleSignInLauncher == null || googleSignInClient == null) {
                                fallbackGoogleWebSignIn(configBase);
                                return;
                            }
                            googleSignInLauncher.launch(googleSignInClient.getSignInIntent());
                        });
                    } catch (Exception e) {
                        Log.e("WabInfos", "GoogleSignInOptions: ÃƒÆ’Ã‚Â©chec", e);
                        fallbackGoogleWebSignIn(configBase);
                    }
                });
            } catch (Exception e) {
                Log.e("WabInfos", "startNativeGoogleSignIn: ÃƒÆ’Ã‚Â©chec", e);
                runOnUiThread(() -> fallbackGoogleWebSignIn(configBase));
            }
        }).start();
    }

    private String resolveRedactionBaseUrl(String currentUrl) {
        if (currentUrl != null && !currentUrl.isEmpty()) {
            Uri currentUri = Uri.parse(currentUrl);
            String host = currentUri.getHost();
            if ("https".equalsIgnoreCase(currentUri.getScheme())
                    && host != null
                    && host.endsWith("wab-infos.com")) {
                // Si on est sur le site lecteur, forcer le host rÃƒÆ’Ã‚Â©daction.
                if ("app.wab-infos.com".equalsIgnoreCase(host)
                        || "redaction.app.wab-infos.com".equalsIgnoreCase(host)
                        || host.startsWith("redaction.")) {
                    return currentUri.getScheme() + "://" + host;
                }
            }
        }
        return REDACTION_SITE_URL;
    }

    /** OAuth Google dans la WebView avec UA Chrome (Google refuse le marqueur "; wv)"). */
    private void beginGoogleOAuthInWebView(String startUrl) {
        if (webView == null || startUrl == null || startUrl.isEmpty()) return;
        WebSettings settings = webView.getSettings();
        if (defaultWebViewUserAgent == null || defaultWebViewUserAgent.isEmpty()) {
            defaultWebViewUserAgent = settings.getUserAgentString();
        }
        // UA Chrome mobile sans "; wv)" ni marqueur app.
        settings.setUserAgentString(
                "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 "
                        + "(KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36"
        );
        googleOAuthChromeUaActive = true;
        progressBar.setVisibility(View.VISIBLE);
        progressBar.setIndeterminate(true);
        loadUrlInWebView(startUrl);
    }

    private void maybeRestoreDefaultUserAgent(String url) {
        if (!googleOAuthChromeUaActive || webView == null || defaultWebViewUserAgent == null) {
            return;
        }
        if (url == null || url.isEmpty()) return;
        Uri uri = Uri.parse(url);
        String host = uri.getHost();
        String path = uri.getPath() != null ? uri.getPath() : "";
        if (host == null || !host.endsWith("wab-infos.com")) {
            return;
        }
        // Une fois revenus sur lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢app rÃƒÆ’Ã‚Â©daction (hors endpoints OAuth), restaurer lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢UA natif.
        if (path.contains("/api/redaction/auth/google/")) {
            return;
        }
        if (path.contains("/auth/google/")) {
            return;
        }
        webView.getSettings().setUserAgentString(defaultWebViewUserAgent);
        googleOAuthChromeUaActive = false;
    }

    /** Repli OAuth web si le flux Play Services / native-config ÃƒÆ’Ã‚Â©choue. */
    private void fallbackGoogleWebSignIn(String configBase) {
        progressBar.setIndeterminate(false);
        progressBar.setVisibility(View.GONE);
        String base = (configBase != null && !configBase.isEmpty())
                ? configBase
                : REDACTION_SITE_URL;
        // preferWeb=1 empÃƒÆ’Ã‚Âªche shouldOverrideUrlLoading de relancer le flux natif en boucle.
        beginGoogleOAuthInWebView(base + "/api/redaction/auth/google/start?preferWeb=1");
    }

    private GoogleNativeConfig fetchGoogleNativeConfig(String base) throws Exception {
        String configBase = (base != null && !base.isEmpty())
                ? base
                : REDACTION_SITE_URL;

        URL url = new URL(configBase + "/api/redaction/auth/google/native-config");
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(15000);
        connection.setRequestProperty("Accept", "application/json");
        connection.connect();

        int code = connection.getResponseCode();
        InputStream stream = code >= 200 && code < 300
                ? connection.getInputStream()
                : connection.getErrorStream();
        if (stream == null) {
            connection.disconnect();
            throw new IOException("HTTP " + code + " (corps vide)");
        }

        BufferedReader reader = new BufferedReader(new InputStreamReader(stream));
        StringBuilder body = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            body.append(line);
        }
        reader.close();
        connection.disconnect();

        if (code < 200 || code >= 300) {
            throw new IOException("HTTP " + code + ": " + body);
        }

        JSONObject json = new JSONObject(body.toString());
        String serverClientId = json.optString("serverClientId", "");
        String completeUrl = json.optString("completeUrl", "");
        if (serverClientId.isEmpty() || completeUrl.isEmpty()) {
            throw new IOException("Config Google native incomplÃƒÆ’Ã‚Â¨te");
        }

        GoogleNativeConfig config = new GoogleNativeConfig();
        config.serverClientId = serverClientId;
        config.completeUrl = completeUrl;
        return config;
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onPause() {
        super.onPause();
        stopRhVoicePlayback();
        webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        ensureSystemBarsVisible();
        UpdateManager.resumePlayInAppUpdateIfNeeded(this);
        webView.onResume();
    }

    @Override
    protected void onDestroy() {
        stopRhVoicePlayback();
        UpdateManager.unbindActivity();
        mainHandler.removeCallbacks(offlineReconnectRunnable);
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }

    /** Lecture média locale ; aucune permission micro ou stockage n'est requise. */
    private void stopRhVoicePlayback() {
        if (rhVoicePlayer == null) return;
        MediaPlayer previous = rhVoicePlayer;
        rhVoicePlayer = null;
        try { previous.stop(); } catch (IllegalStateException ignored) { }
        previous.release();
    }

    /** Pont JS exposé au site : permet d'utiliser le partage natif Android depuis les pages web. */
    public void emitApkUpdateProgress(int percent) {
        runOnUiThread(() -> {
            if (webView == null) return;
            try {
                webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('wab-apk-download-progress',{detail:{percent:" + percent + "}}));", null);
            } catch (Exception ignored) { }
        });
    }

    public void emitApkInstalling() {
        runOnUiThread(() -> {
            if (webView == null) return;
            try {
                webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('wab-apk-installing',{detail:{}}));", null);
            } catch (Exception ignored) { }
        });
    }

    private class NativeBridge {
        @android.webkit.JavascriptInterface
        public boolean playRhVoice(String cue) {
            if (!"WabRedactionNative".equals(BuildConfig.UA_MARKER) || cue == null ||
                    !(cue.equals("arrival") || cue.equals("departure") || cue.equals("submission") ||
                      cue.equals("arrival-offline") || cue.equals("departure-offline") || cue.equals("submission-offline"))) return false;
            final AssetFileDescriptor asset;
            try { asset = getAssets().openFd("rh-voice/" + cue + ".mp3"); }
            catch (IOException e) { Log.w("WabRhVoice", "Voix locale indisponible", e); return false; }
            runOnUiThread(() -> {
                try {
                    stopRhVoicePlayback();
                    MediaPlayer player = new MediaPlayer();
                    player.setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
                    player.setDataSource(asset.getFileDescriptor(), asset.getStartOffset(), asset.getLength());
                    player.setOnCompletionListener(done -> { if (rhVoicePlayer == done) stopRhVoicePlayback(); });
                    player.setOnErrorListener((failed, what, extra) -> { if (rhVoicePlayer == failed) stopRhVoicePlayback(); return true; });
                    rhVoicePlayer = player;
                    player.prepare();
                    player.start();
                } catch (Exception e) {
                    Log.w("WabRhVoice", "Lecture vocale impossible", e);
                    stopRhVoicePlayback();
                } finally {
                    try { asset.close(); } catch (IOException ignored) { }
                }
            });
            return true;
        }

        @android.webkit.JavascriptInterface
        public void stopRhVoice() { runOnUiThread(MainActivity.this::stopRhVoicePlayback); }
        @android.webkit.JavascriptInterface
        public void share(String title, String text, String url) {
            runOnUiThread(() -> {
                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType("text/plain");
                shareIntent.putExtra(Intent.EXTRA_SUBJECT, title != null ? title : "Wab-infos");
                String fullText = (text != null ? text + "\n" : "") + (url != null ? url : "");
                shareIntent.putExtra(Intent.EXTRA_TEXT, fullText.trim());
                startActivity(Intent.createChooser(shareIntent, "Partager via"));
            });
        }

        @android.webkit.JavascriptInterface
        public void saveFile(String base64, String fileName, String mimeType) {
            if (base64 == null || base64.isEmpty() || base64.length() > (MAX_NATIVE_FILE_BYTES * 4L / 3L) + 16) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Fichier vide ou trop volumineux (maximum 25 Mo).", Toast.LENGTH_LONG).show());
                return;
            }
            try {
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                runOnUiThread(() -> promptSaveNativeFile(bytes, fileName, mimeType));
            } catch (IllegalArgumentException error) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Le fichier PDF est invalide.", Toast.LENGTH_LONG).show());
            }
        }

        @android.webkit.JavascriptInterface
        public void savePdf(String base64, String fileName) {
            saveFile(base64, fileName, "application/pdf");
        }

        @android.webkit.JavascriptInterface
        public void printPage() {
            printCurrentWebView();
        }

        @android.webkit.JavascriptInterface
        public void requestStatusBarSync() {
            runOnUiThread(() -> injectStatusBarColorSync(webView));
        }

        @android.webkit.JavascriptInterface
        public void setWebCanScrollUp(boolean canScrollUp) {
            webCanScrollUp = canScrollUp;
        }

        @android.webkit.JavascriptInterface
        public void signInWithGoogle(boolean remember) {
            runOnUiThread(() -> startNativeGoogleSignIn(remember));
        }

        @android.webkit.JavascriptInterface
        public String getAppVersionJson() {
            try {
                return UpdateManager.getLocalVersionJson(MainActivity.this).toString();
            } catch (Exception e) {
                return "{}";
            }
        }

        @android.webkit.JavascriptInterface
        public void downloadAndInstallApkUpdate(String url) {
            if (url == null || url.trim().isEmpty()) {
                return;
            }
            runOnUiThread(() -> {
                if (UpdateManager.shouldUsePlayStoreUpdate(MainActivity.this)) {
                    UpdateManager.checkForUpdate(MainActivity.this);
                } else {
                    UpdateManager.downloadAndInstall(MainActivity.this, url.trim());
                }
            });
        }

        @android.webkit.JavascriptInterface
        public boolean isInstalledFromPlayStore() {
            return UpdateManager.shouldUsePlayStoreUpdate(MainActivity.this);
        }

        @android.webkit.JavascriptInterface
        public void checkForAppUpdate() {
            runOnUiThread(() -> UpdateManager.checkForUpdate(MainActivity.this));
        }

        @android.webkit.JavascriptInterface
        public void showToast(String message) {
            UpdateManager.showNativeToast(MainActivity.this, message);
        }

        /** Statut push pour le site : granted | denied | prompt */
        @android.webkit.JavascriptInterface
        public String getPushPermissionStatus() {
            return resolvePushPermissionStatus();
        }

        @android.webkit.JavascriptInterface
        public boolean areNotificationsEnabled() {
            return areSystemNotificationsEnabled() && hasPostNotificationsPermission();
        }

        /** Demande la permission + notifie le site via event wab-android-push-permission. */
        @android.webkit.JavascriptInterface
        public void requestPushPermission() {
            runOnUiThread(MainActivity.this::requestPushPermissionFromWeb);
        }

        /**
         * Demande le token FCM natif et le renvoie via event wab-android-fcm-token
         * ({ detail: { token } } ou { detail: { error } }).
         */
        @android.webkit.JavascriptInterface
        public void requestFcmToken() {
            runOnUiThread(MainActivity.this::fetchFcmTokenForWeb);
        }

        /** Active / dÃƒÆ’Ã‚Â©sactive les topics FCM (all_users, news) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â lecteur uniquement. */
        @android.webkit.JavascriptInterface
        public void setPushAlertsEnabled(boolean enabled) {
            runOnUiThread(() -> {
                if (isRedactionProduct()) {
                    // RÃƒÆ’Ã‚Â©daction : abonnements individuels via token, pas les topics lecteurs.
                    if (enabled) {
                        fetchFcmTokenForWeb();
                    }
                    return;
                }
                if (enabled) {
                    WabInfosFcmInit.subscribeToDefaultTopics();
                } else {
                    WabInfosFcmInit.unsubscribeFromDefaultTopics();
                }
            });
        }
    }

    private static class GoogleNativeConfig {
        String serverClientId;
        String completeUrl;
    }
}

package com.wabinfos.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
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
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private static final String SITE_URL = BuildConfig.SITE_URL;
    private static final int PERMISSION_REQUEST_CODE = 4321;

    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private ProgressBar progressBar;
    private LinearLayout offlineLayout;
    private View launchOverlay;
    private boolean launchOverlayDismissed = false;

    // Gestion de l'upload de fichiers depuis le WebView (<input type="file">)
    private ValueCallback<Uri[]> filePathCallback;
    private String cameraPhotoPath;
    private ActivityResultLauncher<Intent> fileChooserLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        progressBar = findViewById(R.id.progressBar);
        offlineLayout = findViewById(R.id.offlineLayout);
        launchOverlay = findViewById(R.id.launchOverlay);
        Button retryButton = findViewById(R.id.retryButton);

        playLaunchOverlayEntrance();
        registerFileChooserLauncher();
        setupWebView();
        requestRuntimePermissionsIfNeeded();

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
                webView.loadUrl(SITE_URL);
            }
        });

        if (isOnline()) {
            String targetUrl = resolveTargetUrl(getIntent());
            webView.loadUrl(targetUrl);
        } else {
            showOffline();
        }

        UpdateManager.checkForUpdate(this);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String targetUrl = resolveTargetUrl(intent);
        if (isOnline()) {
            webView.loadUrl(targetUrl);
        }
    }

    private String resolveTargetUrl(Intent intent) {
        if (intent == null) return SITE_URL;
        String extraUrl = intent.getStringExtra("open_url");
        if (extraUrl != null && !extraUrl.isEmpty()) {
            return extraUrl;
        }
        Uri data = intent.getData();
        if (data != null) {
            return data.toString();
        }
        return SITE_URL;
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

        // Filet de sécurité : si la page met trop de temps, on masque quand même
        // l'overlay après un délai maximum pour ne jamais bloquer l'utilisateur.
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

    private void requestRuntimePermissionsIfNeeded() {
        List<String> toRequest = new ArrayList<>();
        toRequest.add(android.Manifest.permission.CAMERA);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            toRequest.add(android.Manifest.permission.POST_NOTIFICATIONS);
            toRequest.add(android.Manifest.permission.READ_MEDIA_IMAGES);
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
        settings.setUserAgentString(settings.getUserAgentString() + " WabInfosNative/" + BuildConfig.VERSION_NAME);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // --- Optimisations de fluidité et de vitesse ---
        settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
        settings.setOffscreenPreRaster(true);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        WebView.setWebContentsDebuggingEnabled(false);
        try {
            WebView.enableSlowWholeDocumentDraw();
        } catch (Throwable ignored) {
        }
        // Cookies persistants (connexion, préférences) et acceptés y compris multi-domaines (CDN images)
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // Pont JavaScript : partage natif depuis le site (window.AndroidBridge.share(...))
        webView.addJavascriptInterface(new NativeBridge(), "AndroidBridge");

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) ->
                startNativeDownload(url, userAgent, contentDisposition, mimeType));

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Le site web intègre son propre bandeau de mise à jour qui pointe vers
                // l'APK officielle (signée différemment de la nôtre). On neutralise cette
                // vérification en répondant nous-mêmes avec la version de CETTE app native,
                // afin que le site ne propose jamais une mise à jour incompatible.
                if (url.contains("/api/apk-version")) {
                    return buildLocalVersionResponse();
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                Uri parsed = Uri.parse(url);
                String host = parsed.getHost();
                if (url.startsWith(SITE_URL) || (host != null && host.endsWith("wab-infos.com"))) {
                    return false;
                }
                // Liens externes : ouvrir dans le navigateur du système
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
                swipeRefresh.setRefreshing(false);
                progressBar.setVisibility(View.GONE);
                injectNativeShareBridge(view);
                injectStatusBarColorSync(view);
                dismissLaunchOverlay();
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
                // Libère un éventuel callback précédent resté en attente (évite les blocages
                // si l'utilisateur ouvre plusieurs fois le sélecteur de fichiers rapidement).
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                    filePathCallback = null;
                }
                filePathCallback = callback;
                try {
                    Intent chooserIntent = buildFileChooserIntent(fileChooserParams);
                    fileChooserLauncher.launch(chooserIntent);
                } catch (Exception e) {
                    Log.e("WabInfos", "onShowFileChooser: échec ouverture du sélecteur", e);
                    filePathCallback = null;
                    Toast.makeText(MainActivity.this,
                            "Impossible d'ouvrir le sélecteur de fichiers", Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });
    }

    /** Combine prise de photo directe + sélecteur de fichiers/galerie dans un seul chooser. */
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
     * Prépare l'intent de prise de photo directe. Toute erreur ici (permission caméra
     * manquante, FileProvider mal configuré, etc.) est absorbée sans jamais empêcher
     * l'ouverture du sélecteur de fichiers/galerie, qui doit toujours fonctionner.
     */
    private Intent tryBuildCameraIntent() {
        try {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.CAMERA)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.w("WabInfos", "tryBuildCameraIntent: permission caméra non accordée, option caméra masquée");
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
            Log.w("WabInfos", "tryBuildCameraIntent: option caméra indisponible, on continue avec la galerie seule", e);
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
                            // Aucune sélection de fichier : c'est probablement une photo prise à l'instant
                            if (cameraPhotoPath != null) {
                                results = new Uri[]{Uri.parse(cameraPhotoPath)};
                            }
                        } else if (data.getClipData() != null) {
                            // Sélection multiple de fichiers
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

    private void startNativeDownload(String url, String userAgent, String contentDisposition, String mimeType) {
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setMimeType(mimeType);
            String cookies = CookieManager.getInstance().getCookie(url);
            request.addRequestHeader("cookie", cookies);
            request.addRequestHeader("User-Agent", userAgent);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
            request.allowScanningByMediaScanner();

            DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            if (dm != null) {
                dm.enqueue(request);
                Toast.makeText(this, "Téléchargement démarré : " + fileName, Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            Toast.makeText(this, "Impossible de démarrer le téléchargement", Toast.LENGTH_SHORT).show();
        }
    }

    /**
     * Redirige l'API Web standard navigator.share() vers le partage natif Android,
     * pour que les boutons "Partager" du site fonctionnent sans code spécifique.
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
                "})();";
        view.evaluateJavascript(script, null);
    }

    /**
     * Détermine la couleur de thème réellement appliquée par le site en lisant l'état
     * visuel effectif de la page (classe "dark"/"light" posée par next-themes sur <html>,
     * qui reflète aussi bien le choix manuel de l'utilisateur que le mode système),
     * puis l'applique à la barre de statut Android avec des icônes claires ou sombres
     * choisies automatiquement selon la luminosité de cette couleur pour rester lisible.
     */
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

        // Observe les changements de classe sur <html> (bascule manuelle du thème sur le
        // site, ou changement système) pour resynchroniser la barre de statut en direct,
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

    private void applyStatusBarColor(String colorString) {
        try {
            int color = android.graphics.Color.parseColor(colorString);
            getWindow().setStatusBarColor(color);
            getWindow().setNavigationBarColor(color);

            double luminance = (0.299 * android.graphics.Color.red(color)
                    + 0.587 * android.graphics.Color.green(color)
                    + 0.114 * android.graphics.Color.blue(color)) / 255;
            boolean useDarkIcons = luminance > 0.5;

            WindowInsetsControllerCompat controller =
                    WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            controller.setAppearanceLightStatusBars(useDarkIcons);
            controller.setAppearanceLightNavigationBars(useDarkIcons);
        } catch (Exception ignored) {
            // Couleur invalide : on garde la barre de statut telle quelle.
        }
    }

    private WebResourceResponse buildLocalVersionResponse() {
        try {
            int versionCode = getPackageManager()
                    .getPackageInfo(getPackageName(), 0).versionCode;
            String versionName = BuildConfig.VERSION_NAME;
            String json = "{\"versionCode\":" + versionCode
                    + ",\"versionName\":\"" + versionName + "\","
                    + "\"apkUrl\":\"\",\"releasedAt\":\"\"}";
            return new WebResourceResponse(
                    "application/json",
                    "UTF-8",
                    new ByteArrayInputStream(json.getBytes("UTF-8"))
            );
        } catch (Exception e) {
            return null;
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
        dismissLaunchOverlay();
    }

    private void hideOffline() {
        offlineLayout.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
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
        webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }

    /** Pont JS exposé au site : permet d'utiliser le partage natif Android depuis les pages web. */
    private class NativeBridge {
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
        public void requestStatusBarSync() {
            runOnUiThread(() -> injectStatusBarColorSync(webView));
        }
    }
}

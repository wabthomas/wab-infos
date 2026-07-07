package com.wabinfos.app;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    private File pendingApkFile;

    @PluginMethod
    public void getAppVersion(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            String packageName = getContext().getPackageName();
            PackageInfo pInfo = pm.getPackageInfo(packageName, 0);
            JSObject ret = new JSObject();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                ret.put("versionCode", pInfo.getLongVersionCode());
            } else {
                ret.put("versionCode", pInfo.versionCode);
            }
            ret.put("versionName", pInfo.versionName);
            call.resolve(ret);
        } catch (PackageManager.NameNotFoundException e) {
            call.reject("Impossible de lire la version installée", e);
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("URL de l'APK manquante");
            return;
        }

        call.setKeepAlive(true);

        new Thread(() -> {
            try {
                File apkFile = downloadApk(url, progress -> {
                    JSObject data = new JSObject();
                    data.put("progress", progress);
                    notifyListeners("downloadProgress", data);
                });
                getBridge().executeOnMainThread(() -> beginInstall(call, apkFile));
            } catch (Exception e) {
                call.reject("Échec du téléchargement : " + e.getMessage(), e);
            }
        }).start();
    }

    private File downloadApk(String urlString, ProgressCallback callback) throws Exception {
        File dir = new File(getContext().getCacheDir(), "apk-updates");
        if (!dir.exists()) {
            //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
        }
        File outFile = new File(dir, "wab-infos-update.apk");

        URL url = new URL(urlString);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(30_000);
        conn.setReadTimeout(120_000);
        conn.connect();

        int responseCode = conn.getResponseCode();
        if (responseCode != HttpURLConnection.HTTP_OK) {
            throw new Exception("HTTP " + responseCode);
        }

        int total = conn.getContentLength();
        try (InputStream in = conn.getInputStream();
             FileOutputStream out = new FileOutputStream(outFile)) {
            byte[] buffer = new byte[8192];
            int read;
            long downloaded = 0;
            int lastProgress = -1;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
                downloaded += read;
                if (total > 0) {
                    int progress = (int) ((downloaded * 100) / total);
                    if (progress != lastProgress) {
                        lastProgress = progress;
                        callback.onProgress(progress);
                    }
                }
            }
        } finally {
            conn.disconnect();
        }

        callback.onProgress(100);
        return outFile;
    }

    private void beginInstall(PluginCall call, File apkFile) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!getContext().getPackageManager().canRequestPackageInstalls()) {
                pendingApkFile = apkFile;
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                startActivityForResult(call, intent, "installPermission");
                return;
            }
        }
        launchInstallIntent(apkFile);
        call.resolve();
    }

    private void launchInstallIntent(File apkFile) {
        Uri apkUri = FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            apkFile
        );
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getContext().startActivity(intent);
    }

    @ActivityCallback
    private void installPermission(PluginCall call, androidx.activity.result.ActivityResult result) {
        File apkFile = pendingApkFile;
        pendingApkFile = null;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!getContext().getPackageManager().canRequestPackageInstalls()) {
                call.reject("Autorisez l'installation d'applications pour mettre à jour Wab-infos.");
                return;
            }
        }

        if (apkFile != null) {
            launchInstallIntent(apkFile);
            call.resolve();
        } else {
            call.reject("Fichier APK introuvable");
        }
    }

    private interface ProgressCallback {
        void onProgress(int progress);
    }
}

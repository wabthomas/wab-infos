package com.wabinfos.app;

import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.Executors;

public class UpdateManager {

    private static final String TAG = "UpdateManager";

    public static void checkForUpdate(Context context) {
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                URL url = new URL(BuildConfig.VERSION_MANIFEST_URL);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setRequestMethod("GET");

                if (connection.getResponseCode() == HttpURLConnection.HTTP_OK) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line);
                    }
                    reader.close();

                    JSONObject json = new JSONObject(sb.toString());
                    int remoteVersionCode = json.optInt("versionCode", -1);
                    String remoteVersionName = json.optString("versionName", "");
                    String apkPath = json.optString("apkUrl", "");

                    int localVersionCode = getLocalVersionCode(context);

                    if (remoteVersionCode > localVersionCode && !apkPath.isEmpty()) {
                        String apkUrl = apkPath.startsWith("http")
                                ? apkPath
                                : BuildConfig.SITE_URL + apkPath;

                        new Handler(Looper.getMainLooper()).post(() ->
                                promptUpdate(context, remoteVersionName, apkUrl));
                    }
                }
                connection.disconnect();
            } catch (Exception e) {
                Log.w(TAG, "Vérification de mise à jour impossible: " + e.getMessage());
            }
        });
    }

    private static int getLocalVersionCode(Context context) {
        try {
            return context.getPackageManager()
                    .getPackageInfo(context.getPackageName(), 0)
                    .versionCode;
        } catch (Exception e) {
            return Integer.MAX_VALUE;
        }
    }

    private static void promptUpdate(Context context, String versionName, String apkUrl) {
        new AlertDialog.Builder(context)
                .setTitle(context.getString(R.string.update_available))
                .setMessage("Version " + versionName + " disponible")
                .setPositiveButton(R.string.update_now, (dialog, which) -> downloadAndInstall(context, apkUrl))
                .setNegativeButton(R.string.update_later, null)
                .setCancelable(true)
                .show();
    }

    private static void downloadAndInstall(Context context, String apkUrl) {
        try {
            Toast.makeText(context, R.string.downloading_update, Toast.LENGTH_SHORT).show();

            DownloadManager downloadManager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
            Uri uri = Uri.parse(apkUrl);
            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, "wab-infos-update.apk");
            request.setMimeType("application/vnd.android.package-archive");

            long downloadId = downloadManager.enqueue(request);

            BroadcastReceiver receiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context ctx, Intent intent) {
                    long completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (completedId == downloadId) {
                        File apkFile = new File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "wab-infos-update.apk");
                        installApk(context, apkFile);
                        ctx.unregisterReceiver(this);
                    }
                }
            };
            IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED);
            } else {
                context.registerReceiver(receiver, filter);
            }

        } catch (Exception e) {
            Log.e(TAG, "Erreur lors du téléchargement: " + e.getMessage());
        }
    }

    private static void installApk(Context context, File apkFile) {
        Uri apkUri = FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                apkFile
        );
        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        context.startActivity(installIntent);
    }
}

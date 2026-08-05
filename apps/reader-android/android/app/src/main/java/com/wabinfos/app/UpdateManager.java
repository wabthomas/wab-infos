package com.wabinfos.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;

import com.google.android.material.button.MaterialButton;
import com.google.android.play.core.appupdate.AppUpdateInfo;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.ref.WeakReference;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class UpdateManager {

    private static final String TAG = "UpdateManager";
    private static final String APK_FILE_NAME = "wab-infos-update.apk";
    private static final String PREFS_NAME = "wab_apk_update";
    private static final String PREF_LAST_KNOWN_VERSION = "last_known_version_code";
    private static final String PREF_SUCCESS_TOAST_SHOWN = "success_toast_shown_for";
    private static final ExecutorService DOWNLOAD_EXECUTOR = Executors.newSingleThreadExecutor();
    private static final AtomicBoolean DOWNLOAD_IN_PROGRESS = new AtomicBoolean(false);
    private static WeakReference<Activity> activityRef;

    public static void bindActivity(Activity activity) {
        activityRef = new WeakReference<>(activity);
    }

    public static void unbindActivity() {
        activityRef = null;
    }

    public static JSONObject getLocalVersionJson(Context context) throws Exception {
        PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
        int versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? (int) info.getLongVersionCode()
                : info.versionCode;
        JSONObject json = new JSONObject();
        json.put("versionCode", versionCode);
        json.put("versionName", info.versionName != null ? info.versionName : "");
        return json;
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static int readInstalledVersionCode(Context context) throws Exception {
        return getLocalVersionJson(context).getInt("versionCode");
    }

    /** Affiche un toast de félicitations une seule fois après une vraie mise à jour. */
    public static void showUpdatedToastIfNeeded(Activity activity) {
        if (activity == null) return;
        try {
            PackageInfo info = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
            int currentCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                    ? (int) info.getLongVersionCode()
                    : info.versionCode;
            String versionName = info.versionName != null ? info.versionName : String.valueOf(currentCode);
            SharedPreferences sp = prefs(activity);
            int lastKnown = sp.getInt(PREF_LAST_KNOWN_VERSION, 0);
            int toastShownFor = sp.getInt(PREF_SUCCESS_TOAST_SHOWN, 0);

            if (lastKnown > 0 && currentCode > lastKnown && toastShownFor != currentCode) {
                showNativeToast(
                        activity,
                        activity.getString(R.string.update_success, versionName)
                );
                sp.edit()
                        .putInt(PREF_LAST_KNOWN_VERSION, currentCode)
                        .putInt(PREF_SUCCESS_TOAST_SHOWN, currentCode)
                        .apply();
                return;
            }

            if (currentCode != lastKnown) {
                sp.edit().putInt(PREF_LAST_KNOWN_VERSION, currentCode).apply();
            }
        } catch (Exception e) {
            Log.w(TAG, "Impossible de vérifier la version installée", e);
        }
    }

    public static void showNativeToast(Activity activity, String message) {
        if (activity == null || message == null || message.trim().isEmpty()) return;
        activity.runOnUiThread(() ->
                Toast.makeText(activity, message.trim(), Toast.LENGTH_LONG).show()
        );
    }

    public static boolean shouldUsePlayStoreUpdate(Context context) {
        return "com.wabinfos.app".equals(context.getPackageName())
                && PlayInAppUpdateHelper.isInstalledFromPlayStore(context);
    }

    public static void registerPlayInAppUpdates(AppCompatActivity activity) {
        PlayInAppUpdateHelper.registerLauncher(activity);
    }

    public static void resumePlayInAppUpdateIfNeeded(AppCompatActivity activity) {
        if (shouldUsePlayStoreUpdate(activity)) {
            PlayInAppUpdateHelper.resumeIfFlexibleUpdateDownloaded(activity);
        }
    }

    public static void showPlayStoreUpdateDialog(AppCompatActivity activity, AppUpdateInfo appUpdateInfo) {
        String remoteLabel = String.valueOf(appUpdateInfo.availableVersionCode());
        presentUpdateDialog(activity, remoteLabel, null, true, appUpdateInfo);
    }

    public static void showUpdateDialog(Activity activity, String remoteVersionName, String apkUrl) {
        presentUpdateDialog(activity, remoteVersionName, apkUrl, false, null);
    }

    private static void presentUpdateDialog(
            Activity activity,
            String remoteVersionName,
            String apkUrl,
            boolean playStoreFlow,
            AppUpdateInfo playUpdateInfo
    ) {
        if (activity == null) return;
        if (!playStoreFlow && (apkUrl == null || apkUrl.trim().isEmpty())) return;

        String localVersionName;
        try {
            localVersionName = getLocalVersionJson(activity).optString("versionName", "?");
        } catch (Exception e) {
            localVersionName = "?";
        }

        View dialogView = LayoutInflater.from(activity).inflate(R.layout.dialog_apk_update, null);
        TextView subtitle = dialogView.findViewById(R.id.updateDialogSubtitle);
        TextView message = dialogView.findViewById(R.id.updateDialogMessage);
        MaterialButton laterButton = dialogView.findViewById(R.id.updateLaterButton);
        MaterialButton nowButton = dialogView.findViewById(R.id.updateNowButton);

        if (subtitle != null) {
            subtitle.setText(activity.getString(
                    R.string.update_dialog_subtitle,
                    remoteVersionName != null ? remoteVersionName : "?",
                    localVersionName
            ));
        }
        if (message != null) {
            message.setText(
                    playStoreFlow
                            ? R.string.update_dialog_message_play
                            : R.string.update_dialog_message
            );
        }

        AlertDialog dialog = new AlertDialog.Builder(activity)
                .setView(dialogView)
                .setCancelable(true)
                .create();

        if (laterButton != null) {
            laterButton.setOnClickListener(v -> dialog.dismiss());
        }
        if (nowButton != null) {
            nowButton.setOnClickListener(v -> {
                dialog.dismiss();
                if (playStoreFlow && activity instanceof AppCompatActivity) {
                    AppCompatActivity host = (AppCompatActivity) activity;
                    if (playUpdateInfo != null) {
                        PlayInAppUpdateHelper.startUpdateFlow(host, playUpdateInfo);
                    } else {
                        PlayInAppUpdateHelper.openPlayStoreListing(activity);
                    }
                } else {
                    downloadAndInstall(activity, apkUrl != null ? apkUrl.trim() : "");
                }
            });
        }

        dialog.show();
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }
    }

    public static void downloadAndInstall(Activity activity, String apkUrl) {
        if (activity == null || apkUrl == null || apkUrl.trim().isEmpty()) {
            return;
        }
        bindActivity(activity);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !activity.getPackageManager().canRequestPackageInstalls()) {
            Toast.makeText(
                    activity,
                    activity.getString(R.string.update_install_permission),
                    Toast.LENGTH_LONG
            ).show();
            try {
                Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                settingsIntent.setData(Uri.parse("package:" + activity.getPackageName()));
                activity.startActivity(settingsIntent);
            } catch (Exception e) {
                Log.w(TAG, "Impossible d'ouvrir les paramètres d'installation", e);
            }
            return;
        }

        if (!DOWNLOAD_IN_PROGRESS.compareAndSet(false, true)) {
            Toast.makeText(activity, R.string.downloading_update, Toast.LENGTH_SHORT).show();
            return;
        }

        Toast.makeText(activity, R.string.downloading_update, Toast.LENGTH_SHORT).show();
        final Context appContext = activity.getApplicationContext();
        final String urlToFetch = apkUrl.trim();

        DOWNLOAD_EXECUTOR.execute(() -> {
            File apkFile = null;
            try {
                apkFile = downloadApkToCache(appContext, urlToFetch);
                final File readyFile = apkFile;
                Activity host = activityRef != null ? activityRef.get() : null;
                if (host != null) {
                    host.runOnUiThread(() -> promptInstall(host, readyFile));
                } else {
                    new Handler(Looper.getMainLooper()).post(() -> {
                        try {
                            installApk(appContext, readyFile);
                        } catch (Exception e) {
                            Log.e(TAG, "Installation hors activité impossible", e);
                            Toast.makeText(appContext, R.string.update_install_failed, Toast.LENGTH_LONG).show();
                        }
                    });
                }
            } catch (Exception e) {
                Log.e(TAG, "Erreur lors du téléchargement", e);
                if (apkFile != null && apkFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    apkFile.delete();
                }
                new Handler(Looper.getMainLooper()).post(() ->
                        Toast.makeText(appContext, R.string.update_install_failed, Toast.LENGTH_LONG).show()
                );
            } finally {
                DOWNLOAD_IN_PROGRESS.set(false);
            }
        });
    }

    private static File downloadApkToCache(Context context, String apkUrl) throws Exception {
        File dir = new File(context.getCacheDir(), "apk-updates");
        if (!dir.exists() && !dir.mkdirs()) {
            throw new IllegalStateException("Impossible de créer le dossier de mise à jour");
        }

        File target = new File(dir, APK_FILE_NAME);
        File partial = new File(dir, APK_FILE_NAME + ".part");
        if (partial.exists()) {
            //noinspection ResultOfMethodCallIgnored
            partial.delete();
        }
        if (target.exists()) {
            //noinspection ResultOfMethodCallIgnored
            target.delete();
        }

        HttpURLConnection connection = (HttpURLConnection) new URL(apkUrl).openConnection();
        connection.setInstanceFollowRedirects(true);
        connection.setConnectTimeout(20000);
        connection.setReadTimeout(60000);
        connection.setRequestProperty("Accept", "application/vnd.android.package-archive,*/*");
        connection.setRequestProperty("Cache-Control", "no-cache");
        connection.connect();

        int code = connection.getResponseCode();
        if (code == HttpURLConnection.HTTP_MOVED_PERM
                || code == HttpURLConnection.HTTP_MOVED_TEMP
                || code == HttpURLConnection.HTTP_SEE_OTHER
                || code == 307
                || code == 308) {
            String location = connection.getHeaderField("Location");
            connection.disconnect();
            if (location == null || location.isEmpty()) {
                throw new IllegalStateException("Redirection APK sans Location");
            }
            return downloadApkToCache(context, location);
        }

        if (code < 200 || code >= 300) {
            connection.disconnect();
            throw new IllegalStateException("HTTP " + code);
        }

        String contentType = connection.getContentType();
        if (contentType != null
                && contentType.contains("text/html")
                && !contentType.contains("android")) {
            connection.disconnect();
            throw new IllegalStateException("Réponse HTML au lieu d'un APK");
        }

        long contentLength = connection.getContentLengthLong();
        try (InputStream in = new BufferedInputStream(connection.getInputStream());
             FileOutputStream out = new FileOutputStream(partial)) {
            byte[] buffer = new byte[8192];
            int read;
            long total = 0L;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
                total += read;
            }
            out.flush();
            if (contentLength > 0 && total < contentLength) {
                throw new IllegalStateException("Téléchargement incomplet");
            }
            if (total < 50_000L) {
                throw new IllegalStateException("Fichier APK trop petit (" + total + " octets)");
            }
        } finally {
            connection.disconnect();
        }

        if (!partial.renameTo(target)) {
            //noinspection ResultOfMethodCallIgnored
            target.delete();
            if (!partial.renameTo(target)) {
                throw new IllegalStateException("Impossible de finaliser le fichier APK");
            }
        }

        PackageInfo apkInfo = context.getPackageManager().getPackageArchiveInfo(
                target.getAbsolutePath(),
                0
        );
        if (apkInfo == null || apkInfo.packageName == null) {
            //noinspection ResultOfMethodCallIgnored
            target.delete();
            throw new IllegalStateException("APK invalide");
        }
        if (!context.getPackageName().equals(apkInfo.packageName)) {
            //noinspection ResultOfMethodCallIgnored
            target.delete();
            throw new IllegalStateException("APK pour un autre package: " + apkInfo.packageName);
        }

        int apkCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? (int) apkInfo.getLongVersionCode()
                : apkInfo.versionCode;
        int installedCode = readInstalledVersionCode(context);
        if (apkCode <= installedCode) {
            //noinspection ResultOfMethodCallIgnored
            target.delete();
            throw new IllegalStateException(
                    "APK téléchargé (code " + apkCode + ") <= version installée (" + installedCode + ")"
            );
        }

        return target;
    }

    private static void promptInstall(Activity activity, File apkFile) {
        Toast.makeText(activity, R.string.update_install_ready, Toast.LENGTH_SHORT).show();
        installApk(activity, apkFile);
    }

    private static void installApk(Context context, File apkFile) {
        try {
            Uri apkUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    apkFile
            );
            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            PackageManager pm = context.getPackageManager();
            List<ResolveInfo> resolvers = pm.queryIntentActivities(installIntent, PackageManager.MATCH_DEFAULT_ONLY);
            for (ResolveInfo resolveInfo : resolvers) {
                String packageName = resolveInfo.activityInfo.packageName;
                context.grantUriPermission(
                        packageName,
                        apkUri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                );
            }

            context.startActivity(installIntent);
        } catch (Exception e) {
            Log.e(TAG, "Erreur lors de l'installation", e);
            Toast.makeText(context, R.string.update_install_failed, Toast.LENGTH_LONG).show();
        }
    }

    /** Vérifie Play Store (si install depuis Play) puis le manifeste APK du site. */
    public static void checkForUpdate(Activity activity) {
        if (!(activity instanceof AppCompatActivity)) {
            checkManifestUpdate(activity);
            return;
        }
        AppCompatActivity host = (AppCompatActivity) activity;
        if (shouldUsePlayStoreUpdate(host)) {
            host.runOnUiThread(() ->
                    PlayInAppUpdateHelper.checkForUpdate(host, () -> checkManifestUpdate(host))
            );
        } else {
            checkManifestUpdate(host);
        }
    }

    private static void checkManifestUpdate(Activity activity) {
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                URL url = new URL(BuildConfig.VERSION_MANIFEST_URL);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setRequestMethod("GET");
                connection.setRequestProperty("Cache-Control", "no-cache");

                if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                    connection.disconnect();
                    return;
                }

                BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();
                connection.disconnect();

                JSONObject json = new JSONObject(sb.toString());
                int remoteVersionCode = json.optInt("versionCode", -1);
                String apkPath = json.optString("apkUrl", "");
                int localVersionCode = getLocalVersionJson(activity).optInt("versionCode", Integer.MAX_VALUE);

                if (remoteVersionCode <= localVersionCode || apkPath.isEmpty()) {
                    return;
                }

                String remoteVersionName = json.optString("versionName", String.valueOf(remoteVersionCode));
                final boolean playInstall = shouldUsePlayStoreUpdate(activity);

                if (playInstall) {
                    activity.runOnUiThread(() -> {
                        if (activity instanceof AppCompatActivity) {
                            presentUpdateDialog(
                                    activity,
                                    remoteVersionName,
                                    null,
                                    true,
                                    null
                            );
                        }
                    });
                    return;
                }

                String apkUrl = apkPath.startsWith("http")
                        ? apkPath
                        : BuildConfig.SITE_URL + apkPath;
                if (!apkUrl.contains("v=")) {
                    apkUrl += (apkUrl.contains("?") ? "&" : "?") + "v=" + remoteVersionCode;
                }

                final String finalApkUrl = apkUrl;
                activity.runOnUiThread(() -> showUpdateDialog(activity, remoteVersionName, finalApkUrl));
            } catch (Exception e) {
                Log.w(TAG, "Vérification de mise à jour impossible: " + e.getMessage());
            }
        });
    }
}

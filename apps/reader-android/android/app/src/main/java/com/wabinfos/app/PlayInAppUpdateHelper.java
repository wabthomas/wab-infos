package com.wabinfos.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

/**
 * Mises à jour via Google Play (apps installées depuis le Play Store).
 */
final class PlayInAppUpdateHelper {

    private static final String TAG = "PlayInAppUpdate";

    private static ActivityResultLauncher<IntentSenderRequest> updateLauncher;
    private static AppUpdateManager appUpdateManager;
    private static InstallStateUpdatedListener installListener;

    private PlayInAppUpdateHelper() {}

    static void registerLauncher(AppCompatActivity activity) {
        if (updateLauncher != null) return;
        updateLauncher = activity.registerForActivityResult(
                new androidx.activity.result.contract.ActivityResultContracts.StartIntentSenderForResult(),
                result -> {
                    if (result.getResultCode() != Activity.RESULT_OK) {
                        Log.d(TAG, "Flux Play annulé ou échoué (code=" + result.getResultCode() + ")");
                    }
                }
        );
        appUpdateManager = AppUpdateManagerFactory.create(activity);
    }

    static boolean isInstalledFromPlayStore(Context context) {
        try {
            String installer = context.getPackageManager().getInstallerPackageName(context.getPackageName());
            return "com.android.vending".equals(installer)
                    || "com.google.android.feedback".equals(installer);
        } catch (Exception e) {
            return false;
        }
    }

    static void checkForUpdate(AppCompatActivity activity, Runnable onNoPlayUpdate) {
        if (appUpdateManager == null) {
            appUpdateManager = AppUpdateManagerFactory.create(activity);
        }
        if (updateLauncher == null) {
            registerLauncher(activity);
        }

        appUpdateManager.getAppUpdateInfo().addOnSuccessListener(appUpdateInfo -> {
            if (appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                    && appUpdateInfo.availableVersionCode() > currentVersionCode(activity)) {
                activity.runOnUiThread(() ->
                        UpdateManager.showPlayStoreUpdateDialog(activity, appUpdateInfo)
                );
                return;
            }
            if (onNoPlayUpdate != null) {
                onNoPlayUpdate.run();
            }
        }).addOnFailureListener(e -> {
            Log.w(TAG, "Play In-App Update indisponible: " + e.getMessage());
            if (onNoPlayUpdate != null) {
                onNoPlayUpdate.run();
            }
        });
    }

    static void startUpdateFlow(AppCompatActivity activity, AppUpdateInfo appUpdateInfo) {
        if (appUpdateManager == null || updateLauncher == null) {
            openPlayStoreListing(activity);
            return;
        }

        int updateType = appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)
                ? AppUpdateType.FLEXIBLE
                : AppUpdateType.IMMEDIATE;

        if (updateType == AppUpdateType.FLEXIBLE) {
            attachFlexibleListener(activity);
        }

        AppUpdateOptions options = AppUpdateOptions.newBuilder(updateType).build();
        appUpdateManager.startUpdateFlowForResult(appUpdateInfo, updateLauncher, options);
    }

    static void resumeIfFlexibleUpdateDownloaded(AppCompatActivity activity) {
        if (appUpdateManager == null) {
            appUpdateManager = AppUpdateManagerFactory.create(activity);
        }
        appUpdateManager.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (info.installStatus() == InstallStatus.DOWNLOADED) {
                UpdateManager.showNativeToast(
                        activity,
                        activity.getString(R.string.update_play_restart)
                );
                appUpdateManager.completeUpdate();
            }
        });
    }

    static void openPlayStoreListing(Context context) {
        String pkg = context.getPackageName();
        try {
            Intent market = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + pkg));
            market.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(market);
        } catch (ActivityNotFoundException e) {
            Intent web = new Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=" + pkg)
            );
            web.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(web);
        }
    }

    private static void attachFlexibleListener(AppCompatActivity activity) {
        if (installListener != null || appUpdateManager == null) return;
        installListener = state -> {
            if (state.installStatus() == InstallStatus.DOWNLOADED) {
                UpdateManager.showNativeToast(
                        activity,
                        activity.getString(R.string.update_play_restart)
                );
                appUpdateManager.completeUpdate();
            }
        };
        appUpdateManager.registerListener(installListener);
    }

    private static int currentVersionCode(Context context) {
        try {
            return UpdateManager.getLocalVersionJson(context).getInt("versionCode");
        } catch (Exception e) {
            return Integer.MAX_VALUE;
        }
    }
}

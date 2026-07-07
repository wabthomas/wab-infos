package com.wabinfos.app;

import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class FcmService extends FirebaseMessagingService {

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        // Les abonnements sont gérés par sujet ("all_users"/"news"), donc aucun
        // enregistrement individuel de token n'est nécessaire côté serveur.
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        String title = "Wab-infos";
        String body = "";
        String clickUrl = "https://wab-infos.com";
        String imageUrl = null;

        if (remoteMessage.getNotification() != null) {
            if (remoteMessage.getNotification().getTitle() != null) {
                title = remoteMessage.getNotification().getTitle();
            }
            if (remoteMessage.getNotification().getBody() != null) {
                body = remoteMessage.getNotification().getBody();
            }
            if (remoteMessage.getNotification().getImageUrl() != null) {
                imageUrl = remoteMessage.getNotification().getImageUrl().toString();
            }
        }
        if (remoteMessage.getData().containsKey("url")) {
            clickUrl = remoteMessage.getData().get("url");
        }
        if (imageUrl == null && remoteMessage.getData().containsKey("image")) {
            imageUrl = remoteMessage.getData().get("image");
        }

        showNotification(title, body, clickUrl, imageUrl);
    }

    private void showNotification(String title, String body, String url, String imageUrl) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("open_url", url);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, WabInfosApp.CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setColor(Color.parseColor("#0f0f14"))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent);

        Bitmap image = imageUrl != null ? downloadImage(imageUrl) : null;
        if (image != null) {
            builder.setLargeIcon(image);
            builder.setStyle(new NotificationCompat.BigPictureStyle()
                    .bigPicture(image)
                    .bigLargeIcon((Bitmap) null)
                    .setSummaryText(body));
        }

        NotificationManagerCompat.from(this).notify((int) System.currentTimeMillis(), builder.build());
    }

    private Bitmap downloadImage(String urlString) {
        try {
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            connection.setDoInput(true);
            connection.connect();
            InputStream input = connection.getInputStream();
            Bitmap bitmap = android.graphics.BitmapFactory.decodeStream(input);
            input.close();
            return bitmap;
        } catch (Exception e) {
            return null;
        }
    }
}

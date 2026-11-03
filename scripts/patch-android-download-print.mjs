import fs from 'node:fs';
const file = 'apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java';
let text = fs.readFileSync(file, 'utf8');
const steps = [
  ['import android.content.pm.PackageManager;', 'import android.Manifest;\nimport android.content.pm.PackageManager;'],
  [
    '        @android.webkit.JavascriptInterface\n        public void printPage() {\n            printCurrentWebView();\n        }',
    `        @android.webkit.JavascriptInterface
        public void savePdf(String base64, String fileName) {
            saveFile(base64, fileName, "application/pdf");
        }

        @android.webkit.JavascriptInterface
        public void printPage() {
            printCurrentWebView();
        }`,
  ],
  [
    '    private void startNativeDownload(String url, String userAgent, String contentDisposition, String mimeType) {\n        try {',
    `    private void startNativeDownload(String url, String userAgent, String contentDisposition, String mimeType) {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P
                && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 7311);
            Toast.makeText(this, "Autorisez le stockage pour télécharger, puis réessayez.", Toast.LENGTH_LONG).show();
            return;
        }
        try {`,
  ],
];
for (const [from, to] of steps) {
  const before = text;
  text = text.split(from).join(to);
  console.log(text === before ? 'MISS ' + from.slice(0, 40) : 'OK ' + from.slice(0, 40));
}
fs.writeFileSync(file, text, 'utf8');

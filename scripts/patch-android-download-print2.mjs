import fs from 'node:fs';
const file = 'apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java';
let text = fs.readFileSync(file, 'utf8');

if (!text.includes('public void savePdf')) {
  text = text.replace(
    /(@android\.webkit\.JavascriptInterface\r?\n        public void printPage\(\) \{)/,
    `@android.webkit.JavascriptInterface
        public void savePdf(String base64, String fileName) {
            saveFile(base64, fileName, "application/pdf");
        }

        $1`,
  );
}

text = text.replace(
  /(private void startNativeDownload\(String url, String userAgent, String contentDisposition, String mimeType\) \{\r?\n)(        try \{)/,
  `$1        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P
                && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 7311);
            Toast.makeText(this, "Autorisez le stockage pour télécharger, puis réessayez.", Toast.LENGTH_LONG).show();
            return;
        }
$2`,
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('public void savePdf') ? 'SAVEPDF_OK' : 'SAVEPDF_MISS');
console.log(text.includes('7311') ? 'PERM_OK' : 'PERM_MISS');

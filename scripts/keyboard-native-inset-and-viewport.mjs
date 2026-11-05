import fs from 'node:fs';

// --- Web : hauteur visible = min(visualViewport, innerHeight) + inset clavier natif ---
let form = fs.readFileSync('apps/redaction/src/components/redaction/rh/my-submissions.tsx', 'utf8');
const start = form.indexOf('  const [viewportBox, setViewportBox]');
if (start >= 0) {
  const endMarker = '  }, [formOpen]);';
  const end = form.indexOf(endMarker, start);
  if (end > start) {
    form = form.slice(0, start) + `  const [viewportBox, setViewportBox] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    if (!formOpen || window.innerWidth >= 1024) { setViewportBox(null); return; }
    let nativeInset = 0;
    const update = () => {
      const visual = window.visualViewport;
      const visible = Math.min(visual?.height ?? window.innerHeight, window.innerHeight);
      const keyboard = Math.max(nativeInset, Math.max(0, window.innerHeight - visible));
      setViewportBox({ top: 0, height: Math.max(260, window.innerHeight - keyboard) });
    };
    const onNativeInset = (event: Event) => {
      const detail = (event as CustomEvent<{ inset?: number }>).detail;
      if (typeof detail?.inset === 'number') { nativeInset = Math.max(0, detail.inset); update(); }
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('wab-keyboard-inset', onNativeInset);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('wab-keyboard-inset', onNativeInset);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [formOpen]);
` + form.slice(end + endMarker.length);
  }
}
fs.writeFileSync('apps/redaction/src/components/redaction/rh/my-submissions.tsx', form, 'utf8');
console.log('WEB', form.includes('wab-keyboard-inset') ? 'OK' : 'MISS');

// --- Natif : mesurer l'insert clavier IME et l'envoyer à la page ---
let java = fs.readFileSync('apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java', 'utf8');
if (!java.includes('emitKeyboardInset')) {
  java = java.replace(
    "import androidx.core.content.FileProvider;",
    "import androidx.core.content.FileProvider;\nimport androidx.core.view.ViewCompat;\nimport androidx.core.view.WindowInsetsCompat;",
  );
  java = java.replace(
    "        webView.addJavascriptInterface(new NativeBridge(), \"AndroidBridge\");",
    `        webView.addJavascriptInterface(new NativeBridge(), "AndroidBridge");

        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, insets) -> {
            int ime = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom;
            emitKeyboardInset(ime);
            return insets;
        });`,
  );
  java = java.replace(
    "    public void emitApkUpdateProgress(int percent) {",
    `    public void emitKeyboardInset(int px) {
        final int cssPx = Math.round(px / getResources().getDisplayMetrics().density);
        runOnUiThread(() -> {
            if (webView == null) return;
            try {
                webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('wab-keyboard-inset',{detail:{inset:" + cssPx + "}}));", null);
            } catch (Exception ignored) { }
        });
    }

    public void emitApkUpdateProgress(int percent) {`,
  );
}
fs.writeFileSync('apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java', java, 'utf8');
console.log('JAVA', java.includes('emitKeyboardInset') ? 'OK' : 'MISS');

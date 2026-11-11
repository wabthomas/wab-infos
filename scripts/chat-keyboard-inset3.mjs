import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/chat.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  "      const viewportBottom = isNative\n        ? Math.max(120, window.innerHeight - Math.max(0, keyboardInset))\n        : ((visual?.height ?? window.innerHeight) + (visual?.offsetTop ?? 0));",
  "      const visualBottom = (visual?.height ?? window.innerHeight) + (visual?.offsetTop ?? 0);\n      const nativeBottom = window.innerHeight - Math.max(0, keyboardInset);\n      // min() couvre les deux comportements Android : WebView redimensionnée (visualViewport)\n      // ou clavier superposé (insets IME natifs). On ne peut ainsi jamais dépasser sous le clavier.\n      const viewportBottom = isNative ? Math.max(120, Math.min(nativeBottom, visualBottom)) : visualBottom;",
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('visualBottom') && text.includes('Math.min(nativeBottom') ? 'OK' : 'MISS');

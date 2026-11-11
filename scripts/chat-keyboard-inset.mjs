import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/chat.tsx';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('useEditorKeyboardInset')) {
  text = text.replace("import { fetchRedaction } from '@/lib/redaction/public-path';", "import { fetchRedaction } from '@/lib/redaction/public-path';\nimport { useEditorKeyboardInset } from '@/lib/redaction/use-editor-keyboard-inset';\nimport { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';");
  text = text.replace(
    "  const [chatHeight, setChatHeight] = useState('calc(100dvh - 15rem)');",
    "  const { keyboardInset } = useEditorKeyboardInset();\n  const [chatHeight, setChatHeight] = useState('calc(100dvh - 15rem)');",
  );
  text = text.replace(
    "  useEffect(() => {\n    const visual = window.visualViewport;\n    const resize = () => {\n      const top = section.current?.getBoundingClientRect().top ?? 160;\n      const nav = document.querySelector('.redaction-mobile-nav')?.getBoundingClientRect().height ?? 76;\n      setChatHeight(`${Math.max(120, (visual?.height ?? window.innerHeight) + (visual?.offsetTop ?? 0) - Math.max(0, top) - nav - 4)}px`);\n      if (document.activeElement === input.current) window.setTimeout(() => composer.current?.scrollIntoView({ block: 'nearest' }), 80);\n    };",
    "  useEffect(() => {\n    const visual = window.visualViewport;\n    const isNative = isNativeCapacitorFromUserAgent();\n    const resize = () => {\n      const top = section.current?.getBoundingClientRect().top ?? 160;\n      const nav = document.querySelector('.redaction-mobile-nav')?.getBoundingClientRect().height ?? 0;\n      // Navigateur mobile : visualViewport se réduit au-dessus du clavier.\n      // APK edge-to-edge : le clavier SUPERPOSE la WebView ; la hauteur IME native est poussée par Android.\n      const viewportBottom = isNative\n        ? Math.max(120, window.innerHeight - Math.max(0, keyboardInset))\n        : ((visual?.height ?? window.innerHeight) + (visual?.offsetTop ?? 0));\n      setChatHeight(`${Math.max(120, viewportBottom - Math.max(0, top) - nav - 4)}px`);\n      if (document.activeElement === input.current) window.setTimeout(() => composer.current?.scrollIntoView({ block: 'nearest' }), 80);\n    };",
  );
  text = text.replace("  }, [mobileView]);\n  useEffect(() => { window.dispatchEvent", "  }, [mobileView, keyboardInset]);\n  useEffect(() => { window.dispatchEvent");
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('keyboardInset') && text.includes('viewportBottom') ? 'OK' : 'MISS');

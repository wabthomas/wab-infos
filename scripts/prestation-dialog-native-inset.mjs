import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-submissions.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  "  const [visibleViewport, setVisibleViewport] = useState({ top: '0px', height: '100dvh' });",
  "  const nativeInsetRef = useRef(0);\n  const [visibleViewport, setVisibleViewport] = useState({ top: '0px', height: '100dvh' });",
);
text = text.replace(
  "    const resize = () => {\n      setVisibleViewport({ top: `${Math.max(0, viewport.offsetTop)}px`, height: `${Math.max(120, viewport.height)}px` });\n      requestAnimationFrame(keepFocusedFieldVisible);\n    };",
  "    const resize = () => {\n      const base = Math.min(viewport.height, window.innerHeight);\n      const height = Math.max(120, base - nativeInsetRef.current);\n      setVisibleViewport({ top: `${Math.max(0, viewport.offsetTop)}px`, height: `${height}px` });\n      requestAnimationFrame(keepFocusedFieldVisible);\n    };\n    const onNativeInset = (event: Event) => {\n      const detail = (event as CustomEvent<{ inset?: number }>).detail;\n      nativeInsetRef.current = Math.max(0, Number(detail?.inset) || 0);\n      resize();\n    };",
);
text = text.replace(
  "    window.addEventListener('resize', resize);\n    return () => {",
  "    window.addEventListener('resize', resize);\n    window.addEventListener('wab-keyboard-inset', onNativeInset);\n    return () => {",
);
text = text.replace(
  "      window.removeEventListener('resize', resize);\n    };",
  "      window.removeEventListener('resize', resize);\n      window.removeEventListener('wab-keyboard-inset', onNativeInset);\n    };",
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('wab-keyboard-inset') ? 'OK' : 'MISS');

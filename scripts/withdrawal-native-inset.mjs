import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-withdrawals.tsx';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('nativeInsetRef')) {
  text = text.replace(
    "  const [viewport, setViewport] = useState({ top: '0px', height: '100dvh' });",
    "  const nativeInsetRef = useRef(0);\n  const [viewport, setViewport] = useState({ top: '0px', height: '100dvh' });",
  );
  text = text.replace(
    "    const resize = () => {\n      setViewport({top: `${Math.max(0, visual.offsetTop)}px`, height: `${Math.max(120, visual.height)}px`});",
    "    const resize = () => {\n      const height = Math.max(120, Math.min(visual.height, window.innerHeight) - nativeInsetRef.current);\n      setViewport({top: `${Math.max(0, visual.offsetTop)}px`, height: `${height}px`});",
  );
  text = text.replace(
    "    resize();\n    visual.addEventListener('resize', resize);\n    visual.addEventListener('scroll', resize);\n    return () => { visual.removeEventListener('resize', resize); visual.removeEventListener('scroll', resize); };",
    "    const onNativeInset = (event: Event) => {\n      const detail = (event as CustomEvent<{ inset?: number }>).detail;\n      nativeInsetRef.current = Math.max(0, Number(detail?.inset) || 0);\n      resize();\n    };\n    resize();\n    visual.addEventListener('resize', resize);\n    visual.addEventListener('scroll', resize);\n    window.addEventListener('wab-keyboard-inset', onNativeInset);\n    return () => { visual.removeEventListener('resize', resize); visual.removeEventListener('scroll', resize); window.removeEventListener('wab-keyboard-inset', onNativeInset); };",
  );
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('nativeInsetRef') ? 'OK' : 'MISS');

import fs from 'node:fs';
// Modal unifié
{
  const file = 'apps/redaction/src/components/redaction/rh/rh-form-modal.tsx';
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('nativeInsetRef')) {
    text = text.replace(
      "  const layer = useRef<HTMLDivElement>(null);",
      "  const nativeInsetRef = useRef(0);\n  const layer = useRef<HTMLDivElement>(null);",
    );
    text = text.replace(
      "    const resize = () => setViewport({ top: `${Math.max(0, visual.offsetTop)}px`, height: `${Math.max(120, visual.height)}px` });\n    resize();\n    visual.addEventListener('resize', resize);\n    visual.addEventListener('scroll', resize);\n    return () => { visual.removeEventListener('resize', resize); visual.removeEventListener('scroll', resize); };",
      "    const resize = () => {\n      const height = Math.max(120, Math.min(visual.height, window.innerHeight) - nativeInsetRef.current);\n      setViewport({ top: `${Math.max(0, visual.offsetTop)}px`, height: `${height}px` });\n    };\n    const onNativeInset = (event: Event) => {\n      const detail = (event as CustomEvent<{ inset?: number }>).detail;\n      nativeInsetRef.current = Math.max(0, Number(detail?.inset) || 0);\n      resize();\n    };\n    resize();\n    visual.addEventListener('resize', resize);\n    visual.addEventListener('scroll', resize);\n    window.addEventListener('wab-keyboard-inset', onNativeInset);\n    return () => { visual.removeEventListener('resize', resize); visual.removeEventListener('scroll', resize); window.removeEventListener('wab-keyboard-inset', onNativeInset); };",
    );
  }
  fs.writeFileSync(file, text, 'utf8');
  console.log('MODAL', text.includes('nativeInsetRef') ? 'OK' : 'MISS');
}
// Retraits
{
  const file = 'apps/redaction/src/components/redaction/rh/my-withdrawals.tsx';
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('onNativeInset')) {
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
  console.log('WITHDRAW', text.includes('onNativeInset') ? 'OK' : 'MISS');
}

import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-withdrawals.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const resizeIdx = lines.findIndex((line, i) => line.includes('const resize = () => {') && lines[i + 1]?.includes('setViewport({top:'));
if (resizeIdx >= 0) lines[resizeIdx + 1] = "      const height = Math.max(120, Math.min(visual.height, window.innerHeight) - nativeInsetRef.current);\n      setViewport({top: `${Math.max(0, visual.offsetTop)}px`, height: `${height}px`});";
const visualResize = lines.findIndex(line => line.includes("visual.addEventListener('resize', resize);"));
if (visualResize >= 0 && !lines.some(line => line.includes('wab-keyboard-inset'))) {
  lines.splice(visualResize, 0,
    '    const onNativeInset = (event: Event) => {',
    '      const detail = (event as CustomEvent<{ inset?: number }>).detail;',
    '      nativeInsetRef.current = Math.max(0, Number(detail?.inset) || 0);',
    '      resize();',
    '    };',
  );
  const returnIdx = lines.findIndex((line, i) => i > visualResize && line.includes("visual.removeEventListener('resize', resize);"));
  if (returnIdx >= 0) {
    lines.splice(returnIdx, 1,
      "    visual.addEventListener('resize', resize);\n    visual.addEventListener('scroll', resize);\n    window.addEventListener('wab-keyboard-inset', onNativeInset);\n    return () => { visual.removeEventListener('resize', resize); visual.removeEventListener('scroll', resize); window.removeEventListener('wab-keyboard-inset', onNativeInset); };",
    );
  }
}
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(fs.readFileSync(file, 'utf8').includes('wab-keyboard-inset') ? 'OK' : 'MISS');

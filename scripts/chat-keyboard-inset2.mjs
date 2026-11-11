import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/chat.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line.trim() === 'const visual = window.visualViewport;');
const end = lines.findIndex((line, i) => i > start && line.trim() === '};' && lines[i + 1]?.trim() === 'resize();');
if (start < 0 || end < 0) { console.log('MISS', start, end); process.exit(1); }
lines.splice(start, end - start + 1,
  '    const visual = window.visualViewport;',
  '    const isNative = isNativeCapacitorFromUserAgent();',
  '    const resize = () => {',
  "      const top = section.current?.getBoundingClientRect().top ?? 160;",
  "      const nav = document.querySelector('.redaction-mobile-nav')?.getBoundingClientRect().height ?? 0;",
  '      // Navigateur : visualViewport se réduit au-dessus du clavier.',
  '      // APK edge-to-edge : le clavier superpose la WebView ; Android pousse la hauteur IME (__wabImeBottom).',
  '      const viewportBottom = isNative',
  '        ? Math.max(120, window.innerHeight - Math.max(0, keyboardInset))',
  '        : ((visual?.height ?? window.innerHeight) + (visual?.offsetTop ?? 0));',
  '      setChatHeight(`${Math.max(120, viewportBottom - Math.max(0, top) - nav - 4)}px`);',
  "      if (document.activeElement === input.current) window.setTimeout(() => composer.current?.scrollIntoView({ block: 'nearest' }), 80);",
  '    };',
);
const dep = lines.findIndex(line => line.trim() === '}, [mobileView]);');
if (dep >= 0) lines[dep] = '  }, [mobileView, keyboardInset]);';
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('OK');

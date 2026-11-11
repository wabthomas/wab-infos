import fs from 'node:fs';
function patch(file, kind) {
  const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const r = lines.findIndex(line => line.trim() === 'const resize = () => {');
  if (kind === 'sub') {
    const base = lines.findIndex((line, i) => i > r && line.includes('const base = Math.min(viewport.height'));
    lines.splice(base, 2,
      '      const offsetTop = Math.max(0, viewport.offsetTop);',
      '      const visualBottom = viewport.height + offsetTop;',
      '      const keyboardBottom = window.innerHeight - Math.max(0, keyboardInset);',
      '      const height = Math.max(120, Math.min(visualBottom, keyboardBottom) - offsetTop);',
    );
  } else {
    const height = lines.findIndex((line, i) => i > r && line.includes('Math.min(visual.height'));
    lines.splice(height, 1,
      '      const offsetTop = Math.max(0, visual.offsetTop);',
      '      const visualBottom = visual.height + offsetTop;',
      '      const keyboardBottom = window.innerHeight - Math.max(0, keyboardInset);',
      '      const height = Math.max(120, Math.min(visualBottom, keyboardBottom) - offsetTop);',
    );
  }
  const nativeStart = lines.findIndex(line => line.trim().startsWith('const onNativeInset'));
  if (nativeStart >= 0) {
    let end = nativeStart;
    while (end < lines.length && lines[end].trim() !== '};') end += 1;
    lines.splice(nativeStart, end - nativeStart + 1);
  }
  lines = lines.filter(line => !line.includes("wab-keyboard-inset"));
  const dep = lines.findIndex(line => line.trim() === (kind === 'sub' ? '}, [formOpen]);' : '}, [requestOpen, submitted]);'));
  if (dep >= 0) lines[dep] = kind === 'sub' ? '  }, [formOpen, keyboardInset]);' : '  }, [requestOpen, submitted, keyboardInset]);';
  fs.writeFileSync(file, lines.join(eol), 'utf8');
  console.log(kind, 'OK');
}
patch('apps/redaction/src/components/redaction/rh/my-submissions.tsx', 'sub');
patch('apps/redaction/src/components/redaction/rh/my-withdrawals.tsx', 'wit');

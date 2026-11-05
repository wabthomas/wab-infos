import fs from 'node:fs';

function resolve(file, replacer) {
  let text = fs.readFileSync(file, 'utf8');
  let index = 0;
  text = text.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> origin\/arena\/560e4c63-wab-infos\r?\n/g, (_m, ours, theirs) => {
    const result = replacer(index++, ours, theirs);
    return result;
  });
  fs.writeFileSync(file, text, 'utf8');
  console.log(file, !text.includes('<<<<<<<') ? 'RESOLVED' : 'STILL');
}

const prestationKeyboard = `  const formRef = useRef<HTMLFormElement>(null);
  const nativeInsetRef = useRef(0);
  const [visibleViewport, setVisibleViewport] = useState({ top: '0px', height: '100dvh' });
  useEffect(() => {
    if (!formOpen) return;
    const viewport = window.visualViewport;
    const keepFocusedFieldVisible = () => {
      const form = formRef.current;
      const field = document.activeElement;
      if (!form || !(field instanceof HTMLElement) || !form.contains(field)) return;
      const bounds = form.getBoundingClientRect();
      const focus = field.getBoundingClientRect();
      if (focus.bottom > bounds.bottom - 72) form.scrollTop += focus.bottom - (bounds.bottom - 72);
      else if (focus.top < bounds.top + 12) form.scrollTop -= bounds.top + 12 - focus.top;
    };
    const resize = () => {
      const base = Math.min(viewport?.height ?? window.innerHeight, window.innerHeight);
      const height = Math.max(120, base - nativeInsetRef.current);
      setVisibleViewport({ top: \`\${Math.max(0, viewport?.offsetTop ?? 0)}px\`, height: \`\${height}px\` });
      requestAnimationFrame(keepFocusedFieldVisible);
    };
    const onNativeInset = (event: Event) => {
      const detail = (event as CustomEvent<{ inset?: number }>).detail;
      nativeInsetRef.current = Math.max(0, Number(detail?.inset) || 0);
      resize();
    };
    resize();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize);
    window.addEventListener('wab-keyboard-inset', onNativeInset);
    return () => {
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      window.removeEventListener('resize', resize);
      window.removeEventListener('wab-keyboard-inset', onNativeInset);
    };
  }, [formOpen]);

`;

resolve('apps/redaction/src/components/redaction/rh/my-submissions.tsx', (index, ours, theirs) => {
  if (index === 0) return prestationKeyboard;
  // JSX : structure Arena (viewport CSS vars + formRef) avec notre hauteur calculée.
  return theirs;
});

resolve('apps/redaction/src/components/redaction/rh/official-documents.tsx', () =>
  '      <div data-official-toolbar className="no-print mt-4 flex flex-wrap items-center gap-2">\n',
);

resolve('apps/redaction/src/components/redaction/rh/rh-section-shell.tsx', (_index, _ours, theirs) => theirs);

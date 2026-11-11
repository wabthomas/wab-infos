import fs from 'node:fs';
// RhFormModal : hook natif fiable
{
  const file = 'apps/redaction/src/components/redaction/rh/rh-form-modal.tsx';
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('useEditorKeyboardInset')) {
    text = text.replace("import { createPortal } from 'react-dom';", "import { createPortal } from 'react-dom';\nimport { useEditorKeyboardInset } from '@/lib/redaction/use-editor-keyboard-inset';");
    text = text.replace(
      "  const [viewport, setViewport] = useState({ top: '0px', height: '100dvh' });",
      "  const { keyboardInset } = useEditorKeyboardInset();\n  const [viewport, setViewport] = useState({ top: '0px', height: '100dvh' });",
    );
    text = text.replace(
      "    const resize = () => setViewport({ top: `${Math.max(0, visual.offsetTop)}px`, height: `${Math.max(120, visual.height)}px` });",
      "    const resize = () => {\n      const offsetTop = Math.max(0, visual.offsetTop);\n      const visualBottom = (visual.height) + offsetTop;\n      const keyboardBottom = window.innerHeight - Math.max(0, keyboardInset);\n      const height = Math.max(120, Math.min(visualBottom, keyboardBottom) - offsetTop);\n      setViewport({ top: `${offsetTop}px`, height: `${height}px` });\n    };",
    );
    text = text.replace("  }, [open]);\n  if (!open", "  }, [open, keyboardInset]);\n  if (!open");
  }
  fs.writeFileSync(file, text, 'utf8');
  console.log('MODAL', text.includes('keyboardInset') ? 'OK' : 'MISS');
}

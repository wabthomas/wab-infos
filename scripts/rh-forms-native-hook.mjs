import fs from 'node:fs';
// Prestations
{
  const file = 'apps/redaction/src/components/redaction/rh/my-submissions.tsx';
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('useEditorKeyboardInset')) {
    text = text.replace("import { fetchRedaction } from '@/lib/redaction/public-path';", "import { fetchRedaction } from '@/lib/redaction/public-path';\nimport { useEditorKeyboardInset } from '@/lib/redaction/use-editor-keyboard-inset';");
    text = text.replace("  const nativeInsetRef = useRef(0);", "  const { keyboardInset } = useEditorKeyboardInset();");
    text = text.replace(
      "    const resize = () => {\n      const base = Math.min(viewport.height, window.innerHeight);\n      const height = Math.max(120, base - nativeInsetRef.current);\n      setVisibleViewport({ top: `${Math.max(0, viewport.offsetTop)}px`, height: `${height}px` });\n      requestAnimationFrame(keepFocusedFieldVisible);\n    };\n    const onNativeInset = (event: Event) => {\n      const detail = (event as CustomEvent<{ inset?: number }>).detail;\n      nativeInsetRef.current = Math.max(0, Number(detail?.inset) || 0);\n      resize();\n    };",
      "    const resize = () => {\n      const offsetTop = Math.max(0, viewport.offsetTop);\n      const visualBottom = viewport.height + offsetTop;\n      const keyboardBottom = window.innerHeight - Math.max(0, keyboardInset);\n      const height = Math.max(120, Math.min(visualBottom, keyboardBottom) - offsetTop);\n      setVisibleViewport({ top: `${offsetTop}px`, height: `${height}px` });\n      requestAnimationFrame(keepFocusedFieldVisible);\n    };",
    );
    text = text.replace("    window.addEventListener('wab-keyboard-inset', onNativeInset);\n", "");
    text = text.replace("      window.removeEventListener('wab-keyboard-inset', onNativeInset);\n", "");
    text = text.replace("  }, [formOpen]);\n  const [queued", "  }, [formOpen, keyboardInset]);\n  const [queued");
  }
  fs.writeFileSync(file, text, 'utf8');
  console.log('Prestations', text.includes('useEditorKeyboardInset') && text.includes('keyboardBottom') ? 'OK' : 'MISS');
}
// Retraits
{
  const file = 'apps/redaction/src/components/redaction/rh/my-withdrawals.tsx';
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('useEditorKeyboardInset')) {
    text = text.replace("import { fetchRedaction } from '@/lib/redaction/public-path';", "import { fetchRedaction } from '@/lib/redaction/public-path';\nimport { useEditorKeyboardInset } from '@/lib/redaction/use-editor-keyboard-inset';");
    text = text.replace("  const nativeInsetRef = useRef(0);", "  const { keyboardInset } = useEditorKeyboardInset();");
    text = text.replace(
      "      const height = Math.max(120, Math.min(visual.height, window.innerHeight) - nativeInsetRef.current);\n      setViewport({top: `${Math.max(0, visual.offsetTop)}px`, height: `${height}px`});",
      "      const offsetTop = Math.max(0, visual.offsetTop);\n      const visualBottom = visual.height + offsetTop;\n      const keyboardBottom = window.innerHeight - Math.max(0, keyboardInset);\n      const height = Math.max(120, Math.min(visualBottom, keyboardBottom) - offsetTop);\n      setViewport({top: `${offsetTop}px`, height: `${height}px`});",
    );
    text = text.replace("    const onNativeInset = (event: Event) => {\n      const detail = (event as CustomEvent<{ inset?: number }>).detail;\n      nativeInsetRef.current = Math.max(0, Number(detail?.inset) || 0);\n      resize();\n    };\n", "");
    text = text.replace("    window.addEventListener('wab-keyboard-inset', onNativeInset);\n", "");
    text = text.replace(" window.removeEventListener('wab-keyboard-inset', onNativeInset);", "");
    text = text.replace("  }, [requestOpen, submitted]);\n\n  useEffect", "  }, [requestOpen, submitted, keyboardInset]);\n\n  useEffect");
  }
  fs.writeFileSync(file, text, 'utf8');
  console.log('Retraits', text.includes('useEditorKeyboardInset') && text.includes('keyboardBottom') ? 'OK' : 'MISS');
}

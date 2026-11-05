import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-submissions.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace("  const nativeInsetRef = useRef(0);\n  const nativeInsetRef = useRef(0);", "  const nativeInsetRef = useRef(0);");
fs.writeFileSync(file, text, 'utf8');
console.log((text.match(/const nativeInsetRef/g) || []).length === 1 ? 'OK' : 'STILL');

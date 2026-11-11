import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-submissions.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
lines[60] = '  }, [formOpen]);';
lines[92] = '  }, [formOpen, keyboardInset]);';
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(lines[60].trim(), '|', lines[92].trim());

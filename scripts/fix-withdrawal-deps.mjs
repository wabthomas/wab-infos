import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-withdrawals.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
lines[107] = '  }, [requestOpen, submitted]);';
lines[131] = '  }, [requestOpen, submitted, keyboardInset]);';
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(lines[107].trim(), '|', lines[131].trim());

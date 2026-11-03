import fs from 'node:fs';
const file = 'tests/rh-audit-pagination.test.mjs';
let text = fs.readFileSync(file, 'utf8');
text = text.replace("/\\(capabilities\\.hrManage \\|\\| capabilities\\.accessManage\\) && <AuditJournal/", "/\\(capabilities\\.hrManage \\|\\| capabilities\\.accessManage\\) && <AuditJournal/");
// Ensure literal parentheses are escaped in the source regex.
text = text.replace(
  "assert.match(page, /(capabilities\\.hrManage \\|\\| capabilities\\.accessManage) && <AuditJournal/);",
  "assert.match(page, /\\(capabilities\\.hrManage \\|\\| capabilities\\.accessManage\\) && <AuditJournal/);",
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('\\\\(capabilities') ? 'OK' : 'MISS');

import fs from 'node:fs';
const file = 'tests/rh-attendance.test.mjs';
let text = fs.readFileSync(file, 'utf8');
text = text.replace("ATTENDANCE_END_TIME, '15:00'", "ATTENDANCE_END_TIME, '18:00'");
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes("'18:00'") ? 'UPDATED' : 'MISS');

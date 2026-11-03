import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/extras-db.ts';
let text = fs.readFileSync(file, 'utf8');
const before = text;
text = text.replace(
  "action === 'out' ? `UPDATE redaction_rh.attendance SET check_out=$3,check_out_received_at=now() WHERE collaborator_id=$2 AND work_date=($3::timestamptz AT TIME ZONE 'Africa/Lubumbashi')::date AND check_in IS NOT NULL AND check_in <= $3 AND check_out IS NULL",
  "action === 'out' ? `UPDATE redaction_rh.attendance SET check_out=$1,check_out_received_at=now() WHERE collaborator_id=$2 AND work_date=($1::timestamptz AT TIME ZONE 'Africa/Lubumbashi')::date AND check_in IS NOT NULL AND check_in <= $1 AND check_out IS NULL",
);
text = text.replace(
  "      [randomUUID(), person, eventTime.toISOString()]\n    );",
  "      action === 'out' ? [eventTime.toISOString(), person] : [randomUUID(), person, eventTime.toISOString()]\n    );",
);
fs.writeFileSync(file, text, 'utf8');
console.log(text === before ? 'MISS' : 'FIXED');

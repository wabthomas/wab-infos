import fs from 'node:fs';
const file = 'apps/redaction/src/app/api/redaction/rh/mon-espace/chat/route.ts';
let text = fs.readFileSync(file, 'utf8');
const start = text.indexOf('const previous=await client.query(`SELECT r.id FROM redaction_rh.chat_rooms');
const end = text.indexOf("if(d.action==='presence')", start);
if (start < 0 || end < 0) { console.log('MISS'); process.exit(1); }
const replacement = "const privateKey=[person.id,d.collaboratorId].sort().join(':');\nconst previous=await client.query(`SELECT r.id FROM redaction_rh.chat_rooms r JOIN redaction_rh.chat_room_members me ON me.room_id=r.id AND me.collaborator_id=$1 JOIN redaction_rh.chat_room_members other ON other.room_id=r.id AND other.collaborator_id=$2 WHERE r.kind='private' ORDER BY r.created_at DESC LIMIT 1`,[person.id,d.collaboratorId]);\nif(previous.rowCount){await client.query('COMMIT');return json({room:{id:previous.rows[0].id,title:'Discussion privée',kind:'private'}});}\nconst id=randomUUID();\nconst created=await client.query(`INSERT INTO redaction_rh.chat_rooms(id,kind,title,created_by,private_key) VALUES($1,'private',$2,$3,$4) ON CONFLICT (private_key) WHERE private_key IS NOT NULL DO NOTHING RETURNING id`,[id,'Discussion privée',person.id,privateKey]);\nif(!created.rowCount){const concurrent=await client.query('SELECT id FROM redaction_rh.chat_rooms WHERE private_key=$1',[privateKey]);await client.query('COMMIT');return json({room:{id:concurrent.rows[0]?.id,title:'Discussion privée',kind:'private'}});}\nawait client.query(`INSERT INTO redaction_rh.chat_room_members(room_id,collaborator_id) VALUES($1,$2),($1,$3)`,[id,person.id,d.collaboratorId]);await client.query('COMMIT');return json({room:{id,title:'Discussion privée',kind:'private'}},201);\n";
text = text.slice(0, start) + replacement + text.slice(end);
fs.writeFileSync(file, text, 'utf8');
console.log('ROUTE', text.includes('private_key') ? 'OK' : 'MISS');

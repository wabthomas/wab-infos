import fs from 'node:fs';
const file = 'apps/redaction/src/app/api/redaction/rh/mon-espace/chat/route.ts';
let text = fs.readFileSync(file, 'utf8');
const old = "const id=randomUUID();await client.query(`INSERT INTO redaction_rh.chat_rooms(id,kind,title,created_by) VALUES($1,'private',$2,$3)`,[id,'Discussion privée',person.id]);await client.query(`INSERT INTO redaction_rh.chat_room_members(room_id,collaborator_id) VALUES($1,$2),($1,$3)`,[id,person.id,d.collaboratorId]);await client.query('COMMIT');return json({room:{id,title:'Discussion privée',kind:'private'}},201);}";
const next = "const privateKey=[person.id,d.collaboratorId].sort().join(':');\nconst id=randomUUID();\nconst created=await client.query(`INSERT INTO redaction_rh.chat_rooms(id,kind,title,created_by,private_key) VALUES($1,'private',$2,$3,$4) ON CONFLICT (private_key) WHERE private_key IS NOT NULL DO NOTHING RETURNING id`,[id,'Discussion privée',person.id,privateKey]);\nif(!created.rowCount){const concurrent=await client.query('SELECT id FROM redaction_rh.chat_rooms WHERE private_key=$1',[privateKey]);await client.query('COMMIT');return json({room:{id:concurrent.rows[0]?.id,title:'Discussion privée',kind:'private'}});}\nawait client.query(`INSERT INTO redaction_rh.chat_room_members(room_id,collaborator_id) VALUES($1,$2),($1,$3)`,[id,person.id,d.collaboratorId]);await client.query('COMMIT');return json({room:{id,title:'Discussion privée',kind:'private'}},201);}";
if (!text.includes(old)) { console.log('MISS'); process.exit(1); }
text = text.replace(old, next);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('private_key') ? 'OK' : 'MISS');

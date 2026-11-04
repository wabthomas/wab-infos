import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planServiceCardSheet, ServiceCardOverflowError } from '../apps/redaction/src/lib/redaction/rh/service-card-export.ts';

const ctx={font:'',measureText(text){return {width:[...text].length*Number(this.font.match(/\d+(?=px)/)?.[0]??12)*.55};}};
const data={
  companyName:'Wab Infos',qr:'data:image/png;base64,AA==',logo:'/logo.png',
  card:{id:'b7c29536-ff8d-414b-bd7b-395c43819ab1',firstName:'Personne',lastName:'Exemple',cardNumber:'RH-2026-018',jobTitle:'Journaliste',team:'Rédaction',workLocation:'Kinshasa',issuedAt:'2026-11-04',expiresAt:'2027-11-04',photo:null},
};
test('planche A4 : recto-verso au format carte réel, sans page supplémentaire',()=>{
  const layout=planServiceCardSheet(ctx,data);
  const sheetWidth=2480/3,sheetHeight=3508/3;
  assert.ok(Math.abs(layout.cardWidth/sheetWidth*210-85.6)<.001);
  assert.ok(Math.abs(layout.cardHeight/sheetHeight*297-54)<.001);
  assert.ok(layout.backX>layout.frontX+layout.cardWidth);
  assert.ok(layout.backX+layout.cardWidth<sheetWidth);
  assert.ok(layout.front.some(line=>line.text==='Personne Exemple'));
  assert.ok(layout.back.some(line=>line.text==='Matricule : RH-2026-018'));
  assert.ok(layout.cardY+layout.cardHeight<sheetHeight);
});
test('carte : refuse une fonction, un nom ou un lieu dépassant l’espace disponible',()=>{
  assert.throws(()=>planServiceCardSheet(ctx,{...data,card:{...data.card,jobTitle:'Fonction interminable '.repeat(25)}}),ServiceCardOverflowError);
  assert.throws(()=>planServiceCardSheet(ctx,{...data,card:{...data.card,firstName:'Prénom '.repeat(30)}}),ServiceCardOverflowError);
  assert.throws(()=>planServiceCardSheet(ctx,{...data,card:{...data.card,workLocation:'Affectation très longue '.repeat(25)}}),ServiceCardOverflowError);
});

test('carte de presse portrait : modèle fourni, informations et mentions complètes sans coupe', async () => {
  const { planPressCardSheet } = await import('../apps/redaction/src/lib/redaction/rh/service-card-export.ts');
  const press={...data,companyName:'WAB-INFOS TV',companyWebsite:'www.wab-infos.com',companyEmail:'contact@wab-infos.com',directorName:'Thomas Zawadi',
    card:{...data.card,cardType:'press',verificationUrl:'https://app.wab-infos.com/verification/carte/'+'a'.repeat(64),firstName:'Jenny',lastName:'Ntwali',jobTitle:'Journaliste'}};
  const layout=planPressCardSheet(ctx,press),sheetWidth=2480/3,sheetHeight=3508/3;
  assert.ok(Math.abs(layout.cardWidth/sheetWidth*210-54)<.001);
  assert.ok(Math.abs(layout.cardHeight/sheetHeight*297-85.6)<.001);
  assert.equal(layout.name.join(''),'Jenny Ntwali');
  assert.ok(layout.notice.join(' ').includes('autorités tant civiles que militaires'));
  assert.ok(layout.notice.length<=3);
  assert.throws(()=>planPressCardSheet(ctx,{...press,card:{...press.card,jobTitle:'Journaliste '.repeat(40)}}),ServiceCardOverflowError);
  assert.throws(()=>planPressCardSheet(ctx,{...press,card:{...press.card,verificationUrl:''}}),ServiceCardOverflowError);
});

test('recadrage photo : zoom et déplacement restent dans le cercle sans bord vide', async () => {
  const {photoPlacement}=await import('../apps/redaction/src/lib/redaction/rh/service-card-export.ts');
  assert.deepEqual(photoPlacement(200,200,90,90),{x:0,y:0,width:90,height:90});
  assert.deepEqual(photoPlacement(200,200,90,90,{zoom:2,x:0,y:0}),{x:-45,y:-45,width:180,height:180});
  assert.deepEqual(photoPlacement(200,200,90,90,{zoom:2,x:-4,y:4}),{x:-90,y:0,width:180,height:180});
  assert.deepEqual(photoPlacement(400,200,90,90,{zoom:1,x:1,y:-1}),{x:0,y:0,width:180,height:90});
});

test('migration additive : type presse, jeton unique et carte historique de service', async () => {
  const { PGlite }=await import('@electric-sql/pglite');
  const { readFile }=await import('node:fs/promises');
  const db=new PGlite();
  try {
    await db.exec('CREATE SCHEMA redaction_rh; CREATE TABLE redaction_rh.collaborators(id uuid PRIMARY KEY); CREATE TABLE redaction_rh.service_cards(id uuid PRIMARY KEY,collaborator_id uuid REFERENCES redaction_rh.collaborators(id),card_number text,issued_at date,expires_at date,status text,created_by text);');
    await db.exec(await readFile(new URL('../docs/sql/rh-press-cards.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../docs/sql/rh-press-cards.sql',import.meta.url),'utf8'));
    const person='d3645504-f738-4ccc-926b-4f78993049be';
    await db.query('INSERT INTO redaction_rh.collaborators(id) VALUES($1)',[person]);
    const values=[person,'RH-001','2026-11-04','2027-11-04','active','admin@example.test'];
    const insert=(id,type,token)=>db.query('INSERT INTO redaction_rh.service_cards(id,collaborator_id,card_number,issued_at,expires_at,status,created_by,card_type,verification_token) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,...values,type,token]);
    await insert('8f250c83-997b-42df-b028-2600ab09a616','service',null);
    await assert.rejects(()=>insert('8f250c83-997b-42df-b028-2600ab09a617','press',null));
    await insert('8f250c83-997b-42df-b028-2600ab09a618','press','a'.repeat(64));
    await assert.rejects(()=>insert('8f250c83-997b-42df-b028-2600ab09a619','press','a'.repeat(64)));
  }finally{await db.close();}
});

test('QR public : statut révoqué et non-validité future sans données personnelles', async () => {
  const { PGlite }=await import('@electric-sql/pglite');
  const db=new PGlite();
  try {
    await db.exec('CREATE SCHEMA redaction_rh; CREATE TABLE redaction_rh.collaborators(id uuid PRIMARY KEY,archived boolean DEFAULT false); CREATE TABLE redaction_rh.service_cards(id uuid PRIMARY KEY,collaborator_id uuid REFERENCES redaction_rh.collaborators(id),card_number text,issued_at date,expires_at date,status text,card_type text,verification_token text);');
    const person='d3645504-f738-4ccc-926b-4f78993049be',id='8f250c83-997b-42df-b028-2600ab09a618';
    await db.query('INSERT INTO redaction_rh.collaborators(id) VALUES($1)',[person]);
    await db.query("INSERT INTO redaction_rh.service_cards(id,collaborator_id,card_number,issued_at,expires_at,status,card_type,verification_token) VALUES($1,$2,'RH-001',CURRENT_DATE,CURRENT_DATE+1,'active','press',$3)",[id,person,'a'.repeat(64)]);
    const query=`SELECT s.card_number,s.status,(s.status='active' AND NOT c.archived AND s.issued_at<=timezone('Africa/Kinshasa',now())::date AND s.expires_at>=timezone('Africa/Kinshasa',now())::date) AS valid_now FROM redaction_rh.service_cards s JOIN redaction_rh.collaborators c ON c.id=s.collaborator_id WHERE s.verification_token=$1 AND s.card_type='press'`;
    assert.equal((await db.query(query,['a'.repeat(64)])).rows[0].valid_now,true);
    await db.query("UPDATE redaction_rh.service_cards SET status='revoked' WHERE id=$1",[id]);
    assert.equal((await db.query(query,['a'.repeat(64)])).rows[0].valid_now,false);
    assert.equal((await db.query(query,['b'.repeat(64)])).rowCount,0);
  }finally{await db.close();}
});

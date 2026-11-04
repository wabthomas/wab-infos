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

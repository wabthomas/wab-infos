import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planEmployeeIdPage, IdPageOverflowError } from '../apps/redaction/src/lib/redaction/rh/employee-id-export.ts';

const ctx={font:'',measureText(text){return {width:[...text].length * (Number(this.font.match(/\d+(?=px)/)?.[0]??15)*.55)};}};
const data={
  firstName:'Lina',lastName:'Exemple',photo:'',seal:'',signature:'Lina Exemple',qr:'',assets:{},
  company:{companyName:'Wab Infos',documentHeader:'Ressources humaines',companyAddress:'Kinshasa',companyPhone:'',companyEmail:'',documentFooter:'Document personnel · confidentialité RH'},
  groups:[
    {title:'Identité personnelle',fields:[{label:'Nom complet',value:'Lina Exemple'},{label:'Pays',value:'RDC'},{label:'Adresse',value:'Avenue des collaborateurs, Kinshasa'},{label:'Naissance',value:'2000-01-01'},{label:'Province',value:'Kinshasa'},{label:'Ville',value:'Kinshasa'}]},
    {title:'Situation professionnelle',fields:[{label:'Fonction',value:'Journaliste'},{label:'Équipe',value:'Rédaction'},{label:'Spécialité',value:'Information'},{label:'Matricule',value:'RH-0025'},{label:'Affectation',value:'Kinshasa'},{label:'Statut',value:'Actif'},{label:'Contrat',value:'CDI'},{label:'Date d’arrivée',value:'2026-11-04'},{label:'Fin de contrat',value:'—'}]},
    {title:'Coordonnées',fields:[{label:'Téléphone',value:'000 000'},{label:'E-mail',value:'lina@example.test'},{label:'Contact d’urgence',value:'Mme Exemple'},{label:'Langues parlées',value:'Français, Lingala'}]},
  ],
};

test('fiche : une seule page A4, sections et signature non tronquées',()=>{
  const layout=planEmployeeIdPage(ctx,data);
  assert.equal(layout.boxes.length,3+19);
  assert.ok(layout.headerBottom < layout.signatureY);
  assert.ok(layout.signatureY+169 < layout.footerY);
  assert.ok(layout.lines.some(line=>line.text==='FICHE D’IDENTIFICATION'));
  assert.ok(layout.lines.some(line=>line.text==='Lina Exemple'));
  assert.ok(layout.lines.some(line=>line.text==='Page 1 / 1'));
});

test('fiche : les valeurs se répartissent sur plusieurs lignes sans coupe',()=>{
  const field='CODE'+('X'.repeat(130));
  const expanded={...data,groups:[{title:'Test',fields:[{label:'Référence',value:field}]}]};
  const layout=planEmployeeIdPage(ctx,expanded);
  const chunks=layout.lines.filter(line=>line.text.startsWith('CODE')||/^X+$/.test(line.text));
  assert.equal(chunks.map(line=>line.text).join(''),field);
});

test('fiche : refuse un contenu trop long et un pied de page trop dense',()=>{
  const long='Coordonnées à vérifier '.repeat(350);
  assert.throws(()=>planEmployeeIdPage(ctx,{...data,groups:[{title:'Identité',fields:[{label:'Adresse',value:long}]}]}),IdPageOverflowError);
  assert.throws(()=>planEmployeeIdPage(ctx,{...data,company:{...data.company,documentFooter:long}}),IdPageOverflowError);
});

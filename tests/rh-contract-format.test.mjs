import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseContractBlocks, contractRuns, formatContractSelection } from '../apps/redaction/src/lib/redaction/rh/contract-format.ts';
import { contractPartiesFromProfile } from '../apps/redaction/src/lib/redaction/rh/contract-parties.ts';
import { buildContractDocument } from '../apps/redaction/src/lib/redaction/rh/contract-document.ts';

const data = clauses => ({ kind:'CDD', firstName:'Personne',lastName:'Exemple',jobTitle:'Rédaction',workLocation:'Ville',startDate:'2026-01-01',endDate:'2026-12-31',salary:'100',currency:'CDF',clauses,employer:{companyName:'Entreprise Exemple',directorName:'Direction Exemple',directorTitle:'Direction'} });

test('clauses existantes et nouvelles : articles, listes et emphases sans HTML', () => {
  const blocks = parseContractBlocks('**Article 1 : Objet**\n\n\nTexte **fort**, *nuancé* et __souligné__.\n* Première ligne\n1. Suite\n## Titre suivant\n<script>texte</script>');
  assert.deepEqual(blocks.map(b=>b.kind),['article','paragraph','bullet','number','heading','paragraph']);
  assert.equal(blocks[0].text,'Article 1 : Objet');
  assert.deepEqual(contractRuns(blocks[1].text).filter(r=>r.style!=='normal').map(r=>r.style),['bold','italic','underline']);
  assert.equal(blocks.at(-1).text,'<script>texte</script>'); // rendered as text, never injected as HTML
});

test('barre d’outils : sélection et changement de type de paragraphe', () => {
  assert.deepEqual(formatContractSelection('Clause',0,6,'bold'),{value:'**Clause**',start:2,end:8});
  assert.equal(formatContractSelection('Article 1\nSuite',0,15,'bullet').value,'- Article 1\n- Suite');
  assert.equal(formatContractSelection('## Texte',4,4,'paragraph').value,'Texte');
});

test('mise en page structurée : sous-titres, énumération et tableaux sans HTML ni clauses préchargées', () => {
  const body = '## Article 1 : Structure\n### A. Sous-rubrique\nA. Premier point\n| Critère | Résultat |\n| --- | --- |\n| Ligne **forte** | À compléter |\n| Autre ligne | À vérifier |';
  const blocks = parseContractBlocks(body);
  assert.deepEqual(blocks.map(block => block.kind), ['heading', 'subheading', 'number', 'table']);
  assert.deepEqual(blocks[3].rows?.[0], ['Critère', 'Résultat']);
  assert.equal(blocks[3].rows?.length, 3);
  const document = buildContractDocument({ ...data(body), employer: { ...data('').employer, companyPhone: '000', companyRegistration: 'REF-TEST' } });
  const page = document.internal.pages[1].join('\n');
  assert.ok(page.includes('(Critère)') && page.includes('(Résultat)'));
  assert.ok(page.includes('(REF-TEST)') || page.includes('REF-TEST'));
  assert.ok(!page.includes('**'));
  const insert = formatContractSelection('Texte', 5, 5, 'table');
  assert.equal(parseContractBlocks(insert.value)[1].kind, 'table');
  assert.equal(formatContractSelection('Texte', 0, 5, 'subheading').value, '### Texte');
});

test('aperçu A4 : le moteur de rendu lit chaque page du PDF exporté', async () => {
  const pdf = buildContractDocument(data(('## Article 1 : Objet\nTexte fictif.\n').repeat(45)));
  const viewer = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loaded = await viewer.getDocument({ data: new Uint8Array(pdf.output('arraybuffer')), useSystemFonts: true }).promise;
  try {
    assert.equal(loaded.numPages, pdf.getNumberOfPages());
    assert.ok(loaded.numPages > 1);
    const secondPage = await loaded.getPage(2);
    const text = await secondPage.getTextContent();
    assert.ok(text.items.some(item => 'str' in item && item.str.includes('Article')));
  } finally { await loaded.destroy(); }
});

test('logo facultatif : image intégrée en haut du projet et de la version figée', async () => {
  const sharp = (await import('sharp')).default;
  const bytes = await sharp({ create: { width: 120, height: 60, channels: 4, background: '#2184bb' } }).png().toBuffer();
  const logoPng = `data:image/png;base64,${bytes.toString('base64')}`;
  const draft = buildContractDocument(data('Article 1 : Texte fictif.'), { logo: logoPng });
  const frozen = buildContractDocument({ ...data('Article 1 : Texte fictif.'), employer: { ...data('').employer, logoPng } });
  const legacy = buildContractDocument(data('Article 1 : Texte fictif.'));
  assert.ok(draft.internal.pages[1].includes('/I0 Do'));
  assert.ok(frozen.internal.pages[1].includes('/I0 Do'));
  assert.ok(!legacy.internal.pages[1].includes('/I0 Do'));
});

test('tableau multipage : colonnes répétées et lignes conservées, signatures sur la fin du texte', () => {
  const table = ['| Rubrique | Valeur |', '| --- | --- |', ...Array.from({ length: 45 }, (_, n) => `| Ligne ${n + 1} | Valeur ${n + 1} |`)].join('\n');
  const document = buildContractDocument(data(`## Article 1 : Relevé\n${table}\n## Article 2 : Fin\nTexte final de présentation.`));
  const pages = document.internal.pages.slice(1).map(page => page.join('\n'));
  assert.ok(pages.length >= 2);
  for (const page of pages.filter(page => page.includes('(Ligne)'))) assert.ok(page.includes('(Rubrique)'));
  assert.equal(pages.reduce((count, page) => count + (page.match(/\(Ligne\)/g) ?? []).length, 0), 45);
  assert.ok(pages.at(-1).includes('POUR L') && pages.at(-1).includes('(Texte)'));
});

test('PDF A4 partagé : blancs répétés condensés, marqueurs cachés et signatures groupées', () => {
  const clause = '## Article 1 : Objet\n\nUne phrase **importante** et *nuancée* pour le contrat.\n\n- Un élément listé.\n';
  const compact = buildContractDocument(data(clause.repeat(27)));
  const spaced = buildContractDocument(data(clause.replaceAll('\n','\n\n\n').repeat(27)));
  assert.equal(compact.getNumberOfPages(),spaced.getNumberOfPages());
  assert.ok(compact.getNumberOfPages() >= 3);
  const pages = compact.internal.pages.slice(1).map(lines => lines.join('\n'));
  assert.ok(!pages.join('\n').includes('**'));
  assert.ok(!pages.join('\n').includes('##'));
  assert.ok(pages.at(-1).includes('POUR L'));
  assert.ok(pages.at(-1).includes('LE TRAVAILLEUR'));
  // A short article, its paragraph and its list must remain together.
  for (const page of pages) assert.equal((page.match(/\(Article\)/g) ?? []).length, (page.match(/\(Un\)/g) ?? []).length);
  assert.equal(pages.slice(0,-1).some(page=>page.includes('LE TRAVAILLEUR')),false);
  for (const [index, page] of pages.entries()) {
    assert.ok(page.includes(`Page ${index+1} / ${pages.length}`));
    assert.ok(page.includes('(Entreprise Exemple)')); // Corporate letterhead on every A4 page.
  }
});

test('préambule : fiche et lieu de naissance distincts, deux parties et anciens contrats', () => {
  const profile = { birthDate:'1995-05-16',address:'Avenue des Écoles, Kinshasa',phone:'+243 812345678',city:'Lubumbashi' };
  assert.equal(contractPartiesFromProfile(profile,''),null);
  assert.equal(contractPartiesFromProfile({...profile,address:null},'Goma'),null);
  assert.equal(contractPartiesFromProfile({...profile,birthDate:null},'Goma'),null);
  const parties = contractPartiesFromProfile(profile,'Goma');
  assert.equal(parties.birthPlace,'Goma');
  const current = buildContractDocument({ ...data('Clause test.'), parties });
  const content = current.internal.pages.flat().join(' ');
  assert.ok(content.includes('ENTRE LES SOUSSIGN'));
  assert.ok(content.includes('UNE PART'));
  assert.ok(content.includes('AUTRE PART'));
  assert.ok(content.includes('Goma'));
  assert.ok(!content.includes('Lubumbashi'));
  assert.ok(content.indexOf('ENTRE LES SOUSSIGN') < content.indexOf('AUTRE PART'));
  assert.ok(content.indexOf('AUTRE PART') < content.indexOf('Il a'));
  assert.ok(!content.includes('dûment habilité'));
  const authorized = buildContractDocument({ ...data('Clause test.'), parties, employer: { ...data('').employer, directorAuthorized:true } });
  assert.ok(authorized.internal.pages.flat().join(' ').includes('dûment habilité'));
  const legacy = buildContractDocument(data('Clause test.'));
  assert.ok(!legacy.internal.pages.flat().join(' ').includes('ENTRE LES SOUSSIGN'));
});

test('préambule dans l’encadré à barre verticale, phrase de conclusion hors encadré', async () => {
  const parties = { birthDate:'1997-03-14', birthPlace:'Goma', address:'Avenue 12, Kinshasa', phone:'+243 800 000 000' };
  const pdf = buildContractDocument({ ...data('Clause test.'), parties, employer: { ...data('').employer, directorAuthorized:true } });
  const viewer = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const document = await viewer.getDocument({ data:new Uint8Array(pdf.output('arraybuffer')), useSystemFonts:true }).promise;
  try {
    const page = await document.getPage(1);
    const items = (await page.getTextContent()).items.filter(item => 'str' in item);
    const inPanel = items.find(item => item.str.includes('ENTRE LES SOUSSIGN'));
    const endPanel = items.find(item => item.str.includes('AUTRE PART'));
    const belowPanel = items.find(item => item.str.includes('Il a été convenu'));
    assert.ok(inPanel && endPanel && belowPanel);
    assert.ok(inPanel.transform[4] > belowPanel.transform[4], 'Le texte des parties est en retrait à droite de la barre ; la phrase reprend la marge normale.');
    assert.ok(endPanel.transform[5] > belowPanel.transform[5], 'La phrase est placée après la fin du bloc des parties.');
  } finally { await document.destroy(); }
});

test('ligne de signature : lieu/date du modèle à droite, conservés dans le PDF', async () => {
  const pdf = buildContractDocument({ ...data('Clause test.'), signaturePlace:'Goma',signatureDate:'2026-09-12' });
  const viewer = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const document = await viewer.getDocument({ data:new Uint8Array(pdf.output('arraybuffer')), useSystemFonts:true }).promise;
  try {
    const page = await document.getPage(1);
    const content = await page.getTextContent();
    const line=content.items.find(item => 'str' in item && item.str.includes('Fait à Goma, le 12/09/2026'));
    assert.ok(line, 'La date configurée apparaît sans utiliser la date du jour ni la date de début du contrat.');
    assert.ok(line.transform[4] > page.view[2] / 2, 'La ligne commence dans la moitié droite de la page A4.');
  } finally { await document.destroy(); }
});

test('PDF signé soumis ≠ PDF approuvé : mention seulement après décision RH', () => {
  const signed={ ...data('Clause vérifiée.'),employeeSignature:'Personne Exemple',acceptedAt:'2026-11-07T12:00:00.000Z' };
  const pending=buildContractDocument(signed).internal.pages.flat().join(' ');
  assert.ok(pending.includes('EN ATTENTE'));
  assert.ok(!pending.includes('APPROUV'));
  const approved=buildContractDocument({ ...signed,approvedAt:'2026-11-08T12:00:00.000Z' }).internal.pages.flat().join(' ');
  assert.ok(approved.includes('APPROUV'));
  const draft=buildContractDocument(data('Clause vérifiée.')).internal.pages.flat().join(' ');
  assert.ok(!draft.includes('APPROUV'));
});

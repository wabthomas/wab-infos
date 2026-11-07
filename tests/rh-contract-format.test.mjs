import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseContractBlocks, contractRuns, formatContractSelection } from '../apps/redaction/src/lib/redaction/rh/contract-format.ts';
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

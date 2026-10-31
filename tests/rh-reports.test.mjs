import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, makeCsv, parseReportFilter } from '../apps/redaction/src/lib/redaction/rh/reports.ts';
test('filtres limités, périodes inclusives valides et équipes sûres', () => {
  const parse = (value) => parseReportFilter(new URLSearchParams(value));
  assert.deepEqual(parse({type:'collaborateurs',team:' Rédaction '}), {type:'collaborateurs',team:'Rédaction',start:null,end:null});
  assert.ok(parse({type:'absences',start:'2024-01-01',end:'2024-12-31'}));
  assert.deepEqual(parse({type:'presence',start:'2026-01-01',end:'2026-01-31'}), {type:'presence',team:null,start:'2026-01-01',end:'2026-01-31'});
  for (const v of [{type:'salaires'}, {type:'prestations',start:'2026-01-01',end:'2027-01-03'}, {type:'prestations',start:'2026-01-02',end:'2026-01-01'}, {type:'absences',start:'2026-02-30',end:'2026-03-01'}, {type:'collaborateurs',team:'x\ny'}, {type:'collaborateurs',team:'x'.repeat(151)}]) assert.equal(parse(v), null);
});
test('CSV : neutralisation de formules, guillemets et délimiteurs', () => {
  for (const text of ['=HYPERLINK("x")', ' +1', '\t@cmd', '-3', '\ufeff=1']) assert.ok(csvCell(text).startsWith('"\''), text);
  assert.equal(csvCell('Une "citation", texte'), '"Une ""citation"", texte"');
  assert.equal(makeCsv(['Nom'], [['Alice']]), '\ufeff"Nom"\r\n"Alice"\r\n');
});

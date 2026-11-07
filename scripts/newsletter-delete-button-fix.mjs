import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/newsletter-desk.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line === '                    <td className="py-2.5">');
if (start < 0) { console.log('MISS start'); process.exit(1); }
let end = start + 1;
while (end < lines.length && lines[end] !== '                    </td>') end += 1;
if (end >= lines.length) { console.log('MISS end'); process.exit(1); }

const block = [
  '                    <td className="py-2.5">',
  '                      <div className="flex flex-wrap items-center gap-2">',
  '                        {row.status === \'active\' && (',
  '                          <button',
  '                            type="button"',
  '                            disabled={unsubscribingId === row.documentId}',
  '                            onClick={() => void unsubscribeRow(row)}',
  '                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold hover:bg-muted disabled:opacity-60"',
  '                            title="Désinscrire et notifier"',
  '                          >',
  '                            {unsubscribingId === row.documentId ? (',
  '                              <Loader2 className="h-3.5 w-3.5 animate-spin" />',
  '                            ) : (',
  '                              <UserMinus className="h-3.5 w-3.5" />',
  '                            )}',
  '                            Désinscrire',
  '                          </button>',
  '                        )}',
  '                        <button',
  '                          type="button"',
  '                          disabled={deletingId === row.documentId}',
  '                          onClick={() => void deleteRow(row)}',
  '                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-300 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"',
  '                          title="Supprimer définitivement de la liste"',
  '                        >',
  '                          {deletingId === row.documentId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}',
  '                          Supprimer',
  '                        </button>',
  '                      </div>',
  '                    </td>',
];
lines.splice(start, end - start + 1, ...block);
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('CELL', fs.readFileSync(file, 'utf8').includes('void deleteRow(row)') ? 'OK' : 'MISS');

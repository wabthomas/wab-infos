/* Correct legacy display text whose UTF-8 bytes were read as Windows-1252.
 * Decode only recognisable malformed sequences, so surrounding valid Unicode
 * (including masked account numbers) is never re-encoded. Display only: do not
 * use this on IDs, amounts, references, form values or persisted data. */
const windows1252 = new Map<number, number>([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f],
]);
const byte = '[\\u0080-\\u00bf\\u20ac\\u201a\\u0192\\u201e\\u2026\\u2020\\u2021\\u02c6\\u2030\\u0160\\u2039\\u0152\\u017d\\u2018\\u2019\\u201c\\u201d\\u2022\\u2013\\u2014\\u02dc\\u2122\\u0161\\u203a\\u0153\\u017e\\u0178]';
const malformed = new RegExp(`(?:Ã${byte}|Â${byte}|â${byte}${byte})+`, 'g');
const decoder = new TextDecoder('utf-8', { fatal: true });

export function repairLegacyMojibake(value: string): string {
  let result = value;
  // At most two rounds, for labels accidentally transcoded twice.
  for (let pass = 0; pass < 2; pass++) {
    const next = result.replace(malformed, (part) => {
      const bytes = Array.from(part, (char) => {
        const code = char.codePointAt(0)!;
        return code <= 255 ? code : windows1252.get(code);
      });
      if (bytes.some((item) => item === undefined)) return part;
      try {
        return decoder.decode(Uint8Array.from(bytes as number[]));
      } catch {
        return part;
      }
    });
    if (next === result) break;
    result = next;
  }
  return result;
}

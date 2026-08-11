import type { NewsSourceId } from './types';

const KEYWORD_MAP: Array<{ re: RegExp; slug: string }> = [
  { re: /politiqu|gouvernement|assemblée|sénat|élection|parti /i, slug: 'politique' },
  { re: /économ|finance|banque|budget|entreprise|commerce/i, slug: 'economie' },
  { re: /sécurit|armée|fardc|milice|attaque|guerre|conflit|rebelle/i, slug: 'securite' },
  { re: /sport|football|basket|ligue|champion/i, slug: 'sports' },
  { re: /technolog|numérique|internet|telecom|ia\b/i, slug: 'technologies' },
  { re: /internation|onu|afrique|usa|europe|chine/i, slug: 'international' },
  { re: /société|éducation|santé|femme|culture|justice/i, slug: 'societe' },
  { re: /fait.?divers|braquage|accident/i, slug: 'faits-divers' },
];

const PATH_MAP: Record<string, string> = {
  politique: 'politique',
  securite: 'securite',
  'sécurité': 'securite',
  economie: 'economie',
  'économie': 'economie',
  societe: 'societe',
  'société': 'societe',
  sport: 'sports',
  sports: 'sports',
  culture: 'societe',
  justice: 'societe',
  sante: 'societe',
  'santé': 'societe',
  afrique: 'international',
  international: 'international',
  actualite: 'actualite',
  'actualités': 'actualite',
};

export function guessCategorySlug(input: {
  sourceId: NewsSourceId;
  url: string;
  title: string;
  categoryHint?: string;
}): string {
  const hint = (input.categoryHint || '').trim().toLowerCase();
  if (hint && PATH_MAP[hint]) return PATH_MAP[hint];

  const path = input.url.toLowerCase();
  for (const [key, slug] of Object.entries(PATH_MAP)) {
    if (path.includes(`/${key}/`) || path.includes(`/category/${key}`) || path.includes(`/${key}-`)) {
      return slug;
    }
  }

  const haystack = `${input.title} ${hint}`;
  for (const rule of KEYWORD_MAP) {
    if (rule.re.test(haystack)) return rule.slug;
  }

  // Sources RDC → défaut actualités locales
  if (
    input.sourceId === 'radio-okapi' ||
    input.sourceId === 'actualite-cd' ||
    input.sourceId === '7sur7' ||
    input.sourceId === 'le-potentiel' ||
    input.sourceId === 'opinion-info'
  ) {
    return 'actualites-rdc';
  }

  return 'actualite';
}

import { writeFileSync } from 'node:fs';

const base = 'https://cms.app.wab-infos.com/api/articles';
const q =
  '?pagination[pageSize]=15&fields[0]=title&fields[1]=slug&fields[2]=publishedAt&fields[3]=wpPublishedAt&fields[4]=updatedAt&fields[5]=createdAt&populate[category][fields][0]=slug&sort[0]=wpPublishedAt:desc&sort[1]=publishedAt:desc&status=published';

const res = await fetch(base + q);
const json = await res.json();
writeFileSync('tmp-latest-articles.json', JSON.stringify(json, null, 2));

if (json.error) {
  console.log('ERR', json.error);
  process.exit(1);
}

for (const a of json.data || []) {
  console.log(
    [
      a.slug?.slice(0, 50),
      'pub=' + (a.publishedAt || '-'),
      'wp=' + (a.wpPublishedAt || '-'),
      'cat=' + (a.category?.slug || '-'),
    ].join(' | ')
  );
}
console.log('total', json.meta?.pagination?.total);

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { youtubeVideoId, contributionRole, bonusDecision, youtubeCount, officialVideoItems } from '../apps/redaction/src/lib/redaction/rh/youtube-performance.ts';

test('liens YouTube canoniques uniquement, jamais de récupération vers une URL utilisateur', () => {
  const id = 'dQw4w9WgXcQ';
  for (const link of [`https://youtu.be/${id}`, `https://www.youtube.com/watch?v=${id}&list=abc`, `https://m.youtube.com/shorts/${id}`, `https://youtube.com/live/${id}`]) {
    assert.equal(youtubeVideoId(link), id);
  }
  for (const link of [`http://youtube.com/watch?v=${id}`, `https://youtube.com.evil.test/watch?v=${id}`, `https://evil.test/?url=https://youtube.com/watch?v=${id}`, `https://youtube.com@evil.test/watch?v=${id}`, `https://youtu.be/${id}/other`, 'https://www.youtube.com/watch?v=invalid', 'https://www.youtube.com/playlist?list=abc']) {
    assert.equal(youtubeVideoId(link), null, link);
  }
});
test('rôle et prime motivée, montants entiers positifs en centièmes, données YouTube non inventées', () => {
  assert.equal(contributionRole(' Journaliste '), 'Journaliste');
  assert.equal(contributionRole('x'), null);
  assert.equal(contributionRole('Monteur\nmalveillant'), null);
  assert.deepEqual(bonusDecision({ amount: '2500', currency: 'CDF', note: 'Budget validé pour le mois' }), { amount: '2500', currency: 'CDF', note: 'Budget validé pour le mois' });
  assert.equal(bonusDecision({ amount: '2500', currency: 'CDF', note: '' }), null);
  assert.equal(bonusDecision({ amount: '-1', currency: 'USD', note: 'x' }), null);
  assert.equal(bonusDecision({ amount: '25.50', currency: 'USD', note: 'x' }), null);
  assert.equal(youtubeCount('00104'), '104');
  assert.equal(youtubeCount(undefined), null);
  assert.equal(youtubeCount('-1'), null);
});

test('seule la chaîne officielle crédite une vidéo, statistiques facultatives non falsifiées', () => {
  const id = 'dQw4w9WgXcQ';
  const data = { items: [
    { id, snippet: { channelId: 'UCofficiel', title: 'Reportage' }, statistics: { viewCount: '123', likeCount: '7' } },
    { id: 'aBcDeFgHiJk', snippet: { channelId: 'UCautre', title: 'Copie' }, statistics: { viewCount: '9999' } },
  ] };
  const result = officialVideoItems(data, [id, 'aBcDeFgHiJk'], 'UCofficiel');
  assert.deepEqual([...result.values()], [{ videoId: id, title: 'Reportage', views: '123', likes: '7', comments: null }]);
  assert.throws(() => officialVideoItems({}, [id], 'UCofficiel'));
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const cues = ['arrival', 'departure', 'submission', 'arrival-offline', 'departure-offline', 'submission-offline'];
test('APK Rédaction : chaque annonce possède le même MP3 embarqué et servi par le web', () => {
  for (const cue of cues) {
    const web = readFileSync(`apps/redaction/public/rh-voice/${cue}.mp3`);
    const android = readFileSync(`apps/reader-android/android/app/src/redaction/assets/rh-voice/${cue}.mp3`);
    assert.equal(web.subarray(0, 3).toString(), 'ID3');
    assert.deepEqual(android, web, cue);
  }
});

test('le pont vocal natif est limité au flavor Rédaction et aux annonces connues', () => {
  const source = readFileSync('apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java', 'utf8');
  assert.match(source, /!"WabRedactionNative"\.equals\(BuildConfig\.UA_MARKER\)/);
  for (const cue of cues) assert.ok(source.includes(`cue.equals("${cue}")`));
  assert.match(source, /public boolean playRhVoice\(String cue\)/);
  assert.match(source, /settings\.setMediaPlaybackRequiresUserGesture\(false\)/);
});

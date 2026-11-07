import fs from 'node:fs';
const file = 'tests/rh-youtube-migration.test.mjs';
let text = fs.readFileSync(file, 'utf8');
text = text.replace('<SubmissionReview youtubeEnabled=\\{youtubePerformanceEnabled\\(\\)\\}', '<SubmissionReview[^>]*youtubeEnabled=\\{youtubePerformanceEnabled\\(\\)\\}');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('[^>]*youtubeEnabled') ? 'OK' : 'MISS');

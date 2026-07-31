#!/usr/bin/env node
process.env.READER_ANDROID_PRODUCT = 'redaction';
await import('./copy-apk-to-web.mjs');

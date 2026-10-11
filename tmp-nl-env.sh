#!/bin/bash
cd ~/wab-infos || exit 1
NODE=/opt/alt/alt-nodejs22/root/usr/bin/node
echo "== dig/mx"
dig +short MX wab-infos.com 2>/dev/null || host -t MX wab-infos.com 2>/dev/null
echo "== dig/mail A"
dig +short A mail.wab-infos.com 2>/dev/null || host mail.wab-infos.com 2>/dev/null
echo "== dig/mail AAAA"
dig +short AAAA mail.wab-infos.com 2>/dev/null
echo "== connect tests"
HOST=$(grep -h '^SMTP_HOST=' .env | head -1 | cut -d= -f2- | tr -d '\r')
PORT=$(grep -h '^SMTP_PORT=' .env | head -1 | cut -d= -f2- | tr -d '\r')
USER=$(grep -h '^SMTP_USER=' .env | head -1 | cut -d= -f2- | tr -d '\r')
PASS=$(grep -h '^SMTP_PASS=' .env | head -1 | cut -d= -f2- | tr -d '\r')
export HOST PORT USER PASS
cd apps/web
"$NODE" <<'NODE'
const net = require('net');
const tls = require('tls');
const nodemailer = require('nodemailer');

function tryTcp(host, port, family) {
  return new Promise((resolve) => {
    const s = net.createConnection({ host, port, family, timeout: 8000 }, () => {
      s.end();
      resolve({ host, port, family, ok: true });
    });
    s.on('error', (e) => resolve({ host, port, family, ok: false, err: e.message }));
    s.on('timeout', () => { s.destroy(); resolve({ host, port, family, ok: false, err: 'timeout' }); });
  });
}

(async () => {
  console.log(JSON.stringify(await tryTcp('188.114.97.2', 465, 4)));
  console.log(JSON.stringify(await tryTcp('188.114.96.2', 465, 4)));
  console.log(JSON.stringify(await tryTcp(process.env.HOST, 465, 4)));
  // common cPanel direct hostnames
  for (const h of ['mail.wab-infos.com', 'wab-infos.com']) {
    console.log('tcp25', JSON.stringify(await tryTcp(h, 25, 4)));
    console.log('tcp587', JSON.stringify(await tryTcp(h, 587, 4)));
  }
  // force IP literal with servername for TLS
  const t = nodemailer.createTransport({
    host: '188.114.97.2',
    port: 465,
    secure: true,
    auth: { user: process.env.USER, pass: process.env.PASS },
    tls: { servername: 'mail.wab-infos.com', rejectUnauthorized: false },
    connectionTimeout: 12000,
    family: 4,
  });
  try {
    console.log('verify_cf_ip', await t.verify());
  } catch (e) {
    console.log('verify_cf_ip_fail', e.message);
  }
})();
NODE

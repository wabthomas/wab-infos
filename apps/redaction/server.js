'use strict';

const http = require('http');
const { parse } = require('url');
const next = require('next');

process.chdir(__dirname);
process.env.NODE_ENV = 'production';

const hostname = process.env.HOSTNAME || '127.0.0.1';
const port = process.env.PORT === 'passenger' || process.env.PASSENGER_APP_ENV
  ? 'passenger'
  : parseInt(process.env.PORT, 10) || 3001;

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  http
    .createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (error) {
        console.error(error);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    })
    .listen(port, hostname, () => {
      const label = port === 'passenger' ? 'passenger' : `http://${hostname}:${port}`;
      console.log(`Next.js rédaction ready on ${label}`);
    });
}).catch((error) => {
  console.error('[server.js] Next.js prepare() failed:', error);
  process.exit(1);
});

'use strict';

const path = require('path');
const http = require('http');
const { parse } = require('url');
const next = require('next');

process.chdir(__dirname);
process.env.NODE_ENV = 'production';

const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 3000;

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
      console.log(`Next.js ready on http://${hostname}:${port}`);
    });
});

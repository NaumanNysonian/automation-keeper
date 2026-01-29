const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, hostname, () => {
    console.log(`✓ Server running at http://${hostname}:${port}`);
    console.log(`  Local:   http://localhost:${port}`);
  });
});

/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, ".env.local") });

const dev = process.env.NODE_ENV !== "production";

// Get from env
const host = process.env.HOST || "localhost"; // your domain for logging/config
const port = parseInt(process.env.PORT || "3000", 10);

// Always run locally (good for Apache reverse proxy)
const listenHost = "127.0.0.1";
const dev = process.env.NODE_ENV !== "production";

// Get from env
const host = process.env.HOST || "localhost"; // your domain for logging/config
const port = parseInt(process.env.PORT || "3000", 10);

// Always run locally (good for Apache reverse proxy)
const listenHost = "127.0.0.1";

const app = next({ dev, hostname: listenHost, port });
const app = next({ dev, hostname: listenHost, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, listenHost, (err) => {
    if (err) throw err;
    console.log(`✓ Next.js listening on http://${listenHost}:${port}`);
    console.log(`  Host from env: ${host}`);
  }).listen(port, listenHost, (err) => {
    if (err) throw err;
    console.log(`✓ Next.js listening on http://${listenHost}:${port}`);
    console.log(`  Host from env: ${host}`);
  });
});


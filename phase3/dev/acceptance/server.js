// Local DEV server: serves the repo's static site and runs the candidate Apps Script (in-memory DEV workbook) at /exec.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createRuntime } = require('./gas-mock');
const REPO = process.env.YMS_REPO || require('path').resolve(__dirname, '../../..');
const SRC = path.join(REPO, 'phase3/dev/YMS_V4_FINAL_CHOICE_DEV_CANDIDATE.gs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };

function start(port, opts = {}) {
  const state = { rt: createRuntime({ source: SRC, props: opts.props }), requests: [], down: false, delayMs: 0 };
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/exec') {
      let data = '';
      req.on('data', c => data += c);
      req.on('end', async () => {
        state.requests.push({ method: req.method, query: Object.fromEntries(u.searchParams), body: data });
        if (state.delayMs) await new Promise(r => setTimeout(r, state.delayMs));
        if (state.down) { res.writeHead(503); return res.end('down'); }
        let out;
        try {
          out = req.method === 'POST' ? state.rt.ctx.doPost({ postData: { contents: data } }) : state.rt.ctx.doGet({ parameter: Object.fromEntries(u.searchParams) });
        } catch (e) { res.writeHead(500); return res.end(String(e)); }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(out.content);
      });
      return;
    }
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(REPO, p);
    if (!file.startsWith(REPO) || !fs.existsSync(file)) { res.writeHead(404); return res.end('nf'); }
    let body = fs.readFileSync(file);
    if (p === '/assessment/v4-preview/start/index.html' && !opts.unpatched) {
      let s = body.toString('utf8');
      const marker = "const V4_DEV_BACKEND='REPLACE_WITH_V4_DEV_WEB_APP_EXEC_URL';";
      if (!s.includes(marker)) throw new Error('backend marker missing');
      s = s.replace(marker, `const V4_DEV_BACKEND='http://127.0.0.1:${port}/exec';`);
      s = s.replace(/const V3_BACKEND=\/\^https[^\n]*\n/, 'const V3_BACKEND=V4_DEV_BACKEND; // TEST HARNESS ONLY\n');
      body = Buffer.from(s);
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  });
  return new Promise(r => server.listen(port, '127.0.0.1', () => r({ server, state })));
}
module.exports = { start };

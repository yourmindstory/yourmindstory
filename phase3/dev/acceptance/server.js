// Local DEV server: serves the repo's static site and runs the candidate Apps Script (in-memory DEV workbook) at /exec.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createRuntime } = require('./gas-mock');
const REPO = '/home/claude/yourmindstory';
const SRC = process.env.YMS_GS || path.join(REPO, 'phase3/dev/YMS_V4_FINAL_CHOICE_DEV_CANDIDATE.gs');
const TYPES = { '.mp4': 'video/mp4', '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };

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
    if (path.extname(file) === '.mp4') {
      state.videoRequests = (state.videoRequests || 0) + 1;
      const size = fs.statSync(file).size; const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
      if (m) { const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], size - 1) : size - 1;
        res.writeHead(206, { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': b - a + 1 });
        return fs.createReadStream(file, { start: a, end: b }).pipe(res); }
      res.writeHead(200, { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': size }); return fs.createReadStream(file).pipe(res);
    }
    let body = fs.readFileSync(file);
    if ((p === '/assessment/v4-preview/start/index.html' || p === '/assessment/start/index.html') && !opts.unpatched) {
      let s = body.toString('utf8');
      const re = /const V4_(?:DEV_)?BACKEND='[^']*';/;
      if (!re.test(s)) throw new Error('backend marker missing');
      s = s.replace(re, m => m.replace(/'[^']*'/, `'http://127.0.0.1:${port}/exec'`));
      s = s.replace(/const V3_BACKEND=\/\^https[^\n]*\n/, m => 'const V3_BACKEND=' + (/V4_DEV_BACKEND/.test(s) ? 'V4_DEV_BACKEND' : 'V4_BACKEND') + '; // TEST HARNESS ONLY\n');
      body = Buffer.from(s);
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  });
  return new Promise(r => server.listen(port, '127.0.0.1', () => r({ server, state })));
}
module.exports = { start };

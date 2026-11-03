// Builds the email preview review page from out/email-previews.json (rendered by the real backend code, synthetic data).
'use strict';
const fs = require('fs');
const path = require('path');
const previews = JSON.parse(fs.readFileSync(path.join(__dirname, 'out/email-previews.json'), 'utf8'));
const groups = [
  ['£37 single stage', previews.slice(0, 4)],
  ['£74 pair', previews.slice(4, 10)],
  ['£4.99 The Bare Minimum', previews.slice(10, 12)],
  ['Complete (sent after her final choice)', previews.slice(12, 15)],
];
const data = previews.map((p, i) => ({ i, label: p.label, subject: p.subject, html: p.html, text: p.text }));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let idx = 0;
const nav = groups.map(([g, list]) => `<div class="grp"><p class="grp-h">${esc(g)}</p>${list.map(p => `<button type="button" class="pick" id="pick-${idx}" data-i="${idx++}">${esc(p.label.replace(/^[^—]*— /, '').replace(/ \(£[\d.]+\)$/, ''))}</button>`).join('')}</div>`).join('');
const html = `<title>V4 Result Email Previews</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=DM+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet">
<style>
/* Layout: review console — offer list on the left, the inbox view (subject + paper email + plain text) on the right; stacks on phones. */
:root{--bg:#f5f6f3;--fg:#141a17;--muted:#5d655f;--line:#dfe3dc;--panel:#ffffff;--accent:#8a6a36;--sage:#6f8169;--chip:#e9ede6;
--display:"Fraunces",Georgia,serif;--body:"DM Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#121513;--fg:#e8ebe6;--muted:#9aa39c;--line:#2a302c;--panel:#1a1e1b;--accent:#d2b07a;--sage:#9db497;--chip:#232824;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#121513;--fg:#e8ebe6;--muted:#9aa39c;--line:#2a302c;--panel:#1a1e1b;--accent:#d2b07a;--sage:#9db497;--chip:#232824;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font-family:var(--body);font-size:15px;line-height:1.55}
.wrap{max-width:1180px;margin:0 auto;padding-block:28px 56px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
header{display:grid;gap:6px;margin-bottom:22px}
.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:600;margin:0}
h1{font-family:var(--display);font-weight:600;font-size:clamp(28px,4vw,38px);line-height:1.1;margin:0;text-wrap:balance}
.lede{color:var(--muted);max-width:68ch;margin:0}
.layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:24px;align-items:start}
@media (max-width:820px){.layout{grid-template-columns:minmax(0,1fr)}}
nav{display:grid;gap:16px;position:sticky;top:calc(env(safe-area-inset-top,0px) + 12px)}
@media (max-width:820px){nav{position:static;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}}
.grp{display:grid;gap:4px}
.grp-h{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 2px;font-weight:600}
.pick{all:unset;box-sizing:border-box;cursor:pointer;padding:8px 10px;border-radius:6px;border:1px solid transparent;font-size:14px;line-height:1.35}
.pick:hover{background:var(--chip)}
.pick:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.pick[aria-pressed="true"]{background:var(--panel);border-color:var(--line);box-shadow:inset 3px 0 0 var(--sage);font-weight:600}
main{display:grid;gap:18px;min-width:0}
.meta{display:grid;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:14px 16px}
.row{display:grid;grid-template-columns:84px minmax(0,1fr);gap:10px;font-size:14px}
.row b{color:var(--muted);font-weight:500}
.row span{overflow-wrap:anywhere}
.tabs{display:flex;gap:6px;flex-wrap:wrap}
.tab{all:unset;cursor:pointer;padding:7px 12px;border-radius:999px;font-size:13px;border:1px solid var(--line)}
.tab[aria-selected="true"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.tab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.paper{background:#ffffff;color:#111827;border-radius:8px;border:1px solid var(--line);padding:28px 20px;overflow-x:auto}
.paper a{color:inherit}
pre{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:18px;font-family:var(--mono);font-size:12.5px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--fg)}
.note{font-size:13px;color:var(--muted);margin:0}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
<div class="wrap">
<header>
<p class="eyebrow">Your Mind Story · V4 DEV · synthetic data</p>
<h1>Result email previews</h1>
<p class="lede">Rendered by the V4 DEV backend from the approved Phase 3 copy, after a synthetic final choice. Nothing was sent. Recipient name is “Synthia”; links point at the real Stan pages and the V4 saved-result page.</p>
</header>
<div class="layout">
<nav aria-label="Email variants">${nav}</nav>
<main>
<div class="meta">
<div class="row"><b>Variant</b><span id="m-label"></span></div>
<div class="row"><b>Subject</b><span id="m-subject"></span></div>
<div class="row"><b>From</b><span>Onye (Google MailApp, transactional)</span></div>
</div>
<div class="tabs" role="tablist">
<button type="button" class="tab" role="tab" id="tab-html" aria-selected="true">Rendered HTML</button>
<button type="button" class="tab" role="tab" id="tab-text" aria-selected="false">Plain text</button>
</div>
<div class="paper" id="v-html"></div>
<pre id="v-text" hidden></pre>
<p class="note">Links in the preview open the real destinations. Do not complete a checkout from here.</p>
</main>
</div>
</div>
<script>
const EMAILS=${JSON.stringify(data).replace(/</g, '\\u003c')};
let cur=0,mode='html';
function show(i){cur=i;const e=EMAILS[i];document.getElementById('m-label').textContent=e.label;document.getElementById('m-subject').textContent=e.subject;
document.getElementById('v-html').innerHTML=e.html;document.getElementById('v-html').querySelectorAll('a').forEach(a=>{a.target='_blank';a.rel='noopener'});
document.getElementById('v-text').textContent=e.text;document.querySelectorAll('.pick').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.i===i)));}
function setMode(m){mode=m;document.getElementById('v-html').hidden=m!=='html';document.getElementById('v-text').hidden=m!=='text';document.getElementById('tab-html').setAttribute('aria-selected',String(m==='html'));document.getElementById('tab-text').setAttribute('aria-selected',String(m==='text'));}
document.querySelectorAll('.pick').forEach(b=>b.addEventListener('click',()=>show(+b.dataset.i)));
document.getElementById('tab-html').onclick=()=>setMode('html');document.getElementById('tab-text').onclick=()=>setMode('text');
show(12);
</script>`;
fs.writeFileSync(path.join(__dirname, 'out/email-previews.html'), html);
// Also a plain-text bundle for offline review
fs.writeFileSync(path.join(__dirname, 'out/email-previews.txt'), previews.map(p => `===== ${p.label} =====\nSubject: ${p.subject}\n\n${p.text}\n`).join('\n'));
console.log('built', previews.length);

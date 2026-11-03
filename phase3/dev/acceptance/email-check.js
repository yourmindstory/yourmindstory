// Checks the 15 rendered emails (out/email-previews.json, produced by backend.test.js from the real backend code)
// against the owner's acceptance list. Synthetic data; nothing sent.
'use strict';
const fs = require('fs');
const P = JSON.parse(fs.readFileSync(__dirname + '/out/email-previews.json', 'utf8'));
const EXP = [
  ['£37', 'stan.store/Yourmindstory/p/quiet-the-alarm?'], ['£37', 'stan.store/Yourmindstory/p/break-the-pull?'], ['£37', 'stan.store/Yourmindstory/p/restore-self-trust?'], ['£37', 'stan.store/Yourmindstory/p/return-to-yourself-7jc9h8lg?'],
  ['£74', 'quiet-the-alarm--break-the-pull?'], ['£74', 'quiet-the-alarm--restore-selftrust?'], ['£74', 'quiet-the-alarm--return-to-yourself?'], ['£74', 'break-the-pull--restore-selftrust?'], ['£74', 'break-the-pull--return-to-yourself?'], ['£74', 'restore-selftrust--return-to-yourself?'],
  ['£4.99', 'stan.store/Yourmindstory/p/the-bare-minimum?'], ['£4.99', 'stan.store/Yourmindstory/p/the-bare-minimum?'],
  ['£117', 'assessment/choice/?o=self_guided'], ['£147', 'assessment/choice/?o=reality_reset'], ['£197', 'assessment/choice/?o=pattern_break'],
];
const OTHER_PRICES = ['£37', '£74', '£117', '£147', '£197', '£4.99'];
const decode = s => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#8204;/g, '');
const htmlText = h => decode(h.replace(/<div style="display:none[\s\S]*?<\/div>/, '').replace(/<br\s*\/?>/g, '\n').replace(/<\/(p|div|h2|td|tr|table)>/g, '\n').replace(/<[^>]+>/g, '')).split('\n').map(x => x.trim()).filter(Boolean);
const rows = P.map((p, i) => {
  const t = p.text, h = p.html, isBare = i === 10 || i === 11;
  const [price, link] = EXP[i];
  const firstCta = Math.min(...['START MY SESSIONS', 'START WITH THE BARE MINIMUM'].map(l => { const k = t.indexOf(l); return k < 0 ? Infinity : k; }));
  const proof = t.indexOf('More than 1,900 women');
  const htmlLines = htmlText(h);
  const missingInText = htmlLines.filter(l => !t.replace(/\s+/g, ' ').includes(l.replace(/\s+/g, ' ')));
  const textLinks = (t.match(/https:\/\/\S+/g) || []).map(decode).sort();
  const htmlLinks = (h.match(/href="([^"]+)"/g) || []).map(x => decode(x.slice(6, -1))).sort();
  const c = {
    offer: (price ? t.includes(price) && OTHER_PRICES.filter(x => x !== price).every(x => !t.includes(x)) : !OTHER_PRICES.some(x => t.includes(x))) && t.includes(link),
    newerCopy: !t.includes('1,800') && !t.includes('And there’s a reason I asked you about those things.'),
    personalised: /Your answers show|Based on your answers/.test(t) && t.includes('Hi Synthia'),
    positioning: isBare ? !/whether he[’']s in your life or not/i.test(t) || null : /whether he[’']s in your life or not/i.test(t),
    proof1900: proof >= 0,
    ctaBeforeProof: proof >= 0 ? firstCta < proof : null,
    savedLink: t.includes('resultToken=' + p.token),
    parity: missingInText.length === 0 && JSON.stringify(textLinks) === JSON.stringify(htmlLinks),
    ebookNotHypno: isBare ? !/hypnotherapy/i.test(t.replace('Cognitive Behavioral Hypnotherapist', '')) : null,
  };
  return { label: p.label, subject: p.subject, c, missingInText: missingInText.slice(0, 3), linkDiff: JSON.stringify(textLinks) === JSON.stringify(htmlLinks) ? '' : 'links differ' };
});
fs.writeFileSync(__dirname + '/out/email-check.json', JSON.stringify(rows, null, 1));
const keys = Object.keys(rows[0].c);
console.log(['#', 'variant', ...keys].join(' | '));
rows.forEach((r, i) => console.log([i + 1, r.label, ...keys.map(k => r.c[k] === null ? 'n/a' : r.c[k] ? 'PASS' : 'FAIL')].join(' | ') + (r.missingInText.length ? '  textMissing:' + JSON.stringify(r.missingInText) : '') + (r.linkDiff ? ' ' + r.linkDiff : '')));

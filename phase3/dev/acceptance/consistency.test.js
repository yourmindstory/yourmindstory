// Two-offer preview tests (8 Nov 2026): September routing with Return to Yourself Bootcamp £497 and Self-Guided £117.
// Real preview page (/assessment/v4-preview/start/) in headless Chrome against the DEV candidate backend (in-memory workbook).
// Third-party hosts (Stan, GA, Clarity) are intercepted and never reached. Synthetic data only.
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { start } = require('./server');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
function check(id, desc, cond, ev) { results.push({ id, desc, pass: !!cond }); console.log((cond ? 'PASS ' : 'FAIL ') + id + ' ' + desc + (cond ? '' : '  <<< ' + String(ev).slice(0, 700))); }
const PAGE = process.env.YMS_PAGE || '/assessment/v4-preview/start/';
const VP = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
const STAN = {
  117: 'https://stan.store/Yourmindstory/p/return-to-yourself-eli637kx',
  37: 'https://stan.store/Yourmindstory/p/quiet-the-alarm',
  74: 'https://stan.store/Yourmindstory/p/quiet-the-alarm--break-the-pull',
  '4.99': 'https://stan.store/Yourmindstory/p/the-bare-minimum',
  497: process.env.YMS_BOOTCAMP_URL || 'https://stan.store/Yourmindstory/p/your-mind-story-bootcamp-'
};
let browser, srv, base;

async function newPage(vp, consent = 'no') {
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
  await page.setViewport(VP[vp]);
  const external = [], errors = [];
  await page.setRequestInterception(true);
  page.on('request', r => { const u = r.url(); if (u.startsWith(base)) return r.continue(); external.push(u); r.abort(); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.evaluateOnNewDocument(c => { try { localStorage.setItem('yms_analytics_consent', c); localStorage.setItem('yms_ads_consent', c); } catch (e) {} }, consent);
  return { ctx, page, external, errors };
}
async function clickSel(page, sel) { await page.waitForSelector(sel, { visible: true, timeout: 15000 }); await page.$eval(sel, el => el.scrollIntoView({ block: 'center' })); await page.click(sel); }
async function answerAll(page, stages, email, query = '') {
  await page.goto(base + PAGE + query, { waitUntil: 'domcontentloaded' });
  await clickSel(page, '#beginV4');
  const sc = []; stages.forEach(t => { const x = Math.min(3, t); sc.push(x, t - x); });
  for (const v of sc) { await clickSel(page, `.step.active .opt[data-v="${v}"]`); await sleep(30); }
  for (const v of ['2', '1', '1', '0']) { await clickSel(page, `.step.active .opt[data-v="${v}"]`); await sleep(30); }
  await clickSel(page, '.step.active .opt[data-v="0"]'); await clickSel(page, '#next'); await sleep(30);
  await page.waitForSelector('#txt'); await page.type('#txt', 'Synthetic two-offer test'); await clickSel(page, '#next');
  await page.waitForSelector('#fn'); await page.type('#fn', 'Synthia'); await page.type('#em', email);
  await clickSel(page, '.consent-opt[data-consent="no"]'); await clickSel(page, '#capgo');
  await page.waitForFunction(() => window.v4ResultReady === true, { timeout: 30000 });
}
const kind = page => page.$eval('.result-panel.active', el => el.dataset.kind);
async function next(page) { await clickSel(page, '.result-panel.active .result-next'); await sleep(400); }
async function pick(page, group, value) { await clickSel(page, `.result-panel.active .v4-choice[data-group="${group}"][data-value="${value}"]`); await sleep(80); }
async function toRec(page, goal, commit) {
  for (let k = 0; k < 8; k++) {
    const kd = await kind(page);
    if (kd === 'rec') return;
    if (kd === 'q1') await pick(page, 'v4Goal', goal);
    if (kd === 'q2') {
      if (await page.$('.result-panel.active .v4-choice[data-group="v4Goal"]')) await pick(page, 'v4Goal', goal);
      if (commit) await pick(page, 'v4Support', commit);
    }
    await next(page);
  }
}
const recState = page => page.evaluate(() => {
  const rec = document.querySelector('.result-panel.active');
  return {
    offers: [...rec.querySelectorAll('.v4-offer')].map(c => c.dataset.offer),
    prices: [...rec.querySelectorAll('a[data-rec-price]')].map(a => a.dataset.recPrice),
    bootcampLinks: rec.querySelectorAll('[data-offer="bootcamp"] a[data-rec-product]').length,
    checkoutOff: !!rec.querySelector('#v4BootcampCheckoutOff'),
    text: rec.innerText
  };
});
const rowFor = token => srv.state.rt.rows().find(r => r['Result Token'] === token);
const emailsFor = email => { const sh = srv.state.rt.sheet('V4 DEV Email Log'); return sh ? sh.rows.slice(1).filter(r => r[2] === email) : []; };
const tokenOf = page => page.evaluate(() => JSON.parse(sessionStorage.getItem('yms_v4_preview_last_submission') || '{}').resultToken);
const journeyFor = token => { const sh = srv.state.rt.sheet('V4 Journey Events'); return sh ? sh.rows.slice(1).filter(r => r[6] === token).map(r => r[1] + ':' + r[3]) : []; };

async function scenario(id, vp, stages, goal, commit, expect) {
  const { ctx, page, external, errors } = await newPage(vp, expect.consent || 'no');
  const email = `synthetic+${id.toLowerCase()}@example.invalid`;
  await answerAll(page, stages, email, expect.query || '');
  const flow = await page.evaluate(() => ({ kinds: [...document.querySelectorAll('.result-panel')].map(p => p.dataset.kind), first: (document.querySelector('.result-panel.active') || {}).innerText || '' }));
  await toRec(page, goal, commit);
  const st = await recState(page);
  await page.screenshot({ path: path.join(OUT, 'shots', `two-${id}-${vp}.png`), fullPage: true });
  const token = await tokenOf(page);
  let clicked = null;
  if (expect.click) {
    const n0 = external.length;
    await clickSel(page, `.result-panel.active a[data-rec-price="${expect.click}"]`);
    await sleep(2500);
    clicked = external.slice(n0).find(u => /stan\.store/.test(u)) || '';
  }
  await sleep(600);
  const row = rowFor(token), emails = emailsFor(email), jl = journeyFor(token);
  await ctx.close();
  return { st, clicked, row, emails, jl, errors, external, email, flow, overlay: false };
}

(async () => {
  srv = await start(8793); base = 'http://127.0.0.1:8793';
  browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server'] });
  const blockInfo = async (page) => page.evaluate(() => {
    const b = document.querySelector('.result-panel.active .v4-consistency'); const btn = document.querySelector('.result-panel.active [data-offer="bootcamp"] a.next');
    if (!b) return { has: false };
    b.scrollIntoView({ block: 'center' });
    return { has: true, above: !!(btn && (b.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING)), text: b.innerText };
  });
  for (const [id, vp] of [['K1', 'mobile'], ['K2', 'desktop']]) {
    const { ctx, page, external, errors } = await newPage(vp);
    const email = `synthetic+${id.toLowerCase()}@example.invalid`;
    await answerAll(page, [5, 5, 4, 3], email); await toRec(page, 'self_work', 'think_so');
    const st = await recState(page); const bi = await blockInfo(page);
    await page.evaluate(() => { const b = document.querySelector('.result-panel.active .v4-consistency'); if (b) window.scrollTo(0, b.getBoundingClientRect().top + window.scrollY - 220); });
    await sleep(500);
    await page.screenshot({ path: path.join(OUT, 'shots', `consistency-${id}-${vp}.png`) });
    const token = await tokenOf(page); const n0 = external.length;
    await clickSel(page, '.result-panel.active a[data-rec-price="497"]'); await sleep(2500);
    const clicked = external.slice(n0).find(u => /stan\.store/.test(u)) || '';
    await sleep(600); const jl = journeyFor(token); const row = rowFor(token);
    await ctx.close();
    check(id, `[${vp}] think_so: consistency block shown directly above JOIN THE BOOTCAMP, exact copy, £117 still underneath; impression + click recorded; Join goes to £497 Stan`,
      bi.has && bi.above && bi.text.includes("Worried you won't stick with it?") && bi.text.includes('even when motivation drops.') && bi.text.includes('one step at a time.') &&
      JSON.stringify(st.offers) === '["bootcamp","self_guided"]' && st.text.includes('See the self-guided option – £117') &&
      jl.some(x => /recommendation_shown/.test(x)) && jl.some(x => /offer_select_click/.test(x)) && clicked.startsWith(STAN[497]) && errors.length === 0,
      JSON.stringify({ bi, offers: st.offers, jl, clicked, errors }));
  }
  for (const [id, commit] of [['K3', 'yes'], ['K4', 'not_sure']]) {
    const { ctx, page } = await newPage('mobile');
    await answerAll(page, [5, 5, 4, 3], `synthetic+${id.toLowerCase()}@example.invalid`); await toRec(page, 'self_work', commit);
    const bi = await blockInfo(page); const st = await recState(page); await ctx.close();
    check(id, `${commit}: Bootcamp shown WITHOUT the consistency block (control)`, !bi.has && st.offers[0] === 'bootcamp', JSON.stringify({ bi, offers: st.offers }));
  }
  const p = results.filter(x => x.pass).length; console.log(p + '/' + results.length + ' passed');
  await browser.close(); srv.server.close(); process.exit(p === results.length ? 0 : 1);
})();

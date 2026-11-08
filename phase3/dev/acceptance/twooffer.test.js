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
    if (kd === 'q2') await pick(page, 'v4Support', commit);
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
  return { st, clicked, row, emails, jl, errors, external, email, overlay: false };
}

(async () => {
  srv = await start(8791); base = 'http://127.0.0.1:8791';
  browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server'] });

  // B1/B2: strong broad result, wants to work on herself, can commit -> Bootcamp first, £117 underneath
  for (const [id, vp, commit] of [['B1', 'desktop', 'yes'], ['B2', 'mobile', 'think_so']]) {
    const r = await scenario(id, vp, [5, 5, 4, 3], 'self_work', commit, { click: '117' });
    const t = r.st.text;
    check(id, `[${vp}] total 17, "self_work" + ${commit}: Bootcamp first (locked copy, £497, 29 Nov, Join button goes to the £497 Stan page), £117 underneath, no £147/£197, 21-day guarantee shown`,
      JSON.stringify(r.st.offers) === '["bootcamp","self_guided"]' && r.st.bootcampLinks === 1 && !r.st.checkoutOff &&
      t.includes('Return to Yourself Bootcamp') && t.includes('£497') && t.includes('Starts Sunday 29 November 2026') && t.includes("You know what you need to do. Now you're ready to follow through.") &&
      t.includes('Five live group sessions with me') && t.includes('12-week support') && t.includes('Book a free 15-minute call with me') && t.includes('Prefer to work privately?') && t.includes('See the self-guided option – £117') &&
      !/£147|£197|Reality Reset|Pattern Break/.test(t) && /21-day money-back guarantee/i.test(t) && JSON.stringify(r.st.prices) === '["497","117"]',
      JSON.stringify({ offers: r.st.offers, prices: r.st.prices, off: r.st.checkoutOff, t: t.slice(0, 300) }));
    check(id + 'c', `[${vp}] Tapping "See the self-guided option – £117" goes straight to Stan (no pop-up), saves the £117 choice with her answers, sends the choice email once, records the clicks`,
      r.clicked && r.clicked.startsWith(STAN[117]) && /utm_source=yms_assessment/.test(r.clicked) && r.row && r.row['V4 Result Email Route'] === 'self_guided' &&
      r.row['V4 Post-Result Question 1 Option ID'] === 'self_work' && r.row['V4 Post-Result Question 2 Option ID'] === commit && r.emails.length === 2 &&
      ['offer_select_click', 'primary_cta_click', 'outbound_stan_click'].every(e => r.jl.some(x => x.startsWith(e + ':OK'))) && r.errors.length === 0,
      JSON.stringify({ clicked: r.clicked, route: r.row && r.row['V4 Result Email Route'], q2: r.row && r.row['V4 Post-Result Question 2 Option ID'], emails: r.emails.length, jl: r.jl.filter(x => /offer|cta|outbound/.test(x)), err: r.errors }));
  }
  // B3: taps JOIN THE BOOTCAMP -> straight to the £497 Stan page, choice saved as bootcamp, no choice email (results email only)
  { const r = await scenario('B3', 'mobile', [5, 5, 4, 3], 'self_work', 'not_sure', { click: '497' });
    check('B3', '[mobile] "JOIN THE BOOTCAMP" goes straight to the £497 Stan page with UTMs, saves the Bootcamp choice and her answers, sends the Bootcamp email with the £497 link',
      r.clicked && r.clicked.startsWith(STAN[497]) && /utm_source=yms_assessment/.test(r.clicked) && r.row && r.row['V4 Result Email Route'] === 'bootcamp' &&
      r.row['V4 Post-Result Question 2 Option ID'] === 'not_sure' && r.emails.length === 2 && r.emails[1][4] === 'Your place in the Return to Yourself Bootcamp' && String(r.emails[1][6] + r.emails[1][7]).includes(STAN[497]) && /Sunday 29 November/.test(String(r.emails[1][6] + r.emails[1][7])) && String(r.emails[1][6] + r.emails[1][7]).includes('bootcamp-fit-call') && r.errors.length === 0,
      JSON.stringify({ clicked: r.clicked, route: r.row && r.row['V4 Result Email Route'], q2: r.row && r.row['V4 Post-Result Question 2 Option ID'], emails: r.emails.length, err: r.errors })); }
  // S1: not sure she can commit -> Bootcamp first, £117 underneath (owner 8 Nov). S2: can't commit -> £117 only
  for (const [id, vp, commit, want] of [['S1', 'desktop', 'not_sure', '["bootcamp","self_guided"]'], ['S2', 'mobile', 'no', '["self_guided"]']]) {
    const r = await scenario(id, vp, [5, 5, 4, 3], 'self_work', commit, { click: '117' });
    check(id, `[${vp}] "self_work" + ${commit}: ${want}, £117 goes straight to Stan, choice saved`, JSON.stringify(r.st.offers) === want && (commit !== 'no' || !/Bootcamp/.test(r.st.text)) && !/£147|£197/.test(r.st.text) && r.clicked && r.clicked.startsWith(STAN[117]) && r.row && r.row['V4 Result Email Route'] === 'self_guided' && r.emails.length === 2,
      JSON.stringify({ offers: r.st.offers, clicked: r.clicked, route: r.row && r.row['V4 Result Email Route'], emails: r.emails.length }));
  }
  // U1: not sure what she wants, even with "Yes" -> £117 only (September: private self-guided)
  { const r = await scenario('U1', 'desktop', [6, 6, 3, 0], 'unsure', 'yes', { click: '117' });
    check('U1', '"unsure" + Yes: Self-Guided £117 only (Bootcamp needs "self_work"), choice saved', JSON.stringify(r.st.offers) === '["self_guided"]' && !/Bootcamp/.test(r.st.text) && r.row && r.row['V4 Result Email Route'] === 'self_guided', JSON.stringify({ offers: r.st.offers, route: r.row && r.row['V4 Result Email Route'] })); }
  // M1: wants to understand / change him -> Bare Minimum (September bridge)
  { const r = await scenario('M1', 'mobile', [5, 5, 4, 3], 'understand_him', null, { click: '4.99' });
    check('M1', '[mobile] "understand_him": The Bare Minimum £4.99, straight to Stan, choice saved', JSON.stringify(r.st.offers) === '["bare_minimum"]' && r.clicked && r.clicked.startsWith(STAN['4.99']) && r.row && r.row['V4 Result Email Route'] === 'bare_minimum', JSON.stringify({ offers: r.st.offers, clicked: r.clicked, route: r.row && r.row['V4 Result Email Route'] })); }
  // L1: 3+ stages but total under 15 -> £117 only, no questions
  let l1 = null;
  { const r = await scenario('L1', 'desktop', [3, 3, 3, 3], 'self_work', 'yes', { click: '117' }); l1 = r;
    check('L1', 'Total 12 (4 stages, under 15): no readiness questions, Self-Guided £117 only, no £147/£197, straight to Stan, results email lists only £117',
      JSON.stringify(r.st.offers) === '["self_guided"]' && !/Bootcamp|£147|£197/.test(r.st.text) && r.clicked && r.clicked.startsWith(STAN[117]) && r.row && r.row['V4 Post-Result Question 1 Option ID'] === '' && r.emails.length >= 1,
      JSON.stringify({ offers: r.st.offers, clicked: r.clicked, q1: r.row && r.row['V4 Post-Result Question 1 Option ID'], emails: r.emails.length })); }
  // Scored routes unchanged: single, pair, Bare Minimum
  for (const [id, vp, stages, price] of [['P1', 'mobile', [5, 0, 0, 0], '37'], ['P2', 'desktop', [5, 4, 0, 0], '74'], ['P3', 'mobile', [0, 0, 0, 0], '4.99']]) {
    const r = await scenario(id, vp, stages, 'self_work', 'yes', { click: price });
    check(id, `[${vp}] ${price === '37' ? 'single stage' : price === '74' ? 'two stages' : 'no stage'} -> £${price}, button goes straight to Stan, no Bootcamp`, r.clicked && r.clicked.startsWith(STAN[price]) && !/Bootcamp/.test(r.st.text) && r.errors.length === 0, JSON.stringify({ clicked: r.clicked, err: r.errors, t: r.st.text.slice(0, 120) }));
  }
  // C1: "Book a free 15-minute call" opens TidyCal and is recorded
  { const { ctx, page, external, errors } = await newPage('mobile');
    await answerAll(page, [5, 5, 4, 3], 'synthetic+c1@example.invalid'); await toRec(page, 'self_work', 'yes');
    const token = await tokenOf(page);
    const href = await page.$eval('.result-panel.active a[href*="tidycal.com"]', a => a.href);
    await page.$eval('.result-panel.active a[href*="tidycal.com"]', a => { a.removeAttribute('target'); a.click(); });
    await sleep(2500); await ctx.close();
    const jl = journeyFor(token);
    check('C1', 'Fit call link goes to the free TidyCal Bootcamp Fit Call and the click is recorded', href === 'https://tidycal.com/yourmindstory/bootcamp-fit-call' && jl.includes('bootcamp_call_click:OK'), JSON.stringify({ href, jl: jl.slice(-6), errors })); }
  // T1/T2: tracking on the two-offer journey
  { const r = await scenario('T1', 'desktop', [5, 5, 4, 3], 'self_work', 'yes', { click: '497', consent: 'yes', query: '?utm_source=tiktok&utm_medium=social&utm_campaign=t1_test' });
    const tags = r.external.filter(u => /googletagmanager|google-analytics|clarity\.ms|facebook\.(net|com)/.test(u));
    const leak = r.external.some(u => u.includes(r.email) || u.includes(encodeURIComponent(r.email)) || u.includes('Synthia'));
    console.log('T1 journey:', JSON.stringify(r.jl));
    check('T1', 'With consent: GA4, Clarity and Meta load; no name/email in any third-party request; UTMs saved on her row; journey events recorded through to the Bootcamp click',
      tags.some(u => /googletagmanager/.test(u)) && tags.some(u => /clarity\.ms/.test(u)) && tags.some(u => /facebook/.test(u)) && !leak &&
      r.row && r.row['Assessment Touch Source'] === 'tiktok' && r.row['Assessment Touch Campaign'] === 't1_test' &&
      r.jl.some(x => /^offer_select_click:OK/.test(x)) && r.jl.length >= 5 && r.clicked && r.clicked.startsWith(STAN[497]) && /utm_source=tiktok/.test(r.clicked) && r.jl.some(x => /^outbound_stan_click:OK/.test(x)),
      JSON.stringify({ clicked: r.clicked, camp: r.row && r.row['Assessment Touch Campaign'], osc: r.jl.filter(x => /offer|outbound|cta/.test(x)) })); }
  { const r = await scenario('T2', 'mobile', [5, 5, 4, 3], 'self_work', 'no', { click: '117', consent: 'no', query: '?utm_source=facebook&utm_campaign=t2_test' });
    const tags = r.external.filter(u => /googletagmanager|google-analytics|clarity\.ms|facebook\.(net|com)/.test(u));
    check('T2', 'Without consent: no GA4/Clarity/Meta at all, but first-party UTMs and journey events still saved',
      tags.length === 0 && r.row && r.row['Assessment Touch Source'] === 'facebook' && r.jl.some(x => /^offer_select_click:OK/.test(x)),
      JSON.stringify({ tags, src: r.row && r.row['Assessment Touch Source'], jl: r.jl })); }
  // E1: the completion results email for a Complete result offers only £117
  { const first = l1 && l1.emails[0]; const body = first ? String(first[6]) + String(first[7]) : '';
    check('E1', 'Results email (sent at completion) for a Complete result offers Self-Guided £117 only (no £147 / £197)', first && /£117/.test(body) && !/£147|£197|Reality Reset|Pattern Break/.test(body), (first ? first[4] : 'no email') + ' ' + body.slice(0, 300)); }

  await browser.close(); srv.server.close();
  console.log(`\n${results.filter(r => r.pass).length}/${results.length} passed`);
  fs.writeFileSync(path.join(OUT, 'twooffer-results.json'), JSON.stringify(results, null, 2));
  process.exit(results.every(r => r.pass) ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });

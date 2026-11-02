// Simulated end-to-end browser tests: real candidate page in headless Chrome against the real candidate
// backend code (in-memory DEV workbook). Third-party hosts (Stan, GA, Clarity, fonts) are intercepted, never reached.
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { start } = require('./server');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const results = [];
function check(id, area, desc, cond, evidence) { results.push({ id, area, desc, pass: !!cond, evidence: evidence === undefined ? '' : String(evidence).slice(0, 400) }); console.log((cond ? 'PASS ' : 'FAIL ') + id + ' ' + desc + (cond ? '' : '  <<< ' + String(evidence).slice(0, 300))); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PAGE = '/assessment/v4-preview/start/';
const VIEWPORTS = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };

let browser, srv, base;
async function newPage(vp = 'desktop', consent = false) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(VIEWPORTS[vp]);
  const external = [];
  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    if (u.startsWith(base)) return req.continue();
    external.push({ url: u, method: req.method(), post: req.postData() || '' });
    req.abort();
  });
  const errors = [];
  page.on('pageerror', e => { errors.push(String(e)); console.log('PAGEERROR', String(e)); });
  if (consent) await page.evaluateOnNewDocument(() => { try { localStorage.setItem('yms_analytics_consent', 'yes'); } catch (e) {} });
  else await page.evaluateOnNewDocument(() => { try { localStorage.setItem('yms_analytics_consent', 'no'); } catch (e) {} });
  return { ctx, page, external, errors };
}
async function clickSel(page, sel) { await page.waitForSelector(sel, { visible: true, timeout: 15000 }); await page.$eval(sel, el => el.scrollIntoView({ block: 'center' })); await page.click(sel); }
async function answerAll(page, stages, opt = {}) {
  await page.goto(base + PAGE + (opt.query || ''), { waitUntil: 'domcontentloaded' });
  await clickSel(page, '#beginV4');
  const sc = []; stages.forEach(t => { const x = Math.min(3, t); sc.push(x, t - x); });
  for (let n = 0; n < 8; n++) { await clickSel(page, `.step.active .opt[data-v="${sc[n]}"]`); await sleep(30); }
  await clickSel(page, '.step.active .opt[data-v="2"]'); await sleep(30);   // Q9 belief
  await clickSel(page, '.step.active .opt[data-v="1"]'); await sleep(30);   // Q10
  await clickSel(page, `.step.active .opt[data-v="${opt.context ?? 1}"]`); await sleep(30); // Q11 context
  await clickSel(page, `.step.active .opt[data-v="${opt.outcome ?? 0}"]`); await sleep(30); // Q12 outcome
  await clickSel(page, '.step.active .opt[data-v="0"]'); await clickSel(page, '#next'); await sleep(30); // Q13 multi
  await page.waitForSelector('#txt'); await page.type('#txt', 'Synthetic: it is costing me sleep.'); await clickSel(page, '#next');
  await page.waitForSelector('#fn');
  await page.type('#fn', opt.name || 'Synthia'); await page.type('#em', opt.email || `synthetic+${Date.now()}@example.invalid`);
  await clickSel(page, `.consent-opt[data-consent="${opt.marketing ? 'yes' : 'no'}"]`);
  await clickSel(page, '#capgo');
  try { await page.waitForFunction(() => window.v4ResultReady === true, { timeout: 30000 }); }
  catch (e) { const st = await page.evaluate(() => ({ cap: (document.getElementById('caperr') || {}).textContent, panels: document.querySelectorAll('.result-panel').length, html: (document.getElementById('result') || {}).innerHTML?.slice(0, 300) })); await page.screenshot({ path: path.join(OUT, 'shots', 'debug-timeout.png') }); throw new Error('result not ready: ' + JSON.stringify(st) + ' reqs=' + JSON.stringify(srv.state.requests.slice(-3).map(r => r.method + ' ' + r.body.slice(0, 60)))); }
}
async function activePanelText(page) { return page.$eval('.result-panel.active', el => el.innerText); }
async function next(page) { await clickSel(page, '.result-panel.active .result-next'); await sleep(450); }
async function answerQ(page, goal, support) {
  await page.select('#v4GoalChoice', goal);
  if (support) await page.select('#v4SupportLevel', support);
}
async function finalOffers(page) {
  return page.$$eval('#v4FinalRecommendation a[data-rec-product]', as => as.map(a => ({ price: a.dataset.recPrice, product: a.dataset.recProduct, href: a.href, label: a.innerText.trim() })));
}
async function eyebrows(page) { return page.$$eval('#v4FinalRecommendation .eyebrow', e => e.map(x => x.innerText.trim())); }
async function choose(page, price, shotName) {
  await clickSel(page, `.result-panel.active a[data-rec-price="${price}"]`);
  await page.waitForSelector('#v4Confirm', { visible: true });
  if (shotName) await page.screenshot({ path: path.join(OUT, 'shots', shotName + '-confirm.png') });
  await clickSel(page, '#v4Confirm');
  await page.waitForFunction(() => document.querySelector('#v4Checkout') || (document.querySelector('#v4DecError') && document.querySelector('#v4DecError').textContent && document.querySelector('#v4Confirm') && !document.querySelector('#v4Confirm').disabled), { timeout: 30000 });
  return page.evaluate(() => ({ checkout: document.querySelector('#v4Checkout') ? document.querySelector('#v4Checkout').href : '', error: (document.querySelector('#v4DecError') || {}).textContent || '' }));
}
const rowFor = token => srv.state.rt.rows().find(r => r['Result Token'] === token);
const emailsFor = email => { const sh = srv.state.rt.sheet('V4 DEV Email Log'); return sh ? sh.rows.slice(1).filter(r => r[2] === email) : []; };
const tokenOf = page => page.evaluate(() => JSON.parse(sessionStorage.getItem('yms_v4_preview_last_submission') || '{}').resultToken);

const STAN = {
  117: 'https://stan.store/Yourmindstory/p/return-to-yourself-eli637kx',
  147: 'https://stan.store/Yourmindstory/p/return-to-yourself-reality-reset',
  197: 'https://stan.store/Yourmindstory/p/return-to-yourself-pattern-break',
  '4.99': 'https://stan.store/Yourmindstory/p/the-bare-minimum'
};

async function completeScenario(id, vp, goal, support, expectPrices, primaryPrice, choosePrice) {
  const { ctx, page, errors } = await newPage(vp);
  const email = `synthetic+${id.toLowerCase()}@example.invalid`;
  await answerAll(page, [5, 5, 4, 3], { email });
  const p0 = await activePanelText(page);
  await page.screenshot({ path: path.join(OUT, 'shots', `${id}-${vp}-1-recognition.png`) });
  const qHiddenOn0 = await page.$eval('.result-panel.active', el => !el.querySelector('#v4GoalChoice'));
  await next(page);
  const p1 = await activePanelText(page);
  await answerQ(page, goal, support);
  const q2Visible = await page.$eval('#v4SupportDecision', el => !el.hidden);
  await page.screenshot({ path: path.join(OUT, 'shots', `${id}-${vp}-2-questions.png`), fullPage: true });
  await next(page);
  const offers = await finalOffers(page);
  const eb = await eyebrows(page);
  await page.screenshot({ path: path.join(OUT, 'shots', `${id}-${vp}-3-recommendation.png`), fullPage: true });
  const prices = [...new Set(offers.map(o => o.price))];
  const firstPrice = offers[0] && offers[0].price;
  const token = await tokenOf(page);
  const before = emailsFor(email).length;
  const ch = await choose(page, choosePrice, `${id}-${vp}`);
  const row = rowFor(token);
  const emails = emailsFor(email);
  const ok = qHiddenOn0 && p0.includes('Hasn') && p1.includes('Which sounds most like what you want now?') &&
    q2Visible === !!support && JSON.stringify(prices.sort()) === JSON.stringify(expectPrices.map(String).sort()) && String(firstPrice) === String(primaryPrice) &&
    ch.checkout === STAN[choosePrice] && before === 0 && emails.length === 1 && row['V4 Post-Result Question 1 Option ID'] === goal && row['V4 Post-Result Question 2 Option ID'] === (support || '') && errors.length === 0;
  check(id, 'Routing', `[${vp}] Complete ≥15: Q1=${goal}${support ? ', Q2=' + support : ''} → offers £${expectPrices.join('/£')} (primary £${primaryPrice}); chose £${choosePrice}; saved + 1 email + checkout`, ok,
    JSON.stringify({ qHiddenOn0, q2Visible, prices, firstPrice, eyebrows: eb, checkout: ch.checkout, err: ch.error, emailsBefore: before, emails: emails.length, q1: row && row['V4 Post-Result Question 1 Option ID'], q2: row && row['V4 Post-Result Question 2 Option ID'], route: row && row['V4 Result Email Route'], errors }));
  await ctx.close();
  return { token, email };
}

(async () => {
  srv = await start(8777); base = 'http://127.0.0.1:8777';
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server'] });

  // ---- B. Complete routes (desktop + mobile) ----
  await completeScenario('E1', 'desktop', 'self_work', 'independent', [117], 117, 117);
  await completeScenario('E2', 'mobile', 'self_work', 'additional', [147, 197], 147, 197);
  await completeScenario('E3', 'desktop', 'unsure', 'some_support', [147, 197], 147, 147);
  await completeScenario('E4', 'mobile', 'self_work', 'recommend', [117, 147, 197], 147, 117);
  await completeScenario('E5', 'desktop', 'unsure', 'recommend', [117, 147, 197], 147, 197);
  await completeScenario('E6', 'mobile', 'understand_him', null, [4.99], 4.99, '4.99');
  const e7 = await completeScenario('E7', 'desktop', 'change_him', null, [4.99], 4.99, '4.99');

  // ---- Non-Complete routes: no Q1/Q2 ----
  const scored = [
    ['E8', 'desktop', [5, 0, 0, 0], '37', 'https://stan.store/Yourmindstory/p/quiet-the-alarm', 3],
    ['E9', 'mobile', [0, 6, 0, 0], '37', 'https://stan.store/Yourmindstory/p/break-the-pull', 3],
    ['E10', 'desktop', [0, 0, 4, 0], '37', 'https://stan.store/Yourmindstory/p/restore-self-trust', 3],
    ['E11', 'mobile', [0, 0, 0, 3], '37', 'https://stan.store/Yourmindstory/p/return-to-yourself-7jc9h8lg', 3],
    ['E12', 'desktop', [5, 4, 0, 0], '74', 'https://stan.store/Yourmindstory/p/quiet-the-alarm--break-the-pull', 3],
    ['E13', 'mobile', [5, 0, 4, 0], '74', 'https://stan.store/Yourmindstory/p/quiet-the-alarm--restore-selftrust', 3],
    ['E14', 'desktop', [5, 0, 0, 4], '74', 'https://stan.store/Yourmindstory/p/quiet-the-alarm--return-to-yourself', 3],
    ['E15', 'mobile', [0, 5, 4, 0], '74', 'https://stan.store/Yourmindstory/p/break-the-pull--restore-selftrust', 3],
    ['E16', 'desktop', [0, 5, 0, 4], '74', 'https://stan.store/Yourmindstory/p/break-the-pull--return-to-yourself', 3],
    ['E17', 'mobile', [0, 0, 5, 4], '74', 'https://stan.store/Yourmindstory/p/restore-selftrust--return-to-yourself', 3],
    ['E18', 'desktop', [2, 2, 2, 2], '4.99', 'https://stan.store/Yourmindstory/p/the-bare-minimum', 1],
    ['E19', 'mobile', [0, 0, 0, 0], '4.99', 'https://stan.store/Yourmindstory/p/the-bare-minimum', 1],
  ];
  for (const [id, vp, st, price, href, nPanels] of scored) {
    const { ctx, page, errors } = await newPage(vp);
    const email = `synthetic+${id.toLowerCase()}@example.invalid`;
    await answerAll(page, st, { email });
    const panels = await page.$$eval('.result-panel', p => p.length);
    const hasQ = await page.$('#v4GoalChoice') !== null;
    for (let k = 1; k < nPanels; k++) await next(page);
    await page.screenshot({ path: path.join(OUT, 'shots', `${id}-${vp}-final.png`), fullPage: true });
    const token = await tokenOf(page);
    const ch = await choose(page, price);
    const row = rowFor(token); const emails = emailsFor(email);
    const ok = panels === nPanels && !hasQ && ch.checkout === href && emails.length === 1 && row['V4 Result Email Route'] === (price === '4.99' ? 'bare_minimum' : 'scored_route') && !row['V4 Post-Result Question 1 Option ID'] && errors.length === 0;
    check(id, 'Routing', `[${vp}] stages ${st.join(',')} → £${price} (${panels} panel${panels > 1 ? 's' : ''}), no Q1/Q2, saved + 1 email + correct checkout`, ok, JSON.stringify({ panels, hasQ, checkout: ch.checkout, err: ch.error, emails: emails.length, route: row && row['V4 Result Email Route'], errors }));
    await ctx.close();
  }
  // Complete below readiness threshold (total < 15)
  {
    const { ctx, page, errors } = await newPage('desktop');
    const email = 'synthetic+e20@example.invalid';
    await answerAll(page, [3, 3, 3, 0], { email });
    const hasQ = await page.$('#v4GoalChoice') !== null;
    await next(page); await next(page);
    const offers = await finalOffers(page);
    const token = await tokenOf(page);
    const ch = await choose(page, '197');
    const row = rowFor(token);
    check('E20', 'Routing', '[desktop] Complete below 15 (3,3,3,0): no Q1/Q2, all three Complete choices, £197 saved + emailed', !hasQ && [...new Set(offers.map(o => o.price))].sort().join() === '117,147,197' && ch.checkout === STAN[197] && row['V4 Result Email Route'] === 'pattern_break' && emailsFor(email).length === 1 && errors.length === 0,
      JSON.stringify({ hasQ, prices: offers.map(o => o.price), checkout: ch.checkout, err: ch.error }));
    await ctx.close();
  }

  // ---- Validation, back navigation, refresh ----
  {
    const { ctx, page, errors } = await newPage('mobile');
    const email = 'synthetic+e21@example.invalid';
    await answerAll(page, [6, 6, 6, 6], { email });
    await next(page);
    await clickSel(page, '.result-panel.active .result-next'); await sleep(300);
    const err1 = await page.$eval('#v4ReadinessError', e => e.textContent);
    const stillOn2 = await page.$eval('.result-panel.active', e => !!e.querySelector('#v4GoalChoice'));
    check('F1', 'UX', '[mobile] Continuing without answering shows an error and stays on the questions', /answer both/i.test(err1) && stillOn2, err1);
    await page.select('#v4GoalChoice', 'self_work');
    await clickSel(page, '.result-panel.active .result-next'); await sleep(300);
    const err2 = await page.$eval('#v4ReadinessError', e => e.textContent);
    check('F2', 'UX', 'Q1 answered but Q2 missing still blocks continuation', /answer both/i.test(err2), err2);
    await page.select('#v4SupportLevel', 'additional');
    await next(page);
    const firstBefore = (await finalOffers(page))[0].price;
    await page.goBack(); await sleep(500);
    const back = await page.evaluate(() => ({ goal: document.getElementById('v4GoalChoice').value, sup: document.getElementById('v4SupportLevel').value, onQ: !!document.querySelector('.result-panel.active #v4GoalChoice') }));
    check('F3', 'UX', 'Browser Back from the recommendation returns to the questions with both answers kept', back.onQ && back.goal === 'self_work' && back.sup === 'additional', JSON.stringify(back));
    await page.select('#v4SupportLevel', 'independent'); await next(page);
    const afterChange = (await finalOffers(page)).map(o => o.price);
    check('F4', 'UX', 'Changing Q2 after going back updates the recommendation (additional £147 → independent £117 only)', firstBefore === '147' && [...new Set(afterChange)].join() === '117', JSON.stringify({ firstBefore, afterChange }));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.v4ResultReady === true, { timeout: 15000 });
    const rf = await page.evaluate(() => ({ goal: document.getElementById('v4GoalChoice').value, sup: document.getElementById('v4SupportLevel').value, offers: [...document.querySelectorAll('#v4FinalRecommendation a[data-rec-product]')].map(a => a.dataset.recPrice) }));
    check('F5', 'UX', 'Refresh keeps the result, Q1/Q2 answers and the matching recommendation', rf.goal === 'self_work' && rf.sup === 'independent' && [...new Set(rf.offers)].join() === '117', JSON.stringify(rf));
    const token = await tokenOf(page);
    check('F6', 'Persistence', 'Refresh/back created no extra assessment rows and sent no email', srv.state.rt.rows().filter(r => r['Email'] === email).length === 1 && emailsFor(email).length === 0, 'rows=1');
    // double confirm click
    await next(page); await next(page);
    await clickSel(page, '.result-panel.active a[data-rec-price="117"]');
    await page.waitForSelector('#v4Confirm');
    await page.evaluate(() => { const b = document.querySelector('#v4Confirm'); b.click(); b.click(); b.click(); });
    await page.waitForSelector('#v4Checkout', { timeout: 20000 });
    await sleep(500);
    check('D16', 'Email', 'Triple-clicking Confirm produces one saved choice and one email', emailsFor(email).length === 1 && rowFor(token)['V4 Result Email Route'] === 'self_guided', 'emails=' + emailsFor(email).length);
    // checkout handoff navigation is intercepted (no purchase)
    const nav = [];
    page.on('request', r => { if (r.isNavigationRequest()) nav.push(r.url()); });
    await page.click('#v4Checkout').catch(() => {}); await sleep(800);
    check('H1', 'Checkout', 'Checkout button navigates to the saved offer\'s Stan URL (request intercepted, no purchase)', nav.some(u => u === STAN[117]), nav.join(' '));
    check('F7', 'UX', 'No JavaScript errors across validation/back/refresh/confirm', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- Saved-result link return ----
  {
    // finalized journey (E7: change_him → Bare Minimum)
    const { ctx, page, errors } = await newPage('desktop');
    await page.goto(base + PAGE + '?utm_source=yms_assessment&utm_medium=email&utm_campaign=v4_result_email&resultToken=' + e7.token, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#v4Checkout', { timeout: 20000 });
    const v = await page.evaluate(() => ({ text: document.querySelector('#v4Decision').innerText, href: document.querySelector('#v4Checkout').href, goal: document.getElementById('v4GoalChoice') && document.getElementById('v4GoalChoice').value }));
    await page.screenshot({ path: path.join(OUT, 'shots', 'R1-saved-link-finalized.png') });
    check('R1', 'Resume', 'Saved-result link for a finalised journey reopens the result and shows the saved choice + its checkout (no new email)', /The Bare Minimum/.test(v.text) && v.href === STAN['4.99'] && v.goal === 'change_him' && emailsFor(e7.email).length === 1 && errors.length === 0, JSON.stringify(v));
    await ctx.close();
  }
  {
    // unfinished journey: submit, abandon, then return via saved link on another device
    const a = await newPage('desktop');
    const email = 'synthetic+r2@example.invalid';
    await answerAll(a.page, [4, 5, 6, 3], { email, outcome: 2, context: 2 });
    const token = await tokenOf(a.page);
    const firstText = await activePanelText(a.page);
    await a.ctx.close();
    check('D17', 'Email', 'Abandoned after result: no offer email was sent', emailsFor(email).length === 0, 'emails=0');
    const b = await newPage('mobile');
    await b.page.goto(base + PAGE + '?resultToken=' + token, { waitUntil: 'domcontentloaded' });
    await b.page.waitForFunction(() => window.v4ResultReady === true, { timeout: 20000 });
    const again = await activePanelText(b.page);
    await next(b.page);
    const p1 = await activePanelText(b.page);
    await answerQ(b.page, 'unsure', 'additional'); await next(b.page);
    const ch = await choose(b.page, '147');
    const row = rowFor(token);
    check('R2', 'Resume', '[mobile, new device] Saved link restores the same personalised result and she can complete the unfinished choice', again.split('\n').slice(1, 4).join() === firstText.split('\n').slice(1, 4).join() && p1.includes('freedom from constantly') === false && ch.checkout === STAN[147] && row['V4 Result Email Route'] === 'reality_reset' && emailsFor(email).length === 1 && b.errors.length === 0,
      JSON.stringify({ same: again.split('\n').slice(1, 4), checkout: ch.checkout, err: ch.error, errors: b.errors }));
    // personalised outcome sentence restored from saved answers (outcome index 2)
    check('R3', 'Resume', 'Restored result keeps the personalised desired-outcome wording from her saved answers', /feel free from constantly thinking, checking, waiting or replaying/.test(p1), p1.slice(0, 200));
    // Trying a different offer after the email: shows saved choice instead of a contradiction
    await clickSel(b.page, '#v4Finish');
    await clickSel(b.page, '.result-panel.active a[data-rec-price="197"]');
    await clickSel(b.page, '#v4Confirm');
    await b.page.waitForSelector('#v4Checkout', { timeout: 20000 });
    const lock = await b.page.evaluate(() => ({ t: document.querySelector('#v4Decision').innerText, href: document.querySelector('#v4Checkout').href }));
    check('R4', 'Resume', 'Choosing a different offer after the email shows her saved £147 choice and checkout, sends nothing new', /already chose/i.test(lock.t) && lock.href === STAN[147] && emailsFor(email).length === 1, JSON.stringify(lock));
    await b.ctx.close();
  }
  {
    const { ctx, page } = await newPage('desktop');
    await page.goto(base + PAGE + '?resultToken=doesnotexist0000000000000000000', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => /could not be found/.test((document.getElementById('v4RestoreMsg') || {}).textContent || ''), { timeout: 15000 });
    check('R5', 'Resume', 'Unknown saved-result token shows a clear error instead of a broken page', true, 'message shown');
    await ctx.close();
  }

  // ---- Error states ----
  {
    const { ctx, page, errors } = await newPage('desktop');
    const email = 'synthetic+f8@example.invalid';
    await answerAll(page, [5, 0, 0, 0], { email });
    await next(page); await next(page);
    srv.state.down = true;
    await clickSel(page, '.result-panel.active a[data-rec-price="37"]'); await clickSel(page, '#v4Confirm');
    await page.waitForFunction(() => document.querySelector('#v4Confirm') && document.querySelector('#v4Confirm').textContent === 'TRY AGAIN', { timeout: 20000 });
    const msg = await page.$eval('#v4DecError', e => e.textContent);
    srv.state.down = false;
    await clickSel(page, '#v4Confirm'); await page.waitForSelector('#v4Checkout', { timeout: 20000 });
    check('F8', 'UX', 'Backend outage during confirm shows an error and TRY AGAIN; retry succeeds with one email', msg.length > 0 && emailsFor(email).length === 1, msg);
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage('desktop');
    srv.state.down = true;
    await page.goto(base + PAGE, { waitUntil: 'domcontentloaded' });
    srv.state.down = false;
    await ctx.close();
    const { ctx: c2, page: p2 } = await newPage('desktop');
    srv.state.delayMs = 0; srv.state.down = true;
    const t0 = Date.now();
    try { await answerAll(p2, [5, 0, 0, 0], { email: 'synthetic+f9@example.invalid' }); } catch (e) {}
    await p2.waitForFunction(() => /could not be saved/.test((document.getElementById('caperr') || {}).textContent || ''), { timeout: 60000 }).catch(() => {});
    const capErr = await p2.$eval('#caperr', e => e.textContent).catch(() => '') + ' (after ' + Math.round((Date.now() - t0) / 1000) + 's incl. answering)';
    const shown = await p2.evaluate(() => document.querySelectorAll('.result-panel').length);
    srv.state.down = false;
    check('F9', 'UX', 'If the assessment cannot be saved, the capture screen shows an error and allows retry (no result shown unsaved)', /could not be saved/.test(capErr) && shown === 0, capErr + ' panels=' + shown);
    await c2.close();
  }

  // ---- Analytics / privacy ----
  {
    const { ctx, page, external } = await newPage('desktop', true);
    const email = 'synthetic+privacy@example.invalid';
    await answerAll(page, [6, 6, 6, 6], { email, name: 'Privacytest', marketing: true });
    await next(page); await answerQ(page, 'self_work', 'additional'); await next(page);
    await choose(page, '147');
    const dl = await page.evaluate(() => JSON.stringify((window.dataLayer || []).map(x => Array.from(x))));
    const cl = await page.evaluate(() => JSON.stringify((window.clarity && window.clarity.q) || []));
    const allOut = dl + cl + JSON.stringify(external);
    const answerTexts = ['My whole system goes into alert', 'Synthetic: it is costing me sleep', 'I want help understanding myself', 'I want additional support'];
    const leaks = ['Privacytest', email, encodeURIComponent(email), ...answerTexts].filter(t => allOut.includes(t));
    const evNames = (window => window)(JSON.parse(dl)).filter(x => x[0] === 'event').map(x => x[1]);
    check('P1', 'Privacy', 'With analytics consent, GA4 dataLayer / Clarity / outbound requests contain no name, email, answer text or Q1/Q2 text', leaks.length === 0, 'leaks=' + JSON.stringify(leaks) + ' events=' + evNames.slice(0, 25).join(','));
    const optionIdx = JSON.parse(dl).some(x => x[0] === 'event' && x[2] && 'option_index' in x[2]);
    check('P2', 'Privacy', 'GA4 events no longer carry option_index (raw scored answers)', !optionIdx, 'option_index present=' + optionIdx);
    check('P3', 'Analytics', 'With consent, GA4 receives assessment funnel events', evNames.includes('assessment_complete') && evNames.includes('result_step_view'), evNames.length + ' events');
    const ga = external.filter(e => /googletagmanager|google-analytics|clarity\.ms/.test(e.url));
    check('P4', 'Analytics', 'With consent, GA4 (gtag) and Clarity tags are requested', ga.some(e => /googletagmanager/.test(e.url)) && ga.some(e => /clarity\.ms/.test(e.url)), ga.map(e => e.url.split('?')[0]).join(' '));
    const sub = srv.state.requests.find(r => r.method === 'POST' && r.body.includes(email));
    const sb = JSON.parse(sub.body);
    check('P5', 'Analytics', 'First-party submission keeps marketing consent separate and preserves attribution fields', sb.marketingConsent === true && 'firstTouchSource' in sb && 'landingUrl' in sb && sb.deferResultEmail === true, JSON.stringify({ mc: sb.marketingConsent, lp: sb.landingUrl }));
    await ctx.close();
  }
  {
    const { ctx, page, external } = await newPage('desktop', false);
    await answerAll(page, [5, 0, 0, 0], { email: 'synthetic+noconsent@example.invalid', query: '?utm_source=tiktok&utm_medium=social&utm_campaign=test_attr' });
    const dl = await page.evaluate(() => (window.dataLayer || []).length);
    const ga = external.filter(e => /googletagmanager|google-analytics|clarity\.ms/.test(e.url));
    const sub = srv.state.requests.filter(r => r.method === 'POST' && r.body.includes('synthetic+noconsent')).pop();
    const sb = JSON.parse(sub.body);
    const row = srv.state.rt.rows().find(r => r['Email'] === 'synthetic+noconsent@example.invalid');
    check('P6', 'Analytics', 'Without analytics consent no GA4/Clarity tag loads and no dataLayer events fire; result still delivered', ga.length === 0 && dl === 0 && !!row, JSON.stringify({ ga: ga.length, dl }));
    check('P7', 'Analytics', 'Assessment-touch UTM attribution is saved first-party regardless of analytics consent; GA client ID not sent', row['Assessment Touch Source'] === 'tiktok' && row['Assessment Touch Campaign'] === 'test_attr' && sb.gaClientId === '', JSON.stringify({ src: row['Assessment Touch Source'], camp: row['Assessment Touch Campaign'] }));
    check('P8', 'Privacy', 'Result screens carry data-clarity-mask', await page.$eval('#result', e => e.getAttribute('data-clarity-mask') === 'true'), 'masked');
    await ctx.close();
  }

  // ---- Accessibility ----
  {
    const { ctx, page } = await newPage('mobile');
    await answerAll(page, [6, 6, 6, 6], { email: 'synthetic+a11y@example.invalid' });
    await next(page);
    const a = await page.evaluate(() => {
      const lab = id => !!document.querySelector(`label[for="${id}"]`);
      const btns = [...document.querySelectorAll('.result-panel.active button, .result-panel.active a, .result-panel.active select')];
      const unnamed = btns.filter(b => !(b.innerText || b.getAttribute('aria-label') || (b.id && document.querySelector(`label[for="${b.id}"]`))).trim && !(b.innerText || '').trim() && !b.getAttribute('aria-label') && !(b.id && document.querySelector(`label[for="${b.id}"]`))).length;
      const small = [...document.querySelectorAll('.result-panel.active .result-next, .result-panel.active .result-back')].filter(b => { const r = b.getBoundingClientRect(); return r.height < 44; }).length;
      return { q1: lab('v4GoalChoice'), q2: lab('v4SupportLevel'), unnamed, small, overflow: document.documentElement.scrollWidth > window.innerWidth };
    });
    await answerQ(page, 'self_work', 'independent'); await next(page); await next(page).catch(() => {});
    await clickSel(page, '.result-panel.active a[data-rec-price="117"]');
    await page.waitForSelector('#v4Confirm');
    const d = await page.evaluate(() => ({ role: document.querySelector('#v4Decision [role=dialog]').getAttribute('aria-modal'), focus: document.activeElement && document.activeElement.id }));
    await page.keyboard.press('Escape'); await sleep(200);
    const closed = await page.$('#v4Decision') === null;
    check('X1', 'Accessibility', 'Q1/Q2 selects have labels; result controls are named; touch targets ≥44px; no horizontal scroll at 390px', a.q1 && a.q2 && a.unnamed === 0 && a.small === 0 && !a.overflow, JSON.stringify(a));
    check('X2', 'Accessibility', 'Confirmation dialog is aria-modal, focuses Confirm, and closes with Escape', d.role === 'true' && d.focus === 'v4Confirm' && closed, JSON.stringify(d) + ' closed=' + closed);
    await ctx.close();
  }

  // ---- Fail-closed: page as committed (no DEV URL yet) never contacts any backend ----
  {
    const srv2 = await start(8778, { unpatched: true });
    const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
    const ext = []; await page.setRequestInterception(true);
    page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:8778')) { ext.push(r.url()); r.abort(); } else r.continue(); });
    const saveBase = base; base = 'http://127.0.0.1:8778';
    try { await answerAll(page, [5, 0, 0, 0], { email: 'synthetic+failclosed@example.invalid' }); } catch (e) {}
    const capErr = await page.$eval('#caperr', e => e.textContent).catch(() => '');
    base = saveBase;
    check('G8', 'Isolation', 'Committed page (DEV URL placeholder) sends nothing to any Apps Script endpoint and does not show an unsaved result', srv2.state.requests.length === 0 && !ext.some(u => /script\.google\.com/.test(u)) && /could not be saved/.test(capErr), JSON.stringify({ local: srv2.state.requests.length, google: ext.filter(u => /script\.google/.test(u)) }));
    await ctx.close(); srv2.server.close();
  }

  // ---- Bootcamp absence ----
  {
    const html = fs.readFileSync(require('path').resolve(__dirname, '../../../assessment/v4-preview/start/index.html'), 'utf8');
    check('H2', 'Checkout', 'No Bootcamp link or copy in the V4 page', !/bootcamp/i.test(html), 'grep bootcamp = 0');
  }

  fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify(results, null, 1));
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  await browser.close(); srv.server.close();
})().catch(async e => { console.error('HARNESS ERROR', e); try { fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify(results, null, 1)); await browser.close(); } catch (x) {} process.exit(1); });

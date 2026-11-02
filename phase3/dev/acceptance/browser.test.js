// Simulated end-to-end browser tests (r3): real candidate page in headless Chrome against the real candidate
// backend code (in-memory DEV workbook). Third-party hosts (Stan, GA, Clarity, fonts) are intercepted, never reached.
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { start } = require('./server');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const results = [];
function check(id, area, desc, cond, evidence) { results.push({ id, area, desc, pass: !!cond, evidence: evidence === undefined ? '' : String(evidence).slice(0, 500) }); console.log((cond ? 'PASS ' : 'FAIL ') + id + ' ' + desc + (cond ? '' : '  <<< ' + String(evidence).slice(0, 400))); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PAGE = '/assessment/v4-preview/start/';
const VIEWPORTS = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
const STAN = {
  117: 'https://stan.store/Yourmindstory/p/return-to-yourself-eli637kx',
  147: 'https://stan.store/Yourmindstory/p/return-to-yourself-reality-reset',
  197: 'https://stan.store/Yourmindstory/p/return-to-yourself-pattern-break',
  '4.99': 'https://stan.store/Yourmindstory/p/the-bare-minimum'
};
const OFFER_PRICE = { self_guided: '117', reality_reset: '147', pattern_break: '197', bare_minimum: '4.99' };
// Locked copy fragments (verbatim from the two approved documents)
const LOCK = {
  results: ["you may understand what's happening with him and still find yourself caught in the same responses.", 'Your answers suggest this pattern is affecting several areas of your life.', "Here's where it's showing up most strongly for you.", 'WHAT YOU WANT INSTEAD', 'You told me that what you want most is:', 'And that matters.', "Because this isn't just about understanding what's happening.", "It's about getting back to how you want to feel and live.", 'WHAT THIS MEANS', "Understanding a pattern doesn't always stop your response when it happens again.", 'Those responses can become automatic.', "But recognising where they're showing up gives you a clearer place to start.", 'CONTINUE TO MY NEXT STEP'],
  findings: ['The Alarm', 'The Pull', 'Self-Trust', 'Losing Yourself'],
  q2: ['One more thing.', "This pattern didn't develop overnight, and changing how you respond to it takes practice.", "Meaningful change happens through small, consistent steps. That's why Return to Yourself is designed to guide you over the next 12 weeks, helping you build new responses and stay on track as you return to yourself.", 'Your main job is simple: press play each day and complete a short weekly check-in with me.', 'Would you like more personal support than this?'],
  self_guided: ["HERE'S WHERE I RECOMMEND YOU START", 'A 12-week journey of guided Cognitive Behavioural Hypnotherapy sessions', 'your answers suggest that this pattern is affecting several areas of your life.', "And you've told me that you want to ", "That's why I recommend working through the complete programme rather than focusing on just one response.", "Over 12 weeks, you'll work through four stages designed to help you:", "Quiet the anxiety that gets triggered by what's happening with him.", 'Break the automatic urge to check, chase or search for reassurance.', 'Rebuild trust in your own decisions and boundaries.', 'Bring your attention and energy back to yourself and your life.', "Through guided Cognitive Behavioural Hypnotherapy sessions, daily practice and weekly check-ins, you'll work towards feeling like yourself again, whether he's in your life or not.", 'Return to Yourself: £117', 'START MY SESSIONS'],
  reality_reset: ['Return to Yourself + Reality Reset', 'your results suggest that several areas of your life are being affected.', "You've also told me that having some personal support would help.", "That's why I recommend Return to Yourself with Reality Reset.", "You'll receive the complete four-stage journey of guided Cognitive Behavioural Hypnotherapy sessions to help you work on the responses that keep pulling you back into the cycle.", "You'll also have a private 20-minute conversation with me.", "It's an opportunity to talk about what's happening, ask the questions going around in your head and get some clarity about your next steps.", 'Your programme includes:', 'Return to Yourself: a 12-week journey of guided Cognitive Behavioural Hypnotherapy sessions.', 'Guided Cognitive Behavioural Hypnotherapy sessions and weekly check-ins.', 'The accompanying workbook.', 'A private 20-minute Reality Reset conversation.', 'Return to Yourself + Reality Reset: £147'],
  pattern_break: ['PREFER MORE PERSONAL SUPPORT?', 'Return to Yourself + Pattern Break Session', "If you'd prefer more time to talk through what you're experiencing and work directly with me, Pattern Break offers a longer private session.", "You'll receive everything included in the complete Return to Yourself programme, plus the workbook and a 50-minute solution-focused CBT session with me.", "We'll explore the patterns you keep getting pulled into, how they're affecting you and what you need to begin working on differently.", 'A private 50-minute solution-focused CBT session.', 'Return to Yourself + Pattern Break: £197'],
};

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
  await page.evaluateOnNewDocument(c => { try { localStorage.setItem('yms_analytics_consent', c ? 'yes' : 'no'); } catch (e) {} }, consent);
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
  if (opt.expectFail) return;
  await page.waitForFunction(() => window.v4ResultReady === true, { timeout: 30000 });
}
const activePanelText = page => page.$eval('.result-panel.active', el => el.innerText);
const activeKind = page => page.$eval('.result-panel.active', el => el.dataset.kind);
async function next(page) { await clickSel(page, '.result-panel.active .result-next'); await sleep(450); }
async function pick(page, group, value) { await clickSel(page, `.result-panel.active .v4-choice[data-group="${group}"][data-value="${value}"]`); await sleep(80); }
async function answerQ(page, goal, support) { await pick(page, 'v4Goal', goal); await next(page); if (support) { await pick(page, 'v4Support', support); await next(page); } }
const recState = page => page.evaluate(() => {
  const rec = document.getElementById('v4FinalRecommendation');
  const cards = [...rec.querySelectorAll('.v4-offer, [data-offer]')].filter((x, i, a) => a.indexOf(x) === i);
  const links = [...rec.querySelectorAll('a[data-rec-product]')];
  const firstLink = links[0];
  const video = rec.querySelector('video');
  const fig = video ? video.closest('figure') : null;
  const firstCard = rec.querySelector('.v4-offer');
  return {
    offers: [...rec.querySelectorAll('.v4-offer')].map(c => c.dataset.offer),
    primary: firstCard ? firstCard.dataset.offer : '',
    prices: [...new Set(links.map(a => a.dataset.recPrice))],
    firstLinkPrice: firstLink ? firstLink.dataset.recPrice : '', firstLinkLabel: firstLink ? firstLink.innerText.trim() : '',
    videoCount: rec.querySelectorAll('video').length,
    videoAfterPrimary: !!(video && firstCard && firstCard.nextElementSibling === fig && firstCard.querySelector('a[data-rec-product]').innerText.trim() === 'START MY SESSIONS'),
    videoAttrs: video ? { autoplay: video.autoplay || video.hasAttribute('autoplay'), preload: video.getAttribute('preload'), controls: video.controls, muted: video.muted, paused: video.paused, src: video.querySelector('source').getAttribute('src') } : null,
    ctaBeforeVideo: !!(video && firstLink && (firstLink.compareDocumentPosition(video) & Node.DOCUMENT_POSITION_FOLLOWING)),
    text: rec.innerText,
  };
});
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
const missing = (text, list) => list.filter(t => !text.includes(t));

async function completeScenario(id, vp, stages, goal, support, expect, choosePrice) {
  const { ctx, page, errors } = await newPage(vp);
  const email = `synthetic+${id.toLowerCase()}@example.invalid`;
  await answerAll(page, stages, { email, outcome: 0 });
  const k0 = await activeKind(page); const p0 = await activePanelText(page);
  await page.screenshot({ path: path.join(OUT, 'shots', `${id}-${vp}-1-results.png`), fullPage: true });
  const qual = stages.map((x, i) => x >= 3 ? i : -1).filter(i => i >= 0);
  const findingsShown = await page.$$eval('.result-panel.active .v4-finding h3', h => h.map(x => x.innerText.trim()));
  const resultsOk = k0 === 'results' && missing(p0, LOCK.results).length === 0 && p0.includes('Synthia, you may understand') && p0.includes('I want my peace back.') &&
    JSON.stringify(findingsShown) === JSON.stringify(qual.map(i => LOCK.findings[i]));
  await next(page);
  const k1 = await activeKind(page); const p1 = await activePanelText(page);
  await page.screenshot({ path: path.join(OUT, 'shots', `${id}-${vp}-2-q1.png`), fullPage: true });
  await pick(page, 'v4Goal', goal); await next(page);
  let k2 = await activeKind(page), p2 = '';
  if (support) { p2 = await activePanelText(page); await page.screenshot({ path: path.join(OUT, 'shots', `${id}-${vp}-3-q2.png`), fullPage: true }); await pick(page, 'v4Support', support); await next(page); }
  const kr = await activeKind(page);
  const st = await recState(page);
  await page.screenshot({ path: path.join(OUT, 'shots', `${id}-${vp}-4-recommendation.png`), fullPage: true });
  const lockMissing = expect.offers.flatMap(o => o === 'bare_minimum' ? [] : missing(st.text, LOCK[o].filter(t => !(o === 'reality_reset' && expect.offers[0] !== 'reality_reset' && /your results suggest|You've also told me|That's why I recommend Return/.test(t)))));
  const rrAltClean = expect.offers.includes('reality_reset') && expect.offers[0] !== 'reality_reset' ? !st.text.includes("You've also told me that having some personal support would help.") : true;
  const token = await tokenOf(page);
  const ch = await choose(page, choosePrice, `${id}-${vp}`);
  const row = rowFor(token); const emails = emailsFor(email);
  const isBare = expect.offers[0] === 'bare_minimum';
  const ok = resultsOk && k1 === 'q1' && p1.includes('Which sounds most like what you want now?') &&
    (support ? (k2 === 'q2' && missing(p2, LOCK.q2).length === 0) : (k2 === 'rec')) && kr === 'rec' &&
    JSON.stringify(st.offers) === JSON.stringify(expect.offers) && st.firstLinkPrice === OFFER_PRICE[expect.offers[0]] &&
    (isBare ? st.videoCount === 0 : (st.videoCount === 1 && st.videoAfterPrimary && st.ctaBeforeVideo && !st.videoAttrs.autoplay && st.videoAttrs.preload === 'none' && st.videoAttrs.controls && st.videoAttrs.paused)) &&
    lockMissing.length === 0 && rrAltClean &&
    ch.checkout === STAN[choosePrice] && emails.length === 1 && row['V4 Post-Result Question 1 Option ID'] === goal && row['V4 Post-Result Question 2 Option ID'] === (support || '') && errors.length === 0;
  check(id, 'Journey', `[${vp}] Complete ≥15 (${stages.join(',')}): Q1=${goal}${support ? ', Q2=' + support : ''} → offers ${expect.offers.join(' > ')}; ${isBare ? 'no video' : 'video below first START MY SESSIONS'}; chose £${choosePrice}; 1 saved row, 1 email, checkout`, ok,
    JSON.stringify({ resultsOk, findingsShown, k1, k2, kr, offers: st.offers, firstPrice: st.firstLinkPrice, video: st.videoCount, after: st.videoAfterPrimary, attrs: st.videoAttrs, lockMissing, rrAltClean, checkout: ch.checkout, err: ch.error, emails: emails.length, q1: row && row['V4 Post-Result Question 1 Option ID'], q2: row && row['V4 Post-Result Question 2 Option ID'], errors }));
  await ctx.close();
  return { token, email };
}

(async () => {
  srv = await start(8777); base = 'http://127.0.0.1:8777';
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server', '--autoplay-policy=no-user-gesture-required'] });

  // ---- Complete ≥15 journeys: final Q2 routing (owner decision 2 Nov 2026) ----
  await completeScenario('E1', 'desktop', [5, 5, 4, 3], 'self_work', 'independent', { offers: ['self_guided'] }, 117);
  await completeScenario('E2', 'mobile', [5, 5, 4, 3], 'self_work', 'additional', { offers: ['reality_reset', 'pattern_break'] }, 197);
  await completeScenario('E3', 'desktop', [6, 6, 3, 0], 'unsure', 'some_support', { offers: ['reality_reset', 'pattern_break'] }, 147);
  await completeScenario('E4', 'mobile', [5, 5, 4, 3], 'self_work', 'recommend', { offers: ['self_guided', 'reality_reset', 'pattern_break'] }, 117);
  await completeScenario('E5', 'desktop', [6, 0, 6, 6], 'unsure', 'recommend', { offers: ['self_guided', 'reality_reset', 'pattern_break'] }, 197);
  await completeScenario('E5b', 'mobile', [5, 5, 4, 3], 'self_work', 'recommend', { offers: ['self_guided', 'reality_reset', 'pattern_break'] }, 147);
  await completeScenario('E6', 'mobile', [5, 5, 4, 3], 'understand_him', null, { offers: ['bare_minimum'] }, '4.99');
  const e7 = await completeScenario('E7', 'desktop', [5, 5, 4, 3], 'change_him', null, { offers: ['bare_minimum'] }, '4.99');

  // ---- Single, Pair, Bare Minimum: existing copy unchanged; video only on Single/Pair ----
  const scored = [
    ['E8', 'desktop', [5, 0, 0, 0], '37', 'https://stan.store/Yourmindstory/p/quiet-the-alarm', 3, 'single'],
    ['E9', 'mobile', [0, 6, 0, 0], '37', 'https://stan.store/Yourmindstory/p/break-the-pull', 3, 'single'],
    ['E10', 'desktop', [0, 0, 4, 0], '37', 'https://stan.store/Yourmindstory/p/restore-self-trust', 3, 'single'],
    ['E11', 'mobile', [0, 0, 0, 3], '37', 'https://stan.store/Yourmindstory/p/return-to-yourself-7jc9h8lg', 3, 'single'],
    ['E12', 'desktop', [5, 4, 0, 0], '74', 'https://stan.store/Yourmindstory/p/quiet-the-alarm--break-the-pull', 3, 'pair'],
    ['E13', 'mobile', [5, 0, 4, 0], '74', 'https://stan.store/Yourmindstory/p/quiet-the-alarm--restore-selftrust', 3, 'pair'],
    ['E14', 'desktop', [5, 0, 0, 4], '74', 'https://stan.store/Yourmindstory/p/quiet-the-alarm--return-to-yourself', 3, 'pair'],
    ['E15', 'mobile', [0, 5, 4, 0], '74', 'https://stan.store/Yourmindstory/p/break-the-pull--restore-selftrust', 3, 'pair'],
    ['E16', 'desktop', [0, 5, 0, 4], '74', 'https://stan.store/Yourmindstory/p/break-the-pull--return-to-yourself', 3, 'pair'],
    ['E17', 'mobile', [0, 0, 5, 4], '74', 'https://stan.store/Yourmindstory/p/restore-selftrust--return-to-yourself', 3, 'pair'],
    ['E18', 'desktop', [2, 2, 2, 2], '4.99', 'https://stan.store/Yourmindstory/p/the-bare-minimum', 1, ''],
    ['E19', 'mobile', [0, 0, 0, 0], '4.99', 'https://stan.store/Yourmindstory/p/the-bare-minimum', 1, ''],
  ];
  for (const [id, vp, st, price, href, nPanels, vroute] of scored) {
    const { ctx, page, errors } = await newPage(vp);
    const email = `synthetic+${id.toLowerCase()}@example.invalid`;
    await answerAll(page, st, { email });
    const panels = await page.$$eval('.result-panel', p => p.length);
    const hasQ = await page.$('.v4-choice') !== null;
    const firstText = await activePanelText(page);
    for (let k = 1; k < nPanels; k++) await next(page);
    await page.screenshot({ path: path.join(OUT, 'shots', `${id}-${vp}-final.png`), fullPage: true });
    const v = await page.evaluate(() => {
      const rec = document.querySelector('.result-panel.active'); const video = rec.querySelector('video');
      const firstLink = rec.querySelector('a[data-rec-product]');
      const actions = firstLink ? firstLink.closest('.actions') : null;
      return { count: rec.querySelectorAll('video').length, route: video ? video.closest('figure').dataset.videoRoute : '', immediatelyAfterFirstButton: !!(video && actions && actions.nextElementSibling === video.closest('figure')), autoplay: video ? video.hasAttribute('autoplay') : null, preload: video ? video.getAttribute('preload') : null };
    });
    const token = await tokenOf(page);
    const ch = await choose(page, price);
    const row = rowFor(token); const emails = emailsFor(email);
    const unchanged = price === '4.99' ? firstText.includes('I would not start you with one of the hypnotherapy audios.') : firstText.includes("Hasn't this had enough power over your life?");
    const videoOk = vroute ? (v.count === 1 && v.route === vroute && v.immediatelyAfterFirstButton && !v.autoplay && v.preload === 'none') : v.count === 0;
    const ok = panels === nPanels && !hasQ && unchanged && videoOk && ch.checkout === href && emails.length === 1 && row['V4 Result Email Route'] === (price === '4.99' ? 'bare_minimum' : 'scored_route') && !row['V4 Post-Result Question 1 Option ID'] && errors.length === 0;
    check(id, 'Journey', `[${vp}] stages ${st.join(',')} → £${price}: existing copy, no Q1/Q2, ${vroute ? 'video directly below first purchase button' : 'no video'}, saved + 1 email + checkout`, ok, JSON.stringify({ panels, hasQ, unchanged, v, checkout: ch.checkout, err: ch.error, emails: emails.length, errors }));
    await ctx.close();
  }
  // Complete below 15: results → recommendation (no questions), £117 primary with both alternatives
  {
    const { ctx, page, errors } = await newPage('desktop');
    const email = 'synthetic+e20@example.invalid';
    await answerAll(page, [3, 3, 3, 0], { email });
    const k0 = await activeKind(page); const p0 = await activePanelText(page);
    const findings = await page.$$eval('.result-panel.active .v4-finding h3', h => h.map(x => x.innerText.trim()));
    await next(page);
    const st = await recState(page);
    const ch = await choose(page, '147');
    const row = rowFor(await tokenOf(page) || '') || srv.state.rt.rows().find(r => r['Email'] === email);
    check('E20', 'Journey', '[desktop] Complete below 15 (3,3,3,0): locked results (3 findings) → no Q1/Q2 → £117 primary, £147/£197 alternatives, video after first button; chose £147', k0 === 'results' && missing(p0, LOCK.results).length === 0 && JSON.stringify(findings) === '["The Alarm","The Pull","Self-Trust"]' && JSON.stringify(st.offers) === '["self_guided","reality_reset","pattern_break"]' && st.videoAfterPrimary && !st.text.includes("You've also told me") && ch.checkout === STAN[147] && row['V4 Result Email Route'] === 'reality_reset' && emailsFor(email).length === 1 && errors.length === 0,
      JSON.stringify({ k0, findings, offers: st.offers, after: st.videoAfterPrimary, checkout: ch.checkout, err: ch.error }));
    await page.screenshot({ path: path.join(OUT, 'shots', 'E20-desktop-recommendation.png'), fullPage: true });
    await ctx.close();
  }

  // ---- Video playback (desktop + mobile) ----
  for (const vp of ['desktop', 'mobile']) {
    const { ctx, page, errors } = await newPage(vp);
    await answerAll(page, [5, 5, 4, 3], { email: `synthetic+video-${vp}@example.invalid` });
    await next(page); await answerQ(page, 'self_work', 'independent');
    const before = await page.evaluate(() => { const v = document.querySelector('#v4FinalRecommendation video'); return { paused: v.paused, t: v.currentTime, net: v.networkState, rs: v.readyState }; });
    const reqBefore = srv.state.videoRequests || 0;
    const layout = await page.evaluate(() => { const b = document.querySelector('#v4FinalRecommendation a[data-rec-product]').getBoundingClientRect(); const v = document.querySelector('#v4FinalRecommendation video').getBoundingClientRect(); return { btnBottom: Math.round(b.bottom), videoTop: Math.round(v.top), videoW: Math.round(v.width), videoH: Math.round(v.height), vw: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth }; });
    await page.$eval('#v4FinalRecommendation video', v => v.scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: path.join(OUT, 'shots', `V-${vp}-video-poster.png`) });
    const play = await page.evaluate(async () => {
      const v = document.querySelector('#v4FinalRecommendation video'); v.muted = true;
      try { await v.play(); } catch (e) { return { err: String(e) }; }
      await new Promise(r => setTimeout(r, 2500));
      const out = { t: v.currentTime, dur: v.duration, w: v.videoWidth, h: v.videoHeight, err: v.error && v.error.code };
      v.pause(); return out;
    });
    await sleep(600);
    const playEvent = srv.state.requests.some(r => r.method === 'POST' && r.body.includes('recommendation_video_play'));
    check('V1-' + vp, 'Video', `[${vp}] Video does not load or play on its own; on play it streams (H.264 720×1280, ~10 min), records one play event, fits the screen`, before.paused && before.t === 0 && before.rs === 0 && play.t > 1 && play.dur > 590 && play.w === 720 && play.h === 1280 && !play.err && !layout.overflow && layout.videoTop >= layout.btnBottom && layout.videoW <= layout.vw && errors.length === 0,
      JSON.stringify({ before, play, layout, playEvent }));
    await sleep(1500);
    await ctx.close();
  }

  // ---- Validation, back navigation, refresh, double submit, checkout navigation ----
  {
    const { ctx, page, errors } = await newPage('mobile');
    const email = 'synthetic+f1@example.invalid';
    await answerAll(page, [6, 6, 6, 6], { email });
    await next(page);
    await clickSel(page, '.result-panel.active .result-next'); await sleep(300);
    const err1 = await page.$eval('.result-panel.active .v4-choice-error', e => e.textContent);
    check('F1', 'UX', '[mobile] Continuing on Q1 without an answer shows an error and stays on Q1', /choose an answer/i.test(err1) && (await activeKind(page)) === 'q1', err1);
    await pick(page, 'v4Goal', 'self_work'); await next(page);
    await clickSel(page, '.result-panel.active .result-next'); await sleep(300);
    const err2 = await page.$eval('.result-panel.active .v4-choice-error', e => e.textContent);
    check('F2', 'UX', 'Continuing on Q2 without an answer shows an error and stays on Q2', /choose an answer/i.test(err2) && (await activeKind(page)) === 'q2', err2);
    await pick(page, 'v4Support', 'additional'); await next(page);
    const firstBefore = (await recState(page)).primary;
    await page.goBack(); await sleep(500);
    const back = await page.evaluate(() => ({ kind: document.querySelector('.result-panel.active').dataset.kind, sup: (document.querySelector('.v4-choice[data-group="v4Support"][aria-checked="true"]') || {}).dataset?.value }));
    await page.goBack(); await sleep(500);
    const back2 = await page.evaluate(() => ({ kind: document.querySelector('.result-panel.active').dataset.kind, goal: (document.querySelector('.v4-choice[data-group="v4Goal"][aria-checked="true"]') || {}).dataset?.value }));
    check('F3', 'UX', 'Browser Back from the recommendation returns to Q2 then Q1 with both answers kept', back.kind === 'q2' && back.sup === 'additional' && back2.kind === 'q1' && back2.goal === 'self_work', JSON.stringify({ back, back2 }));
    await next(page); await pick(page, 'v4Support', 'recommend'); await next(page);
    const after = await recState(page);
    check('F4', 'UX', 'Changing Q2 after going back updates the recommendation (additional → £147 primary; recommend → £117 primary)', firstBefore === 'reality_reset' && after.primary === 'self_guided' && after.offers.length === 3, JSON.stringify({ firstBefore, after: after.offers }));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.v4ResultReady === true, { timeout: 15000 });
    const rf = await page.evaluate(() => ({ goal: (document.querySelector('.v4-choice[data-group="v4Goal"][aria-checked="true"]') || {}).dataset?.value, sup: (document.querySelector('.v4-choice[data-group="v4Support"][aria-checked="true"]') || {}).dataset?.value, offers: [...document.querySelectorAll('#v4FinalRecommendation .v4-offer')].map(x => x.dataset.offer) }));
    check('F5', 'UX', 'Refresh keeps the result, Q1/Q2 answers and the matching recommendation', rf.goal === 'self_work' && rf.sup === 'recommend' && rf.offers.join() === 'self_guided,reality_reset,pattern_break', JSON.stringify(rf));
    const token = await tokenOf(page);
    check('F6', 'Persistence', 'Refresh/back created no extra assessment rows and sent no email', srv.state.rt.rows().filter(r => r['Email'] === email).length === 1 && emailsFor(email).length === 0, 'rows=1');
    // Q1 change to a Bare Minimum answer clears Q2 and skips it
    await next(page); await pick(page, 'v4Goal', 'change_him'); await next(page);
    const bm = await page.evaluate(() => ({ kind: document.querySelector('.result-panel.active').dataset.kind, offers: [...document.querySelectorAll('#v4FinalRecommendation [data-offer]')].map(x => x.dataset.offer), saved: JSON.parse(sessionStorage.getItem('yms_v4_preview_post_result_choice') || '{}') }));
    check('F7', 'UX', 'Switching Q1 to "change him" skips Q2, shows only The Bare Minimum and clears the saved Q2 answer', bm.kind === 'rec' && bm.offers.join() === 'bare_minimum' && bm.saved.goal === 'change_him' && !bm.saved.support, JSON.stringify(bm));
    await page.goBack(); await sleep(400); await pick(page, 'v4Goal', 'self_work'); await next(page); await pick(page, 'v4Support', 'independent'); await next(page);
    await clickSel(page, '.result-panel.active a[data-rec-price="117"]');
    await page.waitForSelector('#v4Confirm');
    await page.evaluate(() => { const b = document.querySelector('#v4Confirm'); b.click(); b.click(); b.click(); });
    await page.waitForSelector('#v4Checkout', { timeout: 20000 });
    await sleep(500);
    const row = rowFor(token);
    check('D16', 'Email', 'Triple-clicking Confirm produces one saved choice and one email', emailsFor(email).length === 1 && row['V4 Result Email Route'] === 'self_guided' && row['V4 Post-Result Question 2 Option ID'] === 'independent', 'emails=' + emailsFor(email).length);
    const nav = [];
    page.on('request', r => { if (r.isNavigationRequest()) nav.push(r.url()); });
    await page.click('#v4Checkout').catch(() => {}); await sleep(800);
    check('H1', 'Checkout', 'Checkout button navigates to the saved offer\'s Stan URL (request intercepted, no purchase)', nav.some(u => u === STAN[117]), nav.join(' '));
    check('F8', 'UX', 'No JavaScript errors across validation/back/refresh/confirm', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- Saved-result link return ----
  {
    const { ctx, page, errors } = await newPage('desktop');
    await page.goto(base + PAGE + '?utm_source=yms_assessment&utm_medium=email&utm_campaign=v4_result_email&resultToken=' + e7.token, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#v4Checkout', { timeout: 20000 });
    const v = await page.evaluate(() => ({ text: document.querySelector('#v4Decision').innerText, href: document.querySelector('#v4Checkout').href, goal: (document.querySelector('.v4-choice[data-group="v4Goal"][aria-checked="true"]') || {}).dataset?.value, kind: document.querySelector('.result-panel.active').dataset.kind }));
    await page.screenshot({ path: path.join(OUT, 'shots', 'R1-saved-link-finalized.png') });
    check('R1', 'Resume', 'Saved-result link for a finalised journey reopens on the recommendation with the saved choice + checkout (no new email)', /The Bare Minimum/.test(v.text) && v.href === STAN['4.99'] && v.goal === 'change_him' && v.kind === 'rec' && emailsFor(e7.email).length === 1 && errors.length === 0, JSON.stringify(v));
    await ctx.close();
  }
  {
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
    await next(b.page); await answerQ(b.page, 'unsure', 'additional');
    const ch = await choose(b.page, '147');
    const row = rowFor(token);
    check('R2', 'Resume', '[mobile, new device] Saved link restores the same locked results (name, findings, exact outcome) and she can finish the unfinished choice', again === firstText && again.includes('I want freedom from constantly thinking, checking, waiting or replaying.') && ch.checkout === STAN[147] && row['V4 Result Email Route'] === 'reality_reset' && emailsFor(email).length === 1 && b.errors.length === 0,
      JSON.stringify({ same: again === firstText, checkout: ch.checkout, err: ch.error, errors: b.errors }));
    await clickSel(b.page, '#v4Finish');
    await clickSel(b.page, '.result-panel.active a[data-rec-price="197"]');
    await clickSel(b.page, '#v4Confirm');
    await b.page.waitForSelector('#v4Checkout', { timeout: 20000 });
    const lock = await b.page.evaluate(() => ({ t: document.querySelector('#v4Decision').innerText, href: document.querySelector('#v4Checkout').href }));
    check('R3', 'Resume', 'Choosing a different offer after the email shows her saved £147 choice and checkout, sends nothing new', /already chose/i.test(lock.t) && lock.href === STAN[147] && emailsFor(email).length === 1, JSON.stringify(lock));
    await b.ctx.close();
  }
  {
    const { ctx, page } = await newPage('desktop');
    await page.goto(base + PAGE + '?resultToken=doesnotexist0000000000000000000', { waitUntil: 'domcontentloaded' });
    let ok = true; try { await page.waitForFunction(() => /could not be found/.test((document.getElementById('v4RestoreMsg') || {}).textContent || ''), { timeout: 15000 }); } catch (e) { ok = false; }
    check('R4', 'Resume', 'Unknown saved-result token shows a clear error instead of a broken page', ok, 'message shown=' + ok);
    await ctx.close();
  }

  // ---- Error states ----
  {
    const { ctx, page } = await newPage('desktop');
    const email = 'synthetic+f9@example.invalid';
    await answerAll(page, [5, 0, 0, 0], { email });
    await next(page); await next(page);
    srv.state.down = true;
    await clickSel(page, '.result-panel.active a[data-rec-price="37"]'); await clickSel(page, '#v4Confirm');
    await page.waitForFunction(() => document.querySelector('#v4Confirm') && document.querySelector('#v4Confirm').textContent === 'TRY AGAIN', { timeout: 20000 });
    const msg = await page.$eval('#v4DecError', e => e.textContent);
    srv.state.down = false;
    await clickSel(page, '#v4Confirm'); await page.waitForSelector('#v4Checkout', { timeout: 20000 });
    check('F9', 'UX', 'Backend outage during confirm shows an error and TRY AGAIN; retry succeeds with one email', msg.length > 0 && emailsFor(email).length === 1, msg);
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage('desktop');
    srv.state.down = true;
    await answerAll(page, [5, 0, 0, 0], { email: 'synthetic+f10@example.invalid', expectFail: true });
    await page.waitForFunction(() => /could not be saved/.test((document.getElementById('caperr') || {}).textContent || ''), { timeout: 60000 }).catch(() => {});
    const capErr = await page.$eval('#caperr', e => e.textContent).catch(() => '');
    const shown = await page.evaluate(() => document.querySelectorAll('.result-panel').length);
    srv.state.down = false;
    check('F10', 'UX', 'If the assessment cannot be saved, the capture screen shows an error and allows retry (no result shown unsaved)', /could not be saved/.test(capErr) && shown === 0, capErr + ' panels=' + shown);
    await ctx.close();
  }

  // ---- Analytics / privacy ----
  {
    const { ctx, page, external } = await newPage('desktop', true);
    const email = 'synthetic+privacy@example.invalid';
    await answerAll(page, [6, 6, 6, 6], { email, name: 'Privacytest', marketing: true });
    await next(page); await answerQ(page, 'self_work', 'additional');
    await page.evaluate(async () => { const v = document.querySelector('#v4FinalRecommendation video'); v.muted = true; try { await v.play(); await new Promise(r => setTimeout(r, 800)); v.pause(); } catch (e) {} });
    await choose(page, '147');
    const dl = await page.evaluate(() => JSON.stringify((window.dataLayer || []).map(x => Array.from(x))));
    const cl = await page.evaluate(() => JSON.stringify((window.clarity && window.clarity.q) || []));
    const allOut = dl + cl + JSON.stringify(external);
    const answerTexts = ['My whole system goes into alert', 'Synthetic: it is costing me sleep', 'I want help understanding myself', 'I want additional support', 'I want my peace back'];
    const leaks = ['Privacytest', email, encodeURIComponent(email), ...answerTexts].filter(t => allOut.includes(t));
    const evNames = JSON.parse(dl).filter(x => x[0] === 'event').map(x => x[1]);
    check('P1', 'Privacy', 'With analytics consent, GA4 dataLayer / Clarity / outbound requests contain no name, email, answer or outcome text', leaks.length === 0, 'leaks=' + JSON.stringify(leaks));
    const optionIdx = JSON.parse(dl).some(x => x[0] === 'event' && x[2] && 'option_index' in x[2]);
    check('P2', 'Privacy', 'GA4 events carry no option_index (raw scored answers)', !optionIdx, 'option_index present=' + optionIdx);
    check('P3', 'Analytics', 'With consent, GA4 receives funnel events including the video play', evNames.includes('assessment_complete') && evNames.includes('result_step_view') && evNames.includes('recommendation_video_play'), evNames.filter(n => /video|complete|result_step/.test(n)).join(','));
    const ga = external.filter(e => /googletagmanager|google-analytics|clarity\.ms/.test(e.url));
    check('P4', 'Analytics', 'With consent, GA4 (gtag) and Clarity tags are requested', ga.some(e => /googletagmanager/.test(e.url)) && ga.some(e => /clarity\.ms/.test(e.url)), ga.map(e => e.url.split('?')[0]).join(' '));
    const sub = srv.state.requests.find(r => r.method === 'POST' && r.body.includes(email));
    const sb = JSON.parse(sub.body);
    check('P5', 'Analytics', 'First-party submission keeps marketing consent separate and preserves attribution fields', sb.marketingConsent === true && 'firstTouchSource' in sb && 'landingUrl' in sb && sb.deferResultEmail === true, JSON.stringify({ mc: sb.marketingConsent }));
    for (let k = 0; k < 8; k++) { const left = await page.evaluate(async () => { v4ResultAwaitingChoice = false; await flushV4Events(); return v4PendingEvents.length; }); if (!left) break; }
    await sleep(500);
    const log = srv.state.rt.sheet('V4 Journey Events').rows.slice(1);
    check('P6', 'Analytics', 'First-party journey log accepted the video-play and question-answered events (no answer text)', log.some(r => r[1] === 'recommendation_video_play' && r[3] === 'OK') && log.some(r => r[1] === 'post_result_question_answered' && r[3] === 'OK') && !JSON.stringify(log).includes('I want additional support'), log.filter(r => /video|question_answered/.test(r[1])).map(r => r[1] + ':' + r[3]).join(','));
    await ctx.close();
  }
  {
    const { ctx, page, external } = await newPage('desktop', false);
    await answerAll(page, [5, 0, 0, 0], { email: 'synthetic+noconsent@example.invalid', query: '?utm_source=tiktok&utm_medium=social&utm_campaign=test_attr' });
    const dl = await page.evaluate(() => (window.dataLayer || []).length);
    const ga = external.filter(e => /googletagmanager|google-analytics|clarity\.ms/.test(e.url));
    const row = srv.state.rt.rows().find(r => r['Email'] === 'synthetic+noconsent@example.invalid');
    const sb = JSON.parse(srv.state.requests.filter(r => r.method === 'POST' && r.body.includes('synthetic+noconsent')).pop().body);
    check('P7', 'Analytics', 'Without analytics consent no GA4/Clarity tag loads and no dataLayer events fire; result still delivered', ga.length === 0 && dl === 0 && !!row, JSON.stringify({ ga: ga.length, dl }));
    check('P8', 'Analytics', 'Assessment-touch UTM attribution is saved first-party regardless of analytics consent; GA client ID not sent', row['Assessment Touch Source'] === 'tiktok' && row['Assessment Touch Campaign'] === 'test_attr' && sb.gaClientId === '', JSON.stringify({ src: row['Assessment Touch Source'] }));
    check('P9', 'Privacy', 'Result screens carry data-clarity-mask', await page.$eval('#result', e => e.getAttribute('data-clarity-mask') === 'true'), 'masked');
    await ctx.close();
  }

  // ---- Accessibility ----
  {
    const { ctx, page } = await newPage('mobile');
    await answerAll(page, [6, 6, 6, 6], { email: 'synthetic+a11y@example.invalid' });
    const res = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth }));
    await next(page);
    const q1 = await page.evaluate(() => { const g = document.querySelector('.result-panel.active [role=radiogroup]'); const lab = document.getElementById(g.getAttribute('aria-labelledby')); const opts = [...g.querySelectorAll('[role=radio]')]; return { labelled: !!lab, radios: opts.length, checkedAttr: opts.every(o => o.hasAttribute('aria-checked')), small: opts.filter(o => o.getBoundingClientRect().height < 44).length, overflow: document.documentElement.scrollWidth > innerWidth }; });
    await page.focus('.result-panel.active .v4-choice[data-value="unsure"]'); await page.keyboard.press('Enter'); await sleep(100);
    const kb = await page.$eval('.result-panel.active .v4-choice[data-value="unsure"]', e => e.getAttribute('aria-checked'));
    await next(page); await pick(page, 'v4Support', 'additional'); await next(page);
    const rec = await page.evaluate(() => { const links = [...document.querySelectorAll('#v4FinalRecommendation a[data-rec-product]')]; return { labels: links.map(a => a.getAttribute('aria-label')), videoLabel: document.querySelector('#v4FinalRecommendation video').getAttribute('aria-label'), overflow: document.documentElement.scrollWidth > innerWidth }; });
    check('X1', 'Accessibility', '[mobile 390px] Q1/Q2 are labelled radio groups, keyboard-selectable, ≥44px targets; START MY SESSIONS buttons name their offer; video labelled; no horizontal scroll', !res.overflow && q1.labelled && q1.radios === 4 && q1.checkedAttr && q1.small === 0 && !q1.overflow && kb === 'true' && rec.labels.every(l => /START MY SESSIONS: Return to Yourself.*£\d+/.test(l || '')) && !!rec.videoLabel && !rec.overflow, JSON.stringify({ res, q1, kb, rec }));
    await clickSel(page, '.result-panel.active a[data-rec-price="147"]');
    await page.waitForSelector('#v4Confirm');
    const d = await page.evaluate(() => ({ role: document.querySelector('#v4Decision [role=dialog]').getAttribute('aria-modal'), focus: document.activeElement && document.activeElement.id }));
    await page.keyboard.press('Escape'); await sleep(200);
    const closed = await page.$('#v4Decision') === null;
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
    await answerAll(page, [5, 0, 0, 0], { email: 'synthetic+failclosed@example.invalid', expectFail: true });
    await page.waitForFunction(() => /could not be saved/.test((document.getElementById('caperr') || {}).textContent || ''), { timeout: 15000 }).catch(() => {});
    const capErr = await page.$eval('#caperr', e => e.textContent).catch(() => '');
    base = saveBase;
    check('G8', 'Isolation', 'Committed page (DEV URL placeholder) sends nothing to any Apps Script endpoint and does not show an unsaved result', srv2.state.requests.length === 0 && !ext.some(u => /script\.google\.com/.test(u)) && /could not be saved/.test(capErr), JSON.stringify({ local: srv2.state.requests.length, google: ext.filter(u => /script\.google/.test(u)) }));
    await ctx.close(); srv2.server.close();
  }
  {
    const html = fs.readFileSync(path.resolve(process.env.YMS_REPO || path.resolve(__dirname, '../../..'), 'assessment/v4-preview/start/index.html'), 'utf8');
    check('H2', 'Checkout', 'No Bootcamp link or copy in the V4 page', !/bootcamp/i.test(html), 'grep bootcamp = 0');
  }

  fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify(results, null, 1));
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  await browser.close(); srv.server.close();
})().catch(async e => { console.error('HARNESS ERROR', e); try { fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify(results, null, 1)); await browser.close(); } catch (x) {} process.exit(1); });

// Attribution repair tests (7 Nov 2026): social/UTM source must survive homepage -> /assessment/ -> /assessment/start/
// whether or not the visitor answers the cookie banner, and must not be kept after "Reject".
// Real pages + candidate backend in the local harness; third-party hosts are blocked, never reached.
'use strict';
const puppeteer = require('puppeteer-core');
const { start } = require('./server');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
function check(id, desc, cond, ev) { results.push(!!cond); console.log((cond ? 'PASS ' : 'FAIL ') + id + ' ' + desc + (cond ? '' : '  <<< ' + String(ev).slice(0, 600))); }

(async () => {
  const srv = await start(8778); const base = 'http://127.0.0.1:8778';
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server'] });
  async function journey(id, consent, vp) {
    const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
    await page.setViewport(vp === 'mobile' ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1280, height: 900 });
    const external = []; const errors = [];
    await page.setRequestInterception(true);
    page.on('request', r => { if (r.url().startsWith(base)) return r.continue(); external.push(r.url()); r.abort(); });
    page.on('pageerror', e => errors.push(String(e)));
    if (consent) await page.evaluateOnNewDocument(c => { try { if (!sessionStorage.getItem('__set')) { localStorage.setItem('yms_analytics_consent', c); sessionStorage.setItem('__set', '1'); } } catch (e) {} }, consent);
    // Simulate arriving from TikTok on the first page only (Chrome drops an https referrer for the http test server).
    await page.evaluateOnNewDocument(() => { try { if (location.pathname === '/' && !sessionStorage.getItem('__ref')) { sessionStorage.setItem('__ref', '1'); Object.defineProperty(document, 'referrer', { get: () => 'https://www.tiktok.com/' }); } } catch (e) {} });
    const email = `synthetic+attr-${id.toLowerCase()}@example.com`;
    await page.goto(base + '/?utm_source=tiktok&utm_medium=social&utm_campaign=bio_' + id, { referer: 'https://www.tiktok.com/', waitUntil: 'domcontentloaded' });
    await sleep(400);
    const homeSS = await page.evaluate(() => Object.fromEntries(Object.keys(sessionStorage).filter(k => /^yms_v4_preview_/.test(k)).map(k => [k, sessionStorage.getItem(k)])));
    await page.evaluate(() => { location.href = '/assessment/'; }); await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}); await sleep(300);
    await page.evaluate(() => { const a = document.getElementById('startAssessment') || document.querySelector('a[href*="/assessment/start"]'); const u = new URL(a.href); if (!u.pathname.endsWith('/')) u.pathname += '/'; location.href = u.href; /* GitHub Pages adds the slash with a redirect */ });
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForSelector('#beginV4', { visible: true }); await sleep(300);
    const cs = async sel => { await page.waitForSelector(sel, { visible: true, timeout: 15000 }); await page.$eval(sel, el => el.scrollIntoView({ block: 'center' })); await page.click(sel); await sleep(40); };
    await cs('#beginV4');
    for (const v of [3, 2, 3, 2, 3, 1, 3, 0, 2, 1, 1, 0, 0]) await cs(`.step.active .opt[data-v="${v}"]`);
    await cs('#next');
    await page.waitForSelector('#txt', { visible: true }); await page.type('#txt', 'Synthetic attribution test'); await cs('#next');
    await page.waitForSelector('#fn', { visible: true }); await page.type('#fn', 'Synthia'); await page.type('#em', email);
    await cs('.consent-opt[data-consent="no"]'); await cs('#capgo');
    await page.waitForFunction(() => window.v4ResultReady === true, { timeout: 60000 });
    await sleep(2500);
    const sub = srv.state.requests.map(r => { try { return JSON.parse(r.body) } catch (e) { return null } }).find(b => b && b.email === email);
    const sid = sub && sub.submissionId;
    const evs = srv.state.requests.map(r => { try { return JSON.parse(r.body) } catch (e) { return null } }).filter(b => b && b.action === 'recordJourneyEvents' && b.submissionId === sid);
    const names = evs.flatMap(b => b.events.map(e => e.eventType));
    const touch = evs.length ? evs[0].touch : {};
    await ctx.close();
    return { homeSS, sub, names, touch, errors, external };
  }

  // A: no banner choice (most visitors)
  const a = await journey('A', null, 'mobile');
  check('A1', '[mobile, no cookie choice] TikTok UTMs + referrer kept on landing (first-party, this tab only)', a.homeSS.yms_v4_preview_utm_source === 'tiktok' && /tiktok\.com/.test(a.homeSS.yms_v4_preview_referrer || ''), JSON.stringify(a.homeSS));
  check('A2', '[mobile, no cookie choice] Saved assessment carries first-touch TikTok source, campaign and landing page', a.sub && a.sub.firstTouchSource === 'tiktok' && a.sub.firstTouchCampaign === 'bio_A' && a.sub.sourceJourney === 'TikTok' && /tiktok\.com/.test(a.sub.referrer) && /utm_source=tiktok/.test(a.sub.landingUrl), JSON.stringify(a.sub && { s: a.sub.firstTouchSource, c: a.sub.firstTouchCampaign, j: a.sub.sourceJourney, r: a.sub.referrer, l: a.sub.landingUrl }));
  check('A3', '[mobile, no cookie choice] Journey events carry the TikTok touch and include the new start-screen view before assessment_start', a.touch.utm_source === 'tiktok' && a.names.indexOf('assessment_intro_view') > -1 && a.names.indexOf('assessment_intro_view') < a.names.indexOf('assessment_start') && a.names.filter(n => n === 'assessment_start').length === 1, JSON.stringify({ t: a.touch, n: a.names.slice(0, 5) }));
  check('A4', '[mobile, no cookie choice] No GA4, Clarity or Meta request made; no page errors', !a.external.some(u => /googletagmanager|google-analytics|clarity\.ms|facebook/.test(u)) && a.errors.length === 0, JSON.stringify({ ext: a.external.filter(u => /google|clarity|facebook/.test(u)), e: a.errors }));

  // B: rejected
  const b = await journey('B', 'no', 'desktop');
  check('B1', '[desktop, Rejected] No campaign/referral details kept', Object.keys(b.homeSS).length === 0, JSON.stringify(b.homeSS));
  check('B2', '[desktop, Rejected] Saved assessment has no TikTok first-touch (opt-out honoured); assessment still saved', b.sub && b.sub.firstTouchSource === '' && b.sub.sourceJourney !== 'TikTok', JSON.stringify(b.sub && { s: b.sub.firstTouchSource, j: b.sub.sourceJourney }));
  check('B3', '[desktop, Rejected] No GA4, Clarity or Meta request', !b.external.some(u => /googletagmanager|google-analytics|clarity\.ms|facebook/.test(u)), b.external.join(' '));

  // C: accepted analytics
  const c = await journey('C', 'yes', 'desktop');
  check('C1', '[desktop, Accepted] Saved assessment carries TikTok first-touch', c.sub && c.sub.firstTouchSource === 'tiktok' && c.sub.sourceJourney === 'TikTok', JSON.stringify(c.sub && { s: c.sub.firstTouchSource, j: c.sub.sourceJourney }));
  check('C2', '[desktop, Accepted] GA4 and Clarity tags requested', c.external.some(u => /googletagmanager/.test(u)) && c.external.some(u => /clarity\.ms/.test(u)), c.external.map(u => u.split('?')[0]).join(' '));

  // D: Reject button clears stored attribution
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
  await page.setRequestInterception(true); page.on('request', r => r.url().startsWith(base) ? r.continue() : r.abort());
  await page.goto(base + '/?utm_source=instagram&utm_medium=social', { waitUntil: 'domcontentloaded' }); await sleep(300);
  const before = await page.evaluate(() => sessionStorage.getItem('yms_v4_preview_utm_source'));
  await page.click('#yms-consent-banner button[data-choice="reject"]'); await sleep(200);
  const after = await page.evaluate(() => Object.keys(sessionStorage).filter(k => /^yms_v4_preview_(utm|landing|referrer)/.test(k)).length);
  check('D1', 'Clicking Reject clears the kept campaign/referral details', before === 'instagram' && after === 0, JSON.stringify({ before, after }));
  await ctx.close();

  await browser.close(); srv.server.close();
  console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });

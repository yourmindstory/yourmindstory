// Timed synthetic journey for speed measurements (runs in the browser on a yourmindstory.co.uk page that has
// the V4 assessment loaded). Human-like pacing so tracking batches are in flight, as with real visitors.
// Reports: submit → results shown, confirm → checkout shown, and whether a tracking batch was in flight at each moment.
(async () => {
  const cfg = window.__timingCfg || {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const wait = async (sel, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { const e = document.querySelector(sel); if (e && e.offsetParent !== null) return e; await sleep(100); } throw new Error('timeout ' + sel); };
  const click = async (sel, pause) => { (await wait(sel)).click(); await sleep(pause == null ? 700 : pause); };
  const type = (el, v) => { el.focus(); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  const out = { run: cfg.label || '', err: null };
  // DEV backends return phase timings (_timing); collect them, plus every backend request's duration and action.
  out.server = []; const of = window.fetch;
  window.fetch = async function (u, o) {
    const t = performance.now(); let act = ''; try { act = JSON.parse(o && o.body || '{}').action || 'submit'; } catch (e) {}
    const res = await of.apply(this, arguments);
    if (/script\.google/.test(String(u))) res.clone().json().then(j => out.server.push({ act, ms: Math.round(performance.now() - t), at: Math.round(t), timing: j && j._timing })).catch(() => {});
    return res;
  };
  try {
    await click('#beginV4');
    const sc = []; [5, 5, 4, 3].forEach(t => { const x = Math.min(3, t); sc.push(x, t - x); });
    for (let n = 0; n < 8; n++) await click(`.step.active .opt[data-v="${sc[n]}"]`);
    await click('.step.active .opt[data-v="2"]'); await click('.step.active .opt[data-v="1"]'); await click('.step.active .opt[data-v="1"]'); await click('.step.active .opt[data-v="0"]');
    await click('.step.active .opt[data-v="0"]', 300); await click('#next');
    type(await wait('#txt'), 'SYNTHETIC timing test - please ignore'); await click('#next', 1500);
    type(await wait('#fn'), 'Synthia'); type(await wait('#em'), cfg.email || 'synthetic+timing@example.invalid');
    await click('.consent-opt[data-consent="no"]', 400);
    out.inFlightAtSubmit = (typeof v4EventSending !== 'undefined' && v4EventSending);
    const t0 = performance.now(); (await wait('#capgo')).click();
    while (window.v4ResultReady !== true) { if (performance.now() - t0 > 60000) throw new Error('results not ready'); await sleep(50); }
    out.resultsMs = Math.round(performance.now() - t0);
    await sleep(2500); await click('.result-panel.active .result-next', 1500);
    await click('.result-panel.active .v4-choice[data-group="v4Goal"][data-value="self_work"]', 400); await click('.result-panel.active .result-next', 1500);
    await click('.result-panel.active .v4-choice[data-group="v4Support"][data-value="some_support"]', 400); await click('.result-panel.active .result-next', 3000);
    await click('.result-panel.active a[data-rec-price="147"]', 2000);
    out.inFlightAtConfirm = (typeof v4EventSending !== 'undefined' && v4EventSending);
    const t1 = performance.now(); (await wait('#v4Confirm')).click();
    while (!document.querySelector('#v4Checkout')) { const e = document.querySelector('#v4DecError'); if (e && e.textContent.trim() && !document.querySelector('#v4Confirm').disabled) throw new Error('decision error: ' + e.textContent); if (performance.now() - t1 > 60000) throw new Error('no checkout'); await sleep(50); }
    out.confirmMs = Math.round(performance.now() - t1);
  } catch (e) { out.err = String(e); }
  window.__timing = out;
})();

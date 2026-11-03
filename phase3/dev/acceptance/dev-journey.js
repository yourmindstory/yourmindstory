// Synthetic DEV journey driver (runs in a browser tab on yourmindstory.co.uk with the V4 DEV page loaded).
// window.__jcfg = {label, email, stages:[q,b,r,t], goal, support, price}  (price omitted = leave after results)
// Result in window.__jout: timings, the save response's email fields, and the confirmation text she sees.
(async () => {
  const cfg = window.__jcfg || {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const wait = async (sel, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { const e = document.querySelector(sel); if (e && e.offsetParent !== null) return e; await sleep(100); } throw new Error('timeout ' + sel); };
  const click = async (sel, pause) => { (await wait(sel)).click(); await sleep(pause == null ? 600 : pause); };
  const type = (el, v) => { el.focus(); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  const out = { run: cfg.label || '', err: null, server: [] };
  const of = window.fetch;
  window.fetch = async function (u, o) {
    const t = performance.now(); let act = ''; try { act = (o && o.body) ? (JSON.parse(o.body).action || 'submit') : 'get'; } catch (e) {}
    const res = await of.apply(this, arguments);
    if (/script\.google/.test(String(u)) && act !== 'recordJourneyEvents') res.clone().json().then(j => out.server.push({ act, ms: Math.round(performance.now() - t),
      resultEmailSent: j.resultEmailSent, resultEmailProvider: j.resultEmailProvider, choiceEmailRequired: j.choiceEmailRequired, choiceEmailSent: j.choiceEmailSent, status: j.status, code: j.code })).catch(() => {});
    return res;
  };
  try {
    await click('#beginV4');
    const sc = []; (cfg.stages || [5, 5, 4, 3]).forEach(t => { const x = Math.min(3, t); sc.push(x, t - x); });
    for (let n = 0; n < 8; n++) await click(`.step.active .opt[data-v="${sc[n]}"]`);
    await click('.step.active .opt[data-v="2"]'); await click('.step.active .opt[data-v="1"]'); await click('.step.active .opt[data-v="1"]'); await click('.step.active .opt[data-v="0"]');
    await click('.step.active .opt[data-v="0"]', 300); await click('#next');
    type(await wait('#txt'), 'SYNTHETIC DEV test - please ignore'); await click('#next', 1500);
    type(await wait('#fn'), 'Synthia'); type(await wait('#em'), cfg.email);
    await click('.consent-opt[data-consent="no"]', 400);
    const t0 = performance.now(); (await wait('#capgo')).click();
    while (window.v4ResultReady !== true) { if (performance.now() - t0 > 60000) throw new Error('results not ready'); await sleep(50); }
    out.resultsMs = Math.round(performance.now() - t0);
    out.token = JSON.parse(sessionStorage.getItem('yms_v4_preview_last_submission') || '{}').resultToken || '';
    if (!cfg.price) { await sleep(6000); return; }
    await sleep(1500);
    // Walk the results panels to the recommendation, answering Q1/Q2 where they appear.
    for (let k = 0; k < 8 && !document.querySelector(`.result-panel.active a[data-rec-price="${cfg.price}"]`); k++) {
      if (cfg.goal && document.querySelector('.result-panel.active .v4-choice[data-group="v4Goal"]')) await click(`.result-panel.active .v4-choice[data-group="v4Goal"][data-value="${cfg.goal}"]`, 300);
      if (cfg.support && document.querySelector('.result-panel.active .v4-choice[data-group="v4Support"]')) await click(`.result-panel.active .v4-choice[data-group="v4Support"][data-value="${cfg.support}"]`, 300);
      await click('.result-panel.active .result-next', 1200);
    }
    await click(`.result-panel.active a[data-rec-price="${cfg.price}"]`, 1500);
    const t1 = performance.now(); (await wait('#v4Confirm')).click();
    while (!document.querySelector('#v4Checkout')) { const e = document.querySelector('#v4DecError'); if (e && e.textContent.trim() && !document.querySelector('#v4Confirm').disabled) throw new Error('decision error: ' + e.textContent); if (performance.now() - t1 > 60000) throw new Error('no checkout'); await sleep(50); }
    out.confirmMs = Math.round(performance.now() - t1);
    out.confirmText = document.querySelector('#v4Decision').innerText.replace(/\s+/g, ' ').trim();
    out.checkout = document.querySelector('#v4Checkout').href;
  } catch (e) { out.err = String(e); }
  window.__jout = out;
})();

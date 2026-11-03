// Runs IN THE BROWSER (user's desktop app) against the deployed V4 DEV web app. Synthetic data only.
// Real HTTPS requests, real DEV workbook writes, real MailApp sends (redirected to the owner's inbox by DEV config).
(async () => {
  const EXEC = 'https://script.google.com/macros/s/AKfycbwMVd8v5KaUM164fgW_qQzR7NsBkU7XiD63JkZGhOoerYA357ybQzz8ly1dQQiEWuF5/exec';
  const RUN = 'R' + Date.now().toString(36);
  const out = { run: RUN, started: new Date().toISOString(), checks: [], variants: [] };
  const check = (id, desc, ok, ev) => out.checks.push({ id, desc, pass: !!ok, ev: typeof ev === 'string' ? ev : JSON.stringify(ev) });
  const post = async b => { const r = await fetch(EXEC, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(b) }); return r.json(); };
  const get = async q => { const r = await fetch(EXEC + '?' + new URLSearchParams(q), { cache: 'no-store' }); return r.json(); };
  const GOAL = { self_work: 'I want help understanding myself, breaking the cycle and getting my mind back.', understand_him: 'I mainly want to understand him and what his behaviour means.', change_him: 'I mainly want help getting him back or changing his behaviour.', unsure: "I'm not sure yet." };
  const SUP = { independent: "I'm happy to work independently", additional: 'I want additional support', some_support: 'I think some support would help me with this', recommend: "I'm not sure where to start. I'd like you to recommend what would help me most." };
  let n = 0;
  function body(stages) {
    n++;
    const sc = []; stages.forEach(t => { const x = Math.min(3, t); sc.push(x, t - x); });
    const answers = {};
    for (let i = 1; i <= 15; i++) {
      if (i <= 8) answers['q' + i] = { answer: 'SYNTHETIC answer ' + sc[i - 1], value: sc[i - 1], score: sc[i - 1] };
      else if (i === 13) answers['q13'] = { answer: ['SYNTHETIC'], value: [0] };
      else if (i === 14) answers['q14'] = { answer: '', value: null, score: null };
      else answers['q' + i] = { answer: i === 12 ? 'I want my peace back.' : 'SYNTHETIC context ' + i, value: 0, score: null };
    }
    const tok = Array.from(crypto.getRandomValues(new Uint8Array(24)), v => v.toString(16).padStart(2, '0')).join('');
    return { submissionId: `YMSV4-S-${RUN}-${n}`, journeyId: `YMSV4-J-${RUN}-${n}`, firstName: 'Synthia', email: `synthetic+${RUN.toLowerCase()}-${n}@example.invalid`, marketingConsent: false, answers, resultToken: tok, isTest: true, deferResultEmail: true, readinessRequired: false, experimentVersion: 'V4-DEV-live-contract', sourceJourney: 'Direct / unknown', landingUrl: 'https://yourmindstory.co.uk/assessment/v4-preview/start/', submissionUrl: 'https://yourmindstory.co.uk/assessment/v4-preview/start/' };
  }
  const fin = (b, option, goal, support) => ({ action: 'finalizeResultV4', resultToken: b.resultToken, submissionId: b.submissionId, finalOfferOption: option, question1: goal ? { id: 'post_result_goal', optionId: goal, answer: GOAL[goal] } : null, question2: support ? { id: 'support_level', optionId: support, answer: SUP[support] } : null, barrierAnswer: null, supportPreference: ['self_guided', 'reality_reset', 'pattern_break'].includes(option) ? { id: option, answer: option } : null, hesitation: null });

  const status = await get({});
  check('L0', 'DEV web app answers over HTTPS with env DEV and the r7d build', status.ok && status.env === 'DEV' && /r7d/.test(status.backendBuild), status);

  const variants = [
    ['Single — Quiet the Alarm', [5, 0, 0, 0], 'scored_route'], ['Single — Break the Pull', [0, 5, 0, 0], 'scored_route'], ['Single — Restore Self-Trust', [0, 0, 5, 0], 'scored_route'], ['Single — Return to You', [0, 0, 0, 5], 'scored_route'],
    ['Pair — Alarm + Pull', [5, 4, 0, 0], 'scored_route'], ['Pair — Alarm + Self-Trust', [5, 0, 4, 0], 'scored_route'], ['Pair — Alarm + Return', [5, 0, 0, 4], 'scored_route'], ['Pair — Pull + Self-Trust', [0, 5, 4, 0], 'scored_route'], ['Pair — Pull + Return', [0, 5, 0, 4], 'scored_route'], ['Pair — Self-Trust + Return', [0, 0, 5, 4], 'scored_route'],
    ['Bare Minimum — scored', [1, 1, 1, 1], 'bare_minimum'], ['Bare Minimum — Complete + Q1 understand him', [5, 5, 5, 5], 'bare_minimum', 'understand_him'],
    ['Complete £117 — independent', [5, 5, 5, 5], 'self_guided', 'self_work', 'independent'], ['Complete £147 — some support', [5, 5, 5, 5], 'reality_reset', 'self_work', 'some_support'], ['Complete £197 — additional (alternative chosen)', [5, 5, 5, 5], 'pattern_break', 'unsure', 'additional'],
  ];
  for (const [label, st, option, goal, support] of variants) {
    const b = body(st);
    const t0 = performance.now();
    const s = await post(b);
    const t1 = performance.now();
    const f = await post(fin(b, option, goal, support));
    const t2 = performance.now();
    const g = await get({ action: 'getResult', resultToken: b.resultToken });
    out.variants.push({ label, submissionId: b.submissionId, token: b.resultToken.slice(0, 8) + '…', submit: s.status || s.code, route: s.recommendedRoute, price: s.recommendedPrice, pending: s.resultEmailPending, finalize: f.status || f.code, provider: f.provider, offer: f.finalOffer, saved: g.decision && g.decision.finalOfferOption, q1: g.decision && g.decision.question1OptionId, q2: g.decision && g.decision.question2OptionId, ms: [Math.round(t1 - t0), Math.round(t2 - t1)] });
  }
  const V = out.variants;
  check('L1', 'All 15 synthetic submissions saved (RECORDED) with email deferred', V.every(v => v.submit === 'ok' && v.pending === true), V.map(v => v.submit + '/' + v.pending).join(','));
  check('L2', 'All 15 final choices saved and emailed via MailApp (DEV redirect to owner inbox)', V.every(v => v.finalize === 'finalized' && v.provider === 'mailapp-dev-redirect'), V.map(v => v.finalize + ':' + v.provider).join(','));
  check('L3', 'getResult returns the saved final choice and Q1/Q2 for every variant', V.every((v, i) => v.saved === (variants[i][2]) && (v.q1 || '') === (variants[i][3] || '') && (v.q2 || '') === (variants[i][4] || '')), V.map(v => v.saved + '/' + v.q1 + '/' + v.q2).join(','));
  check('L4', 'Scored routes and prices as expected (4×£37, 6×£74, £4.99, Complete £117 base)', V.slice(0, 4).every(v => v.route === 'Single Stage' && +v.price === 37) && V.slice(4, 10).every(v => v.route === 'Two-Stage Pair' && +v.price === 74) && V[10].route === 'Bare Minimum' && V.slice(11).every(v => v.route === 'Return to You Series' && +v.price === 117), V.map(v => v.route + ' ' + v.price).join(', '));

  // Idempotency, change-after-email, duplicates, abandonment, validation — no extra emails expected.
  const rerun = await post(fin({ resultToken: '', submissionId: '' }, 'self_guided'));
  check('L5', 'Finalize without a token is rejected', rerun.code === 'MISSING_RESULT_TOKEN', rerun);
  const firstBody = body([5, 5, 5, 5]); // fresh row for idempotency path
  await post(firstBody);
  const a1 = await post(fin(firstBody, 'self_guided', 'self_work', 'recommend'));
  const a2 = await post(fin(firstBody, 'self_guided', 'self_work', 'recommend'));
  const a3 = await post(fin(firstBody, 'pattern_break', 'self_work', 'recommend'));
  check('L6', 'Repeat of the same final choice is idempotent; a different choice after the email is refused with the saved choice', a1.status === 'finalized' && a2.idempotent === true && a3.code === 'EMAIL_ALREADY_SENT' && a3.savedFinalOfferOption === 'self_guided', { a1: a1.status, a2: a2.idempotent, a3: a3.code, saved: a3.savedFinalOfferOption });
  const dup = await post(firstBody);
  check('L7', 'Resubmitting the same assessment returns duplicate (no second row)', dup.status === 'duplicate', dup.status);
  const ab = body([4, 4, 4, 4]); await post(ab);
  const ev = await post({ action: 'recordJourneyEvents', resultToken: ab.resultToken, submissionId: ab.submissionId, journeyId: ab.journeyId, page: 'results', analyticsConsent: 'no', events: [{ eventType: 'result_view', values: {} }, { eventType: 'post_result_question_answered', values: { step: 'q1' } }, { eventType: 'recommendation_video_play', values: { route: 'self_guided' } }] });
  check('L8', 'Journey events (incl. video play and question answered) accepted on the abandoned row', ev.ok && ev.results.every(r => r.ok), ev.results);
  const v1 = await post(fin(ab, 'self_guided', null, null));
  const v2 = await post(fin(ab, 'self_guided', 'self_work', null));
  const v3 = await post(fin(ab, 'bare_minimum', 'self_work', 'independent'));
  check('L9', 'Invalid final choices rejected: no Q1, no Q2, offer not allowed for the answers', v1.code === 'QUESTION_1_REQUIRED' && v2.code === 'QUESTION_2_REQUIRED' && v3.code === 'OFFER_MISMATCH', [v1.code, v2.code, v3.code]);
  const ga = await get({ action: 'getResult', resultToken: ab.resultToken });
  check('L10', 'Abandoned journey: saved result retrievable, no decision saved, no email', ga.ok && ga.decision && ga.decision.saved === false && !ga.decision.resultEmailSent, ga.decision);
  const mm = await post({ ...fin(ab, 'self_guided', 'self_work', 'independent'), submissionId: 'YMSV4-S-NOT-MINE' });
  check('L11', 'A token used with another submission ID is refused', mm.code === 'SUBMISSION_MISMATCH', mm.code);
  const sync = await fetch(EXEC + '?action=sync').then(r => r.text());
  const maint = await post({ action: 'rematchPurchases' });
  check('L12', 'DEV refuses purchase sync and maintenance actions', /disabled in development/.test(sync) && maint.code === 'DEV_ACTION_DISABLED', [sync, maint.code]);
  out.expectedEmails = 16; // 15 variants + idempotency row
  out.abandonedSubmission = ab.submissionId;
  out.finished = new Date().toISOString();
  window.__ymsContract = out;
  return out;
})();

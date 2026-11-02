// Stage 2 (owner-approved 2 Nov 2026): controlled TEST journeys against the REAL V4 system through a separate
// test deployment (the live deployment and website are untouched). Exactly 6 TEST journeys, all addressed to the
// owner's +v4test inbox, all flagged TEST. The Stage 2 guard (V4_STAGE2_TEST_ONLY=yes) refuses anything else.
(async () => {
  const EXEC = 'https://script.google.com/macros/s/AKfycbycQx32di8h_46ez7R5ofLf_YRzpKsFKsaePjFxp4OcRpMeLwg4QuwZWBs4J9MuclhGew/exec';
  const RUN = 'STAGE2-' + Date.now().toString(36).toUpperCase();
  const out = { run: RUN, started: new Date().toISOString(), checks: [], journeys: [] };
  const check = (id, desc, ok, ev) => out.checks.push({ id, desc, pass: !!ok, ev: typeof ev === 'string' ? ev : JSON.stringify(ev) });
  const post = async b => { const r = await fetch(EXEC, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(b) }); return r.json(); };
  const get = async q => { const r = await fetch(EXEC + '?' + new URLSearchParams(q), { cache: 'no-store' }); return r.json(); };
  const GOAL = { self_work: 'I want help understanding myself, breaking the cycle and getting my mind back.', unsure: "I'm not sure yet." };
  const SUP = { independent: "I'm happy to work independently", additional: 'I want additional support', some_support: 'I think some support would help me with this' };
  let n = 0;
  function body(stages, email) {
    n++;
    const sc = []; stages.forEach(t => { const x = Math.min(3, t); sc.push(x, t - x); });
    const answers = {};
    for (let i = 1; i <= 15; i++) {
      if (i <= 8) answers['q' + i] = { answer: 'STAGE 2 TEST answer ' + sc[i - 1], value: sc[i - 1], score: sc[i - 1] };
      else if (i === 13) answers['q13'] = { answer: ['STAGE 2 TEST'], value: [0] };
      else if (i === 14) answers['q14'] = { answer: '', value: null, score: null };
      else answers['q' + i] = { answer: i === 12 ? 'I want my peace back.' : 'STAGE 2 TEST context ' + i, value: 0, score: null };
    }
    const tok = Array.from(crypto.getRandomValues(new Uint8Array(24)), v => v.toString(16).padStart(2, '0')).join('');
    return { submissionId: `YMSV4-S-${RUN}-${n}`, journeyId: `YMSV4-J-${RUN}-${n}`, firstName: 'Test', email: email || `yourmindstory.co.uk+v4test${n}@gmail.com`, marketingConsent: false, answers, resultToken: tok, isTest: true, deferResultEmail: true, readinessRequired: false, experimentVersion: 'V4-STAGE2-controlled-test', sourceJourney: 'Direct / unknown', landingUrl: 'https://yourmindstory.co.uk/assessment/v4-preview/start/', submissionUrl: 'https://yourmindstory.co.uk/assessment/v4-preview/start/' };
  }
  const fin = (b, option, goal, support) => ({ action: 'finalizeResultV4', resultToken: b.resultToken, submissionId: b.submissionId, finalOfferOption: option, question1: goal ? { id: 'post_result_goal', optionId: goal, answer: GOAL[goal] } : null, question2: support ? { id: 'support_level', optionId: support, answer: SUP[support] } : null, barrierAnswer: null, supportPreference: ['self_guided', 'reality_reset', 'pattern_break'].includes(option) ? { id: option, answer: option } : null, hesitation: null });

  const status = await get({});
  check('S0', 'Stage 2 deployment answers with env PROD and the release candidate build', status.ok && status.env === 'PROD' && /prod-release-candidate-r6b/.test(status.backendBuild), [status.env, status.backendBuild]);

  // Guard: a non-test address is refused before anything is written (n is not advanced for the real list).
  const outsider = body([5, 0, 0, 0], 'stage2-guard-check@example.invalid'); n--;
  const g1 = await post(outsider);
  check('S1', 'Guard: a submission from any address other than the +v4test inbox is refused, nothing written', g1.code === 'STAGE2_TEST_ONLY', g1.code);

  const J = [
    ['£117 Return to Yourself — Q2 independent', [5, 5, 5, 5], 'self_guided', 'self_work', 'independent', 117],
    ['£147 + Reality Reset — Q2 some support', [5, 5, 5, 5], 'reality_reset', 'self_work', 'some_support', 147],
    ['£197 + Pattern Break — Q2 additional, alternative chosen', [5, 5, 5, 5], 'pattern_break', 'unsure', 'additional', 197],
    ['£37 single — Quiet the Alarm', [5, 0, 0, 0], 'scored_route', null, null, 37],
    ['£74 pair — Break the Pull + Return to You', [0, 5, 0, 4], 'scored_route', null, null, 74],
    ['£4.99 The Bare Minimum (ebook)', [1, 1, 1, 1], 'bare_minimum', null, null, 4.99],
  ];
  const bodies = [];
  for (const [label, st, option, goal, support, price] of J) {
    const b = body(st); bodies.push(b);
    const t0 = performance.now();
    const s = await post(b);
    const t1 = performance.now();
    const ev = await post({ action: 'recordJourneyEvents', resultToken: b.resultToken, submissionId: b.submissionId, journeyId: b.journeyId, page: 'results', analyticsConsent: 'no', events: [{ eventType: 'result_view', values: {} }].concat(goal ? [{ eventType: 'post_result_question_answered', values: { step: 'q1' } }, { eventType: 'recommendation_video_play', values: { route: option } }] : []) });
    const t2 = performance.now();
    const f = await post(fin(b, option, goal, support));
    const t3 = performance.now();
    const g = await get({ action: 'getResult', resultToken: b.resultToken });
    out.journeys.push({ label, email: b.email, submissionId: b.submissionId, token: b.resultToken.slice(0, 8) + '…', submit: s.status || s.code, route: s.recommendedRoute, price: s.recommendedPrice, events: ev.ok && (ev.results || []).every(r => r.ok), finalize: f.status || f.code, provider: f.provider, offer: f.finalOffer, saved: g.decision && g.decision.finalOfferOption, q1: g.decision && g.decision.question1OptionId, q2: g.decision && g.decision.question2OptionId, emailSent: g.decision && g.decision.resultEmailSent, ms: [Math.round(t1 - t0), Math.round(t2 - t1), Math.round(t3 - t2)], expectPrice: price });
  }
  const V = out.journeys;
  check('S2', 'All 6 TEST journeys saved to the real V4 workbook with the email deferred until the final choice', V.every(v => v.submit === 'ok'), V.map(v => v.submit).join(','));
  check('S3', 'Scored route and base price correct for every journey', V.slice(0, 3).every(v => v.route === 'Return to You Series' && +v.price === 117) && V[3].route === 'Single Stage' && +V[3].price === 37 && V[4].route === 'Two-Stage Pair' && +V[4].price === 74 && V[5].route === 'Bare Minimum', V.map(v => v.route + ' ' + v.price).join(', '));
  check('S4', 'Journey events (result view, question answered, video play) recorded on each TEST row', V.every(v => v.events), V.map(v => v.events).join(','));
  check('S5', 'All 6 final choices saved and emailed once via MailApp to the +v4test inbox (live mode, no redirect)', V.every(v => v.finalize === 'finalized' && v.provider === 'mailapp'), V.map(v => v.finalize + ':' + v.provider).join(','));
  check('S6', 'getResult returns the saved final choice and Q1/Q2 for every journey', V.every((v, i) => v.saved === J[i][2] && (v.q1 || '') === (J[i][3] || '') && (v.q2 || '') === (J[i][4] || '') && v.emailSent), V.map(v => v.saved + '/' + v.q1 + '/' + v.q2 + '/' + v.emailSent).join(','));

  // Idempotency and change-after-email on journey 1 (no new row, no new email).
  const a2 = await post(fin(bodies[0], 'self_guided', 'self_work', 'independent'));
  const a3 = await post(fin(bodies[0], 'pattern_break', 'self_work', 'independent'));
  check('S7', 'Repeat of the same choice is idempotent; a different choice after the email is refused with the saved choice', a2.idempotent === true && a3.code === 'EMAIL_ALREADY_SENT' && a3.savedFinalOfferOption === 'self_guided', { a2: a2.idempotent, a3: a3.code, saved: a3.savedFinalOfferOption });
  const dup = await post(bodies[3]);
  check('S8', 'Resubmitting the same assessment returns duplicate (no second row)', dup.status === 'duplicate', dup.status);
  const sync = await fetch(EXEC + '?action=sync').then(r => r.text());
  const maint = await post({ action: 'rematchPurchases' });
  check('S9', 'Guard: purchase sync and maintenance actions are refused during Stage 2', /Stage 2/.test(sync) && maint.code === 'STAGE2_TEST_ONLY', [sync, maint.code]);
  out.expectedEmails = 6;
  out.finished = new Date().toISOString();
  window.__ymsStage2 = out;
  return out;
})();

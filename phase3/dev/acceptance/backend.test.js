// Simulated backend acceptance tests: real candidate .gs code executed against an in-memory DEV workbook.
'use strict';
const fs = require('fs');
const path = require('path');
const { createRuntime, OPS } = require('./gas-mock');
const REPO = '/home/claude/yourmindstory';
const SRC = path.join(REPO, 'phase3/dev/YMS_V4_FINAL_CHOICE_DEV_CANDIDATE.gs');
const FRONT = fs.readFileSync(path.join(REPO, 'assessment/v4-preview/start/index.html'), 'utf8');
const Q = eval(FRONT.match(/const Q=(\[[\s\S]*?\n\]);/)[1]);

const results = [];
function check(id, area, desc, cond, evidence) { results.push({ id, area, desc, pass: !!cond, evidence: evidence === undefined ? '' : String(evidence).slice(0, 300) }); }

let seq = 0;
function body(stageScores, extra = {}) {
  // stageScores: 4 stage sums 0..6 -> split into two answers
  const sc = [];
  stageScores.forEach(t => { const x = Math.min(3, t); sc.push(x, t - x); });
  const answers = {};
  for (let n = 0; n < 15; n++) {
    const q = Q[n];
    if (n === 13) { answers['q14'] = { answer: '', value: null, score: null }; continue; }
    if (q.text) { answers['q' + (n + 1)] = { answer: 'Synthetic test answer.' }; continue; }
    if (q.multi) { answers['q' + (n + 1)] = { answer: [q.o[0]], value: [0] }; continue; }
    const v = n < 8 ? sc[n] : 0;
    answers['q' + (n + 1)] = { answer: q.o[v], value: v, score: n < 8 ? v : null };
  }
  seq++;
  return Object.assign({ submissionId: 'YMSV4-S-SYN-' + seq, journeyId: 'YMSV4-J-SYN-' + seq, firstName: 'Synthia', email: 'synthetic+' + seq + '@example.invalid',
    marketingConsent: false, answers, resultToken: ('tok' + seq + 'x').padEnd(48, '0'), deferResultEmail: true, readinessRequired: false, isTest: true,
    experimentVersion: 'V4-november-september-flow' }, extra);
}
const GOAL = { self_work: 'I want help understanding myself, breaking the cycle and getting my mind back.', understand_him: 'I mainly want to understand him and what his behaviour means.', change_him: 'I mainly want help getting him back or changing his behaviour.', unsure: "I'm not sure yet." };
const SUP = { independent: "I'm happy to work independently", additional: 'I want additional support', some_support: 'I think some support would help me with this', recommend: "I'm not sure where to start. I'd like you to recommend what would help me most." };
function fin(token, sid, option, goal, support, extra = {}) {
  return Object.assign({ action: 'finalizeResultV4', resultToken: token, submissionId: sid, finalOfferOption: option,
    question1: goal ? { id: 'post_result_goal', optionId: goal, answer: GOAL[goal] } : null,
    question2: support ? { id: 'support_level', optionId: support, answer: SUP[support] } : null, barrierAnswer: null }, extra);
}
const rt = () => createRuntime({ source: SRC });
const emailLog = r => (r.sheet('V4 DEV Email Log') ? r.sheet('V4 DEV Email Log').rows.slice(1) : []);

// ---------- A. Scoring (exhaustive over all 7^4 stage-sum combinations) ----------
{
  const r = rt(); let mismatches = 0, n = 0; const counts = {};
  const PRICE = { 'Bare Minimum': 4.99, 'Single Stage': 37, 'Two-Stage Pair': 74, 'Return to You Series': 117 };
  for (let a = 0; a <= 6; a++) for (let b = 0; b <= 6; b++) for (let c = 0; c <= 6; c++) for (let d = 0; d <= 6; d++) {
    const s = [a, b, c, d]; const q = s.filter(x => x >= 3).length;
    const exp = q >= 3 ? 'Return to You Series' : q === 2 ? 'Two-Stage Pair' : q === 1 ? 'Single Stage' : 'Bare Minimum';
    const res = r.call('computeV3_', body(s));
    n++; counts[exp] = (counts[exp] || 0) + 1;
    if (res.route !== exp || res.price !== PRICE[exp] || res.total !== a + b + c + d) mismatches++;
  }
  check('A1', 'Scoring', 'Backend route/price/total match approved thresholds for all 2,401 stage-score combinations', mismatches === 0, `${n} combos, ${mismatches} mismatches, ${JSON.stringify(counts)}`);
  const b1 = r.call('computeV3_', body([2, 2, 2, 2])); check('A2', 'Scoring', 'Boundary: every stage 2 (total 8) -> Bare Minimum', b1.route === 'Bare Minimum', b1.route);
  const b2 = r.call('computeV3_', body([3, 2, 2, 2])); check('A3', 'Scoring', 'Boundary: one stage exactly 3 -> Single £37', b2.route === 'Single Stage' && b2.product === 'Quiet the Alarm', b2.product);
  const b3 = r.call('computeV3_', body([0, 3, 0, 6])); check('A4', 'Scoring', 'Two stages -> Pair £74 named in stage order', b3.product === 'Break the Pull → Return to Yourself' && b3.price === 74, b3.product);
  const b4 = r.call('computeV3_', body([3, 3, 3, 0])); check('A5', 'Scoring', 'Three stages at 3 (total 9, below 15) -> Complete £117', b4.route === 'Return to You Series' && b4.total === 9, b4.total);
}

// ---------- B/C/D. Submission, persistence, abandonment ----------
{
  const r = rt();
  const b = body([4, 4, 4, 3]); const res = r.post(b);
  check('C1', 'Persistence', 'Initial submission writes exactly one row with the client submission ID and result token', res.ok && r.rows().length === 1 && r.rows()[0]['Submission ID'] === b.submissionId && r.rows()[0]['Result Token'] === b.resultToken, JSON.stringify({ code: res.code, rows: r.rows().length }));
  const log1 = emailLog(r);
  check('D1', 'Email', 'r8: her results email goes at submission (one email, the approved Complete email listing £117/£147/£197); row records it as sent with flow "immediate"; no choice email yet', res.resultEmailSuppressed === true && log1.length === 1 && log1[0][4] === 'Synthia, I’ve looked at your answers' && /£117/.test(log1[0][6]) && /£147/.test(log1[0][6]) && /£197/.test(log1[0][6]) && r.rows()[0]['Result Email Sent'] && r.rows()[0]['Result Email Provider'] === 'dev-suppressed' && r.rows()[0]['V4 Email Flow'] === 'immediate' && !r.rows()[0]['V4 Choice Email Status'], JSON.stringify({ sup: res.resultEmailSuppressed, n: log1.length, prov: r.rows()[0]['Result Email Provider'] }));
  const dup = r.post(b);
  check('C2', 'Persistence', 'Resubmitting the same submission returns duplicate and writes no second row', dup.status === 'duplicate' && r.rows().length === 1, dup.status);
  const g = r.get({ action: 'getResult', resultToken: b.resultToken });
  check('C3', 'Persistence', 'getResult returns V4 version, token, scores and an unsaved decision', g.ok && g.assessmentVersion === 'YMS-ASSESSMENT-2026-V4' && g.decision && g.decision.saved === false && g.decision.questionsRequired === true && !('email' in g) && !('Email' in g), JSON.stringify(g.decision));
  // abandonment: journey events only
  r.post({ action: 'recordJourneyEvents', resultToken: b.resultToken, submissionId: b.submissionId, journeyId: b.journeyId, page: 'results', events: [{ eventType: 'result_view', values: {} }, { eventType: 'result_step_view', values: { step: 2 } }] });
  check('D2', 'Email', 'Abandoned journey (results seen, no final choice): she still has her results email and nothing else is sent; resubmitting sends nothing more', emailLog(r).length === 1 && dup.status === 'duplicate', 'emails=' + emailLog(r).length);
  // missing / invalid answers
  const v1 = r.post(fin(b.resultToken, b.submissionId, 'self_guided', null, null));
  check('B1', 'Routing', 'Final choice without Q1 on qualifying Complete is rejected', v1.code === 'QUESTION_1_REQUIRED', v1.code);
  const v2 = r.post(fin(b.resultToken, b.submissionId, 'self_guided', 'self_work', null));
  check('B2', 'Routing', 'Self-work without Q2 is rejected', v2.code === 'QUESTION_2_REQUIRED', v2.code);
  const v3 = r.post(Object.assign(fin(b.resultToken, b.submissionId, 'self_guided', 'self_work', 'independent'), { question1: { optionId: 'self_work', answer: 'something else' } }));
  check('B3', 'Routing', 'Q1 answer text not matching approved wording is rejected', v3.code === 'INVALID_QUESTION_1', v3.code);
  const v4 = r.post(fin(b.resultToken, 'YMSV4-S-OTHER', 'self_guided', 'self_work', 'independent'));
  check('C4', 'Persistence', 'Mismatched submission ID cannot finalise another person\'s result', v4.code === 'SUBMISSION_MISMATCH', v4.code);
  const v5 = r.post(fin('nonexistenttoken000000000000000', '', 'self_guided', 'self_work', 'independent'));
  check('C5', 'Persistence', 'Unknown result token is rejected', v5.code === 'NOT_FOUND', v5.code);
  check('D3', 'Email', 'Rejected requests sent nothing and saved no decision', emailLog(r).length === 1 && !r.rows()[0]['V4 Decision Saved UTC'], 'ok');
}

// ---------- B. Full Q1/Q2/offer permission matrix (qualifying Complete, total >= 15) ----------
{
  const OPTS = ['self_guided', 'reality_reset', 'pattern_break', 'bare_minimum'];
  const allowed = (g, s, o) => {
    if (g === 'understand_him' || g === 'change_him') return s === null && o === 'bare_minimum';
    if (s === null) return false;
    if (s === 'independent') return o === 'self_guided';
    if (s === 'additional' || s === 'some_support') return o === 'reality_reset' || o === 'pattern_break';
    return ['self_guided', 'reality_reset', 'pattern_break'].includes(o);
  };
  let bad = [], okCount = 0, total = 0;
  for (const g of Object.keys(GOAL)) for (const s of [null, ...Object.keys(SUP)]) for (const o of OPTS) {
    const r = rt(); const b = body([4, 4, 4, 3]); r.post(b);
    const res = r.post(fin(b.resultToken, b.submissionId, o, g, s)); total++;
    const exp = allowed(g, s, o);
    const got = res.ok === true && res.status === 'finalized';
    if (exp !== got) bad.push(`${g}/${s}/${o}:${res.code || res.status}`);
    if (got) {
      okCount++;
      const row = r.rows()[0];
      const log = emailLog(r);
      if (row['V4 Post-Result Question 1 Option ID'] !== g || row['V4 Post-Result Question 1 Answer'] !== GOAL[g] ||
          row['V4 Post-Result Question 2 Option ID'] !== (s || '') || row['V4 Post-Result Question 2 Answer'] !== (s ? SUP[s] : '') ||
          row['V4 Result Email Route'] !== o || !row['V4 Decision Saved UTC'] || log.length !== 2 || r.rows().length !== 1 ||
          row['Quiet Score'] !== 4 || row['Total Score'] !== 15) bad.push(`persist ${g}/${s}/${o}`);
    }
  }
  check('B4', 'Routing', 'Every Q1 x Q2 x offer combination is accepted or refused exactly per the approved rules', bad.length === 0, `${total} combinations, ${okCount} accepted; failures: ${bad.join('; ') || 'none'}`);
  check('C6', 'Persistence', 'Accepted choices store Q1 and Q2 (ID + approved text) in separate columns, one results email + one choice email, one row, scores unchanged', !bad.some(x => x.startsWith('persist')), 'checked on each accepted combination');
}

// ---------- Non-qualifying routes ----------
{
  const cases = [
    ['Complete below 15 (3,3,3,0) self_guided', [3, 3, 3, 0], 'self_guided', null, null, true],
    ['Complete below 15 pattern_break', [3, 3, 3, 0], 'pattern_break', null, null, true],
    ['Complete below 15 with Q1 sent', [3, 3, 3, 0], 'self_guided', 'self_work', 'independent', false],
    ['Complete below 15 bare_minimum', [3, 3, 3, 0], 'bare_minimum', null, null, false],
    ['Single scored_route', [5, 0, 0, 0], 'scored_route', null, null, true],
    ['Single legacy empty option', [0, 0, 6, 0], '', null, null, true],
    ['Single tries self_guided', [5, 0, 0, 0], 'self_guided', null, null, false],
    ['Single with Q1 sent', [5, 0, 0, 0], 'scored_route', 'unsure', 'recommend', false],
    ['Pair scored_route', [5, 4, 0, 0], 'scored_route', null, null, true],
    ['Bare Minimum route', [1, 1, 1, 1], 'bare_minimum', null, null, true],
    ['Bare Minimum route tries scored_route', [1, 1, 1, 1], 'scored_route', null, null, false],
  ];
  const bad = [];
  cases.forEach(([name, s, o, g, sup, exp]) => {
    const r = rt(); const b = body(s); r.post(b);
    const res = r.post(fin(b.resultToken, b.submissionId, o, g, sup));
    const got = res.ok === true;
    if (got !== exp) bad.push(name + ':' + (res.code || res.status));
    if (got && (r.rows()[0]['V4 Post-Result Question 1 Option ID'] || r.rows()[0]['V4 Post-Result Question 2 Option ID'])) bad.push(name + ': stored Q1/Q2');
  });
  check('B5', 'Routing', 'Single, Pair, Bare Minimum and below-threshold Complete accept only their own offers and never store Q1/Q2', bad.length === 0, bad.join('; ') || `${cases.length} cases as expected`);
}

// ---------- D. r8 emails: results at completion, choice email (Complete only), idempotency, failure, retry ----------
{
  const r = rt(); const b = body([4, 4, 4, 3]); r.post(b);
  const f = fin(b.resultToken, b.submissionId, 'reality_reset', 'self_work', 'additional');
  const r1 = r.post(f);
  const r2 = r.post(f); const r3 = r.post(f);
  const log = emailLog(r);
  check('D4', 'Email', 'Repeated identical choices: exactly one choice email (two emails in total: results + choice)', r1.ok && r1.choiceEmailRequired && r1.choiceEmailSuppressed && r2.ok && r2.idempotent && r3.idempotent && log.length === 2, `responses ok=${r1.ok},${r2.ok},${r3.ok}; emails=${log.length}`);
  const t = String(log[1][6]);
  check('D5', 'Email', 'Choice email: approved subject and opening, only the chosen option with its price and checkout link (choice campaign), no other offer, no results text', log[1][4] === 'Your next step towards feeling like yourself again' && t.startsWith('Hi Synthia,\n\nYou’ve chosen how you’d like to begin working on the patterns that have been keeping you stuck. Here’s your next step.\n\nReturn to Yourself + Reality Reset | £147\n\nSTART MY SESSIONS\nhttps://yourmindstory.co.uk/assessment/choice/?o=reality_reset&') && !t.includes('£117') && !t.includes('£197') && t.includes('utm_campaign=v4_choice_email') && !t.includes('looked at your answers') && t.endsWith('With care,\nOnye\nYour Mind Story\nCognitive Behavioral Hypnotherapist'), t.slice(0, 200));
  const t0 = String(log[0][6]);
  check('D6', 'Email', 'Results email keeps the approved copy (subject, opening, sign-off) and the V4 result campaign', log[0][4] === 'Synthia, I’ve looked at your answers' && t0.includes('I’ve looked at your answers.') && t0.includes('With care,\nOnye\nYour Mind Story\nCognitive Behavioral Hypnotherapist') && t0.includes('utm_campaign=v4_result_email'), log[0][4]);
  check('D7', 'Email', 'Results email includes the saved-result link carrying this result token', t0.includes('resultToken=' + b.resultToken), (t0.match(/https:[^\s]*resultToken=[^\s]*/) || [''])[0]);
  const ch = r.post(fin(b.resultToken, b.submissionId, 'pattern_break', 'self_work', 'additional'));
  check('D8', 'Email', 'A different choice after the choice email is refused, returns the saved choice, and sends nothing', ch.code === 'EMAIL_ALREADY_SENT' && ch.savedFinalOfferOption === 'reality_reset' && emailLog(r).length === 2 && r.rows()[0]['V4 Result Email Route'] === 'reality_reset', JSON.stringify({ code: ch.code, saved: ch.savedFinalOfferOption }));
  const g = r.get({ action: 'getResult', resultToken: b.resultToken });
  check('C7', 'Persistence', 'getResult reports the saved decision (option, Q1, Q2) and both email states for resume', g.decision.saved && g.decision.finalOfferOption === 'reality_reset' && g.decision.question1OptionId === 'self_work' && g.decision.question2OptionId === 'additional' && g.decision.resultEmailSuppressed === true && g.decision.choiceEmailRequired === true && g.decision.choiceEmailSuppressed === true && g.decision.emailFlow === 'immediate', JSON.stringify(g.decision));
  // Single / Pair / Bare Minimum: no second email
  const singles = [[5, 0, 0, 0], [5, 4, 0, 0], [1, 1, 1, 1]].map(sc => { const rr = rt(); const bb = body(sc); rr.post(bb); const opt = sc[0] === 1 ? 'bare_minimum' : 'scored_route'; const x = rr.post(fin(bb.resultToken, bb.submissionId, opt)); const y = rr.post(fin(bb.resultToken, bb.submissionId, opt)); return { ok: x.ok && !x.choiceEmailRequired && y.idempotent, n: emailLog(rr).length, saved: rr.rows()[0]['V4 Result Email Route'] === opt }; });
  check('D16', 'Email', 'Single, Pair and Bare Minimum: one results email at completion; confirming (twice) saves the choice and sends no second email', singles.every(x => x.ok && x.n === 1 && x.saved), JSON.stringify(singles));
  // Complete result, Q1 "understand/change him" -> The Bare Minimum confirmation email
  const rb = rt(); const bb = body([5, 5, 5, 5]); rb.post(bb);
  const fb = rb.post(fin(bb.resultToken, bb.submissionId, 'bare_minimum', 'understand_him', null));
  const lb = emailLog(rb);
  check('D17', 'Email', 'Complete result choosing The Bare Minimum gets the short choice email with "The Bare Minimum · £4.99" and its Stan link', fb.ok && fb.choiceEmailRequired && lb.length === 2 && lb[1][4] === 'Your next step towards feeling like yourself again' && String(lb[1][6]).includes('The Bare Minimum · £4.99') && String(lb[1][6]).includes('START WITH THE BARE MINIMUM\nhttps://stan.store/Yourmindstory/p/the-bare-minimum?') && !/£117|£147|£197/.test(String(lb[1][6])), String(lb[1] && lb[1][6]).slice(0, 220));
}
{
  // Real MailApp path (redirect mode): failure recorded, safe retry, never twice.
  const r = createRuntime({ source: SRC, props: { V4_DEV_EMAIL_REDIRECT_TO: 'owner-test@example.invalid' } });
  r.mail.failAll = true;
  const b = body([5, 5, 5, 5]); const s0 = r.post(b);
  const row0 = r.rows()[0];
  check('D9', 'Email', 'Failed results email: assessment still saved and results returned; row records "failed" with the error and no sent stamp; response never claims it was sent', s0.ok && s0.code === 'RECORDED' && s0.resultEmailSent === false && s0.resultEmailProvider === 'failed' && row0['Result Email Provider'] === 'failed' && /Simulated MailApp failure/.test(row0['Result Email Error']) && !row0['Result Email Sent'], JSON.stringify({ ok: s0.ok, sent: s0.resultEmailSent, prov: row0['Result Email Provider'] }));
  r.mail.failAll = false;
  const t1 = r.post({ action: 'retryResultEmail', resultToken: b.resultToken });
  const t2 = r.post({ action: 'retryResultEmail', resultToken: b.resultToken });
  check('D10', 'Email', 'Retry after a failure sends exactly one results email (to the DEV redirect inbox only); a second retry sends nothing', t1.ok && t1.resultEmailSent === true && t2.status === 'already_sent' && r.mail.sent.length === 1 && r.mail.sent[0].to === 'owner-test@example.invalid' && /\[V4 DEV for synthetic\+/.test(r.mail.sent[0].subject) && r.rows()[0]['Result Email Provider'] === 'mailapp-dev-redirect' && r.rows()[0]['Result Email Sent'], JSON.stringify({ t1: t1.status, t2: t2.status, n: r.mail.sent.length }));
  // stuck 'sending': fresh blocks, stale is flagged for review, never resent
  const b2 = body([5, 5, 5, 5]); r.post(b2);
  const sh = r.sheet('V4 Responses'); const H = sh.rows[0]; const rowN = 3;
  sh.set(rowN, H.indexOf('Result Email Provider') + 1, 'sending'); sh.set(rowN, H.indexOf('Result Email Sent') + 1, ''); sh.set(rowN, H.indexOf('Result Email Error') + 1, 'sending since ' + new Date().toISOString());
  const u1 = r.post({ action: 'retryResultEmail', resultToken: b2.resultToken });
  sh.set(rowN, H.indexOf('Result Email Error') + 1, 'sending since ' + new Date(Date.now() - 11 * 60000).toISOString());
  const before = r.mail.sent.length;
  const u2 = r.post({ action: 'retryResultEmail', resultToken: b2.resultToken });
  const probs = r.call('listV4EmailProblems');
  check('D11', 'Email', 'A send in progress blocks a duplicate; a stuck send (>10 min) is listed for review and never resent automatically', u1.code === 'SEND_IN_PROGRESS' && u2.code === 'NEEDS_REVIEW' && r.mail.sent.length === before && probs.some(p => p.row === 3 && p.resultEmail === 'sending'), JSON.stringify({ u1: u1.code, u2: u2.code, probs }));
  check('D12', 'Email', 'Transactional emails ignore marketing consent=false (results still delivered)', r.mail.sent.length >= 2, 'marketingConsent:false on all synthetic bodies');
  // choice email failure -> choice saved, checkout allowed, retry by confirming again sends once
  const b3 = body([5, 5, 5, 5]); r.post(b3);
  r.mail.failAll = true;
  const c1 = r.post(fin(b3.resultToken, b3.submissionId, 'pattern_break', 'unsure', 'recommend'));
  r.mail.failAll = false;
  const n0 = r.mail.sent.length;
  const c2 = r.post(fin(b3.resultToken, b3.submissionId, 'pattern_break', 'unsure', 'recommend'));
  const c3 = r.post(fin(b3.resultToken, b3.submissionId, 'pattern_break', 'unsure', 'recommend'));
  const row3 = r.rows().find(x => x['Result Token'] === b3.resultToken);
  check('D18b', 'Email', 'Failed choice email: choice saved, response ok (checkout can continue) but never claims it was sent; confirming again sends it once; then idempotent', c1.ok && c1.choiceEmailSent === false && c1.choiceEmailError === 'failed' && c2.ok && c2.choiceEmailSent === true && c3.idempotent && r.mail.sent.length === n0 + 1 && row3['V4 Choice Email Status'] === 'sent' && row3['V4 Choice Email Option'] === 'pattern_break' && row3['V4 Choice Email Sent'], JSON.stringify({ c1: [c1.ok, c1.choiceEmailSent], c2: c2.choiceEmailSent, c3: c3.idempotent, st: row3['V4 Choice Email Status'] }));
  // owner retry tool: retries only failed r8 sends
  const b4 = body([5, 0, 0, 0]); r.mail.failAll = true; r.post(b4); r.mail.failAll = false;
  const n1 = r.mail.sent.length;
  const done = r.call('retryFailedV4Emails');
  const again = r.call('retryFailedV4Emails');
  check('D19', 'Email', 'Owner retry tool resends only sends recorded as failed (here one results email), and running it again sends nothing', done.length === 1 && done[0].sent && r.mail.sent.length === n1 + 1 && again.length === 0, JSON.stringify({ done, again }));
}
{
  // Rows saved BEFORE r8 (results email still 'pending'): never emailed by the new code; original choice behaviour kept.
  const r = createRuntime({ source: SRC, props: { V4_DEV_EMAIL_REDIRECT_TO: 'owner-test@example.invalid' } });
  const b = body([5, 5, 5, 5]); r.post(b);
  const sh = r.sheet('V4 Responses'); const H = sh.rows[0];
  const set = (h, v) => sh.set(2, H.indexOf(h) + 1, v);
  set('V4 Email Flow', ''); set('Result Email Provider', 'pending'); set('Result Email Sent', ''); set('Result Email Error', ''); set('V4 Result Email Route', 'pending final choice');
  const n0 = r.mail.sent.length;
  const rr = r.post({ action: 'retryResultEmail', resultToken: b.resultToken });
  const probs = r.call('listV4EmailProblems'); const tool = r.call('retryFailedV4Emails');
  check('L1', 'Legacy rows', 'A row saved before r8 ("pending") is never emailed by the retry action or the owner tools', rr.code === 'NOT_RETRYABLE' && probs.length === 0 && tool.length === 0 && r.mail.sent.length === n0, JSON.stringify({ rr: rr.code, probs: probs.length }));
  const lf = r.post(fin(b.resultToken, b.submissionId, 'self_guided', 'self_work', 'independent'));
  check('L2', 'Legacy rows', 'If she herself returns and confirms, the original (live today) behaviour applies: one offer-specific email for her choice', lf.ok && lf.status === 'finalized' && r.mail.sent.length === n0 + 1 && /£117/.test(r.mail.sent[n0].body) && !/£147/.test(r.mail.sent[n0].body), JSON.stringify({ st: lf.status, n: r.mail.sent.length - n0 }));
}

// ---------- Email previews for every route (no sends) ----------
const previews = [];
{
  const r = rt();
  const mk = (s, o, g, sup, label) => {
    const b = body(s, { firstName: 'Synthia' });
    const before = emailLog(r).length; r.post(b);
    const res = o ? r.post(fin(b.resultToken, b.submissionId, o, g, sup)) : { ok: true };
    const log = emailLog(r).slice(before); const m = o ? log[1] : log[0];
    previews.push({ label, ok: res.ok, subject: m && m[4], text: m && m[6], html: m && m[7], token: b.resultToken });
  };
  mk([5, 0, 0, 0], null, null, null, 'Results email — Single — Quiet the Alarm (£37)');
  mk([0, 5, 0, 0], null, null, null, 'Results email — Single — Break the Pull (£37)');
  mk([0, 0, 5, 0], null, null, null, 'Results email — Single — Restore Self-Trust (£37)');
  mk([0, 0, 0, 5], null, null, null, 'Results email — Single — Return to You (£37)');
  mk([5, 4, 0, 0], null, null, null, 'Results email — Pair — Quiet the Alarm + Break the Pull (£74)');
  mk([5, 0, 4, 0], null, null, null, 'Results email — Pair — Quiet the Alarm + Restore Self-Trust (£74)');
  mk([5, 0, 0, 4], null, null, null, 'Results email — Pair — Quiet the Alarm + Return to You (£74)');
  mk([0, 5, 4, 0], null, null, null, 'Results email — Pair — Break the Pull + Restore Self-Trust (£74)');
  mk([0, 5, 0, 4], null, null, null, 'Results email — Pair — Break the Pull + Return to You (£74)');
  mk([0, 0, 5, 4], null, null, null, 'Results email — Pair — Restore Self-Trust + Return to You (£74)');
  mk([1, 1, 1, 1], null, null, null, 'Results email — Bare Minimum (£4.99)');
  mk([5, 5, 5, 5], 'bare_minimum', 'understand_him', null, 'Choice email — Complete result, chose The Bare Minimum (£4.99)');
  mk([5, 5, 5, 5], 'self_guided', 'self_work', 'independent', 'Choice email — Complete — Self-Guided (£117)');
  mk([5, 5, 5, 5], 'reality_reset', 'self_work', 'some_support', 'Choice email — Complete — Reality Reset (£147)');
  mk([5, 5, 5, 5], 'pattern_break', 'unsure', 'additional', 'Choice email — Complete — Pattern Break (£197)');
  mk([5, 5, 5, 5], null, null, null, 'Results email — Complete (£117 / £147 / £197)');
  const exp = [['£37', 'stan.store/Yourmindstory/p/quiet-the-alarm?'], ['£37', 'break-the-pull?'], ['£37', 'restore-self-trust?'], ['£37', 'return-to-yourself-7jc9h8lg?'],
    ['£74', 'quiet-the-alarm--break-the-pull?'], ['£74', 'quiet-the-alarm--restore-selftrust?'], ['£74', 'quiet-the-alarm--return-to-yourself?'], ['£74', 'break-the-pull--restore-selftrust?'], ['£74', 'break-the-pull--return-to-yourself?'], ['£74', 'restore-selftrust--return-to-yourself?'],
    ['The Bare Minimum', 'the-bare-minimum?'], ['The Bare Minimum · £4.99', 'the-bare-minimum?'], ['£117', 'choice/?o=self_guided'], ['£147', 'choice/?o=reality_reset'], ['£197', 'choice/?o=pattern_break'], ['£197', 'choice/?o=pattern_break']];
  const isChoice = i => i >= 11 && i <= 14;
  const bad = previews.map((p, i) => (p.ok && p.text && p.text.includes(exp[i][0]) && p.text.includes(exp[i][1]) && (isChoice(i) || p.text.includes('resultToken=' + p.token))) ? null : p.label).filter(Boolean);
  check('D13', 'Email', 'All 16 email variants render with the correct product, price and checkout link; every results email has her saved-results link', bad.length === 0, bad.join('; ') || '16/16');
  const complete3 = previews.slice(12, 15);
  check('D14', 'Email', 'Each Complete choice email shows only the chosen offer', complete3.every((p, i) => ['£117', '£147', '£197'].filter((x, j) => j !== i).every(x => !p.text.includes(x))), 'checked');
  check('D15', 'Email', 'No Bootcamp or Brevo reference in any email', previews.every(p => !/bootcamp|brevo/i.test(p.text + p.html)), 'checked');
}
fs.writeFileSync(path.join(__dirname, 'out/email-previews.json'), JSON.stringify(previews, null, 1));

// ---------- G. Isolation ----------
{
  const r = rt();
  r.post(body([4, 4, 4, 4]));
  check('G1', 'Isolation', 'Every spreadsheet open during the tests targeted only the DEV workbook ID', r.opened.every(x => x === '1xl41dlFS0Z0dZ3p9yXrVxu7NJHdoE6da7nckKiEB42o'), [...new Set(r.opened)].join(','));
  let e1 = ''; try { createRuntime({ source: SRC, sheetId: '1jO33mGOLAwxDuBxsEsJMsxW5ONa78rgjkMmlAqsZoGM', patch: s => s.replace("var V4_SHEET_ID = '1xl41dlFS0Z0dZ3p9yXrVxu7NJHdoE6da7nckKiEB42o'", "var V4_SHEET_ID = '1jO33mGOLAwxDuBxsEsJMsxW5ONa78rgjkMmlAqsZoGM'") }).call('verifyV4Connection'); } catch (e) { e1 = e.message; }
  check('G2', 'Isolation', 'DEV build pointed at the production workbook refuses before opening it', /production workbook is forbidden/.test(e1), e1);
  let e2 = ''; try { createRuntime({ source: SRC, title: 'Your Mind Story V4 Assessment & Funnel Tracking' }).call('verifyV4Connection'); } catch (e) { e2 = e.message; }
  check('G3', 'Isolation', 'DEV build refuses a workbook whose title is not the synthetic DEV title', /title mismatch/.test(e2), e2);
  let e3 = ''; try { createRuntime({ source: SRC, sheetId: '1MRK7_t-_HN8OCHpK8tm1E8QWXexo8ACLMTdsqZjaoXE', patch: s => s.replace("var V4_SHEET_ID = '1xl41dlFS0Z0dZ3p9yXrVxu7NJHdoE6da7nckKiEB42o'", "var V4_SHEET_ID = '1MRK7_t-_HN8OCHpK8tm1E8QWXexo8ACLMTdsqZjaoXE'") }).call('verifyV4Connection'); } catch (e) { e3 = e.message; }
  check('G4', 'Isolation', 'The V3 historical workbook can never be opened by this script', /V3 historical workbook/.test(e3), e3);
  const sync = r.get({ action: 'sync' });
  const m = r.post({ action: 'rematchPurchases' });
  const ev = r.post({ action: 'recordJourneyEvents', journeyId: 'x', submissionId: 'YMSV4-S-SYN-' + seq, events: [{ eventType: 'purchase_return_view', values: {} }] });
  check('G5', 'Isolation', 'DEV disables purchase sync/maintenance (no production Payhip/Stan data copied into DEV)', sync === 'sync disabled in development' && m.code === 'DEV_ACTION_DISABLED' && r.call('syncAllV3_').code === 'DISABLED_IN_DEV', `${sync} / ${m.code}`);
  const st = r.get({}); check('G6', 'Isolation', 'Status endpoint reports env DEV and the r8 build', st.env === 'DEV' && /r8/.test(st.backendBuild), st.backendBuild);
  const info = r.call('verifyV4Connection'); check('G7', 'Isolation', 'verifyV4Connection reports DEV workbook, suppress email mode and the V4 saved-result page', info.spreadsheetTitle.includes('Synthetic Only') && info.emailMode === 'suppress' && /v4-preview\/start/.test(info.resultPageUrl), JSON.stringify(info));
}

// ---------- r3: final Q2 rule, goal-mismatch email, new journey events ----------
{
  const r = rt();
  check('B6', 'Routing', 'Backend support map follows the final owner rule (recommend → £117 primary; additional/some → £147 primary + £197; independent → £117 only)',
    r.ctx.V4_RECOMMEND_PRIMARY_ === 'self_guided' && r.ctx.V4_SUPPORT_CHOICES_.recommend.primary === 'self_guided' && r.ctx.V4_SUPPORT_CHOICES_.additional.primary === 'reality_reset' && r.ctx.V4_SUPPORT_CHOICES_.some_support.primary === 'reality_reset' && JSON.stringify(r.ctx.V4_SUPPORT_CHOICES_.independent.allowed) === '["self_guided"]',
    JSON.stringify(Object.fromEntries(Object.entries(r.ctx.V4_SUPPORT_CHOICES_).map(([k, v]) => [k, v.primary]))));
  const scoredBare = previews[10].text, goalBare = previews[11].text;
  const finding = "isn't standing out strongly enough";
  check('D18', 'Email', 'Q1 "understand/change him": her confirmation email makes no low-score claim (locked rule) and links The Bare Minimum; the scored Bare Minimum results email keeps its approved finding unchanged',
    !goalBare.includes(finding) && !/score/i.test(goalBare) && scoredBare.includes(finding) && goalBare.includes('START WITH THE BARE MINIMUM') && !/\n\n\n/.test(goalBare), goalBare.slice(0, 240));
  const b = body([5, 5, 5, 5]); r.post(b);
  const ev = r.post({ action: 'recordJourneyEvents', resultToken: b.resultToken, submissionId: b.submissionId, events: [{ eventType: 'recommendation_video_play', values: { route: 'self_guided' } }, { eventType: 'post_result_question_answered', values: { step: 'q1' } }] });
  check('G12', 'Analytics', 'Backend accepts the new first-party events (video play, question answered)', ev.ok && ev.results.every(x => x.ok), JSON.stringify(ev.results));
}

// ---------- r4: submission performance (no read after first write) ----------
{
  const r = rt(); r.post(body([1, 1, 1, 1])); // warm-up row
  const b = body([5, 5, 4, 3]);
  OPS.log = []; OPS.on = true; const res = r.post(b); OPS.on = false;
  const firstW = OPS.log.findIndex(x => x.startsWith('W'));
  const readsAfter = OPS.log.slice(firstW).filter(x => x.startsWith('R'));
  const row = r.rows().find(x => x['Submission ID'] === b.submissionId);
  const fe = r.sheet('Funnel Events').rows.slice(1).filter(x => x[6] === b.submissionId);
  check('S1', 'Performance', 'New submission does all reads before writing: zero reads after the first write (each such read forces a full dashboard recalculation)', res.ok && firstW >= 0 && readsAfter.length === 0, 'ops=' + OPS.log.join(' '));
  check('S2', 'Persistence', 'Submission row records the results email as sent and the furthest stage; funnel gets assessment_complete + email_captured with the right V4 row', row['Result Email Provider'] === 'dev-suppressed' && row['Result Email Sent'] && row['Canonical: Furthest Stage'] === 'email_captured' && fe.length === 2 && fe.map(x => x[2]).join() === 'assessment_complete,email_captured' && fe.every(x => +x[28] === r.rows().findIndex(y => y['Submission ID'] === b.submissionId) + 2), JSON.stringify({ prov: row['Result Email Provider'], stage: row['Canonical: Furthest Stage'], fe: fe.map(x => [x[2], x[28]]) }));
}

// ---------- DEV vs PROD link/transport configuration ----------
{
  const dev = previews[13].text;
  check('G9', 'Isolation', 'DEV email links carry no jid/sid, so the live /assessment/choice/ redirect cannot log DEV clicks into production', !/[?&](jid|sid)=/.test(dev), (dev.match(/https:\/\/yourmindstory[^\s]*/g) || []).join(' '));
  const PROD = '1jO33mGOLAwxDuBxsEsJMsxW5ONa78rgjkMmlAqsZoGM';
  const r = createRuntime({ source: SRC, sheetId: PROD, title: 'Your Mind Story V4 Assessment & Funnel Tracking', patch: s => s.replace("var V4_ENV = 'DEV';", "var V4_ENV = 'PROD';").replace("var V4_SHEET_ID = '1xl41dlFS0Z0dZ3p9yXrVxu7NJHdoE6da7nckKiEB42o'", "var V4_SHEET_ID = '" + PROD + "'") });
  const b = body([5, 5, 5, 5]); r.post(b);
  const f = r.post(fin(b.resultToken, b.submissionId, 'reality_reset', 'self_work', 'some_support'));
  const m = r.mail.sent[0] || {};
  check('G10', 'Release config', 'In-memory rehearsal of the PROD configuration: results email then choice email go via MailApp to the customer address only, with jid/sid tracking, once each; DEV log not used', f.ok && f.resultEmailSent && f.choiceEmailSent && r.mail.sent.length === 2 && r.mail.sent.every(x => x.to === b.email && /[?&]sid=YMSV4-S-SYN/.test(x.body)) && r.mail.sent[1].subject === 'Your next step towards feeling like yourself again' && !r.sheet('V4 DEV Email Log'), JSON.stringify({ to: m.to, subject: m.subject }));
  let e = ''; try { createRuntime({ source: SRC, patch: s => s.replace("var V4_ENV = 'DEV';", "var V4_ENV = 'PROD';") }).call('verifyV4Connection'); } catch (x) { e = x.message; }
  check('G11', 'Release config', 'PROD mode refuses to run against any workbook other than the production V4 workbook', /PROD mode must target/.test(e), e);

  // Stage 2 guard (V4_STAGE2_TEST_ONLY=yes): only the owner's +v4test inbox, never another row.
  const s2 = createRuntime({ source: SRC, sheetId: PROD, title: 'Your Mind Story V4 Assessment & Funnel Tracking', props: { V4_STAGE2_TEST_ONLY: 'yes' }, patch: s => s.replace("var V4_ENV = 'DEV';", "var V4_ENV = 'PROD';").replace("var V4_SHEET_ID = '1xl41dlFS0Z0dZ3p9yXrVxu7NJHdoE6da7nckKiEB42o'", "var V4_SHEET_ID = '" + PROD + "'") });
  const cust = body([5, 5, 5, 5]); // a non-test address (stands in for a real customer row written by the live version)
  const s2off = createRuntime({ source: SRC }); // (unused helper runtime keeps signatures identical)
  const rCust = s2.post(cust);
  check('G13', 'Stage 2 guard', 'With the Stage 2 guard on, a submission from any address other than the +v4test inbox is refused and writes nothing', rCust.code === 'STAGE2_TEST_ONLY' && !(s2.sheet('V4 Responses') || { rows: [] }).rows.some(x => JSON.stringify(x).includes(cust.submissionId)), rCust.code);
  const tb = body([5, 5, 5, 5]); tb.email = 'yourmindstory.co.uk+v4test1@gmail.com';
  const rt = s2.post(tb); const ft = s2.post(fin(tb.resultToken, tb.submissionId, 'pattern_break', 'self_work', 'additional'));
  const mt = s2.mail.sent[s2.mail.sent.length - 1] || {};
  check('G14', 'Stage 2 guard', 'With the guard on, a +v4test journey saves, finalises and emails only the +v4test inbox, with live tracking IDs', rt.ok && rt.resultEmailSent && ft.ok && ft.choiceEmailSent && s2.mail.sent.length === 2 && s2.mail.sent.every(x => x.to === tb.email), JSON.stringify({ rt: rt.code, ft: ft.status, to: mt.to }));
  // Simulate a pre-existing customer row (as the live version would have written) and try to touch it.
  s2.props.V4_STAGE2_TEST_ONLY = ''; const cust2 = body([5, 5, 5, 5]); s2.post(cust2); s2.props.V4_STAGE2_TEST_ONLY = 'yes'; const mailsBefore15 = s2.mail.sent.length;
  const fc = s2.post(fin(cust2.resultToken, cust2.submissionId, 'self_guided', 'self_work', 'independent'));
  const ev = s2.post({ action: 'recordJourneyEvent', eventType: 'result_view', resultToken: cust2.resultToken, submissionId: cust2.submissionId });
  check('G15', 'Stage 2 guard', 'With the guard on, finalise and journey events against a non-test row are refused; no email to that address', fc.code === 'STAGE2_TEST_ONLY' && ev.code === 'STAGE2_TEST_ONLY' && s2.mail.sent.length === mailsBefore15, JSON.stringify({ fc: fc.code, ev: ev.code }));
  void s2off;
}

// ---------- r7e: journey batches read her row once; choice fast path via cache ----------
{
  const evs = [
    { eventType: 'result_view', values: {} }, { eventType: 'result_view', values: {} },
    { eventType: 'recommendation_shown', values: { route: 'Return to Yourself', product: 'Return to Yourself' } },
    { eventType: 'post_result_question_answered', values: { step: 'q1', option_id: 'self_work' } },
    { eventType: 'post_result_question_answered', values: { step: 'q2', option_id: 'some_support' } },
    { eventType: 'checkout_click', values: { screen: 1, product: 'Return to Yourself' } },
    { eventType: 'checkout_click', values: { screen: 2, product: 'Return to Yourself' } },
    { eventType: 'offer_select_click', values: { option: 'reality_reset' } },
    { eventType: 'video_start', values: { route: 'complete' } },
    { eventType: 'result_step_view', values: { step: 3, total_steps: 4 } }];
  const b = body([5, 5, 5, 5]);
  const run = (patch) => {
    const r = patch ? createRuntime({ source: SRC, patch }) : rt(); r.post(b);
    r.post({ action: 'recordJourneyEvents', resultToken: b.resultToken, submissionId: b.submissionId, journeyId: b.journeyId, page: 'results', events: [{ eventType: 'result_view', values: {} }] });
    OPS.log = []; OPS.on = true;
    const res = r.post({ action: 'recordJourneyEvents', resultToken: b.resultToken, submissionId: b.submissionId, journeyId: b.journeyId, page: 'results', analyticsConsent: 'granted', events: evs });
    OPS.on = false;
    const fw = OPS.log.findIndex(x => x === 'W:V4 Responses');
    const reads = OPS.log.slice(Math.max(0, fw)).filter(x => x.startsWith('R:')).length;
    const row = r.rows().find(x => x['Submission ID'] === b.submissionId);
    row.__funnel = r.sheet('Funnel Events').rows.slice(1).filter(x => x[6] === b.submissionId).map(x => x.slice(0, 28));
    if (process.env.DBG && !patch) console.log(OPS.log.join(' '));
    return { res, reads, row };
  };
  const norm = o => JSON.stringify(o).replace(/\d\d\/\d\d\/\d{4} \d\d:\d\d:\d\d/g, 'T').replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/g, 'T');
  const buf = run(null), old = run(s => s.replace('if (locked) v4RowBufStart_(sheet, rowNumber);', ''));
  check('S3', 'Performance', 'A locked batch of 10 events no longer reads between writes to her row (each such read is a separate round trip to Google Sheets): reads after the first row write, buffered vs old', buf.res.ok && buf.reads < old.reads && buf.reads <= 3, 'buffered=' + buf.reads + ' old=' + old.reads);
  check('S4', 'Persistence', 'The buffered batch leaves her row and her Funnel Events exactly as the old event-by-event code does (first-wins stamps, Q1/Q2 IDs, checkout history with both screens, last event, no duplicate funnel rows)', norm(buf.row) === norm(old.row) && buf.row['V4 Post-Result Question 1 Option ID'] === 'self_work' && buf.row['V4 Post-Result Question 2 Option ID'] === 'some_support' && /1 @ .*2 @ /s.test(String(buf.row['Checkout Screen History'])) && buf.row['Last Journey Event'] === 'result_step_view' && buf.row.__funnel.length >= 2, JSON.stringify({ funnel: buf.row.__funnel.map(x => x[2]), hist: buf.row['Checkout Screen History'], last: buf.row['Last Journey Event'], same: norm(buf.row) === norm(old.row) }));
}
{
  const r = createRuntime({ source: SRC, props: { V4_DEV_EMAIL_REDIRECT_TO: 'owner-test@example.invalid' } }); const b = body([5, 5, 5, 5]); r.post(b);
  const f = fin(b.resultToken, b.submissionId, 'reality_reset', 'self_work', 'some_support');
  const first = r.post(f);
  const again = r.post(f);
  const other = r.post(fin(b.resultToken, b.submissionId, 'pattern_break', 'self_work', 'some_support'));
  const cached = r.ctx.CacheService.getScriptCache().get('v4fin:' + b.resultToken);
  check('G16', 'Choice', 'After her choice email is sent the token is marked in the script cache; repeating the same choice returns idempotent, a different choice is still refused; two emails in total (results + choice)', first.ok && cached === 'reality_reset' && again.ok && again.idempotent === true && other.code === 'EMAIL_ALREADY_SENT' && r.mail.sent.length === 2, JSON.stringify({ cached, again: again.status, other: other.code, mails: r.mail.sent.length }));
  const b2 = body([5, 5, 5, 5]); r.post(b2);
  const before = r.mail.sent.length;
  const ff = r.post(fin(b2.resultToken, b2.submissionId, 'self_guided', 'self_work', 'independent'));
  check('G17', 'Choice', 'A first choice (nothing cached) takes the locked path and is saved and emailed once', ff.ok && ff.status === 'finalized' && r.mail.sent.length === before + 1, JSON.stringify({ st: ff.status, mails: r.mail.sent.length - before }));
}

{
  const r = rt();
  const ev = ['assessment_capture_submit_click', 'assessment_capture_validation_error', 'assessment_capture_submit_error', 'assessment_capture_leave_during_save'];
  const res = r.post({ action: 'recordJourneyEvents', journeyId: 'YMSV4-J-SYN-cap', submissionId: 'YMSV4-S-SYN-cap', page: 'assessment', events: ev.map(e => ({ eventType: e, values: { step: e === 'assessment_capture_validation_error' ? 'invalid_email' : '' } })) });
  const log = r.sheet('V4 Journey Events').rows.slice(1).filter(x => x[4] === 'YMSV4-S-SYN-cap');
  check('E1', 'Analytics', 'The four email-screen events are accepted before a submission exists (logged as pre-submission, not UNKNOWN_EVENT), with only a fixed reason code', log.length === 4 && log.every(x => /PRE_SUBMISSION/.test(x[3])) && log[1][8] === 'invalid_email', JSON.stringify(log.map(x => [x[1], x[3], x[8]])));
}

fs.writeFileSync(path.join(__dirname, 'out/backend-results.json'), JSON.stringify(results, null, 1));
const failed = results.filter(x => !x.pass);
results.forEach(x => console.log((x.pass ? 'PASS ' : 'FAIL ') + x.id + ' ' + x.desc + (x.pass ? '' : '  <<< ' + x.evidence)));
console.log(`\n${results.length - failed.length}/${results.length} passed`);

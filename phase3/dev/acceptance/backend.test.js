// Simulated backend acceptance tests: real candidate .gs code executed against an in-memory DEV workbook.
'use strict';
const fs = require('fs');
const path = require('path');
const { createRuntime } = require('./gas-mock');
const REPO = process.env.YMS_REPO || require('path').resolve(__dirname, '../../..');
const SRC = path.join(REPO, 'phase3/dev/YMS_V4_FINAL_CHOICE_DEV_CANDIDATE.gs');
const FRONT = fs.readFileSync(path.join(REPO, 'assessment/v4-preview/start/index.html'), 'utf8');
const Q = eval(FRONT.match(/const Q=(\[[\s\S]*?\n\]);/)[1]);

fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
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
  check('D1', 'Email', 'No email (sent or suppressed) at submission; V4 Result Email Route = pending', r.mail.sent.length === 0 && emailLog(r).length === 0 && r.rows()[0]['V4 Result Email Route'] === 'pending final choice' && !r.rows()[0]['Result Email Sent'], r.rows()[0]['V4 Result Email Route']);
  const dup = r.post(b);
  check('C2', 'Persistence', 'Resubmitting the same submission returns duplicate and writes no second row', dup.status === 'duplicate' && r.rows().length === 1, dup.status);
  const g = r.get({ action: 'getResult', resultToken: b.resultToken });
  check('C3', 'Persistence', 'getResult returns V4 version, token, scores and an unsaved decision', g.ok && g.assessmentVersion === 'YMS-ASSESSMENT-2026-V4' && g.decision && g.decision.saved === false && g.decision.questionsRequired === true && !('email' in g) && !('Email' in g), JSON.stringify(g.decision));
  // abandonment: journey events only
  r.post({ action: 'recordJourneyEvents', resultToken: b.resultToken, submissionId: b.submissionId, journeyId: b.journeyId, page: 'results', events: [{ eventType: 'result_view', values: {} }, { eventType: 'result_step_view', values: { step: 2 } }] });
  check('D2', 'Email', 'Abandoned journey (events only, no final choice) sends no offer email', r.mail.sent.length === 0 && emailLog(r).length === 0 && r.call('sendPendingV4ResultEmails').sent === 0, 'sent=0');
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
  check('D3', 'Email', 'Rejected requests sent nothing and saved no decision', emailLog(r).length === 0 && !r.rows()[0]['V4 Decision Saved UTC'], 'ok');
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
          row['V4 Result Email Route'] !== o || !row['V4 Decision Saved UTC'] || log.length !== 1 || r.rows().length !== 1 ||
          row['Quiet Score'] !== 4 || row['Total Score'] !== 15) bad.push(`persist ${g}/${s}/${o}`);
    }
  }
  check('B4', 'Routing', 'Every Q1 x Q2 x offer combination is accepted or refused exactly per the approved rules', bad.length === 0, `${total} combinations, ${okCount} accepted; failures: ${bad.join('; ') || 'none'}`);
  check('C6', 'Persistence', 'Accepted choices store Q1 and Q2 (ID + approved text) in separate columns, one email, one row, scores unchanged', !bad.some(x => x.startsWith('persist')), 'checked on each accepted combination');
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

// ---------- D. Email content, idempotency, failure, resume ----------
{
  const r = rt(); const b = body([4, 4, 4, 3]); r.post(b);
  const f = fin(b.resultToken, b.submissionId, 'reality_reset', 'self_work', 'additional');
  const r1 = r.post(f);
  const r2 = r.post(f); const r3 = r.post(f);
  const log = emailLog(r);
  check('D4', 'Email', 'Repeated identical final-choice requests produce exactly one email', r1.ok && r2.ok && r2.idempotent && r3.idempotent && log.length === 1, `responses ok=${r1.ok},${r2.ok},${r3.ok}; emails=${log.length}`);
  const t = String(log[0][6]);
  check('D5', 'Email', '£147 email contains only the Reality Reset offer, its price and redirect link; no other Complete offer', t.includes('Return to Yourself + Reality Reset | £147') && !t.includes('£117') && !t.includes('£197') && t.includes('/assessment/choice/?o=reality_reset'), t.match(/Return to Yourself[^\n]*/g));
  check('D6', 'Email', 'Email uses approved Phase 3 copy (subject + opening + sign-off) and the V4 campaign UTM', log[0][4] === 'Synthia, I’ve looked at your answers' && t.includes('I’ve looked at your answers.') && t.includes('With care,\nOnye\nYour Mind Story\nCognitive Behavioral Hypnotherapist') && t.includes('utm_campaign=v4_result_email') && !t.includes('v3_result_email'), log[0][4]);
  check('D7', 'Email', 'Email includes the saved-result link carrying this result token', t.includes('resultToken=' + b.resultToken), (t.match(/https:[^\s]*resultToken=[^\s]*/) || [''])[0]);
  const ch = r.post(fin(b.resultToken, b.submissionId, 'pattern_break', 'self_work', 'additional'));
  check('D8', 'Email', 'A different choice after the email is refused, returns the saved choice, and sends nothing', ch.code === 'EMAIL_ALREADY_SENT' && ch.savedFinalOfferOption === 'reality_reset' && emailLog(r).length === 1 && r.rows()[0]['V4 Result Email Route'] === 'reality_reset', JSON.stringify({ code: ch.code, saved: ch.savedFinalOfferOption }));
  const g = r.get({ action: 'getResult', resultToken: b.resultToken });
  check('C7', 'Persistence', 'getResult reports the saved decision (option, Q1, Q2, email state) for resume', g.decision.saved && g.decision.finalOfferOption === 'reality_reset' && g.decision.question1OptionId === 'self_work' && g.decision.question2OptionId === 'additional' && g.decision.resultEmailSuppressed === true, JSON.stringify(g.decision));
}
{
  // Real MailApp path (redirect mode): failure must not report success; retry sends once; choice can change before success
  const r = createRuntime({ source: SRC, props: { V4_DEV_EMAIL_REDIRECT_TO: 'owner-test@example.invalid' } });
  const b = body([5, 5, 5, 5]); r.post(b);
  r.mail.failAll = true;
  const f1 = r.post(fin(b.resultToken, b.submissionId, 'self_guided', 'unsure', 'recommend'));
  const row1 = r.rows()[0];
  check('D9', 'Email', 'Failed MailApp delivery returns ok:false/email_failed, records the error, no "sent" stamp', f1.ok === false && f1.status === 'email_failed' && !row1['Result Email Sent'] && /Simulated MailApp failure/.test(row1['Result Email Error']) && row1['V4 Result Email Route'] === 'self_guided', JSON.stringify({ ok: f1.ok, status: f1.status, err: row1['Result Email Error'] }));
  r.mail.failAll = false;
  const f2 = r.post(fin(b.resultToken, b.submissionId, 'pattern_break', 'unsure', 'recommend'));
  const f3 = r.post(fin(b.resultToken, b.submissionId, 'pattern_break', 'unsure', 'recommend'));
  check('D10', 'Email', 'After a failure she can resume (even with a different allowed offer); exactly one email is then sent, to the DEV redirect inbox only', f2.ok && f3.idempotent && r.mail.sent.length === 1 && r.mail.sent[0].to === 'owner-test@example.invalid' && /\[V4 DEV for synthetic\+/.test(r.mail.sent[0].subject) && r.mail.sent[0].body.includes('£197') && r.rows()[0]['V4 Result Email Route'] === 'pattern_break', JSON.stringify({ to: r.mail.sent.map(m => m.to), subj: r.mail.sent.map(m => m.subject) }));
  // stale "sending" marker
  const b2 = body([5, 5, 5, 5]); r.post(b2);
  const rowN = 3; const sh = r.sheet('V4 Responses'); const H = sh.rows[0];
  sh.set(rowN, H.indexOf('Result Email Provider') + 1, 'sending'); sh.set(rowN, H.indexOf('Result Email Error') + 1, 'sending since ' + new Date().toISOString());
  const s1 = r.post(fin(b2.resultToken, b2.submissionId, 'self_guided', 'self_work', 'independent'));
  sh.set(rowN, H.indexOf('Result Email Error') + 1, 'sending since ' + new Date(Date.now() - 11 * 60000).toISOString());
  const s2 = r.post(fin(b2.resultToken, b2.submissionId, 'self_guided', 'self_work', 'independent'));
  check('D11', 'Email', 'A send in progress blocks a concurrent duplicate; a stale (>10 min) marker allows recovery', s1.code === 'SEND_IN_PROGRESS' && s2.ok === true, `${s1.code} then ${s2.status}`);
  check('D12', 'Email', 'Transactional email ignores marketing consent=false (result still delivered)', r.mail.sent.length === 2, 'marketingConsent:false on all synthetic bodies');
}

// ---------- Email previews for every route (no sends) ----------
const previews = [];
{
  const r = rt();
  const mk = (s, o, g, sup, label) => {
    const b = body(s, { firstName: 'Synthia' }); r.post(b);
    const before = emailLog(r).length;
    const res = r.post(fin(b.resultToken, b.submissionId, o, g, sup));
    const log = emailLog(r).slice(before);
    previews.push({ label, ok: res.ok, subject: log[0] && log[0][4], text: log[0] && log[0][6], html: log[0] && log[0][7], token: b.resultToken });
  };
  mk([5, 0, 0, 0], 'scored_route', null, null, 'Single — Quiet the Alarm (£37)');
  mk([0, 5, 0, 0], 'scored_route', null, null, 'Single — Break the Pull (£37)');
  mk([0, 0, 5, 0], 'scored_route', null, null, 'Single — Restore Self-Trust (£37)');
  mk([0, 0, 0, 5], 'scored_route', null, null, 'Single — Return to You (£37)');
  mk([5, 4, 0, 0], 'scored_route', null, null, 'Pair — Quiet the Alarm + Break the Pull (£74)');
  mk([5, 0, 4, 0], 'scored_route', null, null, 'Pair — Quiet the Alarm + Restore Self-Trust (£74)');
  mk([5, 0, 0, 4], 'scored_route', null, null, 'Pair — Quiet the Alarm + Return to You (£74)');
  mk([0, 5, 4, 0], 'scored_route', null, null, 'Pair — Break the Pull + Restore Self-Trust (£74)');
  mk([0, 5, 0, 4], 'scored_route', null, null, 'Pair — Break the Pull + Return to You (£74)');
  mk([0, 0, 5, 4], 'scored_route', null, null, 'Pair — Restore Self-Trust + Return to You (£74)');
  mk([1, 1, 1, 1], 'bare_minimum', null, null, 'Bare Minimum — scored route (£4.99)');
  mk([5, 5, 5, 5], 'bare_minimum', 'understand_him', null, 'Bare Minimum — Complete result, Q1 "understand him" (£4.99)');
  mk([5, 5, 5, 5], 'self_guided', 'self_work', 'independent', 'Complete — Self-Guided (£117)');
  mk([5, 5, 5, 5], 'reality_reset', 'self_work', 'some_support', 'Complete — Reality Reset (£147)');
  mk([5, 5, 5, 5], 'pattern_break', 'unsure', 'additional', 'Complete — Pattern Break (£197)');
  const exp = [['£37', 'stan.store/Yourmindstory/p/quiet-the-alarm?'], ['£37', 'break-the-pull?'], ['£37', 'restore-self-trust?'], ['£37', 'return-to-yourself-7jc9h8lg?'],
    ['£74', 'quiet-the-alarm--break-the-pull?'], ['£74', 'quiet-the-alarm--restore-selftrust?'], ['£74', 'quiet-the-alarm--return-to-yourself?'], ['£74', 'break-the-pull--restore-selftrust?'], ['£74', 'break-the-pull--return-to-yourself?'], ['£74', 'restore-selftrust--return-to-yourself?'],
    ['The Bare Minimum', 'the-bare-minimum?'], ['The Bare Minimum', 'the-bare-minimum?'], ['£117', 'choice/?o=self_guided'], ['£147', 'choice/?o=reality_reset'], ['£197', 'choice/?o=pattern_break']];
  const bad = previews.map((p, i) => (p.ok && p.text && p.text.includes(exp[i][0]) && p.text.includes(exp[i][1]) && p.text.includes('resultToken=' + p.token)) ? null : p.label).filter(Boolean);
  check('D13', 'Email', 'All 15 email variants render with the correct product, checkout link and saved-result link; price shown wherever the approved copy shows one (approved Bare Minimum copy has no price line)', bad.length === 0, bad.join('; ') || '15/15');
  const complete3 = previews.slice(12);
  check('D14', 'Email', 'Each Complete email shows only the selected offer', complete3.every((p, i) => ['£117', '£147', '£197'].filter((x, j) => j !== i).every(x => !p.text.includes(x))), 'checked');
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
  const st = r.get({}); check('G6', 'Isolation', 'Status endpoint reports env DEV and the r2 build', st.env === 'DEV' && /r2/.test(st.backendBuild), st.backendBuild);
  const info = r.call('verifyV4Connection'); check('G7', 'Isolation', 'verifyV4Connection reports DEV workbook, suppress email mode and the V4 saved-result page', info.spreadsheetTitle.includes('Synthetic Only') && info.emailMode === 'suppress' && /v4-preview\/start/.test(info.resultPageUrl), JSON.stringify(info));
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
  check('G10', 'Release config', 'In-memory rehearsal of the PROD configuration: email goes via MailApp to the customer address, with jid/sid tracking, exactly once; DEV log not used', f.ok && f.resultEmailSent && r.mail.sent.length === 1 && m.to === b.email && /[?&]sid=YMSV4-S-SYN/.test(m.body) && !r.sheet('V4 DEV Email Log'), JSON.stringify({ to: m.to, subject: m.subject }));
  let e = ''; try { createRuntime({ source: SRC, patch: s => s.replace("var V4_ENV = 'DEV';", "var V4_ENV = 'PROD';") }).call('verifyV4Connection'); } catch (x) { e = x.message; }
  check('G11', 'Release config', 'PROD mode refuses to run against any workbook other than the production V4 workbook', /PROD mode must target/.test(e), e);
}

fs.writeFileSync(path.join(__dirname, 'out/backend-results.json'), JSON.stringify(results, null, 1));
const failed = results.filter(x => !x.pass);
results.forEach(x => console.log((x.pass ? 'PASS ' : 'FAIL ') + x.id + ' ' + x.desc + (x.pass ? '' : '  <<< ' + x.evidence)));
console.log(`\n${results.length - failed.length}/${results.length} passed`);

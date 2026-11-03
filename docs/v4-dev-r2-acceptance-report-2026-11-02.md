# V4 DEV candidate r2 — implementation and acceptance report (2 Nov 2026)

Branch `fix/v4-quiz-email-2026-11-01`, draft PR #17. Nothing merged, deployed, emailed or purchased. Production V4 workbook, V3 workbook and live Apps Script deployments untouched.

**Status: not release-ready.** Every simulated test passes (42 backend, 49 browser). No deployed end-to-end test has run, because no V4 DEV Apps Script deployment exists yet (owner action, section 3).

## 1. What was wrong and what changed

### Defects found in the r1 candidate and fixed

| # | Defect (r1) | Effect on a customer | Fix |
|---|---|---|---|
| 1 | Email copy was the unapproved "shorter 31 Oct" version, not `phase3/YMS_V3_VERSION25_FINAL_CHOICE_DEV.gs` | Wrong email text on every route | Approved email section copied verbatim from `phase3/voc-support-choice`. Only transport lines differ (diff in section 5) |
| 2 | `needsPostResultQuestions`, `stageDetails`, `finalDetails`, `proofDetails`, `guarantee` were block-scoped but used by the result navigation | ReferenceError on the second "Next" of every Single, Pair and Complete result; navigation locked, recommendation unreachable | Hoisted to function scope |
| 3 | Missing closing quote in `data-result-step="'+n+'>` | First element of every result panel swallowed into an attribute | Quote added |
| 4 | Frontend posted to `AKfycbyHiHPdms…` (live V4 deployment) | Any test submission would write to production | Fail-closed `V4_DEV_BACKEND` constant; refuses the two known live deployment IDs; sends nothing until a DEV `/exec` URL is set |
| 5 | Browser Back did not update the panel index | After Back, changing Q2 did not change the offer; refresh lost the new answer | Index re-read from the DOM on every navigation |
| 6 | Q1/Q2 not restored after refresh; no saved-result return on the V4 page | Refresh or email link lost the journey | Q1/Q2 restored from session; `?resultToken=` rebuilds the same personalised result from `getResult`, then shows the saved choice or lets her finish |
| 7 | Q2 "recommend" primary was £117, not a documented rule | Possible wrong primary offer | Uses the rule already implemented on Phase 3: Reality Reset £147 primary (see open issue 2) |
| 8 | Different offer after the email returned a dead-end error | She could not reach checkout | Shows her saved choice and its checkout link; no second email |
| 9 | Send state not idempotent across failures/crashes; choice could not change after a failed send | Duplicate or blocked emails | `sending` marker before MailApp, 10-minute stale recovery, choice replaceable until an email has gone |
| 10 | DEV `?action=sync` and `purchase_return_view` imported production Payhip/Stan purchases into the synthetic workbook | Real customer data copied into DEV | Sync and maintenance disabled when `V4_ENV = 'DEV'` |
| 11 | DEV email links carried `jid`/`sid`, so `/assessment/choice/` would log DEV clicks to the production V4 deployment | Production workbook writes from DEV | `jid`/`sid` omitted in DEV only |
| 12 | GA4 `assessment_option_click` carried `option_index` | Raw scored answers sent to GA4 | Parameter removed from GA4 (still recorded first-party) |
| 13 | Email UTM campaign `v3_result_email` | V4 attribution wrong (audit item 7) | `v4_result_email` |
| 14 | Q2 answers used curly apostrophes; not validated server-side | Stored text ≠ approved wording | Approved wording exactly; backend validates Q1/Q2 IDs and text and stores canonical text |
| 15 | Single-stage Stan links used `YourMindStory` capitalisation | Inconsistent with every other link | Normalised to `Yourmindstory` (same as Phase 3 fix); all verified live |

### Not changed
Scored questions, wording, order, scoring, thresholds, stage names, result explanations, 29 Oct design, progressive panels, testimonials, consent wording, prices, offer descriptions, guarantee wording. No Bootcamp. No Brevo.

## 2. Changed files

- `assessment/v4-preview/start/index.html`
- `phase3/dev/YMS_V4_FINAL_CHOICE_DEV_CANDIDATE.gs` (build `2026-11-02-v4-final-choice-dev-candidate-r2`)
- `phase3/dev/acceptance/*` — test harness (in-memory Apps Script runtime, local server, backend and browser suites, preview builder)
- `docs/v4-dev-r2-acceptance-report-2026-11-02.md` (this file)

## 3. Development environment

| Item | State |
|---|---|
| DEV workbook | `1xl41dlFS0Z0dZ3p9yXrVxu7NJHdoE6da7nckKiEB42o`, "YMS V4 DEV Assessment - Synthetic Only - 2026-11-02", owned by yourmindstory.co.uk@gmail.com, owner-only. V4 Responses A:DU headers present, 0 data rows. Verified 2 Nov via Drive |
| V4 DEV Apps Script project | **Does not exist.** Only "YMS Phase 3 DEV - Isolated Backend" (V3 schema) and "YMS Stan Purchase Sync" exist as standalone scripts |
| DEV deployment URL / version | None |
| Backend config | `V4_ENV='DEV'`, `V4_SHEET_ID` = DEV workbook, title-checked; production and V3 IDs refused. Email: suppressed and logged to a `V4 DEV Email Log` tab, or redirected to the address in script property `V4_DEV_EMAIL_REDIRECT_TO` |
| New columns | `getV3Sheet_` appends `V4 Post-Result Question 1 Option ID/Answer`, `…Question 2 Option ID/Answer`, `V4 Existing Barrier Answer` to the right of DU on first run. Nothing moves |

### Owner steps to create the DEV deployment (about 5 minutes)

1. Signed in as yourmindstory.co.uk@gmail.com, open script.google.com → **New project**. Name it `YMS V4 DEV - Isolated Backend`. Use a standalone project, not Extensions → Apps Script inside the DEV workbook (that workbook is a copy and may carry a copy of the production-bound script).
2. Replace all of `Code.gs` with the raw contents of `phase3/dev/YMS_V4_FINAL_CHOICE_DEV_CANDIDATE.gs` from this branch. Save.
3. Optional: Project Settings → Script properties → add `V4_DEV_EMAIL_REDIRECT_TO` = `yourmindstory.co.uk@gmail.com` to receive real DEV emails in your own inbox. Leave it out to suppress all sends.
4. Select `verifyV4Connection` → Run → approve the Google permission prompt. The log must show `"env":"DEV"`, the Synthetic Only title and `"responseRows":0`.
5. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone. Copy the `/exec` URL and send it back.

With that URL: set `V4_DEV_BACKEND` in the page, then run every route against the real deployment with synthetic `.invalid` addresses and re-run this report's tests as deployed tests.

## 4. Acceptance test report

Test kinds:
- **Static**: code reading and source diffs.
- **Simulated backend**: the real `.gs` file executed in Node against an in-memory copy of the DEV workbook schema, with mocked SpreadsheetApp, MailApp, LockService.
- **Simulated browser E2E**: the real page in headless Chrome (desktop 1280×900 and mobile 390×844), talking to that same backend code over HTTP. Stan, GA4 and Clarity requests intercepted, never reached.
- **Deployed E2E**: none yet (blocked, section 3).

Run: `cd phase3/dev/acceptance && npm i && npm run test:backend && npm run test:browser`.

| ID | Area | Requirement tested | Result | Kind |
|---|---|---|---|---|
| A1 | Scoring | Backend route/price/total match approved thresholds for all 2,401 stage-score combinations | PASS | Simulated backend |
| A2 | Scoring | Boundary: every stage 2 (total 8) -> Bare Minimum | PASS | Simulated backend |
| A3 | Scoring | Boundary: one stage exactly 3 -> Single £37 | PASS | Simulated backend |
| A4 | Scoring | Two stages -> Pair £74 named in stage order | PASS | Simulated backend |
| A5 | Scoring | Three stages at 3 (total 9, below 15) -> Complete £117 | PASS | Simulated backend |
| C1 | Persistence | Initial submission writes exactly one row with the client submission ID and result token | PASS | Simulated backend |
| D1 | Email | No email (sent or suppressed) at submission; V4 Result Email Route = pending | PASS | Simulated backend |
| C2 | Persistence | Resubmitting the same submission returns duplicate and writes no second row | PASS | Simulated backend |
| C3 | Persistence | getResult returns V4 version, token, scores and an unsaved decision | PASS | Simulated backend |
| D2 | Email | Abandoned journey (events only, no final choice) sends no offer email | PASS | Simulated backend |
| B1 | Routing | Final choice without Q1 on qualifying Complete is rejected | PASS | Simulated backend |
| B2 | Routing | Self-work without Q2 is rejected | PASS | Simulated backend |
| B3 | Routing | Q1 answer text not matching approved wording is rejected | PASS | Simulated backend |
| C4 | Persistence | Mismatched submission ID cannot finalise another person's result | PASS | Simulated backend |
| C5 | Persistence | Unknown result token is rejected | PASS | Simulated backend |
| D3 | Email | Rejected requests sent nothing and saved no decision | PASS | Simulated backend |
| B4 | Routing | Every Q1 x Q2 x offer combination is accepted or refused exactly per the approved rules | PASS | Simulated backend |
| C6 | Persistence | Accepted choices store Q1 and Q2 (ID + approved text) in separate columns, one email, one row, scores unchanged | PASS | Simulated backend |
| B5 | Routing | Single, Pair, Bare Minimum and below-threshold Complete accept only their own offers and never store Q1/Q2 | PASS | Simulated backend |
| D4 | Email | Repeated identical final-choice requests produce exactly one email | PASS | Simulated backend |
| D5 | Email | £147 email contains only the Reality Reset offer, its price and redirect link; no other Complete offer | PASS | Simulated backend |
| D6 | Email | Email uses approved Phase 3 copy (subject + opening + sign-off) and the V4 campaign UTM | PASS | Simulated backend |
| D7 | Email | Email includes the saved-result link carrying this result token | PASS | Simulated backend |
| D8 | Email | A different choice after the email is refused, returns the saved choice, and sends nothing | PASS | Simulated backend |
| C7 | Persistence | getResult reports the saved decision (option, Q1, Q2, email state) for resume | PASS | Simulated backend |
| D9 | Email | Failed MailApp delivery returns ok:false/email_failed, records the error, no "sent" stamp | PASS | Simulated backend |
| D10 | Email | After a failure she can resume (even with a different allowed offer); exactly one email is then sent, to the DEV redirect inbox only | PASS | Simulated backend |
| D11 | Email | A send in progress blocks a concurrent duplicate; a stale (>10 min) marker allows recovery | PASS | Simulated backend |
| D12 | Email | Transactional email ignores marketing consent=false (result still delivered) | PASS | Simulated backend |
| D13 | Email | All 15 email variants render with the correct product, checkout link and saved-result link; price shown wherever the approved copy shows one (approved Bare Minimum copy has no price line) | PASS | Simulated backend |
| D14 | Email | Each Complete email shows only the selected offer | PASS | Simulated backend |
| D15 | Email | No Bootcamp or Brevo reference in any email | PASS | Simulated backend |
| G1 | Isolation | Every spreadsheet open during the tests targeted only the DEV workbook ID | PASS | Simulated backend |
| G2 | Isolation | DEV build pointed at the production workbook refuses before opening it | PASS | Simulated backend |
| G3 | Isolation | DEV build refuses a workbook whose title is not the synthetic DEV title | PASS | Simulated backend |
| G4 | Isolation | The V3 historical workbook can never be opened by this script | PASS | Simulated backend |
| G5 | Isolation | DEV disables purchase sync/maintenance (no production Payhip/Stan data copied into DEV) | PASS | Simulated backend |
| G6 | Isolation | Status endpoint reports env DEV and the r2 build | PASS | Simulated backend |
| G7 | Isolation | verifyV4Connection reports DEV workbook, suppress email mode and the V4 saved-result page | PASS | Simulated backend |
| G9 | Isolation | DEV email links carry no jid/sid, so the live /assessment/choice/ redirect cannot log DEV clicks into production | PASS | Simulated backend |
| G10 | Release config | In-memory rehearsal of the PROD configuration: email goes via MailApp to the customer address, with jid/sid tracking, exactly once; DEV log not used | PASS | Simulated backend |
| G11 | Release config | PROD mode refuses to run against any workbook other than the production V4 workbook | PASS | Simulated backend |
| E1 | Routing | [desktop] Complete ≥15: Q1=self_work, Q2=independent → offers £117 (primary £117); chose £117; saved + 1 email + checkout | PASS | Simulated browser E2E |
| E2 | Routing | [mobile] Complete ≥15: Q1=self_work, Q2=additional → offers £147/£197 (primary £147); chose £197; saved + 1 email + checkout | PASS | Simulated browser E2E |
| E3 | Routing | [desktop] Complete ≥15: Q1=unsure, Q2=some_support → offers £147/£197 (primary £147); chose £147; saved + 1 email + checkout | PASS | Simulated browser E2E |
| E4 | Routing | [mobile] Complete ≥15: Q1=self_work, Q2=recommend → offers £117/£147/£197 (primary £147); chose £117; saved + 1 email + checkout | PASS | Simulated browser E2E |
| E5 | Routing | [desktop] Complete ≥15: Q1=unsure, Q2=recommend → offers £117/£147/£197 (primary £147); chose £197; saved + 1 email + checkout | PASS | Simulated browser E2E |
| E6 | Routing | [mobile] Complete ≥15: Q1=understand_him → offers £4.99 (primary £4.99); chose £4.99; saved + 1 email + checkout | PASS | Simulated browser E2E |
| E7 | Routing | [desktop] Complete ≥15: Q1=change_him → offers £4.99 (primary £4.99); chose £4.99; saved + 1 email + checkout | PASS | Simulated browser E2E |
| E8 | Routing | [desktop] stages 5,0,0,0 → £37 (3 panels), no Q1/Q2, saved + 1 email + correct checkout | PASS | Simulated browser E2E |
| E9 | Routing | [mobile] stages 0,6,0,0 → £37 (3 panels), no Q1/Q2, saved + 1 email + correct checkout | PASS | Simulated browser E2E |
| E10 | Routing | [desktop] stages 0,0,4,0 → £37 (3 panels), no Q1/Q2, saved + 1 email + correct checkout | PASS | Simulated browser E2E |
| E11 | Routing | [mobile] stages 0,0,0,3 → £37 (3 panels), no Q1/Q2, saved + 1 email + correct checkout | PASS | Simulated browser E2E |
| E12 | Routing | [desktop] stages 5,4,0,0 → £74 (3 panels), no Q1/Q2, saved + 1 email + correct checkout | PASS | Simulated browser E2E |
| E13 | Routing | [mobile] stages 5,0,4,0 → £74 (3 panels), no Q1/Q2, saved + 1 email + correct checkout | PASS | Simulated browser E2E |
| E14 | Routing | [desktop] stages 5,0,0,4 → £74 (3 panels), no Q1/Q2, saved + 1 email + correct checkout | PASS | Simulated browser E2E |
| E15 | Routing | [mobile] stages 0,5,4,0 → £74 (3 panels), no Q1/Q2, saved + 1 email + correct checkout | PASS | Simulated browser E2E |
| E16 | Routing | [desktop] stages 0,5,0,4 → £74 (3 panels), no Q1/Q2, saved + 1 email + correct checkout | PASS | Simulated browser E2E |
| E17 | Routing | [mobile] stages 0,0,5,4 → £74 (3 panels), no Q1/Q2, saved + 1 email + correct checkout | PASS | Simulated browser E2E |
| E18 | Routing | [desktop] stages 2,2,2,2 → £4.99 (1 panel), no Q1/Q2, saved + 1 email + correct checkout | PASS | Simulated browser E2E |
| E19 | Routing | [mobile] stages 0,0,0,0 → £4.99 (1 panel), no Q1/Q2, saved + 1 email + correct checkout | PASS | Simulated browser E2E |
| E20 | Routing | [desktop] Complete below 15 (3,3,3,0): no Q1/Q2, all three Complete choices, £197 saved + emailed | PASS | Simulated browser E2E |
| F1 | UX | [mobile] Continuing without answering shows an error and stays on the questions | PASS | Simulated browser E2E |
| F2 | UX | Q1 answered but Q2 missing still blocks continuation | PASS | Simulated browser E2E |
| F3 | UX | Browser Back from the recommendation returns to the questions with both answers kept | PASS | Simulated browser E2E |
| F4 | UX | Changing Q2 after going back updates the recommendation (additional £147 → independent £117 only) | PASS | Simulated browser E2E |
| F5 | UX | Refresh keeps the result, Q1/Q2 answers and the matching recommendation | PASS | Simulated browser E2E |
| F6 | Persistence | Refresh/back created no extra assessment rows and sent no email | PASS | Simulated browser E2E |
| D16 | Email | Triple-clicking Confirm produces one saved choice and one email | PASS | Simulated browser E2E |
| H1 | Checkout | Checkout button navigates to the saved offer's Stan URL (request intercepted, no purchase) | PASS | Simulated browser E2E |
| F7 | UX | No JavaScript errors across validation/back/refresh/confirm | PASS | Simulated browser E2E |
| R1 | Resume | Saved-result link for a finalised journey reopens the result and shows the saved choice + its checkout (no new email) | PASS | Simulated browser E2E |
| D17 | Email | Abandoned after result: no offer email was sent | PASS | Simulated browser E2E |
| R2 | Resume | [mobile, new device] Saved link restores the same personalised result and she can complete the unfinished choice | PASS | Simulated browser E2E |
| R3 | Resume | Restored result keeps the personalised desired-outcome wording from her saved answers | PASS | Simulated browser E2E |
| R4 | Resume | Choosing a different offer after the email shows her saved £147 choice and checkout, sends nothing new | PASS | Simulated browser E2E |
| R5 | Resume | Unknown saved-result token shows a clear error instead of a broken page | PASS | Simulated browser E2E |
| F8 | UX | Backend outage during confirm shows an error and TRY AGAIN; retry succeeds with one email | PASS | Simulated browser E2E |
| F9 | UX | If the assessment cannot be saved, the capture screen shows an error and allows retry (no result shown unsaved) | PASS | Simulated browser E2E |
| P1 | Privacy | With analytics consent, GA4 dataLayer / Clarity / outbound requests contain no name, email, answer text or Q1/Q2 text | PASS | Simulated browser E2E |
| P2 | Privacy | GA4 events no longer carry option_index (raw scored answers) | PASS | Simulated browser E2E |
| P3 | Analytics | With consent, GA4 receives assessment funnel events | PASS | Simulated browser E2E |
| P4 | Analytics | With consent, GA4 (gtag) and Clarity tags are requested | PASS | Simulated browser E2E |
| P5 | Analytics | First-party submission keeps marketing consent separate and preserves attribution fields | PASS | Simulated browser E2E |
| P6 | Analytics | Without analytics consent no GA4/Clarity tag loads and no dataLayer events fire; result still delivered | PASS | Simulated browser E2E |
| P7 | Analytics | Assessment-touch UTM attribution is saved first-party regardless of analytics consent; GA client ID not sent | PASS | Simulated browser E2E |
| P8 | Privacy | Result screens carry data-clarity-mask | PASS | Simulated browser E2E |
| X1 | Accessibility | Q1/Q2 selects have labels; result controls are named; touch targets ≥44px; no horizontal scroll at 390px | PASS | Simulated browser E2E |
| X2 | Accessibility | Confirmation dialog is aria-modal, focuses Confirm, and closes with Escape | PASS | Simulated browser E2E |
| G8 | Isolation | Committed page (DEV URL placeholder) sends nothing to any Apps Script endpoint and does not show an unsaved result | PASS | Simulated browser E2E |
| H2 | Checkout | No Bootcamp link or copy in the V4 page | PASS | Simulated browser E2E |

## 5. Email previews

15 variants rendered by the backend from approved copy with synthetic data (4 singles, 6 pairs, Bare Minimum on its own route and from Q1 "understand/change him", £117, £147, £197). Reviewed on the private artifact "V4 Result Email Previews". Diff of the email section against the approved source: only the MailApp transport lines, the saved-result base URL function and the removed `V3_DEV_MODE` lines differ; all copy constants and builders are byte-identical.

## 6. Checkout verification (live Stan pages, read-only, 2 Nov 2026; no purchase)

| Offer | Price on Stan | URL |
|---|---|---|
| The Bare Minimum | £4.99 | stan.store/Yourmindstory/p/the-bare-minimum |
| Quiet the Alarm | £37 | …/p/quiet-the-alarm |
| Break the Pull | £37 | …/p/break-the-pull |
| Restore Self-Trust | £37 | …/p/restore-self-trust |
| Return to Yourself (stage 4) | £37 | …/p/return-to-yourself-7jc9h8lg |
| 6 pairs | £74 each (page also upsells the £117 series) | …/p/quiet-the-alarm--break-the-pull, --restore-selftrust, --return-to-yourself; break-the-pull--restore-selftrust, --return-to-yourself; restore-selftrust--return-to-yourself |
| Self-Guided | £117 | …/p/return-to-yourself-eli637kx |
| + Reality Reset | £147 | …/p/return-to-yourself-reality-reset |
| + Pattern Break | £197 | …/p/return-to-yourself-pattern-break |

All 14 pages loaded with the matching product title and price. Page → URL mapping and email → `/assessment/choice/` → Stan allowlist mapping were verified in the simulated tests.

## 7. Remaining issues

1. **Blocked — DEV deployment.** Section 3 steps. Until then no deployed test, no real CORS/redirect/MailApp timing evidence.
2. **Decision — Q2 "recommend" primary.** Implemented Reality Reset £147 (Phase 3 rule). Previous V4 candidate used £117 with no owner record. Confirm or give the rule; it is one constant in the backend and one array in the page.
3. **Decision — Bare Minimum email after a Complete result.** The approved Bare Minimum email says one part of the cycle "isn't standing out strongly enough". For a woman with 3–4 strong stages who chose "understand him/change him" that sentence is untrue. Approved copy has no variant; Phase 3 behaves the same. Needs owner wording or explicit approval as is. The approved Bare Minimum email also has no price line.
4. **Guarantee footnote.** The result page shows "21-day money-back guarantee … within 21 days of purchase.*" but the asterisk has no footnote, and the Stan pages say "I'll refund you" without a period. Confirm the Stan terms say 21 days and supply the footnote text.
5. **Existing barrier.** No barrier question exists in the approved V4 flow, so `V4 Existing Barrier Answer` is always empty. Confirm none is intended.
6. **Public URL of the V4 page.** The saved-result link points to `/assessment/v4-preview/start/` (script property `V4_RESULT_PAGE_URL` overrides). That page is `noindex` and titled "(Test Only)". Decide the production path before release.
7. **Live risk on main, outside this branch.** The live `/assessment/v4-preview/start/` on main still posts to the production V4 deployment; anyone opening it writes to the production workbook. The live `/assessment/result/` still shows the superseded readiness/hesitation flow and queries only the V4 deployment, so V3 saved-result links may not resolve there. Not changed here (production).
8. **Minor.** When the backend is down at capture, the error appears after about 40 s of polling (existing design). On a £147-primary recommendation the price line reads "Return to Yourself Series · £147" (existing wording).

## 8. Production release checklist (only after separate owner approval)

Backup
- File → Make a copy of the production V4 workbook; record its ID.
- In the live V4 Apps Script project: copy the current code to a dated file; record the active deployment ID and version number.
- Record main's commit SHA for the site.

Deploy
1. In the live V4 project, paste the r2 backend; set `V4_ENV = 'PROD'` and `V4_SHEET_ID = '1jO33mGOLAwxDuBxsEsJMsxW5ONa78rgjkMmlAqsZoGM'`; set script property `V4_RESULT_PAGE_URL` to the chosen public V4 page.
2. Run `verifyV4Connection`: must show `env PROD`, the production title, and row count unchanged.
3. Deploy → Manage deployments → edit the existing web app deployment → New version. Keep the same `/exec` URL.
4. In the page, set the production endpoint (the fail-closed check must be updated to accept it) and publish the page at the chosen path; merge PR #17 only then.

Smoke tests (owner's own address, marked `?yms_test=1`)
- One Complete £147 run end to end: one email, correct offer, saved-result link reopens with the saved choice, checkout opens Stan £147 (do not pay).
- One £37 Single and one Bare Minimum run: one email each.
- Production workbook: new rows only at the bottom, Q1/Q2 in their own columns, no rows in other tabs changed.
- GA4 DebugView: events present, no names/emails/answer text.

Rollback
- Manage deployments → edit → select the recorded previous version → Deploy (same URL).
- Revert the site commit on main.
- Remove any smoke-test rows marked TEST.

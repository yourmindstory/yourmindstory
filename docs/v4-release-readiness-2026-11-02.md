# V4 release readiness, 2 November 2026 (evening)

> **Superseded 3 Nov 00:15:** see `v4-stage2-report-2026-11-03.md`. Owner decisions applied, Stage 2 passed on the real system, and the reporting split was rehearsed in DEV. Status: ready for the owner's release approval.

**Decision: NOT READY TO DEPLOY.** Stage 1 (deployed DEV) passed. Stage 2 (controlled test on the real V4 system) has not run and waits for the owner's go-ahead. Five owner decisions are open (section 6).

Branch `fix/v4-quiz-email-2026-11-01` (draft PR #17), head after this report. Nothing merged. The live website, the live V4 web app (Version 5) and the V3 system were not changed.

## 1. Real V4 workbook and Apps Script (read-only checks)

| Item | Finding |
|---|---|
| Workbook | `1jO33mGO…ZoGM` "Your Mind Story V4 Assessment & Funnel Tracking", owner yourmindstory.co.uk@gmail.com, owner-only sharing |
| Structure | 20 tabs. V4 Responses has 125 columns (A–DU), identical names and order to the code and to the DEV copy |
| Records | 15 response rows: 14 TEST (1 Nov 00:51–09:56) and 1 real customer (1 Nov 12:42, Single Stage, email sent). No duplicate submission IDs |
| Bound script | Project `1ekSm9AI…Dlf` ("Untitled project"), build `2026-11-01-v4-editable-email-fast-choice-v2`. Points to this exact workbook and refuses any other ID or title |
| Live web app | Deployment `AKfycbyHiHPdms…`, Version 5 (1 Nov 09:54), runs as yourmindstory.co.uk@gmail.com, access Anyone. Status endpoint answers with the same build |
| Triggers | None |
| Permissions on live script | 5 scopes, including full Gmail read/delete and external requests. Not needed by the backend |
| Live behaviour (old build) | Brevo attempted before MailApp; email deferral can be switched off by the browser. This is the build that emailed £117 before a £147 choice |
| Live speed | 33 recent V4 POSTs: median 26 s, 22 over 20 s, worst 56 s |
| Where customers are today | Public assessment on main (`/assessment/start/`) uses the V3 backend (`AKfycbzDtA92…`, V3 build 2026-10-28). Main's `/assessment/result/` and `/assessment/choice/` call the V4 backend |
| Preservation | SHA-256 fingerprints of all 10 data tabs at 20:19 UTC and again at 21:47 UTC: all unchanged |

## 2. DEV environment (created this evening)

| Item | Value |
|---|---|
| DEV project | `1RTzH009…dFzHJU` "YMS V4 DEV - Isolated Backend (synthetic only)", owner yourmindstory.co.uk@gmail.com |
| DEV web app | `https://script.google.com/macros/s/AKfycbwMVd8v5KaUM164fgW_qQzR7NsBkU7XiD63JkZGhOoerYA357ybQzz8ly1dQQiEWuF5/exec`, Version 2 = commit 7989a5e (build r5) |
| Code | Byte-identical to the branch file (SHA-256 checked on load) plus `appsscript.json` |
| Permissions | Pinned to 2 scopes: spreadsheets, script.send_mail. Approved by the owner |
| Workbook | DEV copy `1xl41dl…B42o`, title-checked; refuses the production and V3 IDs |
| Email | Script property `V4_DEV_EMAIL_REDIRECT_TO` = yourmindstory.co.uk@gmail.com. Every DEV email goes only there and is logged in the `V4 DEV Email Log` tab |
| Page | `assessment/v4-preview/start/` on the branch now calls the DEV web app only |

## 3. Results

### Deployed DEV over real HTTPS (Stage 1)

| ID | Check | Result |
|---|---|---|
| L0 | DEV web app answers, env DEV | PASS |
| L1 | 15 synthetic submissions saved, email deferred | PASS |
| L2 | 15 final choices saved and emailed (MailApp, redirected) | PASS |
| L3 | getResult returns saved choice, Q1, Q2 | PASS |
| L4 | Routes/prices: 4×£37, 6×£74, £4.99, Complete £117 base | PASS |
| L5–L11 | Missing token, idempotent repeat, change after email refused, duplicate submission, journey events (incl. video play), invalid Q1/Q2/offer rejected, abandoned journey no email, foreign submission ID refused | PASS |
| L12 | DEV refuses purchase sync and maintenance | PASS |
| Workbook | 17 synthetic rows, all TEST, no duplicates; Q1/Q2 in 5 new columns after DU; abandoned row "pending", no email; 34 funnel events; 3 journey events | PASS |
| Sent emails | The 16 delivered emails pass the same content checks as the previews (section 4) | PASS except section 4 gaps |
| UI journey (mobile) | Branch page → results 4.4 s → Q1 → Q2 "some support" → £147 primary, £197 alternative → video below first button, no autoplay, plays 720×1280 → choice + email 16 s → checkout Stan £147 | PASS |
| Saved-result link | Reopens same results, Q1/Q2 restored, shows saved £147 choice and checkout, no new email | PASS |

### Simulated suites on branch head
47/47 backend, 53/53 desktop + mobile browser. `cd phase3/dev/acceptance && npm i && npm run test:backend && npm run test:browser`.

<details><summary>All simulated checks</summary>

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
| G6 | Isolation | Status endpoint reports env DEV and the r5 build | PASS | Simulated backend |
| G7 | Isolation | verifyV4Connection reports DEV workbook, suppress email mode and the V4 saved-result page | PASS | Simulated backend |
| B6 | Routing | Backend support map follows the final owner rule (recommend → £117 primary; additional/some → £147 primary + £197; independent → £117 only) | PASS | Simulated backend |
| D18 | Email | Q1 "understand/change him" email omits the "isn't standing out" low-score finding (locked rule); scored Bare Minimum email keeps it unchanged | PASS | Simulated backend |
| G12 | Analytics | Backend accepts the new first-party events (video play, question answered) | PASS | Simulated backend |
| S1 | Performance | New submission does all reads before writing: zero reads after the first write (each such read forces a full dashboard recalculation) | PASS | Simulated backend |
| S2 | Persistence | Submission row carries email status "pending" and furthest stage; funnel gets assessment_complete + email_captured with the right V4 row | PASS | Simulated backend |
| G9 | Isolation | DEV email links carry no jid/sid, so the live /assessment/choice/ redirect cannot log DEV clicks into production | PASS | Simulated backend |
| G10 | Release config | In-memory rehearsal of the PROD configuration: email goes via MailApp to the customer address, with jid/sid tracking, exactly once; DEV log not used | PASS | Simulated backend |
| G11 | Release config | PROD mode refuses to run against any workbook other than the production V4 workbook | PASS | Simulated backend |
| E1 | Journey | [desktop] Complete ≥15 (5,5,4,3): Q1=self_work, Q2=independent → offers self_guided; video below first START MY SESSIONS; chose £117; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E2 | Journey | [mobile] Complete ≥15 (5,5,4,3): Q1=self_work, Q2=additional → offers reality_reset > pattern_break; video below first START MY SESSIONS; chose £197; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E3 | Journey | [desktop] Complete ≥15 (6,6,3,0): Q1=unsure, Q2=some_support → offers reality_reset > pattern_break; video below first START MY SESSIONS; chose £147; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E4 | Journey | [mobile] Complete ≥15 (5,5,4,3): Q1=self_work, Q2=recommend → offers self_guided > reality_reset > pattern_break; video below first START MY SESSIONS; chose £117; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E5 | Journey | [desktop] Complete ≥15 (6,0,6,6): Q1=unsure, Q2=recommend → offers self_guided > reality_reset > pattern_break; video below first START MY SESSIONS; chose £197; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E5b | Journey | [mobile] Complete ≥15 (5,5,4,3): Q1=self_work, Q2=recommend → offers self_guided > reality_reset > pattern_break; video below first START MY SESSIONS; chose £147; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E6 | Journey | [mobile] Complete ≥15 (5,5,4,3): Q1=understand_him → offers bare_minimum; no video; chose £4.99; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E7 | Journey | [desktop] Complete ≥15 (5,5,4,3): Q1=change_him → offers bare_minimum; no video; chose £4.99; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E8 | Journey | [desktop] stages 5,0,0,0 → £37: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E9 | Journey | [mobile] stages 0,6,0,0 → £37: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E10 | Journey | [desktop] stages 0,0,4,0 → £37: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E11 | Journey | [mobile] stages 0,0,0,3 → £37: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E12 | Journey | [desktop] stages 5,4,0,0 → £74: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E13 | Journey | [mobile] stages 5,0,4,0 → £74: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E14 | Journey | [desktop] stages 5,0,0,4 → £74: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E15 | Journey | [mobile] stages 0,5,4,0 → £74: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E16 | Journey | [desktop] stages 0,5,0,4 → £74: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E17 | Journey | [mobile] stages 0,0,5,4 → £74: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E18 | Journey | [desktop] stages 2,2,2,2 → £4.99: existing copy, no Q1/Q2, no video, saved + 1 email + checkout | PASS | Simulated browser |
| E19 | Journey | [mobile] stages 0,0,0,0 → £4.99: existing copy, no Q1/Q2, no video, saved + 1 email + checkout | PASS | Simulated browser |
| E20 | Journey | [desktop] Complete below 15 (3,3,3,0): locked results (3 findings) → no Q1/Q2 → £117 primary, £147/£197 alternatives, video after first button; chose £147 | PASS | Simulated browser |
| V1-desktop | Video | [desktop] Video does not load or play on its own; on play it streams (H.264 720×1280, ~10 min), records one play event, fits the screen | PASS | Simulated browser |
| V1-mobile | Video | [mobile] Video does not load or play on its own; on play it streams (H.264 720×1280, ~10 min), records one play event, fits the screen | PASS | Simulated browser |
| F1 | UX | [mobile] Continuing on Q1 without an answer shows an error and stays on Q1 | PASS | Simulated browser |
| F2 | UX | Continuing on Q2 without an answer shows an error and stays on Q2 | PASS | Simulated browser |
| F3 | UX | Browser Back from the recommendation returns to Q2 then Q1 with both answers kept | PASS | Simulated browser |
| F4 | UX | Changing Q2 after going back updates the recommendation (additional → £147 primary; recommend → £117 primary) | PASS | Simulated browser |
| F5 | UX | Refresh keeps the result, Q1/Q2 answers and the matching recommendation | PASS | Simulated browser |
| F6 | Persistence | Refresh/back created no extra assessment rows and sent no email | PASS | Simulated browser |
| F7 | UX | Switching Q1 to "change him" skips Q2, shows only The Bare Minimum and clears the saved Q2 answer | PASS | Simulated browser |
| D16 | Email | Triple-clicking Confirm produces one saved choice and one email | PASS | Simulated browser |
| H1 | Checkout | Checkout button navigates to the saved offer's Stan URL (request intercepted, no purchase) | PASS | Simulated browser |
| F8 | UX | No JavaScript errors across validation/back/refresh/confirm | PASS | Simulated browser |
| R1 | Resume | Saved-result link for a finalised journey reopens on the recommendation with the saved choice + checkout (no new email) | PASS | Simulated browser |
| D17 | Email | Abandoned after result: no offer email was sent | PASS | Simulated browser |
| R2 | Resume | [mobile, new device] Saved link restores the same locked results (name, findings, exact outcome) and she can finish the unfinished choice | PASS | Simulated browser |
| R3 | Resume | Choosing a different offer after the email shows her saved £147 choice and checkout, sends nothing new | PASS | Simulated browser |
| R4 | Resume | Unknown saved-result token shows a clear error instead of a broken page | PASS | Simulated browser |
| F9 | UX | Backend outage during confirm shows an error and TRY AGAIN; retry succeeds with one email | PASS | Simulated browser |
| F10 | UX | If the assessment cannot be saved, the capture screen shows an error and allows retry (no result shown unsaved) | PASS | Simulated browser |
| P1 | Privacy | With analytics consent, GA4 dataLayer / Clarity / outbound requests contain no name, email, answer or outcome text | PASS | Simulated browser |
| P2 | Privacy | GA4 events carry no option_index (raw scored answers) | PASS | Simulated browser |
| P3 | Analytics | With consent, GA4 receives funnel events including the video play | PASS | Simulated browser |
| P4 | Analytics | With consent, GA4 (gtag) and Clarity tags are requested | PASS | Simulated browser |
| P5 | Analytics | First-party submission keeps marketing consent separate and preserves attribution fields | PASS | Simulated browser |
| P6 | Analytics | First-party journey log accepted the video-play and question-answered events (no answer text) | PASS | Simulated browser |
| P7 | Analytics | Without analytics consent no GA4/Clarity tag loads and no dataLayer events fire; result still delivered | PASS | Simulated browser |
| P8 | Analytics | Assessment-touch UTM attribution is saved first-party regardless of analytics consent; GA client ID not sent | PASS | Simulated browser |
| P9 | Privacy | Result screens carry data-clarity-mask | PASS | Simulated browser |
| X1 | Accessibility | [mobile 390px] Q1/Q2 are labelled radio groups, keyboard-selectable, ≥44px targets; START MY SESSIONS buttons name their offer; video labelled; no horizontal scroll | PASS | Simulated browser |
| X2 | Accessibility | Confirmation dialog is aria-modal, focuses Confirm, and closes with Escape | PASS | Simulated browser |
| G8 | Isolation | Committed page targets only the V4 DEV web app and refuses both live deployment IDs (V3 and V4) | PASS | Simulated browser |
| H2 | Checkout | No Bootcamp link or copy in the V4 page | PASS | Simulated browser |

</details>

## 4. Email variations (15)

Rendered by the backend from the current approved copy (newer "1,900 women" version). Same results on the 16 emails actually sent.

| # | Variant | Offer, price, link | Newer copy | Personalised | "whether he's in your life or not" | 1,900 line | CTA before proof | Saved link | HTML = text |
|---|---|---|---|---|---|---|---|---|---|
| 1–4 | Single £37 (×4) | PASS | PASS | PASS | **FAIL** | PASS | PASS | PASS | PASS |
| 5–10 | Pair £74 (×6) | PASS | PASS | PASS | **FAIL** | PASS | PASS | PASS | PASS |
| 11 | Bare Minimum (scored) | PASS (no price in approved copy) | PASS | PASS | **FAIL** | **FAIL** | n/a | PASS | PASS |
| 12 | Bare Minimum (Complete + Q1) | PASS (no price) | PASS | PASS, low-score line omitted | **FAIL** | **FAIL** | n/a | PASS | PASS |
| 13–15 | Complete £117 / £147 / £197 | PASS, only the chosen offer | PASS | PASS | **FAIL** | PASS | PASS | PASS | PASS |

The FAILs need wording that isn't in the approved copy. None was invented.

## 5. Fixes made today (after the evening handover)

| Commit | Fix |
|---|---|
| 2a24cb8 | Plain-text saved-result label now matches the HTML button ("VIEW MY PERSONALISED RESULTS") |
| 2cbc023, f57fb12 | `appsscript.json` pins permissions to spreadsheets + send email; comments no longer trigger the full Gmail scope |
| 7989a5e | Submission writes without reading back (r5). Isolated submission 4.5 s. See section 6 item 5 |
| e5dc8cd | V4 preview page calls the DEV web app only |
| 7cada97 | Live HTTP contract test committed (`phase3/dev/acceptance/live-dev-contract.js`) |

The three evening commits from the owner account (117f6bb, 4dba0a1, b3667fb) were kept unchanged.

## 6. Outstanding before release

1. **Stage 2: controlled test on the real system** (owner go-ahead needed). Plan: save the release code in the real project; create a separate test deployment (Version 5 and the website untouched); up to 6 TEST journeys. Writes: up to 6 TEST rows in V4 Responses, matching TEST event rows, and 5 new columns after DU. Emails: up to 6, to yourmindstory.co.uk+v4test@gmail.com only. Re-check fingerprints afterwards.
2. **Email wording:** "whether he's in your life or not" is in none of the 15. The Bare Minimum emails have no "1,900 women" line and no £4.99 price. Supply text or confirm as is.
3. **Video on £37/£74:** the "four stages" line at about 7:30. Keep, trim, or remove from those routes.
4. **Guarantee footnote:** "within 21 days of purchase.*" has no footnote text.
5. **Speed:** back-to-back requests still take 18–26 s, because the reporting tabs (about 200 COUNTIFS/FILTER formulas over open-ended ranges) recalculate after every write. Live already has this (median 26 s). Option: move reporting to a separate workbook that reads the data. This changes the real workbook's layout, so it needs a decision.
6. **Live site on main:** `/assessment/result/` and `/assessment/choice/` call the V4 backend, so saved-result links in V3 emails are looked up in V4. Fix as part of release.
7. **Live script permissions:** narrowed only when the new code is released (manifest). Old broad access should then be removed in the Google Account, under "Third-party apps & services" (owner action).
8. **Public V4 page path** for the saved-result link (currently the preview path, set by script property `V4_RESULT_PAGE_URL`).

## 7. Release steps (after approval)

Backup: copy the real workbook; download the live project code (Project History); note Version 5.
Deploy: paste the release backend and `appsscript.json` into the real project, set `V4_ENV='PROD'` and the production `V4_SHEET_ID`, set `V4_RESULT_PAGE_URL`, run `verifyV4Connection` (must show PROD and 15+ rows unchanged), then Manage deployments → edit the live deployment → New version (same URL). Point the public page at the live URL and publish; merge PR #17.
Smoke test: one £147 journey with the owner's address; check row, email, saved link, checkout.
Rollback: Manage deployments → select Version 5 → Deploy; revert the site commit.

# September-to-V4 restoration: recovered requirements and code comparison
Date: 2026-11-01. Prepared for independent live verification in ChatGPT Work.

## Source hierarchy and limitation
1. Explicit owner instruction from 30 October: restore the complete September experience; retain the new design; only offers differ.
2. Recovered 30 October implementation objective: assessment → personalised result → conditional readiness/commitment questions → one clear recommendation → matching email → direct checkout. Preserve progressive result screens, routing, wording, buttons and conditional behaviour.
3. Recovered historical September £117 route: personalised pattern explanation, four stages in order, CTA `START MY SELF-GUIDED JOURNEY - £117` to Stan, result-email `View My Full Result` opening saved `mixed-result.html`.
4. Historical GitHub `quiz_2.html` has eight scored questions, relationship context, required “What is this costing you right now?” and lead/email step. Its precise September deployment provenance is NOT verified.
5. Current main `assessment/start/index.html` inspected 1 November. This is code evidence, NOT a visual live test.

## September restoration requirements (authoritative objective, not a demand to roll back newer improvements)
R1. Preserve approved assessment questions and scoring, and do not reintroduce discarded questions without evidence and approval.
R2. Progressive personalised result reveal, not one long result page.
R3. Recognise her specific pattern and explain what her answers mean.
R4. Explain the gap between understanding him and being able to respond differently; connect to desired outcome.
R5. Conditional readiness/commitment questions when specified by the original route, with their approved branching and navigation.
R6. One clear, fitting recommendation and direct checkout path, including correct stage sequence and price.
R7. Matching personalised email, saved-result return path and correct product CTA.
R8. Keep later approved design, mobile improvements, current £37/£74/£117/£147/£197 offers, tracking and customer support choices. Remove Bootcamp from active selling.
R9. Preserve attribution and reconcile actual purchases.
R10. Verify all routes with controlled end-to-end tests.

## Current V4 code findings
- R1 PARTIAL: eight scored questions present; historical score-by-score equivalence not yet independently proven.
- R2 PARTIAL: qualifying routes build three progressive `result-panel` screens. No qualifying stage uses a single panel. September screen-by-screen parity not verified.
- R3 PARTIAL: recognition and personalised output constructed; route-by-route content not verified.
- R4 PARTIAL: outcome and explanation present; exact historical sequence and copy not verified.
- R5 **POTENTIAL REGRESSION**: submission payload explicitly sets `readinessRequired:false`. Need verify whether conditional readiness is actually rendered elsewhere or was intentionally retired. Do not infer approval.
- R6 PARTIAL: qualifying result panel 1 includes recommendation, price, guarantee and purchase link; panels 2 and 3 add support, evidence and final CTA. September exact sequencing and destination parity not verified.
- R7 **CONFIRMED ISSUE PER LAUNCH AUDIT**: submission payload sets `deferResultEmail:false`; £117 email delivered before later £147 final selection. Frontend accepts backend `choice_recorded_after_email`. Check whether immediate result email was intentionally part of the approved journey; repair contradictory final-offer messaging without breaking immediate result delivery.
- R7 **NOT VERIFIED**: the historical saved-result email link `View My Full Result` and its return-path behaviour need comparison with current email.
- R8 PARTIAL: newer design and support choices present. Verify current approved copy and product links.
- R9 **CONFIRMED ISSUE PER LAUNCH AUDIT**: generated email UTM still `v3_result_email`; backend generator unavailable in GitHub. Paid-order matching and GA4/Clarity reconciliation unverified.
- R10 INCOMPLETE: one public mobile path passed, not all branches.

## Specific visual parity questions for Work (do not delegate historical reconstruction)
1. Does the visitor see the intended opening and a separate introduction before scored questions?
2. Are the eight scored questions, relationship context, personal-cost response, email capture and consent in the correct flow?
3. After email capture, is the personalised result revealed progressively with recognition → explanation → recommendation in the intended order? Note V4 puts offer/price/CTA on its first result panel.
4. Do any originally required conditional readiness/commitment gates still appear? Source says `readinessRequired:false`; check against recorded decision.
5. Does every route show the correct recommendation, clear checkout and appropriate saved-result email return?
6. Does support selection update the offer-specific email consistently?
7. Are the 3 result panels actually readable on a mobile device without excessive scrolling or hidden CTA?
8. Does the no-qualifying-stage one-panel route have the approved fallback?
9. Are Bootcamp links absent from the active funnel?
10. Can the exact September purchase-path behaviour be verified without rolling back improvements?

## Handoff
Work should compare the above source-derived requirements with the **live** V4 site and report PASS/FAIL/INTENTIONALLY CHANGED/NOT VERIFIED, with screenshot, URL, test journey ID and code location. Work should **not** research the original checklist again or change anything during the comparison phase. Return a precise list of missing/mismatched items for owner and assistant to approve repairs. Do not claim exact September parity where historical source provenance remains unverified.


## 1 November 23:19 implementation verification addendum

Scope: inspected `assessment/v4-preview/start/index.html` on `fix/v4-quiz-email-2026-11-01`. This is a static code review, not a successful customer-journey or backend test.

### Confirmed in the candidate frontend
- October eight scored question wording is retained; no full revert to September.
- Progressive result panels are present for qualifying routes.
- September readiness and barrier text is restored in the Complete route when at least three stage scores reach 3 and the total reaches 15.
- Both selections are required to advance to the offer screen on that route.
- A Complete offer is selected among £117, £147 and £197 and submitted via `finalizeResultV4` with `finalOfferOption` and `supportPreference`.
- Submission sets `deferResultEmail:true`, but successful delivery and the server's actual behaviour remain unverified.

### Remaining release blockers
1. **Authoritative V4 backend**: candidate still posts to the earlier `AKfycbyHiHPdms...` Apps Script URL, not the newer deployment provided by the owner. Do not swap endpoints until the newer deployment is confirmed to support the exact V4 submission/finalize contract, stored result token, email trigger, and idempotency.
2. **Decision logic**: the recommendation is computed from scores before readiness/barrier answers. Readiness is persisted at finalization but does not visibly alter the recommendation in the candidate frontend. This may conflict with the owner's requirement that readiness affect the offered next step. Obtain the approved branching rule, not a guessed rule.
3. **Barrier storage**: the September barrier answer is currently packaged into the `hesitation` payload field, rather than a separately verified backend column. Confirm the intended storage and email use; do not assert parity.
4. **Non-Complete routes**: readiness and barrier questions do not appear. This is a deliberate current conditional gate, but whether it matches every approved route remains unverified.
5. **Email**: confirm immediate result receipt/abandonment fallback, final selected-offer message, consent behaviour, no duplicate emails, correct `v4_result_email` UTM, and return link.
6. **Checkout**: verify actual product URLs, exact £37/£74/£117/£147/£197 choices, paid-provider reconciliation and guarantee terms (14-day versus 21-day unresolved).
7. **Browser**: perform end-to-end mobile and desktop runs for zero/one/two/three/four affected stages, both readiness outcomes, each barrier option, each Complete support tier, both consent states, refresh/back and abandoned selection. Record screenshots and test submission IDs.

### Release rule
Do not merge or deploy until the backend contract and decision rule are proven and every route has a PASS with a real result screen, persisted data, delivered email and correct checkout. Preserve live V3 and rollback.


## 1 November 23:52: approved owner implementation baseline (supersedes September Q1/Q2)

The owner has confirmed a **21-day** guarantee. Scored question order/copy/thresholds and 29 October visual/progressive design are frozen. Post-result question 1, on applicable routes, is **"Which sounds most like what you want now?"** Responses: self-work; understand him; change him; unsure. Understand-him and change-him must lead to **The Bare Minimum £4.99**. Self-work and unsure continue to question 2.

Question 2's heading is **"One more thing."** and its introductory paragraph is the exact 12-week, daily-audio and weekly-check-in wording supplied by the owner. The closing prompt is **"Would you like more personal support than this?"** Independent -> £117 self-guided. Additional support or some support -> £147 Reality Reset primary with £197 Pattern Break alternative. Unsure/recommend -> display all three Complete choices with one clear assessment-based primary. Continue score-qualified £37 Single and £74 Pair branches without changing stage scores. No Bootcamp.

The final selection must be persisted before the matching transactional MailApp email, and abandonment must not send offer-specific email. Keep original copy from `phase3/YMS_V3_VERSION25_FINAL_CHOICE_DEV.gs` (branch `phase3/voc-support-choice`), namely `RESULT_EMAIL_SINGLE_V3`, `RESULT_EMAIL_PAIR_V3`, `RESULT_EMAIL_COMPLETE_V3` and `COMPLETE_CHOICES_V3`. No Brevo, no new email copy. Delivery must be idempotent and resumable.

The user has identified V4 workbook `1jO33mGOLAwxDuBxsEsJMsxW5ONa78rgjkMmlAqsZoGM` as the sole **forward production** destination; **never** use it for synthetic tests. Preserve V3 customer records and saved result links. Keep post-result Q1, Q2 and existing barrier stored separately by result/submission ID. Do not merge barrier with generic hesitation.

### Verification completed this turn
- GitHub source fetched successfully and the four referenced approved-copy identifiers were found. Phase 3 source handles `finalizeResultV3`, **not** a V4 finalize action; it is not safely interchangeable with a V4 endpoint.
- The specified Google spreadsheet metadata was fetched, confirming the title **Your Mind Story V4 Assessment & Funnel Tracking** and tabs including V4 Responses, V4 Journey Events, V4 Sales Events. This is metadata verification only; no workbook edits.
- PR #17 remains open as a **draft** on `fix/v4-quiz-email-2026-11-01` against main.
- The isolated V4 HTML candidate has had its post-result question text and answer options replaced with approved Q1/Q2, superseded readiness overlay removed, and Q1/Q2 put in distinct finalization fields. **Not verified end-to-end; not deployed.**

### Still blocked before production
- Frontend routing and price/offer presentation must fully reflect Q1/Q2. The current candidate still builds the result offer from scores before the goal/support selection; the Q1 Bare Minimum fork and conditional Complete tiers are **not fully implemented**. Do not claim success.
- Backend contract `finalizeResultV4` must be verified against a genuine, isolated V4 Apps Script deployment, not substituted with the V3 reference. Dedicated Q1/Q2/barrier persistence, MailApp email idempotency, abandonment resume, and production workbook separation remain unverified.
- Synthetic-only test sheet identity not established, and no email HTML/plain previews have yet been generated.
- The correct checkout URLs must be verified, not inferred from the historical Stan catalog (the owner also previously used Payhip).
- Do not merge, deploy, send customer email or make a purchase. Obtain separate release approval after evidence, backups and rollback.


## 2 November 2026: bounded offer-routing and backend candidate update

Scope: updated the isolated PR #17 branch only, fix/v4-quiz-email-2026-11-01. No production site, Apps Script deployment or workbook was changed. The frontend route was reviewed statically; no customer submissions, checkout transactions or emails were sent.

### Implemented in the candidate

- Post-result Q1/Q2 appear only on the qualifying Complete route: at least three stage scores of 3+ and total score at least 15. Scored-question logic and £37 Single / £74 Pair routing are unchanged.
- Q1 understand-him and change-him answers route to The Bare Minimum (£4.99). Self-work and unsure continue to Q2.
- Q2 independent shows £117 Self-Guided only. Additional support and some support show £147 Reality Reset as primary and £197 Pattern Break as the alternative. Unsure shows all three Complete choices, with the score-derived £117 Self-Guided recommendation primary.
- The final offer determines the selected checkout link and is sent with distinct Q1, Q2 and existing-barrier payload fields. The generic hesitation field remains separate.
- Added phase3/dev/YMS_V4_FINAL_CHOICE_DEV_CANDIDATE.gs as a fail-closed source candidate. It has a placeholder for the V4 DEV spreadsheet ID and refuses to open a workbook until that placeholder is replaced. Its finalization logic stores Q1, Q2 and barrier answers in separate appended columns; emails only after the final offer is saved; disables the abandonment email fallback; rejects post-email offer changes; and uses MailApp for the active transactional delivery path.

### Still blocked; not verified

- The active V4 Apps Script deployment and the code version behind the frontend's current endpoint remain unverified. The candidate frontend endpoint has not been changed or exercised.
- There is no confirmed isolated V4 DEV workbook ID or deployment URL. The identified V4 workbook is the forward production workbook and must not receive synthetic submissions.
- The backend source candidate has only passed a syntax check; it has not been deployed or exercised against a DEV sheet. The V4 Sheets headers, saved-result retrieval, email timing/idempotency and field persistence remain unverified at runtime.
- All-route browser acceptance checks, actual email previews, saved-result resume, consent variations and checkout destination/price checks remain outstanding. No such checks were represented as passed.
- The MailApp copy is still drawn from the existing approved result-email templates; render-only previews must be inspected before release. No email was sent.

### Required next evidence

Provide or create, under the Your Mind Story Google account, an isolated V4 DEV workbook copied from the V4 schema and a separate Apps Script deployment configured only to that DEV workbook. Record its spreadsheet ID, script project ID, deployment ID and version. Until those exact identifiers are available, keep PR #17 as a draft and do not point the frontend at a backend or submit test data.


## 2 November 2026: recommendation and Bare Minimum email clarification

- The assessment scores determine the work scope. Q1 can redirect a high-scoring Complete result to The Bare Minimum because that is the goal she selected; this does not change or erase the score finding.
- Q2 determines the support presentation. For “I’m not sure where to start. I’d like you to recommend what would help me most,” the candidate presents all three Complete options with £117 Self-Guided primary and £147 Reality Reset / £197 Pattern Break as alternatives. The £117 primary follows the score-qualified Complete base recommendation. The scores do not measure whether someone needs 1:1 support, so they do not justify elevating £147 or £197 on their own.
- The low-score Bare Minimum email retains its approved finding. For a high-score Complete result redirected by Q1 to The Bare Minimum, the backend candidate now builds a separate finding naming the affected stages and echoing her selected goal. It no longer tells her that no stage is standing out.
- The uploaded 15-email preview was generated before this source change and shows the two Bare Minimum variants as identical. It is evidence of the old defect, not a preview of the updated candidate. Regenerate and review that pair from an isolated V4 DEV deployment before release. Do not send either email as a test.
- Complete email copy remains the approved template; no new Complete copy has been introduced. The higher-priority inconsistency is corrected in the source candidate, but its generated email still requires preview review.
- Static syntax check passes. No deployment, email send, synthetic submission, checkout transaction or production workbook write was performed.

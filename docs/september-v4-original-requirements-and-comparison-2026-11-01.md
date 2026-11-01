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

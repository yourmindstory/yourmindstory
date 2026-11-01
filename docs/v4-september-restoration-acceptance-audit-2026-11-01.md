# V4 restoration acceptance audit — 1 November 2026

## Objective
Restore the customer experience that worked during September sales without reverting later approved assessment questions, scoring, design, current offers or improved tracking.

## Confirmed from main branch
- Public V4 assessment source: `assessment/start/index.html`.
- Progressive results: for qualifying recommendations the code constructs three `result-panel` screens, with Next and Back controls and `result_step_view` tracking.
- Panel 1: personalised recognition, recommendation, price, guarantee and early purchase link.
- Panel 2: support explanation.
- Panel 3: client evidence and final CTA.
- For no qualifying stage the code builds a single result panel, not three.
- The results implementation currently supports a browser-back handler and a saved-result session state.
- The frontend recognises backend status `choice_recorded_after_email`. This is not a successful final-offer email consistency guarantee.

## Reported externally by V4 launch audit (verify in source systems)
- Public V4 mobile journey passed, including £147 support selection, saved result and Stan checkout link.
- A result email arrived but contained £117 Self-Guided before the final £147 selection.
- V4 email UTM links still used `utm_campaign=v3_result_email`.
- Full route coverage, GA4/Clarity reconciliation and paid-order matching were not completed.

## Acceptance checklist and status
1. Preserve newer approved questions and scoring: DO NOT CHANGE; independently regression-test.
2. Restore September's progressive customer experience: IMPLEMENTED structurally for qualifying routes; September exact screen order and copy NOT VERIFIED.
3. Recognition and personalisation: PRESENT in code; all route outputs NOT VERIFIED.
4. Reveal recommendation and early CTA: PRESENT in first panel; mobile visual comparison NOT VERIFIED.
5. Support and proof sequence: PRESENT in second/third panels; compare with approved content and current offer details.
6. Final support choice before results email: FAIL per launch audit; correct server-side sequencing and retest £117/£147/£197.
7. V4 campaign UTM: FAIL per launch audit; fix generated email links and test attribution.
8. All result/email/checkout routes: NOT VERIFIED.
9. First-party event, GA4 and Clarity matching: NOT VERIFIED.
10. Confirmed paid-order reconciliation: NOT VERIFIED.

## Required execution order
1. Preserve production backup and confirm live backend version.
2. Repair final-offer persistence/email ordering. A preliminary recommendation must never be emailed as final choice.
3. Correct V4 campaign UTM at email link generation, preserving source/medium and first-party identifiers.
4. Run controlled tests of every route and offer, checking email body, final offer, checkout link and events.
5. Compare September screens to V4 screen-by-screen, classify intentional improvements versus regressions, fix only confirmed regressions.
6. Reconcile one real paid order from provider confirmation to assessment journey without inventing attribution.
7. Record screenshots, timestamps, test IDs and pass/fail evidence. Sign off only when mandatory checks pass.

## Constraints
Do not roll back the assessment questions or alter scoring/routing without separate explicit approval. Do not merge unrelated draft PR #14 as a shortcut. Do not claim live email or payment verification from GitHub commits alone.

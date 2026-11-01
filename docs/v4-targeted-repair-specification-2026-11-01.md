# V4 targeted repair specification, 1 November 2026

## Source
Based on Work's September-to-V4 verification report received 1 Nov 10:48 UTC, plus inspection of current `assessment/start/index.html`. Do not reopen the historical requirements investigation. No live repairs have yet been made.

## Current code diagnosis
- V4 computes qualifying Complete readiness when selected offer price is £117/£147/£197, at least 3 stage scores >=3 and total >=15. The code creates the readiness select inside `v4OfferDecision(link,handoff)`, AFTER an offer CTA click. It then sends `finalizeResultV4`.
- Submission sets `deferResultEmail:false,readinessRequired:false`, before the user can select support. Hence the observed £117 result email before £147 final selection.
- Results construct three progressive panels. First panel contains personalised recognition, stage details, price, guarantee and purchase CTA; second contains support; third evidence and CTA.
- Frontend allows `choice_recorded_after_email`, so it cannot guarantee that an offer-specific email reflects the final choice.
- Backend email generator is not in the GitHub repository. Apps Script editor access is required to repair email and UTM safely.

## Implementation plan, ordered
1. **Backup and inspect backend**: Record deployed Apps Script version, source and rollback. Determine exact submission/finalize/email trigger semantics. Do not change scoring/questions/design.
2. **Readiness before final recommendation**: Preserve result recognition and progressive panels. For qualifying Complete routes, ask readiness after personalised recognition/explanation and BEFORE the final recommendation/price/CTA. For nonqualifying routes, do not add a readiness gate. Ensure one answered readiness value is persisted with submission and used by finalization; do not ask it again after clicking an offer. Preserve optional hesitation/commitment questions only if approved and applicable.
3. **Single clear recommendation and support choice**: Render the final personalised recommendation after readiness; make offer selection and checkout the subsequent step. Keep approved £37/£74/£117/£147/£197 pricing, names and links. Confirm whether price/CTA on the first result panel should move after readiness rather than just relabeling it.
4. **Email contract**: Keep prompt personalised result email delivery after capture, but do not claim an unchosen £117 option is the final selected support. Either send a neutral personalised result email first and a correctly deduplicated selected-offer confirmation after choice, or safely defer offer-specific email until final choice with a defined fallback for abandonment. Choose based on approved messaging and backend capabilities; verify no contradictions, consent violations, duplicates or lost results.
5. **UTM**: Update V4 email link generation from `v3_result_email` to `v4_result_email`, retaining original attribution and saved-result identity. Verify email links.
6. **Guarantee**: Compare live product terms/Payhip/Stan/approved copy. V4 says 21-day; previous restoration contract mentions 14-day. Do not change without verifying authoritative terms.
7. **Test**: All stage score boundaries, recommendation categories, complete readiness yes/no, optional hesitation, all offer prices, both consent states, browser back/refresh, saved-result return, delivered emails, correct checkout and backend retries. Test with controlled identities, avoid live customer sends.
8. **Tracking**: Reconcile first-party V4 events, GA4/Clarity (without PII), then a provider-confirmed paid order. Report missing attribution honestly.
9. **Release**: Retest on live mobile after backend and frontend deploy. Save screenshot/recording, journey IDs, delivered-email evidence, deployed versions and rollback path.

## Strict scope
Do not rewrite the questions, scoring, design, pricing, landing page or whole funnel. Do not merge old draft PR #14. Do not alter refund policy without source confirmation. Do not treat a completed submission as a purchase. Preserve accessibility and mobile navigation.

## Completion criteria
Work returns exact code locations changed, before/after journey map, backend version, live URLs, per-route tests, email proof, UTM proof, checkout proof, purchase-reconciliation evidence and PASS/FAIL status for R1-R10. If backend inaccessible, report the exact missing permission and do not claim completion.

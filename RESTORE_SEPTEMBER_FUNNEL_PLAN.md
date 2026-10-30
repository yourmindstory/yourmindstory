# September funnel restoration: implementation and measurement contract
Status: IN DEVELOPMENT. This document does not authorise deployment without end-to-end tests.
Baseline: main @ 4bcde1ae3654547a922f67732ed770916f556955
Historical comparison: 21-23 September 2026, using time-correct GitHub snapshots.
Branch: restore-september-funnel-2026-10-30

## Non-negotiable experience
- Preserve current visual design, accessibility and mobile responsiveness.
- Restore the actual historical question order, answer wording, progressive experience, email-capture timing, personalised result explanation, score thresholds and conditional readiness gate.
- Keep the distinction between the result summary, qualifying-stage explanation, readiness question(s), final recommendation and checkout.
- Adapt closed Bootcamp-specific commitment question and routing to current offers without representing the old question as unchanged.
- Today's approved prices: single £37, complete self-guided £117, Reality Reset £147, Pattern Break £197. Do not invent a pair price or silently change the product scope.
- No old purchase tokens, real customer email addresses or identifiable answers in fixtures, code or logs.
- Keep the existing live funnel on main until the new route has been independently verified.

## Event measurement contract
All events must be consent-gated according to the current consent policy; never log free-text mental-health responses, personal email addresses or raw tokens into GA4 or Clarity.
Use stable event_id and journey_id for deduplication/reconciliation; preserve submission_id in first-party backend only where appropriate.
Record timestamps in UTC, build/version, route, stage_count, question/step index and anonymous source attribution where allowed.
Never treat event receipt as proof that the next page rendered or payment succeeded.

Event lifecycle:
1. assessment_landing_view, assessment_start, assessment_resume, assessment_exit (best effort)
2. question_view, question_answer, question_back, question_validation_error, step_advance (indexes and answer-option IDs only; no sensitive answer text)
3. email_capture_view, email_capture_submit, email_capture_success, email_capture_error, consent_choice
4. assessment_submit_attempt, assessment_submit_success, assessment_submit_error, assessment_complete (only after persisted success)
5. result_load_attempt, result_load_success, result_load_error, result_step_view, result_step_next, result_step_back, result_exit
6. qualifying_stage_summary_view, readiness_gate_view, readiness_question_view, readiness_question_answer, readiness_gate_complete, readiness_gate_abandon (best effort)
7. recommendation_shown, recommendation_cta_click, alternative_offer_view, alternative_offer_click, offer_page_view, checkout_click, outbound_stan_click, outbound_payhip_click
8. purchase_webhook_received, purchase_verified, purchase_matched, purchase_unmatched, purchase_refunded (first-party server only)
9. email_result_queued, email_result_sent, email_result_failed, email_result_link_clicked, email_result_opened (only if supported and consent-compliant)
10. backend_event_failed, event_retry, event_deduplicated and version_mismatch for diagnostics.

## Required attributes and reporting
- UTC timestamp; anonymous journey/session ID; funnel version; page path; step index; route; offer/product; price; currency; referrer/UTM; consent status; event_id.
- Track GA4 and first-party event streams independently; Clarity is for consented UX observation, not transaction truth.
- Preserve acquisition attribution through quiz, result, offer page, external checkout and webhook, including direct/unknown where appropriate.
- Track click vs actual navigation vs checkout vs verified payment as separate stages.
- Dashboard segmented by traffic source, mobile/desktop, stage count, recommendation route, offer and funnel version.
- Report denominators and time windows consistently. Never compare V2 submissions against V3 starts as if they were equivalent.

## Acceptance tests
- Test each score/routing branch: 0, 1, 2, 3, 4 qualifying stages; threshold boundaries; readiness answers; missing/expired token.
- Test first-time and resumed visits, back/forward, reload, slow network, errors, mobile viewport, keyboard and screen-reader labels.
- Confirm every result is personalised from the stored submission and never leaks another person's answers.
- Confirm all four current offers resolve to the correct live checkout with exact approved price; do not submit a real payment.
- Test every email route using controlled test addresses, ensuring no customer automation is triggered.
- Verify event emission exactly once per meaningful action, consent restrictions, backend delivery, GA4 visibility, Clarity capture when permitted and webhook matching.
- Test failure/retry paths, including backend unavailable, duplicate click, duplicate webhook, ad blockers and navigation before event flush.
- Require written evidence of passed tests before merging into main.

# Funnel versions (assessment → offer)

| Version label (Experiment Version column) | Deployed (UK) | What changed |
|---|---|---|
| V4-november-september-flow | 8 Nov 2026 | September-style two-question layout, Bootcamp £497 + Self-Guided £117 |
| V4-november-september-flow (same label) | 25 Nov 2026 ~09:20 | Recommendation on the same screen as the result (no reveal click); email-choice buttons; no consent banner |
| V4-r10-bootcamp-copy-20261125 | 25 Nov 2026 21:00 UK | Owner-approved r10 copy: new whole-cycle result, new 2 OF 2 wording, new Bootcamp screen, Self-Guided alternative, details/guarantee below buttons; video removed; Self-Guided £117 → £127 at 00:00 UK 29 Nov |

## Brevo results-email templates (created 26 Nov 2026, inactive, tag yms-results-v5)
self_guided 152 · bootcamp 153 · single_qa 154 · single_bp 155 · single_rs 156 · single_ry 157 ·
pair_qa_bp 158 · pair_qa_rs 159 · pair_qa_ry 160 · pair_bp_rs 161 · pair_bp_ry 162 · pair_rs_ry 163 ·
bm_understand 164 · bm_change 165 · bm_low 166.
Params: FIRSTNAME, CHECKOUT_URL, RESULTS_URL, PRICE (self_guided only). Sender: Onye | Your Mind Story <hello@yourmindstory.co.uk>.

26 Nov 2026 00:30: all 15 replaced with the final Clarity Framework pack (subjects + preheaders, early/late buttons use params CHECKOUT_URL_TOP / CHECKOUT_URL_BOTTOM); new 167 = results only (fallback / no marketing consent).

## V5 results email (Brevo) — backend v15, 26 Nov 2026
- Deployed: Apps Script web app version 15, 26 Nov 2026 01:21 UK ("V5 Brevo results email (test mode)").
- Mode: script property `V5_RESULTS_EMAIL` = `test` (only `+v5test` addresses use Brevo). Everyone else stays on the Gmail flow until switched to `on`. Activation timestamp for `on`: not yet.
- One results email per journey, chosen from the saved row: single/pair/bm_low/self_guided (<15) at submission; Complete ≥15 waits for Q1 (understand/change → bm_*) or Q2 (self_work yes/think_so/not_sure → bootcamp; no or unsure → self_guided); offer click sends only if nothing sent yet; no answer after 10 min → results_only (167). No choice email for V5 rows.
- Duplicate guard: row claim `v5-pending` → `v5-sending` → `brevo`/`v5-failed` under the script lock. Failed sends retried by the 5-minute sweep, max 3 attempts.
- Links: `utm_campaign=v5_result_email`, `utm_content=<template>_early|_late|_results`; Self-Guided goes via /assessment/choice/?o=self_guided (jid/sid).
- New columns: V5 Email Template, V5 Email Sent UTC, V5 Brevo Message ID, V5 Email Attempts, V5 Email Trigger.
- Triggers: v5SweepPending every 5 min, v5SendSummary every 4 h (summary to yourmindstory.co.uk@gmail.com).
- Brevo: templates 152–167 activated; API key "yms v4 sync" given Transactional email permission (26 Nov 02:27).
- Test 26 Nov: 17 journeys through the real quiz (mobile viewport) → correct template on all 16 routes + fallback, one email each, duplicate submit/finalize sent nothing extra, all delivered to Primary inbox.

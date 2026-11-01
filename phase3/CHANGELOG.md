# Phase 3 change log

## 2026-11-01 — isolated implementation candidate

Branch: `phase3/voc-support-choice`

Changes:

- `assessment/start/index.html`: retained the 29 October assessment and progressive result flow; added the approved conditional readiness question and the approved four support-choice routes. Complete-offer choice now precedes result-email delivery. Non-complete £37, qualifying £74 and Bare Minimum routes retain their scored checkout.
- `assessment/result/index.html`: aligned saved-result access to the same readiness, support-choice, final-offer, email and checkout sequence.
- `phase3/YMS_V3_VERSION25_FINAL_CHOICE_DEV.gs`: added the final-choice save/finalize path to the supplied Version 25 source; result email delivery uses Google MailApp and is deferred until the selected offer has been saved. Email content is restricted to the selected Complete offer and includes saved-result access.

Commits:

- Frontend assessment: `839c127e642a0109c99cf7a3e0e75d5a052ed4b2`
- Saved-result page: `6b54477cdd856c7fbb054786ad118a4573b19010`
- Version 25 backend candidate: `7d66aa862ed454a53098d12ecb30d4c781922d06`

Verification and boundaries:

- JavaScript syntax checks passed for both page scripts and the Apps Script source (parsed as JavaScript).
- Remote branch files were fetched and matched the local development copies.
- No Apps Script deployment was created or changed. No production website, Apps Script, sheet, customer submission, email or checkout was touched.
- Frontend backend URLs remain `__SET_ISOLATED_APPS_SCRIPT_DEV_URL__`. A separate development deployment URL and safe data target must be established before end-to-end acceptance testing.
- No live flow, route behaviour, email delivery or checkout has been tested.

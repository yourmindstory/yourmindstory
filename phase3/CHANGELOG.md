# Phase 3 change log

## 2026-11-01 — isolated implementation candidate, not release-ready

Branch: `phase3/voc-support-choice`

The approved customer journey baseline is applied to the isolated candidate. No production website, live Apps Script deployment, V3 customer sheet, real customer email, or checkout transaction was changed or used.

### Requirements applied

- Only the two readiness questions at the end of the quiz change. All earlier quiz questions, wording, answer options, order and scoring remain as they were.
- Question 1: “Which sounds most like what you want now?” with four recovered answer routes:
  - Self-work: “I want help understanding myself, breaking the cycle and getting my mind back.”
  - Understand him: “I mainly want to understand him and what his behaviour means.”
  - Change him: “I mainly want help getting him back or changing his behaviour.”
  - Unsure: “I'm not sure yet.”
- Q1 wording and the Q1-to-offer route decision were recovered from prior approved conversation records, not from a surviving source commit. The specific restoration patch referenced in earlier notes is not present in this repository. Treat this provenance limitation as known.
- The two Q1 routes focused on understanding/changing him use The Bare Minimum (£4.99). Self-work and unsure continue to the approved 12-week support question and its four offer routes.
- Q2 wording, the four support answers, their £117/£147/£197 offer permissions, final-choice saving, saved-result access and direct checkout are retained.
- The 29 October design and progressive personalised explanation remain the candidate baseline. No Bootcamp route was added.
- The development Apps Script is pinned to the separate synthetic-only spreadsheet and blocks purchase sync, maintenance actions and email delivery.

### Isolated development resources

- Test spreadsheet: `1bxNPutXUvy62hCxBzkKBOFFQOCbEKXNtnn8WixsjWAg` — tabs `V3 Responses` and `V3 Journey Events`; verified header-only, with no synthetic or customer rows written.
- Apps Script project: `1RSP7Mxdd0ao_kGHDs4F8PsLGBREOSQkPnLOtXJoP0zs2Ev3DLnvYteCe`, titled “YMS Phase 3 DEV - Isolated Backend”, created under `yourmindstory.co.uk@gmail.com`. Candidate code is saved in the correct business account but is not deployed. An earlier Kaci-owned draft project (`1q3wcaTAy_tqtN6dsPxidOKEyrDS85zITXmB9CPwvd5cQWb7yntojd87-`) was not deployed and is not the active dev project.
- A Web App deployment was not completed. Google displayed its “Google hasn’t verified this app” OAuth warning. The warning was not bypassed. There is no dev deployment ID or endpoint URL yet; frontend API URL placeholders remain.

### Checks completed

- JavaScript syntax checks passed for both assessment page scripts and the Apps Script source.
- A local harness exercised the candidate Apps Script final-choice validation with synthetic in-memory rows: 16 route/validation checks passed, covering all support-answer offer permissions, both Bare Minimum branches, invalid offer rejection, Q1 answer validation, lower-score scored routes and development email suppression. Mock MailApp send count was zero.
- Checkout destination mapping was inspected in source; no checkout was opened and no transaction occurred.
- The 14 email-template preview artifact remains available for owner review. It contains HTML and plain text previews, uses synthetic data, and no email was sent.

### Still blocked before browser acceptance

- The deployed browser journey cannot be tested until the isolated Web App is authorized and deployed. Google’s unverified-app warning is the blocker. The candidate must not be tested against the production backend or production spreadsheet as a workaround.
- Therefore CORS, Apps Script persistence in the dev sheet, resume/retry, real browser consent behavior, and actual saved-result/email timing are not yet end-to-end verified.
- Production release remains out of scope until all acceptance checks pass and a separate release decision is made.

### Latest branch commits

- Backend isolation and Q1 routing: `4be46e952a62161c7ec4a8b91504fda725f33514`
- Assessment journey update: `440d487ae6c4d2f32501eefe33136f78cbf8f5ee`
- Saved-result journey update: `0fdbe79801d44476855e3d0fe15b34a14556f6a9`

## Previous Phase 3 artifacts

- Email previews: 14 variants — four £37 singles, six £74 pairs, three Complete choice emails (£117/£147/£197), and Bare Minimum. No real email was sent. The review artifact is in ChatGPT Library as “Your Mind Story result email previews”.
- The Pages API URL remains a development placeholder until a dev Web App endpoint exists.

## 2026-11-01 — development deployment and browser acceptance update

This entry supersedes the earlier statements above that the development Web App was not deployed and browser acceptance was blocked.

- Owner-provided development deployment: `AKfycbyd5qw34QrENt1QRsipO0b6o0G-FNpzKAHdOq5vHpYnhXRr1aILiocCtHPHn_LvaYzjiA`.
- Its read-only status response identified build `phase3-dev-2026-11-01`; the assessment candidate in `assessment/start/index.html` points to this development endpoint.
- Development spreadsheet remains `1bxNPutXUvy62hCxBzkKBOFFQOCbEKXNtnn8WixsjWAg`, the synthetic-only sheet under the Your Mind Story account. Browser acceptance uses synthetic `.invalid` addresses; development email delivery is suppressed.
- Added a branch-only GitHub Actions browser acceptance workflow and route harness. It checks that the earlier quiz question bank matches `main`, tests the four support answers and their allowed offers, both goal routes, saved-result persistence, final offer saving, email suppression, direct checkout URLs and retired Bootcamp absence. The synthetic checkout click is redirected to a local test sentinel; no Stan checkout or transaction is opened.
- The first full run passed the eight Complete support-choice combinations and both goal routes. It then exposed a scored £74 Pair naming mismatch: the candidate was sending a display title joined with “+” where the backend validates the canonical stage names joined with “→”. The candidate now sends canonical data values while keeping the existing display title and checkout URL.
- Latest run on commit `9db24a50456993e8766a2839c03296d7facc60e0` passed seven cases and then timed out waiting for the result panel on `unsure-pattern-break`. The corrected Pair, £37 Single and Bare Minimum browser routes have not yet passed on the corrected candidate.
- Acceptance is therefore incomplete. No production Pages settings, live Apps Script, V3 customer sheet, real email, or purchase transaction was used or changed.

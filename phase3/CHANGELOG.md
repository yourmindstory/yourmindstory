# Phase 3 change log

## 2026-11-01 — isolated implementation candidate, not release-ready

Branch: `phase3/voc-support-choice`

The approved customer journey baseline is applied to the isolated candidate. No production website, live Apps Script deployment, V3 customer sheet, real customer email, or checkout transaction was changed or used.

### Requirements applied

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
- Apps Script project: `1q3wcaTAy_tqtN6dsPxidOKEyrDS85zITXmB9CPwvd5cQWb7yntojd87-`, titled “YMS Phase 3 DEV - Isolated Backend”. Candidate code is saved in the project but is not deployed.
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

- Backend isolation and Q1 routing: `9ff1ec3bc12f79578080fcb05b98050e06d7c928`
- Assessment journey update: `440d487ae6c4d2f32501eefe33136f78cbf8f5ee`
- Saved-result journey update: `0fdbe79801d44476855e3d0fe15b34a14556f6a9`

## Previous Phase 3 artifacts

- Email previews: 14 variants — four £37 singles, six £74 pairs, three Complete choice emails (£117/£147/£197), and Bare Minimum. No real email was sent. The review artifact is in ChatGPT Library as “Your Mind Story result email previews”.
- The Pages API URL remains a development placeholder until a dev Web App endpoint exists.

# V4 Stage 2 and final changes — 2–3 November 2026 (late evening)

**Decision: READY FOR YOUR RELEASE APPROVAL.** Not deployed. Everything you approved has been built and retested, and Stage 2 passed on the real system. Nothing changes for customers until you say "release". At that point the release steps in section 6 run, and each one is reversible.

Supersedes the decision line in `v4-release-readiness-2026-11-02.md`.

## 1. Owner decisions applied

| Decision (2 Nov, 22:33) | Done |
|---|---|
| Emails: add the "whether he's in your life or not" positioning, the 1,900-women statement and the £4.99 price where appropriate | Positioning line *"Feel like yourself again, whether he's in your life or not."* is in all 13 hypnotherapy emails (£37, £74, £117, £147, £197), sitting above the price/offer. It is not in the ebook email. The Bare Minimum emails now show "The Bare Minimum · £4.99" and the verified 1,900-women sentence after the button. No other copy was changed. |
| Guarantee: the exact "MY PROMISE TO YOU" wording | Your commit `6cb5322` is kept unchanged. The old "within 21 days of purchase.*" line (with its orphan asterisk) is gone. |
| Video: no cutting; the same video on all five hypnotherapy routes | No change made. Same video, still optional, no autoplay, not on £4.99. |
| Stage 2: six controlled TEST journeys, no website change | Done, see section 3 |
| Speed: move reporting formulas to a separate workbook, DEV first | Rehearsed and verified in DEV, see section 4 |

## 2. Retests (backend r6b)

| Test | Result |
|---|---|
| Simulated backend suite | 50/50 (adds G13–G15 for the Stage 2 lock) |
| Simulated browser suite (all routes, mobile + desktop, video, tracking, accessibility) | 53/53 |
| Email check, 15 variants × 9 criteria | All pass. Positioning: 13/13 hypnotherapy emails. 1,900 line: 15/15. Price: 15/15. Button before social proof: 15/15. Ebook not described as hypnotherapy: 2/2 |
| Live DEV contract against the deployed DEV web app (r6) | 13/13 PASS, 16 emails redirected to your inbox |
| DEV web app updated to r6b (same URL) | Status reports DEV and the r6b build |

## 3. Stage 2 — controlled test on the real V4 system

**Setup.** Your real project's code was replaced with the release candidate (`phase3/release/YMS_V4_PROD_RELEASE_CANDIDATE.gs`, SHA-256 `8101e196…204a`). It is the DEV-tested code with only the environment, workbook ID and build name changed.
- **Permissions:** the manifest now pins two scopes (Sheets, send email as you). Before this it had no pinned scopes, so the old code was granted 5, including full Gmail.
- **Test deployment:** separate, Version 6, `AKfycbycQx32…uclhGew`. It is not linked from anywhere.
- **Stage 2 lock:** script property `V4_STAGE2_TEST_ONLY=yes`. While it is set, the new code accepts only `yourmindstory.co.uk+v4test…@gmail.com`, never touches any other row, and refuses purchase sync and maintenance actions.
- **Backup:** the previous code (`fast-choice-v2`, SHA-256 `adacb11d…e4b9`) is stored as an exact copy in the DEV project (`BACKUP_PROD_HEAD_…html`). It is also still preserved as Version 5.

**Live deployment untouched.** Before and after the test, the live V4 web app (`AKfycbyHiHPdms…`) still reported build `2026-11-01-v4-editable-email-fast-choice-v2`. Nothing on the website was changed.

| # | Check | Result |
|---|---|---|
| S0 | Test deployment answers with env PROD and the release candidate build | PASS |
| S1 | A non-test address is refused and nothing is written | PASS |
| S2 | All 6 TEST journeys saved to the real workbook with the email deferred | PASS |
| S3 | Routes and base prices: 3 × Complete £117, Single £37, Pair £74, Bare Minimum £4.99 | PASS |
| S4 | Journey events recorded (result view, question answered, video play) | PASS |
| S5 | Each final choice saved, then one email via MailApp to that journey's +v4test address | PASS (6 emails) |
| S6 | getResult returns the saved choice, Q1/Q2 and "email sent" | PASS |
| S7 | Repeating the same choice is idempotent and a different choice afterwards is refused | Idempotent PASS. The refusal came back as `OFFER_MISMATCH` (the test picked £197 on a Q2 "independent" journey, which is not an allowed offer there) rather than `EMAIL_ALREADY_SENT`. Either way no change was saved and no second email was sent. The `EMAIL_ALREADY_SENT` path itself passed live in DEV (L6). Test design note, not a defect. |
| S8 | Resubmitting the same assessment returns duplicate (no second row) | PASS |
| S9 | Purchase sync and maintenance refused during Stage 2 | PASS |

**Journeys** (all marked TEST in V4 Responses and Funnel Events):

| # | Journey | Address | Choice saved | Times (save / events / choice + email) |
|---|---|---|---|---|
| 1 | £117 Return to Yourself, Q2 independent | +v4test1 | self_guided | 4.1 s / 7.9 s / 6.8 s |
| 2 | £147 + Reality Reset, Q2 some support | +v4test2 | reality_reset | 2.5 s / 7.5 s / 4.5 s |
| 3 | £197 + Pattern Break, Q2 additional (alternative chosen) | +v4test3 | pattern_break | 3.2 s / 7.3 s / 5.3 s |
| 4 | £37 Quiet the Alarm | +v4test4 | scored route | 2.1 s / 6.3 s / 6.2 s |
| 5 | £74 Break the Pull + Return to You | +v4test5 | scored route | 4.2 s / 5.1 s / 6.6 s |
| 6 | £4.99 The Bare Minimum | +v4test6 | bare_minimum | 2.8 s / 6.5 s / 5.4 s |

The live system (old build) had a median of 26 s per request.

**Record preservation (real workbook).** All 11 data tabs were exported before (23:45 UTC) and after (23:54 UTC), and every existing row was compared cell by cell.

| Tab | Before → after | Existing rows changed | Added |
|---|---|---|---|
| V4 Responses | 15 → 21 rows; 125 → 130 columns | 0 (including the real 1 Nov customer) | 6 TEST rows. 5 new columns at the end: V4 Post-Result Question 1 Option ID / Answer, Question 2 Option ID / Answer, V4 Existing Barrier Answer |
| Funnel Events | 58 → 76 | 0 | 18 TEST rows |
| V4 Journey Events | 231 → 243 | 0 | 12 Stage 2 rows |
| Stan Purchases, Payhip Purchases, V4 Sales Events, Unmatched Purchases, Experiments, README, V4 Email Copy, Tracking Guide | unchanged | 0 | none |

## 4. Speed: reporting split rehearsed in DEV

**What it does.** The 8 dashboard tabs (V4 Dashboard, Question Flow, Sources, Readiness, Email, Support & Objections, Tracking Health and Funnel Report, 478 formulas) are copied into a separate reporting workbook. That workbook reads the data tabs through IMPORTRANGE (hidden mirror tabs). The dashboards are then removed from the data workbook, and no data tab is touched. The script is `phase3/dev/reporting-split/ReportingSplit.gs`.

**DEV result.**
- **Accuracy:** all 8 dashboards matched the originals cell for cell (4,791 cells, 0 differences). Four plain labels in Funnel Report needed an automatic restore step, which is now part of the script.
- **Speed (DEV workbook, ~40 rows):** saving a result took 0.3 s, both before and after. That gain already came from r5.
- **Journey event straight after a save:** 3.0–3.7 s before, 2.7–3.0 s after.
- **getResult:** 0.6–1.3 s before, 0.5–0.6 s after.
- The DEV reporting workbook is "YMS V4 DEV Reporting - Synthetic Only - 2026-11-02".

**Honest read.**
- The big speed fix was r5 (write once, no read-after-write). On the real workbook a save now takes 2–4 s, against a 26 s median before.
- The split adds a further 10–40% on the follow-up steps.
- The gain will grow as the real workbook fills, because those formulas cover open-ended ranges.
- It is safe and verified, so I recommend doing it as part of the release.
- The one change for you: you open the new reporting workbook to see the dashboards, instead of the tabs in the data workbook.

## 5. What stays as it is until release

- Real project head code is the release candidate. The Stage 2 lock is on and the live deployment is still Version 5.
- The website (main) is unchanged. The preview page on this branch still talks to the DEV backend only.
- The Stage 2 test deployment is still active but locked to the +v4test inbox.

## 6. Release steps (need your "release" go-ahead)

1. **Reporting split on the real workbook.** Run the same script against production. Compare every dashboard cell (must be 0 differences) before removing the dashboard tabs from the data workbook. You click "Allow access" once.
2. **Remove the Stage 2 lock.** Delete the `V4_STAGE2_TEST_ONLY` property and archive the Stage 2 test deployment.
3. **Point the live deployment at the new version.** Manage deployments → live deployment → new version. The URL stays the same, so main's result/choice pages keep working. One click rolls back to Version 5.
4. **Point the website at V4.** Merge PR #17 and switch the public assessment from V3 to the V4 page. Decide the public path: `/assessment/start/` replaced, or `/assessment/v4-preview/start/` renamed.
5. **Revoke the old Gmail grant.** In your Google Account → Third-party apps & services, remove the old grant for "Untitled project" (5 scopes). The new code only needs the 2 it asks for.
6. **Post-release check.** One real-path TEST journey, then re-check record preservation.

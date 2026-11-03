# V4 DEV candidate r3: locked copy, final Q2 routing and video (2 Nov 2026, evening)

Supersedes the r2 report for everything below. Branch `fix/v4-quiz-email-2026-11-01`, draft PR #17. Nothing merged, deployed, emailed or purchased.

**Status: not release-ready.** All simulated tests pass (45 backend, 53 browser). No deployed end-to-end test yet: the V4 DEV Apps Script deployment still does not exist (owner steps in the r2 report, section 3).

## 1. What changed in r3

| Area | Change | Source |
|---|---|---|
| Complete route results | Replaced with the locked results screen: name heading, findings, "What you want instead" with her exact Q12 answer, "What this means", CONTINUE TO MY NEXT STEP | YMS_V4_Locked_Four_Stage_Results.docx |
| Findings shown | Only her qualifying stages, in stage order (3 or 4 findings) | Locked doc: "where it's showing up most strongly for you" |
| Q1 and Q2 | Separate screens after results, approved wording, labelled radio buttons. Q1 "understand him / change him" skips Q2 | Locked results doc |
| Recommendation | Locked £117 / £147 / £197 copy verbatim; order personalised reason → programme → benefits → price → START MY SESSIONS → video → evidence (guarantee, testimonials) → alternatives | YMS_V4_Locked_Recommendation_Copy.docx |
| Q2 routing | independent → £117 only; additional / some support → £147 primary, £197 alternative; recommend → £117 primary, £147 and £197 alternatives. Complete below score 15 (no questions) shows the same as "recommend" | Owner decision, 2 Nov (final) |
| Video | Optional, no autoplay, `preload="none"`, directly below the first purchase button on £37, £74, £117, £147, £197. Not on £4.99 | Owner instruction |
| Video file | `assets/video/yms-v4-recommendation.mp4`: H.264 720×1280, 30fps, 10:00, 45MB, fast-start. Poster `yms-v4-recommendation-poster.jpg`. Original was HEVC 120fps, 295MB, which many browsers cannot play | Owner MP4 |
| Bare Minimum email after Q1 goal mismatch | Omits the one approved sentence "one part of the cycle isn't standing out strongly enough…" on this route only. Scored Bare Minimum email unchanged. No new words | Locked rule: "Do not … claim her scores are low" |
| Tracking | New first-party and GA4 (consent-gated) events `recommendation_video_play` and `post_result_question_answered`; no answer text | — |
| Single, Pair, Bare Minimum page copy | Unchanged | — |

Two copy gaps are handled without writing new copy:
- **£147 shown as an alternative** (Q2 "recommend" and Complete below 15): the three personalised lines ("your results suggest…", "You've also told me that having some personal support would help.", "That's why I recommend Return to Yourself with Reality Reset.") and the "HERE'S WHERE I RECOMMEND YOU START" eyebrow are left out, because she didn't say she wanted support. Everything else on the card is verbatim.
- **"Something else."** as her Q12 answer: the results screen shows "Something else." exactly, as instructed; the recommendation uses the existing mapping "change what this situation is doing to you".

## 2. Video content check

Read from the burned-in captions (OCR of every third of a second across all 10 minutes).

- No mention of 12 weeks, 21 days, prices, session lengths, Reality Reset, Pattern Break, workbook or guarantee. The 12-week concern does not arise.
- Mentions that apply to every offer: press play, weekly check-ins by email with a comments box, hypnotherapy works on the subconscious, Pavlov / conditioning, Jan's result ("the loop has gone").
- **Mismatch for £37 Single and £74 Pair:** about 7:30, "I've given you the four stages, and the hypnotherapy is going to work on those four stages." A Single buyer gets one stage, a Pair buyer two. The video is on those routes as instructed; this needs your decision before release (keep, trim that line, or remove the video from those two routes: one setting, `V4_VIDEO_ROUTES`).
- Jan is named and paraphrased. The approved email already links to Jan's story; confirm her consent covers video use.
- Length is 10 minutes against a 90–120 second draft script. Not a blocker; the video loads nothing until she presses play.

## 3. Results

Run: `cd phase3/dev/acceptance && npm i && npm run test:backend && npm run test:browser`. Browser runs cover desktop 1280×900 and mobile 390×844 in headless Chrome against the real backend code with an in-memory DEV workbook. Stan, GA4 and Clarity requests are intercepted, never sent.

| ID | Area | Requirement tested | Result | Kind |
|---|---|---|---|---|
| A1 | Scoring | Backend route/price/total match approved thresholds for all 2,401 stage-score combinations | PASS | Simulated backend |
| A2 | Scoring | Boundary: every stage 2 (total 8) -> Bare Minimum | PASS | Simulated backend |
| A3 | Scoring | Boundary: one stage exactly 3 -> Single £37 | PASS | Simulated backend |
| A4 | Scoring | Two stages -> Pair £74 named in stage order | PASS | Simulated backend |
| A5 | Scoring | Three stages at 3 (total 9, below 15) -> Complete £117 | PASS | Simulated backend |
| C1 | Persistence | Initial submission writes exactly one row with the client submission ID and result token | PASS | Simulated backend |
| D1 | Email | No email (sent or suppressed) at submission; V4 Result Email Route = pending | PASS | Simulated backend |
| C2 | Persistence | Resubmitting the same submission returns duplicate and writes no second row | PASS | Simulated backend |
| C3 | Persistence | getResult returns V4 version, token, scores and an unsaved decision | PASS | Simulated backend |
| D2 | Email | Abandoned journey (events only, no final choice) sends no offer email | PASS | Simulated backend |
| B1 | Routing | Final choice without Q1 on qualifying Complete is rejected | PASS | Simulated backend |
| B2 | Routing | Self-work without Q2 is rejected | PASS | Simulated backend |
| B3 | Routing | Q1 answer text not matching approved wording is rejected | PASS | Simulated backend |
| C4 | Persistence | Mismatched submission ID cannot finalise another person's result | PASS | Simulated backend |
| C5 | Persistence | Unknown result token is rejected | PASS | Simulated backend |
| D3 | Email | Rejected requests sent nothing and saved no decision | PASS | Simulated backend |
| B4 | Routing | Every Q1 x Q2 x offer combination is accepted or refused exactly per the approved rules | PASS | Simulated backend |
| C6 | Persistence | Accepted choices store Q1 and Q2 (ID + approved text) in separate columns, one email, one row, scores unchanged | PASS | Simulated backend |
| B5 | Routing | Single, Pair, Bare Minimum and below-threshold Complete accept only their own offers and never store Q1/Q2 | PASS | Simulated backend |
| D4 | Email | Repeated identical final-choice requests produce exactly one email | PASS | Simulated backend |
| D5 | Email | £147 email contains only the Reality Reset offer, its price and redirect link; no other Complete offer | PASS | Simulated backend |
| D6 | Email | Email uses approved Phase 3 copy (subject + opening + sign-off) and the V4 campaign UTM | PASS | Simulated backend |
| D7 | Email | Email includes the saved-result link carrying this result token | PASS | Simulated backend |
| D8 | Email | A different choice after the email is refused, returns the saved choice, and sends nothing | PASS | Simulated backend |
| C7 | Persistence | getResult reports the saved decision (option, Q1, Q2, email state) for resume | PASS | Simulated backend |
| D9 | Email | Failed MailApp delivery returns ok:false/email_failed, records the error, no "sent" stamp | PASS | Simulated backend |
| D10 | Email | After a failure she can resume (even with a different allowed offer); exactly one email is then sent, to the DEV redirect inbox only | PASS | Simulated backend |
| D11 | Email | A send in progress blocks a concurrent duplicate; a stale (>10 min) marker allows recovery | PASS | Simulated backend |
| D12 | Email | Transactional email ignores marketing consent=false (result still delivered) | PASS | Simulated backend |
| D13 | Email | All 15 email variants render with the correct product, checkout link and saved-result link; price shown wherever the approved copy shows one (approved Bare Minimum copy has no price line) | PASS | Simulated backend |
| D14 | Email | Each Complete email shows only the selected offer | PASS | Simulated backend |
| D15 | Email | No Bootcamp or Brevo reference in any email | PASS | Simulated backend |
| G1 | Isolation | Every spreadsheet open during the tests targeted only the DEV workbook ID | PASS | Simulated backend |
| G2 | Isolation | DEV build pointed at the production workbook refuses before opening it | PASS | Simulated backend |
| G3 | Isolation | DEV build refuses a workbook whose title is not the synthetic DEV title | PASS | Simulated backend |
| G4 | Isolation | The V3 historical workbook can never be opened by this script | PASS | Simulated backend |
| G5 | Isolation | DEV disables purchase sync/maintenance (no production Payhip/Stan data copied into DEV) | PASS | Simulated backend |
| G6 | Isolation | Status endpoint reports env DEV and the r3 build | PASS | Simulated backend |
| G7 | Isolation | verifyV4Connection reports DEV workbook, suppress email mode and the V4 saved-result page | PASS | Simulated backend |
| B6 | Routing | Backend support map follows the final owner rule (recommend → £117 primary; additional/some → £147 primary + £197; independent → £117 only) | PASS | Simulated backend |
| D18 | Email | Q1 "understand/change him" email omits the "isn't standing out" low-score finding (locked rule); scored Bare Minimum email keeps it unchanged | PASS | Simulated backend |
| G12 | Analytics | Backend accepts the new first-party events (video play, question answered) | PASS | Simulated backend |
| G9 | Isolation | DEV email links carry no jid/sid, so the live /assessment/choice/ redirect cannot log DEV clicks into production | PASS | Simulated backend |
| G10 | Release config | In-memory rehearsal of the PROD configuration: email goes via MailApp to the customer address, with jid/sid tracking, exactly once; DEV log not used | PASS | Simulated backend |
| G11 | Release config | PROD mode refuses to run against any workbook other than the production V4 workbook | PASS | Simulated backend |
| E1 | Journey | [desktop] Complete ≥15 (5,5,4,3): Q1=self_work, Q2=independent → offers self_guided; video below first START MY SESSIONS; chose £117; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E2 | Journey | [mobile] Complete ≥15 (5,5,4,3): Q1=self_work, Q2=additional → offers reality_reset > pattern_break; video below first START MY SESSIONS; chose £197; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E3 | Journey | [desktop] Complete ≥15 (6,6,3,0): Q1=unsure, Q2=some_support → offers reality_reset > pattern_break; video below first START MY SESSIONS; chose £147; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E4 | Journey | [mobile] Complete ≥15 (5,5,4,3): Q1=self_work, Q2=recommend → offers self_guided > reality_reset > pattern_break; video below first START MY SESSIONS; chose £117; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E5 | Journey | [desktop] Complete ≥15 (6,0,6,6): Q1=unsure, Q2=recommend → offers self_guided > reality_reset > pattern_break; video below first START MY SESSIONS; chose £197; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E5b | Journey | [mobile] Complete ≥15 (5,5,4,3): Q1=self_work, Q2=recommend → offers self_guided > reality_reset > pattern_break; video below first START MY SESSIONS; chose £147; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E6 | Journey | [mobile] Complete ≥15 (5,5,4,3): Q1=understand_him → offers bare_minimum; no video; chose £4.99; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E7 | Journey | [desktop] Complete ≥15 (5,5,4,3): Q1=change_him → offers bare_minimum; no video; chose £4.99; 1 saved row, 1 email, checkout | PASS | Simulated browser |
| E8 | Journey | [desktop] stages 5,0,0,0 → £37: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E9 | Journey | [mobile] stages 0,6,0,0 → £37: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E10 | Journey | [desktop] stages 0,0,4,0 → £37: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E11 | Journey | [mobile] stages 0,0,0,3 → £37: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E12 | Journey | [desktop] stages 5,4,0,0 → £74: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E13 | Journey | [mobile] stages 5,0,4,0 → £74: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E14 | Journey | [desktop] stages 5,0,0,4 → £74: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E15 | Journey | [mobile] stages 0,5,4,0 → £74: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E16 | Journey | [desktop] stages 0,5,0,4 → £74: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E17 | Journey | [mobile] stages 0,0,5,4 → £74: existing copy, no Q1/Q2, video directly below first purchase button, saved + 1 email + checkout | PASS | Simulated browser |
| E18 | Journey | [desktop] stages 2,2,2,2 → £4.99: existing copy, no Q1/Q2, no video, saved + 1 email + checkout | PASS | Simulated browser |
| E19 | Journey | [mobile] stages 0,0,0,0 → £4.99: existing copy, no Q1/Q2, no video, saved + 1 email + checkout | PASS | Simulated browser |
| E20 | Journey | [desktop] Complete below 15 (3,3,3,0): locked results (3 findings) → no Q1/Q2 → £117 primary, £147/£197 alternatives, video after first button; chose £147 | PASS | Simulated browser |
| V1-desktop | Video | [desktop] Video does not load or play on its own; on play it streams (H.264 720×1280, ~10 min), records one play event, fits the screen | PASS | Simulated browser |
| V1-mobile | Video | [mobile] Video does not load or play on its own; on play it streams (H.264 720×1280, ~10 min), records one play event, fits the screen | PASS | Simulated browser |
| F1 | UX | [mobile] Continuing on Q1 without an answer shows an error and stays on Q1 | PASS | Simulated browser |
| F2 | UX | Continuing on Q2 without an answer shows an error and stays on Q2 | PASS | Simulated browser |
| F3 | UX | Browser Back from the recommendation returns to Q2 then Q1 with both answers kept | PASS | Simulated browser |
| F4 | UX | Changing Q2 after going back updates the recommendation (additional → £147 primary; recommend → £117 primary) | PASS | Simulated browser |
| F5 | UX | Refresh keeps the result, Q1/Q2 answers and the matching recommendation | PASS | Simulated browser |
| F6 | Persistence | Refresh/back created no extra assessment rows and sent no email | PASS | Simulated browser |
| F7 | UX | Switching Q1 to "change him" skips Q2, shows only The Bare Minimum and clears the saved Q2 answer | PASS | Simulated browser |
| D16 | Email | Triple-clicking Confirm produces one saved choice and one email | PASS | Simulated browser |
| H1 | Checkout | Checkout button navigates to the saved offer's Stan URL (request intercepted, no purchase) | PASS | Simulated browser |
| F8 | UX | No JavaScript errors across validation/back/refresh/confirm | PASS | Simulated browser |
| R1 | Resume | Saved-result link for a finalised journey reopens on the recommendation with the saved choice + checkout (no new email) | PASS | Simulated browser |
| D17 | Email | Abandoned after result: no offer email was sent | PASS | Simulated browser |
| R2 | Resume | [mobile, new device] Saved link restores the same locked results (name, findings, exact outcome) and she can finish the unfinished choice | PASS | Simulated browser |
| R3 | Resume | Choosing a different offer after the email shows her saved £147 choice and checkout, sends nothing new | PASS | Simulated browser |
| R4 | Resume | Unknown saved-result token shows a clear error instead of a broken page | PASS | Simulated browser |
| F9 | UX | Backend outage during confirm shows an error and TRY AGAIN; retry succeeds with one email | PASS | Simulated browser |
| F10 | UX | If the assessment cannot be saved, the capture screen shows an error and allows retry (no result shown unsaved) | PASS | Simulated browser |
| P1 | Privacy | With analytics consent, GA4 dataLayer / Clarity / outbound requests contain no name, email, answer or outcome text | PASS | Simulated browser |
| P2 | Privacy | GA4 events carry no option_index (raw scored answers) | PASS | Simulated browser |
| P3 | Analytics | With consent, GA4 receives funnel events including the video play | PASS | Simulated browser |
| P4 | Analytics | With consent, GA4 (gtag) and Clarity tags are requested | PASS | Simulated browser |
| P5 | Analytics | First-party submission keeps marketing consent separate and preserves attribution fields | PASS | Simulated browser |
| P6 | Analytics | First-party journey log accepted the video-play and question-answered events (no answer text) | PASS | Simulated browser |
| P7 | Analytics | Without analytics consent no GA4/Clarity tag loads and no dataLayer events fire; result still delivered | PASS | Simulated browser |
| P8 | Analytics | Assessment-touch UTM attribution is saved first-party regardless of analytics consent; GA client ID not sent | PASS | Simulated browser |
| P9 | Privacy | Result screens carry data-clarity-mask | PASS | Simulated browser |
| X1 | Accessibility | [mobile 390px] Q1/Q2 are labelled radio groups, keyboard-selectable, ≥44px targets; START MY SESSIONS buttons name their offer; video labelled; no horizontal scroll | PASS | Simulated browser |
| X2 | Accessibility | Confirmation dialog is aria-modal, focuses Confirm, and closes with Escape | PASS | Simulated browser |
| G8 | Isolation | Committed page (DEV URL placeholder) sends nothing to any Apps Script endpoint and does not show an unsaved result | PASS | Simulated browser |
| H2 | Checkout | No Bootcamp link or copy in the V4 page | PASS | Simulated browser |

## 4. Remaining before release

1. **Create the V4 DEV Apps Script deployment** (r2 report, section 3) and send the `/exec` URL. Then rerun every route against it.
2. **Video on Single and Pair**: decide on the "four stages" line (section 2).
3. **Guarantee footnote**: "within 21 days of purchase.*" has no footnote text.
4. **Public V4 page path** for the saved-result link (r2 report, item 6).
5. **Live risk on main** (r2 report, item 7) remains until release.
6. **Video hosting**: 45MB served from GitHub Pages. Works, but a slow mobile connection will buffer. A video host would stream better; not required.

Release checklist: r2 report, section 8, plus: confirm `assets/video/` is published with the site.

# V4 live funnel investigation and repair, 3 November 2026

Branch `fix/v4-live-funnel-2026-11-03`. **Nothing in production was changed.** The live site still runs the 3 Nov release (backend Version 7, build r6b). Michelle and Victoria were not emailed and their records were not touched (all reads were CSV exports).

## Evidence sources

| Source | What it holds | Access |
|---|---|---|
| V4 Responses, Funnel Events, V4 Journey Events (production workbook) | Server-saved rows; first-party events (only what the browser managed to deliver) | Read-only CSV export |
| Apps Script Executions (production project) | Every request the backend received, with time and status | Read-only |
| GA4 property 539692861 | Only for visitors who accepted analytics. Michelle accepted; Victoria never answered the consent prompt | Read-only Events report, 3 Nov, by hour |
| Microsoft Clarity xl81ev553e | Recordings, only with consent | **Not checked:** the Clarity session has expired and needs your sign-in |

## 1. Michelle (Facebook, submitted 02:47:30)

- **Confirmed:**
  - Assessment saved, Complete route (scores 6/5/6/6), £117 base.
  - Results shown. The browser confirmed the save at 02:47:30 (doGet), and GA4 shows result screens 2, 3 and 4, `recommendation_shown`, scroll and her consent, all in the 02:00 hour.
  - She answered Q1 and Q2 (`post_result_question_answered` ×2) and saw the recommendation screen, with £117 Self-Guided first.
  - That means her Q2 was "independent" or "recommend". The page did not save which, because answers were only stored with a confirmed choice.
- **Confirmed she did not confirm an offer:** no `finalizeResultV4` request reached the backend, and every request between 02:37 and 06:06 completed without error.
- **Video:** GA4 has no `recommendation_video_play` in the 02:00 or 03:00 hour. GA4 hits are sent immediately and her other GA4 events arrived, so she very probably did not press play. First-party tracking can't confirm this either way (see 4).
- **START MY SESSIONS:** unknown. The live page does not record that click at all; it only records the later "Continue to my £117 option" click after confirmation.
- **Sales page / checkout:** none reached through V4. The Stan link only appears after a confirmed choice, which she never made. GA4 has no `primary_cta_click`, `recommendation_click` or `checkout_click` on 3 Nov. No purchase is recorded.
- **Lost tracking (confirmed):**
  - Her results-stage events were held in the browser and sent as one batch of 10 when she left the page (02:56:47).
  - The 11th event, `final_route_shown`, was pushed in the same call and never arrived.
  - Anything she did after that (video, START MY SESSIONS, Back) would also have been dropped.

## 2. Victoria (Stan Store link, submitted 06:06:10)

- **Confirmed:**
  - Assessment saved, Complete route (scores 4/5/4/6), £117 base.
  - Her browser was still running 2 seconds after submitting: the page's save check (doGet, 06:06:11) reached the backend.
  - The result screen is shown as soon as the save is confirmed, so it very probably rendered.
- **Unknown (tracking gap, not evidence she left):**
  - Her events stop at question 4 (06:02:39). Questions 5–15, the email capture and the whole results stage never arrived, yet the server saved her full submission.
  - Events waited for 60 seconds of inactivity, which never came while she was answering. They were then blocked during the save and held for the whole results stage.
  - The final "page hidden" send never arrived. In-app browsers (Stan / Instagram / TikTok) often close without one.
- **No consent answer**, so there is no GA4 or Clarity data for her.
- **Sales page / checkout:** no confirmed choice, so the V4 checkout link was never shown. No purchase is recorded.

## 3. Why both results emails are "pending"

- **Not a delivery failure.** The live backend sets `deferEmail = true` for every submission. Its own comment reads "V4 always waits for a persisted final offer".
- The email is built and sent only inside `finalizeResultV4_`, after she presses START MY SESSIONS → CONFIRM MY NEXT STEP.
- Neither woman confirmed a choice, so MailApp was never called. That is why Provider = `pending` and Sent/Error are blank.
- `sendPendingV4ResultEmails` exists but is a deliberate no-op ("an abandoned choice must never trigger an offer email"). There are no triggers.
- So **anyone who leaves before confirming an offer never receives her personalised results.** This conflicts with the business requirement.

## 4. What is broken in V4 (live)

| # | Defect | Root cause | Status on branch |
|---|---|---|---|
| D1 | Women who leave before choosing get no results email | Email deliberately deferred to the final choice; no fallback | Fallback built, **off by default** (owner decision, section 6) |
| D2 | Results-stage tracking lost | Events held from the results screen until a choice; on leaving, only 10 sent; 60 s debounce reset by every click; nothing sent during the save | Fixed: sent within ~1.5 s; paused only while a save is in flight; everything left sent with `sendBeacon` on hide/close |
| D3 | START MY SESSIONS and the confirm step not measured | No event on the first click, on Back, or on Confirm | Fixed: `offer_select_click`, `offer_confirm_cancel`, `offer_confirm_click`, `offer_confirm_error` (first-party + GA4 with consent) |
| D4 | Q1/Q2 answers lost unless she confirms | Answers stored only with the final decision | Fixed: option IDs saved as she answers; decision still overrides |
| D5 | `result_back_click` rejected | Missing from the backend allow-list (logged as UNKNOWN_EVENT) | Fixed |
| D6 | Video engagement not measured | Only one "play" event | Fixed: `video_impression` (≥50 % visible), `video_start`, `video_progress_25/50/75`, `video_complete`. Route and percentage only; GA4 consent-gated; old `recommendation_video_play` kept |
| D7 | Sales-page arrival not measurable | Stan is external; the checkout link carried no source | Fixed: Stan checkout links carry `utm_source=yms_assessment&utm_medium=website&utm_campaign=v4_results`, and the outbound click is sent by beacon before the browser leaves |

**Checked and working on the live site:**
- Scoring and routing on all 15 routes.
- Q1/Q2 routing and the progressive panels, including Back.
- Video: no autoplay, `preload="none"` so it doesn't slow the page, streams as 206 partial content (44,984,383 bytes), plays on mobile.
- Prices and Stan destinations on all five hypnotherapy routes and the ebook.
- Saved-choice persistence, duplicate submissions, saved-result links.

## 5. Tests

| Test | Result |
|---|---|
| Simulated backend suite (real code, in-memory workbook) | 57/57, incl. F1–F7 for the fallback |
| Simulated browser suite, DEV preview page, mobile + desktop | 61/61, incl. T1–T7 for the tracking repairs |
| Same browser suite, public `/assessment/start/` page (r7) | 61/61 |
| **Same suite against the current live page** | 54/61. T1–T5 and T7 fail: confirms the defects |
| Live HTTP contract against the deployed DEV backend (r7, Version 5) | 13/13 PASS |
| Real browser (your desktop app, mobile size), r7 page + DEV backend | Michelle's pattern (Q1/Q2, recommendation, video, START → Back, leave): every event arrived, including 15 extra sent by real `sendBeacon` and the Q1/Q2 IDs. Fallback run: 1 results email (all three options, saved-results link) to the owner inbox. Then she confirmed £117: choice saved, no second email, checkout with UTM. Outbound click arrived before Stan loaded |
| Video impression in the real browser | Not observable in the hidden desktop pane (no rendering frames). Covered in headless Chromium (T3) |

Production checks were non-destructive: status endpoint (PROD, r6b), the executions list, and CSV exports.

## 6. Decisions needed

1. **Results-email strategy.**
   - **Option A, recommended: safety-net fallback.** Keep the current flow. An hourly time trigger sends her personalised results email (the existing approved copy for her route; for the Complete route, the approved email listing all three options) to anyone who has had no email 30+ minutes after submitting.
     - It never sends twice and never emails rows from before the start date you set.
     - If she later confirms an offer, the choice is saved. A second, offer-specific email is optional (`V4_CHOICE_EMAIL_AFTER_RESULTS`, off by default).
   - **Option B: results immediately.** Send the results email at submission for every route. More reliable for in-app browsers, but every Complete-route woman then receives the all-options email before she chooses.
2. **Michelle and Victoria.** If you approve, the email they would get is the approved Complete email listing £117, £147 and £197 with their saved-results link. Their recommendation is the Complete route and neither confirmed a choice. Nothing will be sent until you say so.
3. **Deploy r7** (page + backend). Steps:
   1. Update the production code to `phase3/release/YMS_V4_PROD_RELEASE_CANDIDATE.gs` (r7).
   2. Create a new version on the live deployment (same URL; rollback = Version 7).
   3. Merge the branch (page).
   4. If Option A: set `V4_PENDING_FALLBACK=on`, `V4_PENDING_FALLBACK_SINCE=<deploy time>` and add an hourly trigger for `sendPendingV4ResultEmails`.
4. **Clarity:** sign in once if you want me to check Michelle's recording.

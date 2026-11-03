/**
 * Your Mind Story V4 Assessment backend — DEV CANDIDATE r2 (2 Nov 2026). NOT a production build.
 * Version: YMS-ASSESSMENT-2026-V4
 * DEV spreadsheet: 1xl41dlFS0Z0dZ3p9yXrVxu7NJHdoE6da7nckKiEB42o (synthetic only). Production workbook is refused.
 * r2 changes: approved Phase 3 email copy restored verbatim (phase3/voc-support-choice);
 *   final choice persisted before send with an idempotent send state; post-result Q1/Q2 validated
 *   against approved wording and stored in their own columns; getResult returns decision state for
 *   resume; DEV email suppression/redirect; DEV purchase sync disabled; V4 email UTM campaign.
 *
 * Deploy as a Web app:
 * Execute as: Me
 * Who has access: Anyone
 *
 * Locked offer structure (6 Oct 2026):
 *   Single stage audio ............ £37
 *   Two-stage pair ................ £74
 *   Return to You Series (all 4) .. £117
 *   No/low qualifying stage ....... The Bare Minimum (£4.99)
 * Stage names: Quiet the Alarm, Break the Pull, Restore Self-Trust, Return to Yourself.
 * "Return to Yourself" is ONLY Stage 4. "Return to You Series" is the complete four-stage offer.
 * Bootcamp is closed and is never recommended. "Complete Self-Guided Journey" is retired.
 *
 * This script uses ONLY the Spreadsheet, Mail, Lock, Cache and Properties services.
 * Do not add the Gmail or Script services here: a new OAuth scope would stop the live web app
 * until it is re-authorised. The Stan purchase sync (which reads email) lives in a separate project.
 * Apps Script scope detection also reads comments, so service names are not written out here.
 * Permissions are pinned in appsscript.json: spreadsheets + script.send_mail only.
 */
var V3_VERSION = 'YMS-ASSESSMENT-2026-V4'; // API variable name retained for existing website integration
var V3_BACKEND_BUILD = '2026-11-02-v4-final-choice-prod-release-candidate-r8';

// ---- Environment (2 Nov 2026, r2) ----
// 'DEV'  : synthetic-only workbook; purchase sync / maintenance actions disabled; transactional email
//          is suppressed (recorded, not sent) unless the V4_DEV_EMAIL_REDIRECT_TO script property is set,
//          in which case every email goes ONLY to that owner test inbox, never to the submitted address.
// 'PROD' : set ONLY at the approved production release, together with V4_SHEET_ID (see release checklist).
var V4_ENV = 'PROD';
var V4_PROD_SHEET_ID_ = '1jO33mGOLAwxDuBxsEsJMsxW5ONa78rgjkMmlAqsZoGM';
var V4_V3_HISTORY_SHEET_ID_ = '1MRK7_t-_HN8OCHpK8tm1E8QWXexo8ACLMTdsqZjaoXE'; // V3 history: never opened by this script
var V4_DEV_SHEET_TITLE_ = 'YMS V4 DEV Assessment - Synthetic Only - 2026-11-02';
// Saved-result link in the transactional email. The V4 page restores the progressive result
// from ?resultToken=. Override per deployment with the V4_RESULT_PAGE_URL script property.
var V4_RESULT_PAGE_URL_DEFAULT_ = 'https://yourmindstory.co.uk/assessment/v4-preview/start/';
function v4IsDev_() { return V4_ENV !== 'PROD'; }
function v4ScriptProp_(k) {
  try { return String(PropertiesService.getScriptProperties().getProperty(k) || '').trim(); } catch (e) { return ''; }
}
// V4 is the ONLY writable assessment destination. The original V3 workbook is never used.
var V4_SHEET_ID = '1jO33mGOLAwxDuBxsEsJMsxW5ONa78rgjkMmlAqsZoGM';
var V3_SHEET_ID = V4_SHEET_ID; // Compatibility alias for existing legacy functions.
function openYMSV4Sheet_() {
  // This candidate is deliberately unable to write until an isolated V4 DEV copy is configured.
  if (!V4_SHEET_ID || V4_SHEET_ID.indexOf('REPLACE_WITH_') === 0)
    throw new Error('Set an isolated V4 DEV spreadsheet ID before use; production writes are disabled.');
  if (V3_SHEET_ID !== V4_SHEET_ID)
    throw new Error('V4 CONFIG ERROR: legacy alias and V4 DEV spreadsheet ID do not match.');
  if (V4_SHEET_ID === V4_V3_HISTORY_SHEET_ID_)
    throw new Error('V4 CONFIG ERROR: the V3 historical workbook is never writable from V4.');
  if (v4IsDev_() && V4_SHEET_ID === V4_PROD_SHEET_ID_)
    throw new Error('V4 CONFIG ERROR: the production workbook is forbidden for DEV testing.');
  if (!v4IsDev_() && V4_SHEET_ID !== V4_PROD_SHEET_ID_)
    throw new Error('V4 CONFIG ERROR: PROD mode must target the production V4 workbook only.');
  var ss = SpreadsheetApp.openById(V4_SHEET_ID);
  if (v4IsDev_() && ss.getName() !== V4_DEV_SHEET_TITLE_) {
    throw new Error('V4 CONFIG ERROR: workbook title mismatch. Refusing to write assessment data.');
  }
  return ss;
}
// Run this from the Apps Script editor before deploying. No rows are written.
function verifyV4Connection() {
  var ss = openYMSV4Sheet_();
  var sh = ss.getSheetByName('V4 Responses');
  if (!sh) throw new Error('V4 workbook is missing its V4 Responses tab.');
  var info = {ok:true,assessmentVersion:V3_VERSION,backendBuild:V3_BACKEND_BUILD,env:V4_ENV,
              spreadsheetId:V4_SHEET_ID,spreadsheetTitle:ss.getName(),responseTab:sh.getName(),
              responseRows:Math.max(0,sh.getLastRow()-1),
              emailMode:v4EmailMode_(),resultPageUrl:v4ResultPageUrl_()};
  console.log(JSON.stringify(info));
  return info;
}

var V3_SHEET_NAME = 'V4 Responses';
var V3_PURCHASES_SHEET_NAME = 'Stan Purchases';

var V3_HEADERS = [
  'Date & Time','First Name','Email','Recommended Route','Recommended Product',
  'What She Wants','Her Open Answer','Current Situation','Readiness','Source / Journey',
  'Quiet Score','Break Score','Restore Score','Return Score','Total Score','Qualifying Stages','Breadth',
  'Q1 Trigger Response','Q2 Time to Settle','Q3 Pull Behaviour','Q4 Attention Taken',
  'Q5 Self-Trust','Q6 Stand By Decisions','Q7 Feel Like Self','Q8 Life Impact',
  'Q9 Belief Position','Q10 Cycle Interruption','Q11 Relationship Context','Q12 Desired Outcome',
  'Q13 What She Has Tried','Q14 Readiness Raw','Q15 Open Answer Raw','Marketing Consent',
  'Recommendation CTA Clicked','Checkout Clicked','Purchase Status','Purchased Product','Purchase Value',
  'Purchase Date','Day 0 Check-in','Day 7 Check-in','Day 14 Check-in','Day 21 Check-in',
  'Journey ID','Submission ID','Assessment Version','GA Client ID','GA Session ID',
  'First Touch Source','First Touch Medium','First Touch Campaign',
  'Assessment Touch Source','Assessment Touch Medium','Assessment Touch Campaign',
  'UTM Content','UTM Term','Referrer','Landing URL','Submission URL','Device / User Agent',
  'Clarity Reference','Experiment Version','Submitted UTC','Submission Status'
];

// Columns added by this build. They are appended to the right-hand end of V4 Responses
// only if missing, so no existing column moves.
var V3_EXTRA_HEADERS = [
  'Result Token','Result Viewed At','Recommendation Shown At','Recommendation Reveal Clicked At',
  'Final Route Shown','Final Recommendation','Primary CTA Clicked','Primary CTA Clicked At',
  'Bootcamp Clicked','Bootcamp Clicked At','Self-Guided Alternative Clicked','Self-Guided Alternative Clicked At',
  'Bare Minimum Clicked','Bare Minimum Clicked At','Checkout Clicked At',
  'Result Email Sent','Result Email Provider','Result Email Error',
  'Recommended Price','Recommendation Category','Test Record','Backend Build',
  'Result Step Last Viewed','Sales Page Viewed At',
  'Purchase Order ID','Purchase Currency','Purchase Match Method','Purchase Matches Recommendation',
  'Source (Derived v2)',
  // Ten V4 columns have already been appended at DL:DU to the cloned V4 sheet.
  // Preserve the order. Never overwrite V3 A:DK or shift existing columns.
  'V4 Support Preference Question','V4 Support Preference Option ID','V4 Support Preference Answer',
  'V4 Post-Result Question 1 Option ID','V4 Post-Result Question 1 Answer',
  'V4 Post-Result Question 2 Option ID','V4 Post-Result Question 2 Answer','V4 Existing Barrier Answer',
  'V4 Hesitation Question','V4 Hesitation Option ID','V4 Hesitation Answer',
  'V4 Final Offer Shown','V4 Result Email Route','V4 Decision Saved UTC','V4 Assessment Build',
  // r8 (3 Nov 2026): appended at the end only. 'immediate' marks rows whose results email is sent at completion;
  // the choice email (Complete route only) has its own delivery record.
  'V4 Email Flow','V4 Choice Email Status','V4 Choice Email Option','V4 Choice Email Sent','V4 Choice Email Error'
];

var V3_PURCHASE_HEADERS = [
  'Order Key','Order ID','Order Date (London)','Order UTC','Purchaser Email','Stan Product Title','Stan Page ID',
  'Product (Canonical)','Product Type','Amount','Currency','Stan Referrer','Record Source','Test Record',
  'Match Method','Matched Submission ID','Matched Journey ID','Matched Row',
  'Assessment Date','Recommended Route','Recommended Product','Recommended Price','Matches Recommendation',
  'Checkout Clicked','Checkout Clicked At','Source / Journey','Source (Derived v2)',
  'First Touch Source','First Touch Medium','First Touch Campaign',
  'Assessment Touch Source','Assessment Touch Medium','Assessment Touch Campaign','UTM Content','UTM Term',
  'Recorded At'
];

var STAGES = ['Quiet the Alarm','Break the Pull','Restore Self-Trust','Return to Yourself'];
var SERIES_NAME = 'Return to You Series';
// Corrected 1 Nov 2026: the two comments that stood here (dated 22 Oct 2026) claimed prices were
// "verified on the live Payhip product pages" at single £47/pair £89/complete £147, and that
// result-email links had moved to Payhip. Neither claim matches the code that follows, which has
// always pointed at Stan at £37/£74/£117/£147/£197/£4.99 - and live verification against the actual
// Stan product pages and the live return-to-yourself-journey/ landing page (1 Nov 2026) confirms
// Stan, at these exact prices, is what's currently live and correct. Whatever Payhip migration was
// planned around 22 Oct for these particular stage/pair/series products evidently never shipped, or
// was reverted; the stale comments were left behind either way. Correcting them here only - no
// functional change, the prices and URLs below are unchanged.
var PRICE_SINGLE = 37, PRICE_PAIR = 74, PRICE_SERIES = 117, PRICE_BARE_MINIMUM = 4.99;

var SINGLE_URLS = {
  'Quiet the Alarm':'https://stan.store/Yourmindstory/p/quiet-the-alarm',
  'Break the Pull':'https://stan.store/Yourmindstory/p/break-the-pull',
  'Restore Self-Trust':'https://stan.store/Yourmindstory/p/restore-self-trust',
  'Return to Yourself':'https://stan.store/Yourmindstory/p/return-to-yourself-7jc9h8lg'
};
var PAIR_URLS = {
  'Quiet the Alarm → Break the Pull':'https://stan.store/Yourmindstory/p/quiet-the-alarm--break-the-pull',
  'Quiet the Alarm → Restore Self-Trust':'https://stan.store/Yourmindstory/p/quiet-the-alarm--restore-selftrust',
  'Quiet the Alarm → Return to Yourself':'https://stan.store/Yourmindstory/p/quiet-the-alarm--return-to-yourself',
  'Break the Pull → Restore Self-Trust':'https://stan.store/Yourmindstory/p/break-the-pull--restore-selftrust',
  'Break the Pull → Return to Yourself':'https://stan.store/Yourmindstory/p/break-the-pull--return-to-yourself',
  'Restore Self-Trust → Return to Yourself':'https://stan.store/Yourmindstory/p/restore-selftrust--return-to-yourself'
};
var SERIES_SALES_PAGE_URL = 'https://yourmindstory.co.uk/return-to-yourself-journey/';
var SERIES_STAN_URL = 'https://stan.store/Yourmindstory/p/return-to-yourself-eli637kx';
var BARE_MINIMUM_URL = 'https://stan.store/Yourmindstory/p/the-bare-minimum';

// Stan page IDs → canonical product (verified in Stan admin, 6 Oct 2026).
var STAN_PAGE_PRODUCTS = {
  '5324702':'Quiet the Alarm','5324733':'Break the Pull','5324756':'Restore Self-Trust','5324774':'Return to Yourself',
  '5416764':'Quiet the Alarm → Break the Pull','5420850':'Quiet the Alarm → Restore Self-Trust',
  '5420869':'Quiet the Alarm → Return to Yourself','5420882':'Break the Pull → Restore Self-Trust',
  '5420929':'Break the Pull → Return to Yourself','5420936':'Restore Self-Trust → Return to Yourself',
  '5461246':SERIES_NAME,'5324794':SERIES_NAME,
  '5414211':'The Bare Minimum'
};

/* ============================== HTTP ============================== */

function doGet(e) {
  var action = e && e.parameter ? clean_(e.parameter.action) : '';
  if (action === 'sync') {
    // DEV must never import production Payhip/Stan purchase rows (real customer data) into the synthetic workbook.
    if (v4IsDev_()) return ContentService.createTextOutput('sync disabled in development').setMimeType(ContentService.MimeType.TEXT);
    if (v4Stage2Active_()) return ContentService.createTextOutput('sync disabled during the Stage 2 test').setMimeType(ContentService.MimeType.TEXT);
    var sync = syncAllV3_();
    var csv = sync.ok ? [['Last sync',sync.syncedAt],['Purchases (all)',sync.purchases],['Matched to an assessment',sync.matchedPurchases],['Unmatched',sync.unmatchedPurchases],['Backend build',V3_BACKEND_BUILD]]
      : [['Last sync','busy, will retry'],['Backend build',V3_BACKEND_BUILD]];
    return ContentService.createTextOutput(csv.map(function(r){ return r.join(','); }).join('\n')).setMimeType(ContentService.MimeType.CSV);
  }
  if (action === 'getResult') {
    var token = e && e.parameter ? clean_(e.parameter.resultToken) : '';
    if (!token) return json_({ok:false,status:'error',code:'MISSING_TOKEN',message:'Missing resultToken'});
    var sheet = getV3Sheet_();
    var rowNumber = findRowNumber_(sheet, {resultToken:token});
    if (!rowNumber) return json_({ok:false,status:'error',code:'NOT_FOUND',message:'Result not found'});
    var data = rowObject_(sheet, rowNumber);
    return json_({
      ok:true,status:'ok',assessmentVersion:V3_VERSION,
      firstName:data['First Name']||'',
      resultToken:data['Result Token']||token,
      recommendedRoute:data['Recommended Route']||'',
      recommendedProduct:data['Recommended Product']||'',
      recommendedPrice:data['Recommended Price']||'',
      scores:{
        quiet:Number(data['Quiet Score']||0),
        breakPull:Number(data['Break Score']||0),
        restore:Number(data['Restore Score']||0),
        returnSelf:Number(data['Return Score']||0)
      },
      totalScore:Number(data['Total Score']||0),
      qualifyingStages:String(data['Qualifying Stages']||'').split(',').map(function(x){return x.trim();}).filter(Boolean),
      breadth:Number(data['Breadth']||0),
      // Added 31 Oct 2026, additive only (scoring/routing above is untouched): raw stored answer
      // text for Q9/Q11/Q12, so a saved-result page can reconstruct the SAME personalised copy
      // (belief/context/desired-outcome framing) that assessment/start/index.html's showResult()
      // already uses from its live in-memory answers, instead of a reduced/different version.
      beliefPosition:data['Q9 Belief Position']||'',
      relationshipContext:data['Q11 Relationship Context']||'',
      desiredOutcome:data['Q12 Desired Outcome']||'',
      // r2: decision state so a returning visitor resumes, or sees, her saved final choice.
      // Option IDs only; no email address or free-text answers are returned.
      decision:v4DecisionState_(data)
    });
  }
  return json_({
    ok:true,status:'ok',assessmentVersion:V3_VERSION,backendBuild:V3_BACKEND_BUILD,env:V4_ENV,
    message:'Your Mind Story V4 assessment backend is running.',spreadsheetTarget:'V4 only'
  });
}

// r8 (3 Nov 2026): her results email is sent at completion. The send happens AFTER the script lock is released
// (so it never holds up anyone else's save) but inside the same request, so it still goes out if she closes the
// page straight away. The row is marked 'sending' under the lock before MailApp is called, then 'sent'/'failed'.
var V4_AFTER_LOCK_ = null;
function doPost(e) {
  V4_AFTER_LOCK_ = null;
  var res = v4DoPostCore_(e);
  var job = V4_AFTER_LOCK_; V4_AFTER_LOCK_ = null;
  if (!job) return res;
  return json_(v4RunEmailJob_(job));
}
function v4DoPostCore_(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ok:false,status:'error',code:'MALFORMED_JSON',message:'Malformed JSON body'});
  }
  // Operational funnel events update the woman's EXISTING row. They never create a second journey row,
  // never recalculate her assessment, and never queue behind the 30-second submission lock
  // (that queue is what made bursts of events time out and disappear).
  // Stage 2 (controlled real-system test): while the V4_STAGE2_TEST_ONLY script property is 'yes', a PROD
  // deployment only accepts the owner's +v4test inbox and only touches rows that belong to it. Remove at release.
  var stage2Refusal = v4Stage2Refusal_(body);
  if (stage2Refusal) return json_({ok:false,status:'error',code:'STAGE2_TEST_ONLY',message:stage2Refusal});
  if (body && (body.action === 'recordJourneyEvent' || body.action === 'recordJourneyEvents')) {
    return handleJourneyRequestV3_(body);
  }
  // Fast-path an EXISTING saved result when its transactional email is already recorded.
  // This only updates the existing V4 response row, not email, purchases or other rows.
  // The normal lock below still protects unfinished submissions and any outstanding
  // email sending. The token is always checked again by finalizeResultV4_.
  if (body && (body.action === 'finalizeResultV4' || !body.action)) { V4_TIMING_ = []; V4_TIMING_.t0 = Date.now(); }
  if (body && body.action === 'finalizeResultV4') {
    try {
      // r7e: the fast path is only for a choice whose email THIS code already sent (marked in the script cache),
      // so a first choice no longer pays for a sheet lookup before it queues for the lock. Anything else,
      // including results-fallback rows, takes the locked path, where finalizeResultV4_ checks the row itself.
      var fastToken = clean_(body.resultToken);
      if (fastToken && CacheService.getScriptCache().get('v4fin:' + fastToken)) {
        return json_(finalizeResultV4_(body));
      }
    } catch(fastErr) {
      // Use the existing locked path for any temporary lookup failure.
      console.error('V4 fast-choice precheck failed, using safe lock: '+fastErr);
    }
    v4Mark_('precheck');
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    v4Mark_('lockTimeout'); v4TimingLog_(body && body.action || 'submit');
    return json_({ok:false,status:'error',code:'BUSY',message:'Busy, please retry.'});
  }
  v4Mark_('lockAcquired');
  try {
    // Purchases are NOT accepted over this public endpoint (they could be faked). They are written
    // straight into the 'Stan Purchases' tab by the separate 'YMS Stan Purchase Sync' script, which
    // reads Stan's own purchase confirmation emails. These two maintenance actions only recompute
    // derived columns from data already in the Sheet, so they are safe to expose.
    if (body && v4IsDev_() && (body.action === 'rematchPurchases' || body.action === 'reclassifySources')) {
      return json_({ok:false,code:'DEV_ACTION_DISABLED',message:'Purchase maintenance is disabled in development.'});
    }
    if (body && body.action === 'rematchPurchases') {
      return json_(rematchAllPurchasesV3_());
    }
    if (body && body.action === 'reclassifySources') {
      return json_(reclassifySourcesV3_());
    }
    // After post-result choices are complete, save the final offer and send the matching email once.
    // Requires the secret saved-result token, not merely the public journey/submission ID.
    if (body && body.action === 'retryResultEmail') {
      return json_(v4ClaimResultEmailRetry_(body));
    }
    if (body && body.action === 'finalizeResultV4') {
      var finOut = finalizeResultV4_(body); v4TimingLog_('finalize'); if (v4IsDev_() && V4_TIMING_) finOut._timing = V4_TIMING_.join(' '); return json_(finOut);
    }
    if (body && body.action) {
      return json_({ok:false,status:'error',code:'UNKNOWN_ACTION',message:'Unknown action'});
    }

    var validation = validateV3_(body);
    if (!validation.ok) return json_({ok:false,status:'error',code:'VALIDATION_ERROR',message:validation.message});
    var sheet = getV3Sheet_();
    var submissionId = clean_(body.submissionId) || makeId_('YMSV3-S');
    var journeyId = clean_(body.journeyId) || makeId_('YMSV3-J');

    // Duplicate protection: the same submissionId never writes a second row.
    var existingRow = findRowNumber_(sheet, {submissionId:submissionId});
    if (existingRow) {
      var existingData = rowObject_(sheet, existingRow);
      return json_({
        ok:true,status:'duplicate',code:'ALREADY_RECORDED',
        message:'Submission already recorded, no new row written.',
        submissionId:submissionId,
        journeyId:existingData['Journey ID'] || journeyId,
        resultToken:existingData['Result Token'] || '',
        recommendedRoute:existingData['Recommended Route'] || '',
        recommendedProduct:existingData['Recommended Product'] || '',
        assessmentVersion:V3_VERSION
      });
    }

    var result = computeV3_(body);
    var now = new Date();
    var resultToken = clean_(body.resultToken) || makeResultToken_();
    // r4 performance: every read that follows a write makes Sheets finish recalculating the dashboard
    // formulas first (20-50 s per submission on the V4 workbooks). So: all reads first, then writes only,
    // and no read-back of what was just written. Same values, same columns as before.
    var hasEmail = !!clean_(body.email);
    var funnelSheet = null, funnelNextRow = 0;
    try { funnelSheet = funnelSheetV3_(); funnelNextRow = funnelSheet.getLastRow() + 1; } catch (fsErr) { console.error('Funnel sheet unavailable: '+fsErr); }
    var rowNumber = sheet.getLastRow() + 1; // safe: the script lock is held for the whole submission
    var row = buildRowV3_(sheet, body, result, journeyId, submissionId, resultToken, now, {
      'Result Email Sent':'', 'Result Email Provider':hasEmail ? 'sending' : 'none',
      'Result Email Error':hasEmail ? 'sending since '+now.toISOString() : '',
      'V4 Email Flow':V4_EMAIL_FLOW_IMMEDIATE_,
      'Canonical: Furthest Stage':clean_(body.email) ? 'email_captured' : 'assessment_complete'
    });
    sheet.appendRow(row);

    // Canonical funnel events (tracking repair 22 Oct 2026): completion + email are proven server-side here.
    // A brand-new submission ID cannot already have these events, so no duplicate lookup (a read) is needed.
    try {
      if (funnelSheet) {
        var rowObj = {};
        var hm = headerMap_(sheet);
        Object.keys(hm).forEach(function(h){ rowObj[h] = row[hm[h]-1]; });
        var ids = {submissionId: submissionId, journeyId: journeyId};
        var recs = [funnelRecordV3_('assessment_complete', now, CANON_EVIDENCE_V3.assessment_complete, ids, rowObj,
          {price: body.priceShown}, null, body.isTest === true, {v3Row: rowNumber})];
        if (clean_(body.email)) recs.push(funnelRecordV3_('email_captured', now, CANON_EVIDENCE_V3.email_captured, ids, rowObj,
          {}, null, body.isTest === true, {v3Row: rowNumber}));
        var vals = recs.map(function(rec){ return FUNNEL_HEADERS_V3.map(function(h){ return rec.hasOwnProperty(h) ? rec[h] : ''; }); });
        funnelSheet.getRange(funnelNextRow, 1, vals.length, FUNNEL_HEADERS_V3.length).setValues(vals);
      }
    } catch (fErr) { console.error('Funnel write failed: '+fErr); }

    // If she bought before taking the assessment (rare), or a purchase is already waiting, link it.
    // Purchase matching runs in the dedicated purchase-sync operation, not while
    // the customer is waiting for a result. This avoids holding the script lock.

    v4Mark_('saved');
    try { SpreadsheetApp.flush(); } catch (flushErr0) {}
    var recorded = {
      _timing: (v4IsDev_() && V4_TIMING_) ? V4_TIMING_.join(' ') : undefined,
      ok:true,status:'ok',code:'RECORDED',
      submissionId:submissionId,journeyId:journeyId,resultToken:resultToken,
      assessmentVersion:V3_VERSION,backendBuild:V3_BACKEND_BUILD,
      scores:result.scores,totalScore:result.total,
      qualifyingStages:result.qualifyingStages,breadth:result.breadth,
      recommendedRoute:result.route,recommendedProduct:result.product,
      recommendedPrice:result.price,recommendationCategory:result.category,
      resultEmailSent:false,
      resultEmailPending:false,
      resultEmailProvider:hasEmail ? 'sending' : 'none',
      resultEmailError:''
    };
    if (hasEmail) {
      V4_AFTER_LOCK_ = {kind:'result', sheet:sheet, rowNumber:rowNumber, token:resultToken, out:recorded,
        customer:{email:clean_(body.email), firstName:clean_(body.firstName)}, result:result,
        journeyId:journeyId, submissionId:submissionId};
    }
    return json_(recorded);
  } catch (err) {
    V4_AFTER_LOCK_ = null;
    console.error(err);
    return json_({ok:false,status:'error',code:'SERVER_ERROR',message:'Submission could not be recorded.'});
  } finally {
    lock.releaseLock();
    if (V4_TIMING_ && !(body && body.action)) { v4Mark_('done'); v4TimingLog_('submit'); }
    V4_TIMING_ = null;
  }
}


/* ============================== V4 FINAL DECISION ============================== */
// r2 (2 Nov 2026). The final offer is persisted BEFORE any transactional email is built or sent.
// Abandoned choices never send an offer-specific email. Delivery is idempotent: once the email
// is recorded as sent (or DEV-suppressed), repeating the same choice returns the saved result and
// never sends again; a different choice after the email is refused with the saved choice returned.
// Q1, Q2 and any existing barrier answer are stored in their own columns. None of them alters scores.

// Approved post-result wording (owner baseline, 1 Nov 2026). Stored answers use this canonical text.
var V4_GOAL_CHOICES_ = {
  self_work:'I want help understanding myself, breaking the cycle and getting my mind back.',
  understand_him:'I mainly want to understand him and what his behaviour means.',
  change_him:'I mainly want help getting him back or changing his behaviour.',
  unsure:"I'm not sure yet."
};
// Owner decision, 2 Nov 2026 (final): "recommend" -> £117 Self-Guided primary, £147 and £197 as alternatives.
var V4_RECOMMEND_PRIMARY_ = 'self_guided';
var V4_SUPPORT_CHOICES_ = {
  independent:{answer:"I'm happy to work independently",allowed:['self_guided'],primary:'self_guided'},
  additional:{answer:'I want additional support',allowed:['reality_reset','pattern_break'],primary:'reality_reset'},
  some_support:{answer:'I think some support would help me with this',allowed:['reality_reset','pattern_break'],primary:'reality_reset'},
  recommend:{answer:"I'm not sure where to start. I'd like you to recommend what would help me most.",
    allowed:['reality_reset','self_guided','pattern_break'],primary:V4_RECOMMEND_PRIMARY_}
};
var V4_COMPLETE_OPTIONS_ = ['self_guided','reality_reset','pattern_break'];
var V4_SEND_STALE_MS_ = 10 * 60 * 1000;

function v4NormText_(s) {
  return String(s == null ? '' : s).replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();
}
function validFinalOfferV4_(option) {
  return ['self_guided','reality_reset','pattern_break','bare_minimum','scored_route'].indexOf(clean_(option)) !== -1;
}
function choiceIdV4_(obj, explicit) {
  if (explicit) return clean_(explicit);
  if (obj && typeof obj === 'object') return clean_(obj.id || obj.optionId || obj.value || '');
  return '';
}
function finalOfferTitleV4_(result, option) {
  if (option === 'bare_minimum') return 'The Bare Minimum — £4.99';
  if (result.route === SERIES_NAME && V4_COMPLETE_OPTIONS_.indexOf(option) !== -1) {
    var c = COMPLETE_CHOICES_V3.filter(function(x){ return x.option === option; })[0];
    if (c) return c.title;
  }
  return result.product;
}
function storedResultV4_(d) {
  return {route:String(d['Recommended Route']||''),product:String(d['Recommended Product']||''),
    price:Number(d['Recommended Price']||0),category:String(d['Recommendation Category']||''),
    qualifyingStages:String(d['Qualifying Stages']||'').split(',').map(function(s){return s.trim();}).filter(Boolean)};
}
function utcV4_() { return Utilities.formatDate(new Date(),'UTC',"yyyy-MM-dd'T'HH:mm:ss'Z'"); }
function v4QuestionsRequired_(d) {
  var qualifyingCount = String(d['Qualifying Stages']||'').split(',').map(function(x){return x.trim();}).filter(Boolean).length;
  return String(d['Recommended Route']||'') === SERIES_NAME && qualifyingCount >= 3 && Number(d['Total Score']||0) >= 15;
}
function v4DecisionState_(d) {
  var saved = !!clean_(d['V4 Decision Saved UTC']);
  var provider = clean_(d['Result Email Provider']);
  return {
    saved:saved,
    finalOfferOption:saved ? clean_(d['V4 Result Email Route']) : '',
    finalOffer:saved ? clean_(d['V4 Final Offer Shown']) : '',
    question1OptionId:clean_(d['V4 Post-Result Question 1 Option ID']),
    question2OptionId:clean_(d['V4 Post-Result Question 2 Option ID']),
    questionsRequired:v4QuestionsRequired_(d),
    resultEmailSent:!!clean_(d['Result Email Sent']) && provider !== 'dev-suppressed',
    resultEmailSuppressed:!!clean_(d['Result Email Sent']) && provider === 'dev-suppressed',
    // r8: rows saved by this build send email 1 at completion; the choice email has its own state.
    emailFlow:clean_(d['V4 Email Flow']),
    choiceEmailRequired:saved && String(d['Recommended Route']||'') === SERIES_NAME &&
      (V4_COMPLETE_OPTIONS_.indexOf(clean_(d['V4 Result Email Route'])) !== -1 || clean_(d['V4 Result Email Route']) === 'bare_minimum'),
    choiceEmailSent:clean_(d['V4 Choice Email Status']) === 'sent' && clean_(d['V4 Choice Email Sent']) !== 'dev-suppressed',
    choiceEmailSuppressed:clean_(d['V4 Choice Email Status']) === 'sent' && clean_(d['V4 Choice Email Sent']) === 'dev-suppressed',
    choiceEmailStatus:clean_(d['V4 Choice Email Status'])
  };
}

// One bounded read/write for the adjacent V4 decision fields instead of a separate
// spreadsheet RPC for every field. Never includes unrelated columns or formula cells.
function saveV4DecisionBlock_(sh,rowNumber,fields){
  var map=headerMap_(sh), keys=Object.keys(fields).filter(function(k){return !!map[k];});
  if(!keys.length)return;
  var indexes=keys.map(function(k){return map[k];}),first=Math.min.apply(null,indexes),last=Math.max.apply(null,indexes);
  var range=sh.getRange(rowNumber,first,1,last-first+1),b=v4RowBuf_(sh,rowNumber,last);
  var cells=b?b.vals.slice(first-1,last):range.getValues()[0];
  keys.forEach(function(k){cells[map[k]-first]=fields[k];});
  range.setValues([cells]);
  if(b)cells.forEach(function(v,i){b.vals[first-1+i]=v;});
}

// Validates the request against the SAVED row (never the client's idea of the route).
// Returns {ok:true, option, q1Id, q1Answer, q2Id, q2Answer} or an error object.
function validateV4Decision_(d, body) {
  var route = String(d['Recommended Route']||'');
  var option = clean_(body.finalOfferOption);
  var question1 = body.question1 || null, question2 = body.question2 || null;
  var q1Id = choiceIdV4_(question1, question1 && question1.optionId);
  var q2Id = choiceIdV4_(question2, question2 && question2.optionId);
  var required = v4QuestionsRequired_(d);
  if (route === SERIES_NAME && required) {
    if (!Object.prototype.hasOwnProperty.call(V4_GOAL_CHOICES_, q1Id))
      return {ok:false,code:'QUESTION_1_REQUIRED',message:'Please answer the first post-result question.'};
    if (v4NormText_(answerText_(question1)) !== v4NormText_(V4_GOAL_CHOICES_[q1Id]))
      return {ok:false,code:'INVALID_QUESTION_1',message:'Please choose an answer from the list.'};
    var bareRoute = q1Id === 'understand_him' || q1Id === 'change_him';
    if (bareRoute) {
      if (q2Id) return {ok:false,code:'INVALID_QUESTION_2',message:'The support question does not apply to this answer.'};
      if (option !== 'bare_minimum') return {ok:false,code:'OFFER_MISMATCH',message:'This answer must use The Bare Minimum route.'};
      return {ok:true,option:option,q1Id:q1Id,q1Answer:V4_GOAL_CHOICES_[q1Id],q2Id:'',q2Answer:''};
    }
    var support = V4_SUPPORT_CHOICES_[q2Id];
    if (!support) return {ok:false,code:'QUESTION_2_REQUIRED',message:'Please answer the support question.'};
    if (v4NormText_(answerText_(question2)) !== v4NormText_(support.answer))
      return {ok:false,code:'INVALID_QUESTION_2',message:'Please choose an answer from the list.'};
    if (support.allowed.indexOf(option) === -1)
      return {ok:false,code:'OFFER_MISMATCH',message:'Please select an offer available for your answer.'};
    return {ok:true,option:option,q1Id:q1Id,q1Answer:V4_GOAL_CHOICES_[q1Id],q2Id:q2Id,q2Answer:support.answer};
  }
  // Every other route: the post-result questions are never asked, so they must not be stored.
  if (q1Id || q2Id) return {ok:false,code:'QUESTIONS_NOT_APPLICABLE',message:'These questions do not apply to this result.'};
  if (route === SERIES_NAME) {
    if (V4_COMPLETE_OPTIONS_.indexOf(option) === -1)
      return {ok:false,code:'OFFER_MISMATCH',message:'Choose one of the Complete support options.'};
  } else if (route === 'Bare Minimum') {
    if (option !== 'bare_minimum') return {ok:false,code:'OFFER_MISMATCH',message:'This result must use The Bare Minimum.'};
  } else if (route === 'Single Stage' || route === 'Two-Stage Pair') {
    if (option && option !== 'scored_route') return {ok:false,code:'OFFER_MISMATCH',message:'This result must use its scored recommendation.'};
    option = 'scored_route';
  } else {
    return {ok:false,code:'UNKNOWN_ROUTE',message:'Saved result route is not recognised.'};
  }
  return {ok:true,option:option,q1Id:'',q1Answer:'',q2Id:'',q2Answer:''};
}

// r7: keep her Q1/Q2 answers even if she leaves before confirming an offer. Only IDs from the fixed answer lists are
// accepted; nothing is overwritten once her final decision is saved (the decision block is the source of truth).
function v4SaveAnsweredQuestion_(sh, rowNumber, step, optionId) {
  if (!optionId || (step !== 'q1' && step !== 'q2')) return;
  if (clean_(getByHeaderV3_(sh, rowNumber, 'V4 Decision Saved UTC'))) return;
  if (step === 'q1') {
    if (!Object.prototype.hasOwnProperty.call(V4_GOAL_CHOICES_, optionId)) return;
    saveV4DecisionBlock_(sh, rowNumber, {'V4 Post-Result Question 1 Option ID':optionId,
      'V4 Post-Result Question 1 Answer':V4_GOAL_CHOICES_[optionId]});
  } else {
    var sup = V4_SUPPORT_CHOICES_[optionId]; if (!sup) return;
    saveV4DecisionBlock_(sh, rowNumber, {'V4 Post-Result Question 2 Option ID':optionId,
      'V4 Post-Result Question 2 Answer':sup.answer});
  }
}

// r7c (3 Nov 2026): phase timings for the choice save, written to the Apps Script execution log only
// (no customer data: phase names and milliseconds). Used to find where the choice-saving time goes.
var V4_TIMING_ = null;
function v4Mark_(name) { if (V4_TIMING_) V4_TIMING_.push(name + '=' + (Date.now() - V4_TIMING_.t0)); }
function v4TimingLog_(label) { if (V4_TIMING_) { try { console.log('V4_TIMING ' + label + ' ' + V4_TIMING_.join(' ')); } catch (e) {} } }
function finalizeResultV4_(body) {
  var token = clean_(body.resultToken);
  if (!token) return {ok:false,code:'MISSING_RESULT_TOKEN',message:'Saved result token is required'};
  var sh = getV3Sheet_(), rowNumber = findRowNumber_(sh,{resultToken:token});
  if (!rowNumber) return {ok:false,code:'NOT_FOUND',message:'Saved assessment not found'};
  var d = rowObject_(sh,rowNumber);
  v4Mark_('lookup');
  if (body.submissionId && clean_(body.submissionId) !== clean_(d['Submission ID']))
    return {ok:false,code:'SUBMISSION_MISMATCH',message:'Saved result does not match this assessment.'};
  var v = validateV4Decision_(d, body);
  if (!v.ok) return v;
  var option = v.option, r = storedResultV4_(d);
  var finalTitle = finalOfferTitleV4_(r,option);
  var state = v4DecisionState_(d);
  var emailRecorded = !!clean_(d['Result Email Sent']);

  // r8: rows saved by this build got their results email at completion; the choice is handled separately.
  // Rows saved before r8 (results email still 'pending') keep the original behaviour below, unchanged.
  if (clean_(d['V4 Email Flow']) === V4_EMAIL_FLOW_IMMEDIATE_)
    return v4FinalizeImmediate_(sh, rowNumber, d, body, v, r, finalTitle, token, state);
  if (emailRecorded) {
    if (state.saved && state.finalOfferOption === option) {
      return {ok:true,status:'finalized',idempotent:true,finalOfferOption:option,finalOffer:finalTitle,
        resultEmailSent:state.resultEmailSent,resultEmailSuppressed:state.resultEmailSuppressed,
        provider:clean_(d['Result Email Provider'])||''};
    }
    return {ok:false,status:'choice_locked_after_email',code:'EMAIL_ALREADY_SENT',
      savedFinalOfferOption:state.finalOfferOption,savedFinalOffer:state.finalOffer,
      message:'Your result email has already been sent for the choice you saved.'};
  }
  if (clean_(d['Result Email Provider']) === 'sending') {
    var since = Date.parse(String(d['Result Email Error']||'').replace(/^sending since /,''));
    if (!isNaN(since) && Date.now() - since < V4_SEND_STALE_MS_)
      return {ok:false,code:'SEND_IN_PROGRESS',message:'Your email is being prepared. Please wait a moment.'};
  }

  // 1) Persist the final choice. A previously saved, UNSENT choice may be replaced (for example after a
  //    failed delivery), because nothing customer-facing has been sent for it.
  var preference = body.supportPreference || null;
  var decisionFields={
    'V4 Final Offer Shown':finalTitle,
    'V4 Result Email Route':option,
    'V4 Decision Saved UTC':utcV4_(),
    'V4 Assessment Build':V3_BACKEND_BUILD,
    'V4 Post-Result Question 1 Option ID':v.q1Id,
    'V4 Post-Result Question 1 Answer':v.q1Answer,
    'V4 Post-Result Question 2 Option ID':v.q2Id,
    'V4 Post-Result Question 2 Answer':v.q2Answer,
    'V4 Existing Barrier Answer':clean_(answerText_(body.barrierAnswer || null))
  };
  if (preference && V4_COMPLETE_OPTIONS_.indexOf(option) !== -1) {
    decisionFields['V4 Support Preference Question']='Final Complete support choice';
    decisionFields['V4 Support Preference Option ID']=option;
    decisionFields['V4 Support Preference Answer']=finalTitle;
  }
  saveV4DecisionBlock_(sh,rowNumber,decisionFields);
  setByHeader_(sh,rowNumber,'Result Email Provider','sending');
  setByHeader_(sh,rowNumber,'Result Email Error','sending since '+new Date().toISOString());
  try { SpreadsheetApp.flush(); } catch (flushErr) {}
  v4Mark_('choiceSaved');

  // 2) Build and send exactly the email for the SAVED choice.
  var emailResult = r;
  if (option === 'bare_minimum') {
    emailResult = {route:'Bare Minimum',product:'The Bare Minimum',price:PRICE_BARE_MINIMUM,
      category:'bare_minimum',qualifyingStages:[],
      // Q1 "understand him / change him" on a Complete result: locked rule (2 Nov 2026) is
      // "Do not change her assessment findings or claim her scores are low".
      goalMismatch:r.route === SERIES_NAME};
  }
  var customer = {email:String(d['Email']||''),firstName:String(d['First Name']||'')};
  var delivery;
  try {
    delivery = sendResultEmailV3_(customer,emailResult,token,String(d['Journey ID']||''),String(d['Submission ID']||''),
      V4_COMPLETE_OPTIONS_.indexOf(option) !== -1 ? option : '');
  } catch (sendErr) {
    delivery = {ok:false,provider:'none',error:String(sendErr)};
  }
  v4Mark_('emailSent');
  setByHeader_(sh,rowNumber,'Result Email Provider',delivery.ok ? (delivery.provider||'mailapp') : 'none');
  setByHeader_(sh,rowNumber,'Result Email Error',String(delivery.error||'').slice(0,1000));
  if (delivery.ok) setByHeader_(sh,rowNumber,'Result Email Sent',Utilities.formatDate(new Date(),'Europe/London','dd/MM/yyyy HH:mm:ss'));
  try { SpreadsheetApp.flush(); } catch (flushErr2) {}
  if (delivery.ok) { try { CacheService.getScriptCache().put('v4fin:' + token, option, 21600); } catch (cacheErr) {} }
  v4Mark_('emailRecorded');
  var suppressed = delivery.ok && delivery.provider === 'dev-suppressed';
  return {ok:delivery.ok === true,status:delivery.ok ? 'finalized' : 'email_failed',
    code:delivery.ok ? undefined : 'EMAIL_FAILED',
    message:delivery.ok ? undefined : 'Your choice is saved but the email could not be sent. Please try again.',
    finalOfferOption:option,finalOffer:finalTitle,
    resultEmailSent:delivery.ok === true && !suppressed,resultEmailSuppressed:suppressed,
    provider:delivery.provider||'none'};
}
// ---- r8 (3 Nov 2026): results email at completion + short choice email (owner decisions 3 Nov, 14:40) ----
// 1. Every route: her personalised results email (existing approved copy, unchanged) is sent when she completes the
//    assessment. Complete route: the approved email listing £117 / £147 / £197.
// 2. Complete route only: when she confirms her support choice, a short second email with her chosen option,
//    price and checkout link. Single, Pair and Bare Minimum get no second email (it would repeat email 1).
// 3. Every send is recorded in her row: 'sending' (claimed before MailApp is called), then sent or 'failed'.
//    Only 'failed' sends are ever retried. A send stuck in 'sending' is listed for review, never resent.
// 4. Transactional only: marketing consent is recorded, never used to decide these two emails.
// The 30-minute fallback (r7) is removed: nothing is ever sent to rows saved before this build.
var V4_EMAIL_FLOW_IMMEDIATE_ = 'immediate';
var V4_CHOICE_EMAIL_SUBJECT_ = 'Your next step towards feeling like yourself again';
var V4_CHOICE_EMAIL_OPENING_ = 'You’ve chosen how you’d like to begin working on the patterns that have been keeping you stuck. Here’s your next step.';
var V4_EMAIL_STALE_MS_ = 10 * 60 * 1000;

function v4ChoiceEmailNeeded_(r, option) {
  return r.route === SERIES_NAME && (V4_COMPLETE_OPTIONS_.indexOf(option) !== -1 || option === 'bare_minimum');
}
function v4SendingFresh_(errText) {
  var since = Date.parse(String(errText || '').replace(/^sending since /, ''));
  return !isNaN(since) && Date.now() - since < V4_EMAIL_STALE_MS_;
}
function v4ChoiceState_(d) {
  var status = clean_(d['V4 Choice Email Status']);
  var suppressed = status === 'sent' && clean_(d['V4 Choice Email Sent']) === 'dev-suppressed';
  return {status:status, option:clean_(d['V4 Choice Email Option']), sent:status === 'sent' && !suppressed,
    suppressed:suppressed, required:false};
}
function v4Merge_(a, b) { var o = {}; Object.keys(a).forEach(function(k){ o[k] = a[k]; }); Object.keys(b||{}).forEach(function(k){ o[k] = b[k]; }); return o; }

function v4FinalizeImmediate_(sh, rowNumber, d, body, v, r, finalTitle, token, state) {
  var option = v.option, cs = v4ChoiceState_(d), need = v4ChoiceEmailNeeded_(r, option);
  var base = {ok:true, status:'finalized', finalOfferOption:option, finalOffer:finalTitle, choiceEmailRequired:need,
    choiceEmailSent:false, choiceEmailSuppressed:false,
    resultEmailSent:state.resultEmailSent, resultEmailSuppressed:state.resultEmailSuppressed};
  if (cs.status === 'sent') {
    if (cs.option === option) return v4Merge_(base, {idempotent:true, choiceEmailSent:cs.sent, choiceEmailSuppressed:cs.suppressed});
    return {ok:false, status:'choice_locked_after_email', code:'EMAIL_ALREADY_SENT',
      savedFinalOfferOption:cs.option, savedFinalOffer:state.finalOffer,
      message:'The email for the choice you saved has already been sent.'};
  }
  if (cs.status === 'sending') {
    if (v4SendingFresh_(d['V4 Choice Email Error']))
      return {ok:false, code:'SEND_IN_PROGRESS', message:'Your email is being prepared. Please wait a moment.'};
    return {ok:false, code:'NEEDS_REVIEW', message:'Your choice is saved. Please contact Your Mind Story if you need the details again.'};
  }
  if (!need && state.saved && state.finalOfferOption === option) return v4Merge_(base, {idempotent:true});

  var fields = {
    'V4 Final Offer Shown':finalTitle, 'V4 Result Email Route':option, 'V4 Decision Saved UTC':utcV4_(),
    'V4 Assessment Build':V3_BACKEND_BUILD,
    'V4 Post-Result Question 1 Option ID':v.q1Id, 'V4 Post-Result Question 1 Answer':v.q1Answer,
    'V4 Post-Result Question 2 Option ID':v.q2Id, 'V4 Post-Result Question 2 Answer':v.q2Answer,
    'V4 Existing Barrier Answer':clean_(answerText_(body.barrierAnswer || null))
  };
  if (body.supportPreference && V4_COMPLETE_OPTIONS_.indexOf(option) !== -1) {
    fields['V4 Support Preference Question'] = 'Final Complete support choice';
    fields['V4 Support Preference Option ID'] = option;
    fields['V4 Support Preference Answer'] = finalTitle;
  }
  if (need) {
    // Claimed in the same write as the choice, before anything is sent.
    fields['V4 Choice Email Status'] = 'sending';
    fields['V4 Choice Email Option'] = option;
    fields['V4 Choice Email Error'] = 'sending since ' + new Date().toISOString();
  }
  V3_EXTRA_HEADERS.slice(-4).forEach(function(h){ ensureHeaderV3_(sh, h); });
  saveV4DecisionBlock_(sh, rowNumber, fields);
  try { SpreadsheetApp.flush(); } catch (fe) {}
  if (!need) return base;
  V4_AFTER_LOCK_ = {kind:'choice', sheet:sh, rowNumber:rowNumber, token:token, out:base, option:option, result:r,
    customer:{email:String(d['Email']||''), firstName:String(d['First Name']||'')},
    journeyId:String(d['Journey ID']||''), submissionId:String(d['Submission ID']||'')};
  return base;
}

// Page-triggered retry of HER results email (token-gated). Only a recorded failure on an r8 row is retried.
function v4ClaimResultEmailRetry_(body) {
  var token = clean_(body.resultToken);
  if (!token) return {ok:false, code:'MISSING_RESULT_TOKEN'};
  var sh = getV3Sheet_(), rowNumber = findRowNumber_(sh, {resultToken:token});
  if (!rowNumber) return {ok:false, code:'NOT_FOUND'};
  var d = rowObject_(sh, rowNumber), provider = clean_(d['Result Email Provider']);
  if (clean_(d['V4 Email Flow']) !== V4_EMAIL_FLOW_IMMEDIATE_) return {ok:false, code:'NOT_RETRYABLE', reason:'saved before r8'};
  if (clean_(d['Result Email Sent'])) return {ok:true, status:'already_sent', resultEmailSent:provider !== 'dev-suppressed', resultEmailSuppressed:provider === 'dev-suppressed'};
  if (provider === 'sending') return {ok:false, code:v4SendingFresh_(d['Result Email Error']) ? 'SEND_IN_PROGRESS' : 'NEEDS_REVIEW'};
  if (provider !== 'failed') return {ok:false, code:'NOT_RETRYABLE', reason:provider || 'none'};
  setByHeader_(sh, rowNumber, 'Result Email Provider', 'sending');
  setByHeader_(sh, rowNumber, 'Result Email Error', 'sending since ' + new Date().toISOString());
  try { SpreadsheetApp.flush(); } catch (fe) {}
  var out = {ok:true, status:'retried', resultEmailSent:false, resultEmailSuppressed:false};
  V4_AFTER_LOCK_ = {kind:'result', sheet:sh, rowNumber:rowNumber, token:token, out:out, result:storedResultV4_(d),
    customer:{email:String(d['Email']||''), firstName:String(d['First Name']||'')},
    journeyId:String(d['Journey ID']||''), submissionId:String(d['Submission ID']||'')};
  return out;
}

function v4ForcedFailure_() { return v4IsDev_() && v4ScriptProp_('V4_DEV_FORCE_EMAIL_FAIL') === 'yes'; }

// Runs after the lock is released: one MailApp send, then its outcome is written to her row.
function v4RunEmailJob_(job) {
  var out = job.out || {}, delivery;
  try {
    if (v4ForcedFailure_()) delivery = {ok:false, provider:'none', error:'DEV forced failure (test only)'};
    else if (job.kind === 'choice') delivery = v4SendChoiceEmail_(job.customer, job.result, job.option, job.journeyId, job.submissionId);
    else delivery = sendResultEmailV3_(job.customer, job.result, job.token, job.journeyId, job.submissionId, '');
  } catch (sendErr) { delivery = {ok:false, provider:'none', error:String(sendErr)}; }
  var suppressed = delivery.ok && delivery.provider === 'dev-suppressed';
  var stamp = Utilities.formatDate(new Date(), 'Europe/London', 'dd/MM/yyyy HH:mm:ss');
  try {
    // Same request, same row (rows are only ever appended), so no read is needed before these writes.
    var sh = job.sheet || getV3Sheet_(), row = job.rowNumber;
    if (row) {
      if (job.kind === 'choice') {
        setByHeader_(sh, row, 'V4 Choice Email Status', delivery.ok ? 'sent' : 'failed');
        setByHeader_(sh, row, 'V4 Choice Email Sent', delivery.ok ? (suppressed ? 'dev-suppressed' : stamp) : '');
        setByHeader_(sh, row, 'V4 Choice Email Error', String(delivery.error || '').slice(0, 1000));
      } else {
        setByHeader_(sh, row, 'Result Email Provider', delivery.ok ? (delivery.provider || 'mailapp') : 'failed');
        setByHeader_(sh, row, 'Result Email Error', String(delivery.error || '').slice(0, 1000));
        if (delivery.ok) setByHeader_(sh, row, 'Result Email Sent', stamp);
      }
      SpreadsheetApp.flush();
    }
  } catch (recErr) { console.error('V4 email record failed (' + job.kind + '): ' + recErr); }
  if (job.kind === 'choice') {
    out.choiceEmailSent = delivery.ok && !suppressed; out.choiceEmailSuppressed = suppressed;
    out.choiceEmailError = delivery.ok ? '' : 'failed';
    if (delivery.ok) { try { CacheService.getScriptCache().put('v4fin:' + job.token, job.option, 21600); } catch (ce) {} }
  } else {
    out.resultEmailSent = delivery.ok && !suppressed; out.resultEmailSuppressed = suppressed;
    out.resultEmailProvider = delivery.ok ? (delivery.provider || 'mailapp') : 'failed';
    out.resultEmailError = delivery.ok ? '' : 'failed';
  }
  return out;
}

function buildChoiceLetterV4_(firstName, r, option, journeyId, submissionId) {
  var title, url, label;
  if (option === 'bare_minimum') {
    title = BARE_MINIMUM_PRICE_LINE_V3; label = 'START WITH THE BARE MINIMUM';
    url = withTrackingV3_(BARE_MINIMUM_URL, {category:'bare_minimum'}, journeyId, submissionId);
  } else {
    var c = COMPLETE_CHOICES_V3.filter(function(x){ return x.option === option; })[0];
    if (!c) throw new Error('Unknown Complete option: ' + option);
    title = c.title; label = 'START MY SESSIONS';
    url = completeChoiceLinkV3_(c, r, journeyId, submissionId);
  }
  url = url.replace('utm_campaign=v4_result_email', 'utm_campaign=v4_choice_email');
  var e = escapeHtmlV3_, P = '<p style="margin:0 0 18px;">';
  var html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:0 4px;color:#111827;font-size:16px;line-height:1.65;">'+
    P+'Hi '+e(firstName)+',</p>'+
    P+e(V4_CHOICE_EMAIL_OPENING_)+'</p>'+
    '<p style="font-family:Georgia,serif;font-size:20px;font-weight:700;line-height:1.35;margin:4px 0 6px;">'+e(title)+'</p>'+
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0 26px;"><tr><td style="background:#111827;border-radius:2px;">'+
    '<a href="'+e(url)+'" style="display:inline-block;padding:15px 22px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.5px;line-height:1.3;">'+e(label)+'</a></td></tr></table>'+
    P+'With care,</p><p style="margin:0 0 18px;">Onye<br>Your Mind Story<br>Cognitive Behavioral Hypnotherapist</p></div>';
  var text = 'Hi '+firstName+',\n\n'+V4_CHOICE_EMAIL_OPENING_+'\n\n'+title+'\n\n'+label+'\n'+url+'\n\n'+
    'With care,\nOnye\nYour Mind Story\nCognitive Behavioral Hypnotherapist';
  return {subject:V4_CHOICE_EMAIL_SUBJECT_, html:html, text:text, link:url, title:title};
}
function v4SendChoiceEmail_(customer, r, option, journeyId, submissionId) {
  var L = buildChoiceLetterV4_(clean_(customer.firstName), r, option, journeyId, submissionId);
  return deliverResultEmailV3_(clean_(customer.email).toLowerCase(), clean_(customer.firstName), L.subject, L.html, L.text);
}

// Owner tools (run from the Apps Script editor; never triggered automatically).
// listV4EmailProblems: read-only list of r8 rows whose results or choice email failed or is stuck in 'sending'.
// retryFailedV4Emails: resends ONLY sends recorded as 'failed' on r8 rows. Rows saved before r8 are never touched.
function listV4EmailProblems() {
  var sh = getV3Sheet_(), last = sh.getLastRow(); if (last < 2) return [];
  var H = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0], V = sh.getRange(2,1,last-1,H.length).getValues(), out = [];
  var ix = function(h){ return H.indexOf(h); };
  V.forEach(function(row, i){
    if (String(row[ix('V4 Email Flow')]) !== V4_EMAIL_FLOW_IMMEDIATE_) return;
    var p = String(row[ix('Result Email Provider')]), c = String(row[ix('V4 Choice Email Status')]);
    if (p === 'failed' || p === 'sending' || c === 'failed' || c === 'sending')
      out.push({row:i+2, resultEmail:p, choiceEmail:c, test:String(row[ix('Test Record')])});
  });
  console.log(JSON.stringify(out)); return out;
}
function retryFailedV4Emails() {
  var done = [];
  listV4EmailProblems().forEach(function(p){
    var lock = LockService.getScriptLock(); if (!lock.tryLock(30000)) return;
    var job = null;
    try {
      var sh = getV3Sheet_(), d = rowObject_(sh, p.row), token = clean_(d['Result Token']);
      var base = {customer:{email:String(d['Email']||''), firstName:String(d['First Name']||'')}, result:storedResultV4_(d),
        journeyId:String(d['Journey ID']||''), submissionId:String(d['Submission ID']||''), rowNumber:p.row, token:token, out:{}};
      if (clean_(d['Result Email Provider']) === 'failed' && !clean_(d['Result Email Sent'])) {
        setByHeader_(sh, p.row, 'Result Email Provider', 'sending');
        setByHeader_(sh, p.row, 'Result Email Error', 'sending since ' + new Date().toISOString());
        job = v4Merge_(base, {kind:'result'});
      } else if (clean_(d['V4 Choice Email Status']) === 'failed' && clean_(d['V4 Choice Email Option'])) {
        setByHeader_(sh, p.row, 'V4 Choice Email Status', 'sending');
        setByHeader_(sh, p.row, 'V4 Choice Email Error', 'sending since ' + new Date().toISOString());
        job = v4Merge_(base, {kind:'choice', option:clean_(d['V4 Choice Email Option'])});
      }
      SpreadsheetApp.flush();
    } finally { lock.releaseLock(); }
    if (job) { var o = v4RunEmailJob_(job); done.push({row:p.row, kind:job.kind, sent:!!(o.resultEmailSent || o.choiceEmailSent || o.resultEmailSuppressed || o.choiceEmailSuppressed)}); }
  });
  console.log(JSON.stringify(done)); return done;
}

/* ============================== JOURNEY EVENTS ============================== */

// 'purchase' is deliberately NOT accepted here: this endpoint is public, so a purchase
// sent from a browser could be faked. Purchases arrive only via recordStanPurchasesV3_.
var V3_JOURNEY_EVENTS = [
  // V4 question-flow events are legitimate first-party steps (no PII in analytics).
  'assessment_start','assessment_question_view','assessment_option_click',
  'assessment_back_click','assessment_continue_click','assessment_email_capture_view',
  // r8 (3 Nov 2026): email-screen events. No name, email or free text: only a fixed reason/code.
  'assessment_capture_submit_click','assessment_capture_validation_error','assessment_capture_submit_error','assessment_capture_leave_during_save',
  'result_view',
  'result_step_view',
  'sales_page_view',
  'recommendation_reveal_click',
  'recommendation_shown',
  'final_route_shown',
  'primary_cta_click',
  'recommendation_click',
  'checkout_click',
  'sales_step_view',
  'outbound_payhip_click',
  'outbound_stan_click',
  'purchase_return_view',
  // Result-email Complete choices (via yourmindstory.co.uk/assessment/choice/). Clicks only, never purchases.
  'complete_self_guided_click',
  'reality_reset_click',
  'pattern_break_click',
  // r3: optional recommendation video and post-result question progress (no answer text, no personal data).
  'recommendation_video_play',
  'post_result_question_answered',
  // r7 (3 Nov 2026, live-funnel repair): events the page already sent but the backend rejected, plus the
  // offer-selection steps and video engagement that were not measured. IDs and percentages only, no personal data.
  'result_back_click',
  'offer_select_click','offer_confirm_click','offer_confirm_cancel','offer_confirm_error',
  'video_impression','video_start','video_progress_25','video_progress_50','video_progress_75','video_complete'
];

// Every journey event (accepted or rejected) is written to this log, one row per event, so failures are visible.
var V3_JOURNEY_LOG_SHEET = 'V4 Journey Events';
var V3_JOURNEY_LOG_HEADERS = ['Event Time (UK)','Event','Page','Status','Submission ID','Journey ID','Result Token','V3 Row',
  'Step / Screen','Product','Route','CTA','Entry','Analytics Consent','Client Time'];
var V3_JOURNEY_SUMMARY_HEADERS = ['Last Journey Event','Last Journey Event At','Analytics Consent','Sales Page Entry'];

function getJourneyLogSheetV3_() {
  var ss = openYMSV4Sheet_();
  var sh = ss.getSheetByName(V3_JOURNEY_LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(V3_JOURNEY_LOG_SHEET);
    sh.getRange(1,1,1,V3_JOURNEY_LOG_HEADERS.length).setValues([V3_JOURNEY_LOG_HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

// r7b (3 Nov 2026, speed): inside one journey request the log rows are collected and written in ONE call
// (previously one appendRow per event, about half of the time a 10-event batch held the script lock).
var V4_JLOG_BUFFER_ = null;
function v4FlushJourneyLog_() {
  var rows = V4_JLOG_BUFFER_; V4_JLOG_BUFFER_ = null;
  if (!rows || !rows.length) return;
  try {
    var sh = getJourneyLogSheetV3_();
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  } catch (err) {
    console.error('Journey log batch write failed, writing one by one: ' + err);
    rows.forEach(function(r){ try { getJourneyLogSheetV3_().appendRow(r); } catch (e2) { console.error('Journey log write failed: ' + e2); } });
  }
}
function logJourneyV3_(stamp, eventType, page, status, identity, rowNumber, values, consent) {
  try {
    values = values || {};
    var logRow = [
      stamp, eventType || '', page || '', status, identity.submissionId || '', identity.journeyId || '',
      identity.resultToken || '', rowNumber || '',
      clean_(values.step || values.screen || '') + (clean_(values.option_id) ? ' = ' + clean_(values.option_id) : ''),
      clean_(values.product), clean_(values.route), clean_(values.cta), clean_(values.entry),
      consent || '', clean_(values.clientTime)
    ];
    if (V4_JLOG_BUFFER_) V4_JLOG_BUFFER_.push(logRow); else getJourneyLogSheetV3_().appendRow(logRow);
  } catch (err) {
    console.error('Journey log write failed: ' + err);
  }
}

// Accepts one event (legacy 'recordJourneyEvent') or several in one request ('recordJourneyEvents').
// Writes only to the woman's existing row (found by Result Token, then Submission ID, then Journey ID).
function handleJourneyRequestV3_(body) {
  var lock = LockService.getScriptLock();
  var locked = false;
  V4_TIMING_ = []; V4_TIMING_.t0 = Date.now();
  try { locked = lock.tryLock(8000); } catch (lockErr) { locked = false; }
  v4Mark_(locked ? 'lock' : 'nolock');
  // Batch the log only while holding the lock (a concurrent batch write could otherwise overwrite rows).
  V4_JLOG_BUFFER_ = locked ? [] : null;
  try {
    var list;
    if (body.action === 'recordJourneyEvents' && Array.isArray(body.events)) {
      list = body.events.slice(0, 10);
    } else {
      var lv = body.values && typeof body.values === 'object' ? body.values : {};
      if (!lv.product && body.product) lv.product = body.product;
      if (!lv.route && body.route) lv.route = body.route;
      list = [{eventType: body.eventType, values: lv}];
    }
    var identity = {
      resultToken: clean_(body.resultToken),
      submissionId: clean_(body.submissionId),
      journeyId: clean_(body.journeyId)
    };
    var page = clean_(body.page);
    var consent = clean_(body.analyticsConsent);
    var entry = clean_(body.entry);
    var stamp = Utilities.formatDate(new Date(),'Europe/London','dd/MM/yyyy HH:mm:ss');
    function vals_(ev) {
      var x = ev && ev.values && typeof ev.values === 'object' ? ev.values : {};
      if (ev && ev.clientTime && !x.clientTime) x.clientTime = ev.clientTime;
      if (entry && !x.entry) x.entry = entry;
      return x;
    }
    if (!identity.resultToken && !identity.submissionId && !identity.journeyId) {
      list.forEach(function(ev){ logJourneyV3_(stamp, clean_(ev && ev.eventType), page, 'MISSING_IDENTITY', identity, '', vals_(ev), consent); });
      return json_({ok:false,status:'error',code:'MISSING_IDENTITY',message:'Missing resultToken, submissionId or journeyId'});
    }
    // r7e: find her row before anything is written (a read after a write costs a separate round trip).
    var sheet = getV3Sheet_();
    var rowNumber = findRowNumber_(sheet, identity);
    v4Mark_('row');
    recordCanonicalJourneyV3_(body, list, identity);
    v4Mark_('funnel');
    if (!v4IsDev_() && list.some(function(ev){ return clean_(ev && ev.eventType) === 'purchase_return_view'; })) {
      try { syncAllV3_(); } catch (syncErr) { console.error('Sync after Payhip return failed: ' + syncErr); }
    }
    if (!rowNumber) {
      // Before the assessment is submitted there is no row yet: that is expected, not an error.
      var preSub = list.every(function(ev){ return /^assessment_/.test(clean_(ev && ev.eventType)); });
      list.forEach(function(ev){ logJourneyV3_(stamp, clean_(ev && ev.eventType), page, preSub ? 'PRE_SUBMISSION (no row yet)' : 'ROW_NOT_FOUND', identity, '', vals_(ev), consent); });
      v4Mark_('preSub'); return json_({_timing: v4IsDev_() ? V4_TIMING_.join(' ') + ' n=' + list.length : undefined, ok:false,status:'error',code:'ROW_NOT_FOUND',message:'Existing assessment row not found'});
    }
    var results = [], lastOk = '';
    if (locked) v4RowBufStart_(sheet, rowNumber);
    v4Mark_('rowRead');
    list.forEach(function(ev){
      var eventType = clean_(ev && ev.eventType);
      var values = vals_(ev);
      if (V3_JOURNEY_EVENTS.indexOf(eventType) === -1) {
        logJourneyV3_(stamp, eventType, page, 'UNKNOWN_EVENT', identity, rowNumber, values, consent);
        results.push({eventType:eventType, ok:false, code:'UNKNOWN_EVENT'});
        return;
      }
      try {
        applyJourneyEventV3_(sheet, rowNumber, eventType, identity, values, stamp);
        logJourneyV3_(stamp, eventType, page, 'OK', identity, rowNumber, values, consent);
        results.push({eventType:eventType, ok:true});
        lastOk = eventType;
      } catch (evErr) {
        console.error('Journey event ' + eventType + ' failed: ' + evErr);
        logJourneyV3_(stamp, eventType, page, 'ERROR: ' + String(evErr).slice(0,200), identity, rowNumber, values, consent);
        results.push({eventType:eventType, ok:false, code:'WRITE_FAILED'});
      }
    });
    try {
      V3_JOURNEY_SUMMARY_HEADERS.forEach(function(h){ ensureHeaderV3_(sheet, h); });
      if (lastOk) {
        setByHeader_(sheet, rowNumber, 'Last Journey Event', lastOk);
        setByHeader_(sheet, rowNumber, 'Last Journey Event At', stamp);
      }
      if (consent) setByHeader_(sheet, rowNumber, 'Analytics Consent', consent);
      if (entry) setFirstByHeader_(sheet, rowNumber, 'Sales Page Entry', entry);
    } catch (sumErr) {
      console.error('Journey summary write failed: ' + sumErr);
    }
    var single = list.length === 1 ? results[0] : null;
    v4Mark_('rowWrites');
    return json_({
      _timing: v4IsDev_() ? V4_TIMING_.join(' ') + ' n=' + list.length : undefined,
      ok: results.some(function(r){ return r.ok; }), status: 'ok', action: body.action,
      eventType: single ? single.eventType : undefined, rowNumber: rowNumber, results: results
    });
  } finally {
    v4RowBufEnd_();
    v4FlushJourneyLog_();
    v4Mark_('log'); v4TimingLog_('events'); V4_TIMING_ = null;
    if (locked) { try { lock.releaseLock(); } catch (relErr) {} }
  }
}

function applyJourneyEventV3_(sheet, rowNumber, eventType, identity, values, stamp) {
  var product = clean_(values.product);
  var route = clean_(values.route);
  var cta = clean_(values.cta || product || route);
  // Stepped sales page (RTY-stepped-mobile-v1): screen views + checkout source screen.
  recordSalesEventV3_(sheet, rowNumber, eventType, identity, values, stamp);
  if (eventType === 'post_result_question_answered') {
    v4SaveAnsweredQuestion_(sheet, rowNumber, clean_(values.step), clean_(values.option_id));
  }
  if (eventType === 'result_view') {
    setFirstByHeader_(sheet,rowNumber,'Result Viewed At',stamp);
  } else if (eventType === 'result_step_view') {
    var step = clean_(values.step || values.step_number || '');
    if (step) setByHeader_(sheet,rowNumber,'Result Step Last Viewed',step + (values.total_steps ? ' / '+clean_(values.total_steps) : ''));
  } else if (eventType === 'sales_page_view') {
    setFirstByHeader_(sheet,rowNumber,'Sales Page Viewed At',stamp);
  } else if (eventType === 'recommendation_reveal_click') {
    setFirstByHeader_(sheet,rowNumber,'Recommendation Reveal Clicked At',stamp);
  } else if (eventType === 'recommendation_shown') {
    setFirstByHeader_(sheet,rowNumber,'Recommendation Shown At',stamp);
    if (route) setByHeader_(sheet,rowNumber,'Final Route Shown',route);
    if (product) setByHeader_(sheet,rowNumber,'Final Recommendation',product);
  } else if (eventType === 'final_route_shown') {
    if (route) setByHeader_(sheet,rowNumber,'Final Route Shown',route);
    if (product) setByHeader_(sheet,rowNumber,'Final Recommendation',product);
    setFirstByHeader_(sheet,rowNumber,'Recommendation Shown At',stamp);
  } else if (eventType === 'primary_cta_click' || eventType === 'recommendation_click') {
    if (cta) {
      setByHeader_(sheet,rowNumber,'Primary CTA Clicked',cta);
      setFirstByHeader_(sheet,rowNumber,'Primary CTA Clicked At',stamp);
      setByHeader_(sheet,rowNumber,'Recommendation CTA Clicked',cta);
    }
    recordProductSpecificClick_(sheet,rowNumber,route,product,stamp);
  } else if (eventType === 'checkout_click' || eventType === 'outbound_stan_click') {
    setByHeader_(sheet,rowNumber,'Checkout Clicked',product || cta || 'Yes');
    setFirstByHeader_(sheet,rowNumber,'Checkout Clicked At',stamp);
    if (cta) {
      setByHeader_(sheet,rowNumber,'Primary CTA Clicked',cta);
      setFirstByHeader_(sheet,rowNumber,'Primary CTA Clicked At',stamp);
      setByHeader_(sheet,rowNumber,'Recommendation CTA Clicked',cta);
    }
    recordProductSpecificClick_(sheet,rowNumber,route,product,stamp);
  }
}

// Legacy click columns are kept so historical rows stay readable. Current routes only
// ever produce Bare Minimum clicks here; Bootcamp / Self-Guided are no longer offered.
function recordProductSpecificClick_(sheet,rowNumber,route,product,stamp) {
  var haystack = (String(route||'')+' '+String(product||'')).toLowerCase();
  if (haystack.indexOf('bootcamp') !== -1) {
    setByHeader_(sheet,rowNumber,'Bootcamp Clicked','Yes');
    setFirstByHeader_(sheet,rowNumber,'Bootcamp Clicked At',stamp);
  }
  if (haystack.indexOf('self-guided') !== -1 || haystack.indexOf('self guided') !== -1) {
    setByHeader_(sheet,rowNumber,'Self-Guided Alternative Clicked','Yes');
    setFirstByHeader_(sheet,rowNumber,'Self-Guided Alternative Clicked At',stamp);
  }
  if (haystack.indexOf('bare minimum') !== -1) {
    setByHeader_(sheet,rowNumber,'Bare Minimum Clicked','Yes');
    setFirstByHeader_(sheet,rowNumber,'Bare Minimum Clicked At',stamp);
  }
}

/* ============================== VALIDATION + ROUTING ============================== */

function validateV3_(body) {
  if (!body || typeof body !== 'object') return {ok:false,message:'Missing request body'};
  if (!clean_(body.firstName)) return {ok:false,message:'Missing firstName'};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean_(body.email))) return {ok:false,message:'Missing or invalid email'};
  if (typeof body.marketingConsent !== 'boolean') return {ok:false,message:'marketingConsent must be true or false'};
  if (!body.answers || typeof body.answers !== 'object') return {ok:false,message:'Missing answers object'};
  // Q1-Q12 required; Q13 is multi-select. Q14 is the restored conditional
  // readiness question, required ONLY when the website explicitly displayed that gate.
  // Q15 is historical personal-cost free text; q16 is optional hesitation.
  // A website that never sends readinessRequired must be updated before V4 is live.
  for (var i=1; i<=12; i++) {
    var q = body.answers['q'+i];
    if (!q) return {ok:false,message:'Missing answer for q'+i};
    if (i <= 8) {
      var score = Number(q.score);
      if (!Number.isInteger(score) || score < 0 || score > 3) return {ok:false,message:'Invalid score for q'+i};
    }
    if (!clean_(answerText_(q))) return {ok:false,message:'Missing answer text for q'+i};
  }
  if (!body.answers.q13) return {ok:false,message:'Missing answer for q13'};
  var readiness = clean_(body.readiness) || clean_(answerText_(body.answers.q14));
  if (body.readinessRequired === true && !readiness) return {ok:false,message:'Missing answer for conditional readiness question'};
  if (body.finalOfferOption && !validFinalOfferV4_(body.finalOfferOption)) return {ok:false,message:'Unknown final offer option'};
  return {ok:true};
}

/**
 * Routing — identical to the live result page (assessment/start/index.html showResult()).
 * Stage score = sum of its two questions (0-6). Affected = 3+, clear = 4+, moderate = exactly 3.
 *  - September routing: 3+ qualifying stages (each score >= 3) => Complete £117.
 *  - Otherwise 0/1/2 qualifying stages => ebook/single/pair, capped at the
 *    two highest: 0 → The Bare Minimum, 1 → that single £37, 2 → that pair £74.
 */
function computeV3_(body) {
  function s(n){ return Number(body.answers['q'+n].score); }
  var scores = {
    quiet: s(1)+s(2),
    breakPull: s(3)+s(4),
    restore: s(5)+s(6),
    returnSelf: s(7)+s(8)
  };
  var stagePairs = [
    [STAGES[0],scores.quiet,0],
    [STAGES[1],scores.breakPull,1],
    [STAGES[2],scores.restore,2],
    [STAGES[3],scores.returnSelf,3]
  ];
  var affected = stagePairs.filter(function(x){ return x[1] >= 3; });
  var clear = stagePairs.filter(function(x){ return x[1] >= 4; });
  var moderate = stagePairs.filter(function(x){ return x[1] === 3; });
  var qualifying = affected.map(function(x){ return x[0]; });
  var breadth = affected.length;
  var total = scores.quiet + scores.breakPull + scores.restore + scores.returnSelf;
  var wholeJourney = affected.length >= 3;
  var route, product, price, category, recommendedStages;
  if (wholeJourney) {
    route = SERIES_NAME;
    product = SERIES_NAME;
    price = PRICE_SERIES;
    category = 'return_to_you_series';
    recommendedStages = STAGES.slice();
  } else {
    var lower = affected.slice();
    if (lower.length > 2) {
      // Highest score first; ties keep stage order (matches the result page).
      lower.sort(function(a,b){ return (b[1]-a[1]) || (a[2]-b[2]); });
      lower = lower.slice(0,2);
    }
    lower.sort(function(a,b){ return a[2]-b[2]; }); // back to stage order for naming
    recommendedStages = lower.map(function(x){ return x[0]; });
    if (lower.length === 0) {
      route = 'Bare Minimum'; product = 'The Bare Minimum'; price = PRICE_BARE_MINIMUM; category = 'bare_minimum';
    } else if (lower.length === 1) {
      route = 'Single Stage'; product = lower[0][0]; price = PRICE_SINGLE; category = 'single_stage';
    } else {
      route = 'Two-Stage Pair'; product = recommendedStages.join(' → '); price = PRICE_PAIR; category = 'two_stage_pair';
    }
  }
  return {
    scores:scores, total:total, qualifyingStages:qualifying, breadth:breadth,
    route:route, product:product, price:price, category:category, recommendedStages:recommendedStages
  };
}

function productUrlV3_(result) {
  if (result.route === SERIES_NAME) return SERIES_SALES_PAGE_URL;
  if (result.route === 'Two-Stage Pair') return PAIR_URLS[result.product] || '';
  if (result.route === 'Single Stage') return SINGLE_URLS[result.product] || '';
  if (result.route === 'Bare Minimum') return BARE_MINIMUM_URL;
  return '';
}

function buildRowV3_(sheet, body, r, journeyId, submissionId, resultToken, now, extraVals) {
  var uk = Utilities.formatDate(now,'Europe/London','dd/MM/yyyy HH:mm:ss');
  var utc = Utilities.formatDate(now,'UTC',"yyyy-MM-dd'T'HH:mm:ss'Z'");
  var a = body.answers;
  var vals = {};
  var isTest = isTestBody_(body);
  vals['Date & Time'] = uk;
  vals['First Name'] = clean_(body.firstName);
  vals['Email'] = clean_(body.email).toLowerCase();
  vals['Recommended Route'] = r.route;
  vals['Recommended Product'] = r.product;
  vals['Recommended Price'] = r.price;
  vals['Recommendation Category'] = r.category;
  vals['What She Wants'] = answerText_(a.q12);
  vals['Her Open Answer'] = a.q15 ? answerText_(a.q15) : '';
  vals['Current Situation'] = answerText_(a.q11);
  vals['Readiness'] = clean_(body.readiness || (a.q14 ? answerText_(a.q14) : ''));
  vals['Source / Journey'] = deriveSourceJourney_(body);
  vals['Source (Derived v2)'] = deriveSourceV2_(body.assessmentTouchSource || body.firstTouchSource, body.assessmentTouchMedium || body.firstTouchMedium, body.referrer, body.landingUrl, body.userAgent);
  vals['Quiet Score'] = r.scores.quiet;
  vals['Break Score'] = r.scores.breakPull;
  vals['Restore Score'] = r.scores.restore;
  vals['Return Score'] = r.scores.returnSelf;
  vals['Total Score'] = r.total;
  vals['Qualifying Stages'] = r.qualifyingStages.join(', ');
  vals['Breadth'] = r.breadth;
  var questionHeaders = [
    'Q1 Trigger Response','Q2 Time to Settle','Q3 Pull Behaviour','Q4 Attention Taken',
    'Q5 Self-Trust','Q6 Stand By Decisions','Q7 Feel Like Self','Q8 Life Impact',
    'Q9 Belief Position','Q10 Cycle Interruption','Q11 Relationship Context','Q12 Desired Outcome',
    'Q13 What She Has Tried','Q14 Readiness Raw','Q15 Open Answer Raw'
  ];
  for (var i=1;i<=15;i++) vals[questionHeaders[i-1]] = a['q'+i] ? answerText_(a['q'+i]) : '';
  if (!vals['Q14 Readiness Raw'] && body.readiness) vals['Q14 Readiness Raw'] = clean_(body.readiness);
  // V4 captures support preference and hesitation separately; neither modifies stage scores.
  // Accepted fields are either top-level values or the legacy optional answers.q16/q17.
  var pref = body.supportPreference || a.q17 || null;
  var hes = body.hesitation || a.q16 || null;
  vals['V4 Support Preference Question'] = pref ? clean_(body.supportPreferenceQuestion || 'What level of support would you prefer?') : '';
  vals['V4 Support Preference Option ID'] = pref ? choiceIdV4_(pref, body.supportPreferenceOptionId) : '';
  vals['V4 Support Preference Answer'] = pref ? clean_(answerText_(pref)) : '';
  vals['V4 Hesitation Question'] = hes ? clean_(body.hesitationQuestion || 'What, if anything, is making you hesitate about starting to work on this now?') : '';
  vals['V4 Hesitation Option ID'] = hes ? choiceIdV4_(hes, body.hesitationOptionId) : '';
  vals['V4 Hesitation Answer'] = hes ? clean_(answerText_(hes)) : '';
  vals['V4 Final Offer Shown'] = finalOfferTitleV4_(r, clean_(body.finalOfferOption));
  vals['V4 Result Email Route'] = body.deferResultEmail === true ? 'pending final choice' : (clean_(body.finalOfferOption) || r.route);
  vals['V4 Decision Saved UTC'] = body.decisionFinalized === true ? utc : '';
  vals['V4 Assessment Build'] = V3_BACKEND_BUILD;
  vals['Marketing Consent'] = body.marketingConsent === true;
  vals['Final Route Shown'] = r.route;
  vals['Final Recommendation'] = r.product;
  vals['Journey ID'] = journeyId;
  vals['Submission ID'] = submissionId;
  vals['Result Token'] = resultToken;
  vals['Assessment Version'] = V3_VERSION;
  vals['Backend Build'] = V3_BACKEND_BUILD;
  vals['Test Record'] = isTest ? 'TEST' : '';
  vals['GA Client ID'] = clean_(body.gaClientId);
  vals['GA Session ID'] = clean_(body.gaSessionId);
  vals['First Touch Source'] = clean_(body.firstTouchSource);
  vals['First Touch Medium'] = clean_(body.firstTouchMedium);
  vals['First Touch Campaign'] = clean_(body.firstTouchCampaign);
  vals['Assessment Touch Source'] = clean_(body.assessmentTouchSource);
  vals['Assessment Touch Medium'] = clean_(body.assessmentTouchMedium);
  vals['Assessment Touch Campaign'] = clean_(body.assessmentTouchCampaign);
  vals['UTM Content'] = clean_(body.utmContent);
  vals['UTM Term'] = clean_(body.utmTerm);
  vals['Referrer'] = clean_(body.referrer);
  vals['Landing URL'] = clean_(body.landingUrl);
  vals['Submission URL'] = clean_(body.submissionUrl);
  vals['Device / User Agent'] = clean_(body.userAgent);
  vals['Clarity Reference'] = clean_(body.clarityReference);
  vals['Experiment Version'] = clean_(body.experimentVersion) || 'V3-launch';
  vals['Submitted UTC'] = utc;
  vals['Submission Status'] = isTest ? 'complete (TEST)' : 'complete';
  if (extraVals) Object.keys(extraVals).forEach(function(k){ vals[k] = extraVals[k]; });
  var hm = headerMap_(sheet), headers = [];
  Object.keys(hm).forEach(function(h){ headers[hm[h]-1] = h; });
  return headers.map(function(h){ return Object.prototype.hasOwnProperty.call(vals,h) ? vals[h] : ''; });
}

/* ============================== SHEET HELPERS ============================== */

function getV3Sheet_() {
  var ss = openYMSV4Sheet_();
  var sheet = ss.getSheetByName(V3_SHEET_NAME);
  if (!sheet) throw new Error('Missing sheet: '+V3_SHEET_NAME);
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  V3_HEADERS.forEach(function(h){
    if (headers.indexOf(h) === -1) throw new Error('Missing required header: '+h);
  });
  var missing = V3_EXTRA_HEADERS.filter(function(h){ return headers.indexOf(h) === -1; });
  if (!missing.length && !HEADER_CACHE_V3_[sheet.getSheetId()]) {
    // r7e: reuse this header read for headerMap_ instead of reading row 1 again.
    var hm = {}; headers.forEach(function(h,i){ hm[String(h)] = i+1; }); HEADER_CACHE_V3_[sheet.getSheetId()] = hm;
  }
  if (missing.length) {
    var need = headers.length + missing.length;
    if (sheet.getMaxColumns() < need) sheet.insertColumnsAfter(sheet.getMaxColumns(), need - sheet.getMaxColumns());
    sheet.getRange(1, headers.length+1, 1, missing.length).setValues([missing]);
    clearHeaderCache_();
  }
  return sheet;
}

function getPurchasesSheet_() {
  var ss = openYMSV4Sheet_();
  var sheet = ss.getSheetByName(V3_PURCHASES_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(V3_PURCHASES_SHEET_NAME);
    sheet.getRange(1,1,1,V3_PURCHASE_HEADERS.length).setValues([V3_PURCHASE_HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return sheet;
  }
  var headers = sheet.getRange(1,1,1,Math.max(1,sheet.getLastColumn())).getValues()[0];
  var missing = V3_PURCHASE_HEADERS.filter(function(h){ return headers.indexOf(h) === -1; });
  if (missing.length) { sheet.getRange(1, (sheet.getLastColumn()||0)+1, 1, missing.length).setValues([missing]); clearHeaderCache_(); }
  return sheet;
}

function findSubmission_(sheet, submissionId) {
  if (!submissionId || sheet.getLastRow() < 2) return null;
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  var col = headers.indexOf('Submission ID') + 1;
  if (!col) throw new Error('Submission ID header not found');
  var finder = sheet.getRange(2,col,sheet.getLastRow()-1,1).createTextFinder(submissionId).matchEntireCell(true);
  return finder.findNext();
}

// Header row is read once per sheet per request (it was re-read on every single cell write,
// which made each event slow enough for bursts to pile up behind the lock).
var HEADER_CACHE_V3_ = {};
// r7e (3 Nov 2026): while a LOCKED journey batch updates one woman's row, her row is read ONCE and every
// read in the batch comes from that copy. Writes still go to the sheet cell by cell (nothing else in the row is
// rewritten), but with no reads in between, Apps Script sends them together instead of one round trip per
// event. This is what made a batch hold the lock for 5-15 s and delay the save of her assessment or choice.
var V4_ROWBUF_ = null;
function v4RowBufStart_(sheet, rowNumber) {
  V4_ROWBUF_ = null;
  try {
    V4_ROWBUF_ = {sid: sheet.getSheetId(), row: rowNumber,
      vals: sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0]};
  } catch (e) { V4_ROWBUF_ = null; }
}
function v4RowBufEnd_() { V4_ROWBUF_ = null; }
function v4RowBuf_(sheet, rowNumber, col) {
  var b = V4_ROWBUF_;
  return (b && b.row === rowNumber && col >= 1 && col <= b.vals.length && b.sid === sheet.getSheetId()) ? b : null;
}
function clearHeaderCache_() { HEADER_CACHE_V3_ = {}; }
function headerMap_(sheet) {
  var key = sheet.getSheetId();
  if (HEADER_CACHE_V3_[key]) return HEADER_CACHE_V3_[key];
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  var map = {};
  headers.forEach(function(h,i){ map[String(h)] = i+1; });
  HEADER_CACHE_V3_[key] = map;
  return map;
}

function setByHeader_(sheet,rowNumber,headerName,value) {
  var map = headerMap_(sheet);
  var col = map[headerName];
  if (!col) return false;
  sheet.getRange(rowNumber,col).setValue(value);
  var b = v4RowBuf_(sheet,rowNumber,col); if (b) b.vals[col-1] = value;
  return true;
}

function setFirstByHeader_(sheet,rowNumber,headerName,value) {
  var map = headerMap_(sheet);
  var col = map[headerName];
  if (!col) return false;
  var cell = sheet.getRange(rowNumber,col), b = v4RowBuf_(sheet,rowNumber,col);
  if (!String((b ? b.vals[col-1] : cell.getValue())||'').trim()) { cell.setValue(value); if (b) b.vals[col-1] = value; }
  return true;
}

function rowObject_(sheet,rowNumber) {
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(rowNumber,1,1,headers.length).getValues()[0];
  var out = {};
  headers.forEach(function(h,i){ out[String(h)] = values[i]; });
  return out;
}

function findRowNumber_(sheet, identity) {
  if (sheet.getLastRow() < 2) return null;
  var map = headerMap_(sheet);
  var checks = [
    ['Result Token', clean_(identity.resultToken)],
    ['Submission ID', clean_(identity.submissionId)],
    ['Journey ID', clean_(identity.journeyId)]
  ];
  for (var i=0;i<checks.length;i++) {
    var header = checks[i][0], value = checks[i][1], col = map[header];
    if (!value || !col) continue;
    // A journey can contain more than one submission; take the most recent.
    var matches = sheet.getRange(2,col,sheet.getLastRow()-1,1)
      .createTextFinder(value).matchEntireCell(true).findAll();
    if (matches && matches.length) return matches[matches.length-1].getRow();
  }
  return null;
}

/* ============================== SOURCE ATTRIBUTION ============================== */

function deriveSourceJourney_(body) {
  var derived = deriveSourceV2_(
    body.assessmentTouchSource || body.firstTouchSource,
    body.assessmentTouchMedium || body.firstTouchMedium,
    body.referrer, body.landingUrl, body.userAgent
  );
  var fe = clean_(body.sourceJourney);
  if (derived === 'Direct / unknown' && fe && fe !== 'Direct / unknown') return fe;
  return derived;
}

/**
 * Source classification, most reliable signal first:
 * 1. explicit utm_source / utm_medium
 * 2. external referrer host
 * 3. click IDs in the landing URL (fbclid, ttclid, gclid)
 * 4. in-app browser user agent (Instagram, Facebook, TikTok in-app browsers identify themselves)
 * Note: Instagram's in-app browser also adds fbclid, so the UA check for Instagram runs before fbclid.
 */
function deriveSourceV2_(utmSource, utmMedium, referrer, landingUrl, userAgent) {
  var s = String(utmSource||'').toLowerCase().trim();
  var m = String(utmMedium||'').toLowerCase().trim();
  var ref = String(referrer||'').toLowerCase();
  var land = String(landingUrl||'').toLowerCase();
  var ua = String(userAgent||'');
  var refHost = '';
  try { refHost = (ref.match(/^https?:\/\/([^\/?#]+)/)||[])[1] || ''; } catch(e) {}
  if (s) {
    if (/tiktok|^tt$/.test(s)) return 'TikTok';
    if (/instagram|^ig$/.test(s)) return 'Instagram';
    if (/facebook|^fb$|^meta$/.test(s)) return 'Facebook';
    if (/youtube|^yt$/.test(s)) return 'YouTube';
    if (/brevo|mailerlite|email|newsletter/.test(s) || m === 'email') return 'Email';
    if (/stan/.test(s)) return 'Stan Store';
    if (/google/.test(s)) return 'Google';
    if (/hook/.test(s)) return 'Hook Guide';
    return 'Other: '+s;
  }
  if (m === 'email') return 'Email';
  if (refHost && refHost.indexOf('yourmindstory.co.uk') === -1) {
    if (/tiktok/.test(refHost)) return 'TikTok';
    if (/instagram/.test(refHost)) return 'Instagram';
    if (/facebook|fb\.com|fb\.me/.test(refHost)) return 'Facebook';
    if (/youtube|youtu\.be/.test(refHost)) return 'YouTube';
    if (/stan\.store|stanwith\.me/.test(refHost)) return 'Stan Store';
    if (/google\./.test(refHost)) return 'Google';
    if (/bing\.|duckduckgo|yahoo\./.test(refHost)) return 'Search (other)';
    if (/mail\.|brevo|sendibt|mlsend|mailerlite/.test(refHost)) return 'Email';
    return 'Referral: '+refHost;
  }
  if (/[?&]ttclid=/.test(land) || /[?&]ttclid=/.test(ref)) return 'TikTok';
  if (/Instagram/.test(ua)) return 'Instagram';
  if (/musical_ly|TikTok|BytedanceWebview|trill_/i.test(ua)) return 'TikTok';
  if (/[?&]igsh(id)?=/.test(land) || /[?&]igsh(id)?=/.test(ref)) return 'Instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS/.test(ua)) return 'Facebook';
  if (/[?&]fbclid=/.test(land) || /[?&]fbclid=/.test(ref)) return 'Facebook';
  if (/[?&]gclid=/.test(land)) return 'Google Ads';
  return 'Direct / unknown';
}

// Non-destructive: writes the improved classification into 'Source (Derived v2)' only.
function reclassifySourcesV3_() {
  var sheet = getV3Sheet_();
  var last = sheet.getLastRow();
  if (last < 2) return {ok:true,updated:0};
  var map = headerMap_(sheet);
  var width = sheet.getLastColumn();
  var data = sheet.getRange(2,1,last-1,width).getValues();
  var out = data.map(function(r){
    function g(h){ return map[h] ? r[map[h]-1] : ''; }
    return [deriveSourceV2_(g('Assessment Touch Source')||g('First Touch Source'), g('Assessment Touch Medium')||g('First Touch Medium'), g('Referrer'), g('Landing URL'), g('Device / User Agent'))];
  });
  sheet.getRange(2,map['Source (Derived v2)'],out.length,1).setValues(out);
  var counts = {};
  out.forEach(function(x){ counts[x[0]] = (counts[x[0]]||0)+1; });
  return {ok:true,updated:out.length,counts:counts};
}

/* ============================== STAN PURCHASE ATTRIBUTION ============================== */

function canonicalStanProduct_(title, pageId, amount) {
  var pid = String(pageId||'').trim();
  if (pid && STAN_PAGE_PRODUCTS[pid]) return STAN_PAGE_PRODUCTS[pid];
  var t = String(title||'').trim();
  var tl = t.toLowerCase().replace(/\s+/g,' ');
  if (/return to you series|complete self-?guided/.test(tl)) return SERIES_NAME;
  // The four-stage product was titled "RETURN TO YOURSELF" (all caps) on Stan; the single is "Return to Yourself".
  if (t === 'RETURN TO YOURSELF') return SERIES_NAME;
  if (/bare minimum/.test(tl)) return 'The Bare Minimum';
  var found = [];
  if (/quiet the alarm/.test(tl)) found.push(STAGES[0]);
  if (/break the pull/.test(tl)) found.push(STAGES[1]);
  if (/restore self.?trust/.test(tl)) found.push(STAGES[2]);
  if (/return to yourself/.test(tl)) found.push(STAGES[3]);
  if (found.length === 1) return found[0];
  if (found.length === 2) return found.join(' → ');
  return t || 'Unknown product';
}

function productTypeOf_(canonical) {
  if (canonical === SERIES_NAME) return 'return_to_you_series';
  if (canonical === 'The Bare Minimum') return 'bare_minimum';
  if (STAGES.indexOf(canonical) !== -1) return 'single_stage';
  if (PAIR_URLS[canonical]) return 'two_stage_pair';
  return 'other';
}

function toDate_(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v > 1e12 ? v : v*1000);
  var s = String(v||'').trim();
  if (!s) return null;
  var m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?/); // dd/MM/yyyy HH:mm(:ss) London
  if (m) {
    var iso = m[3]+'-'+m[2]+'-'+m[1]+'T'+('0'+m[4]).slice(-2)+':'+m[5]+':'+(m[6]||'00');
    return Utilities.parseDate(iso.replace('T',' '),'Europe/London','yyyy-MM-dd HH:mm:ss');
  }
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Can be run from the editor for manual imports. orders: [{orderId, orderKey?, date (ISO/epoch), email, title, pageId, amount, currency, referrer, source, isTest}]
 * Idempotent: an order already recorded (same Order Key) is updated, never duplicated.
 */
function recordStanPurchasesV3_(orders) {
  if (!Array.isArray(orders) || !orders.length) return {ok:false,status:'error',code:'NO_ORDERS',message:'No orders supplied'};
  var psheet = getPurchasesSheet_();
  var pmap = headerMap_(psheet);
  var results = [];
  var touchedEmails = {};
  orders.forEach(function(o){
    var email = clean_(o.email).toLowerCase();
    var orderId = clean_(o.orderId);
    var when = toDate_(o.date) || new Date();
    var key = clean_(o.orderKey) || (orderId ? 'stan:'+orderId : 'msg:'+Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, email+'|'+when.getTime()+'|'+clean_(o.title)+'|'+clean_(o.amount))));
    var canonical = canonicalStanProduct_(o.title, o.pageId, o.amount);
    var rowVals = {
      'Order Key':key,'Order ID':orderId,
      'Order Date (London)':Utilities.formatDate(when,'Europe/London','dd/MM/yyyy HH:mm:ss'),
      'Order UTC':Utilities.formatDate(when,'UTC',"yyyy-MM-dd'T'HH:mm:ss'Z'"),
      'Purchaser Email':email,'Stan Product Title':clean_(o.title),'Stan Page ID':clean_(o.pageId),
      'Product (Canonical)':canonical,'Product Type':productTypeOf_(canonical),
      'Amount':Number(o.amount)||0,'Currency':clean_(o.currency)||'GBP',
      'Stan Referrer':clean_(o.referrer),'Record Source':clean_(o.source)||'api',
      'Test Record':(o.isTest===true || /\+test/.test(email)) ? 'TEST' : '',
      'Recorded At':Utilities.formatDate(new Date(),'Europe/London','dd/MM/yyyy HH:mm:ss')
    };
    var existing = null;
    if (psheet.getLastRow() >= 2) {
      existing = psheet.getRange(2,pmap['Order Key'],psheet.getLastRow()-1,1).createTextFinder(key).matchEntireCell(true).findNext();
    }
    var rowNumber;
    if (existing) {
      rowNumber = existing.getRow();
      Object.keys(rowVals).forEach(function(h){ if (h !== 'Recorded At' && pmap[h]) psheet.getRange(rowNumber,pmap[h]).setValue(rowVals[h]); });
    } else {
      var headers = psheet.getRange(1,1,1,psheet.getLastColumn()).getValues()[0];
      psheet.appendRow(headers.map(function(h){ return Object.prototype.hasOwnProperty.call(rowVals,h) ? rowVals[h] : ''; }));
      rowNumber = psheet.getLastRow();
    }
    if (email) touchedEmails[email] = true;
    results.push({orderKey:key,row:rowNumber,duplicate:!!existing,product:canonical});
  });
  var matched = 0;
  Object.keys(touchedEmails).forEach(function(email){ matched += rematchPurchasesForEmail_(email); });
  return {ok:true,status:'ok',recorded:results.length,duplicates:results.filter(function(r){return r.duplicate;}).length,matchedOrders:matched,orders:results};
}

/* ============================== RESULT EMAIL ============================== */

function makeResultToken_() {
  return Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'').slice(0,8);
}

function escapeHtmlV3_(v) {
  return String(v==null?'':v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Adds journey identifiers + email UTMs to the CTA so clicks from the email are attributable.
function withTrackingV3_(url, result, journeyId, submissionId) {
  if (!url) return url;
  var sep = url.indexOf('?') === -1 ? '?' : '&';
  var params = {
    utm_source:'yms_assessment', utm_medium:'email', utm_campaign:'v4_result_email',
    utm_content:result.category || ''
  };
  // DEV: no jid/sid, so the live /assessment/choice/ redirect never logs a DEV click into the production V4 workbook.
  if (!v4IsDev_() && url.indexOf('yourmindstory.co.uk') !== -1) { params.jid = journeyId || ''; params.sid = submissionId || ''; }
  return url + sep + Object.keys(params).filter(function(k){return params[k];}).map(function(k){ return k+'='+encodeURIComponent(params[k]); }).join('&');
}

// Original result email. Since 2026-10-15 used ONLY for the Bare Minimum route (unchanged).
function sendResultEmailLegacyV3_(body,result,resultToken,journeyId,submissionId) {
  var errors=[];
  try {
    var firstName=clean_(body.firstName);
    var email=clean_(body.email).toLowerCase();
    var content=buildV3EmailContent_(result);
    var buttonUrl=withTrackingV3_(content.buttonUrl, result, journeyId, submissionId);
    // Secondary, visually smaller option (Return to You Series emails only, added 2026-10-09).
    var secondaryUrl=content.secondaryButtonUrl ? withTrackingV3_(content.secondaryButtonUrl, {category:'return_to_you_series_start_single'}, journeyId, submissionId) : '';
    var resultLink=savedResultLinkV3_(resultToken,result,journeyId,submissionId);
    var subject='Your Mind Story: your assessment result is ready';
    var plainBody=
      'Hi '+firstName+',\n\n'+
      'Thank you for taking the Your Mind Story assessment.\n\n'+
      'YOUR RESULT\n\n'+
      (content.resultText ? content.resultText+'\n\n' : '')+
      content.recommendationText+'\n\n'+
      content.buttonLabel+'\n'+
      buttonUrl+'\n\n'+
      (secondaryUrl ? content.secondaryText+'\n\n'+content.secondaryButtonLabel+'\n'+secondaryUrl+'\n\n' : '')+
      RESULT_EMAIL_SOCIAL_PROOF_1900_V3+'\n\n'+
      (resultLink ? 'VIEW MY PERSONALISED RESULTS\n'+resultLink+'\n\n' : '')+
      'With care,\nOnye';
    var htmlBody=
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111827;font-size:16px;line-height:1.65;">'+
      '<p>Hi '+escapeHtmlV3_(firstName)+',</p>'+
      '<p>Thank you for taking the Your Mind Story assessment.</p>'+
      '<p style="font-size:12px;font-weight:700;letter-spacing:2px;margin-top:32px;margin-bottom:18px;">YOUR RESULT</p>'+
      content.resultHtml+
      content.recommendationHtml+
      '<p style="margin:32px 0;"><a href="'+escapeHtmlV3_(buttonUrl)+'" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:15px 22px;font-weight:700;border-radius:2px;">'+escapeHtmlV3_(content.buttonLabel)+'</a></p>'+
      (secondaryUrl ? '<div style="border-top:1px solid #e5e7eb;margin:0 0 32px;padding-top:24px;font-size:15px;line-height:1.6;color:#374151;">'+content.secondaryHtml+
        '<p style="margin:20px 0 0;"><a href="'+escapeHtmlV3_(secondaryUrl)+'" style="display:inline-block;background:#ffffff;color:#111827;text-decoration:none;padding:10px 16px;font-size:14px;font-weight:700;border:1px solid #111827;border-radius:2px;">'+escapeHtmlV3_(content.secondaryButtonLabel)+'</a></p></div>' : '')+
      '<p>'+escapeHtmlV3_(RESULT_EMAIL_SOCIAL_PROOF_1900_V3)+'</p>'+
      (resultLink ? '<p style="margin:10px 0 24px;"><a href="'+escapeHtmlV3_(resultLink)+'">VIEW MY PERSONALISED RESULTS</a></p>' : '')+
      '<p>With care,<br>Onye</p>'+
      '</div>';
    var sent=deliverResultEmailV3_(email,firstName,subject,htmlBody,plainBody);
    if (!sent.ok) throw new Error(sent.error);
    return sent;
  } catch(err) {
    errors.push('Email build/send error: '+String(err));
  }
  return {ok:false,provider:'none',error:errors.join(' | ')};
}

/* ============================== RESULT EMAIL — "I’ve looked at your answers" (approved 2026-10-28) ============================== */
// Stage routes (4 singles, 6 pairs, Complete) get this email. The Bare Minimum route keeps its own
// email, unchanged, via sendResultEmailLegacyV3_.
// Customer-facing copy below is approved verbatim. Do not reword it without Onye's approval.
// Scoring, routing, saved prices and the single/pair Stan mappings are NOT defined here.

var RESULT_EMAIL_PREVIEW_V3 = 'Here’s where I recommend you start.';
var RESULT_EMAIL_TEST_TO_V3 = 'yourmindstory.co.uk@gmail.com';
function resultEmailSubjectV3_(firstName) { return firstName + ', I’ve looked at your answers'; }

// Customer-facing stage names. Routing/product keys (STAGES, SINGLE_URLS, PAIR_URLS) are unchanged.
var STAGE_DISPLAY_V3 = {'Return to Yourself':'Return to You'};
function stageDisplayV3_(s) { return STAGE_DISPLAY_V3[s] || s; }

// Shared middle of every stage email (between the result block and the recommendation block).
var RESULT_EMAIL_MIDDLE_V3 = [
  'There’s a reason I focus on these four areas.',
  'More than 1,900 women have now taken the Your Mind Story assessment. Although their circumstances differ, the same difficulties keep appearing: the alarm, the pull, losing self-trust and losing themselves in the relationship.',
  'Understanding what’s happening is one thing. Being able to respond differently is another.',
  'That’s where my work begins.'
];

// r6 (owner decision 2 Nov 2026): approved positioning line, hypnotherapy routes only (never the ebook).
var RESULT_EMAIL_POSITIONING_V3 = 'Feel like yourself again, whether he’s in your life or not.';
// r6: Bare Minimum (ebook) email gets its price and the verified 1,900-women statement. No hypnotherapy wording.
var BARE_MINIMUM_PRICE_LINE_V3 = 'The Bare Minimum · £4.99';
var RESULT_EMAIL_SOCIAL_PROOF_1900_V3 = RESULT_EMAIL_MIDDLE_V3[1];

var RESULT_EMAIL_SINGLE_V3 = {
  'Quiet the Alarm': {
    result: ['Your answers show that the area affecting you most right now is the anxiety and alarm that gets triggered by what’s happening with him.'],
    rec: ['That’s why I recommend starting with Quiet the Alarm.',
          'This is where we work on the response that gets triggered when something happens with him, so you can start feeling calmer rather than being pulled straight into the anxiety.'],
    priceLine: 'Quiet the Alarm — £37',
    button: 'START WITH QUIET THE ALARM'
  },
  'Break the Pull': {
    result: ['Your answers show that the area affecting you most right now is the pull back towards him: checking, reaching out, replaying things or looking for reassurance.'],
    rec: ['That’s why I recommend starting with Break the Pull.',
          'This is where we work on those automatic urges that keep pulling your attention back to him, even when part of you has already decided you don’t want to keep doing it.'],
    priceLine: 'Break the Pull — £37',
    button: 'START WITH BREAK THE PULL'
  },
  'Restore Self-Trust': {
    result: ['Your answers show that the area affecting you most right now is trusting yourself and standing by the decisions and boundaries you make for yourself.'],
    rec: ['That’s why I recommend starting with Restore Self-Trust.',
          'This is where we work on being able to trust your own decisions again, rather than repeatedly finding yourself going against what you said you were going to do.'],
    priceLine: 'Restore Self-Trust — £37',
    button: 'START WITH RESTORE SELF-TRUST'
  },
  'Return to Yourself': {
    result: ['Your answers show that the area affecting you most right now is how much of your attention, energy and life has become caught up in what’s happening with him.'],
    rec: ['That’s why I recommend starting with Return to You.',
          'This is where we work on bringing your attention back to you and your own life, so everything doesn’t keep revolving around what he is or isn’t doing.'],
    priceLine: 'Return to You — £37',
    button: 'START WITH RETURN TO YOU'
  }
};

// Keys are the existing pair product keys (PAIR_URLS). Price line uses the £74 pair price.
var RESULT_EMAIL_PAIR_V3 = {
  'Quiet the Alarm → Break the Pull': {
    result: ['Your answers show that two areas are affecting you more strongly: the anxiety and alarm, and the pull to check, reach out, replay things or look for reassurance.'],
    rec: ['That’s why I recommend Quiet the Alarm followed by Break the Pull. We work on the alarm first, then the responses it can pull you into.']
  },
  'Quiet the Alarm → Restore Self-Trust': {
    result: ['Your answers show that two areas are affecting you more strongly: the anxiety and alarm, and how difficult it can be to trust and stand by your own decisions.'],
    rec: ['That’s why I recommend Quiet the Alarm followed by Restore Self-Trust. We work on settling that alarm and then on being able to trust yourself and the decisions you make.']
  },
  'Quiet the Alarm → Return to Yourself': {
    result: ['Your answers show that two areas are affecting you more strongly: the anxiety and alarm, and how much of your attention and energy is being pulled away from you and back onto him.'],
    rec: ['That’s why I recommend Quiet the Alarm followed by Return to You. We work on the alarm first, then on bringing more of your attention and energy back to you and your own life.']
  },
  'Break the Pull → Restore Self-Trust': {
    result: ['Your answers show that two areas are affecting you more strongly: the pull to check, reach out or look for reassurance, and how difficult it can be to trust and stand by your own decisions.'],
    rec: ['That’s why I recommend Break the Pull followed by Restore Self-Trust. We work on the responses that keep pulling you back in, then on rebuilding trust in your own decisions.']
  },
  'Break the Pull → Return to Yourself': {
    result: ['Your answers show that two areas are affecting you more strongly: the pull back towards him, and how much of your attention and energy has become caught up in what he’s doing.'],
    rec: ['That’s why I recommend Break the Pull followed by Return to You. We work on the responses that keep pulling you back towards him, then on bringing more of your attention back to you.']
  },
  'Restore Self-Trust → Return to Yourself': {
    result: ['Your answers show that two areas are affecting you more strongly: trusting and standing by your own decisions, and how much of your attention and energy has become caught up in what’s happening with him.'],
    rec: ['That’s why I recommend Restore Self-Trust followed by Return to You. We work on rebuilding trust in yourself and then on bringing more of your attention and energy back to your own life.']
  }
};
var RESULT_EMAIL_PAIR_BUTTON_V3 = 'START WITH THESE TWO';

var RESULT_PAGE_URL_V3 = 'https://yourmindstory.co.uk/assessment/result/';
function savedResultLinkV3_(resultToken,result,journeyId,submissionId) {
  if (!resultToken) return '';
  var base=withTrackingV3_(v4ResultPageUrl_(),result,journeyId,submissionId);
  return base+(base.indexOf('?')===-1?'?':'&')+'resultToken='+encodeURIComponent(resultToken);
}

var RESULT_EMAIL_COMPLETE_V3 = {
  result: ['Your answers show that this isn’t affecting just one part of your life.',
           'They’re showing that several of these areas are being affected more than moderately.'],
  rec: ['That’s why I recommend working through the complete Return to Yourself programme.',
        'We work through the four areas in order:',
        'Quiet the Alarm → Break the Pull → Restore Self-Trust → Return to You.',
        'Your answers are showing me that the pattern is affecting you across these areas, so that’s where I’d recommend we work.'],
  choiceHeading: 'How would you like to work on this?'
};

// The three Complete choices. Each button goes to the YMS redirect page, which records the click
// (complete_self_guided_click / reality_reset_click / pattern_break_click) and forwards immediately
// to the matching Stan offer. The Stan destinations are held in that page's allowlist.
var RESULT_CHOICE_REDIRECT_URL_V3 = 'https://yourmindstory.co.uk/assessment/choice/';
var COMPLETE_CHOICES_V3 = [
  { option:'self_guided', event:'complete_self_guided_click', price:117,
    stan:'https://stan.store/Yourmindstory/p/return-to-yourself-eli637kx',
    quote:'“I want to work through it myself.”',
    title:'Return to Yourself — Self-Guided | £117',
    desc:'The complete four-stage programme, Emergency Reset and weekly check-ins.',
    button:'I WANT TO WORK THROUGH IT MYSELF' },
  { option:'reality_reset', event:'reality_reset_click', price:147,
    stan:'https://stan.store/Yourmindstory/p/return-to-yourself-reality-reset',
    quote:'“I just need to speak to somebody who understands what I’m going through.”',
    title:'Return to Yourself + Reality Reset | £147',
    desc:'Everything in the self-guided programme, plus the workbook and a private 20-minute conversation with me to talk about what’s happening, ask the questions going around in your head and get some clarity.',
    button:'I WANT TO SPEAK TO ONYE' },
  { option:'pattern_break', event:'pattern_break_click', price:197,
    stan:'https://stan.store/Yourmindstory/p/return-to-yourself-pattern-break',
    quote:'“I want to talk through what’s happening with me.”',
    title:'Return to Yourself + Pattern Break Session | £197',
    desc:'Everything in the self-guided programme, plus the workbook and a private 50-minute solution-focused CBT session with me to properly talk through what’s been happening, the patterns you keep getting pulled into and what you need to work on.',
    button:'I WANT THE PATTERN BREAK SESSION' }
];

function sendResultEmailV3_(body,result,resultToken,journeyId,submissionId,finalOfferOption) {
  // The Bare Minimum route is deliberately untouched: same subject, body, link and routing as before.
  if (result.route === 'Bare Minimum') {
    return sendResultEmailLegacyV3_(body,result,resultToken,journeyId,submissionId);
  }
  var errors=[];
  try {
    var firstName=clean_(body.firstName);
    var email=clean_(body.email).toLowerCase();
    var letter=buildResultLetterV3_(firstName,result,journeyId,submissionId,resultToken,finalOfferOption);
    return deliverResultEmailV3_(email,firstName,letter.subject,letter.html,letter.text);
  } catch(err) {
    errors.push('Email build/send error: '+String(err));
  }
  return {ok:false,provider:'none',error:errors.join(' | ')};
}

// V4 transactional delivery: Google MailApp only (no Brevo). Marketing consent is NOT consulted here:
// the result email is transactional. In DEV the gate below suppresses or redirects every send.
var V4_STAGE2_TEST_EMAIL_RE_ = /^yourmindstory\.co\.uk\+v4test[a-z0-9._-]*@gmail\.com$/i;
function v4Stage2Active_() { return !v4IsDev_() && v4ScriptProp_('V4_STAGE2_TEST_ONLY') === 'yes'; }
function v4Stage2Refusal_(body) {
  if (!v4Stage2Active_()) return '';
  body = body || {};
  if (body.email !== undefined && !V4_STAGE2_TEST_EMAIL_RE_.test(clean_(body.email))) return 'Stage 2 accepts the owner test inbox only.';
  var ids = {resultToken:clean_(body.resultToken), submissionId:clean_(body.submissionId), journeyId:clean_(body.journeyId)};
  var isSubmission = !body.action && body.answers;
  if (isSubmission) return V4_STAGE2_TEST_EMAIL_RE_.test(clean_(body.email)) ? '' : 'Stage 2 accepts the owner test inbox only.';
  if (!ids.resultToken && !ids.submissionId && !ids.journeyId) return body.action ? 'Stage 2 refuses actions without a test row identity.' : '';
  var sheet = getV3Sheet_(), row = findRowNumber_(sheet, ids);
  if (!row) return '';  // nothing to touch; the normal handler returns its own not-found error
  return V4_STAGE2_TEST_EMAIL_RE_.test(clean_(getByHeaderV3_(sheet,row,'Email'))) ? '' : 'Stage 2 never touches rows outside the test inbox.';
}
function v4ResultPageUrl_() { return v4ScriptProp_('V4_RESULT_PAGE_URL') || V4_RESULT_PAGE_URL_DEFAULT_; }
function v4EmailMode_() {
  if (!v4IsDev_()) return 'send';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v4ScriptProp_('V4_DEV_EMAIL_REDIRECT_TO')) ? 'redirect' : 'suppress';
}
function v4LogDevEmail_(mode,intendedTo,actualTo,subject,plainBody,htmlBody,outcome) {
  try {
    var ss = openYMSV4Sheet_(), name = 'V4 DEV Email Log', sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.getRange(1,1,1,8).setValues([['Logged UTC','Mode','Intended Recipient','Actual Recipient','Subject','Outcome','Plain Text','HTML']]);
      sh.setFrozenRows(1);
    }
    sh.appendRow([utcV4_(),mode,intendedTo,actualTo||'',subject,outcome,String(plainBody).slice(0,45000),String(htmlBody).slice(0,45000)]);
  } catch (logErr) { console.error('DEV email log failed: '+logErr); }
}
function deliverResultEmailV3_(email,firstName,subject,htmlBody,plainBody) {
  var mode = v4EmailMode_();
  if (mode === 'suppress') {
    v4LogDevEmail_(mode,email,'',subject,plainBody,htmlBody,'suppressed (not sent)');
    return {ok:true,provider:'dev-suppressed',error:''};
  }
  var to = mode === 'redirect' ? v4ScriptProp_('V4_DEV_EMAIL_REDIRECT_TO') : email;
  if (v4Stage2Active_() && !V4_STAGE2_TEST_EMAIL_RE_.test(to)) return {ok:false,provider:'none',error:'Stage 2: recipient outside the test inbox refused.'};
  var subj = mode === 'redirect' ? '[V4 DEV for '+email+'] '+subject : subject;
  try {
    if (MailApp.getRemainingDailyQuota()<1) throw new Error('MailApp daily recipient quota is exhausted.');
    MailApp.sendEmail({to:to,subject:subj,body:plainBody,htmlBody:htmlBody,name:'Onye'});
    if (mode === 'redirect') v4LogDevEmail_(mode,email,to,subj,plainBody,htmlBody,'sent to owner test inbox');
    return {ok:true,provider:mode === 'redirect' ? 'mailapp-dev-redirect' : 'mailapp',error:''};
  } catch(mailErr) {
    if (mode === 'redirect') v4LogDevEmail_(mode,email,to,subj,plainBody,htmlBody,'FAILED: '+mailErr);
    return {ok:false,provider:'none',error:'MailApp error: '+String(mailErr)};
  }
}

function resultLetterPlanV3_(result) {
  var route = result.route, product = result.product;
  if (route === SERIES_NAME) {
    return {
      kind:'complete',
      result: RESULT_EMAIL_COMPLETE_V3.result,
      rec: RESULT_EMAIL_COMPLETE_V3.rec,
      choices: COMPLETE_CHOICES_V3
    };
  }
  if (route === 'Two-Stage Pair') {
    var purl = PAIR_URLS[product], pc = RESULT_EMAIL_PAIR_V3[product];
    if (!purl || !pc) throw new Error('Unknown V3 two-stage product: '+product);
    var stages = product.split(' → ');
    return {
      kind:'pair', url:purl, result:pc.result, rec:pc.rec,
      priceLine: stageDisplayV3_(stages[0])+' + '+stageDisplayV3_(stages[1])+' — £'+PRICE_PAIR,
      button: RESULT_EMAIL_PAIR_BUTTON_V3
    };
  }
  if (route === 'Single Stage') {
    var surl = SINGLE_URLS[product], sc = RESULT_EMAIL_SINGLE_V3[product];
    if (!surl || !sc) throw new Error('Unknown V3 single-stage product: '+product);
    return { kind:'single', url:surl, result:sc.result, rec:sc.rec, priceLine:sc.priceLine, button:sc.button };
  }
  throw new Error('No result letter configured for route: '+route+' / product: '+product);
}

// Link for one Complete choice: YMS redirect page + option. withTrackingV3_ adds the email UTMs and,
// because the page is on yourmindstory.co.uk, the journey ID (jid) and submission ID (sid).
function completeChoiceLinkV3_(choice, result, journeyId, submissionId) {
  return withTrackingV3_(RESULT_CHOICE_REDIRECT_URL_V3 + '?o=' + encodeURIComponent(choice.option), result, journeyId, submissionId);
}

function buildResultLetterV3_(firstName,result,journeyId,submissionId,resultToken,finalOfferOption) {
  var plan = resultLetterPlanV3_(result);
  var e = escapeHtmlV3_;
  var P = '<p style="margin:0 0 18px;">';
  function paras(list) { return list.map(function(t){ return P+e(t)+'</p>'; }).join(''); }
  function btn(label, href, margin) {
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:'+(margin||'22px 0 30px')+';"><tr><td style="background:#111827;border-radius:2px;">'+
      '<a href="'+e(href)+'" style="display:inline-block;padding:15px 22px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.5px;line-height:1.3;">'+e(label)+'</a>'+
      '</td></tr></table>';
  }
  var preheader = '<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">'+
    e(RESULT_EMAIL_PREVIEW_V3)+new Array(60).join('&#8204;&nbsp;')+'</div>';

  var links = [];
  var recHtml = '', recText = '';
  var selfGuidedCopy = [
    'The complete four-stage Cognitive Behavioural Hypnotherapy sessions.',
    'Designed to help you calm anxiety and regulate your nervous system, break the automatic urge to check, chase, overthink or search for more answers about him.',
    'Through guided practice, you’ll work on trusting your intuition, standing by your decisions and boundaries, and bringing your attention back to your own life.',
    'Because when so much of your time, energy and attention has been consumed by him, the goal isn’t simply to stop thinking about him.',
    'It’s to feel connected to yourself again and move forward with your life.'
  ];
  var posHtml = '<p style="margin:0 0 18px;font-weight:700;">'+e(RESULT_EMAIL_POSITIONING_V3)+'</p>', posText = RESULT_EMAIL_POSITIONING_V3+'\n\n';
  if (plan.kind === 'complete') {
    recHtml += posHtml; recText += posText;
    var choices = finalOfferOption ? plan.choices.filter(function(c){return c.option === finalOfferOption;}) : plan.choices;
    if (!choices.length) throw new Error('Unknown final Complete offer: '+finalOfferOption);
    choices.forEach(function(c) {
      var href = completeChoiceLinkV3_(c,result,journeyId,submissionId);
      var label = 'START MY SESSIONS';
      var copy = c.option === 'self_guided' ? selfGuidedCopy : [c.desc];
      links.push({label:label,url:href,option:c.option,event:c.event});
      recHtml += '<div style="border-top:1px solid #e5e7eb;padding-top:16px;">'+
        '<p style="font-family:Georgia,serif;font-size:20px;font-weight:700;margin:0 0 8px;">'+e(c.title)+'</p>'+
        paras(copy)+btn(label,href,'14px 0 20px')+'</div>';
      recText += c.title+'\n\n'+copy.join('\n\n')+'\n\n'+label+'\n'+href+'\n\n';
    });
  } else {
    var link = withTrackingV3_(plan.url,result,journeyId,submissionId);
    var label = 'START MY SESSIONS';
    links.push({label:label,url:link});
    recHtml = paras(plan.rec)+posHtml+
      '<p style="font-family:Georgia,serif;font-size:20px;font-weight:700;line-height:1.35;margin:4px 0 6px;">'+e(plan.priceLine)+'</p>'+
      btn(label,link,'14px 0 20px');
    recText = plan.rec.join('\n\n')+'\n\n'+posText+plan.priceLine+'\n\n'+label+'\n'+link+'\n\n';
  }

  var resultLink=savedResultLinkV3_(resultToken,result,journeyId,submissionId);
  if (resultLink) links.push({label:'VIEW MY PERSONALISED RESULTS',url:resultLink});
  var savedResultHtml=resultLink?btn('VIEW MY PERSONALISED RESULTS',resultLink,'10px 0 18px'):'';
  var savedResultText=resultLink?'VIEW MY PERSONALISED RESULTS\n'+resultLink+'\n\n':''; // same label as the HTML button
  var html =
    preheader+
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:0 4px;color:#111827;font-size:16px;line-height:1.65;">'+
    P+'Hi '+e(firstName)+',</p>'+
    P+'I’ve looked at your answers.</p>'+
    paras(plan.result)+
    recHtml+
    paras(RESULT_EMAIL_MIDDLE_V3)+
    savedResultHtml+
    P+'With care,</p>'+
    '<p style="margin:0 0 18px;">Onye<br>Your Mind Story<br>Cognitive Behavioral Hypnotherapist</p>'+
    '</div>';

  var text =
    'Hi '+firstName+',\n\n'+
    'I’ve looked at your answers.\n\n'+
    plan.result.join('\n\n')+'\n\n'+
    recText+
    RESULT_EMAIL_MIDDLE_V3.join('\n\n')+'\n\n'+
    savedResultText+
    'With care,\nOnye\nYour Mind Story\nCognitive Behavioral Hypnotherapist';

  return {subject:resultEmailSubjectV3_(firstName), html:html, text:text, link:links[0].url, links:links, plan:plan};
}

// Every route the assessment can produce, for testing without touching the response sheet.
function allResultRoutesV3_() {
  var list = [];
  STAGES.forEach(function(s){ list.push({route:'Single Stage',product:s,category:'single_stage'}); });
  Object.keys(PAIR_URLS).forEach(function(p){ list.push({route:'Two-Stage Pair',product:p,category:'two_stage_pair'}); });
  list.push({route:SERIES_NAME,product:SERIES_NAME,category:'return_to_you_series',qualifyingStages:STAGES.slice()});
  list.push({route:'Bare Minimum',product:'The Bare Minimum',category:'bare_minimum',qualifyingStages:[]});
  return list;
}

// Run from the editor. Builds every route and logs subject + links. Sends nothing, writes nothing.
function previewResultEmailsV3() {
  allResultRoutesV3_().forEach(function(r){
    if (r.route === 'Bare Minimum') {
      var c = buildV3EmailContent_(r);
      console.log('Bare Minimum (unchanged legacy email) → ' + withTrackingV3_(c.buttonUrl, r, 'TEST-J', 'TEST-S'));
      return;
    }
    if (r.route === SERIES_NAME) {
      COMPLETE_CHOICES_V3.forEach(function(choice){
        var finalLetter = buildResultLetterV3_('Test',r,'TEST-J','TEST-S','TEST-RESULT',choice.option);
        console.log(r.product+' | final choice '+choice.option+' | '+finalLetter.subject+' | '+finalLetter.links.map(function(x){return x.label+' → '+x.url;}).join(' | '));
      });
    } else {
      var l = buildResultLetterV3_('Test', r, 'TEST-J', 'TEST-S', 'TEST-RESULT');
      console.log(r.product + ' | ' + l.subject + ' | ' + l.links.map(function(x){ return x.label + ' → ' + x.url; }).join(' | '));
    }
  });
}

// Run from the editor. Sends one test email per route to RESULT_EMAIL_TEST_TO_V3 through the live
// delivery path. Writes nothing to the response sheet. Subjects are prefixed [TEST n/12].
function sendTestResultEmailsV3() {
  var routes = allResultRoutesV3_(), out = [];
  routes.forEach(function(r, i){
    var tag = '[TEST ' + (i+1) + '/' + routes.length + '] ';
    var res;
    if (r.route === 'Bare Minimum') {
      // Exactly the live Bare Minimum email, sent through its own unchanged function.
      res = sendResultEmailLegacyV3_({firstName:'Test', email:RESULT_EMAIL_TEST_TO_V3}, r, '', 'TEST-J', 'TEST-S');
    } else {
      var l = buildResultLetterV3_('Test', r, 'TEST-J', 'TEST-S');
      res = deliverResultEmailV3_(RESULT_EMAIL_TEST_TO_V3, 'Test', tag + l.subject, l.html, l.text);
    }
    out.push(tag + r.product + ' → ' + JSON.stringify(res));
  });
  console.log(out.join('\n'));
  return out;
}

var STAGE_LINES_V3 = {
  'Quiet the Alarm':'Your body is reacting.',
  'Break the Pull':"You're getting pulled back into him.",
  'Restore Self-Trust':"You're starting to question yourself.",
  'Return to Yourself':'Too much of your own life is getting pushed into the background.'
};

function buildV3EmailContent_(result) {
  var route=result.route;
  var product=result.product;
  if (route===SERIES_NAME) {
    var lines = STAGES.filter(function(s){ return result.qualifyingStages.indexOf(s)!==-1; }).map(function(s){ return STAGE_LINES_V3[s]; });
    return {
      resultText:'Based on your answers, this is affecting you in more than one part of the cycle.\n\n' + lines.join('\n') + '\n\n' +
        'These parts can feed each other, which is why it can feel so difficult to get properly free of it.',
      resultHtml:'<p>Based on your answers, this is affecting you in more than one part of the cycle.</p><p>' +
        lines.map(escapeHtmlV3_).join('<br>') + '</p>' +
        '<p>These parts can feed each other, which is why it can feel so difficult to get properly free of it.</p>',
      recommendationText:'Based on your answers, this is where I recommend you start:\n\nReturn to You Series\nThe complete four-stage series: Quiet the Alarm, Break the Pull, Restore Self-Trust and Return to Yourself · £117',
      recommendationHtml:'<p>Based on your answers, this is where I recommend you start:</p><h2 style="font-family:Georgia,serif;font-size:26px;margin-bottom:6px;">Return to You Series</h2>'+
        '<p style="margin-top:0;">The complete four-stage series: Quiet the Alarm, Break the Pull, Restore Self-Trust and Return to Yourself · <strong>£117</strong></p>',
      buttonLabel:'SEE THE RETURN TO YOU SERIES · £117',
      buttonUrl:SERIES_SALES_PAGE_URL,
      secondaryText:'Prefer to start with one stage?\n\n' +
        'The four stages are designed to be followed in order, beginning with Quiet the Alarm.\n\n' +
        "If you'd like to experience the hypnotherapy before committing to the full series, you can begin with Quiet the Alarm for £37.\n\n" +
        'If you decide within seven days of purchasing that you want the complete series, you can use a £37 discount code towards the £117 Return to You Series.\n\n' +
        "That means you'll pay just £80 more, bringing your total to £117.",
      secondaryHtml:'<p style="font-weight:700;color:#111827;margin:0 0 8px;">Prefer to start with one stage?</p>' +
        '<p>The four stages are designed to be followed in order, beginning with Quiet the Alarm.</p>' +
        "<p>If you'd like to experience the hypnotherapy before committing to the full series, you can begin with Quiet the Alarm for £37.</p>" +
        '<p>If you decide within seven days of purchasing that you want the complete series, you can use a £37 discount code towards the £117 Return to You Series.</p>' +
        "<p>That means you'll pay just £80 more, bringing your total to £117.</p>",
      secondaryButtonLabel:'Start with Quiet the Alarm — £37',
      secondaryButtonUrl:SINGLE_URLS['Quiet the Alarm']
    };
  }
  if (route==='Two-Stage Pair') {
    var parts = product.split(' → ');
    var url = PAIR_URLS[product];
    if (!url) throw new Error('Unknown V3 two-stage product: '+product);
    var pl = parts.map(function(s){ return STAGE_LINES_V3[s]; });
    return {
      resultText:'Based on your answers, two parts of this cycle are showing up strongly for you.\n\n' + pl.join('\n') + '\n\n' +
        'These two can feed each other, which is why working on only one part may not be enough.',
      resultHtml:'<p>Based on your answers, two parts of this cycle are showing up strongly for you.</p><p>' + pl.map(escapeHtmlV3_).join('<br>') + '</p>' +
        '<p>These two can feed each other, which is why working on only one part may not be enough.</p>',
      recommendationText:'Based on your answers, this is where I recommend you start:\n\n' + product + ' · £74 for both sessions',
      recommendationHtml:'<p>Based on your answers, this is where I recommend you start:</p><h2 style="font-family:Georgia,serif;font-size:26px;margin-bottom:6px;">' + escapeHtmlV3_(product) + '</h2><p style="margin-top:0;">Both sessions · <strong>£74</strong></p>',
      buttonLabel:'START WITH THESE TWO SESSIONS · £74',
      buttonUrl:url
    };
  }
  if (route==='Single Stage') {
    var surl = SINGLE_URLS[product];
    if (!surl) throw new Error('Unknown V3 single-stage product: '+product);
    var line = {
      'Quiet the Alarm':'Your body is reacting strongly when something triggers you.',
      'Break the Pull':"You're getting pulled back into checking, replaying, searching, reaching out or looking for reassurance.",
      'Restore Self-Trust':"You're starting to question yourself, your decisions or what you already know.",
      'Return to Yourself':'Too much of your attention and your own life is getting pushed into the background.'
    }[product];
    return {
      resultText:'Based on your answers, one part of this cycle is showing up most strongly for you.\n\n'+line,
      resultHtml:'<p>Based on your answers, one part of this cycle is showing up most strongly for you.</p><p>'+escapeHtmlV3_(line)+'</p>',
      recommendationText:'Based on your answers, this is where I recommend you start:\n\n'+product+' · £37',
      recommendationHtml:'<p>Based on your answers, this is where I recommend you start:</p><h2 style="font-family:Georgia,serif;font-size:26px;margin-bottom:6px;">'+escapeHtmlV3_(product)+'</h2><p style="margin-top:0;"><strong>£37</strong></p>',
      buttonLabel:'START WITH '+product.toUpperCase()+' · £37',
      buttonUrl:surl
    };
  }
  if (route==='Bare Minimum') {
    // r3: on the Q1 goal-mismatch route the approved "isn't standing out" finding is omitted (it would be untrue). No new copy.
    if (result.goalMismatch) return {resultText:'',resultHtml:'',
      recommendationText:'Based on your answers, this is where I recommend you start:\n\nThe Bare Minimum\n\n'+BARE_MINIMUM_PRICE_LINE_V3,
      recommendationHtml:'<p>Based on your answers, this is where I recommend you start:</p><h2 style="font-family:Georgia,serif;font-size:26px;">The Bare Minimum</h2><p style="font-family:Georgia,serif;font-size:20px;font-weight:700;">'+escapeHtmlV3_(BARE_MINIMUM_PRICE_LINE_V3)+'</p>',
      buttonLabel:'START WITH THE BARE MINIMUM',buttonUrl:BARE_MINIMUM_URL};
    return {
      resultText:"Based on your answers, one part of the cycle isn't standing out strongly enough for me to recommend one of the four stage sessions as your first step.",
      resultHtml:"<p>Based on your answers, one part of the cycle isn't standing out strongly enough for me to recommend one of the four stage sessions as your first step.</p>",
      recommendationText:'Based on your answers, this is where I recommend you start:\n\nThe Bare Minimum\n\n'+BARE_MINIMUM_PRICE_LINE_V3,
      recommendationHtml:'<p>Based on your answers, this is where I recommend you start:</p><h2 style="font-family:Georgia,serif;font-size:26px;">The Bare Minimum</h2><p style="font-family:Georgia,serif;font-size:20px;font-weight:700;">'+escapeHtmlV3_(BARE_MINIMUM_PRICE_LINE_V3)+'</p>',
      buttonLabel:'START WITH THE BARE MINIMUM',
      buttonUrl:BARE_MINIMUM_URL
    };
  }
  throw new Error('No result email configured for route: '+route+' / product: '+product);
}

/* ============================== UTIL ============================== */

function answerText_(q) {
  if (q == null) return '';
  if (Array.isArray(q)) return q.join(', ');
  if (typeof q === 'string' || typeof q === 'number' || typeof q === 'boolean') return String(q);
  var v = q.answer != null ? q.answer : (q.text != null ? q.text : (q.label != null ? q.label : q.value));
  if (Array.isArray(v)) return v.join(', ');
  return v == null ? '' : String(v);
}

function clean_(v) {
  var s = v == null ? '' : String(v).trim().slice(0,5000);
  // Prevent Google Sheets from interpreting user-controlled text as a formula.
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function makeId_(prefix) {
  return prefix + '-' + Utilities.getUuid().replace(/-/g,'').slice(0,16);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


// ===== Sales-page step + checkout-source tracking (added 2026-10-08) =====
// Every sales_step_view / checkout_click is appended to the 'V4 Sales Events' log sheet
// (one row per event = full journey history), and summarised on the woman's existing
// V4 Responses row in new columns appended at the far right. Never blocks the event.
var V3_SALES_EVENTS_SHEET = 'V4 Sales Events';
var V3_SALES_EVENT_HEADERS = ['Event Time (UK)','Event','Submission ID','Journey ID','Result Token','Screen','Product','Price','Experiment','CTA','V3 Row','Entry'];
var V3_SALES_SUMMARY_HEADERS = ['Sales Experiment','Sales Screens Reached','Sales Max Screen','Sales Screen History','Checkout Screen (First)','Checkout Screen History','Checkout Experiment'];

function ensureHeaderV3_(sheet, name) {
  if (headerMap_(sheet)[name]) return;
  var lastCol = sheet.getLastColumn();
  if (lastCol >= sheet.getMaxColumns()) sheet.insertColumnAfter(lastCol);
  sheet.getRange(1, lastCol + 1).setValue(name);
  clearHeaderCache_();
}

function getByHeaderV3_(sheet, rowNumber, name) {
  var col = headerMap_(sheet)[name];
  if (!col) return '';
  var b = v4RowBuf_(sheet, rowNumber, col);
  return b ? b.vals[col-1] : sheet.getRange(rowNumber, col).getValue();
}

function getSalesEventsSheetV3_() {
  var ss = openYMSV4Sheet_();
  var sh = ss.getSheetByName(V3_SALES_EVENTS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(V3_SALES_EVENTS_SHEET);
    sh.appendRow(V3_SALES_EVENT_HEADERS);
    sh.setFrozenRows(1);
  } else {
    ensureHeaderV3_(sh, 'Entry');
  }
  return sh;
}

function appendHistoryV3_(existing, entry) {
  var s = String(existing || '');
  s = s ? s + ' | ' + entry : entry;
  return s.length > 4000 ? s.slice(s.length - 4000) : s;
}

function recordSalesEventV3_(sheet, rowNumber, eventType, identity, values, stamp) {
  if (eventType !== 'sales_step_view' && eventType !== 'checkout_click') return;
  try {
    values = values || {};
    var experiment = clean_(values.experiment);
    var screen = parseInt(eventType === 'sales_step_view' ? values.step : values.screen, 10);
    var hasScreen = !isNaN(screen) && screen >= 1 && screen <= 20;

    getSalesEventsSheetV3_().appendRow([
      stamp, eventType, identity.submissionId || '', identity.journeyId || '', identity.resultToken || '',
      hasScreen ? screen : '', clean_(values.product), clean_(values.price), experiment, clean_(values.cta), rowNumber, clean_(values.entry)
    ]);

    V3_SALES_SUMMARY_HEADERS.forEach(function(h){ ensureHeaderV3_(sheet, h); });
    if (experiment) setByHeader_(sheet, rowNumber, 'Sales Experiment', experiment);

    if (eventType === 'sales_step_view' && hasScreen) {
      var reached = String(getByHeaderV3_(sheet, rowNumber, 'Sales Screens Reached') || '')
        .split(',').map(function(x){ return parseInt(x, 10); }).filter(function(x){ return !isNaN(x); });
      if (reached.indexOf(screen) === -1) reached.push(screen);
      reached.sort(function(a, b){ return a - b; });
      setByHeader_(sheet, rowNumber, 'Sales Screens Reached', reached.join(','));
      setByHeader_(sheet, rowNumber, 'Sales Max Screen', Math.max.apply(null, reached));
      setByHeader_(sheet, rowNumber, 'Sales Screen History',
        appendHistoryV3_(getByHeaderV3_(sheet, rowNumber, 'Sales Screen History'), screen + ' @ ' + stamp));
    }

    if (eventType === 'checkout_click') {
      if (hasScreen) setFirstByHeader_(sheet, rowNumber, 'Checkout Screen (First)', screen);
      setByHeader_(sheet, rowNumber, 'Checkout Screen History',
        appendHistoryV3_(getByHeaderV3_(sheet, rowNumber, 'Checkout Screen History'), (hasScreen ? screen : '?') + ' @ ' + stamp));
      if (experiment) setByHeader_(sheet, rowNumber, 'Checkout Experiment', experiment);
    }
  } catch (err) {
    console.error('recordSalesEventV3_ failed: ' + err);
  }
}

/* ============================== TRACKING REPAIR (22 Oct 2026) ==============================
 * Canonical funnel model. One append-only tab, 'Funnel Events', holds one row per canonical event per attempt.
 * Canonical events and what proves each one:
 *   assessment_start          browser: first question rendered (sent with Submission ID from 22 Oct 2026)
 *   assessment_complete       server: assessment row saved in V4 Responses
 *   email_captured            server: valid email saved with the assessment
 *   result_view               browser: result screen rendered after the save was confirmed
 *   recommendation_view       browser: recommendation panel rendered
 *   recommendation_cta_click  browser: recommendation button clicked (our site only)
 *   sales_page_view           browser: YMS Return to Yourself sales page loaded (series route only)
 *   outbound_payhip_click     browser: button pointing at Payhip clicked. NOT proof Payhip loaded.
 *   product_page_arrival      UNAVAILABLE per journey: Payhip sends no page-view signal we can join to a journey
 *   checkout_start            UNAVAILABLE per journey: Payhip sends no checkout-started signal
 *   purchase_return_view      browser: buyer landed on our welcome page from Payhip's success redirect
 *   purchase                  Payhip 'paid' webhook (transaction ID) or Stan purchase email (legacy checkout)
 *   refund                    Payhip 'refunded' webhook
 * Purchases are never accepted from the public browser endpoint.
 */
var V3_TRACKING_BUILD = '2026-10-22-canonical-funnel';
var V3_REPAIR_DATE_UTC = new Date('2026-10-22T00:00:00Z');
var FUNNEL_SHEET_V3 = 'Funnel Events';
var FUNNEL_HEADERS_V3 = ['Event Time','Event Time (UK)','Event','Data Era','Evidence','Attempt Key','Submission ID','Journey ID',
  'Email','Test','Source','UTM Source','UTM Medium','UTM Campaign','UTM Content','Landing Page','Route','Recommended Product',
  'Product Clicked','Price Shown','Currency','Experiment','Assessment Version','Device','Destination','Order ID','Amount Paid',
  'Dedupe Key','V3 Row','Recorded At'];
var CANON_MAP_V3 = {
  assessment_start:'assessment_start', result_view:'result_view', recommendation_shown:'recommendation_view',
  recommendation_view:'recommendation_view', primary_cta_click:'recommendation_cta_click',
  recommendation_click:'recommendation_cta_click', recommendation_cta_click:'recommendation_cta_click',
  sales_page_view:'sales_page_view', outbound_payhip_click:'outbound_payhip_click', checkout_click:'outbound_payhip_click',
  outbound_stan_click:'outbound_stan_click',
  purchase_return_view:'purchase_return_view',
  complete_self_guided_click:'complete_self_guided_click', reality_reset_click:'reality_reset_click',
  pattern_break_click:'pattern_break_click'
};
var CANON_EVIDENCE_V3 = {
  assessment_start:'browser: first question rendered',
  assessment_complete:'server: assessment row saved',
  email_captured:'server: valid email saved with assessment',
  result_view:'browser: result screen rendered after confirmed save',
  recommendation_view:'browser: recommendation panel rendered',
  recommendation_cta_click:'browser: recommendation button clicked on YMS site',
  sales_page_view:'browser: YMS sales page loaded',
  outbound_payhip_click:'browser: Payhip button clicked on YMS site (outbound only, not proof Payhip loaded)',
  outbound_stan_click:'browser: Stan checkout button clicked on YMS site (outbound only, not proof Stan loaded or a purchase)',
  purchase_return_view:'browser: returned to YMS welcome page from Payhip success redirect',
  purchase:'Payhip paid webhook',
  refund:'Payhip refunded webhook',
  complete_self_guided_click:'browser: result email (source=result_email) Complete choice clicked: £117 Self-Guided, redirected to Stan (click only, not a purchase)',
  reality_reset_click:'browser: result email (source=result_email) Complete choice clicked: £147 Reality Reset, redirected to Stan (click only, not a purchase)',
  pattern_break_click:'browser: result email (source=result_email) Complete choice clicked: £197 Pattern Break Session, redirected to Stan (click only, not a purchase)'
};
var FUNNEL_STAGE_ORDER_V3 = ['assessment_start','assessment_complete','email_captured','result_view','recommendation_view',
  'recommendation_cta_click','sales_page_view','outbound_payhip_click','outbound_stan_click','purchase_return_view','purchase'];
var CANON_ROW_COLS_V3 = {
  assessment_start:'Canonical: Started At', result_view:'Canonical: Result Viewed At',
  recommendation_view:'Canonical: Recommendation Viewed At', recommendation_cta_click:'Canonical: CTA Clicked At',
  sales_page_view:'Canonical: Sales Page Viewed At', outbound_payhip_click:'Canonical: Payhip Click At', outbound_stan_click:'Canonical: Stan Click At',
  purchase_return_view:'Canonical: Returned From Payhip At'
};
var CANON_ROW_EXTRA_V3 = ['Canonical: Product Clicked','Canonical: Price Shown','Canonical: Furthest Stage'];
var TEST_EMAIL_PATTERNS_V3 = [/test/i, /yourmindstory/i, /kacijv/i, /^y@y\.com$/i, /scoring/i];

function isTestBody_(body) {
  if (body && body.isTest === true) return true;
  var email = clean_(body && body.email).toLowerCase();
  var name = clean_(body && body.firstName).toLowerCase();
  return isTestEmailV3_(email) || /^test\b|^test[\s_-]|scoring/.test(name);
}
function isTestEmailV3_(email) {
  email = String(email||'').toLowerCase().trim();
  if (!email) return false;
  return TEST_EMAIL_PATTERNS_V3.some(function(re){ return re.test(email); });
}

function funnelSheetV3_() {
  var ss = openYMSV4Sheet_();
  var sh = ss.getSheetByName(FUNNEL_SHEET_V3);
  if (!sh) {
    sh = ss.insertSheet(FUNNEL_SHEET_V3);
    sh.getRange(1,1,1,FUNNEL_HEADERS_V3.length).setValues([FUNNEL_HEADERS_V3]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm:ss');
  }
  return sh;
}

function deviceOfV3_(ua) {
  ua = String(ua||'');
  if (!ua) return '';
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  return /Mobi|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop';
}

function eraOfV3_(d) { return (d && d < V3_REPAIR_DATE_UTC) ? 'legacy (before 22 Oct 2026 repair)' : 'canonical'; }

// Builds a Funnel Events row object. row = rowObject_ of the V4 Responses row when it belongs to this attempt.
function funnelRecordV3_(event, when, evidence, ids, row, values, touch, isTest, extra) {
  values = values || {}; touch = touch || {}; row = row || null; extra = extra || {};
  var sid = clean_(ids.submissionId), jid = clean_(ids.journeyId);
  var attemptKey = sid || (jid ? 'J:' + jid : '');
  var r = function(h){ return row ? row[h] : ''; };
  var source = row ? (r('Source (Derived v2)') || r('Source / Journey'))
    : (touch.utm_source || touch.referrer || touch.landingUrl || touch.userAgent ?
       deriveSourceV2_(touch.utm_source, touch.utm_medium, touch.referrer, touch.landingUrl, touch.userAgent) : '');
  var test = isTest === true || (row && String(r('Test Record')) === 'TEST') || isTestEmailV3_(row ? r('Email') : '');
  var o = {
    'Event Time': when,
    'Event Time (UK)': Utilities.formatDate(when,'Europe/London','dd/MM/yyyy HH:mm:ss'),
    'Event': event,
    'Data Era': extra.era || eraOfV3_(when),
    'Evidence': evidence || CANON_EVIDENCE_V3[event] || '',
    'Attempt Key': attemptKey,
    'Submission ID': sid,
    'Journey ID': jid,
    'Email': row ? r('Email') : clean_(extra.email),
    'Test': test ? 'TEST' : '',
    'Source': source,
    'UTM Source': row ? (r('Assessment Touch Source') || r('First Touch Source')) : clean_(touch.utm_source),
    'UTM Medium': row ? (r('Assessment Touch Medium') || r('First Touch Medium')) : clean_(touch.utm_medium),
    'UTM Campaign': row ? (r('Assessment Touch Campaign') || r('First Touch Campaign')) : clean_(touch.utm_campaign),
    'UTM Content': row ? r('UTM Content') : clean_(touch.utm_content),
    'Landing Page': row ? r('Landing URL') : clean_(touch.landingUrl).slice(0,300),
    'Route': row ? r('Recommended Route') : clean_(values.route),
    'Recommended Product': row ? r('Recommended Product') : '',
    'Product Clicked': clean_(values.product_clicked || (event === 'recommendation_cta_click' || event === 'outbound_payhip_click' || event === 'outbound_stan_click' ? values.product : '')),
    'Price Shown': clean_(values.price) || (row ? r('Recommended Price') : ''),
    'Currency': clean_(values.currency) || 'GBP',
    'Experiment': row ? r('Experiment Version') : clean_(extra.experiment),
    'Assessment Version': V3_VERSION,
    'Device': deviceOfV3_(row ? r('Device / User Agent') : touch.userAgent),
    'Destination': clean_(values.destination_url || values.destination).slice(0,300),
    'Order ID': clean_(extra.orderId),
    'Amount Paid': extra.amount === undefined ? '' : extra.amount,
    'Dedupe Key': event + '|' + (extra.dedupeSuffix || attemptKey),
    'V3 Row': extra.v3Row || '',
    'Recorded At': Utilities.formatDate(new Date(),'Europe/London','dd/MM/yyyy HH:mm:ss')
  };
  return o;
}

// Appends one canonical event unless the same event already exists for the attempt (or upserts when asked).
function writeFunnelEventV3_(rec, upsert) {
  if (!rec['Attempt Key'] && rec['Event'] !== 'purchase' && rec['Event'] !== 'refund') return 'skipped (no identity)';
  var sh = funnelSheetV3_();
  var map = headerMap_(sh);
  var existing = null;
  if (sh.getLastRow() >= 2) {
    existing = sh.getRange(2, map['Dedupe Key'], sh.getLastRow()-1, 1)
      .createTextFinder(rec['Dedupe Key']).matchEntireCell(true).findNext();
  }
  var rowVals = FUNNEL_HEADERS_V3.map(function(h){ return rec.hasOwnProperty(h) ? rec[h] : ''; });
  if (existing) {
    if (!upsert) return 'duplicate';
    var r = existing.getRow();
    var keep = sh.getRange(r,1,1,FUNNEL_HEADERS_V3.length).getValues()[0];
    // Upsert keeps the original event time and Recorded At; everything else is refreshed.
    rowVals[0] = keep[0]; rowVals[1] = keep[1]; rowVals[FUNNEL_HEADERS_V3.length-1] = keep[FUNNEL_HEADERS_V3.length-1];
    var same = rowVals.every(function(v,i){ return i === FUNNEL_HEADERS_V3.length-1 || String(v) === String(keep[i]); });
    if (same) return 'unchanged';
    sh.getRange(r,1,1,FUNNEL_HEADERS_V3.length).setValues([rowVals]);
    return 'updated';
  }
  sh.appendRow(rowVals);
  return 'recorded';
}

function furthestStageV3_(current, event) {
  var a = FUNNEL_STAGE_ORDER_V3.indexOf(String(current||'')), b = FUNNEL_STAGE_ORDER_V3.indexOf(event);
  return b > a ? event : current;
}

function stampCanonicalOnRowV3_(sheet, rowNumber, event, when, values) {
  try {
    CANON_ROW_EXTRA_V3.concat(Object.keys(CANON_ROW_COLS_V3).map(function(k){ return CANON_ROW_COLS_V3[k]; }))
      .forEach(function(h){ ensureHeaderV3_(sheet, h); });
    var stamp = Utilities.formatDate(when,'Europe/London','dd/MM/yyyy HH:mm:ss');
    if (CANON_ROW_COLS_V3[event]) setFirstByHeader_(sheet, rowNumber, CANON_ROW_COLS_V3[event], stamp);
    if (event === 'recommendation_cta_click' || event === 'outbound_payhip_click' || event === 'outbound_stan_click') {
      if (values && (values.product_clicked || values.product)) setFirstByHeader_(sheet, rowNumber, 'Canonical: Product Clicked', clean_(values.product_clicked || values.product));
    }
    if (values && values.price && (event === 'recommendation_view' || event === 'recommendation_cta_click')) setFirstByHeader_(sheet, rowNumber, 'Canonical: Price Shown', clean_(values.price));
    var cur = getByHeaderV3_(sheet, rowNumber, 'Canonical: Furthest Stage');
    var next = furthestStageV3_(cur, event);
    if (next !== cur) setByHeader_(sheet, rowNumber, 'Canonical: Furthest Stage', next);
  } catch (err) { console.error('stampCanonicalOnRowV3_ failed: ' + err); }
}

// Called from handleJourneyRequestV3_ for every request, before the legacy row logic runs.
function recordCanonicalJourneyV3_(body, list, identity) {
  // Fast exit: most requests are question/option clicks, which are not canonical funnel events.
  if (!list.some(function(ev){ return !!CANON_MAP_V3[clean_(ev && ev.eventType)]; })) return;
  try {
    var sheet = getV3Sheet_();
    var rowNumber = null, row = null;
    // Only use the V3 row when it belongs to THIS attempt (a returning woman's new attempt must not
    // write onto her previous assessment row).
    var rn = findRowNumber_(sheet, identity);
    if (rn) {
      var ro = rowObject_(sheet, rn);
      if (!identity.submissionId || String(ro['Submission ID']) === identity.submissionId || (identity.resultToken && String(ro['Result Token']) === identity.resultToken)) {
        rowNumber = rn; row = ro;
      }
    }
    var ids = { submissionId: identity.submissionId || (row ? String(row['Submission ID']) : ''), journeyId: identity.journeyId || (row ? String(row['Journey ID']) : '') };
    var touch = body.touch && typeof body.touch === 'object' ? body.touch : {};
    var now = new Date();
    var pending = [];
    list.forEach(function(ev){
      var canon = CANON_MAP_V3[clean_(ev && ev.eventType)];
      if (!canon) return;
      if (canon !== 'assessment_start' && !row && canon !== 'sales_page_view' && canon !== 'outbound_payhip_click' && canon !== 'outbound_stan_click' && canon !== 'purchase_return_view') return;
      var values = ev && ev.values && typeof ev.values === 'object' ? ev.values : {};
      var evidence = CANON_EVIDENCE_V3[canon];
      if (clean_(ev.eventType) === 'checkout_click') evidence = 'legacy checkout_click: outbound click only';
      var rec = funnelRecordV3_(canon, now, evidence, ids, row, values, touch, body.isTest === true,
        { experiment: clean_(body.experimentVersion), v3Row: rowNumber || '' });
      pending.push({rec: rec, canon: canon, values: values});
    });
    if (!pending.length) return;
    if (V4_JLOG_BUFFER_) {
      // r7e, locked batch: read the dedupe keys once, append every new funnel row in one write, then stamp her row
      // from one read of it. Same rows and same first-wins stamps as the event-by-event path below.
      // Dedupe keys are looked up one by one (TextFinder, as before) but all BEFORE anything is written, so the
      // lookups do not force the queued writes out one round trip at a time. Scales like the old code as the tab grows.
      var fsh = funnelSheetV3_(), fmap = headerMap_(fsh), flast = fsh.getLastRow(), seen = {};
      var fresh = pending.filter(function(p){
        var rec = p.rec;
        if (!rec['Attempt Key'] && rec['Event'] !== 'purchase' && rec['Event'] !== 'refund') return false;
        var k = String(rec['Dedupe Key']);
        if (seen[k]) return false;
        seen[k] = true;
        if (flast >= 2 && fsh.getRange(2, fmap['Dedupe Key'], flast - 1, 1).createTextFinder(k).matchEntireCell(true).findNext()) return false;
        return true;
      });
      if (fresh.length) {
        fsh.getRange(flast + 1, 1, fresh.length, FUNNEL_HEADERS_V3.length)
          .setValues(fresh.map(function(p){ return FUNNEL_HEADERS_V3.map(function(h){ return p.rec.hasOwnProperty(h) ? p.rec[h] : ''; }); }));
        if (row) {
          v4RowBufStart_(sheet, rowNumber);
          try { fresh.forEach(function(p){ stampCanonicalOnRowV3_(sheet, rowNumber, p.canon, now, p.values); }); }
          finally { v4RowBufEnd_(); }
        }
      }
      return;
    }
    pending.forEach(function(p){
      var res = writeFunnelEventV3_(p.rec, false);
      if (row && res === 'recorded') stampCanonicalOnRowV3_(sheet, rowNumber, p.canon, now, p.values);
    });
  } catch (err) {
    console.error('recordCanonicalJourneyV3_ failed: ' + err);
  }
}

// Called once the assessment row is saved.
function onSubmissionSavedV3_(sheet, rowNumber, body, submissionId, journeyId) {
  // V4 Nov 1: hot path must not scan/rewrite every historical Funnel Events row.
  // This ran under the submission ScriptLock and caused multi-minute BUSY responses
  // when the result page immediately saved a woman's support choice.
  // Append the two server-confirmed facts only. A separate maintenance/reporting
  // operation may reconcile early events after submission without blocking her.
  try {
    var row = rowObject_(sheet, rowNumber);
    var now = new Date();
    var ids = {submissionId: submissionId, journeyId: journeyId};
    writeFunnelEventV3_(funnelRecordV3_('assessment_complete', now,
      CANON_EVIDENCE_V3.assessment_complete, ids, row,
      {price: body.priceShown}, null, body.isTest === true, {v3Row: rowNumber}), false);
    if (clean_(body.email)) {
      writeFunnelEventV3_(funnelRecordV3_('email_captured', now,
        CANON_EVIDENCE_V3.email_captured, ids, row,
        {}, null, body.isTest === true, {v3Row: rowNumber}), false);
    }
    setByHeader_(sheet, rowNumber, 'Canonical: Furthest Stage', 'email_captured');
  } catch (err) {
    console.error('onSubmissionSavedV3_ failed: ' + err);
  }
}

/* ------------------------------ PAYHIP PURCHASES ------------------------------ */
var PAYHIP_SALES_LOG_ID_V3 = '1UmFFCTzvg-zjHRMGqvF0Gx7Ku_pXXkYkbQowNsS-sFg';
var PAYHIP_PURCHASES_SHEET_V3 = 'Payhip Purchases';
var PAYHIP_PURCHASE_HEADERS_V3 = ['Transaction ID','Purchase UTC','Purchase (London)','Purchaser Email','Payhip Product Name(s)',
  'Payhip Permalink(s)','Product (Canonical)','Product Type','Amount Paid','Currency','Coupon Used','VAT Applied','Payhip Fee',
  'Refund Status','Amount Refunded','Refunded At','Signature Verified','Test Record','Record Source',
  'Match Method','Matched Submission ID','Matched Journey ID','Matched Row','Assessment Date','Recommended Route',
  'Recommended Product','Recommended Price','Matches Recommendation','Source (Derived v2)','First Touch Source',
  'First Touch Medium','First Touch Campaign','UTM Content','Experiment Version','Recorded At'];
var PAYHIP_PRODUCTS_V3 = {
  '53N2B':'Quiet the Alarm','N8hbz':'Break the Pull','3RlF7':'Restore Self-Trust','6pE8S':'Return to Yourself',
  'vatYk':'Quiet the Alarm → Break the Pull','01XGD':'Quiet the Alarm → Restore Self-Trust','n1BOZ':'Quiet the Alarm → Return to Yourself',
  'UQJXA':'Break the Pull → Restore Self-Trust','1PGuN':'Break the Pull → Return to Yourself','Ft7Pw':'Restore Self-Trust → Return to Yourself',
  'DLyd5':SERIES_NAME,'ZcdmX':'The Bare Minimum'
};

function payhipPurchasesSheetV3_() {
  var ss = openYMSV4Sheet_();
  var sh = ss.getSheetByName(PAYHIP_PURCHASES_SHEET_V3);
  if (!sh) {
    sh = ss.insertSheet(PAYHIP_PURCHASES_SHEET_V3);
    sh.getRange(1,1,1,PAYHIP_PURCHASE_HEADERS_V3.length).setValues([PAYHIP_PURCHASE_HEADERS_V3]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function canonicalPayhipProductV3_(permalinks, names) {
  var keys = String(permalinks||'').split('|').map(function(x){ return x.trim(); }).filter(Boolean);
  var mapped = keys.map(function(k){ return PAYHIP_PRODUCTS_V3[k] || ''; }).filter(Boolean);
  if (mapped.length) return mapped.join(' + ');
  return String(names||'').trim() || 'Unknown product';
}

// Reads every Payhip webhook row the Sales Log has received and upserts it into 'Payhip Purchases'.
// Safe to run any number of times. Paid rows create/refresh a purchase; refunded rows mark it refunded.
function syncPayhipPurchasesV3_() {
  var log = SpreadsheetApp.openById(PAYHIP_SALES_LOG_ID_V3).getSheetByName('Payhip Sales');
  if (!log || log.getLastRow() < 2) return {ok:true, rows:0};
  var lv = log.getDataRange().getValues();
  var lh = lv[0].map(String);
  function col(name){ return lh.indexOf(name); }
  var pinned = PropertiesService.getScriptProperties().getProperty('PAYHIP_SIGNATURE') || '';
  var sh = payhipPurchasesSheetV3_();
  var pmap = headerMap_(sh);
  var existing = {};
  if (sh.getLastRow() >= 2) {
    sh.getRange(2, pmap['Transaction ID'], sh.getLastRow()-1, 1).getValues().forEach(function(r,i){ existing[String(r[0])] = i+2; });
  }
  var stats = {paid:0, refunded:0, created:0};
  lv.slice(1).forEach(function(r){
    var txid = String(r[col('Payhip transaction ID')]||'').trim();
    if (!txid) return;
    var raw = {}; try { raw = JSON.parse(String(col('Raw JSON') >= 0 ? r[col('Raw JSON')] : '') || '{}'); } catch (e) { raw = {}; }
    var type = String(r[col('Event')] || raw.type || 'paid');
    var sig = col('Signature') >= 0 ? String(r[col('Signature')]||'') : '';
    var verified = !sig ? 'no signature stored (pre-repair row)' : (!pinned ? 'unverified (no reference signature pinned)' : (sig === pinned ? 'yes' : 'NO - signature mismatch'));
    var minor = Number(col('Amount (minor units, raw)') >= 0 ? r[col('Amount (minor units, raw)')] : r[4]) || 0;
    var when = raw.date ? new Date(Number(raw.date)*1000) : (r[col('Sale date')] instanceof Date ? r[col('Sale date')] : toDate_(r[col('Sale date')]) || toDate_(r[0]));
    var items = Array.isArray(raw.items) ? raw.items : [];
    var permalinks = items.length ? items.map(function(i){ return i.product_permalink || i.product_key || ''; }).filter(Boolean).join(' | ') : String(r[col('Product code(s)')]||'');
    var names = items.length ? items.map(function(i){ return i.product_name || ''; }).filter(Boolean).join(' | ') : String(r[col('Product(s)')]||'');
    var email = String(r[col('Customer email')] || raw.email || '').toLowerCase().trim();
    var rowNum = existing[txid];
    if (type === 'refunded') {
      stats.refunded++;
      if (!rowNum) return; // refund for a sale we never saw: it stays in the Sales Log only
      sh.getRange(rowNum, pmap['Refund Status']).setValue('Refunded');
      sh.getRange(rowNum, pmap['Amount Refunded']).setValue(raw.amount_refunded ? Number(raw.amount_refunded)/100 : '');
      sh.getRange(rowNum, pmap['Refunded At']).setValue(raw.date_refunded ? Utilities.formatDate(new Date(Number(raw.date_refunded)*1000),'Europe/London','dd/MM/yyyy HH:mm:ss') : Utilities.formatDate(r[0] instanceof Date ? r[0] : new Date(),'Europe/London','dd/MM/yyyy HH:mm:ss'));
      return;
    }
    stats.paid++;
    var canonical = canonicalPayhipProductV3_(permalinks, names);
    var vals = {
      'Transaction ID':txid,
      'Purchase UTC': when ? Utilities.formatDate(when,'UTC',"yyyy-MM-dd'T'HH:mm:ss'Z'") : '',
      'Purchase (London)': when ? Utilities.formatDate(when,'Europe/London','dd/MM/yyyy HH:mm:ss') : '',
      'Purchaser Email':email, 'Payhip Product Name(s)':names, 'Payhip Permalink(s)':permalinks,
      'Product (Canonical)':canonical, 'Product Type':productTypeOf_(canonical),
      'Amount Paid': Math.round(minor)/100, 'Currency': String(r[col('Currency')] || raw.currency || ''),
      'Coupon Used': items.some(function(i){ return i.used_coupon === true || i.used_coupon === 'true' || i.used_coupon === 1; }) ? 'Yes' : (items.length ? 'No' : (String(r[col('Coupon')]||'') || 'unknown (pre-repair row)')),
      'VAT Applied': raw.vat_applied === undefined ? '' : String(raw.vat_applied),
      'Payhip Fee': raw.payhip_fee === undefined ? '' : Number(raw.payhip_fee)/100,
      'Signature Verified': verified,
      'Test Record': isTestEmailV3_(email) ? 'TEST' : '',
      'Record Source': 'payhip webhook'
    };
    if (!rowNum) {
      vals['Refund Status'] = 'Not refunded';
      vals['Recorded At'] = Utilities.formatDate(new Date(),'Europe/London','dd/MM/yyyy HH:mm:ss');
      var headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
      sh.appendRow(headers.map(function(h){ return vals.hasOwnProperty(h) ? vals[h] : ''; }));
      existing[txid] = sh.getLastRow();
      stats.created++;
    } else {
      Object.keys(vals).forEach(function(h){ if (pmap[h]) sh.getRange(rowNum, pmap[h]).setValue(vals[h]); });
    }
  });
  return {ok:true, paid:stats.paid, refunded:stats.refunded, created:stats.created};
}

/* Unified purchase matching (Stan legacy + Payhip). Deterministic only:
 *  1. 'email'  : purchaser email = assessment email, most recent assessment at or before the purchase.
 *  2. 'journey (returned from Payhip, single candidate)' : Payhip only. The buyer's browser landed on our welcome page
 *     from Payhip's success redirect within 60 minutes after the purchase, carrying her Journey ID, and there was exactly
 *     one unmatched purchase of that product in that window and exactly one such return. Otherwise no match.
 *  'email (bought before assessment)' is recorded on the purchase but is NOT counted as a conversion of that assessment.
 *  Anything else is 'unmatched' and listed on the Unmatched Purchases tab. Nothing is guessed.
 */
function rematchAllUnifiedV3_() {
  var sheet = getV3Sheet_();
  var vmap = headerMap_(sheet);
  var vLast = sheet.getLastRow();
  var vData = vLast >= 2 ? sheet.getRange(2,1,vLast-1,sheet.getLastColumn()).getValues() : [];
  var vHeaders = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);
  var byEmail = {}, byJourney = {};
  vData.forEach(function(r, i){
    var o = {}; vHeaders.forEach(function(h,j){ o[h] = r[j]; });
    var t = toDate_(o['Submitted UTC']) || toDate_(o['Date & Time']);
    if (!t) return;
    var v = {row:i+2, data:o, time:t};
    var e = String(o['Email']||'').toLowerCase().trim();
    if (e) (byEmail[e] = byEmail[e] || []).push(v);
    var j = String(o['Journey ID']||'').trim();
    if (j) (byJourney[j] = byJourney[j] || []).push(v);
  });
  Object.keys(byEmail).forEach(function(k){ byEmail[k].sort(function(a,b){ return a.time-b.time; }); });
  Object.keys(byJourney).forEach(function(k){ byJourney[k].sort(function(a,b){ return a.time-b.time; }); });

  var ss = openYMSV4Sheet_();
  var purchases = [];
  var stan = ss.getSheetByName(V3_PURCHASES_SHEET_NAME);
  if (stan && stan.getLastRow() >= 2) {
    var sv = stan.getDataRange().getValues(), sh = sv[0].map(String);
    sv.slice(1).forEach(function(r,i){
      var o = {}; sh.forEach(function(h,j){ o[h] = r[j]; });
      purchases.push({kind:'stan', sheet:stan, row:i+2, id:String(o['Order ID']||o['Order Key']||''), key:'stan|'+String(o['Order Key']||o['Order ID']||''),
        email:String(o['Purchaser Email']||'').toLowerCase().trim(), time:toDate_(o['Order UTC'])||toDate_(o['Order Date (London)']),
        product:String(o['Product (Canonical)']||''), amount:Number(o['Amount'])||0, currency:String(o['Currency']||'GBP'),
        test:String(o['Test Record'])==='TEST', refunded:false, refundAmount:0, dateText:o['Order Date (London)']});
    });
  }
  var ph = payhipPurchasesSheetV3_();
  if (ph.getLastRow() >= 2) {
    var pv = ph.getDataRange().getValues(), phh = pv[0].map(String);
    pv.slice(1).forEach(function(r,i){
      var o = {}; phh.forEach(function(h,j){ o[h] = r[j]; });
      purchases.push({kind:'payhip', sheet:ph, row:i+2, id:String(o['Transaction ID']||''), key:'payhip|'+String(o['Transaction ID']||''),
        email:String(o['Purchaser Email']||'').toLowerCase().trim(), time:toDate_(o['Purchase UTC'])||toDate_(o['Purchase (London)']),
        product:String(o['Product (Canonical)']||''), amount:Number(o['Amount Paid'])||0, currency:String(o['Currency']||'GBP'),
        test:String(o['Test Record'])==='TEST', refunded:String(o['Refund Status'])==='Refunded', refundAmount:Number(o['Amount Refunded'])||0,
        dateText:o['Purchase (London)'], permalink:String(o['Payhip Permalink(s)']||'')});
    });
  }

  // Returns from Payhip (welcome page) for the journey tier.
  var returns = [];
  var fe = funnelSheetV3_();
  if (fe.getLastRow() >= 2) {
    var fv = fe.getDataRange().getValues(), fh = fv[0].map(String);
    fv.slice(1).forEach(function(r){
      if (r[fh.indexOf('Event')] !== 'purchase_return_view') return;
      returns.push({time: r[0] instanceof Date ? r[0] : toDate_(r[1]), journeyId:String(r[fh.indexOf('Journey ID')]||''), submissionId:String(r[fh.indexOf('Submission ID')]||'')});
    });
  }

  var perRow = {};
  var counted = 0, unmatched = [];
  purchases.forEach(function(p){
    var target = null, method = '';
    var list = byEmail[p.email] || [];
    if (p.time) for (var i = list.length-1; i >= 0; i--) { if (list[i].time <= p.time) { target = list[i]; method = 'email'; break; } }
    if (!target && p.kind === 'payhip' && p.time) {
      var win = returns.filter(function(x){ return x.time && x.time >= p.time && (x.time - p.time) <= 60*60*1000 && x.journeyId; });
      var rivals = purchases.filter(function(q){ return q !== p && q.kind === 'payhip' && q.time && q.product === p.product && Math.abs(q.time - p.time) <= 60*60*1000; });
      if (win.length === 1 && rivals.length === 0 && byJourney[win[0].journeyId]) {
        var jl = byJourney[win[0].journeyId];
        for (var k = jl.length-1; k >= 0; k--) { if (jl[k].time <= p.time) { target = jl[k]; method = 'journey (returned from Payhip, single candidate)'; break; } }
      }
    }
    if (!target && list.length) { target = list[0]; method = 'email (bought before assessment)'; }
    var upd;
    if (target) {
      var d = target.data;
      var rec = String(d['Recommended Product']||''), bought = p.product;
      var matchesRec = !rec ? '' : (bought === rec ? 'Yes' :
        (rec.split(' → ').indexOf(bought) !== -1 ? 'Partial (one stage of recommended pair)' :
        (rec === SERIES_NAME && (STAGES.indexOf(bought) !== -1 || PAIR_URLS[bought]) ? 'Partial (part of recommended series)' : 'No')));
      upd = {'Match Method':method,'Matched Submission ID':d['Submission ID'],'Matched Journey ID':d['Journey ID'],'Matched Row':target.row,
        'Assessment Date':d['Date & Time'],'Recommended Route':d['Recommended Route'],'Recommended Product':rec,
        'Recommended Price':d['Recommended Price']||'','Matches Recommendation':matchesRec,
        'Source (Derived v2)':d['Source (Derived v2)']||'','Source / Journey':d['Source / Journey']||'',
        'First Touch Source':d['First Touch Source']||'','First Touch Medium':d['First Touch Medium']||'','First Touch Campaign':d['First Touch Campaign']||'',
        'Assessment Touch Source':d['Assessment Touch Source']||'','Assessment Touch Medium':d['Assessment Touch Medium']||'','Assessment Touch Campaign':d['Assessment Touch Campaign']||'',
        'UTM Content':d['UTM Content']||'','UTM Term':d['UTM Term']||'','Experiment Version':d['Experiment Version']||'',
        'Checkout Clicked':d['Checkout Clicked']||'','Checkout Clicked At':d['Checkout Clicked At']||''};
      if (method.indexOf('bought before') === -1) { (perRow[target.row] = perRow[target.row] || []).push({p:p, matchesRec:matchesRec}); counted++; }
      else unmatched.push(p);
    } else {
      upd = {'Match Method':'unmatched (no assessment with this email; no single journey return)','Matched Submission ID':'','Matched Journey ID':'','Matched Row':'',
        'Assessment Date':'','Recommended Route':'','Recommended Product':'','Recommended Price':'','Matches Recommendation':'','Source (Derived v2)':'','Experiment Version':''};
      unmatched.push(p);
    }
    var pm = headerMap_(p.sheet);
    var curRow = p.sheet.getRange(p.row,1,1,p.sheet.getLastColumn()).getValues()[0];
    Object.keys(upd).forEach(function(h){ if (pm[h] && String(curRow[pm[h]-1]) !== String(upd[h] === undefined || upd[h] === null ? '' : upd[h])) p.sheet.getRange(p.row, pm[h]).setValue(upd[h]); });
    // Canonical purchase (and refund) events, upserted so a later match refreshes attribution.
    var ptime = p.time || new Date();
    var row = target && method.indexOf('bought before') === -1 ? target.data : null;
    var ids = row ? {submissionId:String(row['Submission ID']||''), journeyId:String(row['Journey ID']||'')} : {submissionId:'', journeyId:''};
    var evidence = p.kind === 'payhip' ? 'Payhip paid webhook, transaction ' + p.id + ' (match: ' + (row ? method : 'unmatched') + ')' : 'Stan purchase confirmation email, order ' + p.id + ' (match: ' + (row ? method : 'unmatched') + ')';
    var prec = funnelRecordV3_('purchase', ptime, evidence, ids, row, {product_clicked:p.product, currency:p.currency}, null, p.test,
      {orderId:p.id, amount:p.amount, dedupeSuffix:p.key, v3Row: row ? target.row : '', email:p.email, era: eraOfV3_(ptime)});
    prec['Product Clicked'] = p.product;
    if (p.test) prec['Test'] = 'TEST';
    writeFunnelEventV3_(prec, true);
    if (p.refunded) {
      var rrec = funnelRecordV3_('refund', ptime, 'Payhip refunded webhook, transaction ' + p.id, ids, row, {product_clicked:p.product, currency:p.currency}, null, p.test,
        {orderId:p.id, amount: -(p.refundAmount || p.amount), dedupeSuffix:p.key, v3Row: row ? target.row : '', email:p.email});
      writeFunnelEventV3_(rrec, true);
    }
  });

  // Recompute purchase columns on V3 rows (clears values that no longer hold; never touches other columns).
  var cols = ['Purchase Status','Purchased Product','Purchase Value','Purchase Date','Purchase Order ID','Purchase Currency','Purchase Match Method','Purchase Matches Recommendation'];
  vData.forEach(function(r, i){
    var rowNum = i+2, list = perRow[rowNum] || [];
    var had = vmap['Purchase Match Method'] ? String(r[vmap['Purchase Match Method']-1]||'') : '';
    if (!list.length) {
      if (had) cols.forEach(function(h){ setByHeader_(sheet,rowNum,h,''); });
      return;
    }
    var setIf = function(h, v){ var c = vmap[h]; if (c && String(r[c-1]) === String(v)) return; setByHeader_(sheet,rowNum,h,v); };
    list.sort(function(a,b){ return (a.p.time||0) - (b.p.time||0); });
    var products = [], ids = [], total = 0, currency = '', matches = [], methods = [], anyRefund = false;
    list.forEach(function(x){
      products.push(x.p.product); ids.push((x.p.kind === 'payhip' ? 'Payhip ' : 'Stan ') + x.p.id);
      total += x.p.amount - (x.p.refunded ? (x.p.refundAmount || x.p.amount) : 0);
      currency = currency || x.p.currency; matches.push(x.matchesRec);
      var m = perRowMethod_(x.p, byEmail); if (methods.indexOf(m) === -1) methods.push(m);
      if (x.p.refunded) anyRefund = true;
    });
    var isTest = list.every(function(x){ return x.p.test; });
    setIf('Purchase Status', (anyRefund ? 'Purchased (refunded)' : 'Purchased') + (isTest ? ' (TEST)' : ''));
    setIf('Purchased Product', products.join(' + '));
    setIf('Purchase Value', Math.round(total*100)/100);
    setIf('Purchase Date', String(list[0].p.dateText||''));
    setIf('Purchase Order ID', ids.join(', '));
    setIf('Purchase Currency', currency);
    setIf('Purchase Match Method', methods.join(', '));
    setIf('Purchase Matches Recommendation', matches.join(', '));
    ensureHeaderV3_(sheet,'Canonical: Furthest Stage');
    setByHeader_(sheet,rowNum,'Canonical: Furthest Stage', furthestStageV3_(getByHeaderV3_(sheet,rowNum,'Canonical: Furthest Stage'),'purchase'));
  });
  return {ok:true, purchases:purchases.length, matched:counted, unmatched:unmatched.length};
}
function perRowMethod_(p, byEmail) {
  var list = byEmail[p.email] || [];
  return list.some(function(v){ return p.time && v.time <= p.time; }) ? 'email' : 'journey (returned from Payhip, single candidate)';
}

// Replaces the Stan-only matcher: every caller now gets the unified Stan + Payhip match.
function rematchPurchasesForEmail_(email) {
  email = String(email||'').toLowerCase().trim();
  if (!email) return 0;
  var ss = openYMSV4Sheet_();
  var found = [V3_PURCHASES_SHEET_NAME, PAYHIP_PURCHASES_SHEET_V3].some(function(name){
    var sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return false;
    return !!sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).createTextFinder(email).matchEntireCell(true).matchCase(false).findNext();
  });
  return found ? rematchAllUnifiedV3_().matched : 0;
}
function rematchAllPurchasesV3_() { return rematchAllUnifiedV3_(); }

// Copies a manual 'TEST' (typed into V4 Responses > Test Record) onto every Funnel Events row of that submission.
function propagateTestFlagsV3_() {
  var sheet = getV3Sheet_(), vmap = headerMap_(sheet);
  if (sheet.getLastRow() < 2) return 0;
  var v = sheet.getRange(2,1,sheet.getLastRow()-1,sheet.getLastColumn()).getValues();
  var tests = {}, emails = {};
  v.forEach(function(r){
    var sid = String(r[vmap['Submission ID']-1]||''), jid = String(r[vmap['Journey ID']-1]||'');
    if (String(r[vmap['Test Record']-1]) === 'TEST') { if (sid) tests[sid] = true; if (jid) tests['J:'+jid] = true; }
  });
  var fe = funnelSheetV3_();
  if (fe.getLastRow() < 2) return 0;
  var fmap = headerMap_(fe);
  var rng = fe.getRange(2,1,fe.getLastRow()-1,FUNNEL_HEADERS_V3.length);
  var fv = rng.getValues(), changed = 0;
  var ti = fmap['Test']-1, ai = fmap['Attempt Key']-1, ji = fmap['Journey ID']-1, ei = fmap['Email']-1;
  var testCol = fv.map(function(r){
    var t = r[ti];
    if (t !== 'TEST' && (tests[r[ai]] || tests['J:'+r[ji]] || isTestEmailV3_(r[ei]))) { changed++; return ['TEST']; }
    return [t];
  });
  if (changed) fe.getRange(2,fmap['Test'],testCol.length,1).setValues(testCol);
  return changed;
}

// Public, idempotent maintenance: pulls Payhip webhook rows from the Sales Log, rematches, propagates test flags.
// Called hourly by the IMPORTDATA cell on the Funnel Report tab, and after Payhip returns. Reads/writes only this Sheet.
function syncAllV3_() {
  if (v4IsDev_()) return {ok:false, code:'DISABLED_IN_DEV'};
  var lock = LockService.getScriptLock();
  var held = lock.hasLock();
  if (!held && !lock.tryLock(25000)) return {ok:false, code:'BUSY'};
  try {
    var a = syncPayhipPurchasesV3_();
    var b = rematchAllUnifiedV3_();
    var c = propagateTestFlagsV3_();
    var stamp = Utilities.formatDate(new Date(),'Europe/London','dd/MM/yyyy HH:mm:ss');
    PropertiesService.getScriptProperties().setProperty('LAST_SYNC', stamp);
    return {ok:true, syncedAt:stamp, payhipPaidRows:a.paid||0, payhipRefundRows:a.refunded||0, newPurchases:a.created||0,
      purchases:b.purchases, matchedPurchases:b.matched, unmatchedPurchases:b.unmatched, testFlagsPropagated:c};
  } finally { if (!held) lock.releaseLock(); }
}

/* ------------------------------ ONE-OFF: HISTORICAL BACKFILL ------------------------------ */
// Run once from the editor. Builds legacy-era Funnel Events from V4 Responses and the V4 Journey Events log.
// Idempotent (skips any Dedupe Key already present). Every row is labelled 'legacy (before 22 Oct 2026 repair)'.
function backfillFunnelEventsV3() {
  var fe = funnelSheetV3_();
  var have = {};
  if (fe.getLastRow() >= 2) fe.getRange(2, headerMap_(fe)['Dedupe Key'], fe.getLastRow()-1, 1).getValues().forEach(function(r){ have[String(r[0])] = true; });
  var sheet = getV3Sheet_();
  var vh = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);
  var vv = sheet.getLastRow() >= 2 ? sheet.getRange(2,1,sheet.getLastRow()-1,vh.length).getValues() : [];
  var rowsBySid = {}, rowsByJid = {}, rowNumBySid = {};
  vv.forEach(function(r,i){
    var o = {}; vh.forEach(function(h,j){ o[h] = r[j]; });
    var sid = String(o['Submission ID']||''), jid = String(o['Journey ID']||'');
    if (sid) { rowsBySid[sid] = o; rowNumBySid[sid] = i+2; }
    if (jid) rowsByJid[jid] = o;
  });
  var out = [];
  function add(event, when, evidence, sid, jid, row, values, rowNum) {
    if (!when) return;
    var rec = funnelRecordV3_(event, when, evidence, {submissionId:sid, journeyId:jid}, row, values || {}, null, false,
      {era:'legacy (before 22 Oct 2026 repair)', v3Row: rowNum || ''});
    if (have[rec['Dedupe Key']]) return;
    have[rec['Dedupe Key']] = true;
    out.push(FUNNEL_HEADERS_V3.map(function(h){ return rec[h]; }));
  }
  // Server facts from V4 Responses.
  vv.forEach(function(r,i){
    var o = {}; vh.forEach(function(h,j){ o[h] = r[j]; });
    var t = toDate_(o['Submitted UTC']) || toDate_(o['Date & Time']);
    var sid = String(o['Submission ID']||''), jid = String(o['Journey ID']||'');
    add('assessment_complete', t, 'server: assessment row saved (backfill)', sid, jid, o, {price:o['Recommended Price']}, i+2);
    if (o['Email']) add('email_captured', t, 'server: email saved with assessment (backfill)', sid, jid, o, {}, i+2);
  });
  // Browser events from the legacy journey log.
  var log = openYMSV4Sheet_().getSheetByName(V3_JOURNEY_LOG_SHEET);
  if (log && log.getLastRow() >= 2) {
    var lv = log.getDataRange().getValues(), lh = lv[0].map(String);
    var ix = function(n){ return lh.indexOf(n); };
    lv.slice(1).forEach(function(r){
      var ev = String(r[ix('Event')]||''), status = String(r[ix('Status')]||'');
      var canon = CANON_MAP_V3[ev];
      if (!canon) return;
      var when = r[0] instanceof Date ? r[0] : toDate_(r[0]);
      var sid = String(r[ix('Submission ID')]||''), jid = String(r[ix('Journey ID')]||'');
      if (canon === 'assessment_start') {
        // Legacy starts carried only a Journey ID (no Submission ID): counted once per journey.
        add('assessment_start', when, 'legacy log: start event (journey-level, saved as ' + status + ')', '', jid, null, {}, '');
        return;
      }
      if (status !== 'OK') return;
      var row = sid ? rowsBySid[sid] : (jid ? rowsByJid[jid] : null);
      var rsid = row ? String(row['Submission ID']||'') : sid;
      var evidence = ev === 'checkout_click' ? 'legacy checkout_click: outbound click only (destination may be Stan or Payhip)' : 'legacy log: ' + ev;
      add(canon, when, evidence, rsid, jid, row, {product:r[ix('Product')], route:r[ix('Route')]}, rsid ? rowNumBySid[rsid] : '');
    });
  }
  // Legacy row timestamps for anything the log missed (older rows).
  vv.forEach(function(r,i){
    var o = {}; vh.forEach(function(h,j){ o[h] = r[j]; });
    var sid = String(o['Submission ID']||''), jid = String(o['Journey ID']||'');
    [['Result Viewed At','result_view'],['Recommendation Shown At','recommendation_view'],['Primary CTA Clicked At','recommendation_cta_click'],
     ['Sales Page Viewed At','sales_page_view'],['Checkout Clicked At','outbound_payhip_click']].forEach(function(pair){
      var t = toDate_(o[pair[0]]);
      if (t) add(pair[1], t, 'legacy row timestamp: ' + pair[0] + (pair[1] === 'outbound_payhip_click' ? ' (outbound click only)' : ''), sid, jid, o, {}, i+2);
    });
  });
  if (out.length) fe.getRange(fe.getLastRow()+1, 1, out.length, FUNNEL_HEADERS_V3.length).setValues(out);
  console.log('Backfilled ' + out.length + ' legacy funnel events.');
  return out.length;
}

// Run once from the editor after the first verified Payhip test purchase arrives: pins Payhip's webhook signature
// (sha256 of the store API key, as Payhip documents) from that row, so later rows are marked verified/unverified.
function pinPayhipSignatureFromLatestOwnerTestV3() {
  var log = SpreadsheetApp.openById(PAYHIP_SALES_LOG_ID_V3).getSheetByName('Payhip Sales');
  var v = log.getDataRange().getValues(), h = v[0].map(String);
  for (var i = v.length-1; i >= 1; i--) {
    var sig = String(v[i][h.indexOf('Signature')]||''), email = String(v[i][h.indexOf('Customer email')]||'').toLowerCase();
    if (sig && email === 'yourmindstory.co.uk@gmail.com') {
      PropertiesService.getScriptProperties().setProperty('PAYHIP_SIGNATURE', sig);
      console.log('Pinned Payhip signature from row ' + (i+1));
      return true;
    }
  }
  console.log('No owner test row with a signature yet.');
  return false;
}

/* ------------------------------ FUNNEL REPORT (run once from the editor; safe to re-run) ------------------------------ */
// V4 deliberately has no hard-coded URL of the old V3 deployment.
// Set V4_EXEC_URL script property after publishing the new V4 web app (if required).
var V3_EXEC_URL = '';

function buildFunnelReportV3() {
  // V4 already has an improved cloned Funnel Report and seven extra dashboard tabs.
  // This legacy destructive builder calls sh.clear(), overwrites dates and rebuilds
  // the tracking guide, so it MUST NOT be run on V4.
  throw new Error('V4 protection: do not run buildFunnelReportV3(). Use the existing V4 dashboards.');
  var ss = openYMSV4Sheet_();
  funnelSheetV3_(); payhipPurchasesSheetV3_();
  var FE = "'Funnel Events'!";
  var C = FE+'$C$2:$C', E = FE+'$E$2:$E', F = FE+'$F$2:$F', A = FE+'$A$2:$A', J = FE+'$J$2:$J', AA = FE+'$AA$2:$AA', Z = FE+'$Z$2:$Z';
  // Stan outbound = result-page Stan button (outbound_stan_click) or a result-email Complete choice (redirect page -> Stan).
  var CHOICE_EVENTS = 'complete_self_guided_click|reality_reset_click|pattern_break_click';
  var STAN_EVENTS = 'outbound_stan_click|' + CHOICE_EVENTS;
  var inCohort = 'ISNUMBER(MATCH('+F+',$AA$2:$AA,0)),'+F+'<>""';
  var inRange = A+'>=$B$4,'+A+'<$B$5+1,'+J+'<>$B$7';
  // ev is one event name, or several joined with |. Every count is COUNTUNIQUE of the attempt key (one per submission/journey).
  function evCond(ev){ return ev.indexOf('|') === -1 ? C+'="'+ev+'"' : 'REGEXMATCH('+C+',"^('+ev+')$")'; }
  // ROWS(UNIQUE(FILTER())) not COUNTUNIQUE(FILTER()): COUNTUNIQUE counts FILTER's no-match #N/A as 1.
  function cohortCount(ev, extra){ return '=IFERROR(ROWS(UNIQUE(FILTER('+F+','+evCond(ev)+','+inCohort+','+J+'<>$B$7'+(extra ? ','+extra : '')+'))),0)'; }
  function rangeCount(ev){ return '=IFERROR(ROWS(UNIQUE(FILTER('+F+','+evCond(ev)+','+inRange+'))),0)'; }
  function colL(n){ var s = ''; while (n > 0) { var m = (n-1)%26; s = String.fromCharCode(65+m)+s; n = Math.floor((n-1)/26); } return s; }

  var sh = ss.getSheetByName('Funnel Report') || ss.insertSheet('Funnel Report', 0);
  sh.clear(); sh.clearFormats();
  try { sh.getRange('A1:Z200').clearDataValidations(); } catch (e) {}
  var set = function(a1, v){ var r = sh.getRange(a1); if (typeof v === 'string' && v.charAt(0) === '=') r.setFormula(v); else r.setValue(v); return r; };

  set('A1','Your Mind Story — Funnel Report (source of truth from 22 Oct 2026)').setFontWeight('bold').setFontSize(14);
  set('A2','Change the dates in B4:B5. Everything below recalculates. Data comes from the Funnel Events tab (one row per proven event per assessment attempt) and, for section 3, the Stan Purchases and Payhip Purchases tabs. Women are counted once per submission/journey, not once per raw event.').setFontColor('#555555');
  set('A4','From'); set('B4','=DATE(2026,10,1)').setNumberFormat('dd/mm/yyyy');
  set('A5','To'); set('B5','=TODAY()').setNumberFormat('dd/mm/yyyy');
  set('A6','Include test records?'); set('B6','No');
  sh.getRange('B6').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['No','Yes'],true).build());
  set('A7','(helper)'); set('B7','=IF(B6="Yes","__include_everything__","TEST")');
  sh.getRange('A7:B7').setFontColor('#bbbbbb');
  sh.getRange('B4:B6').setBackground('#fff8e1');
  set('D4','Purchase sync: Stan confirmation emails every 15 min (YMS Stan Purchase Sync); Payhip paid webhook (historical)').setFontWeight('bold');
  set('D5','=IMPORTDATA("'+V3_EXEC_URL+'?action=sync")');

  // Hidden cohort helper: non-test assessment attempts COMPLETED in the date range.
  set('AA1','Cohort attempt keys (helper)');
  set('AA2','=IFERROR(UNIQUE(FILTER('+F+','+C+'="assessment_complete",'+inRange+')),"")');

  var r = 10;
  set('A'+r,'1. WHAT HAPPENED TO THE WOMEN WHO COMPLETED THE ASSESSMENT IN THIS PERIOD').setFontWeight('bold'); r++;
  sh.getRange(r,1,1,5).setValues([['Stage','Women','% of previous stage','% of completions','What proves it']]).setFontWeight('bold').setBackground('#eeeeee'); r++;
  var cohortRows = [
    ['Completed the assessment', '=IFERROR(ROWS(FILTER($AA$2:$AA,$AA$2:$AA<>"")),0)', CANON_EVIDENCE_V3.assessment_complete],
    ['Email captured', cohortCount('email_captured'), CANON_EVIDENCE_V3.email_captured],
    ['Viewed result', cohortCount('result_view'), CANON_EVIDENCE_V3.result_view],
    ['Recommendation shown', cohortCount('recommendation_view'), CANON_EVIDENCE_V3.recommendation_view],
    ['Clicked the recommendation button (result page)', cohortCount('recommendation_cta_click'), CANON_EVIDENCE_V3.recommendation_cta_click],
    ['STAN: clicked through to Stan checkout from the result page', cohortCount('outbound_stan_click'), CANON_EVIDENCE_V3.outbound_stan_click],
    ['STAN: clicked a Complete choice in the result email (£117 / £147 / £197)', cohortCount(CHOICE_EVENTS), 'browser: /assessment/choice/ redirect page recorded the choice, then forwarded to Stan (click only, not a purchase)'],
    ['STAN: went to Stan checkout by either route', cohortCount(STAN_EVENTS), 'Either of the two rows above, counted once per woman'],
    ['STAN: arrived on / started Stan checkout', 'NOT MEASURABLE', 'Unknown. Stan sends us no checkout-viewed or checkout-started signal (no webhooks on the current Stan plan).'],
    ['STAN: abandoned Stan checkout', 'NOT MEASURABLE', 'Unknown. Needs a checkout-started event, which Stan does not provide. A click without a purchase is NOT counted as abandonment or as a purchase.'],
    ['PAYHIP (historical): viewed YMS sales page (old complete-programme route)', cohortCount('sales_page_view'), CANON_EVIDENCE_V3.sales_page_view],
    ['PAYHIP (historical): clicked through to Payhip', cohortCount('outbound_payhip_click'), CANON_EVIDENCE_V3.outbound_payhip_click],
    ['PAYHIP (historical): arrived on Payhip product page', 'NOT MEASURABLE', 'Payhip sends no page-view signal that can be joined to a person. Aggregate payhip.com page views only, in GA4.'],
    ['PAYHIP (historical): started Payhip checkout', 'NOT MEASURABLE', 'Payhip exposes no checkout-started event (webhooks: paid, refunded, subscriptions only).'],
    ['PAYHIP (historical): returned from Payhip after paying', cohortCount('purchase_return_view'), CANON_EVIDENCE_V3.purchase_return_view],
    ['Purchased (confirmed order matched to these assessments)', cohortCount('purchase'), 'Stan purchase confirmation email (synced every 15 min) or Payhip paid webhook, matched by normalised email. Clicks are never counted as purchases. Unmatched purchases are NOT here (see section 3).'],
    ['   of which Stan', cohortCount('purchase','REGEXMATCH('+E+',"^Stan")'), 'Evidence: Stan purchase confirmation email'],
    ['   of which Payhip (historical)', cohortCount('purchase','REGEXMATCH('+E+',"^Payhip")'), 'Evidence: Payhip paid webhook']
  ];
  var first = r;
  cohortRows.forEach(function(row, i){
    sh.getRange(r,1).setValue(row[0]);
    var b = sh.getRange(r,2); if (row[1].charAt(0) === '=') b.setFormula(row[1]).setNumberFormat('0'); else b.setValue(row[1]).setFontColor('#999999');
    sh.getRange(r,5).setValue(row[2]);
    if (i > 0 && row[1].charAt(0) === '=') {
      var prev = r-1; while (prev > first && String(sh.getRange(prev,2).getValue()) === 'NOT MEASURABLE') prev--;
      sh.getRange(r,3).setFormula('=IFERROR(B'+r+'/B'+prev+',"")');
      sh.getRange(r,4).setFormula('=IFERROR(B'+r+'/B$'+first+',"")');
    }
    r++;
  });
  // Explicit previous step (index into cohortRows). Email choices follow the result email (email captured);
  // purchases can come from the result page or the email, so they are compared with recommendation clicks.
  [[5,4],[6,1],[7,0],[10,4],[11,4],[14,11],[15,4],[16,15],[17,15]].forEach(function(p){ sh.getRange(first+p[0],3).setFormula('=IFERROR(B'+(first+p[0])+'/B'+(first+p[1])+',"")'); });
  sh.getRange(first,3,r-first,2).setNumberFormat('0.0%');
  set('A'+r,'Revenue from these women (net of refunds, £)');
  set('B'+r,'=IFERROR(SUM(FILTER('+AA+',('+C+'="purchase")+('+C+'="refund"),'+inCohort+','+J+'<>$B$7)),0)').setNumberFormat('£#,##0.00'); r++;
  set('A'+r,'Revenue per completion (£)'); set('B'+r,'=IFERROR(B'+(r-1)+'/B'+first+',0)').setNumberFormat('£#,##0.00'); r += 2;

  set('A'+r,'Tracking integrity (missing tracking is NOT the same as a woman leaving)').setFontWeight('bold'); r++;
  set('A'+r,'Completed but no result view recorded (tracking gap: the result renders immediately after the save)');
  set('B'+r,'=B'+first+'-B'+(first+2)); r++;
  set('A'+r,'Result viewed but no recommendation recorded (tracking gap or closed the page instantly)');
  set('B'+r,'=B'+(first+2)+'-B'+(first+3)); r += 2;

  set('A'+r,'2. ACTIVITY IN THIS PERIOD (each event counted on its own date, once per attempt, test records excluded unless B6 = Yes)').setFontWeight('bold'); r++;
  sh.getRange(r,1,1,3).setValues([['Event','Attempts','Conversion from previous']]).setFontWeight('bold').setBackground('#eeeeee'); r++;
  var act = [['Assessment starts','assessment_start'],['Assessment completions','assessment_complete'],['Result views','result_view'],
    ['Recommendations shown','recommendation_view'],['Recommendation clicks','recommendation_cta_click'],
    ['Clicks through to Stan (result page)','outbound_stan_click'],['Result-email Complete choice clicks (to Stan)',CHOICE_EVENTS],
    ['YMS sales page views (historical Payhip route)','sales_page_view'],['Clicks through to Payhip (historical)','outbound_payhip_click'],['Returns from Payhip (historical)','purchase_return_view']];
  act.forEach(function(x, i){
    sh.getRange(r,1).setValue(x[0]); sh.getRange(r,2).setFormula(rangeCount(x[1])).setNumberFormat('0');
    if (i > 0 && i <= 5) sh.getRange(r,3).setFormula('=IFERROR(B'+r+'/B'+(r-1)+',"")').setNumberFormat('0.0%');
    r++;
  });
  set('A'+r,'All confirmed purchases (Stan + Payhip orders, incl. unmatched)');
  set('B'+r,'=IFERROR(ROWS(UNIQUE(FILTER('+Z+','+C+'="purchase",'+inRange+'))),0)').setNumberFormat('0'); r++;
  set('A'+r,'   of which matched to an assessment');
  set('B'+r,'=IFERROR(ROWS(UNIQUE(FILTER('+Z+','+C+'="purchase",'+F+'<>"",'+inRange+'))),0)').setNumberFormat('0'); r++;
  set('A'+r,'   of which unmatched (see Unmatched Purchases tab)'); set('B'+r,'=B'+(r-2)+'-B'+(r-1)).setNumberFormat('0'); r++;
  set('A'+r,'All revenue in period, net of refunds (£)');
  set('B'+r,'=IFERROR(SUM(FILTER('+AA+',('+C+'="purchase")+('+C+'="refund"),'+inRange+')),0)').setNumberFormat('£#,##0.00'); r++;
  set('A'+r,'Note: starts before 22 Oct 2026 are counted once per browser journey (the old tracking did not save a submission ID with them), and the old start log only begins in October 2026, so completions can exceed starts in older periods.').setFontColor('#777777'); r++;
  set('A'+r,'Pricing versions: Price Shown is stored on every event exactly as recorded at the time and is never rewritten (including records where £117 was displayed but £149 was recorded). Use section 4 "Price shown" to segment by pricing version: £49 / £89 / £149 = Payhip pricing before 12 Oct 2026; £37 / £74 / £117 = current single / pair / Self-Guided; £47 / £147 = recorded 22–27 Oct; £117 / £147 / £197 = result-email Complete choices from 28 Oct.').setFontColor('#777777'); r += 2;

  // 3. Purchase reconciliation, straight from the purchase tabs (orders placed in the period). Counts and £ only.
  set('A'+r,'3. PURCHASE RECONCILIATION (confirmed orders placed in this period; counts and £ only, no customer details)').setFontWeight('bold'); r++;
  var recH = ['Checkout','Confirmed orders','Matched to an assessment','Full recommendation match','Partial match','Different product','Bought before assessment','Unmatched','Verified revenue (£, net of refunds)'];
  sh.getRange(r,1,1,recH.length).setValues([recH]).setFontWeight('bold').setBackground('#eeeeee'); r++;
  var srcs = [
    {label:'Stan (current checkout)', sheet: ss.getSheetByName(V3_PURCHASES_SHEET_NAME), date:'Order UTC', amt:'Amount'},
    {label:'Payhip (historical)', sheet: payhipPurchasesSheetV3_(), date:'Purchase UTC', amt:'Amount Paid', refAmt:'Amount Refunded', refStatus:'Refund Status'}
  ];
  var recFirst = r;
  srcs.forEach(function(s){
    sh.getRange(r,1).setValue(s.label);
    if (!s.sheet) { sh.getRange(r,2).setValue('purchase tab missing'); r++; return; }
    var hm = headerMap_(s.sheet), nm = "'"+s.sheet.getName()+"'!";
    var rg = function(h){ if (!hm[h]) throw new Error('Missing column "'+h+'" on '+s.sheet.getName()); var L = colL(hm[h]); return nm+'$'+L+'$2:$'+L; };
    // Purchase timestamps are stored as ISO text (2026-10-05T16:45:19Z), so the date is read from the first 10 characters.
    var D = 'IFERROR(DATEVALUE(LEFT('+rg(s.date)+',10)),0)';
    var base = '('+D+'>=$B$4)*('+D+'<$B$5+1)*('+rg('Test Record')+'<>$B$7)';
    var M = rg('Match Method'), R = rg('Matches Recommendation'), NB = '('+M+'<>"email (bought before assessment)")';
    var cnt = function(c){ return '=ARRAYFORMULA(SUMPRODUCT('+base+(c ? '*'+c : '')+'))'; };
    [ cnt(''),
      cnt('(('+M+'="email")+(LEFT('+M+',7)="journey"))'),
      cnt(NB+'*('+R+'="Yes")'),
      cnt(NB+'*(LEFT('+R+',7)="Partial")'),
      cnt(NB+'*('+R+'="No")'),
      cnt('('+M+'="email (bought before assessment)")'),
      cnt('(LEFT('+M+',9)="unmatched")'),
      '=ARRAYFORMULA(SUMPRODUCT('+base+',IFERROR('+rg(s.amt)+'*1,0))'+(s.refAmt ? '-SUMPRODUCT('+base+'*('+rg(s.refStatus)+'="Refunded"),IFERROR('+rg(s.refAmt)+'*1,0))' : '')+')'
    ].forEach(function(x, k){ sh.getRange(r,2+k).setFormula(x); });
    sh.getRange(r,2,1,7).setNumberFormat('0');
    r++;
  });
  sh.getRange(r,1).setValue('Total (Stan + Payhip)').setFontWeight('bold');
  for (var k = 2; k <= 9; k++) { var L = colL(k); sh.getRange(r,k).setFormula('=SUM('+L+recFirst+':'+L+(r-1)+')').setFontWeight('bold').setNumberFormat('0'); }
  sh.getRange(recFirst,9,r-recFirst+1,1).setNumberFormat('£#,##0.00');
  r++;
  set('A'+r,'Confirmed = an order in Stan Purchases (read from Stan "Purchase Confirmation" emails by YMS Stan Purchase Sync every 15 minutes) or Payhip Purchases (Payhip paid webhook). Matching = purchaser email lower-cased and trimmed, matched to her most recent assessment before the purchase. Full = bought exactly the recommended product; Partial = one stage of the recommended pair, or part of the recommended complete programme. Outbound clicks never become purchases. Test records follow B6. Order details stay on the Stan Purchases, Payhip Purchases and Unmatched Purchases tabs.').setFontColor('#777777'); r += 2;

  var dims = [['Source','K'],['Recommended product','R'],['Price shown (pricing version)','T'],['Experiment / version','V']];
  dims.forEach(function(dim){
    set('A'+r,'4. BREAKDOWN BY ' + dim[0].toUpperCase() + ' (women who completed in this period)').setFontWeight('bold'); r++;
    var hdr = [dim[0],'Completed','Viewed result','Recommendation shown','Clicked recommendation','Went to Stan checkout','Clicked to Payhip (historical)','Purchased','Revenue (£)','Completion → purchase'];
    sh.getRange(r,1,1,hdr.length).setValues([hdr]).setFontWeight('bold').setBackground('#eeeeee'); r++;
    var col = FE+'$'+dim[1]+'$2:$'+dim[1];
    var dv = 'IF('+col+'="","(blank)",'+col+')';
    var top = r;
    sh.getRange(r,1).setFormula('=IFERROR(SORT(UNIQUE(FILTER('+dv+','+C+'="assessment_complete",'+inCohort+'))),"(no completions)")');
    var evs = ['assessment_complete','result_view','recommendation_view','recommendation_cta_click',STAN_EVENTS,'outbound_payhip_click','purchase'];
    evs.forEach(function(ev, k){
      sh.getRange(r, 2+k).setFormula('=BYROW($A'+top+':$A'+(top+14)+',LAMBDA(d,IF(d="","",IFERROR(ROWS(UNIQUE(FILTER('+F+','+evCond(ev)+','+dv+'=d,'+inCohort+','+J+'<>$B$7))),0))))');
    });
    sh.getRange(r,9).setFormula('=BYROW($A'+top+':$A'+(top+14)+',LAMBDA(d,IF(d="","",IFERROR(SUM(FILTER('+AA+',('+C+'="purchase")+('+C+'="refund"),'+dv+'=d,'+inCohort+','+J+'<>$B$7)),0))))');
    sh.getRange(r,10).setFormula('=BYROW($A'+top+':$A'+(top+14)+',LAMBDA(d,IF(d="","",IFERROR(INDEX(FILTER($H$'+top+':$H$'+(top+14)+',$A$'+top+':$A$'+(top+14)+'=d),1)/INDEX(FILTER($B$'+top+':$B$'+(top+14)+',$A$'+top+':$A$'+(top+14)+'=d),1),""))))');
    sh.getRange(top,2,15,7).setNumberFormat('0');
    sh.getRange(top,9,15,1).setNumberFormat('£#,##0.00');
    sh.getRange(top,10,15,1).setNumberFormat('0.0%');
    r = top + 16;
  });

  sh.setColumnWidth(1, 430); sh.setColumnWidths(2, 9, 120); sh.setColumnWidth(5, 420);
  sh.hideColumns(27);

  var u = ss.getSheetByName('Unmatched Purchases') || ss.insertSheet('Unmatched Purchases');
  u.clear();
  u.getRange('A1').setValue('Purchases that could NOT be matched to an assessment (no matching email, and no single verifiable return from Payhip), plus purchases made before any assessment. Listed, never guessed.').setFontWeight('bold');
  u.getRange('A3').setValue('PAYHIP (historical)').setFontWeight('bold');
  u.getRange('A4').setFormula("=IFERROR({'Payhip Purchases'!A1:J1,'Payhip Purchases'!N1:N1,'Payhip Purchases'!R1:R1,'Payhip Purchases'!T1:T1},\"\")");
  u.getRange('A5').setFormula("=IFERROR(FILTER({'Payhip Purchases'!A2:J,'Payhip Purchases'!N2:N,'Payhip Purchases'!R2:R,'Payhip Purchases'!T2:T}, REGEXMATCH('Payhip Purchases'!T2:T,\"^unmatched|bought before\")),\"None\")");
  u.getRange('A120').setValue('STAN (current checkout)').setFontWeight('bold');
  u.getRange('A121').setFormula("=IFERROR({'Stan Purchases'!A1:K1,'Stan Purchases'!N1:O1},\"\")");
  u.getRange('A122').setFormula("=IFERROR(FILTER({'Stan Purchases'!A2:K,'Stan Purchases'!N2:O}, REGEXMATCH('Stan Purchases'!O2:O,\"^unmatched|bought before\")),\"None\")");

  var g = ss.getSheetByName('Tracking Guide') || ss.insertSheet('Tracking Guide');
  g.clear();
  var rows = [
    ['Canonical event','Measured?','What proves it happened','Where'],
    ['assessment_start','Yes','Browser: first question rendered (sent with Submission ID from 22 Oct 2026)','Funnel Events; V4 Responses > Canonical: Started At'],
    ['assessment_complete','Yes','Server: the assessment row was saved','Funnel Events; V4 Responses > Submitted UTC'],
    ['email_captured','Yes','Server: valid email saved with the assessment','Funnel Events; V4 Responses > Email'],
    ['result_view','Yes','Browser: result screen rendered after the save was confirmed','Funnel Events; V4 Responses > Canonical: Result Viewed At'],
    ['recommendation_view','Yes','Browser: recommendation panel rendered (Price Shown = the price the page displayed)','Funnel Events; V4 Responses > Canonical: Recommendation Viewed At'],
    ['recommendation_cta_click','Yes','Browser: the recommendation button was clicked on our site','Funnel Events; V4 Responses > Canonical: CTA Clicked At / Product Clicked / Price Shown'],
    ['outbound_stan_click','Yes (from 28 Oct 2026)','Browser: a button pointing at Stan was clicked on the result page. Does NOT prove Stan loaded and is never a purchase.','Funnel Events; V4 Responses > Canonical: Stan Click At'],
    ['complete_self_guided_click / reality_reset_click / pattern_break_click','Yes (from 28 Oct 2026)','Browser: a Complete choice (£117 / £147 / £197) in the result email was clicked; /assessment/choice/ records it and forwards to Stan. Click only, never a purchase.','Funnel Events; V4 Journey Events'],
    ['Stan checkout viewed / started / abandoned','NO (unknown)','Stan sends no checkout or abandonment signal on the current plan (no webhooks).','Not available'],
    ['sales_page_view','Yes (historical complete programme route)','Browser: /return-to-yourself-journey/ loaded with her journey ID','Funnel Events; V4 Responses > Canonical: Sales Page Viewed At'],
    ['outbound_payhip_click','Yes (historical)','Browser: a button pointing at Payhip was clicked. This does NOT prove Payhip loaded.','Funnel Events; V4 Responses > Canonical: Payhip Click At'],
    ['product_page_arrival (Payhip)','NO (per person)','Payhip sends no page-view signal we can join to a journey. Payhip pages carry GA4 G-0MFXQ5ETCD, so aggregate payhip.com page views exist in GA4 only.','GA4 (aggregate)'],
    ['checkout_start (Payhip)','NO','Payhip exposes no checkout-started event (its webhooks are paid, refunded, subscription created/deleted).','Not available'],
    ['purchase_return_view','Yes (historical Payhip complete programme only)','Browser: landed on /return-to-yourself-journey/welcome/ from Payhip\'s success redirect','Funnel Events; V4 Responses > Canonical: Returned From Payhip At'],
    ['purchase','Yes','Stan purchase confirmation email (current checkout; YMS Stan Purchase Sync, every 15 min) or Payhip paid webhook (historical). Never accepted from a browser or a click.','Stan Purchases; Payhip Purchases; Funnel Events; V4 Responses > Purchase columns'],
    ['refund','Yes (Payhip, from 22 Oct 2026)','Payhip refunded webhook','Payhip Purchases > Refund Status; Funnel Events'],
    ['',''],
    ['Matching purchases to assessments','','1) same email (lower-cased, trimmed), most recent assessment before the purchase. 2) Payhip only: her browser returned from Payhip within 60 min with her journey ID AND it was the only candidate. Otherwise listed on Unmatched Purchases. Nothing is guessed.',''],
    ['Test records','','Visit any YMS page with ?yms_test=1 to mark that browser as a test browser (?yms_test=0 clears). Also auto-flagged: emails containing test, yourmindstory, kacijv, scoring, or y@y.com. To flag one by hand, type TEST in V4 Responses > Test Record; the next sync copies it to Funnel Events. Nothing is deleted.',''],
    ['Pricing history','','Price Shown and purchase amounts are kept exactly as recorded at the time and are never rewritten. Segment with Funnel Report section 4 "Price shown".',''],
    ['',''],
    ['LEGACY fields (kept for history, not used for reporting from 22 Oct 2026)','','Recommendation CTA Clicked, Checkout Clicked, Checkout Clicked At, Primary CTA Clicked, Primary CTA Clicked At, Result Viewed At, Recommendation Shown At, Recommendation Reveal Clicked At, Bootcamp/Self-Guided/Bare Minimum Clicked (+At), Sales Page Viewed At, Checkout Screen columns, V4 Journey Events (raw log), V4 Sales Events. "Checkout Clicked" only ever meant an outbound click.',''],
    ['CANONICAL fields','','Funnel Events tab; V4 Responses columns starting "Canonical:"; Purchase Status / Purchased Product / Purchase Value / Purchase Date / Purchase Order ID / Purchase Match Method (recomputed from Stan Purchases + Payhip Purchases on every sync); Stan Purchases and Payhip Purchases tabs.','']
  ];
  rows = rows.map(function(x){ while (x.length < 4) x.push(''); return x; });
  g.getRange(1,1,rows.length,4).setValues(rows);
  g.getRange(1,1,1,4).setFontWeight('bold').setBackground('#eeeeee');
  g.setColumnWidth(1, 260); g.setColumnWidth(2, 170); g.setColumnWidth(3, 620); g.setColumnWidth(4, 380);
  g.getRange(1,1,rows.length,4).setWrap(true).setVerticalAlignment('top');
  return 'Funnel Report, Unmatched Purchases and Tracking Guide built.';
}
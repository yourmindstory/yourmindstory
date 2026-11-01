/**
 * Your Mind Story V3 Assessment backend
 * Version: YMS-ASSESSMENT-2026-V3 (backend build 2026-10-06 offer-lock + purchase attribution)
 * Spreadsheet: 1MRK7_t-_HN8OCHpK8tm1E8QWXexo8ACLMTdsqZjaoXE
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
 * This script uses ONLY Spreadsheet, MailApp, UrlFetch and Properties services.
 * Do not add GmailApp / ScriptApp here: a new OAuth scope would stop the live web app
 * until it is re-authorised. The Gmail-based Stan purchase sync lives in a separate project.
 */
var V3_VERSION = 'YMS-ASSESSMENT-2026-V3';
var V3_BACKEND_BUILD = '2026-10-28-funnel-report-stan';
var V3_SHEET_ID = '1MRK7_t-_HN8OCHpK8tm1E8QWXexo8ACLMTdsqZjaoXE';
var V3_SHEET_NAME = 'V3 Responses';
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

// Columns added by this build. They are appended to the right-hand end of V3 Responses
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
  'Final Offer Option','Final Offer Product','Final Offer Route','Final Offer Price',
  'Support Choice ID','Support Choice Answer','Final Choice Saved UTC','Result Email State'
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
// 22 Oct 2026: prices verified on the live Payhip product pages and the live result page (single £47, pair £89, complete £147).
var PRICE_SINGLE = 37, PRICE_PAIR = 74, PRICE_SERIES = 117, PRICE_BARE_MINIMUM = 4.99;

// 22 Oct 2026: result-email links now go to the same Payhip products as the live result page (were Stan).
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
      finalOfferOption:data['Final Offer Option']||'',
      finalOfferProduct:data['Final Offer Product']||'',
      supportChoiceId:data['Support Choice ID']||'',
      resultEmailState:data['Result Email State']||''
    });
  }
  return json_({
    ok:true,status:'ok',assessmentVersion:V3_VERSION,backendBuild:V3_BACKEND_BUILD,
    message:'Your Mind Story V3 assessment backend is running.'
  });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ok:false,status:'error',code:'MALFORMED_JSON',message:'Malformed JSON body'});
  }
  // Operational funnel events update the woman's EXISTING row. They never create a second journey row,
  // never recalculate her assessment, and never queue behind the 30-second submission lock
  // (that queue is what made bursts of events time out and disappear).
  if (body && (body.action === 'recordJourneyEvent' || body.action === 'recordJourneyEvents')) {
    return handleJourneyRequestV3_(body);
  }
  if (body && body.action === 'finalizeResultV3') {
    return json_(finalizeResultV3_(body));
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return json_({ok:false,status:'error',code:'BUSY',message:'Busy, please retry.'});
  }
  try {
    // Purchases are NOT accepted over this public endpoint (they could be faked). They are written
    // straight into the 'Stan Purchases' tab by the separate 'YMS Stan Purchase Sync' script, which
    // reads Stan's own purchase confirmation emails. These two maintenance actions only recompute
    // derived columns from data already in the Sheet, so they are safe to expose.
    if (body && body.action === 'rematchPurchases') {
      return json_(rematchAllPurchasesV3_());
    }
    if (body && body.action === 'reclassifySources') {
      return json_(reclassifySourcesV3_());
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
    var row = buildRowV3_(sheet, body, result, journeyId, submissionId, resultToken, now);
    sheet.appendRow(row);
    var rowNumber = sheet.getLastRow();

    // The assessment row is already saved. Email delivery must never turn a successful
    // assessment into a failed browser submission.
    var deferEmail = body.deferResultEmail === true;
    var emailDelivery = {ok:false,provider:deferEmail?'pending_choice':'none',error:''};
    try {
      if (!deferEmail) emailDelivery = sendResultEmailV3_(body, result, resultToken, journeyId, submissionId);
    } catch (emailErr) {
      console.error('Result email failed after assessment save: ' + emailErr);
      emailDelivery = {ok:false,provider:'none',error:String(emailErr)};
    }
    try {
      setByHeader_(sheet, rowNumber, 'Result Email Sent',
        emailDelivery.ok ? Utilities.formatDate(new Date(),'Europe/London','dd/MM/yyyy HH:mm:ss') : '');
      setByHeader_(sheet, rowNumber, 'Result Email Provider', emailDelivery.provider || '');
      setByHeader_(sheet, rowNumber, 'Result Email Error', String(emailDelivery.error || '').slice(0,1000));
      setByHeader_(sheet, rowNumber, 'Result Email State',
        deferEmail ? 'pending_choice' : (emailDelivery.ok ? 'sent' : 'failed'));
    } catch (emailLogErr) {
      console.error('Could not record email delivery status: ' + emailLogErr);
    }

    // Canonical funnel events (tracking repair 22 Oct 2026): completion + email are proven server-side here.
    try { onSubmissionSavedV3_(sheet, rowNumber, body, submissionId, journeyId); } catch (fErr) { console.error('Funnel write failed: '+fErr); }

    // If she bought before taking the assessment (rare), or a purchase is already waiting, link it.
    try { rematchPurchasesForEmail_(clean_(body.email).toLowerCase()); } catch (pmErr) { console.error('Purchase rematch failed: '+pmErr); }

    return json_({
      ok:true,status:'ok',code:'RECORDED',
      submissionId:submissionId,journeyId:journeyId,resultToken:resultToken,
      assessmentVersion:V3_VERSION,backendBuild:V3_BACKEND_BUILD,
      scores:result.scores,totalScore:result.total,
      qualifyingStages:result.qualifyingStages,breadth:result.breadth,
      recommendedRoute:result.route,recommendedProduct:result.product,
      recommendedPrice:result.price,recommendationCategory:result.category,
      resultEmailSent:emailDelivery.ok === true,
      resultEmailProvider:emailDelivery.provider || 'none',
      resultEmailError:emailDelivery.error || ''
    });
  } catch (err) {
    console.error(err);
    return json_({ok:false,status:'error',code:'SERVER_ERROR',message:'Submission could not be recorded.'});
  } finally {
    lock.releaseLock();
  }
}

/* ============================== JOURNEY EVENTS ============================== */

// 'purchase' is deliberately NOT accepted here: this endpoint is public, so a purchase
// sent from a browser could be faked. Purchases arrive only via recordStanPurchasesV3_.
var V3_JOURNEY_EVENTS = [
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
  'pattern_break_click'
];

// Every journey event (accepted or rejected) is written to this log, one row per event, so failures are visible.
var V3_JOURNEY_LOG_SHEET = 'V3 Journey Events';
var V3_JOURNEY_LOG_HEADERS = ['Event Time (UK)','Event','Page','Status','Submission ID','Journey ID','Result Token','V3 Row',
  'Step / Screen','Product','Route','CTA','Entry','Analytics Consent','Client Time'];
var V3_JOURNEY_SUMMARY_HEADERS = ['Last Journey Event','Last Journey Event At','Analytics Consent','Sales Page Entry'];

function getJourneyLogSheetV3_() {
  var ss = SpreadsheetApp.openById(V3_SHEET_ID);
  var sh = ss.getSheetByName(V3_JOURNEY_LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(V3_JOURNEY_LOG_SHEET);
    sh.getRange(1,1,1,V3_JOURNEY_LOG_HEADERS.length).setValues([V3_JOURNEY_LOG_HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function logJourneyV3_(stamp, eventType, page, status, identity, rowNumber, values, consent) {
  try {
    values = values || {};
    getJourneyLogSheetV3_().appendRow([
      stamp, eventType || '', page || '', status, identity.submissionId || '', identity.journeyId || '',
      identity.resultToken || '', rowNumber || '', clean_(values.step || values.screen || ''),
      clean_(values.product), clean_(values.route), clean_(values.cta), clean_(values.entry),
      consent || '', clean_(values.clientTime)
    ]);
  } catch (err) {
    console.error('Journey log write failed: ' + err);
  }
}

// Accepts one event (legacy 'recordJourneyEvent') or several in one request ('recordJourneyEvents').
// Writes only to the woman's existing row (found by Result Token, then Submission ID, then Journey ID).
function handleJourneyRequestV3_(body) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try { locked = lock.tryLock(8000); } catch (lockErr) { locked = false; }
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
    recordCanonicalJourneyV3_(body, list, identity);
    if (list.some(function(ev){ return clean_(ev && ev.eventType) === 'purchase_return_view'; })) {
      try { syncAllV3_(); } catch (syncErr) { console.error('Sync after Payhip return failed: ' + syncErr); }
    }
    var sheet = getV3Sheet_();
    var rowNumber = findRowNumber_(sheet, identity);
    if (!rowNumber) {
      // Before the assessment is submitted there is no row yet: that is expected, not an error.
      var preSub = list.every(function(ev){ return /^assessment_/.test(clean_(ev && ev.eventType)); });
      list.forEach(function(ev){ logJourneyV3_(stamp, clean_(ev && ev.eventType), page, preSub ? 'PRE_SUBMISSION (no row yet)' : 'ROW_NOT_FOUND', identity, '', vals_(ev), consent); });
      return json_({ok:false,status:'error',code:'ROW_NOT_FOUND',message:'Existing assessment row not found'});
    }
    var results = [], lastOk = '';
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
    return json_({
      ok: results.some(function(r){ return r.ok; }), status: 'ok', action: body.action,
      eventType: single ? single.eventType : undefined, rowNumber: rowNumber, results: results
    });
  } finally {
    if (locked) { try { lock.releaseLock(); } catch (relErr) {} }
  }
}

function applyJourneyEventV3_(sheet, rowNumber, eventType, identity, values, stamp) {
  var product = clean_(values.product);
  var route = clean_(values.route);
  var cta = clean_(values.cta || product || route);
  // Stepped sales page (RTY-stepped-mobile-v1): screen views + checkout source screen.
  recordSalesEventV3_(sheet, rowNumber, eventType, identity, values, stamp);
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
  // Q1-Q12 are required. Q13 is multi-select (may be an empty array object but must exist).
  // Q14 has been removed from the assessment and is NEVER required: whatever is sent
  // (nothing, null, an empty object) can never block a save. Q15 is optional.
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
  return {ok:true};
}

/**
 * Routing — identical to the live result page (assessment/start/index.html showResult()).
 * Stage score = sum of its two questions (0-6). Affected = 3+, clear = 4+, moderate = exactly 3.
 *  - Whole journey (Return to You Series £117): 3+ clear stages, or 2 clear + at least 1 moderate.
 *  - Otherwise the clear stages lead (or, if none are clear, the moderate stages), capped at the
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
  var wholeJourney = clear.length >= 3 || (clear.length >= 2 && moderate.length >= 1);
  var route, product, price, category, recommendedStages;
  if (wholeJourney) {
    route = SERIES_NAME;
    product = SERIES_NAME;
    price = PRICE_SERIES;
    category = 'return_to_you_series';
    recommendedStages = STAGES.slice();
  } else {
    var lower = clear.length >= 1 ? clear.slice() : moderate.slice();
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

/* ============================== FINAL CHOICE ============================== */
function supportChoiceMapV3_() {
  return {
    independent:{answer:"I'm happy to work independently",allowed:['self_guided']},
    additional:{answer:'I want additional support',allowed:['reality_reset','pattern_break']},
    some:{answer:'I think some support would help me with this',allowed:['reality_reset','pattern_break']},
    unsure:{answer:"I'm not sure where to start. I'd like you to recommend what would help me most.",allowed:['reality_reset','self_guided','pattern_break']}
  };
}
function finalOfferResultV3_(row, option) {
  var base={route:String(row['Recommended Route']||''),product:String(row['Recommended Product']||''),
    price:Number(row['Recommended Price']||0),category:String(row['Recommendation Category']||''),
    qualifyingStages:String(row['Qualifying Stages']||'').split(',').map(function(x){return x.trim();}).filter(Boolean),
    scores:{quiet:Number(row['Quiet Score']||0),breakPull:Number(row['Break Score']||0),restore:Number(row['Restore Score']||0),returnSelf:Number(row['Return Score']||0)},
    total:Number(row['Total Score']||0),breadth:Number(row['Breadth']||0)};
  return base;
}
function finalizeResultV3_(body) {
  var token=clean_(body.resultToken);
  if(!token)return {ok:false,code:'MISSING_RESULT_TOKEN',message:'Saved result token is required.'};
  var option=clean_(body.finalOfferOption),supportId=clean_(body.supportPreference);
  var lock=LockService.getScriptLock(),sh,rowNumber,row,expected,choice;
  if(!lock.tryLock(10000))return {ok:false,code:'BUSY',message:'Please try again.'};
  try {
    sh=getV3Sheet_();
    rowNumber=findRowNumber_(sh,{resultToken:token});
    if(!rowNumber)return {ok:false,code:'NOT_FOUND',message:'Saved assessment not found.'};
    row=rowObject_(sh,rowNumber);
    if(body.submissionId&&clean_(body.submissionId)!==clean_(row['Submission ID']))
      return {ok:false,code:'SUBMISSION_MISMATCH',message:'Saved result does not match this assessment.'};
    var totalScore=Number(row['Total Score']||0);
    var readinessRequired=String(row['Recommended Route']||'')===SERIES_NAME &&
      String(row['Qualifying Stages']||'').split(',').map(function(x){return x.trim();}).filter(Boolean).length>=3 &&
      totalScore>=15;
    var readiness=clean_(body.readiness);
    if(readinessRequired&&!readiness)
      return {ok:false,code:'READINESS_REQUIRED',message:'Please answer the readiness question before continuing.'};
    if(readinessRequired&&["I know understanding alone isn't enough and I'm ready to start working on this.", "I'm ready for a structured process and willing to participate in it consistently.", "I know something needs to change, but I'm not sure I'm ready to actively work on it yet.", "Right now, I'm mainly looking to understand what is happening."].indexOf(readiness)===-1)
      return {ok:false,code:'INVALID_READINESS',message:'Please choose a readiness answer from the list.'};
    if(String(row['Recommended Route']||'')===SERIES_NAME) {
      var support=supportChoiceMapV3_()[supportId];
      choice=COMPLETE_CHOICES_V3.filter(function(x){return x.option===option;})[0];
      if(!support||!choice||support.allowed.indexOf(option)===-1)
        return {ok:false,code:'INVALID_FINAL_CHOICE',message:'Please select an offer available for your answer.'};
      var productNames={self_guided:'Return to Yourself — Self-Guided',reality_reset:'Return to Yourself + Reality Reset',pattern_break:'Return to Yourself + Pattern Break Session'};
      var routeNames={self_guided:'Self-Guided',reality_reset:'Reality Reset',pattern_break:'Pattern Break Session'};
      expected={product:productNames[option],route:routeNames[option],price:choice.price};
    } else {
      if(option!=='scored_route'||supportId)
        return {ok:false,code:'INVALID_FINAL_CHOICE',message:'This result must use its scored recommendation.'};
      expected={product:String(row['Recommended Product']||''),route:String(row['Recommended Route']||''),price:Number(row['Recommended Price']||0)};
      choice={option:'scored_route',title:expected.product,price:expected.price};
    }
    if(clean_(body.finalOfferProduct)!==expected.product||
       clean_(body.finalOfferRoute)!==expected.route||
       Number(body.finalOfferPrice)!==Number(expected.price))
      return {ok:false,code:'OFFER_MISMATCH',message:'The offer details do not match the saved result.'};
    var prior=clean_(row['Final Offer Option']);
    var state=clean_(row['Result Email State']);
    if(prior&&prior!==option)return {ok:false,code:'CHOICE_LOCKED',message:'A different final offer has already been saved.'};
    if(state==='sent'&&prior===option)
      return {ok:true,status:'already_finalized',resultEmailSent:true,provider:clean_(row['Result Email Provider'])};
    if(state==='sending')return {ok:false,code:'SEND_IN_PROGRESS',message:'Your email is being prepared. Please wait a moment.'};
    var now=Utilities.formatDate(new Date(),'UTC',"yyyy-MM-dd'T'HH:mm:ss'Z'");
    var supportAnswer=String(row['Recommended Route']||'')===SERIES_NAME?support.answer:'';
    setByHeader_(sh,rowNumber,'Final Offer Option',option);
    setByHeader_(sh,rowNumber,'Final Offer Product',expected.product);
    setByHeader_(sh,rowNumber,'Final Offer Route',String(row['Recommended Route']||'')===SERIES_NAME?expected.route:expected.route);
    setByHeader_(sh,rowNumber,'Final Offer Price',expected.price);
    setByHeader_(sh,rowNumber,'Support Choice ID',supportId);
    setByHeader_(sh,rowNumber,'Support Choice Answer',supportAnswer);
    if(readiness){
      setByHeader_(sh,rowNumber,'Readiness',readiness);
      setByHeader_(sh,rowNumber,'Q14 Readiness Raw',readiness);
    }
    setByHeader_(sh,rowNumber,'Final Choice Saved UTC',now);
    setByHeader_(sh,rowNumber,'Result Email State','sending');
  } catch(err) {
    console.error('Final choice save failed: '+err);
    return {ok:false,code:'SAVE_FAILED',message:'Your choice could not be saved. Please try again.'};
  } finally {
    lock.releaseLock();
  }

  var result=finalOfferResultV3_(row,option);
  var recipient={email:String(row['Email']||''),firstName:String(row['First Name']||'')};
  var delivery;
  try {
    delivery=sendResultEmailV3_(recipient,result,token,String(row['Journey ID']||''),String(row['Submission ID']||''),option==='scored_route'?'':option);
  } catch(sendErr) {
    delivery={ok:false,provider:'none',error:String(sendErr)};
  }
  var finishLock=LockService.getScriptLock();
  if(finishLock.tryLock(10000)) {
    try {
      if(delivery.ok) {
        setByHeader_(sh,rowNumber,'Result Email Sent',Utilities.formatDate(new Date(),'Europe/London','dd/MM/yyyy HH:mm:ss'));
        setByHeader_(sh,rowNumber,'Result Email State','sent');
      } else setByHeader_(sh,rowNumber,'Result Email State','failed');
      setByHeader_(sh,rowNumber,'Result Email Provider',delivery.provider||'none');
      setByHeader_(sh,rowNumber,'Result Email Error',String(delivery.error||'').slice(0,1000));
    } finally { finishLock.releaseLock(); }
  }
  return {ok:delivery.ok===true,status:delivery.ok?'finalized':'email_failed',
    resultEmailSent:delivery.ok===true,provider:delivery.provider||'none',finalOffer:expected.product};
}

function productUrlV3_(result) {
  if (result.route === SERIES_NAME) return SERIES_SALES_PAGE_URL;
  if (result.route === 'Two-Stage Pair') return PAIR_URLS[result.product] || '';
  if (result.route === 'Single Stage') return SINGLE_URLS[result.product] || '';
  if (result.route === 'Bare Minimum') return BARE_MINIMUM_URL;
  return '';
}

function buildRowV3_(sheet, body, r, journeyId, submissionId, resultToken, now) {
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
  vals['Readiness'] = a.q14 ? answerText_(a.q14) : '';
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
  vals['Marketing Consent'] = body.marketingConsent === true;
  vals['Final Route Shown'] = r.route;
  vals['Final Recommendation'] = r.product;
  vals['Journey ID'] = journeyId;
  vals['Submission ID'] = submissionId;
  vals['Result Token'] = resultToken;
  vals['Result Email State'] = body.deferResultEmail === true ? 'pending_choice' : 'pending_legacy';
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
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  return headers.map(function(h){ return Object.prototype.hasOwnProperty.call(vals,h) ? vals[h] : ''; });
}

/* ============================== SHEET HELPERS ============================== */

function getV3Sheet_() {
  var ss = SpreadsheetApp.openById(V3_SHEET_ID);
  var sheet = ss.getSheetByName(V3_SHEET_NAME);
  if (!sheet) throw new Error('Missing sheet: '+V3_SHEET_NAME);
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  V3_HEADERS.forEach(function(h){
    if (headers.indexOf(h) === -1) throw new Error('Missing required header: '+h);
  });
  var missing = V3_EXTRA_HEADERS.filter(function(h){ return headers.indexOf(h) === -1; });
  if (missing.length) {
    sheet.getRange(1, headers.length+1, 1, missing.length).setValues([missing]);
    clearHeaderCache_();
  }
  return sheet;
}

function getPurchasesSheet_() {
  var ss = SpreadsheetApp.openById(V3_SHEET_ID);
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
  return true;
}

function setFirstByHeader_(sheet,rowNumber,headerName,value) {
  var map = headerMap_(sheet);
  var col = map[headerName];
  if (!col) return false;
  var cell = sheet.getRange(rowNumber,col);
  if (!String(cell.getValue()||'').trim()) cell.setValue(value);
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

function sendResultEmailViaBrevoV3_(toEmail,toFirstName,subject,htmlBody,textBody) {
  // Returns {ok, error}. Logs the Brevo status code and body so failures are diagnosable.
  try {
    var props = PropertiesService.getScriptProperties();
    var apiKey = props.getProperty('BREVO_API_KEY');
    var senderEmail = props.getProperty('BREVO_SENDER_EMAIL');
    if (!apiKey || !senderEmail) return {ok:false,error:'Brevo not configured (BREVO_API_KEY / BREVO_SENDER_EMAIL script properties missing)'};
    var senderName = props.getProperty('BREVO_SENDER_NAME') || 'Onye';
    var payload = {
      sender:{email:senderEmail,name:senderName},
      to:[{email:toEmail,name:toFirstName||undefined}],
      subject:subject,
      htmlContent:htmlBody,
      textContent:textBody,
      tags:['yms-v3-result']
    };
    var response = UrlFetchApp.fetch('https://api.brevo.com/v3/smtp/email',{
      method:'post',
      contentType:'application/json',
      headers:{'api-key':apiKey,'accept':'application/json'},
      payload:JSON.stringify(payload),
      muteHttpExceptions:true
    });
    var code=response.getResponseCode();
    if (code>=200 && code<300) return {ok:true,error:''};
    var text = String(response.getContentText()||'').slice(0,300);
    console.error('Brevo send failed, status '+code+': '+text);
    return {ok:false,error:'Brevo HTTP '+code+': '+text};
  } catch(err) {
    console.error('sendResultEmailViaBrevoV3_ failed: '+err);
    return {ok:false,error:'Brevo exception: '+String(err)};
  }
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
    utm_source:'yms_assessment', utm_medium:'email', utm_campaign:'v3_result_email',
    utm_content:result.category || ''
  };
  if (url.indexOf('yourmindstory.co.uk') !== -1) { params.jid = journeyId || ''; params.sid = submissionId || ''; }
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
      content.resultText+'\n\n'+
      content.recommendationText+'\n\n'+
      content.buttonLabel+'\n'+
      buttonUrl+'\n\n'+
      (secondaryUrl ? content.secondaryText+'\n\n'+content.secondaryButtonLabel+'\n'+secondaryUrl+'\n\n' : '')+
      (resultLink ? 'Your personalised result: '+resultLink+'\n\n' : '')+
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
      (resultLink ? '<p style="margin:10px 0 24px;"><a href="'+escapeHtmlV3_(resultLink)+'">VIEW MY PERSONALISED RESULTS</a></p>' : '')+
      '<p>With care,<br>Onye</p>'+
      '</div>';
    if (MailApp.getRemainingDailyQuota()<1) throw new Error('MailApp daily recipient quota is exhausted.');
    MailApp.sendEmail({to:email,subject:subject,body:plainBody,htmlBody:htmlBody,name:'Onye'});
    return {ok:true,provider:'mailapp',error:''};
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
  'And there’s a reason I asked you about those things.',
  'More than 1,800 women have now taken the Your Mind Story assessment. And although every relationship is different, the same four areas keep showing up in what women tell me this pattern has done to them:',
  'the alarm, the pull, losing trust in themselves and losing themselves in what’s happening with him.',
  'That’s why those are the four areas I work on.',
  'You might already understand why he behaves the way he does. You might even know exactly what you should do.',
  'But knowing something consciously doesn’t automatically change the pattern that’s been created in you.',
  'You don’t decide to feel anxious when he goes quiet. You don’t decide to wake up thinking about him, feel the urge to check your phone or suddenly want to reach out after promising yourself you wouldn’t.',
  'Those responses can happen automatically.',
  'That’s why knowing what to do and being able to do it are two different things.',
  'You can’t always think your way out of a response you didn’t consciously choose.',
  'That’s the part we work on with Cognitive Behavioral Hypnotherapy.',
  'Rather than giving you more information about him, we’re working on the responses that are now happening in you.'
];

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
  var base=withTrackingV3_(RESULT_PAGE_URL_V3,result,journeyId,submissionId);
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

// Same delivery path as before: Brevo first, MailApp fallback.
function deliverResultEmailV3_(email,firstName,subject,htmlBody,plainBody) {
  try {
    if (MailApp.getRemainingDailyQuota()<1) throw new Error('MailApp daily recipient quota is exhausted.');
    MailApp.sendEmail({to:email,subject:subject,body:plainBody,htmlBody:htmlBody,name:'Onye'});
    return {ok:true,provider:'mailapp',error:''};
  } catch(mailErr) {
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
  var recHtml, recText;
  if (plan.kind === 'complete') {
    var choiceHtml = '', choiceText = '';
    var choices = finalOfferOption ? plan.choices.filter(function(c){ return c.option === finalOfferOption; }) : plan.choices;
    if (!choices.length) throw new Error('Unknown final Complete offer: '+finalOfferOption);
    choices.forEach(function(c){
      var href = completeChoiceLinkV3_(c, result, journeyId, submissionId);
      links.push({label:c.button, url:href, option:c.option, event:c.event});
      choiceHtml +=
        '<div style="border-top:1px solid #e5e7eb;padding-top:22px;margin-top:6px;">'+
        '<p style="margin:0 0 8px;font-style:italic;">'+e(c.quote)+'</p>'+
        '<p style="font-family:Georgia,serif;font-size:19px;font-weight:700;line-height:1.35;margin:0 0 10px;">'+e(c.title)+'</p>'+
        P+e(c.desc)+'</p>'+
        btn(c.button, href, '18px 0 26px')+
        '</div>';
      choiceText += c.quote+'\n\n'+c.title+'\n\n'+c.desc+'\n\n'+c.button+'\n'+href+'\n\n';
    });
    recHtml = paras(plan.rec)+
      (finalOfferOption ? '' : '<p style="font-family:Georgia,serif;font-size:21px;font-weight:700;color:#111827;margin:30px 0 16px;">'+e(RESULT_EMAIL_COMPLETE_V3.choiceHeading)+'</p>')+
      choiceHtml;
    recText = plan.rec.join('\n\n')+'\n\n'+(finalOfferOption?'':RESULT_EMAIL_COMPLETE_V3.choiceHeading+'\n\n')+choiceText;
  } else {
    var link = withTrackingV3_(plan.url, result, journeyId, submissionId);
    links.push({label:plan.button, url:link});
    recHtml = paras(plan.rec)+
      '<p style="font-family:Georgia,serif;font-size:20px;font-weight:700;line-height:1.35;margin:4px 0 6px;">'+e(plan.priceLine)+'</p>'+
      btn(plan.button, link);
    recText = plan.rec.join('\n\n')+'\n\n'+plan.priceLine+'\n\n'+plan.button+'\n'+link+'\n\n';
  }

  var resultLink=savedResultLinkV3_(resultToken,result,journeyId,submissionId);
  if (resultLink) links.push({label:'VIEW MY PERSONALISED RESULTS',url:resultLink});
  var savedResultHtml=resultLink?btn('VIEW MY PERSONALISED RESULTS',resultLink,'10px 0 18px'):'';
  var savedResultText=resultLink?'Your personalised result: '+resultLink+'\n\n':'';
  var html =
    preheader+
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:0 4px;color:#111827;font-size:16px;line-height:1.65;">'+
    P+'Hi '+e(firstName)+',</p>'+
    P+'I’ve looked at your answers.</p>'+
    paras(plan.result)+
    paras(RESULT_EMAIL_MIDDLE_V3)+
    recHtml+
    savedResultHtml+
    P+'With care,</p>'+
    '<p style="margin:0 0 18px;">Onye<br>Your Mind Story<br>Cognitive Behavioral Hypnotherapist</p>'+
    '</div>';

  var text =
    'Hi '+firstName+',\n\n'+
    'I’ve looked at your answers.\n\n'+
    plan.result.join('\n\n')+'\n\n'+
    RESULT_EMAIL_MIDDLE_V3.join('\n\n')+'\n\n'+
    recText+
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
    return {
      resultText:"Based on your answers, one part of the cycle isn't standing out strongly enough for me to recommend one of the four stage sessions as your first step.",
      resultHtml:"<p>Based on your answers, one part of the cycle isn't standing out strongly enough for me to recommend one of the four stage sessions as your first step.</p>",
      recommendationText:'Based on your answers, this is where I recommend you start:\n\nThe Bare Minimum',
      recommendationHtml:'<p>Based on your answers, this is where I recommend you start:</p><h2 style="font-family:Georgia,serif;font-size:26px;">The Bare Minimum</h2>',
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
// Every sales_step_view / checkout_click is appended to the 'V3 Sales Events' log sheet
// (one row per event = full journey history), and summarised on the woman's existing
// V3 Responses row in new columns appended at the far right. Never blocks the event.
var V3_SALES_EVENTS_SHEET = 'V3 Sales Events';
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
  return col ? sheet.getRange(rowNumber, col).getValue() : '';
}

function getSalesEventsSheetV3_() {
  var ss = SpreadsheetApp.openById(V3_SHEET_ID);
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
 *   assessment_complete       server: assessment row saved in V3 Responses
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
  var ss = SpreadsheetApp.openById(V3_SHEET_ID);
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

// Builds a Funnel Events row object. row = rowObject_ of the V3 Responses row when it belongs to this attempt.
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
    list.forEach(function(ev){
      var canon = CANON_MAP_V3[clean_(ev && ev.eventType)];
      if (!canon) return;
      if (canon !== 'assessment_start' && !row && canon !== 'sales_page_view' && canon !== 'outbound_payhip_click' && canon !== 'outbound_stan_click' && canon !== 'purchase_return_view') return;
      var values = ev && ev.values && typeof ev.values === 'object' ? ev.values : {};
      var evidence = CANON_EVIDENCE_V3[canon];
      if (clean_(ev.eventType) === 'checkout_click') evidence = 'legacy checkout_click: outbound click only';
      var rec = funnelRecordV3_(canon, now, evidence, ids, row, values, touch, body.isTest === true,
        { experiment: clean_(body.experimentVersion), v3Row: rowNumber || '' });
      var res = writeFunnelEventV3_(rec, false);
      if (row && res === 'recorded') stampCanonicalOnRowV3_(sheet, rowNumber, canon, now, values);
    });
  } catch (err) {
    console.error('recordCanonicalJourneyV3_ failed: ' + err);
  }
}

// Called once the assessment row is saved.
function onSubmissionSavedV3_(sheet, rowNumber, body, submissionId, journeyId) {
  try {
    var row = rowObject_(sheet, rowNumber);
    var now = new Date();
    var ids = { submissionId: submissionId, journeyId: journeyId };
    writeFunnelEventV3_(funnelRecordV3_('assessment_complete', now, CANON_EVIDENCE_V3.assessment_complete, ids, row, { price: body.priceShown }, null, body.isTest === true, { v3Row: rowNumber }), false);
    if (clean_(body.email)) writeFunnelEventV3_(funnelRecordV3_('email_captured', now, CANON_EVIDENCE_V3.email_captured, ids, row, {}, null, body.isTest === true, { v3Row: rowNumber }), false);
    // Bring the start time onto the row and give earlier events of this attempt the row's attribution + test flag.
    var fe = funnelSheetV3_();
    if (fe.getLastRow() >= 2) {
      var fmap = headerMap_(fe);
      var cells = fe.getRange(2, fmap['Attempt Key'], fe.getLastRow()-1, 1).createTextFinder(submissionId).matchEntireCell(true).findAll();
      var isTest = String(row['Test Record']) === 'TEST';
      cells.forEach(function(c){
        var r = c.getRow();
        var vals = fe.getRange(r,1,1,FUNNEL_HEADERS_V3.length).getValues()[0];
        var obj = {}; FUNNEL_HEADERS_V3.forEach(function(h,i){ obj[h] = vals[i]; });
        if (obj['Event'] === 'assessment_start') {
          ensureHeaderV3_(sheet, CANON_ROW_COLS_V3.assessment_start);
          setFirstByHeader_(sheet, rowNumber, CANON_ROW_COLS_V3.assessment_start, obj['Event Time (UK)']);
        }
        obj['Email'] = row['Email']; obj['V3 Row'] = rowNumber;
        if (isTest) obj['Test'] = 'TEST';
        obj['Recommended Product'] = row['Recommended Product']; obj['Route'] = row['Recommended Route'];
        obj['Experiment'] = row['Experiment Version'];
        fe.getRange(r,1,1,FUNNEL_HEADERS_V3.length).setValues([FUNNEL_HEADERS_V3.map(function(h){ return obj[h]; })]);
      });
    }
    ensureHeaderV3_(sheet, 'Canonical: Furthest Stage');
    var cur = getByHeaderV3_(sheet, rowNumber, 'Canonical: Furthest Stage');
    setByHeader_(sheet, rowNumber, 'Canonical: Furthest Stage', furthestStageV3_(cur, 'email_captured'));
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
  var ss = SpreadsheetApp.openById(V3_SHEET_ID);
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

  var ss = SpreadsheetApp.openById(V3_SHEET_ID);
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
  var ss = SpreadsheetApp.openById(V3_SHEET_ID);
  var found = [V3_PURCHASES_SHEET_NAME, PAYHIP_PURCHASES_SHEET_V3].some(function(name){
    var sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return false;
    return !!sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).createTextFinder(email).matchEntireCell(true).matchCase(false).findNext();
  });
  return found ? rematchAllUnifiedV3_().matched : 0;
}
function rematchAllPurchasesV3_() { return rematchAllUnifiedV3_(); }

// Copies a manual 'TEST' (typed into V3 Responses > Test Record) onto every Funnel Events row of that submission.
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
// Run once from the editor. Builds legacy-era Funnel Events from V3 Responses and the V3 Journey Events log.
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
  // Server facts from V3 Responses.
  vv.forEach(function(r,i){
    var o = {}; vh.forEach(function(h,j){ o[h] = r[j]; });
    var t = toDate_(o['Submitted UTC']) || toDate_(o['Date & Time']);
    var sid = String(o['Submission ID']||''), jid = String(o['Journey ID']||'');
    add('assessment_complete', t, 'server: assessment row saved (backfill)', sid, jid, o, {price:o['Recommended Price']}, i+2);
    if (o['Email']) add('email_captured', t, 'server: email saved with assessment (backfill)', sid, jid, o, {}, i+2);
  });
  // Browser events from the legacy journey log.
  var log = SpreadsheetApp.openById(V3_SHEET_ID).getSheetByName(V3_JOURNEY_LOG_SHEET);
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
var V3_EXEC_URL = 'https://script.google.com/macros/s/AKfycbzDtA92i-aQeyeuamBdA4LbxGUruh55qxSOk_nwLncBM3stllbZoaipxNzKb9xyTveLdA/exec';

function buildFunnelReportV3() {
  var ss = SpreadsheetApp.openById(V3_SHEET_ID);
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
    ['assessment_start','Yes','Browser: first question rendered (sent with Submission ID from 22 Oct 2026)','Funnel Events; V3 Responses > Canonical: Started At'],
    ['assessment_complete','Yes','Server: the assessment row was saved','Funnel Events; V3 Responses > Submitted UTC'],
    ['email_captured','Yes','Server: valid email saved with the assessment','Funnel Events; V3 Responses > Email'],
    ['result_view','Yes','Browser: result screen rendered after the save was confirmed','Funnel Events; V3 Responses > Canonical: Result Viewed At'],
    ['recommendation_view','Yes','Browser: recommendation panel rendered (Price Shown = the price the page displayed)','Funnel Events; V3 Responses > Canonical: Recommendation Viewed At'],
    ['recommendation_cta_click','Yes','Browser: the recommendation button was clicked on our site','Funnel Events; V3 Responses > Canonical: CTA Clicked At / Product Clicked / Price Shown'],
    ['outbound_stan_click','Yes (from 28 Oct 2026)','Browser: a button pointing at Stan was clicked on the result page. Does NOT prove Stan loaded and is never a purchase.','Funnel Events; V3 Responses > Canonical: Stan Click At'],
    ['complete_self_guided_click / reality_reset_click / pattern_break_click','Yes (from 28 Oct 2026)','Browser: a Complete choice (£117 / £147 / £197) in the result email was clicked; /assessment/choice/ records it and forwards to Stan. Click only, never a purchase.','Funnel Events; V3 Journey Events'],
    ['Stan checkout viewed / started / abandoned','NO (unknown)','Stan sends no checkout or abandonment signal on the current plan (no webhooks).','Not available'],
    ['sales_page_view','Yes (historical complete programme route)','Browser: /return-to-yourself-journey/ loaded with her journey ID','Funnel Events; V3 Responses > Canonical: Sales Page Viewed At'],
    ['outbound_payhip_click','Yes (historical)','Browser: a button pointing at Payhip was clicked. This does NOT prove Payhip loaded.','Funnel Events; V3 Responses > Canonical: Payhip Click At'],
    ['product_page_arrival (Payhip)','NO (per person)','Payhip sends no page-view signal we can join to a journey. Payhip pages carry GA4 G-0MFXQ5ETCD, so aggregate payhip.com page views exist in GA4 only.','GA4 (aggregate)'],
    ['checkout_start (Payhip)','NO','Payhip exposes no checkout-started event (its webhooks are paid, refunded, subscription created/deleted).','Not available'],
    ['purchase_return_view','Yes (historical Payhip complete programme only)','Browser: landed on /return-to-yourself-journey/welcome/ from Payhip\'s success redirect','Funnel Events; V3 Responses > Canonical: Returned From Payhip At'],
    ['purchase','Yes','Stan purchase confirmation email (current checkout; YMS Stan Purchase Sync, every 15 min) or Payhip paid webhook (historical). Never accepted from a browser or a click.','Stan Purchases; Payhip Purchases; Funnel Events; V3 Responses > Purchase columns'],
    ['refund','Yes (Payhip, from 22 Oct 2026)','Payhip refunded webhook','Payhip Purchases > Refund Status; Funnel Events'],
    ['',''],
    ['Matching purchases to assessments','','1) same email (lower-cased, trimmed), most recent assessment before the purchase. 2) Payhip only: her browser returned from Payhip within 60 min with her journey ID AND it was the only candidate. Otherwise listed on Unmatched Purchases. Nothing is guessed.',''],
    ['Test records','','Visit any YMS page with ?yms_test=1 to mark that browser as a test browser (?yms_test=0 clears). Also auto-flagged: emails containing test, yourmindstory, kacijv, scoring, or y@y.com. To flag one by hand, type TEST in V3 Responses > Test Record; the next sync copies it to Funnel Events. Nothing is deleted.',''],
    ['Pricing history','','Price Shown and purchase amounts are kept exactly as recorded at the time and are never rewritten. Segment with Funnel Report section 4 "Price shown".',''],
    ['',''],
    ['LEGACY fields (kept for history, not used for reporting from 22 Oct 2026)','','Recommendation CTA Clicked, Checkout Clicked, Checkout Clicked At, Primary CTA Clicked, Primary CTA Clicked At, Result Viewed At, Recommendation Shown At, Recommendation Reveal Clicked At, Bootcamp/Self-Guided/Bare Minimum Clicked (+At), Sales Page Viewed At, Checkout Screen columns, V3 Journey Events (raw log), V3 Sales Events. "Checkout Clicked" only ever meant an outbound click.',''],
    ['CANONICAL fields','','Funnel Events tab; V3 Responses columns starting "Canonical:"; Purchase Status / Purchased Product / Purchase Value / Purchase Date / Purchase Order ID / Purchase Match Method (recomputed from Stan Purchases + Payhip Purchases on every sync); Stan Purchases and Payhip Purchases tabs.','']
  ];
  rows = rows.map(function(x){ while (x.length < 4) x.push(''); return x; });
  g.getRange(1,1,rows.length,4).setValues(rows);
  g.getRange(1,1,1,4).setFontWeight('bold').setBackground('#eeeeee');
  g.setColumnWidth(1, 260); g.setColumnWidth(2, 170); g.setColumnWidth(3, 620); g.setColumnWidth(4, 380);
  g.getRange(1,1,rows.length,4).setWrap(true).setVerticalAlignment('top');
  return 'Funnel Report, Unmatched Purchases and Tracking Guide built.';
}

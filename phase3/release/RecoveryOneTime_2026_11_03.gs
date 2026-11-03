// ONE-TIME RECOVERY, 3 Nov 2026 (owner approved 20:46). Sends the missing personalised RESULTS email (approved V4 copy,
// with her saved-results link) to the six customers who completed V4 before the r8 fix. Nothing else.
// - Only these six submission IDs. Each must still be: not TEST, no results email recorded, provider 'pending',
//   no offer confirmed, stored route consistent with her stored scores. Otherwise she is skipped and reported.
// - No choice email (none of them confirmed an offer). Answers, recommendation and choices are not changed.
// - Marketing consent is not touched. Each send is claimed ('sending') before MailApp and recorded after.
// Run previewV4Recovery3Nov() first (sends nothing), then sendV4Recovery3Nov() once. Delete this file afterwards.
var V4_RECOVERY_3NOV_ = [
  'YMSV4-S-05b37b88-db8a-4d4f-a35f-54a82a1ced80', // 02:47
  'YMSV4-S-7da04b7a-582d-418b-b5a9-d2688e639df3', // 06:06
  'YMSV4-S-8c67c5f3-1db4-43e4-b8b2-bf94d2baef62', // 07:32
  'YMSV4-S-f212ba90-4bde-4dad-9972-7519a82f58cb', // 16:29
  'YMSV4-S-4486e596-484e-4fe7-abf4-d1298ef1b0c3', // 17:54
  'YMSV4-S-4ad183ea-d912-4456-a051-7c2572f99067'  // 20:11
];
function v4RecoveryCheck3Nov_(d) {
  if (String(d['Test Record']) === 'TEST') return 'TEST record';
  if (clean_(d['Result Email Sent'])) return 'results email already recorded as sent';
  if (clean_(d['Result Email Provider']) !== 'pending') return 'provider is ' + clean_(d['Result Email Provider']) + ', not pending';
  if (clean_(d['V4 Email Flow'])) return 'already handled by the new flow';
  if (clean_(d['V4 Decision Saved UTC'])) return 'she confirmed an offer (needs a different email)';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean_(d['Email']))) return 'email address not valid';
  if (!clean_(d['Result Token'])) return 'no saved-results token';
  var sc = ['Quiet Score','Break Score','Restore Score','Return Score'].map(function(k){ return Number(d[k]); });
  if (sc.some(isNaN)) return 'scores missing';
  var q = sc.filter(function(x){ return x >= 3; }).length;
  var exp = q >= 3 ? SERIES_NAME : q === 2 ? 'Two-Stage Pair' : q === 1 ? 'Single Stage' : 'Bare Minimum';
  if (String(d['Recommended Route']) !== exp) return 'stored route ' + d['Recommended Route'] + ' does not match her scores (' + exp + ')';
  return '';
}
function v4Recovery3Nov_(send) {
  var sh = getV3Sheet_(), out = [];
  if (send) {
    var quota = MailApp.getRemainingDailyQuota();
    if (quota < V4_RECOVERY_3NOV_.length + 2) { console.log('STOP: MailApp quota ' + quota); return [{stop:'quota ' + quota}]; }
  }
  V4_RECOVERY_3NOV_.forEach(function(sid){
    var lock = LockService.getScriptLock(); if (!lock.tryLock(30000)) { out.push({sid:sid, outcome:'skipped', reason:'busy'}); return; }
    var job = null, row = null, d = null, reason = '';
    try {
      row = findRowNumber_(sh, {submissionId:sid});
      if (!row) reason = 'row not found';
      else { d = rowObject_(sh, row); reason = v4RecoveryCheck3Nov_(d); }
      if (reason) { out.push({sid:sid, row:row, outcome:'skipped', reason:reason}); return; }
      var r = storedResultV4_(d), token = clean_(d['Result Token']);
      var info = {sid:sid, row:row, name:String(d['First Name']), route:r.route, product:r.product, price:r.price};
      if (!send) {
        var L = r.route === 'Bare Minimum' ? null : buildResultLetterV3_(clean_(d['First Name']), r, String(d['Journey ID']), sid, token, '');
        info.outcome = 'would send'; info.subject = L ? L.subject : 'Your Mind Story: your assessment result is ready';
        info.offers = L ? L.links.map(function(x){ return x.label + ' ' + x.url.split('?')[0] + (x.option ? '?o=' + x.option : ''); }) : [];
        info.savedResultsLink = L ? L.links.some(function(x){ return /resultToken=/.test(x.url); }) : null;
        out.push(info); return;
      }
      setByHeader_(sh, row, 'Result Email Provider', 'sending');
      setByHeader_(sh, row, 'Result Email Error', 'sending since ' + new Date().toISOString() + ' (recovery 3 Nov)');
      setByHeader_(sh, row, 'V4 Email Flow', V4_EMAIL_FLOW_IMMEDIATE_);
      SpreadsheetApp.flush();
      job = {kind:'result', sheet:sh, rowNumber:row, token:token, out:{}, result:r,
        customer:{email:String(d['Email']||''), firstName:String(d['First Name']||'')},
        journeyId:String(d['Journey ID']||''), submissionId:sid};
      out.push(info);
    } finally { lock.releaseLock(); }
    if (job) {
      var o = v4RunEmailJob_(job), last = out[out.length - 1];
      last.outcome = o.resultEmailSent ? 'sent' : 'failed'; last.provider = o.resultEmailProvider;
      last.sentAt = clean_(getByHeaderV3_(sh, job.rowNumber, 'Result Email Sent'));
    }
  });
  out.forEach(function(x){ console.log(JSON.stringify(x)); });
  return out;
}
function previewV4Recovery3Nov() { return v4Recovery3Nov_(false); }
function sendV4Recovery3Nov() { return v4Recovery3Nov_(true); }

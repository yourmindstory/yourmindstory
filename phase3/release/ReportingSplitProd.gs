/**
 * V4 reporting split — PRODUCTION run (owner decision 2 Nov 2026: "Move reporting formulas into a separate
 * workbook, preserving the original V4 data and testing the change in DEV first").
 *
 * Why: every write to V4 Responses / Funnel Events forces ~200 dashboard formulas over open-ended ranges to
 * recalculate inside the SAME workbook, so back-to-back submissions wait 18–26 s. Moving the dashboards into a
 * separate reporting workbook that reads the data through IMPORTRANGE takes that recalculation off the write path.
 *
 * Data is never moved or rewritten: the data tabs stay where they are; only the dashboard tabs are copied out,
 * checked value-for-value against the originals, and only then removed from the data workbook.
 *
 * PRODUCTION variant (owner release approval 3 Nov 2026, 00:13). Temporary file: added to the production project only
 * for the release run, then removed before the release version is created. No synthetic rows are written.
 */
var RS_DEV_DATA_ID_ = '1jO33mGOLAwxDuBxsEsJMsxW5ONa78rgjkMmlAqsZoGM';
var RS_DEV_DATA_TITLE_ = 'Your Mind Story V4 Assessment & Funnel Tracking';
var RS_REPORT_TITLE_ = 'Your Mind Story V4 Reporting (dashboards)';
// Tabs the backend writes to (never copied away, never deleted).
var RS_DATA_TABS_ = ['V4 Responses','Funnel Events','V4 Journey Events','V4 Sales Events','Stan Purchases','Payhip Purchases',
  'Payhip Sales','Unmatched Purchases','README','Experiments','V4 Email Copy','Tracking Guide','V4 DEV Email Log'];

function rsOpenDevData_() {
  var ss = SpreadsheetApp.openById(RS_DEV_DATA_ID_);
  if (ss.getName() !== RS_DEV_DATA_TITLE_) throw new Error('Refusing: not the production V4 workbook.');
  return ss;
}
function rsRefs_(formulas) {
  var refs = {};
  formulas.forEach(function(row){ row.forEach(function(f){
    if (!f) return;
    var re = /'([^']+)'!|\b([A-Za-z][A-Za-z0-9_]*)!/g, m;
    while ((m = re.exec(f))) refs[m[1] || m[2]] = true;
  }); });
  return Object.keys(refs);
}

// 1) Read-only audit: formula load per tab and which tabs each one reads.
function v4ReportingAudit() {
  var ss = rsOpenDevData_(), out = [];
  ss.getSheets().forEach(function(sh){
    var lr = sh.getLastRow(), lc = sh.getLastColumn(), f = (lr && lc) ? sh.getRange(1,1,lr,lc).getFormulas() : [];
    var n = 0; f.forEach(function(r){ r.forEach(function(x){ if (x) n++; }); });
    out.push({tab: sh.getName(), rows: lr, cols: lc, formulas: n, reads: rsRefs_(f), data: RS_DATA_TABS_.indexOf(sh.getName()) !== -1});
  });
  console.log(JSON.stringify(out));
  return out;
}

// 2) Build the reporting workbook: data mirrors via IMPORTRANGE + exact copies of every dashboard tab.
function v4ReportingBuildProd() {
  var src = rsOpenDevData_();
  var audit = v4ReportingAudit();
  var reportTabs = audit.filter(function(a){ return !a.data && a.formulas > 0; });
  var needed = {};
  reportTabs.forEach(function(a){ a.reads.forEach(function(t){ if (RS_DATA_TABS_.indexOf(t) !== -1) needed[t] = true; }); });
  var dst = SpreadsheetApp.create(RS_REPORT_TITLE_);
  var url = src.getUrl();
  Object.keys(needed).forEach(function(name){
    var s = src.getSheetByName(name);
    var lastCol = Math.max(s.getMaxColumns(), s.getLastColumn()) + 20;
    var colA1 = s.getRange(1, lastCol).getA1Notation().replace(/\d+$/, '');
    var m = dst.insertSheet(name);
    if (m.getMaxColumns() < lastCol) m.insertColumnsAfter(m.getMaxColumns(), lastCol - m.getMaxColumns());
    m.getRange('A1').setFormula('=IMPORTRANGE("' + url + '","\'' + name + '\'!A1:' + colA1 + '")');
    m.hideSheet();
  });
  // Copy each dashboard (formats, charts, static text), then re-apply formulas once every tab exists.
  reportTabs.forEach(function(a){
    var c = src.getSheetByName(a.tab).copyTo(dst);
    c.setName(a.tab);
  });
  reportTabs.forEach(function(a){
    var s = src.getSheetByName(a.tab), d = dst.getSheetByName(a.tab);
    var lr = s.getLastRow(), lc = s.getLastColumn(); if (!lr || !lc) return;
    var f = s.getRange(1,1,lr,lc).getFormulas(), v = s.getRange(1,1,lr,lc).getValues();
    var ARRAY = /ARRAYFORMULA|FILTER\(|QUERY\(|SORT\(|SORTN\(|UNIQUE\(|IMPORTRANGE|SEQUENCE\(|SPLIT\(|TRANSPOSE\(|FLATTEN\(|MAP\(|BYROW\(|BYCOL\(|MAKEARRAY\(|HSTACK\(|VSTACK\(|TOCOL\(|TOROW\(|CHOOSECOLS\(|CHOOSEROWS\(/i;
    var blank = function(r, c){ return r < lr && c < lc && !f[r][c] && v[r][c] !== '' && v[r][c] !== null; };
    // copyTo pasted the spilled results of array formulas as plain values; clear them so the arrays can expand.
    for (var r0 = 0; r0 < lr; r0++) for (var c0 = 0; c0 < lc; c0++) {
      if (!f[r0][c0] || !ARRAY.test(f[r0][c0])) continue;
      var w = 1; while (blank(r0, c0 + w)) w++;
      var h = 1; while (blank(r0 + h, c0)) h++;
      if (w > 1 || h > 1) {
        d.getRange(r0+1, c0+1, h, w).clearContent();
        for (var rr = r0; rr < r0 + h; rr++) for (var cc = c0; cc < c0 + w; cc++) v[rr][cc] = '';
      }
    }
    for (var r = 0; r < lr; r++) for (var c2 = 0; c2 < lc; c2++) if (f[r][c2]) d.getRange(r+1, c2+1).setFormula(f[r][c2]);
  });
  var first = dst.getSheets()[0]; if (first.getName() === 'Sheet1') dst.deleteSheet(first);
  PropertiesService.getScriptProperties().setProperty('V4_REPORTING_ID', dst.getId());
  console.log('Reporting workbook: ' + dst.getUrl() + ' tabs=' + JSON.stringify(reportTabs.map(function(a){return a.tab;})) + ' mirrors=' + JSON.stringify(Object.keys(needed)));
  return dst.getUrl();
}

// 3) Value-for-value check: every dashboard cell in the reporting workbook equals the original.
function v4ReportingCompareProd() {
  var src = rsOpenDevData_();
  var dst = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('V4_REPORTING_ID'));
  SpreadsheetApp.flush();
  var res = [];
  dst.getSheets().forEach(function(d){
    if (d.isSheetHidden()) return;
    var s = src.getSheetByName(d.getName()); if (!s) return;
    var lr = s.getLastRow(), lc = s.getLastColumn();
    var a = s.getRange(1,1,lr,lc).getDisplayValues(), b = d.getRange(1,1,lr,lc).getDisplayValues(), diffs = [];
    for (var r = 0; r < lr; r++) for (var c = 0; c < lc; c++) if (a[r][c] !== b[r][c]) diffs.push(d.getRange(r+1,c+1).getA1Notation()+': "'+a[r][c]+'" vs "'+b[r][c]+'"');
    res.push({tab: d.getName(), cells: lr*lc, diffs: diffs.length, sample: diffs.slice(0,5)});
  });
  console.log(JSON.stringify(res));
  return res;
}

// 5) Only after the comparison shows zero differences: remove the dashboard tabs from the DEV data workbook.
function v4ReportingRemoveFromDataWorkbook() {
  var src = rsOpenDevData_();
  var dst = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('V4_REPORTING_ID'));
  var cmp = v4ReportingCompareProd();
  var bad = cmp.filter(function(x){ return x.diffs > 0; });
  if (bad.length || cmp.length < 8) throw new Error('Refusing to remove dashboards: comparison not clean ' + JSON.stringify(bad));
  var removed = [];
  dst.getSheets().forEach(function(d){
    if (d.isSheetHidden()) return;
    var s = src.getSheetByName(d.getName());
    if (s && RS_DATA_TABS_.indexOf(s.getName()) === -1) { src.deleteSheet(s); removed.push(d.getName()); }
  });
  console.log('Removed from DEV data workbook: ' + JSON.stringify(removed));
  return removed;
}

// 3b) Repair: put back any plain (non-formula) cell the spill-clearing step removed, then compare again.
function v4ReportingRepairProd() {
  var src = rsOpenDevData_();
  var dst = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('V4_REPORTING_ID'));
  var fixed = [];
  dst.getSheets().forEach(function(d){
    if (RS_DATA_TABS_.indexOf(d.getName()) !== -1) return;
    var s = src.getSheetByName(d.getName()); if (!s) return;
    var lr = s.getLastRow(), lc = s.getLastColumn();
    var f = s.getRange(1,1,lr,lc).getFormulas(), v = s.getRange(1,1,lr,lc).getValues();
    var a = s.getRange(1,1,lr,lc).getDisplayValues(), b = d.getRange(1,1,lr,lc).getDisplayValues();
    for (var r = 0; r < lr; r++) for (var c = 0; c < lc; c++)
      if (!f[r][c] && a[r][c] !== b[r][c] && b[r][c] === '') { d.getRange(r+1,c+1).setValue(v[r][c]); fixed.push(d.getName()+'!'+d.getRange(r+1,c+1).getA1Notation()); }
  });
  // Mirror tabs stay hidden.
  dst.getSheets().forEach(function(d){ if (RS_DATA_TABS_.indexOf(d.getName()) !== -1 && !d.isSheetHidden()) d.hideSheet(); });
  console.log('Restored plain cells: ' + JSON.stringify(fixed));
  return v4ReportingCompareProd();
}

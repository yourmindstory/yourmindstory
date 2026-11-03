// In-memory Google Apps Script runtime for the YMS V4 backend. Synthetic data only.
'use strict';
const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');

const V4_RESPONSE_HEADERS = ['Date & Time','First Name','Email','Recommended Route','Recommended Product','What She Wants','Her Open Answer','Current Situation','Readiness','Source / Journey','Quiet Score','Break Score','Restore Score','Return Score','Total Score','Qualifying Stages','Breadth','Q1 Trigger Response','Q2 Time to Settle','Q3 Pull Behaviour','Q4 Attention Taken','Q5 Self-Trust','Q6 Stand By Decisions','Q7 Feel Like Self','Q8 Life Impact','Q9 Belief Position','Q10 Cycle Interruption','Q11 Relationship Context','Q12 Desired Outcome','Q13 What She Has Tried','Q14 Readiness Raw','Q15 Open Answer Raw','Marketing Consent','Recommendation CTA Clicked','Checkout Clicked','Purchase Status','Purchased Product','Purchase Value','Purchase Date','Day 0 Check-in','Day 7 Check-in','Day 14 Check-in','Day 21 Check-in','Journey ID','Submission ID','Assessment Version','GA Client ID','GA Session ID','First Touch Source','First Touch Medium','First Touch Campaign','Assessment Touch Source','Assessment Touch Medium','Assessment Touch Campaign','UTM Content','UTM Term','Referrer','Landing URL','Submission URL','Device / User Agent','Clarity Reference','Experiment Version','Submitted UTC','Submission Status','Result Token','Result Viewed At','Recommendation Shown At','Recommendation Reveal Clicked At','Final Route Shown','Final Recommendation','Primary CTA Clicked','Primary CTA Clicked At','Bootcamp Clicked','Bootcamp Clicked At','Self-Guided Alternative Clicked','Self-Guided Alternative Clicked At','Bare Minimum Clicked','Bare Minimum Clicked At','Checkout Clicked At','Result Email Sent','Result Email Provider','Result Email Error','Recommended Price','Recommendation Category','Test Record','Backend Build','Result Step Last Viewed','Sales Page Viewed At','Purchase Order ID','Purchase Currency','Purchase Match Method','Purchase Matches Recommendation','Source (Derived v2)','Sales Experiment','Sales Screens Reached','Sales Max Screen','Sales Screen History','Checkout Screen (First)','Checkout Screen History','Checkout Experiment','Last Journey Event','Last Journey Event At','Analytics Consent','Sales Page Entry','Canonical: Product Clicked','Canonical: Price Shown','Canonical: Furthest Stage','Canonical: Started At','Canonical: Result Viewed At','Canonical: Recommendation Viewed At','Canonical: CTA Clicked At','Canonical: Sales Page Viewed At','Canonical: Payhip Click At','Canonical: Returned From Payhip At','Canonical: Stan Click At','V4 Support Preference Question','V4 Support Preference Option ID','V4 Support Preference Answer','V4 Hesitation Question','V4 Hesitation Option ID','V4 Hesitation Answer','V4 Final Offer Shown','V4 Result Email Route','V4 Decision Saved UTC','V4 Assessment Build'];
const OTHER_TABS = {
  'V4 Journey Events':['Event Time (UK)','Event','Page','Status','Submission ID','Journey ID','Result Token','V4 Row','Step / Screen','Product','Route','CTA','Entry','Analytics Consent','Client Time'],
  'V4 Sales Events':['Event Time (UK)','Event','Submission ID','Journey ID','Result Token','Screen','Product','Price','Experiment','CTA','V4 Row','Entry'],
  'Funnel Events':['Event Time','Event Time (UK)','Event','Data Era','Evidence','Attempt Key','Submission ID','Journey ID','Email','Test','Source','UTM Source','UTM Medium','UTM Campaign','UTM Content','Landing Page','Route','Recommended Product','Product Clicked','Price Shown','Currency','Experiment','Assessment Version','Device','Destination','Order ID','Amount Paid','Dedupe Key','V4 Row','Recorded At'],
  'Stan Purchases':['Order Key','Order ID','Order Date (London)','Order UTC','Purchaser Email','Stan Product Title','Stan Page ID','Product (Canonical)','Product Type','Amount','Currency','Stan Referrer','Record Source','Test Record','Match Method','Matched Submission ID','Matched Journey ID','Matched Row','Assessment Date','Recommended Route','Recommended Product','Recommended Price','Matches Recommendation','Checkout Clicked','Checkout Clicked At','Source / Journey','Source (Derived v2)','First Touch Source','First Touch Medium','First Touch Campaign','Assessment Touch Source','Assessment Touch Medium','Assessment Touch Campaign','UTM Content','UTM Term','Recorded At'],
};

let sheetIdSeq = 1;
const OPS = { log: [], on: false };
function op(k, sheet) { if (OPS.on) OPS.log.push(k + ':' + sheet); }
class Sheet {
  constructor(name, headers) { this.name = name; this.id = sheetIdSeq++; this.rows = headers ? [headers.slice()] : []; this.maxCols = Math.max(26, headers ? headers.length : 0); this.writes = 0; }
  getName() { return this.name; } getSheetId() { return this.id; }
  getLastRow() { op('R', this.name); return this.rows.length; }
  getLastColumn() { return this.rows.reduce((m, r) => Math.max(m, r.length), 0); }
  getMaxColumns() { return this.maxCols; }
  insertColumnsAfter(after, n) { this.maxCols += n; }
  insertColumnAfter(after) { this.maxCols += 1; }
  setFrozenRows() { return this; }
  appendRow(vals) { op('W', this.name); this.writes++; this.rows.push(vals.slice()); return this; }
  cell(r, c) { const row = this.rows[r - 1]; return row && row[c - 1] !== undefined ? row[c - 1] : ''; }
  set(r, c, v) { this.writes++; while (this.rows.length < r) this.rows.push([]); const row = this.rows[r - 1]; while (row.length < c - 1) row.push(''); row[c - 1] = v; if (c > this.maxCols) this.maxCols = c; }
  getRange(r, c, nr, nc) {
    if (typeof r === 'string') throw new Error('A1 ranges not supported in mock: ' + r);
    return new Range(this, r, c, nr || 1, nc || 1);
  }
  getDataRange() { return new Range(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  clear() { this.rows = []; return this; }
}
class Range {
  constructor(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  getValues() { op('R', this.sh.name); const out = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(this.sh.cell(this.r + i, this.c + j)); out.push(row); } return out; }
  getValue() { op('R', this.sh.name); return this.sh.cell(this.r, this.c); }
  setValues(v) { op('W', this.sh.name); for (let i = 0; i < v.length; i++) for (let j = 0; j < v[i].length; j++) this.sh.set(this.r + i, this.c + j, v[i][j]); return this; }
  setValue(v) { op('W', this.sh.name); this.sh.set(this.r, this.c, v); return this; }
  getRow() { return this.r; } getColumn() { return this.c; }
  createTextFinder(text) {
    const self = this; let exact = false;
    const finder = {
      matchEntireCell(b) { exact = !!b; return finder; }, matchCase() { return finder; },
      findAll() { const hits = []; for (let i = 0; i < self.nr; i++) for (let j = 0; j < self.nc; j++) { const v = String(self.sh.cell(self.r + i, self.c + j)); if (exact ? v === String(text) : v.indexOf(String(text)) !== -1) hits.push(new Range(self.sh, self.r + i, self.c + j, 1, 1)); } return hits; },
      findNext() { return finder.findAll()[0] || null; }
    };
    return finder;
  }
  setFontWeight() { return this; } setNumberFormat() { return this; } setBackground() { return this; } setWrap() { return this; } setFontColor() { return this; } setFormula() { return this; } clearContent() { return this; }
}
class Spreadsheet {
  constructor(id, name) { this.id = id; this.name = name; this.sheets = {}; }
  getName() { return this.name; } getId() { return this.id; }
  getSheetByName(n) { return this.sheets[n] || null; }
  insertSheet(n) { this.sheets[n] = new Sheet(n, null); return this.sheets[n]; }
  getSheets() { return Object.values(this.sheets); }
}

function pad(n) { return String(n).padStart(2, '0'); }
function formatDate(d, tz, fmt) {
  const x = new Date(d.getTime() + (tz === 'Europe/London' ? 0 : 0));
  return fmt.replace("yyyy", x.getUTCFullYear()).replace('MM', pad(x.getUTCMonth() + 1)).replace('dd', pad(x.getUTCDate()))
    .replace('HH', pad(x.getUTCHours())).replace('mm', pad(x.getUTCMinutes())).replace('ss', pad(x.getUTCSeconds())).replace(/'/g, '');
}

function createRuntime(opts = {}) {
  const files = {};
  const devId = opts.sheetId || '1xl41dlFS0Z0dZ3p9yXrVxu7NJHdoE6da7nckKiEB42o';
  const ss = new Spreadsheet(devId, opts.title || 'YMS V4 DEV Assessment - Synthetic Only - 2026-11-02');
  ss.sheets['V4 Responses'] = new Sheet('V4 Responses', V4_RESPONSE_HEADERS);
  Object.keys(OTHER_TABS).forEach(k => ss.sheets[k] = new Sheet(k, OTHER_TABS[k]));
  const opened = [];
  const mail = { sent: [], quota: 100, failNext: 0, failAll: false };
  const props = Object.assign({}, opts.props || {});
  const ctx = {
    console: { log() {}, error() {}, warn() {} },
    SpreadsheetApp: {
      openById(id) { opened.push(id); if (id !== devId) throw new Error('MOCK: unexpected spreadsheet opened: ' + id); return ss; },
      flush() {}
    },
    LockService: { getScriptLock() { return { tryLock() { return true; }, releaseLock() {}, hasLock() { return false; }, waitLock() {} }; } },
    Utilities: { formatDate, getUuid: () => crypto.randomUUID(), sleep() {} },
    ContentService: { MimeType: { JSON: 'json', TEXT: 'text', CSV: 'csv' }, createTextOutput(c) { const o = { content: c, setMimeType() { return o; } }; return o; } },
    MailApp: {
      getRemainingDailyQuota() { return mail.quota; },
      sendEmail(m) { if (mail.failAll || mail.failNext > 0) { mail.failNext = Math.max(0, mail.failNext - 1); throw new Error('Simulated MailApp failure'); } mail.sent.push(m); }
    },
    PropertiesService: { getScriptProperties() { return { getProperty: k => props[k] == null ? null : props[k], setProperty: (k, v) => { props[k] = v; } }; } },
    CacheService: { getScriptCache() { return { get() { return null; }, put() {} }; } },
    UrlFetchApp: { fetch() { throw new Error('MOCK: UrlFetchApp must not be called in DEV'); } },
    Session: { getActiveUser() { return { getEmail() { return ''; } }; } },
    Date, JSON, Math, Object, Array, String, Number, RegExp, Error, isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
  };
  vm.createContext(ctx);
  let src = fs.readFileSync(opts.source, 'utf8');
  if (opts.patch) src = opts.patch(src);
  vm.runInContext(src, ctx, { filename: 'backend.gs' });
  const call = (fn, ...args) => ctx[fn](...args);
  return {
    ctx, ss, mail, props, opened,
    sheet: n => ss.sheets[n],
    post(body) { const out = ctx.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }); return JSON.parse(out.content); },
    get(params) { const out = ctx.doGet({ parameter: params }); try { return JSON.parse(out.content); } catch (e) { return out.content; } },
    rows() { const sh = ss.sheets['V4 Responses']; const h = sh.rows[0]; return sh.rows.slice(1).map(r => { const o = {}; h.forEach((k, i) => o[k] = r[i] === undefined ? '' : r[i]); return o; }); },
    call,
  };
}
module.exports = { createRuntime, V4_RESPONSE_HEADERS, OPS };

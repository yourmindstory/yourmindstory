/* ============================================================
   YMS Quiz 2026: shared analytics + attribution + storage helpers.
   Loaded on every funnel page (landing, quiz engine, result pages).

   Preserves all three tracking systems, as instructed:
     GA4:          G-0MFXQ5ETCD
     Meta Pixel:   1255763909834805
     MS Clarity:   xl81ev553e

   No PII (name, email, answer text, open response) is ever sent
   to any of the three. Custom events are all non-PII.
   ============================================================ */
(function (global) {
  "use strict";

  var GA4_ID = "G-0MFXQ5ETCD";
  var META_PIXEL_ID = "1255763909834805";
  var CLARITY_ID = "xl81ev553e";

  // ---------------- GA4 ----------------
  global.dataLayer = global.dataLayer || [];
  function gtag() { global.dataLayer.push(arguments); }
  global.gtag = global.gtag || gtag;
  (function () {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
  })();
  gtag('js', new Date());
  gtag('config', GA4_ID);

  // ---------------- Meta Pixel ----------------
  (function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0';
    n.queue = []; t = b.createElement(e); t.async = true;
    t.src = v; s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(global, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  global.fbq('init', META_PIXEL_ID);
  global.fbq('track', 'PageView');

  // ---------------- Microsoft Clarity ----------------
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(global, document, "clarity", "script", CLARITY_ID);

  // ---------------- unified non-PII event helper ----------------
  // params must never contain name, email, answer text, or open response.
  function track(eventName, params) {
    params = params || {};
    try { global.gtag('event', eventName, params); } catch (e) {}
    try { if (global.clarity) global.clarity('event', eventName); } catch (e) {}
  }

  // ---------------- attribution capture/persistence ----------------
  // Captured at first funnel entry (landing page, or quiz.html if a visitor
  // lands there directly) and persisted via sessionStorage so it survives
  // the landing -> quiz -> submission chain even if a later page's URL
  // no longer carries the query string.
  var ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var STORAGE_PREFIX = 'yms_quiz_';

  function captureAttribution() {
    var params = new URLSearchParams(window.location.search);
    var hasAnyUtm = ATTRIBUTION_KEYS.some(function (k) { return params.get(k); });

    if (hasAnyUtm) {
      ATTRIBUTION_KEYS.forEach(function (k) {
        sessionStorage.setItem(STORAGE_PREFIX + k, params.get(k) || '');
      });
      sessionStorage.setItem(STORAGE_PREFIX + 'landing_url', window.location.href);
      sessionStorage.setItem(STORAGE_PREFIX + 'landing_referrer', document.referrer || '');
    } else if (!sessionStorage.getItem(STORAGE_PREFIX + 'landing_url')) {
      // No UTMs on this visit and nothing captured yet this session,
      // still record the first-touch landing page/referrer.
      sessionStorage.setItem(STORAGE_PREFIX + 'landing_url', window.location.href);
      sessionStorage.setItem(STORAGE_PREFIX + 'landing_referrer', document.referrer || '');
    }
  }

  function getAttribution() {
    var out = { landingUrl: '', referrer: '' };
    ATTRIBUTION_KEYS.forEach(function (k) {
      out[k] = sessionStorage.getItem(STORAGE_PREFIX + k) || '';
    });
    out.landingUrl = sessionStorage.getItem(STORAGE_PREFIX + 'landing_url') || '';
    out.referrer = sessionStorage.getItem(STORAGE_PREFIX + 'landing_referrer') || '';
    return out;
  }

  // ---------------- result handoff (sessionStorage, never the URL) ----------------
  var RESULT_KEY = STORAGE_PREFIX + 'result';

  function setResultData(data) {
    try { sessionStorage.setItem(RESULT_KEY, JSON.stringify(data)); } catch (e) {}
  }
  function getResultData() {
    try {
      var raw = sessionStorage.getItem(RESULT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function clearResultData() {
    try { sessionStorage.removeItem(RESULT_KEY); } catch (e) {}
  }

  // ---------------- misc ----------------
  function escapeText(str) {
    var d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.textContent;
  }

  function generateId() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return 'sub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
  }

  // ---------------- marketing list opt-in (result pages) ----------------
  // DISCONNECTED (2 Sep 2026) at the account owner's request: this no
  // longer posts to Brevo (which used to trigger an automatic "you've
  // subscribed" email). The person's email is already recorded in the
  // Quiz Responses Google Sheet from their original quiz submission, so
  // no data is lost — the owner adds people to the waitlist manually.
  // BREVO_MAIN_URL left in place, unused, in case Brevo is reconnected.
  var BREVO_MAIN_URL = "https://43e2565f.sibforms.com/serve/MUIFAIWblR_RUb7wn9hjly_i7wFSsGhh02ZgRocHTBjICFz_efm8VWd2YamGfQgWCoFM6aXrq-DCC8l2kttjIYgrWD9YWr3fmZwaRyi9ITsdzxPijeXCz1YJi8pPh9z_dcDnfJo47NqeGui_WaytTVcRlmAefU_ikj-252xz3TieOB48_eFjZe_II8mfXf34G19vzpWnNFhF9a4n0Q==";
  function subscribeToMarketing(firstName, email) { // eslint-disable-line no-unused-vars
    if (!email) return;
    // Brevo POST intentionally disabled — see note above.
  }

  // Natural-language join for 2, 3, or 4 tied result names, used on the
  // mixed-result page instead of a hardcoded "both areas" (which would be
  // wrong for a 3-way or 4-way tie).
  function formatList(items) {
    items = (items || []).filter(Boolean);
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return items[0] + ' and ' + items[1];
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }

  global.YMSQuiz = {
    track: track,
    captureAttribution: captureAttribution,
    getAttribution: getAttribution,
    setResultData: setResultData,
    getResultData: getResultData,
    clearResultData: clearResultData,
    subscribeToMarketing: subscribeToMarketing,
    escapeText: escapeText,
    generateId: generateId,
    formatList: formatList
  };
})(window);

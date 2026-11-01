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

  // ---------------- consent-aware analytics ----------------
  global.dataLayer = global.dataLayer || [];
  function analyticsAllowed() {
    try { return global.localStorage.getItem('yms_analytics_consent') === 'yes'; } catch (e) { return false; }
  }
  function advertisingAllowed() {
    try { return global.localStorage.getItem('yms_ads_consent') === 'yes'; } catch (e) { return false; }
  }
  function gtag() {
    if (arguments[0] === 'event' && !analyticsAllowed()) return;
    global.dataLayer.push(arguments);
  }
  global.gtag = gtag;
  function loadTagScript(id, src) {
    if (document.querySelector('script[data-yms-tag="' + id + '"]')) return;
    var s = document.createElement('script');
    s.async = true; s.src = src; s.setAttribute('data-yms-tag', id);
    document.head.appendChild(s);
  }
  function ensureAnalyticsTags() {
    if (!analyticsAllowed()) return false;
    loadTagScript('ga4', 'https://www.googletagmanager.com/gtag/js?id=G-0MFXQ5ETCD');
    if (!global.__ymsGA4Configured) { global.__ymsGA4Configured = true; gtag('js', new Date()); gtag('config', 'G-0MFXQ5ETCD'); }
    if (!global.__ymsClarityLoaded) {
      global.__ymsClarityLoaded = true;
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
      })(global, document, "clarity", "script", "xl81ev553e");
      // The visitor has accepted analytics cookies (checked above), so tell Clarity. Without this,
      // Clarity runs cookieless and no Clarity session can be linked to an assessment.
      try { global.clarity('consent'); } catch (e) {}
    }
    if (advertisingAllowed() && !global.__ymsMetaLoaded) {
      global.__ymsMetaLoaded = true;
      (function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0';
        n.queue = []; t = b.createElement(e); t.async = true;
        t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      })(global, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      global.fbq('init', '1255763909834805');
      global.fbq('track', 'PageView');
    }
    return true;
  }
  function track(eventName, params) {
    if (!analyticsAllowed()) return;
    params = params || {};
    try { global.gtag('event', eventName, params); } catch (e) {}
    try { if (global.clarity) global.clarity('event', eventName); } catch (e) {}
  }

  // ---------------- person-level quiz journey logging ----------------
  // Writes post-result behaviour back to the existing V2 Responses row
  // using Result Token. This is separate from GA4/Clarity and may contain
  // the two readiness answer strings, but never sends name/email.
  var JOURNEY_BACKEND_URL = "https://script.google.com/macros/s/AKfycbwN0cFau2YiQ932ZvEjbCaiu1N-iJHMfJ7c3CY7abH8dsYCfyHne3-aRy5AwWh6WUOV/exec";

  function recordJourneyEvent(eventType, values) {
    if (!analyticsAllowed()) return false;
    var data = getResultData ? (getResultData() || {}) : {};
    var resultToken = data && data.resultToken ? String(data.resultToken).trim() : "";
    if (!resultToken || !eventType) return false;

    var body = JSON.stringify({
      action: "recordJourneyEvent",
      resultToken: resultToken,
      eventType: String(eventType),
      values: values || {}
    });

    try {
      if (global.navigator && typeof global.navigator.sendBeacon === "function") {
        var blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
        if (global.navigator.sendBeacon(JOURNEY_BACKEND_URL, blob)) return true;
      }
    } catch (e) {}

    try {
      fetch(JOURNEY_BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: body,
        keepalive: true
      }).catch(function () {});
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------------- attribution capture/persistence ----------------
  // Captured at first funnel entry (landing page, or /assessment if a visitor
  // lands there directly) and persisted via sessionStorage so it survives
  // the landing -> quiz -> submission chain even if a later page's URL
  // no longer carries the query string.
  var ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content'];
  var STORAGE_PREFIX = 'yms_quiz_';

  function captureAttribution() {
    if (!analyticsAllowed()) return { landingUrl: '', referrer: '' };
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

  // Earlier saved results may not have enough scoring data for a fresh route.
  // Show the currently available complete programme rather than an old offer.
  function mountCompleteProgramme(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML =
      '<div class="divider"></div>' +
      '<span class="og-label">YOUR NEXT STEP</span>' +
      '<p class="result-lede">Return to Yourself</p>' +
      '<p>The complete four-stage journey brings together Quiet the Alarm, Break the Pull, Restore Self-Trust and Return to You.</p>' +
      '<div class="cta-row"><a class="btn-cta" href="/return-to-yourself-journey/">EXPLORE THE COMPLETE JOURNEY</a></div>';
  }

  // ---------------- YMS-REC-2026-V1 recommendation router ----------------
  var QUIZ_BACKEND_URL_V1 = "https://script.google.com/macros/s/AKfycbwN0cFau2YiQ932ZvEjbCaiu1N-iJHMfJ7c3CY7abH8dsYCfyHne3-aRy5AwWh6WUOV/exec";
  var AUDIO_PRODUCTS_V1 = {
    'Quiet the Alarm': {url:'https://payhip.com/b/53N2B', description:'Your body is reacting to what happens, and once that alarm starts it can be difficult to fully settle again.'},
    'Break the Pull': {url:'https://payhip.com/b/N8hbz', description:"You keep getting pulled back into him or the situation: checking, texting, replaying, analysing, looking for signs or trying to understand what is happening."},
    'Restore Self Trust': {url:'https://payhip.com/b/3RlF7', description:'What happens with him is making it harder to trust your own read of things and the decisions you make for yourself.'},
    'Restore Self-Trust': {url:'https://payhip.com/b/3RlF7', description:'What happens with him is making it harder to trust your own read of things and the decisions you make for yourself.'},
    'Return to Yourself': {url:'https://payhip.com/b/6pE8S', description:"You have started losing connection with yourself, or parts of your own life, needs and priorities have moved into the background."}
  };

  function renderAudioRecommendationV1(container, stageName){
    var product=AUDIO_PRODUCTS_V1[stageName];
    if(!product){ container.innerHTML='<p class="result-lede">Your next step is '+escapeText(stageName||'the area your result identified')+'.</p>'; return; }
    container.innerHTML='<div class="divider"></div><span class="og-label">YOUR RECOMMENDED NEXT STEP</span><p class="result-lede" style="margin-top:0;">'+escapeText(stageName)+'</p><p>'+escapeText(product.description)+'</p><p>This is the guided Cognitive Behavioural Hypnotherapy audio I would start with based on your result.</p><div class="cta-row"><a class="btn-cta" href="'+product.url+'" id="ymsAudioRecommendationCta">START WITH '+escapeText(stageName).toUpperCase()+'</a></div>';
    var cta=document.getElementById('ymsAudioRecommendationCta');
    if(cta) cta.addEventListener('click',function(){track('quiz_audio_recommendation_click',{selected_stage:stageName});});
  }

  function recordMixedSelectionV1(data, selectedStage){
    if(!data || !data.resultToken) return;
    fetch(QUIZ_BACKEND_URL_V1,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'recordMixedSelection',resultToken:data.resultToken,selectedStage:selectedStage})}).catch(function(){});
  }

  function renderMixedClarificationV1(container, data){
    var tied=(data&&data.tiedResults)||[];
    var valid=tied.filter(function(n){return !!AUDIO_PRODUCTS_V1[n];});
    if(!valid.length){ mountCompleteProgramme(container.id); return; }
    var options=valid.map(function(name,i){return '<label class="fc-option" for="ymsMixed_'+i+'"><input type="radio" name="ymsMixedClarification" id="ymsMixed_'+i+'" value="'+i+'"><span class="fc-option-text"><strong>'+escapeText(name)+'</strong><br>'+escapeText(AUDIO_PRODUCTS_V1[name].description)+'</span><span class="fc-option-mark" aria-hidden="true"></span></label>';}).join('');
    container.innerHTML='<div class="divider"></div><span class="og-label">ONE QUICK QUESTION</span><p class="result-lede">Your scores are genuinely split between these areas. Rather than guess which one matters more to you, which is taking more from you right now?</p><div class="fc-options" id="ymsMixedOptions" role="radiogroup">'+options+'</div><div class="cta-row"><button type="button" class="btn-cta" id="ymsMixedContinue" disabled>CONTINUE</button></div>';
    var selected=null, btn=document.getElementById('ymsMixedContinue'), wrap=document.getElementById('ymsMixedOptions');
    wrap.addEventListener('change',function(e){ if(!e.target||e.target.type!=='radio')return; selected=valid[parseInt(e.target.value,10)]; Array.prototype.forEach.call(wrap.querySelectorAll('.fc-option'),function(el){el.classList.remove('selected');}); var label=e.target.closest('.fc-option'); if(label)label.classList.add('selected'); btn.disabled=!selected; });
    btn.addEventListener('click',function(){ if(!selected)return; data.recommendedStage=selected; data.mixedClarificationSelection=selected; data.mixedClarificationRequired=false; setResultData(data); track('quiz_mixed_clarification',{selected_stage:selected}); recordMixedSelectionV1(data,selected); renderAudioRecommendationV1(container,selected); });
  }

  function mountRecommendationV1(containerId,resultBucketKey){
    var container=document.getElementById(containerId); if(!container)return;
    var data=getResultData()||{}, level=data.recommendationLevel||'';
    if(!level){
      container.innerHTML='<div class="divider"></div><span class="og-label">YOUR UPDATED RESULT</span><p class="result-lede">I need the current quiz version to give you the right recommendation.</p><p>Your browser has carried over an older result session, so I will not guess which support level is right for you.</p><div class="cta-row"><a class="btn-cta" href="/assessment?v=20260910-rec2">RETAKE THE UPDATED QUIZ</a></div>';
      return;
    }
    if(level==='bare_minimum'){ container.innerHTML='<div class="divider"></div><span class="og-label">YOUR RECOMMENDED NEXT STEP</span><p class="result-lede">Start with The Bare Minimum.</p><div class="cta-row"><a class="btn-cta" href="https://payhip.com/b/ZcdmX">START WITH THE BARE MINIMUM</a></div>'; return; }
    if(level==='audio_first'){
      if(data.resultType==='mixed' && data.mixedClarificationRequired && !data.mixedClarificationSelection){ renderMixedClarificationV1(container,data); return; }
      renderAudioRecommendationV1(container,data.mixedClarificationSelection||data.recommendedStage||data.primaryResult||''); return;
    }
    mountCompleteProgramme(containerId,resultBucketKey);
  }

  global.YMSQuiz = {
    track: track,
    enableAnalytics: ensureAnalyticsTags,
    recordJourneyEvent: recordJourneyEvent,
    captureAttribution: captureAttribution,
    getAttribution: getAttribution,
    setResultData: setResultData,
    getResultData: getResultData,
    clearResultData: clearResultData,
    escapeText: escapeText,
    generateId: generateId,
    formatList: formatList,
    mountCompleteProgramme: mountCompleteProgramme,
    mountRecommendationV1: mountRecommendationV1
  };
  ensureAnalyticsTags();
})(window);

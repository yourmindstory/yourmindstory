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

  // ---------------- OG Bootcamp bridge (quiz result -> OG Bootcamp waitlist -> optional fit check) ----------------
  // Reuses the exact same "Bootcamp Waitlist Backend" Apps Script endpoint and
  // record shape as bootcamp-waitlist.html's own signup/fit-check forms (see
  // that page's script for the canonical implementation this mirrors). No new
  // backend/columns needed: type:'signup' already causes the sheet's
  // "Bootcamp Waitlist" column to be set TRUE by the existing Apps Script;
  // consentSource distinguishes a quiz-result-page signup from the main
  // waitlist page's. Name/email are carried over from the quiz submission
  // (YMSQuiz.getResultData()) — never re-asked.
  var OG_SHEET_CAPTURE_URL = "https://script.google.com/macros/s/AKfycbwCwn6-hXn9CgE74AyzYQWzSfPQgNSCSo6ULaccJKMgKWD_Hag51_A3k3_WOenAmw8b/exec";
  var OG_CONSENT_VERSION = "quiz-result-og-bootcamp-v1";
  var OG_CONSENT_TEXT = "Join the OG Bootcamp waitlist and I’ll send you the opening details by email. Unsubscribe anytime.";

  function ogPostToSheet(payload){
    return fetch(OG_SHEET_CAPTURE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function(res){ return res.json(); }).catch(function(err){
      console.warn('OG Bootcamp sheet capture failed (non-blocking):', err);
      return null;
    });
  }

  // Verbatim reuse of bootcamp-waitlist.html's five fit-check questions/options.
  var OG_FC_Q1_OPTIONS = [
    "I’m still in the relationship/dynamic.",
    "We’re in an on/off or unclear in-between.",
    "The relationship has ended, but I’m still mentally or emotionally caught in it.",
    "I’m mostly out of it, but I don’t want to repeat the same pattern again."
  ];
  var OG_FC_Q2_OPTIONS = [
    "The overthinking and replaying.",
    "Checking, waiting or looking for signs.",
    "The physical alarm or anxiety.",
    "Breaking my own boundaries when I’m pulled back in.",
    "Not trusting my own judgement anymore.",
    "Feeling like I’ve lost myself or my own life.",
    "Something else"
  ];
  var OG_FC_Q4_OPTIONS = [
    "I want help understanding myself, breaking the cycle and getting my mind back.",
    "I mainly want to understand him and what his behaviour means.",
    "I mainly want help getting him back or changing his behaviour.",
    "I’m not sure yet."
  ];
  var OG_FC_Q5_OPTIONS = [
    "Yes.",
    "I think so, but consistency is something I struggle with.",
    "I’m not sure.",
    "No."
  ];

  function mountOGBootcampBridge(containerId){
    var container = document.getElementById(containerId);
    if (!container) return;

    var data = getResultData();
    var firstName = data && data.firstName ? data.firstName.trim() : '';
    var email = data && data.email ? data.email.trim() : '';

    container.innerHTML =
      '<h2>You think you’re waiting for him to change. But really, you’re waiting for you.</h2>' +
      '<p>Waiting for you to trust what you already know. To stop overriding yourself. To stop going back on your own decisions every time he comes close, pulls away, gives you hope again — or even just crosses your mind.</p>' +
      '<p>Because knowing who he is hasn’t stopped you losing your time, your energy and too much of your life to this.</p>' +
      '<p>Inside the Your Mind Story Bootcamp, you stop waiting for yourself.</p>' +
      '<p>You choose you.</p>' +
      '<p>And yes — you fight for yourself like no one has ever fought for you before.</p>' +
      '<p>Because no one is coming.</p>' +
      '<p>It’s you. It’s been you this whole time.</p>' +
      '<p>So ask yourself:</p>' +
      '<p class="result-lede">Do you want to still be doing this in 2027?</p>' +
      '<p>If the answer is no, that’s what these 12 weeks are for.</p>' +
      '<p>Break the cycle. Take your life back.</p>' +
      '<div class="cta-row">' +
        '<button type="button" class="btn-cta" id="ogSignupBtn">I’M DONE WAITING FOR ME</button>' +
        '<span class="cta-microcopy" id="ogSignupMicrocopy">Join the OG Bootcamp waitlist and I’ll send you the opening details by email. Unsubscribe anytime.</span>' +
        '<div class="error-msg" id="ogSignupError" role="alert">Something went wrong saving your details — please try again.</div>' +
      '</div>';

    var signupBtn = document.getElementById('ogSignupBtn');
    var signupError = document.getElementById('ogSignupError');

    signupBtn.addEventListener('click', function(){
      signupError.classList.remove('show');
      signupBtn.disabled = true;
      signupBtn.textContent = 'Working...';

      ogPostToSheet({
        type: 'signup',
        firstName: firstName,
        email: email,
        consentSource: 'Quiz result page',
        consentVersion: OG_CONSENT_VERSION,
        consentText: OG_CONSENT_TEXT
      }).then(function(result){
        if (result && (result.status === 'ok' || result.status === 'duplicate')){
          track('og_bootcamp_waitlist_signup', {});
          showOGConfirmed();
        } else {
          signupBtn.disabled = false;
          signupBtn.textContent = "I’M DONE WAITING FOR ME";
          signupError.classList.add('show');
        }
      });
    });

    function showOGConfirmed(){
      container.innerHTML =
        '<p class="result-lede">You’re on the list.</p>' +
        '<p>I’ll send you the OG Bootcamp opening details by email.</p>' +
        '<p>Want to see whether the Bootcamp actually makes sense for where you are right now?</p>' +
        '<p>It takes about 2 minutes.</p>' +
        '<div class="cta-row">' +
          '<button type="button" class="btn-cta" id="ogFitCheckBtn">SEE IF THIS MAKES SENSE FOR ME</button>' +
        '</div>';
      document.getElementById('ogFitCheckBtn').addEventListener('click', function(){
        track('fit_check_start', {});
        mountOGFitCheck(container, email);
      });
    }
  }

  function mountOGFitCheck(container, email){
    container.innerHTML =
      '<h2 style="text-align:center;">OG Bootcamp Fit Check</h2>' +
      '<div class="fc-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="20" aria-label="Fit check progress" id="ogFcProgressTrack">' +
        '<div class="fc-progress-fill" id="ogFcProgressFill"></div>' +
      '</div>' +
      '<form id="ogFitcheckFormEl" novalidate>' +
        '<div class="fc-step active" data-fc-step="q1">' +
          '<div class="fc-label">Question 1 of 5</div>' +
          '<div class="fc-prompt">Where are you right now?</div>' +
          '<div class="fc-options" id="ogFcQ1Options" role="radiogroup" aria-label="Where are you right now?"></div>' +
          '<div class="error-msg" id="ogFcQ1Error" role="alert">Please choose one option to continue.</div>' +
          '<div class="fc-nav"><button type="button" class="btn-ghost" data-fc-action="back" disabled>Back</button><button type="button" class="btn-primary" data-fc-action="next">Continue</button></div>' +
        '</div>' +
        '<div class="fc-step" data-fc-step="q2">' +
          '<div class="fc-label">Question 2 of 5</div>' +
          '<div class="fc-prompt">What is taking the most from you right now?</div>' +
          '<div class="fc-hint">Choose up to two.</div>' +
          '<div class="fc-options" id="ogFcQ2Options" role="group" aria-label="What is taking the most from you right now? Choose up to two."></div>' +
          '<div class="fc-other-field" id="ogFcQ2OtherWrap"><label for="ogFcQ2Other" style="display:block;font-size:12.5px;font-weight:600;margin-bottom:8px;text-transform:uppercase;">Something else</label><input type="text" id="ogFcQ2Other" maxlength="140" class="fc-other-input"></div>' +
          '<div class="error-msg" id="ogFcQ2Error" role="alert">Please choose at least one option to continue.</div>' +
          '<div class="fc-nav"><button type="button" class="btn-ghost" data-fc-action="back">Back</button><button type="button" class="btn-primary" data-fc-action="next">Continue</button></div>' +
        '</div>' +
        '<div class="fc-step" data-fc-step="q3">' +
          '<div class="fc-label">Question 3 of 5</div>' +
          '<div class="fc-prompt">If this really worked for you, what would be different 12 weeks from now?</div>' +
          '<div class="field" style="margin-top:6px;"><textarea id="ogFcQ3" maxlength="1000" aria-label="If this really worked for you, what would be different 12 weeks from now?"></textarea></div>' +
          '<div class="error-msg" id="ogFcQ3Error" role="alert">Please share a few words before continuing.</div>' +
          '<div class="fc-nav"><button type="button" class="btn-ghost" data-fc-action="back">Back</button><button type="button" class="btn-primary" data-fc-action="next">Continue</button></div>' +
        '</div>' +
        '<div class="fc-step" data-fc-step="q4">' +
          '<div class="fc-label">Question 4 of 5</div>' +
          '<div class="fc-prompt">Which sounds closest to what you’re looking for?</div>' +
          '<div class="fc-options" id="ogFcQ4Options" role="radiogroup" aria-label="Which sounds closest to what you are looking for?"></div>' +
          '<div class="error-msg" id="ogFcQ4Error" role="alert">Please choose one option to continue.</div>' +
          '<div class="fc-nav"><button type="button" class="btn-ghost" data-fc-action="back">Back</button><button type="button" class="btn-primary" data-fc-action="next">Continue</button></div>' +
        '</div>' +
        '<div class="fc-step" data-fc-step="q5">' +
          '<div class="fc-label">Question 5 of 5</div>' +
          '<div class="fc-prompt">The Bootcamp is deliberately simple. Your main commitment is to press play daily, spend around 15 minutes once a week writing Your Mind Story, and complete a short check-in. Are you willing to make that commitment for 12 weeks?</div>' +
          '<div class="fc-options" id="ogFcQ5Options" role="radiogroup" aria-label="Are you willing to make that commitment for 12 weeks?"></div>' +
          '<div class="error-msg" id="ogFcQ5Error" role="alert">Please choose one option to continue.</div>' +
          '<div class="fc-nav"><button type="button" class="btn-ghost" data-fc-action="back">Back</button><button type="button" class="btn-primary" id="ogFcSubmitBtn" data-fc-action="submit">Submit My Answers</button></div>' +
          '<div class="form-status" id="ogFcStatus">Saving your answers...</div>' +
          '<div class="error-msg" id="ogFcRetryError" role="alert">Something went wrong saving your answers — please try again.</div>' +
        '</div>' +
      '</form>';

    var FC_STEP_ORDER = ['q1','q2','q3','q4','q5'];
    var fcIndex = 0;
    var fcAnswers = { q1:null, q2:[], q2Other:'', q3:'', q4:null, q5:null };

    function buildRadioOptions(containerEl, options, name, storeKey){
      options.forEach(function(text, i){
        var id = name + '_' + i;
        var opt = document.createElement('label');
        opt.className = 'fc-option';
        opt.setAttribute('for', id);
        opt.innerHTML = '<input type="radio" name="'+name+'" id="'+id+'" value="'+i+'"><span class="fc-option-text"></span><span class="fc-option-mark" aria-hidden="true"></span>';
        opt.querySelector('.fc-option-text').textContent = text;
        containerEl.appendChild(opt);
        opt.querySelector('input').addEventListener('change', function(){
          Array.prototype.forEach.call(containerEl.querySelectorAll('.fc-option'), function(o){ o.classList.remove('selected'); });
          opt.classList.add('selected');
          fcAnswers[storeKey] = text;
          clearFcError(storeKey);
        });
      });
    }

    function buildCheckboxOptions(containerEl, options, name, storeKey, maxCount, otherWrap, otherInput){
      options.forEach(function(text, i){
        var id = name + '_' + i;
        var isOther = /^something else$/i.test(text);
        var opt = document.createElement('label');
        opt.className = 'fc-option';
        opt.setAttribute('for', id);
        opt.innerHTML = '<input type="checkbox" name="'+name+'" id="'+id+'" value="'+i+'"><span class="fc-option-text"></span><span class="fc-option-mark" aria-hidden="true"></span>';
        opt.querySelector('.fc-option-text').textContent = text;
        containerEl.appendChild(opt);
        var input = opt.querySelector('input');
        input.addEventListener('change', function(){
          var checked = containerEl.querySelectorAll('input:checked');
          if (checked.length > maxCount){ input.checked = false; return; }
          opt.classList.toggle('selected', input.checked);
          if (isOther){
            if (otherWrap){ otherWrap.classList.toggle('show', input.checked); }
            if (!input.checked && otherInput){ otherInput.value = ''; }
          }
          var selectedTexts = [];
          Array.prototype.forEach.call(containerEl.querySelectorAll('input:checked'), function(cb){
            selectedTexts.push(options[parseInt(cb.value,10)]);
          });
          fcAnswers[storeKey] = selectedTexts;
          clearFcError(storeKey);
        });
      });
    }

    function clearFcError(key){
      var el = document.getElementById('ogFc' + key.charAt(0).toUpperCase() + key.slice(1).replace('Other','') + 'Error');
      if (el){ el.classList.remove('show'); }
    }

    buildRadioOptions(document.getElementById('ogFcQ1Options'), OG_FC_Q1_OPTIONS, 'ogfcq1', 'q1');
    buildCheckboxOptions(document.getElementById('ogFcQ2Options'), OG_FC_Q2_OPTIONS, 'ogfcq2', 'q2', 2, document.getElementById('ogFcQ2OtherWrap'), document.getElementById('ogFcQ2Other'));
    buildRadioOptions(document.getElementById('ogFcQ4Options'), OG_FC_Q4_OPTIONS, 'ogfcq4', 'q4');
    buildRadioOptions(document.getElementById('ogFcQ5Options'), OG_FC_Q5_OPTIONS, 'ogfcq5', 'q5');

    var fcQ3El = document.getElementById('ogFcQ3');
    fcQ3El.addEventListener('input', function(){
      fcAnswers.q3 = fcQ3El.value;
      document.getElementById('ogFcQ3Error').classList.remove('show');
    });
    var fcQ2OtherEl = document.getElementById('ogFcQ2Other');
    fcQ2OtherEl.addEventListener('input', function(){ fcAnswers.q2Other = fcQ2OtherEl.value; });

    function fcValidateStep(stepId){
      if (stepId === 'q1'){ return !!fcAnswers.q1; }
      if (stepId === 'q2'){ return fcAnswers.q2.length > 0; }
      if (stepId === 'q3'){ return fcAnswers.q3.trim().length > 0; }
      if (stepId === 'q4'){ return !!fcAnswers.q4; }
      if (stepId === 'q5'){ return !!fcAnswers.q5; }
      return true;
    }
    var FC_ERROR_IDS = { q1:'ogFcQ1Error', q2:'ogFcQ2Error', q3:'ogFcQ3Error', q4:'ogFcQ4Error', q5:'ogFcQ5Error' };

    function fcGoTo(index){
      fcIndex = index;
      var stepId = FC_STEP_ORDER[index];
      Array.prototype.forEach.call(container.querySelectorAll('.fc-step'), function(s){
        s.classList.toggle('active', s.getAttribute('data-fc-step') === stepId);
      });
      var pct = Math.round(((index+1) / FC_STEP_ORDER.length) * 100);
      document.getElementById('ogFcProgressFill').style.width = pct + '%';
      document.getElementById('ogFcProgressTrack').setAttribute('aria-valuenow', String(pct));
      var backBtn = container.querySelector('.fc-step.active .btn-ghost');
      if (backBtn){ backBtn.disabled = (index === 0); }
    }

    document.getElementById('ogFitcheckFormEl').addEventListener('click', function(e){
      var btn = e.target.closest('[data-fc-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-fc-action');
      var stepId = FC_STEP_ORDER[fcIndex];

      if (action === 'back'){
        if (fcIndex > 0){ fcGoTo(fcIndex - 1); }
        return;
      }
      if (action === 'next'){
        if (!fcValidateStep(stepId)){
          var errEl = document.getElementById(FC_ERROR_IDS[stepId]);
          if (errEl){ errEl.classList.add('show'); }
          return;
        }
        if (fcIndex < FC_STEP_ORDER.length - 1){ fcGoTo(fcIndex + 1); }
        return;
      }
      if (action === 'submit'){
        if (!fcValidateStep('q5')){
          document.getElementById('ogFcQ5Error').classList.add('show');
          return;
        }
        submitOGFitCheck();
      }
    });

    function submitOGFitCheck(){
      var submitBtn = document.getElementById('ogFcSubmitBtn');
      var status = document.getElementById('ogFcStatus');
      var retryError = document.getElementById('ogFcRetryError');
      submitBtn.disabled = true;
      status.classList.add('show');
      retryError.classList.remove('show');

      var q2Text = fcAnswers.q2.map(function(t){
        return /^something else$/i.test(t) && fcAnswers.q2Other ? (t + ': ' + fcAnswers.q2Other) : t;
      }).join(' | ');

      ogPostToSheet({
        type: 'fitcheck',
        email: email,
        q1: fcAnswers.q1 || '',
        q2: q2Text,
        q3: fcAnswers.q3 || '',
        q4: fcAnswers.q4 || '',
        q5: fcAnswers.q5 || ''
      }).then(function(result){
        status.classList.remove('show');
        if (result && result.status === 'ok'){
          track('fit_check_submit', {});
          container.innerHTML =
            '<p class="result-lede">Thank you. I’ve got it.</p>' +
            '<p>I’ll use your answers to make sure the OG Bootcamp is the right fit for where you are.</p>' +
            '<p>You’ll hear from me first when places open.</p>';
        } else {
          submitBtn.disabled = false;
          retryError.classList.add('show');
        }
      });
    }

    fcGoTo(0);
  }

  global.YMSQuiz = {
    track: track,
    captureAttribution: captureAttribution,
    getAttribution: getAttribution,
    setResultData: setResultData,
    getResultData: getResultData,
    clearResultData: clearResultData,
    escapeText: escapeText,
    generateId: generateId,
    formatList: formatList,
    mountOGBootcampBridge: mountOGBootcampBridge
  };
})(window);

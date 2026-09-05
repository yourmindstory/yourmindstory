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
  var OG_CONSENT_VERSION = "quiz-result-og-bootcamp-v4";
  var OG_CONSENT_TEXT = "I’ll email you when Original Group places open.";

  // Result-specific opening used at the top of the Bootcamp recommendation
  // section on each of the 4 single-result pages (added 5 Sep 2026 Bootcamp
  // conversion update). Keyed by the bucket slug each result page passes to
  // mountOGBootcampBridge as its second argument.
  var OG_RESULT_OPENINGS = {
    'quiet-the-alarm': [
      'Your results suggest Quiet the Alarm is where you need the most support right now.',
      'You can understand what’s happening and still feel the physical jolt, dread or hours of being on edge when something changes between you.',
      'Knowing why it’s happening doesn’t necessarily stop your mind and body reacting when it happens.'
    ],
    'break-the-pull': [
      'Your results suggest Break the Pull is where you need the most support right now.',
      'You can decide not to check, text, replay it or look for another sign from him and still find yourself pulled back into it.',
      'You know what you said you were going to do. The problem is sticking to it when the pull actually hits.'
    ],
    'restore-self-trust': [
      'Your results suggest Restore Self-Trust is where you need the most support right now.',
      'You can know something isn’t working for you and still question your own judgement, change your mind or look outside yourself for the answer.',
      'After enough uncertainty, even decisions that used to feel obvious can become difficult to trust.'
    ],
    'return-to-yourself': [
      'Your results suggest Return to Yourself is where you need the most support right now.',
      'So much of your attention can end up going into what he feels, what he meant and what he might do next that your own plans, goals and life keep getting pushed further down the list.',
      'The work now is putting you back in the centre of your own life.'
    ],
    // Used when no single bucket applies (e.g. a mixed/tied result) rather
    // than defaulting to any one named result, which would misstate it.
    '_default': [
      'Your results suggest more than one part of the cycle is active for you right now.',
      'You can know why he withdraws, recognise the pattern, and still find yourself pulled back into it, on edge about it, or doubting your own read of it.',
      'That’s the part that needs support next.'
    ]
  };

  // The 4 Bootcamp steps, always in this order and always called "steps"
  // (never stages, phases or modules).
  var OG_STEPS = [
    { label: 'Step 1 — Quiet the Alarm', desc: 'Work with the alarm and automatic response.' },
    { label: 'Step 2 — Break the Pull', desc: 'Work on the checking, replaying, waiting and pull back towards the cycle.' },
    { label: 'Step 3 — Restore Self-Trust', desc: 'Start relying on your own judgement again.' },
    { label: 'Step 4 — Return to Yourself', desc: 'Bring your attention, choices and life back to you.' }
  ];

  // The backend occasionally hangs or briefly errors on the first attempt
  // (Apps Script cold start / concurrent-request contention). A capped
  // timeout plus a single automatic retry clears this in practice without
  // making a genuinely broken submission wait forever.
  function ogPostToSheet(payload, isRetry){
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function(){ controller.abort(); }, 12000) : null;

    return fetch(OG_SHEET_CAPTURE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    }).then(function(res){
      if (timeoutId) clearTimeout(timeoutId);
      return res.json();
    }).catch(function(err){
      if (timeoutId) clearTimeout(timeoutId);
      if (!isRetry){
        console.warn('OG Bootcamp sheet capture failed once, retrying:', err);
        return new Promise(function(resolve){
          setTimeout(function(){ resolve(ogPostToSheet(payload, true)); }, 1000);
        });
      }
      console.warn('OG Bootcamp sheet capture failed twice (non-blocking):', err);
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

  function mountOGBootcampBridge(containerId, resultBucketKey){
    var container = document.getElementById(containerId);
    if (!container) return;

    var data = getResultData();
    var firstName = data && data.firstName ? data.firstName.trim() : '';
    var email = data && data.email ? data.email.trim() : '';

    var opening = OG_RESULT_OPENINGS[resultBucketKey] || OG_RESULT_OPENINGS['_default'];
    var openingHtml = opening.map(function(p, i){
      return '<p' + (i === 0 ? ' class="result-lede"' : '') + '>' + p + '</p>';
    }).join('');

    var stepsHtml = OG_STEPS.map(function(s){
      return '<li><span class="og-step-label">' + s.label + '</span><span class="og-step-desc">' + s.desc + '</span></li>';
    }).join('');

    container.innerHTML =
      // Visual break from the locked result copy above, then the
      // personalised opening into the Bootcamp recommendation.
      '<div class="divider"></div>' +
      openingHtml +

      '<div class="divider"></div>' +

      // Short knowing/changing bridge -- kept deliberately brief. The full
      // "why" and the 4 steps live in the one expandable section below, not
      // here, so the price and CTA stay visible sooner.
      '<span class="og-label">SO WHAT DO YOU DO WITH THIS RESULT?</span>' +
      '<p>Understanding the cycle isn’t the same as breaking it.</p>' +
      '<p>That’s the part we work on inside the Your Mind Story Bootcamp.</p>' +
      '<p>You do not have to decide whether to stay with him or leave him.</p>' +
      '<p>You can still love him.</p>' +
      '<p>You can still want it to work.</p>' +
      '<p>The focus is you.</p>' +

      '<div class="divider"></div>' +

      // Concise Bootcamp offer -- name and one-line promise only, no step
      // list here (moved into the accordion).
      '<span class="og-label">YOUR MIND STORY BOOTCAMP</span>' +
      '<p class="result-lede" style="margin-top:0;">Break the cycle. Take your life back.</p>' +
      '<p>12 weeks. 4 steps. One goal: get your mind back.</p>' +

      // Price, displayed clearly and visibly, never inside the accordion.
      '<div class="price-card">' +
        '<span class="og-label" style="margin-bottom:6px;">Original Group &bull; 2026</span>' +
        '<p class="price-start">Starts Sunday 4 October</p>' +
        '<p class="price-figure">£297 <span class="price-unit">in full</span></p>' +
        '<p class="price-or">or</p>' +
        '<p class="price-installments">3 monthly payments of £105</p>' +
        '<p class="price-note">Standard Bootcamp price after the Original Group: £399</p>' +
      '</div>' +

      // One clear next action, never inside the accordion.
      '<div class="cta-row">' +
        '<button type="button" class="btn-cta" id="ogSignupBtn">SEND ME THE OPENING DETAILS</button>' +
        '<span class="cta-microcopy" id="ogSignupMicrocopy">' + OG_CONSENT_TEXT + '</span>' +
        '<div class="error-msg" id="ogSignupError" role="alert">Something went wrong saving your details. Please try again.</div>' +
      '</div>' +

      // The one optional expandable section -- closed by default, holds the
      // 4-step breakdown and the daily/weekly commitment detail.
      '<div class="og-accordion">' +
        '<button type="button" class="og-accordion-toggle" id="ogAccordionBtn" aria-expanded="false" aria-controls="ogAccordionPanel">' +
          '<span id="ogAccordionLabel">SEE EXACTLY HOW THE BOOTCAMP WORKS ↓</span>' +
        '</button>' +
        '<div class="og-accordion-panel" id="ogAccordionPanel" inert>' +
          '<div class="og-accordion-panel-inner">' +
            '<div class="og-accordion-content">' +
              '<span class="og-label">THE 4 STEPS</span>' +
              '<ul class="og-steps">' + stepsHtml + '</ul>' +
              '<span class="og-label">WHAT DO I ACTUALLY HAVE TO DO?</span>' +
              '<p>I have deliberately kept this simple.</p>' +
              '<p>Your main daily job is to press play.</p>' +
              '<p>You’ll use guided Cognitive Behavioural Hypnotherapy throughout each step.</p>' +
              '<p>Once a week, you’ll spend around 15 minutes writing one part of Your Mind Story.</p>' +
              '<p>You’ll complete a short weekly check-in so you can see what is changing.</p>' +
              '<p>At the end of each 3-week step, we come together for a group integration call.</p>' +
              '<p>No pile of worksheets. No hours of videos about him. No daily journalling.</p>' +
              '<p><strong>Press play. Write Your Mind Story. Check in. Keep going.</strong></p>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var accordionBtn = document.getElementById('ogAccordionBtn');
    var accordionPanel = document.getElementById('ogAccordionPanel');
    var accordionLabel = document.getElementById('ogAccordionLabel');
    accordionBtn.addEventListener('click', function(){
      var isOpen = accordionBtn.getAttribute('aria-expanded') === 'true';
      accordionBtn.setAttribute('aria-expanded', String(!isOpen));
      accordionPanel.classList.toggle('open', !isOpen);
      if (isOpen){
        accordionPanel.setAttribute('inert', '');
        accordionLabel.textContent = 'SEE EXACTLY HOW THE BOOTCAMP WORKS ↓';
      } else {
        accordionPanel.removeAttribute('inert');
        accordionLabel.textContent = 'HIDE HOW THE BOOTCAMP WORKS ↑';
      }
    });

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
          signupBtn.textContent = 'SEND ME THE OPENING DETAILS';
          signupError.classList.add('show');
        }
      });
    });

    // Confirmation is immediate and unconditional -- the waitlist signup is
    // already complete at this point. The 5-question fit check below is an
    // entirely optional, visually secondary follow-up: it never gates the
    // confirmation and is never labelled as a required next step.
    function showOGConfirmed(){
      container.innerHTML =
        '<p class="result-lede">You’re on the list. 💜 I’ll email you when Original Group places open.</p>' +
        '<div class="og-secondary">' +
          '<p>Want me to understand what you’re dealing with before then? These 5 quick questions help me understand where you are, what you want help with and whether the Bootcamp looks like the right kind of support for you.</p>' +
          '<p class="og-secondary-note">Optional. You’re already on the waitlist.</p>' +
          '<button type="button" class="btn-ghost" id="ogFitCheckBtn">ANSWER THE 5 QUESTIONS</button>' +
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
          '<div class="error-msg" id="ogFcRetryError" role="alert">Something went wrong saving your answers. Please try again.</div>' +
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

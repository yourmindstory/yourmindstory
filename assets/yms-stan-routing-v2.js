/* Your Mind Story quiz -> Stan Store routing V2.
   16 Sep 2026.
   Preserves quiz questions/scoring. Changes recommendation routing only.

   Routing contract:
   - 0 active stages -> Calm the Spiral
   - 1 active stage  -> matching standalone audio
   - 2 active stages -> exact fixed pair, worked in programme order
   - 3-4 active stages -> Complete Four-Stage Self-Guided
   - Bootcamp remains a secondary supported option, not the default 3-4 stage route.

   A stage is active when the existing locked V2 activation is not "lower".
   The Apps Script result record is used as the authoritative source for
   leadingPatterns + secondaryActivePatterns when available.

   IMPORTANT: unverified Stan URLs are intentionally blank. Never invent a
   checkout URL. This file is being staged on a non-live branch until the
   seven product links are verified.
*/
(function (global) {
  'use strict';

  var Y = global.YMSQuiz;
  if (!Y || !Y.mountRecommendationV1) return;

  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwN0cFau2YiQ932ZvEjbCaiu1N-iJHMfJ7c3CY7abH8dsYCfyHne3-aRy5AwWh6WUOV/exec';
  var previousMountRecommendation = Y.mountRecommendationV1;

  var STAGE_ORDER = [
    'Quiet the Alarm',
    'Break the Pull',
    'Restore Self-Trust',
    'Return to Yourself'
  ];

  var STANDALONE_URLS = {
    'Quiet the Alarm': 'https://stan.store/YourMindStory/p/quiet-the-alarm',
    'Break the Pull': 'https://stan.store/YourMindStory/p/break-the-pull',
    'Restore Self-Trust': 'https://stan.store/YourMindStory/p/restore-self-trust',
    'Return to Yourself': 'https://stan.store/YourMindStory/p/return-to-yourself-7jc9h8lg'
  };

  var PRODUCT_URLS = {
    calmTheSpiral: '',
    selfGuidedFourStage: '',
    bootcamp: '',
    pairs: {
      'Quiet the Alarm|Break the Pull': '',
      'Quiet the Alarm|Restore Self-Trust': '',
      'Quiet the Alarm|Return to Yourself': '',
      'Break the Pull|Restore Self-Trust': '',
      'Break the Pull|Return to Yourself': '',
      'Restore Self-Trust|Return to Yourself': ''
    }
  };

  function canonicalStage(name) {
    if (name === 'Restore Self Trust') return 'Restore Self-Trust';
    return name || '';
  }

  function uniqueOrderedStages(items) {
    var seen = {};
    (items || []).forEach(function (name) {
      name = canonicalStage(name);
      if (STAGE_ORDER.indexOf(name) !== -1) seen[name] = true;
    });
    return STAGE_ORDER.filter(function (name) { return !!seen[name]; });
  }

  function activeStagesFromRecord(record) {
    if (!record) return [];
    return uniqueOrderedStages(
      (record.leadingPatterns || [])
        .concat(record.secondaryActivePatterns || [])
        .concat(record.activeStages || [])
    );
  }

  function fallbackStagesFromSession(data) {
    if (!data) return [];
    var items = [];
    if (data.primaryResult) items.push(data.primaryResult);
    items = items.concat(data.tiedResults || []);
    items = items.concat(data.leadingPatterns || []);
    items = items.concat(data.secondaryActivePatterns || []);
    return uniqueOrderedStages(items);
  }

  function routeForStages(stages) {
    stages = uniqueOrderedStages(stages);
    if (stages.length === 0) return { type: 'calm', stages: [] };
    if (stages.length === 1) return { type: 'single', stages: stages };
    if (stages.length === 2) return { type: 'pair', stages: stages, key: stages.join('|') };
    return { type: 'self_guided', stages: stages };
  }

  function escapeHtml(value) {
    return Y.escapeText ? Y.escapeText(value) : String(value || '');
  }

  function disabledCta(label) {
    return '<div class="cta-row"><span class="btn-cta" aria-disabled="true" style="opacity:.55;cursor:not-allowed;">' + escapeHtml(label) + '</span></div>' +
      '<p class="cta-microcopy">Checkout link is being connected. This staged branch will not be made live until the verified Stan URL is added.</p>';
  }

  function liveCta(url, label, id) {
    return '<div class="cta-row"><a class="btn-cta" href="' + url + '" id="' + id + '">' + escapeHtml(label) + '</a></div>';
  }

  function bootcampSecondaryHtml() {
    var url = PRODUCT_URLS.bootcamp;
    var cta = url
      ? liveCta(url, 'CHOOSE THE SUPPORTED BOOTCAMP', 'ymsStanBootcampSecondary')
      : '<p class="cta-microcopy">The supported Bootcamp remains available as the higher-support option. Its verified Stan checkout link still needs connecting before this branch goes live.</p>';
    return '<div class="divider"></div>' +
      '<span class="og-label">WANT SUPPORT WITH THE WORK?</span>' +
      '<p>The £297 Your Mind Story Bootcamp is the supported option. The self-guided route is still the recommendation when your quiz identifies three or four active stages; the Bootcamp adds the structure and live support around that work.</p>' + cta;
  }

  function renderCalm(container) {
    var url = PRODUCT_URLS.calmTheSpiral;
    container.innerHTML =
      '<div class="divider"></div>' +
      '<span class="og-label">YOUR RECOMMENDED NEXT STEP</span>' +
      '<p class="result-lede" style="margin-top:0;">Start with Calm the Spiral.</p>' +
      '<p>Your quiz is not showing one of the four core stages strongly enough to send you into the full pathway. Start with the immediate reset rather than buying more than you need.</p>' +
      (url ? liveCta(url, 'START WITH CALM THE SPIRAL', 'ymsStanCalmCta') : disabledCta('START WITH CALM THE SPIRAL'));
  }

  function renderPair(container, stages) {
    var first = stages[0];
    var second = stages[1];
    var key = stages.join('|');
    var url = PRODUCT_URLS.pairs[key] || '';

    container.innerHTML =
      '<div class="divider"></div>' +
      '<span class="og-label">YOUR RECOMMENDED NEXT STEP</span>' +
      '<p class="result-lede" style="margin-top:0;">Your quiz identified two parts of the cycle to work on.</p>' +
      '<p><strong>' + escapeHtml(first) + '</strong> and <strong>' + escapeHtml(second) + '</strong> are both included in your £74 two-stage pathway.</p>' +
      '<p>You do not do both at once.</p>' +
      '<ol class="og-steps">' +
        '<li><span class="og-step-label">Start with ' + escapeHtml(first) + '</span><span class="og-step-desc">Use this first for 21 days, then complete the check-in.</span></li>' +
        '<li><span class="og-step-label">Then move to ' + escapeHtml(second) + '</span><span class="og-step-desc">Use the second stage for the next 21 days.</span></li>' +
      '</ol>' +
      '<p>The order is prescribed by the pathway. You are not being asked to choose which one matters more.</p>' +
      (url ? liveCta(url, 'START MY TWO-STAGE PATHWAY', 'ymsStanPairCta') : disabledCta('START MY TWO-STAGE PATHWAY')) +
      bootcampSecondaryHtml();
  }

  function renderSelfGuided(container, stages) {
    var url = PRODUCT_URLS.selfGuidedFourStage;
    container.innerHTML =
      '<div class="divider"></div>' +
      '<span class="og-label">YOUR RECOMMENDED NEXT STEP</span>' +
      '<p class="result-lede" style="margin-top:0;">I recommend the Complete Four-Stage Self-Guided pathway.</p>' +
      '<p>Your quiz identified ' + stages.length + ' active stages. Rather than selling you separate audios or making you choose between them, the £117 self-guided pathway gives you the complete sequence.</p>' +
      '<ol class="og-steps">' +
        '<li><span class="og-step-label">Step 1 — Quiet the Alarm</span></li>' +
        '<li><span class="og-step-label">Step 2 — Break the Pull</span></li>' +
        '<li><span class="og-step-label">Step 3 — Restore Self-Trust</span></li>' +
        '<li><span class="og-step-label">Step 4 — Return to Yourself</span></li>' +
      '</ol>' +
      '<p>This is the self-guided version: the four core audios and check-ins, without live group support or the Reset Series.</p>' +
      (url ? liveCta(url, 'START THE COMPLETE SELF-GUIDED PATHWAY', 'ymsStanSelfGuidedCta') : disabledCta('START THE COMPLETE SELF-GUIDED PATHWAY')) +
      bootcampSecondaryHtml();
  }

  function attachTracking(route) {
    var pair = document.getElementById('ymsStanPairCta');
    if (pair) pair.addEventListener('click', function () {
      Y.track('quiz_pair_recommendation_click', { pair: route.key || '' });
    });
    var selfGuided = document.getElementById('ymsStanSelfGuidedCta');
    if (selfGuided) selfGuided.addEventListener('click', function () {
      Y.track('quiz_self_guided_recommendation_click', { active_stage_count: route.stages.length });
    });
    var calm = document.getElementById('ymsStanCalmCta');
    if (calm) calm.addEventListener('click', function () {
      Y.track('quiz_calm_spiral_recommendation_click', {});
    });
    var bootcamp = document.getElementById('ymsStanBootcampSecondary');
    if (bootcamp) bootcamp.addEventListener('click', function () {
      Y.track('quiz_bootcamp_secondary_click', { active_stage_count: route.stages.length });
    });
  }

  function renderRoute(container, route, resultBucketKey) {
    if (route.type === 'single') {
      previousMountRecommendation(container.id, resultBucketKey);
      return;
    }
    if (route.type === 'calm') renderCalm(container);
    else if (route.type === 'pair') renderPair(container, route.stages);
    else renderSelfGuided(container, route.stages);
    attachTracking(route);
  }

  function fetchAuthoritativeResult(token) {
    if (!token) return Promise.resolve(null);
    return fetch(APPS_SCRIPT_URL + '?action=getResult&resultToken=' + encodeURIComponent(token), { method: 'GET' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || data.status !== 'ok') return null;
        return data;
      })
      .catch(function (err) {
        console.warn('Stan routing V2 could not recover authoritative result:', err);
        return null;
      });
  }

  Y.mountRecommendationV1 = function (containerId, resultBucketKey) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var sessionData = Y.getResultData ? (Y.getResultData() || {}) : {};
    var token = sessionData.resultToken || '';

    // If result.html already recovered the server record, no second request is needed.
    var sessionStages = activeStagesFromRecord(sessionData);
    if (sessionStages.length || sessionData.resultType === 'no_clear_leader') {
      renderRoute(container, routeForStages(sessionStages), resultBucketKey);
      return;
    }

    // Immediate post-quiz sessions currently do not persist secondaryActivePatterns,
    // so recover the server's authoritative record before choosing a paid route.
    fetchAuthoritativeResult(token).then(function (record) {
      if (record) {
        var stages = activeStagesFromRecord(record);
        renderRoute(container, routeForStages(stages), resultBucketKey);
        return;
      }

      // Conservative fallback: never manufacture a second/third stage from incomplete data.
      // Existing single-audio rendering remains available if the server is temporarily down.
      var fallbackStages = fallbackStagesFromSession(sessionData);
      if (fallbackStages.length <= 1) {
        renderRoute(container, routeForStages(fallbackStages), resultBucketKey);
      } else {
        container.innerHTML = '<div class="divider"></div><p class="result-lede">I could not verify the full set of stages in your saved result, so I am not going to guess which paid pathway to send you to.</p><div class="cta-row"><a class="btn-cta" href="quiz.html">RETAKE THE QUIZ</a></div>';
      }
    });
  };

  // Expose deterministic helpers for automated tests only; contains no PII.
  global.YMSStanRoutingV2 = {
    stageOrder: STAGE_ORDER.slice(),
    routeForStages: routeForStages,
    activeStagesFromRecord: activeStagesFromRecord,
    productUrls: PRODUCT_URLS,
    standaloneUrls: STANDALONE_URLS
  };
})(window);

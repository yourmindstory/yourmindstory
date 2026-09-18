/* Your Mind Story quiz product routing — research-informed scope + support ladder.
   Product qualification is based on stage totals, not marketing behaviour.
   Each stage is 0-6. A stage qualifies when its total is >= 3.
   0 qualifying -> Bare Minimum
   1 qualifying -> exact single audio
   2 qualifying -> exact two-stage pathway
   3-4 qualifying -> Complete Self-Guided Journey
   3-4 qualifying + total >= 15 -> readiness gate before Bootcamp is offered
*/
(function (global) {
  "use strict";

  var Y = global.YMSQuiz;
  if (!Y || !Y.mountRecommendationV1) return;

  var originalMount = Y.mountRecommendationV1;
  var STAGE_ORDER = [
    "Quiet the Alarm",
    "Break the Pull",
    "Restore Self-Trust",
    "Return to Yourself"
  ];

  var SINGLES = {
    "Quiet the Alarm": {
      url: "https://stan.store/YourMindStory/p/quiet-the-alarm",
      description: "When something shifts with him, your body goes with it. The alarm comes on fast and takes too long to switch off."
    },
    "Break the Pull": {
      url: "https://stan.store/YourMindStory/p/break-the-pull",
      description: "You can know you need to stop checking, replaying or reaching out and still feel yourself getting pulled straight back in."
    },
    "Restore Self-Trust": {
      url: "https://stan.store/YourMindStory/p/restore-self-trust",
      description: "You know what happened. Then you question yourself, change your mind and start wondering if you got it wrong."
    },
    "Return to Yourself": {
      url: "https://stan.store/YourMindStory/p/return-to-yourself-7jc9h8lg",
      description: "Too much of your attention is ending up with him, while your own plans, needs and life get pushed further into the background."
    }
  };

  var PAIRS = {
    "Quiet the Alarm|Break the Pull": {
      name: "Quiet the Alarm → Break the Pull",
      url: "https://stan.store/Yourmindstory/p/quiet-the-alarm--break-the-pull"
    },
    "Quiet the Alarm|Restore Self-Trust": {
      name: "Quiet the Alarm → Restore Self-Trust",
      url: "https://stan.store/Yourmindstory/p/quiet-the-alarm--restore-selftrust"
    },
    "Quiet the Alarm|Return to Yourself": {
      name: "Quiet the Alarm → Return to Yourself",
      url: "https://stan.store/Yourmindstory/p/quiet-the-alarm--return-to-yourself"
    },
    "Break the Pull|Restore Self-Trust": {
      name: "Break the Pull → Restore Self-Trust",
      url: "https://stan.store/Yourmindstory/p/break-the-pull--restore-selftrust"
    },
    "Break the Pull|Return to Yourself": {
      name: "Break the Pull → Return to Yourself",
      url: "https://stan.store/Yourmindstory/p/break-the-pull--return-to-yourself"
    },
    "Restore Self-Trust|Return to Yourself": {
      name: "Restore Self-Trust → Return to Yourself",
      url: "https://stan.store/Yourmindstory/p/restore-selftrust--return-to-yourself"
    }
  };

  var SELF_GUIDED = {
    name: "Complete Self-Guided Journey",
    url: "https://stan.store/Yourmindstory/p/complete-selfguided-journey"
  };
  var BARE_MINIMUM = "https://stan.store/YourMindStory/p/the-bare-minimum";
  var BOOTCAMP = "https://payhip.com/b/ZhPkp";

  var READINESS_GOAL_OPTIONS = [
    "I want help understanding myself, breaking the cycle and getting my mind back.",
    "I mainly want to understand him and what his behaviour means.",
    "I mainly want help getting him back or changing his behaviour.",
    "I’m not sure yet."
  ];
  var READINESS_COMMITMENT_OPTIONS = [
    "Yes.",
    "I think so, but consistency is something I struggle with.",
    "I’m not sure.",
    "No."
  ];

  function canonicalStage(name) {
    name = String(name || "").trim();
    if (name === "Restore Self Trust") return "Restore Self-Trust";
    return name;
  }

  function orderedUnique(source) {
    var seen = {};
    (source || []).forEach(function (item) {
      var stage = canonicalStage(item);
      if (STAGE_ORDER.indexOf(stage) !== -1) seen[stage] = true;
    });
    return STAGE_ORDER.filter(function (stage) { return seen[stage]; });
  }

  function scoreForStage(scores, stage) {
    if (!scores) return null;
    var direct = scores[stage];
    if (direct == null && stage === "Restore Self-Trust") direct = scores["Restore Self Trust"];
    if (direct == null) {
      var internal = {
        "Quiet the Alarm":"quietTheAlarm",
        "Break the Pull":"breakThePull",
        "Restore Self-Trust":"restoreSelfTrust",
        "Return to Yourself":"returnToYourself"
      }[stage];
      if (internal) direct = scores[internal];
    }
    var n = Number(direct);
    return isFinite(n) ? n : null;
  }

  function qualifyingStagesFromData(data) {
    data = data || {};
    if (Array.isArray(data.qualifyingStages)) return orderedUnique(data.qualifyingStages);

    if (data.stageScores && typeof data.stageScores === "object") {
      return STAGE_ORDER.filter(function (stage) {
        var n = scoreForStage(data.stageScores, stage);
        return n != null && n >= 3;
      });
    }

    /* Backwards-compatible fallback for an old result session only.
       New quiz sessions always persist qualifyingStages/stageScores. */
    if (Array.isArray(data.activeStages)) return orderedUnique(data.activeStages);

    var source = [];
    if (Array.isArray(data.leadingPatterns)) source = source.concat(data.leadingPatterns);
    if (Array.isArray(data.secondaryActivePatterns)) source = source.concat(data.secondaryActivePatterns);
    if (!source.length && Array.isArray(data.tiedResults)) source = source.concat(data.tiedResults);
    if (!source.length && data.primaryResult) source.push(data.primaryResult);
    return orderedUnique(source);
  }

  function totalScoreFromData(data) {
    var explicit = Number(data && data.totalFourStageScore);
    if (isFinite(explicit)) return explicit;
    if (!data || !data.stageScores) return null;
    var total = 0, count = 0;
    STAGE_ORDER.forEach(function (stage) {
      var n = scoreForStage(data.stageScores, stage);
      if (n != null) { total += n; count += 1; }
    });
    return count === 4 ? total : null;
  }

  function pairKey(stages) {
    return orderedUnique(stages).join("|");
  }

  function naturalList(items) {
    items = items || [];
    if (items.length <= 1) return items[0] || "";
    if (items.length === 2) return items[0] + " and " + items[1];
    return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
  }

  function downsellHtml(isSingle) {
    var work = isSingle ? "the hypnotherapy audio" : "the hypnotherapy work";
    return '<div class="og-secondary yms-downsell" style="margin-top:26px;">' +
      '<p><strong>Still trying to make sense of what’s happening?</strong></p>' +
      '<p>If you’re not ready for ' + work + ' yet, but you know you don’t want to stay stuck here, start with <strong>The Bare Minimum</strong>.</p>' +
      '<div class="cta-row"><a class="btn-ghost" data-yms-downsell href="' + BARE_MINIMUM + '">START WITH THE BARE MINIMUM — £4.99</a></div>' +
      '</div>';
  }

  function wireDownsell(container, source) {
    var link = container.querySelector("[data-yms-downsell]");
    if (link && Y.track) link.addEventListener("click", function () {
      Y.track("quiz_bare_minimum_downsell_click", { source_route: source });
    });
  }

  function renderBare(container) {
    container.innerHTML =
      '<div class="divider"></div>' +
      '<span class="og-label">YOUR RECOMMENDED NEXT STEP</span>' +
      '<p class="result-lede" style="margin-top:0;">Start with The Bare Minimum.</p>' +
      '<p>Nothing in your answers is loud enough for me to tell you that you need one of the hypnotherapy stages.</p>' +
      '<p>That does not mean nothing is going on. It means I would not sell you more than your answers are showing.</p>' +
      '<p><strong>Start by getting very clear on what your bare minimum actually is in love.</strong></p>' +
      '<div class="cta-row"><a class="btn-cta" data-yms-bare href="' + BARE_MINIMUM + '">START WITH THE BARE MINIMUM — £4.99</a></div>';
    var cta = container.querySelector("[data-yms-bare]");
    if (cta && Y.track) cta.addEventListener("click", function () {
      Y.track("quiz_bare_minimum_recommendation_click", {});
    });
  }

  function renderSingle(container, stage) {
    var product = SINGLES[stage];
    if (!product) return false;
    container.innerHTML =
      '<div class="divider"></div>' +
      '<span class="og-label">YOUR RECOMMENDED NEXT STEP</span>' +
      '<p class="result-lede" style="margin-top:0;">I would start with ' + Y.escapeText(stage) + '.</p>' +
      '<p>' + Y.escapeText(product.description) + '</p>' +
      '<p><strong>This is the part I would work on first.</strong></p>' +
      '<p>' + Y.escapeText(stage) + ' is the guided Cognitive Behavioural Hypnotherapy audio I would use to start changing that part of the cycle.</p>' +
      '<div class="cta-row"><a class="btn-cta" data-yms-single href="' + product.url + '">START WITH ' + Y.escapeText(stage).toUpperCase() + '</a></div>' +
      downsellHtml(true);
    var cta = container.querySelector("[data-yms-single]");
    if (cta && Y.track) cta.addEventListener("click", function () {
      Y.track("quiz_audio_recommendation_click", { selected_stage: stage });
    });
    wireDownsell(container, "single_" + stage);
    return true;
  }

  function renderPair(container, stages) {
    stages = orderedUnique(stages);
    var pair = PAIRS[pairKey(stages)];
    if (!pair) return false;

    var first = stages[0], second = stages[1];
    container.innerHTML =
      '<div class="divider"></div>' +
      '<span class="og-label">YOUR RECOMMENDED NEXT STEP</span>' +
      '<p class="result-lede" style="margin-top:0;">I recommend ' + Y.escapeText(pair.name) + '.</p>' +
      '<p>Two parts of this are pulling at you, so I would not tell you to work on one and pretend the other is not there.</p>' +
      '<p><strong>Start with ' + Y.escapeText(first) + '.</strong> Give it 21 days and do the check-ins. Then move to <strong>' + Y.escapeText(second) + '</strong>.</p>' +
      '<p>Not everything at once. One stage, then the next.</p>' +
      '<div class="cta-row"><a class="btn-cta" data-yms-pair href="' + pair.url + '">START MY TWO-STAGE PATHWAY — £74</a></div>' +
      downsellHtml(false);

    var cta = container.querySelector("[data-yms-pair]");
    if (cta && Y.track) cta.addEventListener("click", function () {
      Y.track("quiz_pair_recommendation_click", { pair: pair.name, first_stage: first, second_stage: second });
    });
    wireDownsell(container, "pair_" + pairKey(stages));
    return true;
  }

  function renderSelfGuided(container, stages, reasonText) {
    stages = orderedUnique(stages);
    var isThree = stages.length === 3;
    var stageItems = stages.map(function (stage) {
      return '<li><strong>' + Y.escapeText(stage) + '</strong></li>';
    }).join("");

    var scopeCopy = isThree
      ? '<p>Your result picked up <strong>three parts of the cycle</strong>: ' + Y.escapeText(naturalList(stages)) + '.</p>' +
        '<p>That is why I would not send you to one audio and call it done.</p>' +
        '<p>The Complete Self-Guided Journey includes all four stages, but your quiz is only telling you to prioritise these three right now. The fourth is included; I am not pretending your result said you need it.</p>'
      : '<p><strong>All four parts of the cycle are showing up in your result.</strong></p>' +
        '<p>So I would not narrow this down to one or two audios. I would work through the full journey, in order.</p>';

    container.innerHTML =
      '<div class="divider"></div>' +
      '<span class="og-label">YOUR RECOMMENDED NEXT STEP</span>' +
      '<p class="result-lede" style="margin-top:0;">I recommend the Complete Self-Guided Journey.</p>' +
      (reasonText ? '<p>' + Y.escapeText(reasonText) + '</p>' : '') +
      scopeCopy +
      '<ol class="og-steps">' + stageItems + '</ol>' +
      '<p><strong>Start with ' + Y.escapeText(stages[0]) + '.</strong> Work on one stage at a time and do the check-ins before you move on.</p>' +
      '<div class="cta-row"><a class="btn-cta" data-yms-self-guided href="' + SELF_GUIDED.url + '">START MY SELF-GUIDED JOURNEY — £117</a></div>' +
      downsellHtml(false);

    var cta = container.querySelector("[data-yms-self-guided]");
    if (cta && Y.track) cta.addEventListener("click", function () {
      Y.track("quiz_self_guided_recommendation_click", { qualifying_stage_count: stages.length, qualifying_stages: stages.join("|") });
    });
    wireDownsell(container, "self_guided_" + stages.length);
    return true;
  }

  function renderBootcamp(container, stages, data) {
    stages = orderedUnique(stages);
    var areas = stages.length === 4
      ? 'All four parts of the cycle are showing up for you.'
      : 'The parts showing up for you are <strong>' + Y.escapeText(naturalList(stages)) + '</strong>.';

    container.innerHTML =
      '<div class="divider"></div>' +
      '<span class="og-label">YOUR RECOMMENDED NEXT STEP</span>' +
      '<p class="result-lede" style="margin-top:0;">I recommend the Original Group Bootcamp.</p>' +
      '<p>This is not just one thing anymore. More than one part of the cycle is taking your attention, and when I asked what you want, you chose getting yourself out of it — not more answers about him.</p>' +
      '<p><strong>This is exactly who I built the Original Group for.</strong></p>' +
      '<p>' + areas + '</p>' +
      '<p>Over 12 weeks we work through the full system in order, with the hypnotherapy audios, check-ins and live integration calls so you are not left trying to hold the whole thing together on your own.</p>' +
      '<p>Original Group • 2026 starts <strong>4 October 2026</strong>.</p>' +
      '<div class="cta-row"><a class="btn-cta" data-yms-bootcamp href="' + BOOTCAMP + '">JOIN ORIGINAL GROUP — £297</a></div>' +
      '<div class="og-secondary" style="margin-top:26px;">' +
        '<p><strong>Want to do the work privately?</strong></p>' +
        '<p>You can choose the Complete Self-Guided Journey instead. Same four-stage system, without the group support.</p>' +
        '<div class="cta-row"><a class="btn-ghost" data-yms-self-alt href="' + SELF_GUIDED.url + '">CHOOSE SELF-GUIDED — £117</a></div>' +
      '</div>';

    var boot = container.querySelector("[data-yms-bootcamp]");
    var selfAlt = container.querySelector("[data-yms-self-alt]");
    if (boot && Y.track) boot.addEventListener("click", function () {
      Y.track("quiz_bootcamp_recommendation_click", { total_score: totalScoreFromData(data), qualifying_stage_count: stages.length });
    });
    if (selfAlt && Y.track) selfAlt.addEventListener("click", function () {
      Y.track("quiz_self_guided_alternative_click", { source_route: "bootcamp_ready" });
    });
  }

  function optionHtml(group, index, text) {
    return '<label class="fc-option" for="' + group + '_' + index + '">' +
      '<input type="radio" name="' + group + '" id="' + group + '_' + index + '" value="' + index + '">' +
      '<span class="fc-option-text">' + Y.escapeText(text) + '</span>' +
      '<span class="fc-option-mark" aria-hidden="true"></span>' +
      '</label>';
  }

  function renderReadinessGate(container, stages, data) {
    var total = totalScoreFromData(data);
    var prior = data && data.bootcampReadiness;
    if (prior && prior.completed) {
      if (prior.goalAligned && prior.commitmentAligned) renderBootcamp(container, stages, data);
      else renderSelfGuided(container, stages, "The group is not the right fit for where you are right now, so I would do the work privately and at your own pace.");
      return;
    }

    container.innerHTML =
      '<div class="divider"></div>' +
      '<span class="og-label">TWO QUICK QUESTIONS</span>' +
      '<p class="result-lede" style="margin-top:0;">This is affecting you in more than one place.</p>' +
      '<p>Before I tell you whether I would point you to the group or the self-guided route, I need to know two things.</p>' +
      '<div class="fc-label">1 of 2</div>' +
      '<div class="fc-prompt">Which sounds closest to what you’re looking for?</div>' +
      '<div class="fc-options" data-yms-readiness-goal role="radiogroup">' +
        READINESS_GOAL_OPTIONS.map(function (text, i) { return optionHtml("ymsReadinessGoal", i, text); }).join("") +
      '</div>' +
      '<div class="fc-label" style="margin-top:24px;">2 of 2</div>' +
      '<div class="fc-prompt">The Bootcamp is 12 weeks. Your main job is to press play each day, spend around 15 minutes once a week writing Your Mind Story, and complete a short check-in. Can you commit to that?</div>' +
      '<div class="fc-options" data-yms-readiness-commitment role="radiogroup">' +
        READINESS_COMMITMENT_OPTIONS.map(function (text, i) { return optionHtml("ymsReadinessCommitment", i, text); }).join("") +
      '</div>' +
      '<div class="cta-row"><button type="button" class="btn-cta" data-yms-readiness-submit disabled>SHOW ME WHERE I’D START</button></div>';

    var goalIndex = null, commitmentIndex = null;
    var submit = container.querySelector("[data-yms-readiness-submit]");

    function updateSelected(groupSelector, input) {
      var wrap = container.querySelector(groupSelector);
      if (!wrap) return;
      Array.prototype.forEach.call(wrap.querySelectorAll(".fc-option"), function (el) { el.classList.remove("selected"); });
      var label = input.closest(".fc-option");
      if (label) label.classList.add("selected");
    }
    function updateButton() { submit.disabled = goalIndex == null || commitmentIndex == null; }

    container.addEventListener("change", function (e) {
      if (!e.target || e.target.type !== "radio") return;
      if (e.target.name === "ymsReadinessGoal") {
        goalIndex = parseInt(e.target.value, 10);
        updateSelected("[data-yms-readiness-goal]", e.target);
      }
      if (e.target.name === "ymsReadinessCommitment") {
        commitmentIndex = parseInt(e.target.value, 10);
        updateSelected("[data-yms-readiness-commitment]", e.target);
      }
      updateButton();
    });

    submit.addEventListener("click", function () {
      if (goalIndex == null || commitmentIndex == null) return;
      var readiness = {
        completed: true,
        goalIndex: goalIndex,
        commitmentIndex: commitmentIndex,
        goal: READINESS_GOAL_OPTIONS[goalIndex],
        commitment: READINESS_COMMITMENT_OPTIONS[commitmentIndex],
        goalAligned: goalIndex === 0,
        commitmentAligned: commitmentIndex === 0 || commitmentIndex === 1
      };
      data.bootcampReadiness = readiness;
      if (Y.setResultData) Y.setResultData(data);
      if (Y.track) Y.track("quiz_bootcamp_readiness_complete", {
        goal_aligned: readiness.goalAligned,
        commitment_aligned: readiness.commitmentAligned,
        total_score: total,
        qualifying_stage_count: stages.length
      });
      if (readiness.goalAligned && readiness.commitmentAligned) renderBootcamp(container, stages, data);
      else renderSelfGuided(container, stages, "The group is not the right fit for where you are right now, so I would do the work privately and at your own pace.");
    });
  }

  Y.qualifyingStagesFromResult = qualifyingStagesFromData;

  Y.mountRecommendationV1 = function (containerId, resultBucketKey) {
    var data = Y.getResultData ? (Y.getResultData() || {}) : {};
    var stages = qualifyingStagesFromData(data);
    var container = document.getElementById(containerId);
    if (!container) return;

    /* If this is a genuinely old session with no score/qualification data,
       preserve the previous renderer rather than pretending the new threshold
       was applied. */
    var hasNewRoutingData = Array.isArray(data.qualifyingStages) || (data.stageScores && typeof data.stageScores === "object");
    if (!hasNewRoutingData) {
      originalMount(containerId, resultBucketKey);
      return;
    }

    if (stages.length === 0) { renderBare(container); return; }
    if (stages.length === 1 && renderSingle(container, stages[0])) return;
    if (stages.length === 2 && renderPair(container, stages)) return;

    var total = totalScoreFromData(data);
    if (stages.length >= 3 && total != null && total >= 15) {
      renderReadinessGate(container, stages, data);
      return;
    }
    if (stages.length >= 3) {
      renderSelfGuided(container, stages, "");
      return;
    }

    originalMount(containerId, resultBucketKey);
  };
})(window);

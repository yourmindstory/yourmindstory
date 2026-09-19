/* Your Mind Story quiz product routing - research-informed scope + support ladder.
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

  var STAGE_SUBTITLES = {
    "Quiet the Alarm": "Calm the panic and anxiety when you think of him",
    "Break the Pull": "Stop the checking, replaying and getting pulled back in",
    "Restore Self-Trust": "Stop second-guessing what you know",
    "Return to Yourself": "Get your mind and your life back"
  };

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

  function recordJourney(eventType, values) {
    if (Y.recordJourneyEvent) Y.recordJourneyEvent(eventType, values || {});
  }

  function logRoute(routeShown, recommendation) {
    recordJourney("final_route_shown", {
      routeShown: routeShown,
      recommendation: recommendation
    });
  }

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
    return '<div class="yms-downsell" style="margin-top:42px;padding-top:22px;border-top:1px solid rgba(36,61,46,.12);font-size:.94em;opacity:.9;">' +
      '<p style="margin-bottom:8px;"><strong>Not ready to start ' + work + ' yet?</strong></p>' +
      '<p style="margin-top:0;">You can begin with <strong>The Bare Minimum</strong> and get clear on the five things a woman needs to stay healthy in love.</p>' +
      '<p style="margin-bottom:0;"><a data-yms-downsell href="' + BARE_MINIMUM + '">Start with The Bare Minimum - £4.99</a></p>' +
      '</div>';
  }

  function wireDownsell(container, source) {
    var link = container.querySelector("[data-yms-downsell]");
    if (link) link.addEventListener("click", function () {
      if (Y.track) Y.track("quiz_bare_minimum_downsell_click", { source_route: source });
      recordJourney("bare_minimum_downsell_click", { ctaChosen: "The Bare Minimum - £4.99" });
    });
  }

  function renderBare(container) {
    container.innerHTML =
      '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>Based on your answers, I wouldn’t recommend one of the hypnotherapy audios right now.</h1>' +
      '<p>Your answers aren’t registering high enough in any one area for me to think you’d benefit from starting with one of the hypnotherapy audios.</p>' +
      '<p>I’m <strong>not</strong> saying nothing is going on for you.</p>' +
      '<p>I’d start by getting really clear on what your bare minimum actually is in love.</p>' +
      '<div class="divider"></div>' +
      '<p class="result-lede">You can start here with The Bare Minimum.</p>' +
      '<p>The five things a woman needs to stay healthy in love.</p>' +
      '<p>Not the dream relationship.</p>' +
      '<p><strong>This is about your health. The minimum.</strong></p>' +
      '<p>Because once you know that, it becomes much harder to keep negotiating with yourself just to keep somebody else.</p>' +
      '<div class="cta-row"><a class="btn-cta" data-yms-bare href="' + BARE_MINIMUM + '">START WITH THE BARE MINIMUM - £4.99</a></div>';
    logRoute("Bare Minimum", "The Bare Minimum");
    var cta = container.querySelector("[data-yms-bare]");
    if (cta) cta.addEventListener("click", function () {
      if (Y.track) Y.track("quiz_bare_minimum_recommendation_click", {});
      recordJourney("primary_cta_click", { cta: "The Bare Minimum - £4.99" });
    });
  }

  function renderSingle(container, stage) {
    var product = SINGLES[stage];
    if (!product) return false;

    var productCopy = {
      "Quiet the Alarm":
        '<p>Quiet the Alarm is the guided <strong>Cognitive Behavioural Hypnotherapy</strong> audio I created to work on that automatic alarm response.</p>' +
        '<p>So thinking about him doesn’t have to mean losing the next few hours of your day to panic, anxiety or overthinking.</p>',
      "Break the Pull":
        '<p>Break the Pull is the guided <strong>Cognitive Behavioural Hypnotherapy</strong> audio I created to work on that automatic pull underneath the checking, replaying, analysing and reaching out.</p>' +
        '<p>Because at some point, knowing better needs to become <strong>doing differently</strong>.</p>',
      "Restore Self-Trust":
        '<p>Restore Self-Trust is the guided <strong>Cognitive Behavioural Hypnotherapy</strong> audio I created to work on the beliefs and automatic responses underneath all that second-guessing.</p>' +
        '<p>The work here is <strong>you trusting you again</strong>.</p>',
      "Return to Yourself":
        '<p>Return to Yourself is the guided <strong>Cognitive Behavioural Hypnotherapy</strong> audio I created to help bring your attention, energy and sense of self back to you.</p>' +
        '<p>So your plans, your time and your life start becoming about <strong>you</strong> again.</p>'
    }[stage] || "";

    container.innerHTML =
      '<div class="divider"></div>' +
      '<p class="result-lede" style="margin-top:0;">I recommend ' + Y.escapeText(stage) + '.</p>' +
      productCopy +
      '<div class="cta-row"><a class="btn-cta" data-yms-single href="' + product.url + '">START WITH ' + Y.escapeText(stage).toUpperCase() + ' - £37</a></div>' +
      downsellHtml(true);

    logRoute("Single Audio", stage);
    var cta = container.querySelector("[data-yms-single]");
    if (cta) cta.addEventListener("click", function () {
      if (Y.track) Y.track("quiz_audio_recommendation_click", { selected_stage: stage });
      recordJourney("primary_cta_click", { cta: stage + " - £37" });
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
      '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>Based on your answers, there are two places that seem to be bothering you.</h1>' +
      '<p class="result-lede"><strong>' + Y.escapeText(first) + '</strong><br><span class="cta-microcopy">' + Y.escapeText(STAGE_SUBTITLES[first]) + '</span></p>' +
      '<p class="result-lede"><strong>' + Y.escapeText(second) + '</strong><br><span class="cta-microcopy">' + Y.escapeText(STAGE_SUBTITLES[second]) + '</span></p>' +
      '<p>Both of these are showing up strongly enough that I wouldn’t tell you to work on one and ignore the other.</p>' +
      '<p>And they can feed each other.</p>' +
      '<p><strong>That is why I’d work on both.</strong></p>' +
      '<div class="divider"></div>' +
      '<span class="og-label">I’D START HERE</span>' +
      '<p class="result-lede" style="margin-top:0;">' + Y.escapeText(pair.name) + '</p>' +
      '<p>Start with <strong>' + Y.escapeText(first) + '</strong>.</p>' +
      '<p>Work with it for 21 days and complete your check-ins.</p>' +
      '<p>Then move on to <strong>' + Y.escapeText(second) + '</strong>.</p>' +
      '<p><strong>One stage at a time.</strong></p>' +
      '<div class="cta-row"><a class="btn-cta" data-yms-pair href="' + pair.url + '">START MY TWO-STAGE PATHWAY - £74</a></div>' +
      downsellHtml(false);

    logRoute("Two-Stage Pathway", pair.name);
    var cta = container.querySelector("[data-yms-pair]");
    if (cta) cta.addEventListener("click", function () {
      if (Y.track) Y.track("quiz_pair_recommendation_click", { pair: pair.name, first_stage: first, second_stage: second });
      recordJourney("primary_cta_click", { cta: pair.name + " - £74" });
    });
    wireDownsell(container, "pair_" + pairKey(stages));
    return true;
  }

  function allStageListHtml() {
    return STAGE_ORDER.map(function (stage) {
      return '<p class="result-lede"><strong>' + Y.escapeText(stage) + '</strong><br><span class="cta-microcopy">' + Y.escapeText(STAGE_SUBTITLES[stage]) + '</span></p>';
    }).join("");
  }

  function detectedStageListHtml(stages) {
    return stages.map(function (stage) {
      return '<p class="result-lede"><strong>' + Y.escapeText(stage) + '</strong><br><span class="cta-microcopy">' + Y.escapeText(STAGE_SUBTITLES[stage]) + '</span></p>';
    }).join("");
  }

  function resultSummaryHtml(stages) {
    stages = orderedUnique(stages);

    if (stages.length === 2) {
      return '<span class="result-tag">YOUR RESULT</span>' +
        '<h1>Based on your answers, there are two places that seem to be bothering you.</h1>' +
        detectedStageListHtml(stages) +
        '<p>Both of these are showing up strongly enough that I wouldn’t tell you to work on one and ignore the other.</p>' +
        '<p>And they can feed each other.</p>' +
        '<p><strong>That is why I’d work on both.</strong></p>';
    }

    if (stages.length === 3) {
      return '<span class="result-tag">YOUR RESULT</span>' +
        '<h1>Based on your answers, this is affecting you in three places.</h1>' +
        '<p>Your results are showing:</p>' +
        detectedStageListHtml(stages);
    }

    if (stages.length >= 4) {
      return '<span class="result-tag">YOUR RESULT</span>' +
        '<h1>Based on your answers, this is affecting you across the whole cycle.</h1>' +
        '<p>Your body reacts.</p>' +
        '<p>You get pulled back into him.</p>' +
        '<p>You question yourself.</p>' +
        '<p>And too much of your own life is getting pushed into the background.</p>' +
        '<p>Which is why knowing more about him hasn’t necessarily stopped what this is doing to <strong>you</strong>.</p>';
    }

    return '';
  }

  function renderSelfGuided(container, stages, reasonText) {
    stages = orderedUnique(stages);
    var isThree = stages.length === 3;

    if (reasonText) {
      container.innerHTML =
        '<span class="result-tag">YOUR RECOMMENDED NEXT STEP</span>' +
        '<h1>I’d do this privately.</h1>' +
        '<p>Your quiz result hasn’t changed.</p>' +
        '<p>The same areas are still showing up for you.</p>' +
        '<p>But based on what you’ve just told me, I don’t think the group is the right way for you to do the work right now.</p>' +
        '<p class="result-lede">I recommend the Complete Self-Guided Journey.</p>' +
        '<p>You can work through the full process in your own time, one stage at a time.</p>' +
        '<p>Start with <strong>Quiet the Alarm</strong>, then keep moving through the programme in order.</p>' +
        '<div class="cta-row"><a class="btn-cta" data-yms-self-guided href="' + SELF_GUIDED.url + '">START MY SELF-GUIDED JOURNEY - £117</a></div>' +
        downsellHtml(false);
    } else if (isThree) {
      container.innerHTML =
        '<span class="result-tag">YOUR RESULT</span>' +
        '<h1>Based on your answers, this is affecting you in three places.</h1>' +
        '<p>Your results are showing:</p>' +
        detectedStageListHtml(stages) +
        '<p>At that point, I wouldn’t separate this out and send you off to buy three different audios.</p>' +
        '<div class="divider"></div>' +
        '<p class="result-lede">I recommend the Complete Self-Guided Journey.</p>' +
        '<p>You need a clear way of working through this rather than trying to fix whichever part is screaming the loudest that day.</p>' +
        '<p>You work through the whole process <strong>in order, one stage at a time</strong>:</p>' +
        allStageListHtml() +
        '<p>Start at the beginning and work through each stage before moving on to the next.</p>' +
        '<p>Your results tell me <strong>where this is hitting you hardest</strong>.</p>' +
        '<p>The Complete Self-Guided Journey gives you the whole process to work through properly from beginning to end.</p>' +
        '<div class="cta-row"><a class="btn-cta" data-yms-self-guided href="' + SELF_GUIDED.url + '">START MY SELF-GUIDED JOURNEY - £117</a></div>' +
        downsellHtml(false);
    } else {
      container.innerHTML =
        '<span class="result-tag">YOUR RESULT</span>' +
        '<h1>Based on your answers, this is affecting you across the whole cycle.</h1>' +
        '<p>Your body reacts.</p>' +
        '<p>You get pulled back into him.</p>' +
        '<p>You question yourself.</p>' +
        '<p>And too much of your own life is getting pushed into the background.</p>' +
        '<p>Which is why knowing more about him hasn’t necessarily stopped what this is doing to <strong>you</strong>.</p>' +
        '<div class="divider"></div>' +
        '<p class="result-lede">I recommend the Complete Self-Guided Journey.</p>' +
        '<p>You work through the whole process <strong>in order, one stage at a time</strong>:</p>' +
        allStageListHtml() +
        '<p>Not everything at once.</p>' +
        '<p>You start at the beginning and keep moving through.</p>' +
        '<div class="cta-row"><a class="btn-cta" data-yms-self-guided href="' + SELF_GUIDED.url + '">START MY SELF-GUIDED JOURNEY - £117</a></div>' +
        downsellHtml(false);
    }

    logRoute("Complete Self-Guided", "Complete Self-Guided Journey");
    var cta = container.querySelector("[data-yms-self-guided]");
    if (cta) cta.addEventListener("click", function () {
      if (Y.track) Y.track("quiz_self_guided_recommendation_click", { qualifying_stage_count: stages.length, qualifying_stages: stages.join("|") });
      recordJourney("primary_cta_click", { cta: "Complete Self-Guided Journey - £117" });
    });
    wireDownsell(container, reasonText ? "self_guided_private" : "self_guided_" + stages.length);
    return true;
  }

  function renderUnderstandingBridge(container, stages) {
    stages = orderedUnique(stages);
    container.innerHTML =
      '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>Your result is still showing me that this is affecting you in more than one place.</h1>' +
      '<p>But from what you’ve just told me, you’re still trying to understand <strong>him</strong> and what all of this means.</p>' +
      '<p>I get why.</p>' +
      '<p>When something doesn’t make sense, your brain naturally keeps looking for the answer.</p>' +
      '<p>But more information about him isn’t necessarily going to change what this has already started doing to <strong>you</strong>.</p>' +
      '<div class="divider"></div>' +
      '<p class="result-lede">If you’re not ready for the deeper work yet, start here.</p>' +
      '<p class="result-lede"><strong>The Bare Minimum</strong></p>' +
      '<p>Get really clear on the five things a woman needs to stay healthy in love.</p>' +
      '<p>Then, when you’re ready to work on the pattern itself, your quiz result is here to show you where I’d start.</p>' +
      '<div class="cta-row"><a class="btn-cta" data-yms-bare-bridge href="' + BARE_MINIMUM + '">START WITH THE BARE MINIMUM - £4.99</a></div>';
    logRoute("Bare Minimum", "The Bare Minimum");
    var cta = container.querySelector("[data-yms-bare-bridge]");
    if (cta) cta.addEventListener("click", function () {
      if (Y.track) Y.track("quiz_bare_minimum_readiness_bridge_click", { qualifying_stage_count: stages.length });
      recordJourney("primary_cta_click", { cta: "The Bare Minimum - £4.99" });
    });
  }

  function renderBootcamp(container, stages, data) {
    stages = orderedUnique(stages);
    container.innerHTML =
      '<span class="result-tag">YOUR RECOMMENDED NEXT STEP</span>' +
      '<h1>I recommend the Original Group Bootcamp.</h1>' +
      '<p>Based on your answers, this isn’t just affecting you in one place.</p>' +
      '<p>Your result is showing:</p>' +
      detectedStageListHtml(stages) +
      '<p>And when I asked what you want, you chose working on <strong>yourself, breaking the cycle and getting your mind back</strong>.</p>' +
      '<p>Not another twelve weeks of researching him.</p>' +
      '<p class="result-lede"><strong>This is who I built the Original Group for.</strong></p>' +
      '<p>Over 12 weeks, we work through the complete process in order:</p>' +
      '<p><strong>Quiet the Alarm → Break the Pull → Restore Self-Trust → Return to Yourself</strong></p>' +
      '<p>You’ll have the guided <strong>Cognitive Behavioural Hypnotherapy</strong> work, your weekly Your Mind Story reflection and check-in, and the live integration calls as we move through it.</p>' +
      '<p class="result-lede">What we’re working towards is simple.</p>' +
      '<p><strong>Break the cycle. Take your life back.</strong></p>' +
      '<p>Less of your day disappearing into him.</p>' +
      '<p>Less checking and replaying.</p>' +
      '<p>More trust in yourself.</p>' +
      '<p>More of your attention going back into <strong>your own life</strong>.</p>' +
      '<p><strong>Original Group • 2026</strong><br>Starts <strong>Sunday 4 October 2026</strong></p>' +
      '<div class="cta-row"><a class="btn-cta" data-yms-bootcamp href="' + BOOTCAMP + '">JOIN ORIGINAL GROUP - £297</a></div>' +
      '<div style="margin-top:42px;padding-top:22px;border-top:1px solid rgba(36,61,46,.12);font-size:.94em;opacity:.9;">' +
        '<p style="margin-bottom:8px;"><strong>Prefer to work privately?</strong></p>' +
        '<p style="margin-top:0;">The <strong>Complete Self-Guided Journey</strong> gives you the same four-stage structure without the group support or live integration calls.</p>' +
        '<p style="margin-bottom:0;"><a data-yms-self-alt href="' + SELF_GUIDED.url + '">See the self-guided option - £117</a></p>' +
      '</div>';

    logRoute("Original Group Bootcamp", "Original Group Bootcamp");
    var boot = container.querySelector("[data-yms-bootcamp]");
    var selfAlt = container.querySelector("[data-yms-self-alt]");
    if (boot) boot.addEventListener("click", function () {
      if (Y.track) Y.track("quiz_bootcamp_recommendation_click", { total_score: totalScoreFromData(data), qualifying_stage_count: stages.length });
      recordJourney("bootcamp_click", {});
    });
    if (selfAlt) selfAlt.addEventListener("click", function () {
      if (Y.track) Y.track("quiz_self_guided_alternative_click", { source_route: "bootcamp_ready" });
      recordJourney("self_guided_alternative_click", {});
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

    function routeFromReadiness(readiness) {
      if (readiness.goalAligned && readiness.commitmentAligned) {
        renderBootcamp(container, stages, data);
        return;
      }
      if (readiness.goalIndex === 1 || readiness.goalIndex === 2) {
        renderUnderstandingBridge(container, stages);
        return;
      }
      renderSelfGuided(container, stages, "private");
    }

    if (prior && prior.completed) {
      routeFromReadiness(prior);
      return;
    }

    container.innerHTML =
      resultSummaryHtml(stages) +
      '<div class="divider"></div>' +
      '<span class="og-label">BEFORE WE LOOK AT YOUR RECOMMENDATION</span>' +
      '<p class="result-lede" style="margin-top:0;">This is affecting you in more than one place.</p>' +
      '<p>So before I tell you whether I think you should do this with the group or work through it privately, I need to know two things.</p>' +
      '<div class="fc-label">1 of 2</div>' +
      '<div class="fc-prompt">Which sounds most like what you want now?</div>' +
      '<div class="fc-options" data-yms-readiness-goal role="radiogroup">' +
        READINESS_GOAL_OPTIONS.map(function (text, i) { return optionHtml("ymsReadinessGoal", i, text); }).join("") +
      '</div>' +
      '<div class="fc-label" style="margin-top:24px;">2 of 2</div>' +
      '<div class="fc-prompt"><strong>One more thing.</strong><br><br>The Bootcamp is 12 weeks.<br><br>Your main job is to press play each day, spend around 15 minutes once a week writing Your Mind Story, and complete a short check-in.<br><br><strong>Can you commit to that for 12 weeks?</strong></div>' +
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
      recordJourney("readiness_completed", {
        goal: readiness.goal,
        commitment: readiness.commitment
      });
      routeFromReadiness(readiness);
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

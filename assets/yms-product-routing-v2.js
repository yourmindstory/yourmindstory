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

  function persistFinalRoute(routeShown, recommendation) {
    var data = null;
    try { data = Y.getResultData ? (Y.getResultData() || {}) : {}; } catch (e) { data = {}; }
    data.finalRouteShown = routeShown;
    data.finalRecommendation = recommendation;
    if (Y.setResultData) Y.setResultData(data);
  }

  function logRoute(routeShown, recommendation) {
    persistFinalRoute(routeShown, recommendation);
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
    var pairCopy = {
      "Quiet the Alarm|Break the Pull":
        '<span class="result-tag">YOUR RESULT</span>' +
        '<h1>Quiet the Alarm → Break the Pull</h1>' +
        '<p>Maybe he hasn’t replied. Maybe something has changed. Maybe you’ve seen something, remembered something, or he simply crosses your mind.</p>' +
        '<p>Your stomach drops. Your chest tightens. Your mind starts going.</p>' +
        '<p>Then comes the pull to <strong>do something to make the feeling stop</strong>.</p>' +
        '<p>Check your phone. Reread the messages. Replay what happened. Look for an answer. Maybe reach out.</p>' +
        '<p>And before you know it, <strong>you’re back in the same cycle again.</strong></p>' +
        '<p>That’s what your answers are showing me.</p>' +
        '<p><strong>It’s not just the reaction. It’s what the reaction pulls you into next.</strong></p>' +
        '<div class="divider"></div>' +
        '<span class="og-label">I’D START HERE</span>' +
        '<p class="result-lede" style="margin-top:0;">Quiet the Alarm → Break the Pull</p>' +
        '<p>First, <strong>Quiet the Alarm</strong> helps you work on the thoughts and emotional responses underneath that first reaction.</p>' +
        '<p>Then, <strong>Break the Pull</strong> helps you work on the urge to check, replay, reach out or go looking for another answer.</p>' +
        '<p><strong>First, work on the reaction. Then work on what it keeps pulling you into.</strong></p>' +
        '<p>You’ll work with each stage for <strong>21 days</strong>. I’ll send you short check-ins along the way so you can see what’s changing, including whether you’re settling more quickly and whether the pull is becoming easier to leave alone.</p>' +
        '<p class="result-lede"><strong>The outcome?</strong></p>' +
        '<p><strong>Something connected to him can happen without it taking the next few hours of your day with it.</strong></p>',

      "Quiet the Alarm|Restore Self-Trust":
        '<span class="result-tag">YOUR RESULT</span>' +
        '<h1>Quiet the Alarm → Restore Self-Trust</h1>' +
        '<p>Something happens with him.</p>' +
        '<p>Maybe he goes quiet. A message feels different. Something changes. Or maybe something that happened before comes back into your mind.</p>' +
        '<p>Your stomach drops. Your chest tightens. Your mind starts going.</p>' +
        '<p>And then something else happens.</p>' +
        '<p>You start questioning <strong>yourself</strong>.</p>' +
        '<p><em>Am I overreacting?</em><br><em>Have I got this wrong?</em><br><em>Maybe I’m expecting too much.</em><br><em>Maybe I should give it another chance.</em></p>' +
        '<p>You can know something doesn’t feel right and still find yourself explaining it away once the emotion takes over.</p>' +
        '<p><strong>That’s what your answers are showing me.</strong></p>' +
        '<p>It’s not just that the situation affects you emotionally. <strong>Once you’re activated, it can become harder to trust what you already know.</strong></p>' +
        '<div class="divider"></div>' +
        '<span class="og-label">I’D START HERE</span>' +
        '<p class="result-lede" style="margin-top:0;">Quiet the Alarm → Restore Self-Trust</p>' +
        '<p>First, <strong>Quiet the Alarm</strong> helps you work on the thoughts and emotional responses underneath that first reaction. The panic, anxiety and feeling that something needs to be resolved <em>right now</em>.</p>' +
        '<p>Then <strong>Restore Self-Trust</strong> helps you work on what can happen afterwards. The second-guessing. Explaining things away. Changing your mind. Looking outside yourself for reassurance about something you already felt or knew.</p>' +
        '<p><strong>First, work on the reaction. Then work on trusting yourself when the reaction is no longer making the decision for you.</strong></p>' +
        '<p>You’ll work with each session for <strong>21 days</strong>, with short check-ins along the way to help you see your progress, including whether you’re settling more easily and whether you’re finding it easier to trust your own judgement.</p>' +
        '<p class="result-lede"><strong>The outcome?</strong></p>' +
        '<p><strong>Something connected to him can affect you without making you abandon what you know.</strong></p>' +
        '<p>Less panic. Less second-guessing. Less explaining things away.</p>' +
        '<p><strong>More calm. More clarity. More trust in yourself.</strong></p>' +
        '<p>You don’t have to leave him, be over him, or know what’s going to happen between you to start working on what this dynamic is doing to you.</p>'
    }[pairKey(stages)];

    container.innerHTML =
      (pairCopy || resultSummaryHtml(stages) +
      '<div class="divider"></div>' +
      '<span class="og-label">I’D START HERE</span>' +
      '<p class="result-lede" style="margin-top:0;">' + Y.escapeText(pair.name) + '</p>' +
      '<p>Start with <strong>' + Y.escapeText(first) + '</strong>.</p>' +
      '<p>Work with it for 21 days and complete your check-ins.</p>' +
      '<p>Then move on to <strong>' + Y.escapeText(second) + '</strong>.</p>' +
      '<p><strong>One stage at a time.</strong></p>') +
      '<div class="cta-row"><a class="btn-cta" data-yms-pair href="' + pair.url + '">GET MY 2 SESSIONS NOW - £74</a></div>' +
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

  var PAIR_RESULT_COPY = {
    "Quiet the Alarm|Break the Pull":
      '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>Based on your answers, two parts of this cycle are showing up strongly for you.</h1>' +
      '<p>Something happens with him and your body reacts.</p>' +
      '<p>Your chest tightens, your stomach drops, your mind starts going — and once that alarm is switched on, it can be difficult to properly come back down.</p>' +
      '<p>But it doesn’t stop there.</p>' +
      '<p>Even when you know checking, replaying or reaching out isn’t going to help, you can still feel yourself getting pulled back in.</p>' +
      '<p><strong>And these two parts can feed each other.</strong></p>' +
      '<p>The more activated you feel, the stronger the pull can become. And the more you check, replay and look for an answer, the harder it can be for your system to settle.</p>' +
      '<p>You can understand exactly why he behaves the way he does and still find yourself stuck in that cycle.</p>' +
      '<p><strong>So this isn’t about understanding him better. We need to work on both the alarm and the pull.</strong></p>',

    "Quiet the Alarm|Restore Self-Trust":
      '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>Based on your answers, two parts of this cycle are showing up strongly for you.</h1>' +
      '<p>Something happens with him and your body reacts.</p>' +
      '<p>The alarm comes on quickly, and it can take a long time to properly come back down.</p>' +
      '<p>But at the same time, you’re also questioning yourself.</p>' +
      '<p>You know something doesn’t feel right, then find yourself explaining it away, wondering if you were too much or whether you got it wrong.</p>' +
      '<p><strong>And these two parts can feed each other.</strong></p>' +
      '<p>When your system is already activated, it becomes harder to trust your own judgement. And the more you second-guess yourself, the harder it becomes to feel settled.</p>' +
      '<p><strong>So I wouldn’t work on the reaction without also helping you trust yourself again.</strong></p>',

    "Quiet the Alarm|Return to Yourself":
      '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>Based on your answers, two parts of this cycle are showing up strongly for you.</h1>' +
      '<p>Something happens with him and your body reacts.</p>' +
      '<p>Your system goes into alarm and it can take a long time to properly settle.</p>' +
      '<p>And while that is happening, too much of your attention is ending up with him.</p>' +
      '<p>Thinking. Waiting. Wondering. Replaying.</p>' +
      '<p><strong>And these two parts can feed each other.</strong></p>' +
      '<p>The more activated you feel, the more of your attention can disappear into what he is doing. And the more of your life gets organised around him, the harder it becomes for your system to properly come down.</p>' +
      '<p><strong>So we need to calm the alarm and start bringing your attention back to you.</strong></p>',

    "Break the Pull|Restore Self-Trust":
      '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>Based on your answers, two parts of this cycle are showing up strongly for you.</h1>' +
      '<p>You can know checking, replaying or reaching out isn’t going to help and still feel yourself getting pulled back in.</p>' +
      '<p>And then, even when you know what happened, you start questioning yourself.</p>' +
      '<p>Wondering whether you got it wrong. Whether you were too much. Whether you should change your mind.</p>' +
      '<p><strong>And these two parts can feed each other.</strong></p>' +
      '<p>The more you doubt yourself, the easier it becomes to get pulled back into checking and looking for another answer.</p>' +
      '<p>And every time you go back looking, you can end up questioning yourself all over again.</p>' +
      '<p><strong>So this isn’t about knowing more. We need to work on the pull and rebuild your trust in yourself.</strong></p>',

    "Break the Pull|Return to Yourself":
      '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>Based on your answers, two parts of this cycle are showing up strongly for you.</h1>' +
      '<p>You can know you need to leave it alone and still find yourself checking, replaying, waiting or wanting to reach out.</p>' +
      '<p>And while that pull keeps taking you back towards him, more and more of your attention gets taken away from your own life.</p>' +
      '<p><strong>These two parts can feed each other.</strong></p>' +
      '<p>The more you check and replay, the more space he occupies.</p>' +
      '<p>And the more space he occupies, the easier it becomes to get pulled back in again.</p>' +
      '<p><strong>So we need to interrupt the pull and start giving your own life more of you again.</strong></p>',

    "Restore Self-Trust|Return to Yourself":
      '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>Based on your answers, two parts of this cycle are showing up strongly for you.</h1>' +
      '<p>You know something doesn’t feel right and then find yourself questioning what you know.</p>' +
      '<p>Explaining things away. Changing your mind. Wondering whether you were wrong.</p>' +
      '<p>And while so much energy goes into second-guessing yourself and trying to work him out, your own life gets less and less of you.</p>' +
      '<p><strong>These two parts can feed each other.</strong></p>' +
      '<p>The less you trust yourself, the easier it becomes to organise your attention around him.</p>' +
      '<p>And the further you move away from yourself, the harder it becomes to hear your own judgement clearly.</p>' +
      '<p><strong>So we need to rebuild your trust in yourself and bring your attention back to your own life.</strong></p>'
  };

  function threeStageResultHtml(stages) {
    stages = orderedUnique(stages);
    var hasQuiet = stages.indexOf("Quiet the Alarm") !== -1;
    var hasPull = stages.indexOf("Break the Pull") !== -1;
    var hasTrust = stages.indexOf("Restore Self-Trust") !== -1;
    var hasReturn = stages.indexOf("Return to Yourself") !== -1;
    var html =
      '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>Based on your answers, this isn’t sitting in one isolated part of the cycle.</h1>';

    if (hasQuiet) {
      html += '<p>Something happens with him and your body reacts.</p>' +
        '<p>The alarm comes on quickly and can take a long time to properly settle.</p>';
    }
    if (hasPull) {
      html += '<p>' + (hasQuiet ? 'Then even when' : 'Even when') + ' you know checking, replaying or reaching out isn’t going to help, you can still feel yourself getting pulled back in.</p>';
    }
    if (hasTrust) {
      html += '<p>You start questioning yourself and what you already know.</p>' +
        '<p>You can know something doesn’t feel right and still find yourself explaining it away, wondering whether you were too much or whether you got it wrong.</p>';
    }
    if (hasReturn) {
      html += '<p>And while all of that is happening, too much of your attention is ending up with him instead of your own life.</p>';
    }

    html += '<p><strong>These parts can start feeding each other.</strong></p>';

    var key = pairKey(stages);
    var mechanism = {
      "Quiet the Alarm|Break the Pull|Restore Self-Trust":
        "The more activated you feel, the stronger the pull can become. The more you follow the pull, the more you can start questioning yourself. And the more you doubt yourself, the harder it becomes for your system to properly settle.",
      "Quiet the Alarm|Break the Pull|Return to Yourself":
        "The more activated you feel, the stronger the pull can become. The more you follow the pull, the more attention he takes up. And the more of your life gets organised around what he is doing, the harder it becomes to properly get free of the cycle.",
      "Quiet the Alarm|Restore Self-Trust|Return to Yourself":
        "The more activated you feel, the harder it can be to trust your own judgement. The more you question yourself, the more attention can disappear into him. And the further you move away from yourself, the harder it becomes to properly settle.",
      "Break the Pull|Restore Self-Trust|Return to Yourself":
        "The more you get pulled back in, the more you can start questioning yourself. The more you doubt yourself, the more attention can disappear into him. And the more space he takes up, the harder it becomes to hear yourself clearly."
    }[key] || "The more these parts feed each other, the harder it becomes to properly get free of the cycle.";

    html += '<p>' + mechanism + '</p>' +
      '<p>You can understand exactly why he behaves the way he does and still feel stuck in the same cycle.</p>' +
      '<p><strong>That’s why I wouldn’t treat this as one isolated problem. I’d work on the cycle.</strong></p>';

    return html;
  }

  function fourStageResultHtml() {
    return '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>Based on your answers, this isn’t sitting in one isolated part of the cycle.</h1>' +
      '<p>Something happens with him and your body reacts.</p>' +
      '<p>You get pulled back into checking, replaying, waiting or looking for another answer.</p>' +
      '<p>You start questioning yourself and what you already know.</p>' +
      '<p>And while all of that is happening, too much of your own life gets pushed into the background.</p>' +
      '<p><strong>These parts can keep feeding each other.</strong></p>' +
      '<p>The alarm can make the pull stronger.</p>' +
      '<p>The pull can keep you looking for answers.</p>' +
      '<p>The more you look for answers, the more you can question yourself.</p>' +
      '<p>And the more of your attention disappears into him, the less of you is left for your own life.</p>' +
      '<p>You can understand exactly why he behaves the way he does and still feel anxious, still check, still doubt yourself and still lose too much of your attention to him.</p>' +
      '<p><strong>That’s why I wouldn’t treat this as four separate problems. I’d work on the whole cycle.</strong></p>';
  }

  function resultSummaryHtml(stages) {
    stages = orderedUnique(stages);
    if (stages.length === 2) return PAIR_RESULT_COPY[pairKey(stages)] || "";
    if (stages.length === 3) return threeStageResultHtml(stages);
    if (stages.length >= 4) return fourStageResultHtml();
    return "";
  }

  function renderSelfGuided(container, stages, reasonText) {
    stages = orderedUnique(stages);

    container.innerHTML =
      '<span class="result-tag">YOUR RECOMMENDED NEXT STEP</span>' +
      '<p class="result-lede">I recommend the Complete Self-Guided Journey.</p>' +
      '<p>Something happens and your body reacts. Then you’re checking, replaying or looking for an answer. You start questioning what you already know. And while your mind is caught up in all of that, <strong>your own life gets less of you.</strong></p>' +
      '<p><strong>Does this sound like you?</strong></p>' +
      '<p>You might feel some parts more strongly than others. But they don’t always stay separate.</p>' +
      '<p><strong>One can keep pulling you back into another.</strong></p>' +
      '<p>And that’s why knowing what’s happening hasn’t necessarily been enough to change it.</p>' +
      '<p>You don’t need another explanation of avoidant attachment.</p>' +
      '<p><strong>You need to start working on what this pattern is doing to you.</strong></p>' +
      '<div class="divider"></div>' +
      '<p class="result-lede">That’s what the Complete Self-Guided Journey is for.</p>' +
      '<p>You work through four stages, <strong>one at a time</strong>:</p>' +
      '<p><strong>Quiet the Alarm</strong><br>Work on the thoughts and emotional responses underneath the anxiety and alarm.</p>' +
      '<p><strong>Break the Pull</strong><br>Work on what keeps pulling you into checking, replaying, reaching out or looking for another answer.</p>' +
      '<p><strong>Restore Self-Trust</strong><br>Work on the second-guessing that makes it difficult to trust what you already know.</p>' +
      '<p><strong>Return to Yourself</strong><br>Work on bringing your attention, energy and life back to you.</p>' +
      '<p class="result-lede">You have a clear structure, with check-ins to help you see your progress as you go.</p>' +
      '<p>You’ll work with each stage for <strong>21 days</strong>, with short check-ins along the way.</p>' +
      '<p><strong>You have a clear pathway to follow, with regular points to check in, notice what’s changing and keep moving through the work.</strong></p>' +
      '<p>And if you’re wondering whether this kind of work can actually change how you respond:</p>' +
      '<blockquote><strong>“For the first time in 5 weeks I was able to regulate my breathing and stop my racing heart and I actually slept.”</strong><br>C.J.</blockquote>' +
      '<blockquote><strong>“Took me out of my own head and helped calm the voice screaming at me to reach out.”</strong><br>K.</blockquote>' +
      '<blockquote><strong>“I’m slowly unraveling from years of survival mode. I’m finding my center and power again.”</strong><br>Sky</blockquote>' +
      '<p class="result-lede"><strong>The outcome?</strong></p>' +
      '<p><strong>Less checking and replaying.<br>Less second-guessing yourself.<br>More peace.<br>More trust in yourself.<br>More of you back in your own life.</strong></p>' +
      '<p><strong>Does this sound like what you need?</strong></p>' +
      '<p>You don’t have to leave him, be over him, or even know what’s going to happen between you to start working on what this dynamic is doing to you.</p>' +
      '<p><strong>Understanding the cycle is not the same as breaking it.</strong></p>' +
      '<p>Nothing changes if nothing changes.</p>' +
      '<p><strong>Are you ready to start feeling like yourself again?</strong></p>' +
      '<div class="cta-row"><a class="btn-cta" data-yms-self-guided href="' + SELF_GUIDED.url + '">START MY SELF-GUIDED JOURNEY - £117</a></div>' +
      downsellHtml(false);

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

  function bootcampGoalBridge(data) {
    var readiness = data && data.bootcampReadiness ? data.bootcampReadiness : {};
    var goalIndex = Number(readiness.goalIndex);

    if (goalIndex === 1) {
      return '<p>And when I asked what you actually want now, you told me you mainly want to understand him and what his behaviour means.</p>' +
        '<p><strong>You don’t have to stop wanting those answers before you start working on yourself.</strong></p>' +
        '<p>But understanding him cannot guarantee that the checking, replaying, panic or second-guessing will stop.</p>' +
        '<p><strong>What we can work on is what this situation is doing to you.</strong></p>' +
        '<p>And when I asked whether you could commit to doing that work, you said yes.</p>' +
        '<p><strong>That’s why I think you should start with the Bootcamp.</strong></p>';
    }

    if (goalIndex === 2) {
      return '<p>And when I asked what you actually want now, you told me part of you wants him back or wants his behaviour to change.</p>' +
        '<p><strong>You don’t have to pretend you don’t want that before you start.</strong></p>' +
        '<p>But I can’t promise to change him, bring him back or control what he does next.</p>' +
        '<p><strong>What we can work on is what this situation is doing to you.</strong></p>' +
        '<p>The checking. The replaying. The panic. The second-guessing. The amount of your life that has started revolving around what he does next.</p>' +
        '<p>And when I asked whether you could commit to doing that work, you said yes.</p>' +
        '<p><strong>That’s why I think you should start with the Bootcamp.</strong></p>';
    }

    if (goalIndex === 3) {
      return '<p>And when I asked what you actually want now, you told me you’re not sure yet.</p>' +
        '<p><strong>You do not have to have everything figured out before you start working on what this dynamic is doing to you.</strong></p>' +
        '<p>When I asked whether you could commit to doing that work, you said yes.</p>' +
        '<p><strong>That’s why I think you should start with the Bootcamp.</strong></p>';
    }

    return '<p>And when I asked what you actually want now, you chose:</p>' +
      '<p><strong>To work on yourself, break the cycle and get your mind back.</strong></p>' +
      '<p>That’s exactly what we’re going to work towards.</p>';
  }

  function renderBootcamp(container, stages, data) {
    stages = orderedUnique(stages);
    container.innerHTML =
      '<span class="result-tag">Based on what you’ve told me...</span>' +
      '<h1>I think you should start with the Bootcamp.</h1>' +
      '<p>This isn’t just affecting you in one place.</p>' +
      '<p>Something happens and your body reacts. Then you’re checking, replaying or looking for an answer. You start questioning what you already know. And while your mind is caught up in all of that, <strong>your own life gets less of you.</strong></p>' +
      '<p><strong>Does this sound like you?</strong></p>' +
      bootcampGoalBridge(data) +
      '<div class="divider"></div>' +
      '<p class="result-lede"><strong>Because knowing isn’t the problem.</strong></p>' +
      '<p>You probably already know what you <em>should</em> do.</p>' +
      '<p>Don’t check. Don’t reach out. Stop analysing. Stop going back. Focus on yourself.</p>' +
      '<p>But knowing what you should do and being able to do it <strong>when you’re actually in the feeling</strong> are two different things.</p>' +
      '<p><strong>That’s the part we’re going to work on.</strong></p>' +
      '<p class="result-lede">For 12 weeks, we’ll work through four stages.</p>' +
      '<p><strong>Quiet the Alarm → Break the Pull → Restore Self-Trust → Return to Yourself</strong></p>' +
      '<p>And the work is deliberately simple.</p>' +
      '<p><strong>Press play. Write. Check in. Come back.</strong></p>' +
      '<p>You’ll use the guided <strong>Cognitive Behavioral Hypnotherapy</strong> audios throughout each stage.</p>' +
      '<p>Every week, I’ll give you <strong>one writing prompt</strong> connected to the stage you’re working on. Over the 12 weeks, you’ll start putting together the story of <strong>where you’ve been, where you are now and where you want to go next.</strong></p>' +
      '<p>Not more analysing him.</p>' +
      '<p><strong>Understanding yourself. Seeing your own patterns more clearly and building a different story about what happens next.</strong></p>' +
      '<p>Your short check-ins give you somewhere to <strong>notice and track what’s actually changing</strong>, rather than relying on whether you happen to feel better or worse that day.</p>' +
      '<p>So if you’re someone who worries:</p>' +
      '<p><strong>“What if I don’t stick with it?”</strong></p>' +
      '<p>You’re not being asked to figure out a whole programme by yourself.</p>' +
      '<p><strong>You have something to do, somewhere to check in and somewhere to come back to each week.</strong></p>' +
      '<p class="result-lede">And every three weeks, we come together live.</p>' +
      '<p>This is where we talk about what we’ve been learning about ourselves, what has come up and what we’re taking into the next stage.</p>' +
      '<p>You’ll be doing that alongside other women who are <strong>switched on, self-aware and ready to stop making their lives about understanding somebody else and start moving into the next chapter of their own.</strong></p>' +
      '<p>It’s also the opportunity to realise:</p>' +
      '<p><strong>I’m not the only woman who knows better and still finds this hard. And I don’t have to work through it on my own.</strong></p>' +
      '<blockquote><strong>“For the first time in 5 weeks I was able to regulate my breathing and stop my racing heart and I actually slept.”</strong><br>C.J.</blockquote>' +
      '<blockquote><strong>“Took me out of my own head and helped calm the voice screaming at me to reach out.”</strong><br>K.</blockquote>' +
      '<blockquote><strong>“I’m slowly unraveling from years of survival mode. I’m finding my center and power again.”</strong><br>Sky</blockquote>' +
      '<p class="result-lede"><strong>What are we working towards?</strong></p>' +
      '<p><strong>Less checking and replaying.<br>Less second-guessing yourself.<br>More peace.<br>More trust in yourself.<br>More of you back in your own life.</strong></p>' +
      '<p><strong>Does this sound like what you need?</strong></p>' +
      '<p>You don’t have to leave him, be over him, or know what’s going to happen between you to start.</p>' +
      '<p><strong>You can still love somebody and stop losing yourself in what they do, or what they did.</strong></p>' +
      '<p class="result-lede"><strong>Bootcamp</strong></p>' +
      '<p><strong>12 weeks · Starts Sunday 4 October 2026</strong></p>' +
      '<p><strong>£297 or 3 monthly payments of £105</strong></p>' +
      '<p>Understanding the cycle is not the same as breaking it.</p>' +
      '<p><strong>Nothing changes if nothing changes.</strong></p>' +
      '<p class="result-lede"><strong>Are you ready to start feeling like yourself again, with guided support to help you get there?</strong></p>' +
      '<div class="cta-row"><a class="btn-cta" data-yms-bootcamp href="' + BOOTCAMP + '">JOIN THE BOOTCAMP - £297</a></div>' +
      '<div style="margin-top:42px;padding-top:22px;border-top:1px solid rgba(36,61,46,.12);font-size:.94em;opacity:.9;">' +
        '<p style="margin-bottom:8px;"><strong>Prefer to work privately?</strong></p>' +
        '<p style="margin-top:0;">The <strong>Complete Self-Guided Journey</strong> gives you the same four-stage structure without the group support or live integration calls.</p>' +
        '<p style="margin-bottom:0;"><a data-yms-self-alt href="' + SELF_GUIDED.url + '">See the self-guided option - £117</a></p>' +
      '</div>';

    logRoute("Bootcamp", "Bootcamp");
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

    // This is an intermediate gate, not a final recommendation. Record it
    // separately so a blank Final Recommendation means the visitor did not
    // finish the gate, rather than a tracking failure.
    recordJourney("readiness_gate_viewed", {
      total_score: total,
      qualifying_stage_count: stages.length
    });

    function routeFromReadiness(readiness) {
      // Goal tells us where her attention is. Commitment tells us whether she is
      // willing to participate. Still wanting answers about him, or wanting the
      // relationship to change, does not automatically mean she is not ready
      // to work on herself.
      if (readiness.commitmentAligned) {
        renderBootcamp(container, stages, data);
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
      '<p class="result-lede" style="margin-top:0;"><strong>Before I recommend the best way for you to work through it, I need to know two things.</strong></p>' +
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

/* Your Mind Story quiz product routing — active-stage ladder.
   Routing only. Quiz scoring remains unchanged.
   0 active -> existing Bare Minimum route
   1 active -> existing single-audio route
   2 active -> exact £74 pair
   3-4 active -> Complete Self-Guided Journey £117
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

  function canonicalStage(name) {
    name = String(name || "").trim();
    if (name === "Restore Self Trust") return "Restore Self-Trust";
    return name;
  }

  function activeStagesFromData(data) {
    data = data || {};
    var source = [];
    if (Array.isArray(data.activeStages) && data.activeStages.length) {
      source = data.activeStages.slice();
    } else {
      if (Array.isArray(data.leadingPatterns)) source = source.concat(data.leadingPatterns);
      if (Array.isArray(data.secondaryActivePatterns)) source = source.concat(data.secondaryActivePatterns);
      if (!source.length && Array.isArray(data.tiedResults)) source = source.concat(data.tiedResults);
      if (!source.length && data.primaryResult) source.push(data.primaryResult);
    }

    var seen = {};
    source.forEach(function (item) {
      var stage = canonicalStage(item);
      if (STAGE_ORDER.indexOf(stage) !== -1) seen[stage] = true;
    });
    return STAGE_ORDER.filter(function (stage) { return seen[stage]; });
  }

  function pairKey(stages) {
    return stages.slice().sort(function (a, b) {
      return STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b);
    }).join("|");
  }

  function renderPair(container, stages) {
    var pair = PAIRS[pairKey(stages)];
    if (!pair) return false;

    var first = stages[0];
    var second = stages[1];
    container.innerHTML =
      '<div class="divider"></div>' +
      '<span class="og-label">YOUR RECOMMENDED NEXT STEP</span>' +
      '<p class="result-lede" style="margin-top:0;">I recommend ' + Y.escapeText(pair.name) + '.</p>' +
      '<p>Your result shows that <strong>both of these parts of the cycle are active</strong>, so I would not ask you to choose one and ignore the other.</p>' +
      '<p>You get both stages in one pathway, but you do not work on them at the same time.</p>' +
      '<p><strong>Start with ' + Y.escapeText(first) + '.</strong> Work with that stage for 21 days and complete its check-ins. Then move to <strong>' + Y.escapeText(second) + '</strong> for the next 21 days.</p>' +
      '<p>The order is deliberate. You are not being given two audios and left to work out where to begin.</p>' +
      '<div class="cta-row"><a class="btn-cta" id="ymsPairCta" href="' + pair.url + '">START MY TWO-STAGE PATHWAY — £74</a></div>';

    var cta = document.getElementById("ymsPairCta");
    if (cta && Y.track) cta.addEventListener("click", function () {
      Y.track("quiz_pair_recommendation_click", { pair: pair.name, first_stage: first, second_stage: second });
    });
    return true;
  }

  function renderSelfGuided(container, stages) {
    container.innerHTML =
      '<div class="divider"></div>' +
      '<span class="og-label">YOUR RECOMMENDED NEXT STEP</span>' +
      '<p class="result-lede" style="margin-top:0;">I recommend the Complete Self-Guided Journey.</p>' +
      '<p>Your result shows that <strong>several parts of the cycle are active at the same time</strong>. I would not point you towards one standalone audio when the work needs to go across the wider pattern.</p>' +
      '<p>You get the complete four-stage pathway and work through it in this order:</p>' +
      '<ol class="og-steps">' +
        '<li><strong>Quiet the Alarm</strong></li>' +
        '<li><strong>Break the Pull</strong></li>' +
        '<li><strong>Restore Self-Trust</strong></li>' +
        '<li><strong>Return to Yourself</strong></li>' +
      '</ol>' +
      '<p><strong>Start with Quiet the Alarm.</strong> Work through one stage at a time rather than jumping between the audios.</p>' +
      '<p>This is the self-guided route: the four core stages and their check-ins, without the Bootcamp live-support layer.</p>' +
      '<div class="cta-row"><a class="btn-cta" id="ymsSelfGuidedCta" href="' + SELF_GUIDED.url + '">START MY SELF-GUIDED JOURNEY — £117</a></div>';

    var cta = document.getElementById("ymsSelfGuidedCta");
    if (cta && Y.track) cta.addEventListener("click", function () {
      Y.track("quiz_self_guided_recommendation_click", { active_stage_count: stages.length });
    });
    return true;
  }

  Y.activeStagesFromResult = activeStagesFromData;

  Y.mountRecommendationV1 = function (containerId, resultBucketKey) {
    var data = Y.getResultData ? (Y.getResultData() || {}) : {};
    var stages = activeStagesFromData(data);
    var container = document.getElementById(containerId);

    if (container && stages.length === 2 && renderPair(container, stages)) return;
    if (container && stages.length >= 3 && renderSelfGuided(container, stages)) return;

    originalMount(containerId, resultBucketKey);
  };
})(window);

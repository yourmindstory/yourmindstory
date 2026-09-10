/* YMS quiz result copy layer, 10 Sep 2026.
   Copy-only/result-presentation layer. Scoring and recommendation thresholds
   remain in the existing quiz/shared engine. */
(function (global) {
  "use strict";

  var Y = global.YMSQuiz;
  if (!Y) return;

  var originalMountRecommendation = Y.mountRecommendationV1;
  var QUIZ_BACKEND_URL = "https://script.google.com/macros/s/AKfycbx07a1k3XYK_jvTYQDtwq3zu-LZYpe8FgvvHvnd5WXiI7M8nw5YaMqiQCJ-AUfRYu54/exec";

  var AUDIO_COPY = {
    "Quiet the Alarm": {
      url: "https://payhip.com/b/53N2B",
      rationale: "It's a guided Cognitive Behavioural Hypnotherapy audio designed to help you work with that automatic alarm response, so something happening with him doesn't have to hijack your whole body and the rest of your day.",
      quote: "For the first time in 5 weeks I was able to regulate my breathing and stop my racing heart and I actually slept.",
      attribution: "CeeJayMayDay",
      cta: "START WITH QUIET THE ALARM"
    },
    "Break the Pull": {
      url: "https://payhip.com/b/N8hbz",
      rationale: "It's a guided Cognitive Behavioural Hypnotherapy audio designed to work on the automatic pull underneath the checking, reaching out, replaying and going back, so what you know has a better chance of becoming what you actually do.",
      quote: "Took me out of my own head and helped calm the voice screaming at me to reach out.",
      attribution: "K",
      cta: "START WITH BREAK THE PULL"
    },
    "Restore Self-Trust": {
      url: "https://payhip.com/b/3RlF7",
      rationale: "It's a guided Cognitive Behavioural Hypnotherapy audio designed to help you work on the beliefs and automatic responses that keep pulling you away from your own judgement, so you can start relying on yourself again.",
      quote: "I'm slowly unraveling from years of survival mode. I'm finding my center and power again.",
      attribution: "Sky",
      cta: "START WITH RESTORE SELF-TRUST"
    },
    "Return to Yourself": {
      url: "https://payhip.com/b/6pE8S",
      rationale: "It's a guided Cognitive Behavioural Hypnotherapy audio designed to help bring your attention, energy and sense of self back to you, so your life stops revolving around what is happening with him.",
      quote: "I'm slowly unraveling from years of survival mode. I'm finding my center and power again.",
      attribution: "Sky",
      cta: "START WITH RETURN TO YOURSELF"
    }
  };

  var MIXED_DESCRIPTIONS = {
    "Quiet the Alarm": "Your body is reacting to what happens, and once that alarm starts it can be difficult to fully settle again.",
    "Break the Pull": "You keep getting pulled back into him or the situation: checking, texting, replaying, analysing, looking for signs or trying to understand what is happening.",
    "Restore Self-Trust": "What happens with him is making it harder to trust your own read of things and the decisions you make for yourself.",
    "Return to Yourself": "You have started losing connection with yourself, or parts of your own life, needs and priorities have moved into the background."
  };

  function canonicalStage(stageName) {
    if (stageName === "Restore Self Trust") return "Restore Self-Trust";
    return stageName || "";
  }

  function recordMixedSelection(data, selectedStage) {
    if (!data || !data.resultToken) return;
    fetch(QUIZ_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "recordMixedSelection",
        resultToken: data.resultToken,
        selectedStage: selectedStage
      })
    }).catch(function () {});
  }

  function renderAudioRecommendation(container, stageName) {
    stageName = canonicalStage(stageName);
    var copy = AUDIO_COPY[stageName];
    if (!copy) {
      originalMountRecommendation(container.id);
      return;
    }

    container.innerHTML =
      '<div class="divider"></div>' +
      '<span class="og-label">YOUR RECOMMENDED NEXT STEP</span>' +
      '<p class="result-lede" style="margin-top:0;">I recommend ' + stageName + '.</p>' +
      '<p>' + copy.rationale + '</p>' +
      '<div class="og-secondary" style="margin-top:22px;">' +
        '<p><strong>&ldquo;' + copy.quote + '&rdquo;</strong></p>' +
        '<p class="cta-microcopy" style="margin-bottom:0;">' + copy.attribution + '</p>' +
      '</div>' +
      '<div class="cta-row">' +
        '<a class="btn-cta" href="' + copy.url + '" id="ymsAudioRecommendationCta">' + copy.cta + '</a>' +
      '</div>';

    var cta = document.getElementById("ymsAudioRecommendationCta");
    if (cta) {
      cta.addEventListener("click", function () {
        Y.track("quiz_audio_recommendation_click", { selected_stage: stageName });
      });
    }
  }

  function renderMixedClarification(container, data) {
    var tied = (data && data.tiedResults) || [];
    var valid = tied.map(canonicalStage).filter(function (name) {
      return !!AUDIO_COPY[name];
    });

    if (!valid.length) {
      originalMountRecommendation(container.id);
      return;
    }

    var options = valid.map(function (name, i) {
      return '<label class="fc-option" for="ymsMixedCopy_' + i + '">' +
        '<input type="radio" name="ymsMixedCopy" id="ymsMixedCopy_' + i + '" value="' + i + '">' +
        '<span class="fc-option-text"><strong>' + name + '</strong><br>' + MIXED_DESCRIPTIONS[name] + '</span>' +
        '<span class="fc-option-mark" aria-hidden="true"></span>' +
      '</label>';
    }).join("");

    container.innerHTML =
      '<div class="divider"></div>' +
      '<span class="og-label">ONE QUICK QUESTION</span>' +
      '<p class="result-lede">Your scores are genuinely split between these areas. Rather than guess which one matters more to you, which is taking more from you right now?</p>' +
      '<div class="fc-options" id="ymsMixedCopyOptions" role="radiogroup">' + options + '</div>' +
      '<div class="cta-row"><button type="button" class="btn-cta" id="ymsMixedCopyContinue" disabled>CONTINUE</button></div>';

    var selected = null;
    var btn = document.getElementById("ymsMixedCopyContinue");
    var wrap = document.getElementById("ymsMixedCopyOptions");

    wrap.addEventListener("change", function (e) {
      if (!e.target || e.target.type !== "radio") return;
      selected = valid[parseInt(e.target.value, 10)];
      Array.prototype.forEach.call(wrap.querySelectorAll(".fc-option"), function (el) {
        el.classList.remove("selected");
      });
      var label = e.target.closest(".fc-option");
      if (label) label.classList.add("selected");
      btn.disabled = !selected;
    });

    btn.addEventListener("click", function () {
      if (!selected) return;
      data.recommendedStage = selected;
      data.mixedClarificationSelection = selected;
      data.mixedClarificationRequired = false;
      Y.setResultData(data);
      Y.track("quiz_mixed_clarification", { selected_stage: selected });
      recordMixedSelection(data, selected);
      renderAudioRecommendation(container, selected);
    });
  }

  function renderBootcampResult(container, data) {
    var card = container.closest ? container.closest(".result-card") : null;
    if (!card) card = container;

    card.innerHTML =
      '<p class="result-greeting" id="bootcampGreeting" hidden data-clarity-mask="True"></p>' +
      '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>This isn\'t just one part of the cycle anymore.</h1>' +
      '<p>Your answers show that <strong>several parts of it are affecting you at the same time.</strong></p>' +
      '<p>Your body reacts.</p>' +
      '<p>Your mind goes into the loop.</p>' +
      '<p>You check, replay, wait and look for signs.</p>' +
      '<p>You get pulled back towards him even when you know better.</p>' +
      '<p>You question yourself and the decisions you\'ve already made.</p>' +
      '<p>And while all of that is happening, <strong>your own life is getting less and less of you.</strong></p>' +
      '<p>Because this isn\'t only costing you your peace.</p>' +
      '<p><strong>It\'s costing you hours. Your attention. Your plans. Your confidence. Time in your own life that you don\'t get back.</strong></p>' +
      '<p>And let\'s face it, at this point you\'re basically an expert on him.</p>' +
      '<p>You\'ve watched the videos. Thought it through. Tried to understand what happened, why he does what he does and what it all means.</p>' +
      '<p><strong>But knowing hasn\'t stopped what happens next.</strong></p>' +
      '<p>You can know exactly what you should do and still find yourself right back in the loop.</p>' +
      '<p>And that\'s the problem.</p>' +
      '<p>You don\'t need more information about him.</p>' +
      '<p><strong>You need to stop this cycle running your body, your mind and your life.</strong></p>' +
      '<p>So you can have a normal day again.</p>' +
      '<p>Get through the day on your own terms.</p>' +
      '<p>Stop losing hours to overthinking and endless scenarios.</p>' +
      '<p>Make plans for yourself.</p>' +
      '<p>Trust yourself again.</p>' +
      '<p>Feel like yourself again.</p>' +
      '<p class="result-lede"><strong>Basically, you want your mind and your life back.</strong></p>' +

      '<div class="divider"></div>' +
      '<span class="og-label">YOUR RECOMMENDED NEXT STEP</span>' +
      '<p class="result-lede" style="margin-top:0;">I recommend the Your Mind Story Bootcamp.</p>' +
      '<p>I wouldn\'t point you towards one audio when your results are showing me that <strong>this is affecting you across several areas.</strong></p>' +
      '<p>That\'s why we work through the whole cycle.</p>' +
      '<ul class="og-steps">' +
        '<li><span class="og-step-label">Step 1: Quiet the Alarm</span><span class="og-step-desc">Work on the physical and emotional reaction.</span></li>' +
        '<li><span class="og-step-label">Step 2: Break the Pull</span><span class="og-step-desc">Work on the checking, replaying, waiting and getting pulled back in.</span></li>' +
        '<li><span class="og-step-label">Step 3: Restore Self-Trust</span><span class="og-step-desc">Start trusting what you know and following through on the decisions you make for yourself.</span></li>' +
        '<li><span class="og-step-label">Step 4: Return to Yourself</span><span class="og-step-desc">Put your attention, plans and life back where they belong. With you.</span></li>' +
      '</ul>' +
      '<p><strong>This isn\'t another 12 weeks of analysing him.</strong></p>' +
      '<p>You\'ve done enough of that.</p>' +
      '<p><strong>The focus is you.</strong></p>' +
      '<p>And because you\'re already carrying enough, I\'ve deliberately kept the process simple.</p>' +
      '<p class="result-lede"><strong>Your main daily job is to press play.</strong></p>' +
      '<p>You\'ll also complete one short Your Mind Story reflection and check-in each week, so you can actually see what\'s changing as you go.</p>' +
      '<div class="og-secondary" style="margin-top:20px;">' +
        '<p><strong>&ldquo;They\'re like an online journal to track how you feel as you go on. And it\'s good to see how you felt in the past cos it keeps you motivated.&rdquo;</strong></p>' +
        '<p class="cta-microcopy" style="margin-bottom:0;">Miso</p>' +
      '</div>' +
      '<p>Then every three weeks, we come together for a group integration call.</p>' +
      '<div class="og-secondary" style="margin-top:20px;">' +
        '<p><strong>&ldquo;The loop of him playing in my head is wearing off. I\'m gaining my nervous system back.&rdquo;</strong></p>' +
        '<p class="cta-microcopy" style="margin-bottom:0;">Kimberly</p>' +
      '</div>' +
      '<p>That is the kind of movement we\'re working towards. Less of him taking over your head. More of you getting yourself back.</p>' +

      '<div class="divider"></div>' +
      '<p class="result-lede"><strong>12 weeks. 4 steps. One goal: Take your life back.</strong></p>' +
      '<div class="price-card">' +
        '<span class="og-label" style="margin-bottom:6px;">Original Group &bull; 2026</span>' +
        '<p class="price-start">Starts Sunday 4 October 2026</p>' +
        '<p class="price-figure">£297 <span class="price-unit">in full</span></p>' +
        '<p class="price-or">or</p>' +
        '<p class="price-installments">3 monthly payments of £105</p>' +
      '</div>' +
      '<div class="cta-row">' +
        '<a class="btn-cta" href="https://payhip.com/b/ZhPkp" id="ymsBootcampRecommendationCta">JOIN THE ORIGINAL GROUP</a>' +
      '</div>' +
      '<p class="cta-microcopy" style="margin-top:18px;">★★★★★ 5 stars on Google<br><strong>Cognitive Behavioural Hypnotherapist</strong></p>';

    var greeting = document.getElementById("bootcampGreeting");
    var firstName = data && data.firstName ? String(data.firstName).trim() : "";
    if (greeting && firstName) {
      greeting.textContent = "Hi, " + firstName + ".";
      greeting.hidden = false;
    }

    var cta = document.getElementById("ymsBootcampRecommendationCta");
    if (cta) {
      cta.addEventListener("click", function () {
        Y.track("quiz_bootcamp_recommendation_click", {});
      });
    }
  }

  Y.mountRecommendationV1 = function (containerId, resultBucketKey) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var data = Y.getResultData() || {};
    var level = data.recommendationLevel || "";

    if (level === "bootcamp_level") {
      renderBootcampResult(container, data);
      return;
    }

    if (level === "audio_first") {
      if (data.resultType === "mixed" && data.mixedClarificationRequired && !data.mixedClarificationSelection) {
        renderMixedClarification(container, data);
        return;
      }
      renderAudioRecommendation(
        container,
        data.mixedClarificationSelection || data.recommendedStage || data.primaryResult || ""
      );
      return;
    }

    originalMountRecommendation(containerId, resultBucketKey);
  };
})(window);

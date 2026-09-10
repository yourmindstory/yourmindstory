/* YMS quiz result copy layer. Finalised 10 Sep 2026.
   Presentation only: existing quiz scoring, thresholds and routing stay unchanged. */
(function (global) {
  "use strict";

  var Y = global.YMSQuiz;
  if (!Y || !Y.mountRecommendationV1) return;

  var originalMountRecommendation = Y.mountRecommendationV1;

  var BUCKET_TO_STAGE = {
    "quiet-the-alarm": "Quiet the Alarm",
    "break-the-pull": "Break the Pull",
    "restore-self-trust": "Restore Self-Trust",
    "return-to-yourself": "Return to Yourself"
  };

  var AUDIO_RESULTS = {
    "Quiet the Alarm": {
      url: "https://payhip.com/b/53N2B",
      cta: "START WITH QUIET THE ALARM",
      html:
        '<p class="result-lede" style="margin-top:0;">I recommend Quiet the Alarm.</p>' +
        '<p>Your answers are showing me that your body is reacting strongly to what happens with him.</p>' +
        '<p>He goes quiet. Something changes. You see something you weren\'t expecting. And suddenly your body is on alert.</p>' +
        '<p>Your heart races. Your chest tightens. You feel sick, restless, panicky or completely unable to settle.</p>' +
        '<p>And even when your mind understands what is happening, your body can stay stuck there.</p>' +
        '<p>You can know why he pulls away. You can understand the pattern. You can tell yourself not to panic.</p>' +
        '<p>But knowing why it is happening does not necessarily stop your body reacting when it happens.</p>' +
        '<p>And that reaction costs you.</p>' +
        '<p>Your sleep. Your concentration. Your appetite. Your peace. Hours of your day that you don\'t get back.</p>' +
        '<p>You don\'t need another explanation of him.</p>' +
        '<p><strong>You need to be able to switch that shit off and take your life back.</strong></p>' +
        '<p>That\'s why I recommend Quiet the Alarm.</p>' +
        '<p>It\'s a guided Cognitive Behavioural Hypnotherapy audio designed to help you work with that automatic alarm response, so something happening with him doesn\'t have to hijack your whole body and the rest of your day.</p>' +
        '<div class="og-secondary" style="margin-top:22px;"><p><strong>&ldquo;For the first time in 5 weeks I was able to regulate my breathing and stop my racing heart and I actually slept.&rdquo;</strong></p><p class="cta-microcopy" style="margin-bottom:0;">CeeJayMayDay</p></div>'
    },
    "Break the Pull": {
      url: "https://payhip.com/b/N8hbz",
      cta: "START WITH BREAK THE PULL",
      html:
        '<p class="result-lede" style="margin-top:0;">I recommend Break the Pull.</p>' +
        '<p>Your answers are showing me that you already know what you need to stop doing, but knowing hasn\'t been enough to make you stop.</p>' +
        '<p>You check.</p>' +
        '<p>You replay conversations.</p>' +
        '<p>You wonder what he meant.</p>' +
        '<p>You tell yourself you\'re not going to message, look, analyse or go over it again.</p>' +
        '<p>Then something happens and you\'re right back in it.</p>' +
        '<p>That\'s what makes this so frustrating.</p>' +
        '<p>Your logical mind knows one thing, but in the moment you get sucked right back in and the pull feels stronger than what you know.</p>' +
        '<p>And every time that happens, he gets your attention again.</p>' +
        '<p>Your time. Your headspace. Your energy.</p>' +
        '<p>Even when you don\'t want to give it to him.</p>' +
        '<p>Again. And again. And again.</p>' +
        '<p>And you know I\'m not exaggerating.</p>' +
        '<p>Another video trying to decode him.</p>' +
        '<p>Replaying what happened.</p>' +
        '<p>Checking for something you already know probably isn\'t going to give you the answer you\'re looking for.</p>' +
        '<p>You don\'t need more information about why he does what he does.</p>' +
        '<p><strong>You need to stop getting pulled back into his vortex.</strong></p>' +
        '<p>That\'s why I recommend Break the Pull.</p>' +
        '<p>It\'s a guided Cognitive Behavioural Hypnotherapy audio designed to work on the automatic pull underneath the checking, reaching out, replaying and going back, so what you know has a better chance of becoming what you actually do.</p>' +
        '<div class="og-secondary" style="margin-top:22px;"><p><strong>&ldquo;Took me out of my own head and helped calm the voice screaming at me to reach out.&rdquo;</strong></p><p class="cta-microcopy" style="margin-bottom:0;">K</p></div>'
    },
    "Restore Self-Trust": {
      url: "https://payhip.com/b/3RlF7",
      cta: "START WITH RESTORE SELF-TRUST",
      html:
        '<p class="result-lede" style="margin-top:0;">I recommend Restore Self-Trust.</p>' +
        '<p>Your answers are showing me that somewhere along the way, you stopped trusting yourself.</p>' +
        '<p>You know something doesn\'t feel right.</p>' +
        '<p>Then you question it.</p>' +
        '<p>You make a decision.</p>' +
        '<p>Then you talk yourself out of it.</p>' +
        '<p>You know what you saw, what you felt or what you need, but somehow you still end up wondering whether you\'re overreacting, whether you\'ve got it wrong or whether you should give it another chance.</p>' +
        '<p>That is exhausting because now you\'re not only dealing with what is happening with him.</p>' +
        '<p>You\'re also fighting with yourself about what you know.</p>' +
        '<p>And you do not need another talking therapy session where you spend 45 minutes of the 50 minutes talking about him, and five minutes talking about the rest of your life.</p>' +
        '<p>You don\'t need another person to tell you what he meant.</p>' +
        '<p><strong>You need to be able to hear yourself again and trust what you know.</strong></p>' +
        '<p>That\'s why I recommend Restore Self-Trust.</p>' +
        '<p>It\'s a guided Cognitive Behavioural Hypnotherapy audio designed to help you work on the beliefs and automatic responses that keep pulling you away from your own judgement, so you can start relying on yourself again.</p>' +
        '<div class="og-secondary" style="margin-top:22px;"><p><strong>&ldquo;I\'m slowly unraveling from years of survival mode. I\'m finding my center and power again.&rdquo;</strong></p><p class="cta-microcopy" style="margin-bottom:0;">Sky</p></div>'
    },
    "Return to Yourself": {
      url: "https://payhip.com/b/6pE8S",
      cta: "START WITH RETURN TO YOURSELF",
      html:
        '<p class="result-lede" style="margin-top:0;">I recommend Return to Yourself.</p>' +
        '<p>Your answers are showing me that this relationship has started taking up too much of your life.</p>' +
        '<p>Not only when you\'re actually with him.</p>' +
        '<p>When you\'re waiting.</p>' +
        '<p>When you\'re checking.</p>' +
        '<p>When you\'re replaying what happened.</p>' +
        '<p>When you\'re thinking about what might happen next.</p>' +
        '<p>When you\'re imagining the conversation, the apology, the reunion or the version of the relationship you keep hoping you might eventually have.</p>' +
        '<p>In reality or in your imagination, so much of your attention keeps ending up back there.</p>' +
        '<p>And meanwhile, your own life can start to feel strangely hollow.</p>' +
        '<p>You\'re doing the things you\'re supposed to do, but you\'re not fully in them.</p>' +
        '<p>Your plans get pushed back.</p>' +
        '<p>The things that used to matter to you get less of you.</p>' +
        '<p>And without really deciding to, you can end up putting parts of your life on hold while you wait to see what happens with him.</p>' +
        '<p>You don\'t need another way to understand the relationship.</p>' +
        '<p><strong>You need to become the centre of your own life again.</strong></p>' +
        '<p>That\'s why I recommend Return to Yourself.</p>' +
        '<p>It\'s a guided Cognitive Behavioural Hypnotherapy audio designed to help bring your attention, energy and sense of self back to you, so your life stops revolving around what is happening with him.</p>' +
        '<div class="og-secondary" style="margin-top:22px;"><p><strong>&ldquo;I\'m slowly unraveling from years of survival mode. I\'m finding my center and power again.&rdquo;</strong></p><p class="cta-microcopy" style="margin-bottom:0;">S.</p></div>'
    }
  };

  function canonicalStage(name) {
    if (name === "Restore Self Trust") return "Restore Self-Trust";
    return name || "";
  }

  function renderAudio(container, stage) {
    stage = canonicalStage(stage);
    var copy = AUDIO_RESULTS[stage];
    if (!copy) return false;

    container.innerHTML =
      '<div class="divider"></div>' +
      '<span class="og-label">YOUR RECOMMENDED NEXT STEP</span>' +
      copy.html +
      '<div class="cta-row"><a class="btn-cta" href="' + copy.url + '" id="ymsFinalAudioCta">' + copy.cta + '</a></div>';

    var cta = document.getElementById("ymsFinalAudioCta");
    if (cta) cta.addEventListener("click", function () {
      Y.track("quiz_audio_recommendation_click", { selected_stage: stage });
    });
    return true;
  }

  function renderBootcamp(container, data) {
    var card = container.closest ? container.closest(".result-card") : null;
    if (!card) card = container;
    var firstName = data && data.firstName ? String(data.firstName).trim() : "";

    card.innerHTML =
      (firstName ? '<p class="result-greeting">Hi, ' + Y.escapeText(firstName) + '.</p>' : '') +
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
      '<div class="og-secondary" style="margin-top:20px;"><p><strong>&ldquo;They\'re like an online journal to track how you feel as you go on. And it\'s good to see how you felt in the past cos it keeps you motivated.&rdquo;</strong></p><p class="cta-microcopy" style="margin-bottom:0;">Miso</p></div>' +
      '<p>Then every three weeks, we come together for a group integration call.</p>' +
      '<div class="og-secondary" style="margin-top:20px;"><p><strong>&ldquo;The loop of him playing in my head is wearing off. I\'m gaining my nervous system back.&rdquo;</strong></p><p class="cta-microcopy" style="margin-bottom:0;">Kimberly</p></div>' +
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
      '<div class="cta-row"><a class="btn-cta" href="https://payhip.com/b/ZhPkp" id="ymsFinalBootcampCta">JOIN THE ORIGINAL GROUP</a></div>' +
      '<p class="cta-microcopy" style="margin-top:18px;">★★★★★ 5 stars on Google<br><strong>Cognitive Behavioural Hypnotherapist</strong></p>';

    var cta = document.getElementById("ymsFinalBootcampCta");
    if (cta) cta.addEventListener("click", function () {
      Y.track("quiz_bootcamp_recommendation_click", {});
    });
  }

  Y.mountRecommendationV1 = function (containerId, resultBucketKey) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var data = Y.getResultData() || {};
    var level = data.recommendationLevel || "";

    if (level === "bootcamp_level") {
      renderBootcamp(container, data);
      return;
    }

    if (level === "audio_first" && data.resultType !== "mixed") {
      var stage = canonicalStage(data.recommendedStage || BUCKET_TO_STAGE[resultBucketKey] || "");
      if (renderAudio(container, stage)) return;
    }

    originalMountRecommendation(containerId, resultBucketKey);
  };
})(window);

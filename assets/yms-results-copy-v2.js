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
      url: "https://stan.store/YourMindStory/p/quiet-the-alarm",
      cta: "START WITH QUIET THE ALARM",
      html:
        '<p class="result-lede" style="margin-top:0;">I recommend Quiet the Alarm.</p>' +
        '<p>Quiet the Alarm is a guided Cognitive Behavioral Hypnotherapy audio designed to help you work on the <strong>thoughts and emotional responses underneath that alarm.</strong></p>' +
        '<p>Because the goal isn\'t to understand him better or force yourself to stop thinking about him.</p>' +
        '<p>It\'s being able to think about him, remember something, or notice something has changed <strong>without it taking the next few hours of your day with it.</strong></p>' +
        '<p><strong>Less spiralling. Less searching for an answer. Less of your peace depending on him.</strong></p>' +
        '<p>More being able to settle yourself and get on with your day.</p>' +
        '<p>You don\'t have to leave him, be over him, or even know what\'s going to happen between you to start working on what this dynamic is doing to you.</p>' +
        '<p><strong>You don\'t need another explanation of the pattern. You need to start working on the part that keeps reacting even when you know better.</strong></p>' +
        '<div class="og-secondary" style="margin-top:22px;"><p><strong>&ldquo;For the first time in 5 weeks I was able to regulate my breathing and stop my racing heart and I actually slept.&rdquo;</strong></p><p class="cta-microcopy" style="margin-bottom:0;">C.J.</p></div>' +
        '<p>You\'ll work with Quiet the Alarm for <strong>21 days</strong>, with simple check-ins along the way so you can notice what\'s changing rather than having to guess whether it\'s helping.</p>'
    },
    "Break the Pull": {
      url: "https://stan.store/YourMindStory/p/break-the-pull",
      cta: "START WITH BREAK THE PULL",
      html:
        '<p class="result-lede" style="margin-top:0;">I recommend Break the Pull.</p>' +
        '<p>Break the Pull is a guided Cognitive Behavioral Hypnotherapy audio designed to help you work on the <strong>thoughts, urges and learned responses underneath that pull.</strong></p>' +
        '<p>Because the problem isn\'t that you don\'t know you should leave it alone.</p>' +
        '<p><strong>It\'s what happens in the moment when the pull feels stronger than what you know.</strong></p>' +
        '<p>The goal is being able to feel that urge <strong>without automatically having to follow it.</strong></p>' +
        '<p>Less checking. Less replaying. Less searching for the thing that will finally make it all make sense.</p>' +
        '<p><strong>Less of your attention being pulled back towards him when you don\'t want it to be.</strong></p>' +
        '<p>More being able to leave it alone and get on with your life.</p>' +
        '<p>You don\'t have to leave him, be over him, or even know what\'s going to happen between you to start working on what this dynamic is doing to you.</p>' +
        '<p><strong>You don\'t need more information about why he does what he does. You need to start working on the part that keeps pulling you back even when you know better.</strong></p>' +
        '<div class="og-secondary" style="margin-top:22px;"><p><strong>&ldquo;Took me out of my own head and helped calm the voice screaming at me to reach out.&rdquo;</strong></p><p class="cta-microcopy" style="margin-bottom:0;">K.</p></div>' +
        '<p>You\'ll work with Break the Pull for <strong>21 days</strong>, with simple check-ins along the way so you can notice what\'s changing rather than having to guess whether it\'s helping.</p>'
    },
    "Restore Self-Trust": {
      url: "https://stan.store/YourMindStory/p/restore-self-trust",
      cta: "START WITH RESTORE SELF-TRUST",
      html:
        '<p class="result-lede" style="margin-top:0;">I recommend Restore Self-Trust.</p>' +
        '<p>Restore Self-Trust is a guided Cognitive Behavioral Hypnotherapy audio designed to help you work on the <strong>thoughts, beliefs and emotional responses underneath the second-guessing.</strong></p>' +
        '<p>Because the goal isn\'t to have somebody else tell you whether you\'re right or wrong.</p>' +
        '<p><strong>It\'s being able to hear yourself, make a decision and still trust yourself when something changes.</strong></p>' +
        '<p>Less explaining things away. Less wondering whether you\'re asking too much. Less needing what he does next to tell you whether you were right.</p>' +
        '<p><strong>More trusting your own judgement and following through on what you know is right for you.</strong></p>' +
        '<p>You don\'t have to leave him, be over him, or even know what\'s going to happen between you to start rebuilding trust in yourself.</p>' +
        '<p><strong>You don\'t need another person to tell you what to think. You need to start trusting what you already know.</strong></p>' +
        '<div class="og-secondary" style="margin-top:22px;"><p><strong>&ldquo;I\'m slowly unraveling from years of survival mode. I\'m finding my center and power again.&rdquo;</strong></p><p class="cta-microcopy" style="margin-bottom:0;">Sky</p></div>' +
        '<p>You\'ll work with Restore Self-Trust for <strong>21 days</strong>, with simple check-ins along the way so you can notice what\'s changing rather than having to guess whether it\'s helping.</p>'
    },
    "Return to Yourself": {
      url: "https://stan.store/YourMindStory/p/return-to-yourself-7jc9h8lg",
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
      '<p>I wouldn\'t point you towards one standalone guided Cognitive Behavioural Hypnotherapy audio when your results are showing that this is affecting you across several parts of the cycle.</p>' +
      '<p class="result-lede"><strong>You need the complete 4-Step programme.</strong></p>' +
      '<p>That means working on the alarm in your body, the pull that keeps taking you back into the loop, the self-trust you\'ve lost along the way, and getting your attention and your life back to you.</p>' +
      '<p>And because this is the Original Group, you won\'t be doing that work on your own. You\'ll have the complete guided Cognitive Behavioural Hypnotherapy programme, a simple structure to follow, and live group support as you move through it.</p>' +
      '<p><strong>The goal isn\'t more information about him. It\'s to help you break the cycle and get your mind and your life back.</strong></p>' +
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
      '<div class="cta-row"><a class="btn-cta" href="bootcamp.html" id="ymsFinalBootcampCta">SEE THE BOOTCAMP</a></div>' +
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
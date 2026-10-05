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
    "return-to-yourself": "Return to You"
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
    "Return to You": {
      url: "https://stan.store/YourMindStory/p/return-to-yourself-7jc9h8lg",
      cta: "START WITH RETURN TO YOU",
      html:
        '<p class="result-lede" style="margin-top:0;">I recommend Return to You.</p>' +
        '<p>Return to You is a guided Cognitive Behavioral Hypnotherapy audio designed to help you work on the <strong>thoughts and learned responses that keep pulling your attention, energy and sense of self back towards him.</strong></p>' +
        '<p>Because the goal isn\'t to force yourself to stop caring or never think about him again.</p>' +
        '<p><strong>It\'s being able to think about him without losing yourself.</strong></p>' +
        '<p>Less waiting. Less organising your day around what he might do. Less putting your plans, needs and happiness on hold.</p>' +
        '<p><strong>More of your attention, energy and life belonging to you again.</strong></p>' +
        '<p>You don\'t have to leave him, be over him, or even know what\'s going to happen between you to start returning to yourself.</p>' +
        '<p><strong>This isn\'t about forcing yourself to stop caring. It\'s about stopping yourself from disappearing from your own life while you do.</strong></p>' +
        '<div class="og-secondary" style="margin-top:22px;"><p><strong>&ldquo;I\'m slowly unraveling from years of survival mode. I\'m finding my center and power again.&rdquo;</strong></p><p class="cta-microcopy" style="margin-bottom:0;">Sky</p></div>' +
        '<p>You\'ll work with Return to You for <strong>21 days</strong>, with simple check-ins along the way so you can notice what\'s changing rather than having to guess whether it\'s helping.</p>'
    }
  };

  function canonicalStage(name) {
    if (name === "Restore Self Trust") return "Restore Self-Trust";
    if (name === "Return to Yourself") return "Return to You";
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
      '<p><strong>£49</strong></p>' +
      '<div class="cta-row"><a class="btn-cta" href="' + copy.url + '" id="ymsFinalAudioCta">' + copy.cta + ' · £49</a></div>';

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
    var stageCount = Array.isArray(data && data.qualifyingStages) ? data.qualifyingStages.length : 0;

    card.innerHTML =
      (firstName ? '<p class="result-greeting">Hi, ' + Y.escapeText(firstName) + '.</p>' : '') +
      '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>This is affecting you across several parts of the pattern.</h1>' +
      '<p>Your answers show that this is not one isolated problem. The alarm, the pull, the second-guessing and the amount of your life affected by the pattern are connected.</p>' +
      '<p><strong>That is why I recommend working through all four stages in sequence.</strong></p>' +
      '<p>Return to Yourself<br><strong>The Complete Self-Guided Journey</strong></p>' +
      '<p><strong>Quiet the Alarm → Break the Pull → Restore Self-Trust → Return to You</strong></p>' +
      '<p>You can work through the four stages independently, in your own time, with guided audio sessions and progress check-ins.</p>' +
      '<p><strong>£149</strong></p>' +
      '<div class="cta-row"><a class="btn-cta" href="https://stan.store/Yourmindstory/p/complete-selfguided-journey" id="ymsFinalSelfGuidedCta">START THE COMPLETE SELF-GUIDED JOURNEY · £149</a></div>' +
      '<p class="cta-microcopy" style="margin-top:18px;">★★★★★ 5 stars on Google<br><strong>Cognitive Behavioural Hypnotherapist</strong></p>';

    var cta = document.getElementById("ymsFinalSelfGuidedCta");
    if (cta) cta.addEventListener("click", function () {
      Y.track("quiz_self_guided_recommendation_click", { qualifying_stage_count: stageCount });
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
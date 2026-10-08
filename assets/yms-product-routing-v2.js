/* Your Mind Story quiz product routing - research-informed scope + support ladder.
   Product qualification is based on stage totals, not marketing behaviour.
   Each stage is 0-6. A stage qualifies when its total is >= 3.
   0 qualifying -> Bare Minimum
   1 qualifying -> exact single audio
   2 qualifying -> exact two-stage pathway
   3-4 qualifying -> Return to Yourself
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
    "Return to You"
  ];

  var STAGE_SUBTITLES = {
    "Quiet the Alarm": "Calm the panic and anxiety when you think of him",
    "Break the Pull": "Stop the checking, replaying and getting pulled back in",
    "Restore Self-Trust": "Stop second-guessing what you know",
    "Return to You": "Get your mind and your life back"
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
    "Return to You": {
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
    "Quiet the Alarm|Return to You": {
      name: "Quiet the Alarm → Return to You",
      url: "https://stan.store/Yourmindstory/p/quiet-the-alarm--return-to-yourself"
    },
    "Break the Pull|Restore Self-Trust": {
      name: "Break the Pull → Restore Self-Trust",
      url: "https://stan.store/Yourmindstory/p/break-the-pull--restore-selftrust"
    },
    "Break the Pull|Return to You": {
      name: "Break the Pull → Return to You",
      url: "https://stan.store/Yourmindstory/p/break-the-pull--return-to-yourself"
    },
    "Restore Self-Trust|Return to You": {
      name: "Restore Self-Trust → Return to You",
      url: "https://stan.store/Yourmindstory/p/restore-selftrust--return-to-yourself"
    }
  };

  var SELF_GUIDED = {
    name: "Return to Yourself",
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
    if (name === "Return to Yourself") return "Return to You";
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
    if (direct == null && stage === "Return to You") direct = scores["Return to Yourself"];
    if (direct == null && stage === "Restore Self-Trust") direct = scores["Restore Self Trust"];
    if (direct == null) {
      var internal = {
        "Quiet the Alarm":"quietTheAlarm",
        "Break the Pull":"breakThePull",
        "Restore Self-Trust":"restoreSelfTrust",
        "Return to You":"returnToYourself"
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
      '<h1>I wouldn’t start you with one of the hypnotherapy sessions.</h1>' +
      '<p>Your answers don’t show one of the four areas strongly enough for me to recommend a targeted hypnotherapy session right now.</p>' +
      '<p>That doesn’t mean nothing is going on. It means I wouldn’t sell you a bigger solution than your answers suggest you need.</p>' +
      '<p><strong>I’d start one step earlier: with clarity about what healthy love needs to include for you.</strong></p>' +
      '<div class="divider"></div>' +
      '<span class="og-label">I’D START HERE</span>' +
      '<p class="result-lede" style="margin-top:0;">The Bare Minimum</p>' +
      '<p><strong>The five non-negotiables a woman needs to stay healthy in love.</strong></p>' +
      '<p>Not the dream relationship. Not a checklist for a perfect man.</p>' +
      '<p>This is about getting clear on the minimum your emotional health needs, so you have something solid to come back to when feelings, hope or uncertainty make you question yourself.</p>' +
      '<p><strong>Know your minimum before you negotiate it away.</strong></p>' +
      '<div class="cta-row"><a class="btn-cta" data-yms-bare href="' + BARE_MINIMUM + '">GET THE BARE MINIMUM - £4.99</a></div>';
    logRoute("Bare Minimum", "The Bare Minimum");
    var cta = container.querySelector("[data-yms-bare]");
    if (cta) cta.addEventListener("click", function () {
      if (Y.track) Y.track("quiz_bare_minimum_recommendation_click", {});
      recordJourney("primary_cta_click", { cta: "The Bare Minimum - £4.99" });
    });
  }

  var PRESS_PLAY = {
    "Quiet the Alarm": {
      moment: "When his silence, distance or change in energy makes your stomach drop, press play.",
      practice: "Practise settling the reaction so what happens with him doesn’t have to take your whole day with it.",
      proof: "For the first time in 5 weeks I was able to regulate my breathing, stop my racing heart and I actually slept.",
      person: "C.J."
    },
    "Break the Pull": {
      moment: "When you reach for your phone to check, chase or message him, press play instead.",
      practice: "Practise staying with the impulse without automatically following it.",
      proof: "Took me out of my own head and helped calm the voice screaming at me to reach out.",
      person: "K."
    },
    "Restore Self-Trust": {
      moment: "When anxiety, hope or missing him has you about to break the boundary you set for yourself, press play first.",
      practice: "Practise trusting your decision and following through.",
      proof: "I’m slowly unraveling from years of survival mode. I’m finding my center and power again.",
      person: "Sky"
    },
    "Return to You": {
      moment: "When you realise you’ve lost another hour thinking about him instead of living your own life, press play and come back to you.",
      practice: "Practise bringing your attention, energy and plans back to your own life.",
      proof: "It’s not easy but the loop of him playing in my head is wearing off. I’m gaining my nervous system back.",
      person: "Kimberly"
    }
  };

  function pressPlayHtml(stage) {
    var item = PRESS_PLAY[stage];
    if (!item) return "";
    return '<div class="divider"></div>' +
      '<p class="result-lede"><strong>So what do you actually do when the moment comes?</strong></p>' +
      '<p><strong>' + item.moment + '</strong></p>' +
      '<p>' + item.practice + '</p>' +
      '<p class="cta-microcopy"><strong>What can happen when you press play?</strong></p>' +
      '<blockquote><strong>“' + item.proof + '”</strong><br>' + item.person + '</blockquote>';
  }

  function pairPressPlayHtml(stages) {
    return '<div class="divider"></div>' +
      '<p class="result-lede"><strong>So what do you actually do when the moment comes?</strong></p>' +
      stages.map(function(stage) {
        var item = PRESS_PLAY[stage];
        return item ? '<p><strong>' + Y.escapeText(stage) + '</strong><br><strong>' + item.moment + '</strong><br>' + item.practice + '</p>' +
          '<p class="cta-microcopy"><strong>What can happen when you press play?</strong></p>' +
          '<blockquote><strong>“' + item.proof + '”</strong><br>' + item.person + '</blockquote>' : '';
      }).join('');
  }

  function steppedRecommendationHtml(config) {
    var screens = config.screens || [];
    var total = screens.length;
    return '<div class="yms-stepped-offer" data-yms-stepped data-product="' + Y.escapeText(config.product) + '" data-route="' + Y.escapeText(config.route) + '" data-price="' + Y.escapeText(String(config.price)) + '" data-url="' + Y.escapeText(config.url) + '">' +
      '<div class="yms-step-progress"><span data-yms-step-count>1 of ' + total + '</span><div class="yms-step-track"><div class="yms-step-bar" data-yms-step-bar style="width:' + (100/total) + '%"></div></div></div>' +
      screens.map(function(screen, i) {
        var n=i+1;
        var nav = (n < total ? '<button type="button" class="yms-step-next" data-yms-next="' + (n+1) + '">' + (screen.next || 'NEXT →') + '</button>' : '') +
          (n > 1 ? '<button type="button" class="yms-step-back" data-yms-back="' + (n-1) + '">← Back</button>' : '');
        return '<section class="yms-step-panel' + (n===1?' active':'') + '" data-yms-step="' + n + '">' + screen.html + nav + '</section>';
      }).join('') + '</div>';
  }

  function purchaseButton(config, label) {
    return '<a class="yms-buy" data-yms-buy href="' + config.url + '">' + label + '</a>';
  }

  function wireSteppedRecommendation(container, config) {
    var root=container.querySelector('[data-yms-stepped]');
    if(!root) return;
    var panels=root.querySelectorAll('[data-yms-step]');
    var count=root.querySelector('[data-yms-step-count]');
    var bar=root.querySelector('[data-yms-step-bar]');
    var total=panels.length;
    var current=1;
    function show(n){
      if(n<1||n>total)return;
      Array.prototype.forEach.call(panels,function(p){p.classList.toggle('active',Number(p.getAttribute('data-yms-step'))===n);});
      current=n; if(count)count.textContent=n+' of '+total; if(bar)bar.style.width=(n/total*100)+'%';
      try{root.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){}
      recordJourney('sales_step_view',{step:n,product:config.product,route:config.route,price:String(config.price),experiment:'result-stepped-v1'});
    }
    Array.prototype.forEach.call(root.querySelectorAll('[data-yms-next]'),function(b){b.addEventListener('click',function(){show(Number(b.getAttribute('data-yms-next')));});});
    Array.prototype.forEach.call(root.querySelectorAll('[data-yms-back]'),function(b){b.addEventListener('click',function(){show(Number(b.getAttribute('data-yms-back')));});});
    Array.prototype.forEach.call(root.querySelectorAll('[data-yms-buy]'),function(a){a.addEventListener('click',function(){
      recordJourney('checkout_click',{product:config.product,route:config.route,cta:a.textContent.trim(),screen:current,destination:'stan.store',experiment:'result-stepped-v1',price:String(config.price)});
    });});
    recordJourney('sales_page_view',{product:config.product,route:config.route,price:String(config.price),experiment:'result-stepped-v1'});
    recordJourney('sales_step_view',{step:1,product:config.product,route:config.route,price:String(config.price),experiment:'result-stepped-v1'});
  }

  function renderSingle(container, stage) {
    var product=SINGLES[stage], item=PRESS_PLAY[stage];
    if(!product||!item)return false;
    var cfg={product:stage,route:"Single Audio",price:49,url:product.url};
    var why={
      "Quiet the Alarm":"Your answers show the alarm response is the part hitting you hardest. Something connected to him happens and your body can react before you have had time to think it through.",
      "Break the Pull":"Your answers show the pull is the part hitting you hardest. You can know checking, replaying or reaching out will not help and still feel the urge when the moment comes.",
      "Restore Self-Trust":"Your answers show the second-guessing is the part hitting you hardest. You can make a decision or boundary and mean it, then anxiety, hope or missing him makes you question it.",
      "Return to You":"Your answers show too much of your attention and energy is ending up with him while your own plans, needs and life get pushed into the background."
    }[stage];
    var outcome={
      "Quiet the Alarm":"Something happens with him without it taking your whole day with it.",
      "Break the Pull":"You feel the impulse without automatically checking, chasing or messaging him.",
      "Restore Self-Trust":"You make a decision for yourself and trust yourself enough to keep it.",
      "Return to You":"Your attention, energy, plans and future start belonging to you again."
    }[stage];
    var screens=[
      {html:'<span class="result-tag">YOUR RECOMMENDED NEXT STEP</span><h2>'+Y.escapeText(stage)+'</h2><p><strong>'+why+'</strong></p><p>This is why I would start here.</p>',next:'SEE WHY THIS SESSION FITS →'},
      {html:'<span class="og-label">WHY THIS SESSION?</span><h2>You already know a lot about what you should do.</h2><p>The difficult part is being able to do it <strong>when you are actually in the moment.</strong></p><p><strong>Understanding the pattern and changing your response to the pattern are two different jobs.</strong></p><p>Cognitive Behavioural Hypnotherapy helps you practise a different response so you are not relying on conscious effort alone.</p>'+purchaseButton(cfg,'START MY SESSION — £49'),next:'SHOW ME HOW I USE IT →'},
      {html:'<span class="og-label">WHEN THE MOMENT COMES</span><h2>So what do you actually do?</h2><p><strong>'+item.moment+'</strong></p><p>'+item.practice+'</p><p class="cta-microcopy"><strong>What can happen when you press play?</strong></p><blockquote><strong>“'+item.proof+'”</strong><br>'+item.person+'</blockquote>'+purchaseButton(cfg,'START MY SESSION — £49'),next:'WHAT HAPPENS AFTER I BUY? →'},
      {html:'<span class="og-label">YOU ARE NOT LEFT TO IT</span><h2>Work with the session for 21 days.</h2><p>You will have your session and short Progress Reviews along the way so you can notice what is changing, what is getting easier and where the old response is still showing up.</p><p><strong>You are not just pressing play and hoping something changes.</strong> You are paying attention to whether the work is showing up in your real life.</p>'+purchaseButton(cfg,'START MY SESSION — £49'),next:'SHOW ME THE OUTCOME →'},
      {html:'<span class="og-label">'+Y.escapeText(stage)+'</span><h2>What would the change actually look like?</h2><p><strong>'+outcome+'</strong></p><div class="yms-offer-box"><p>21-day Cognitive Behavioural Hypnotherapy session + Progress Reviews</p><div class="yms-price">£49</div>'+purchaseButton(cfg,'START MY SESSION — £49')+'</div>'}
    ];
    cfg.screens=screens;
    container.innerHTML=steppedRecommendationHtml(cfg)+downsellHtml(true);
    logRoute("Single Audio",stage); wireSteppedRecommendation(container,cfg); wireDownsell(container,"single_"+stage); return true;
  }

  function renderPair(container, stages) {
    stages=orderedUnique(stages); var pair=PAIRS[pairKey(stages)]; if(!pair)return false;
    var first=stages[0],second=stages[1],a=PRESS_PLAY[first],b=PRESS_PLAY[second];
    var cfg={product:pair.name,route:"Two-Stage Pathway",price:89,url:pair.url};
    var screens=[
      {html:'<span class="result-tag">YOUR RESULT</span><h2>Two parts of this cycle are showing up strongly for you.</h2><p><strong>'+Y.escapeText(first)+' → '+Y.escapeText(second)+'</strong></p><p>Your answers show these two responses are connected. That is why I would not treat either one in isolation.</p>',next:'SEE WHY I RECOMMENDED BOTH →'},
      {html:'<span class="og-label">WHY THESE TWO?</span><h2>Work on them in the order they happen.</h2><div class="yms-flow-row"><span>First</span><strong>'+Y.escapeText(first)+'</strong></div><div class="yms-flow-row"><span>Then</span><strong>'+Y.escapeText(second)+'</strong></div><p><strong>Understanding the pattern and changing your response to the pattern are two different jobs.</strong></p>'+purchaseButton(cfg,'START MY 2 SESSIONS — £89'),next:'SHOW ME HOW I USE THEM →'},
      {html:'<span class="og-label">WHEN THE MOMENT COMES</span><h2>So what do you actually do?</h2><div class="yms-stage"><h3>'+Y.escapeText(first)+'</h3><p><strong>'+a.moment+'</strong></p><p>'+a.practice+'</p><p class="cta-microcopy"><strong>What can happen when you press play?</strong></p><blockquote><strong>“'+a.proof+'”</strong><br>'+a.person+'</blockquote></div><div class="yms-stage"><h3>'+Y.escapeText(second)+'</h3><p><strong>'+b.moment+'</strong></p><p>'+b.practice+'</p><p class="cta-microcopy"><strong>What can happen when you press play?</strong></p><blockquote><strong>“'+b.proof+'”</strong><br>'+b.person+'</blockquote></div>'+purchaseButton(cfg,'START MY 2 SESSIONS — £89'),next:'WHAT HAPPENS AFTER I BUY? →'},
      {html:'<span class="og-label">YOU ARE NOT LEFT TO IT</span><h2>One stage at a time.</h2><p>Start with <strong>'+Y.escapeText(first)+'</strong>. Work with it for 21 days and complete your Progress Reviews. Then move to <strong>'+Y.escapeText(second)+'</strong>.</p><p>The check-ins help you notice what is changing rather than having to guess whether the work is helping.</p>'+purchaseButton(cfg,'START MY 2 SESSIONS — £89'),next:'SHOW ME WHAT I GET →'},
      {html:'<span class="og-label">'+Y.escapeText(pair.name)+'</span><h2>Your two-stage pathway.</h2><div class="yms-offer-box"><p>✓ '+Y.escapeText(first)+'</p><p>✓ '+Y.escapeText(second)+'</p><p>✓ Progress Reviews for each stage</p><div class="yms-price">£89</div>'+purchaseButton(cfg,'START MY 2 SESSIONS — £89')+'</div>'}
    ];
    cfg.screens=screens;
    container.innerHTML=steppedRecommendationHtml(cfg)+downsellHtml(false);
    logRoute("Two-Stage Pathway",pair.name); wireSteppedRecommendation(container,cfg); wireDownsell(container,"pair_"+pairKey(stages)); return true;
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

    "Quiet the Alarm|Return to You":
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

    "Break the Pull|Return to You":
      '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>Based on your answers, two parts of this cycle are showing up strongly for you.</h1>' +
      '<p>You can know you need to leave it alone and still find yourself checking, replaying, waiting or wanting to reach out.</p>' +
      '<p>And while that pull keeps taking you back towards him, more and more of your attention gets taken away from your own life.</p>' +
      '<p><strong>These two parts can feed each other.</strong></p>' +
      '<p>The more you check and replay, the more space he occupies.</p>' +
      '<p>And the more space he occupies, the easier it becomes to get pulled back in again.</p>' +
      '<p><strong>So we need to interrupt the pull and start giving your own life more of you again.</strong></p>',

    "Restore Self-Trust|Return to You":
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
    var hasReturn = stages.indexOf("Return to You") !== -1;

    var html =
      '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>You already understand a lot about what’s happening. But understanding it hasn’t stopped what happens when you’re actually in it.</h1>';

    if (hasQuiet) {
      html += '<p>Something happens with him and your body can react before you’ve had time to think it through.</p>';
    }
    if (hasPull) {
      html += '<p>Even when you know checking, replaying, waiting or looking for another answer won’t really help, you can still feel pulled to do it.</p>';
    }
    if (hasTrust) {
      html += '<p>You can know something doesn’t feel right and still start questioning yourself, explaining it away or wondering whether you got it wrong.</p>';
    }
    if (hasReturn) {
      html += '<p>And while your mind is caught up in all of that, your own plans, concentration and life can keep getting pushed into the background.</p>';
    }

    html +=
      '<p><strong>That’s the important part of your result.</strong></p>' +
      '<p>You do not need more information about why this dynamic happens. You need to start working on the thoughts, emotional responses and learned patterns that keep happening <strong>despite what you already know.</strong></p>' +
      '<p><strong>That’s why I wouldn’t treat this as one isolated problem. I’d work on the parts of the cycle your answers show are still costing you.</strong></p>';

    return html;
  }

  function fourStageResultHtml() {
    return '<span class="result-tag">YOUR RESULT</span>' +
      '<h1>You already understand a lot about what’s happening. But understanding it hasn’t stopped what happens when you’re actually in it.</h1>' +
      '<p>Something happens with him and your body reacts.</p>' +
      '<p>You can know checking, replaying, waiting or looking for another answer won’t help, and still feel pulled to do it.</p>' +
      '<p>You can know something doesn’t feel right and still start questioning yourself and what you already know.</p>' +
      '<p>And while your mind is caught up in all of that, too much of your own life can keep getting pushed into the background.</p>' +
      '<p><strong>That’s the important part of your result.</strong></p>' +
      '<p>You are not missing another explanation of him. You already know a lot.</p>' +
      '<p><strong>What hasn’t changed yet is the response.</strong></p>' +
      '<p>The alarm. The pull to check or replay. The second-guessing. The amount of your attention and emotional energy this can still take from your own life.</p>' +
      '<p>That’s why I wouldn’t treat this as four separate problems, and I wouldn’t give you more information to analyse.</p>' +
      '<p><strong>I’d work on the whole cycle, so what you know can start showing up in how you actually think, feel and respond.</strong></p>';
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
      '<p class="result-lede">Return to Yourself</p>' +
      '<p><strong>The Complete Self-Guided Journey</strong></p>' +
      '<p><strong>You told me you want to feel like yourself again and be able to move forward, whether he’s in your life or not.</strong></p>' +
      '<p>Your answers show me why I wouldn’t start you with just one part of this.</p>' +
      '<p>This is showing up across more than one area: how strongly you react, what your mind gets pulled back into, how much you question yourself and how much of <strong>you</strong> this situation is taking with it.</p>' +
      '<p><strong>That’s why I’m recommending the complete Return to Yourself journey.</strong></p>' +
      '<p>You may already understand the pattern. You may already know you shouldn’t check, replay, analyse, go back on a boundary or let your whole day disappear into what he does next.</p>' +
      '<p>But knowing what’s happening and being able to respond differently <strong>when you’re actually in it</strong> are two different things.</p>' +
      '<p><strong>That’s the part this work is for.</strong></p>' +
      '<p><strong>You might think you should be able to do this by yourself. And you are doing it yourself.</strong></p>' +
      '<p>You’re already making choices about how you want to respond. The hypnotherapy is designed to support those choices at a subconscious level, rather than leaving you to rely on conscious effort and willpower alone, when you already know that hasn’t been enough to create the change you want.</p>' +
      '<p><strong>You’re still the one making the change. The hypnotherapy is there to support you in making the choices you already want to make.</strong></p>' +
      '<div class="divider"></div>' +
      '<p class="result-lede">That’s what the Return to Yourself is for.</p>' +
      '<p>You work through four stages, <strong>one at a time</strong>:</p>' +
      '<p><strong>Quiet the Alarm</strong><br>Work on the thoughts and emotional responses underneath the anxiety and alarm.</p>' +
      '<p><strong>Break the Pull</strong><br>Work on what keeps pulling you into checking, replaying, reaching out or looking for another answer.</p>' +
      '<p><strong>Restore Self-Trust</strong><br>Work on the second-guessing that makes it difficult to trust what you already know.</p>' +
      '<p><strong>Return to You</strong><br>Work on bringing your attention, energy and life back to you.</p>' +
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
      '<p><strong>£149</strong></p>' +
      '<div class="cta-row"><a class="btn-cta" data-yms-self-guided href="' + SELF_GUIDED.url + '">START THE COMPLETE SELF-GUIDED JOURNEY - £149</a></div>' +
      downsellHtml(false);

    logRoute("Return to Yourself", "Return to Yourself");
    var cta = container.querySelector("[data-yms-self-guided]");
    if (cta) cta.addEventListener("click", function () {
      if (Y.track) Y.track("quiz_self_guided_recommendation_click", { qualifying_stage_count: stages.length, qualifying_stages: stages.join("|") });
      recordJourney("primary_cta_click", { cta: "Return to Yourself - £149" });
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
    // Keep this legacy entry point safe for any saved readiness state. New
    // assessment users go directly to the complete self-guided programme.
    renderSelfGuided(container, stages, "");
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

    /* Do not show a dead-end "retake the quiz" message for an older saved result.
       The result page itself already identifies the customer's primary result.
       When score/qualification data is unavailable, use that known result bucket
       to render the matching current single-session recommendation instead. */
    var hasNewRoutingData = Array.isArray(data.qualifyingStages) || (data.stageScores && typeof data.stageScores === "object");
    if (!hasNewRoutingData) {
      var legacyStageByBucket = {
        "quiet-the-alarm": "Quiet the Alarm",
        "break-the-pull": "Break the Pull",
        "restore-self-trust": "Restore Self-Trust",
        "return-to-yourself": "Return to You"
      };
      var legacyStage = legacyStageByBucket[resultBucketKey] || data.recommendedStage || data.primaryResult || "";
      if (legacyStage && renderSingle(container, legacyStage)) return;

      container.innerHTML =
        '<div class="divider"></div>' +
        '<span class="og-label">YOUR NEXT STEP</span>' +
        '<p class="result-lede">Your saved result is from an earlier version of the quiz.</p>' +
        '<p>I can still show you the result you received, but I don’t have enough of the original scoring data in this browser to recalculate a broader recommendation accurately.</p>' +
        '<p>If you want me to reassess which level of support fits you now, you can retake the quiz. Otherwise, you can keep reading your result above.</p>' +
        '<div class="cta-row"><a class="btn-cta" href="/assessment">REASSESS MY RESULT</a></div>';
      return;
    }

    if (stages.length === 0) { renderBare(container); return; }
    if (stages.length === 1 && renderSingle(container, stages[0])) return;
    if (stages.length === 2 && renderPair(container, stages)) return;

    var total = totalScoreFromData(data);
    if (stages.length >= 3) {
      renderSelfGuided(container, stages, "");
      return;
    }

    originalMount(containerId, resultBucketKey);
  };
})(window);

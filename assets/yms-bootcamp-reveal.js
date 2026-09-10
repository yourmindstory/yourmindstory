/* Progressive disclosure for Bootcamp-level quiz results. */
(function (global) {
  'use strict';
  var Y = global.YMSQuiz;
  if (!Y || !Y.mountRecommendationV1) return;

  var originalMount = Y.mountRecommendationV1;

  function addStyles() {
    if (document.getElementById('ymsBootcampRevealStyles')) return;
    var style = document.createElement('style');
    style.id = 'ymsBootcampRevealStyles';
    style.textContent =
      '.yms-progressive[hidden]{display:none!important}' +
      '.yms-progressive{scroll-margin-top:24px}' +
      '.yms-progressive.is-open{animation:ymsReveal .3s ease both}' +
      '@keyframes ymsReveal{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
      '.yms-reveal-btn{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;max-width:520px;margin:28px auto 4px;padding:15px 20px;border:0;border-radius:999px;background:#243D2E;color:#fff;font:600 13px/1.25 Inter,Arial,sans-serif;letter-spacing:.045em;text-transform:uppercase;cursor:pointer}' +
      '.yms-reveal-btn:focus-visible{outline:3px solid rgba(36,61,46,.28);outline-offset:3px}' +
      '.yms-reveal-btn:hover{transform:translateY(-1px)}' +
      '.yms-result-signals{display:grid;gap:8px;margin:20px 0}' +
      '.yms-result-signals p{margin:0;padding:11px 14px;border-left:3px solid #243D2E;background:rgba(245,241,232,.72);border-radius:0 10px 10px 0}' +
      '.yms-mini-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:20px 0}' +
      '.yms-mini-grid>div{padding:14px;border:1px solid rgba(36,61,46,.16);border-radius:12px;background:rgba(245,241,232,.68)}' +
      '.yms-mini-grid strong{display:block;margin-bottom:5px}' +
      '@media(max-width:640px){.yms-mini-grid{grid-template-columns:1fr}.yms-reveal-btn{max-width:none;font-size:12px}}' +
      '@media(prefers-reduced-motion:reduce){.yms-progressive.is-open{animation:none}.yms-reveal-btn{transition:none}}';
    document.head.appendChild(style);
  }

  function button(label, targetId) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'yms-reveal-btn';
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-controls', targetId);
    b.innerHTML = label + ' <span aria-hidden="true">↓</span>';
    return b;
  }

  function reveal(buttonEl, target) {
    target.hidden = false;
    target.classList.add('is-open');
    buttonEl.setAttribute('aria-expanded', 'true');
    buttonEl.hidden = true;
    if (Y.track) Y.track('quiz_bootcamp_reveal', { reveal: target.id });
    var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    global.setTimeout(function () {
      if (target.scrollIntoView) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }, 20);
  }

  function makeSection(id) {
    var section = document.createElement('section');
    section.id = id;
    section.className = 'yms-progressive';
    section.hidden = true;
    return section;
  }

  function enhance(card) {
    if (!card || card.dataset.ymsProgressive === '1') return;
    addStyles();

    var children = Array.prototype.slice.call(card.children);
    var recommendationLabel = children.findIndex(function (el) {
      return el.classList && el.classList.contains('og-label') && /RECOMMENDED NEXT STEP/i.test(el.textContent || '');
    });
    if (recommendationLabel < 0) return;

    var firstDivider = -1;
    for (var i = recommendationLabel - 1; i >= 0; i--) {
      if (children[i].classList && children[i].classList.contains('divider')) { firstDivider = i; break; }
    }
    if (firstDivider < 0) firstDivider = recommendationLabel;

    var signalStart = children.findIndex(function (el) {
      return /^Your body reacts\.?$/i.test((el.textContent || '').trim());
    });
    var meaningStart = children.findIndex(function (el) {
      return /^Because this isn't only costing you your peace\.?$/i.test((el.textContent || '').trim());
    });
    if (signalStart < 0) signalStart = Math.min(firstDivider, 4);
    if (meaningStart < 0 || meaningStart <= signalStart) meaningStart = Math.min(firstDivider, signalStart + 6);

    var opening = children.slice(0, signalStart);
    var meaningNodes = children.slice(meaningStart, firstDivider);
    var recommendationNodes = children.slice(firstDivider);

    while (card.firstChild) card.removeChild(card.firstChild);
    card.dataset.ymsProgressive = '1';

    opening.forEach(function (n) { card.appendChild(n); });

    var signals = document.createElement('div');
    signals.className = 'yms-result-signals';
    var signalText = [
      'Your body reacts.',
      'Your mind goes into the loop.',
      'You check, replay, wait and look for signs.',
      'You get pulled back towards him even when you know better.',
      'You question yourself and the decisions you have already made.',
      'Your own life is getting less and less of you.'
    ];
    signalText.forEach(function (text) {
      var p = document.createElement('p');
      p.textContent = text;
      signals.appendChild(p);
    });
    card.appendChild(signals);

    var meaning = makeSection('ymsTellMeMore');
    meaningNodes.forEach(function (n) { meaning.appendChild(n); });
    var meaningBtn = button('Tell me what this means', meaning.id);
    card.appendChild(meaningBtn);
    card.appendChild(meaning);

    var recommendation = makeSection('ymsMyRecommendation');
    recommendationNodes.forEach(function (n) { recommendation.appendChild(n); });

    var recBtn = button('Show me my recommendation', recommendation.id);
    meaning.appendChild(recBtn);
    card.appendChild(recommendation);

    var stepList = recommendation.querySelector('.og-steps');
    if (stepList) {
      var grid = document.createElement('div');
      grid.className = 'yms-mini-grid';
      Array.prototype.forEach.call(stepList.querySelectorAll('li'), function (li) {
        var box = document.createElement('div');
        var title = li.querySelector('.og-step-label');
        var desc = li.querySelector('.og-step-desc');
        var strong = document.createElement('strong');
        strong.textContent = title ? title.textContent : '';
        var span = document.createElement('span');
        span.textContent = desc ? desc.textContent : '';
        box.appendChild(strong);
        box.appendChild(span);
        grid.appendChild(box);
      });
      stepList.parentNode.replaceChild(grid, stepList);
    }

    var commitmentStart = Array.prototype.find.call(recommendation.children, function (el) {
      return /This isn't another 12 weeks of analysing him/i.test(el.textContent || '');
    });
    if (commitmentStart) {
      var commitment = makeSection('ymsWhatDoIHaveToDo');
      var move = commitmentStart;
      while (move) {
        var next = move.nextSibling;
        commitment.appendChild(move);
        move = next;
      }
      var commitmentBtn = button('What would I actually have to do?', commitment.id);
      recommendation.appendChild(commitmentBtn);
      recommendation.appendChild(commitment);
      commitmentBtn.addEventListener('click', function () { reveal(commitmentBtn, commitment); });
    }

    meaningBtn.addEventListener('click', function () { reveal(meaningBtn, meaning); });
    recBtn.addEventListener('click', function () { reveal(recBtn, recommendation); });
  }

  Y.mountRecommendationV1 = function (containerId, resultBucketKey) {
    var before = document.getElementById(containerId);
    var cardBefore = before && before.closest ? before.closest('.result-card') : before;

    originalMount(containerId, resultBucketKey);

    var data = Y.getResultData ? (Y.getResultData() || {}) : {};
    if (data.recommendationLevel !== 'bootcamp_level') return;

    var after = document.getElementById(containerId);
    var card = cardBefore || (after && after.closest ? after.closest('.result-card') : after);
    enhance(card);
  };
})(window);

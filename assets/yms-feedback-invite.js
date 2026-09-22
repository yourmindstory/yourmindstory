/* Post-result feedback invitation plus one-time scroll-triggered prompt. */
(function (global) {
  "use strict";
  var Y = global.YMSQuiz;
  if (!Y) return;

  function feedbackUrl() {
    var data = null;
    try { data = Y.getResultData ? Y.getResultData() : null; } catch (e) { data = null; }
    var qs = new URLSearchParams();
    if (data && data.resultToken) qs.set("token", data.resultToken);
    if (data && data.submissionId) qs.set("submissionId", data.submissionId);
    return "feedback.html" + (qs.toString() ? "?" + qs.toString() : "");
  }

  function trackClick(source) {
    if (Y.track) Y.track("quiz_feedback_invite_click", { source: source });
    if (Y.recordJourneyEvent) Y.recordJourneyEvent("feedback_invite_click", { source: source });
  }

  function mountCard(card) {
    if (document.getElementById("ymsFeedbackInvite")) return;
    var wrap = document.createElement("section");
    wrap.id = "ymsFeedbackInvite";
    wrap.style.cssText = "max-width:720px;margin:24px auto 0;padding:0 0 32px;";
    wrap.innerHTML =
      '<div style="border:1px solid rgba(36,61,46,.16);border-radius:16px;padding:22px;background:#fff;">' +
        '<div style="font:600 11px/1.2 Inter,Arial,sans-serif;letter-spacing:.11em;text-transform:uppercase;color:#243D2E;margin-bottom:10px;">BEFORE YOU GO</div>' +
        '<h2 style="font:500 28px/1.1 Fraunces,serif;margin:0 0 12px;color:#24231F;">Can I ask you 7 quick questions?</h2>' +
        '<p style="margin:0 0 10px;">Your answers help me improve the quiz and understand what women actually need.</p>' +
        '<p style="margin:0 0 14px;">It takes about 2 minutes.</p>' +
        '<p style="margin:0 0 10px;"><strong>And when you finish, I’ll give you my 4-Minute Emergency Reset</strong> - a short guided audio to use in the day when your mind starts spiralling, you want to check, message, replay everything, or you can feel yourself getting pulled back in.</p>' +
        '<p style="margin:0 0 18px;"><strong>It’s designed to interrupt the loop before you get dragged back into it.</strong></p>' +
        '<a href="' + feedbackUrl() + '" id="ymsFeedbackInviteCta" style="display:inline-block;text-decoration:none;border-radius:999px;background:#243D2E;color:#fff;padding:14px 18px;font:600 13px/1.2 Inter,Arial,sans-serif;letter-spacing:.035em;text-transform:uppercase;">YES, I’LL ANSWER</a>' +
      '</div>';
    card.parentNode.insertBefore(wrap, card.nextSibling);
    var cta = document.getElementById("ymsFeedbackInviteCta");
    if (cta) cta.addEventListener("click", function () { trackClick("inline_card"); });
  }

  function mountPopup() {
    if (document.getElementById("ymsFeedbackPopup")) return;
    var overlay = document.createElement("div");
    overlay.id = "ymsFeedbackPopup";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "ymsFeedbackPopupTitle");
    overlay.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(20,24,21,.42);display:flex;align-items:flex-end;justify-content:center;padding:14px;opacity:0;visibility:hidden;transition:opacity .2s ease,visibility .2s ease;";
    overlay.innerHTML =
      '<div style="position:relative;width:min(100%,620px);background:#fff;border-radius:22px 22px 16px 16px;padding:25px 22px 22px;box-shadow:0 18px 60px rgba(0,0,0,.22);font-family:Inter,Arial,sans-serif;color:#24231F;max-height:88vh;overflow:auto;">' +
        '<button type="button" id="ymsFeedbackPopupClose" aria-label="Not now" style="position:absolute;right:14px;top:12px;border:0;background:transparent;font-size:28px;line-height:1;color:#6b6b65;cursor:pointer;padding:6px;">×</button>' +
        '<div style="font:600 11px/1.2 Inter,Arial,sans-serif;letter-spacing:.11em;text-transform:uppercase;color:#243D2E;margin:0 36px 9px 0;">BEFORE YOU GO</div>' +
        '<h2 id="ymsFeedbackPopupTitle" style="font:500 30px/1.08 Fraunces,serif;margin:0 34px 12px 0;color:#24231F;">Can I ask you 7 quick questions?</h2>' +
        '<p style="margin:0 0 12px;line-height:1.55;">It takes about 2 minutes and helps me understand whether your result actually felt like you.</p>' +
        '<p style="margin:0 0 19px;line-height:1.55;"><strong>Complete all 7 and I’ll give you my 4-Minute Emergency Reset free.</strong></p>' +
        '<a href="' + feedbackUrl() + '" id="ymsFeedbackPopupCta" style="display:block;text-align:center;text-decoration:none;border-radius:999px;background:#243D2E;color:#fff;padding:15px 18px;font:600 13px/1.25 Inter,Arial,sans-serif;letter-spacing:.025em;text-transform:uppercase;">YES, I’LL ANSWER THE 7 QUESTIONS</a>' +
        '<button type="button" id="ymsFeedbackPopupNotNow" style="display:block;width:100%;border:0;background:transparent;color:#6b6b65;padding:15px 10px 3px;font:500 13px/1.2 Inter,Arial,sans-serif;cursor:pointer;">Not now</button>' +
      '</div>';
    document.body.appendChild(overlay);

    function close() {
      overlay.style.opacity = "0";
      overlay.style.visibility = "hidden";
      document.body.style.overflow = "";
    }
    document.getElementById("ymsFeedbackPopupClose").addEventListener("click", close);
    document.getElementById("ymsFeedbackPopupNotNow").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.getElementById("ymsFeedbackPopupCta").addEventListener("click", function () { trackClick("scroll_popup"); });
    return overlay;
  }

  function findTrigger(card) {
    var nodes = card.querySelectorAll("h1,h2,h3,p,a,button,div");
    for (var i = 0; i < nodes.length; i++) {
      var txt = (nodes[i].textContent || "").trim().toLowerCase();
      if (txt && txt.length < 180 && txt.indexOf("bare minimum") !== -1) return nodes[i];
    }
    var bridge = document.getElementById("ogBridge");
    if (bridge && bridge.children.length) return bridge;
    return card;
  }

  function armPopup(card) {
    var shown = false;
    var overlay = mountPopup();
    if (!overlay) return;

    function show() {
      if (shown) return;
      shown = true;
      overlay.style.visibility = "visible";
      overlay.style.opacity = "1";
      document.body.style.overflow = "hidden";
      if (Y.track) Y.track("quiz_feedback_invite_shown", { source: "scroll_popup" });
    }

    function observeTarget() {
      var target = findTrigger(card);
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
            observer.disconnect();
            show();
          }
        });
      }, { threshold: [0.2], rootMargin: "0px 0px -8% 0px" });
      observer.observe(target);
    }

    if (document.getElementById("ogBridge")) {
      setTimeout(observeTarget, 450);
    } else {
      observeTarget();
    }
  }

  function mount() {
    var card = document.querySelector(".result-card");
    if (!card) return;
    mountCard(card);
    armPopup(card);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})(window);

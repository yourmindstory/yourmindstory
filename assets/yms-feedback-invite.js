/* Post-result feedback invitation. Keeps the sales/recommendation content first. */
(function (global) {
  "use strict";
  var Y = global.YMSQuiz;
  if (!Y) return;

  function mount() {
    if (document.getElementById("ymsFeedbackInvite")) return;
    var card = document.querySelector(".result-card");
    if (!card) return;

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
        '<a href="feedback.html" id="ymsFeedbackInviteCta" style="display:inline-block;text-decoration:none;border-radius:999px;background:#243D2E;color:#fff;padding:14px 18px;font:600 13px/1.2 Inter,Arial,sans-serif;letter-spacing:.035em;text-transform:uppercase;">YES, I’LL ANSWER</a>' +
      '</div>';

    card.parentNode.insertBefore(wrap, card.nextSibling);
    var cta = document.getElementById("ymsFeedbackInviteCta");
    if (cta) cta.addEventListener("click", function () {
      if (Y.track) Y.track("quiz_feedback_invite_click", {});
      if (Y.recordJourneyEvent) Y.recordJourneyEvent("feedback_invite_click", {});
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})(window);

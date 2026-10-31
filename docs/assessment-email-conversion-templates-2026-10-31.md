# Assessment result email templates — approved conversion copy (31 October 2026)

Status: **draft implementation specification**, not deployed. The live transactional email sender is in Apps Script, not this repository. Do not represent this document as a live email update.

## Fixed decisions
- No generic 'thank you for taking the assessment' paragraph.
- Use stage scores for personalised problem and desired everyday transformation. Never automatically quote open-text answers.
- One tracked direct checkout CTA for final recommended offer, one secondary tracked personalised results URL. Do not substitute a sales page for checkout without validating destination.
- Explain belief shift: understanding his behaviour is not the same as changing the response that keeps firing.
- Authentic urgency: she can start working on the response now, without needing to understand or change him first. No countdown or unsupported promise.
- Jan's approved verbatim proof (Google Form, 8 and 17 Oct 2026): “I just wanted the loop to stop”; “The support I did was inner child work and therapy. But that did not break the loop”; “My mind has settled so much it is incredible.”; “When I was triggered I would ground myself and calm my nervous system”. Use concise excerpts with attribution Jan; do not imply universal outcomes.
- Email only after readiness and final offer are persisted for Complete routes. Idempotent sending and safe abandonment fallback. Never send marketing without consent.
- Keep exact offer prices: single £37; pair £74; Self-Guided £117; Reality Reset £147; Pattern Break £197; Bare Minimum £4.99.

## Question 15: purchase objection (proposal for controlled addition)
**What, if anything, is making you hesitate about starting to work on this now?**
A. I'm not sure guided hypnotherapy could help me.
B. I'm not sure it would work for me, even if it helps other women.
C. I'm worried I won't have the time or consistency to follow through.
D. The cost is what makes me hesitate.
E. I'm not ready to start yet.
F. Nothing is stopping me. I'm ready to begin.

Use to tailor reassurance, not stage scoring, severity, readiness routing, or product choice. Preserve truthful objection selection; do not force a positive response. Confirm current assessment question count, location and abandonment before deploying. Objection answer may be saved as an optional field and shown after core scoring, before final email. No automatic claims of conversion lift.

## Shared email skeleton
**Subject:** Your Mind Story: your results are ready

Hi {{first_name}},

**YOUR MIND STORY RESULTS**

Your answers suggest that {{stage_specific_problem_from_actual_scores}}.

{{optional_objection_reassurance_based_on_q15}}

You can understand why he behaves the way he does and still find yourself {{stage_specific_response}}. Understanding the pattern isn't the same as changing your response to it.

You don't need to wait until you understand him better to start working on what's happening to you.

**WHERE I RECOMMEND YOU START**

**{{final_offer_name}} | £{{final_price}}**

{{accurate_offer_inclusions_and_mechanism}}

{{stage_specific_daily_life_transformation_without_guarantee}}

Jan, who used the guided hypnotherapy sessions, said:

> “I just wanted the loop to stop”
>
> “My mind has settled so much it is incredible.”

Jan also described what changed when triggered: “When I was triggered I would ground myself and calm my nervous system”.

**[{{primary_CTA_label}}]** -> {{tracked_direct_checkout_url}}

Want to see why I've recommended this starting point?

**[VIEW MY FULL PERSONALISED RESULT]** -> {{tracked_saved_result_url}}

With care,
Onye
Your Mind Story
Cognitive Behavioural Hypnotherapist

## Offer-specific substitution rules
- Single £37: one named guided Cognitive Behavioural Hypnotherapy session; name and outcome must match highest eligible stage.
- Pair £74: two named guided sessions, each mapped to scored areas.
- Self-Guided £117: four-stage Return to Yourself guided Cognitive Behavioural Hypnotherapy sessions; accurate weekly check-ins only where actually included.
- Reality Reset £147: four-stage guided sessions, reflection workbook, private 20-minute session.
- Pattern Break £197: four-stage guided sessions, reflection workbook, private 50-minute solution-focused CBT session.
- Bare Minimum £4.99: five non-negotiables for healthy love; **do not claim it contains hypnotherapy or use Jan's hypnotherapy testimonial as direct evidence for this product**. Use separate appropriately relevant proof or omit testimonial.

## Stage-specific transformation language (drawn from current YMS customer-facing stage descriptions, not invented customer quotations)
- Quiet the Alarm: a thought, memory or his silence need not send her into hours of anxiety.
- Break the Pull: less automatic checking, chasing, replaying or reaching out.
- Restore Self-Trust: stand by decisions and boundaries instead of repeatedly questioning herself.
- Return to You: reclaim attention and energy for her own day and life.

## Q15 reassurance (short and factual)
A: Guided Cognitive Behavioural Hypnotherapy uses focused attention, imagery and mental rehearsal to help practise responses. It is not a guarantee.
B: Jan's experience shows what one client reported; her results are not a promise. Explain the structure and how it matches the respondent's scored areas.
C: State the actual daily time commitment and check-in schedule only after verified.
D: State exact price, inclusions and verified refund terms; no invented discount.
E: Avoid pressure; invite her to revisit results when ready.
F: Omit reassurance and move directly to recommendation.

## Acceptance checks
Confirm permission and exact Jan excerpts against her source forms. Check Q15 non-duplication, completion friction and routing. Validate all final offers and checkout destinations. Verify safe HTML escaping, accurate stage/price interpolation, transactional email consent handling, idempotency, email renders on mobile, and tracked email-click -> checkout -> purchase reconciliation. Do not deploy without successful controlled test and explicit approval.

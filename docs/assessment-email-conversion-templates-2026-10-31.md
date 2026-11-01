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

## Question 15: approved, implementation pending
**What, if anything, is making you hesitate about starting to work on this now?**
A. I'm not sure guided hypnotherapy could help me.
B. I'm not sure it would work for me, even if it helps other women.
C. I'm worried I won't have the time or consistency to follow through.
D. The cost is what makes me hesitate.
E. I'm not ready to start yet.
F. Nothing is stopping me. I'm ready to begin.

Use to tailor reassurance, not stage scoring, severity, readiness routing, or product choice. Preserve truthful objection selection; do not force a positive response. Confirm current assessment question count, location and abandonment before deploying. Objection answer may be saved as an optional field and shown after core scoring, before final email. No automatic claims of conversion lift.

## Shared email skeleton (superseded by approved copy below)
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


## APPROVED FINAL EMAIL COPY, 31 October 2026

Subject: Your Mind Story: your results are ready

Hi {{first_name}},

**YOUR MIND STORY RESULTS**

Your answers show that {{personalised_assessment_finding}} is where you're struggling most.

And what you want is {{selected_outcome}}.

You might already understand his behaviour. You might know exactly what you should be doing differently.

But knowing what to do and being able to do it are two different things.

Because while your conscious mind understands what's happening, your subconscious can still be running the responses you've learned along the way.

That's why you can tell yourself you're not going to check, chase, overthink or go back on a boundary, and find yourself doing it anyway.

**And that's the part I want to help you change.**

Not him. Not his behaviour.

What his pattern has done to you.

**WHERE I RECOMMEND YOU START**

**{{recommended_programme}} | {{price}}**

{{verified_offer_inclusions}}

So you can begin to quieten the mental loop, keep your boundaries and be more present in your own life.

**JAN'S STORY**

Jan said:

> “The support I did was inner child work and therapy. But that did not break the loop”

After using Your Mind Story's guided Cognitive Behavioural Hypnotherapy sessions, Jan said:

> “The most incredible result was getting out of the loop. The hypnotherapy helped me ground my energy back to the amazing person that I am.”

**[START MY RECOMMENDED PROGRAMME]** {{tracked_direct_checkout_url}}

**[VIEW MY PERSONALISED RESULTS]** {{tracked_saved_result_url}}

Onye
Your Mind Story

Implementation requirements: preserve this approved wording, offer routing, Q15 choices and scoring. Do not send Complete emails before final offer saved. Do not deploy without end-to-end tests. This file is not the live Apps Script sender.

## FINAL OFFER DESCRIPTIONS — APPROVED 31 OCTOBER 2026

These replace earlier offer-inclusion placeholders in the short approved email. The personalised finding and desired outcome already appear above the offer, so do not repeat them.

- **Single stage £37:** "You'll receive 21 days of guided Cognitive Behavioural Hypnotherapy focused on [stage name], helping you practise responding differently when [specific trigger] comes up, so it doesn't keep taking over your thoughts and your day."
- **Two stages £74:** "You'll receive two stages of guided Cognitive Behavioural Hypnotherapy, with 21 days of practice for each stage, helping you work on both responses rather than trying to change one while the other keeps pulling you back."
- **Self-Guided £117:** "You'll receive all four stages of Return to Yourself, with guided Cognitive Behavioural Hypnotherapy to practise over 12 weeks. You'll work on quietening the anxiety, breaking the pull to check or chase, trusting your decisions and boundaries again, and getting your attention back onto your own life. At your own pace, with a clear structure to follow."
- **Reality Reset £147:** "You'll receive all four stages of Return to Yourself, a reflection workbook and a private 20-minute session with me. You'll work through the same 12-week journey, with an opportunity to talk through where you're getting stuck, ask questions and get focused guidance on what to practise next."
- **Pattern Break £197:** "You'll receive all four stages of Return to Yourself, a reflection workbook and a private 50-minute CBT session with me. Alongside your 12-week journey, we'll have more time to explore the pattern that's keeping you stuck, identify the responses you want to change and work on practical ways to respond differently in your own circumstances."
- **The Bare Minimum £4.99:** "You'll receive The Bare Minimum, an ebook covering five non-negotiables for healthy love. It's a starting point for recognising what you need from a relationship, identifying what you've been accepting that doesn't meet those needs and becoming clearer about the boundaries you want to hold."

**Ebook-only belief shift:** "Understanding what healthy love looks like is a starting point. Recognising what you're willing to accept is where your choices begin."

**Short email order:** personalised finding, desired outcome, offer name and price, corresponding description, START MY RECOMMENDED PROGRAMME button, short belief shift, Jan success-story link (hypnotherapy offers only), personalised results link. Do not use Jan's hypnotherapy story as proof for the ebook.

**Deployment status:** These are approved copy specifications in GitHub, NOT the live Apps Script transactional email. Implement and controlled-test the live Apps Script sender before deployment; preserve final saved offer, routing, consent and idempotency.

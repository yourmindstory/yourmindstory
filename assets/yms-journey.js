/* Your Mind Story: first-party journey events -> V3 assessment Sheet (added 22 Oct 2026, tracking repair).
   Used on YMS pages that come after the assessment (Return to Yourself sales page, Payhip welcome page),
   so those steps are written against the same Journey ID / Submission ID as the assessment.
   Operational record only: IDs, product, price and page step. No names, emails or answers are sent.
   Nothing is sent for visitors who never took the assessment (no journey ID). */
(function(){
  if (window.YMSJourney) return;
  var BACKEND = 'https://script.google.com/macros/s/AKfycbzDtA92i-aQeyeuamBdA4LbxGUruh55qxSOk_nwLncBM3stllbZoaipxNzKb9xyTveLdA/exec';
  function q(k){ try{ return new URLSearchParams(location.search).get(k) || ''; }catch(e){ return ''; } }
  function ls(k){ try{ return localStorage.getItem(k) || ''; }catch(e){ return ''; } }
  function ss(k){ try{ return sessionStorage.getItem(k) || ''; }catch(e){ return ''; } }
  function isTest(){
    var t = q('yms_test');
    try{ if(t === '1') localStorage.setItem('yms_test','1'); if(t === '0') localStorage.removeItem('yms_test'); }catch(e){}
    return ls('yms_test') === '1';
  }
  function consent(){ var v = ls('yms_analytics_consent'); return v === 'yes' ? 'yes' : v === 'no' ? 'no' : 'unset'; }
  function identity(){
    var last = {}; try{ last = JSON.parse(ss('yms_v3_last_submission') || '{}'); }catch(e){}
    var jid = q('jid') || q('yms_journey_id') || last.journeyId || ls('yms_v3_journey_id') || ss('yms_v3_handoff_jid');
    var sid = q('sid') || last.submissionId || ss('yms_v3_handoff_sid');
    try{ if(jid) sessionStorage.setItem('yms_v3_handoff_jid', jid); if(sid) sessionStorage.setItem('yms_v3_handoff_sid', sid); }catch(e){}
    try{ if(jid && !ls('yms_v3_journey_id')) localStorage.setItem('yms_v3_journey_id', jid); }catch(e){}
    return { journeyId: jid, submissionId: sid, resultToken: last.resultToken || '' };
  }
  var sent = {};
  function send(page, events, onceKey){
    if (onceKey){ if (sent[onceKey]) return false; sent[onceKey] = 1; }
    var id = identity();
    if (!id.journeyId && !id.submissionId && !id.resultToken) return false;
    var body = JSON.stringify({
      action:'recordJourneyEvents', submissionId:id.submissionId, journeyId:id.journeyId, resultToken:id.resultToken,
      analyticsConsent:consent(), page:page, isTest:isTest(), entry:(q('utm_medium') === 'email' ? 'email' : (document.referrer ? 'referral' : 'direct')),
      events: events.map(function(e){ return { eventType:e[0], values:e[1] || {}, clientTime:new Date().toISOString() }; })
    });
    try{ fetch(BACKEND, { method:'POST', mode:'no-cors', keepalive:true, headers:{'Content-Type':'text/plain;charset=utf-8'}, body:body }); }catch(e){}
    return true;
  }
  window.YMSJourney = { send: send, identity: identity, isTest: isTest };
  isTest();
})();

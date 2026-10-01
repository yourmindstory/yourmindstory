/* Your Mind Story consent-aware analytics bootstrap.
   Preference keys: yms_analytics_consent (yes/no), yms_ads_consent (yes/no).
   No third-party tag is loaded until the visitor makes a choice. */
(function(){
  if(window.__YMS_CONSENT_BOOTSTRAPPED)return;
  window.__YMS_CONSENT_BOOTSTRAPPED=true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
  var analyticsKey='yms_analytics_consent',adsKey='yms_ads_consent',bannerId='yms-consent-banner';
  function read(key){try{return localStorage.getItem(key)}catch(e){return null}}
  function write(key,value){try{localStorage.setItem(key,value)}catch(e){}}
  function clearFirstPartyTrackingCookies(){['_ga','_gid','_gat','_gcl_au','_fbp','_fbc'].forEach(function(n){document.cookie=n+'=; Max-Age=0; path=/; SameSite=Lax';document.cookie=n+'=; Max-Age=0; path=/; domain=.yourmindstory.co.uk; SameSite=Lax'})}
  function queue(name,params){window.__ymsPendingEvents=window.__ymsPendingEvents||[];window.__ymsPendingEvents.push({name:name,params:params||{}})}
  function flush(){if(!window.YMSQuiz||!window.YMSQuiz.track)return;var pending=window.__ymsPendingEvents||[];window.__ymsPendingEvents=[];pending.forEach(function(e){window.YMSQuiz.track(e.name,e.params)})}
  function track(name,params){if(read(analyticsKey)!=='yes')return;if(window.YMSQuiz&&window.YMSQuiz.track)window.YMSQuiz.track(name,params||{});else queue(name,params)}
  window.YMSTracking=window.YMSTracking||{};
  window.YMSTracking.track=track;
  function loadAnalytics(){
    if(read(analyticsKey)!=='yes')return;
    if(window.YMSQuiz){try{if(window.YMSQuiz.enableAnalytics)window.YMSQuiz.enableAnalytics();if(window.YMSQuiz.captureAttribution)window.YMSQuiz.captureAttribution()}catch(e){};flush();return}
    if(document.querySelector('script[data-yms-analytics]'))return;
    var existing=Array.from(document.scripts).find(function(x){return /yms-quiz-shared\\.js/.test(x.src)});
    if(existing){existing.addEventListener('load',function(){try{if(window.YMSQuiz&&window.YMSQuiz.enableAnalytics)window.YMSQuiz.enableAnalytics();if(window.YMSQuiz&&window.YMSQuiz.captureAttribution)window.YMSQuiz.captureAttribution()}catch(e){};flush()},{once:true});return}
    var s=document.createElement('script');s.src='/assets/yms-quiz-shared.js?v=20261001-tracking';s.async=true;s.dataset.ymsAnalytics='yes';
    s.onload=function(){try{if(window.YMSQuiz)window.YMSQuiz.captureAttribution()}catch(e){};flush();};
    document.head.appendChild(s);
  }
  document.addEventListener('ymsConsentAnalyticsGranted',function(){ctas.forEach(function(a){if(a.dataset.ymsCtaViewSent)return;var r=a.getBoundingClientRect();if(r.bottom>0&&r.top<global.innerHeight){var p={cta_id:a.id||a.getAttribute('data-cta-id')||'',cta_label:(a.innerText||a.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ').slice(0,80),page_path:location.pathname,destination_path:(new URL(a.href,location.href)).pathname,transport_type:'beacon'};track('assessment_cta_view',p);a.dataset.ymsCtaViewSent='1'}})});
  var choice=read(analyticsKey);
  if(choice==='yes')loadAnalytics();
  else if(choice==='no')window.__ymsPendingEvents=[];
  if(location.pathname==='/bootcamp.html'||location.pathname==='/assessment/return-to-yourself/'||location.pathname==='/assessment/return-to-yourself')track('offer_page_view',{offer_type:location.pathname.indexOf('bootcamp')>=0?'bootcamp':'complete_self_guided_journey',page_path:location.pathname});
  if(location.pathname==='/assessment/start/'||location.pathname==='/assessment/start')track('assessment_engine_view',{assessment_version:'YMS-ASSESSMENT-2026-V3',page_path:location.pathname});
  function assessmentLinks(){
    return Array.from(document.querySelectorAll('a[href]')).filter(function(a){
      try{var u=new URL(a.href,location.href);return u.origin===location.origin&&(/^\/assessment\/?$/.test(u.pathname)||/^\/assessment\/start\/?$/.test(u.pathname)||/quiz\.html$/.test(u.pathname))}catch(e){return false}
    })
  }
  var ctas=assessmentLinks();
  ctas.forEach(function(a,index){
    if(a.dataset.ymsAssessmentTracked)return;
    a.dataset.ymsAssessmentTracked='1';
    var id=a.id||a.getAttribute('data-cta-id')||('assessment_cta_'+(index+1));
    var label=(a.innerText||a.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,80);
    var p={cta_id:id,cta_label:label,page_path:location.pathname,destination_path:(new URL(a.href,location.href)).pathname};
    if('IntersectionObserver'in window){
      var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting&&read(analyticsKey)==='yes'&&!a.dataset.ymsCtaViewSent){p.transport_type='beacon';track('assessment_cta_view',p);a.dataset.ymsCtaViewSent='1';observer.disconnect()}})},{threshold:.25});
      observer.observe(a);
    }else track('assessment_cta_view',p);
    a.addEventListener('click',function(){p.transport_type='beacon';track('assessment_cta_click',p)});
  });
  document.addEventListener('click',function(e){
    var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a)return;
    var url;try{url=new URL(a.href,location.href)}catch(err){return}
    var host=url.hostname.toLowerCase(),isOffer=/^(stan\.store|www\.stan\.store|payhip\.com|www\.payhip\.com)$/.test(host);
    if(!isOffer||read(analyticsKey)!=='yes')return;
    var product=a.getAttribute('data-rec-product')||a.getAttribute('data-product')||a.getAttribute('aria-label')||(a.innerText||'').trim().replace(/\s+/g,' ').slice(0,80);
    var route=a.getAttribute('data-rec-route')||'';
    var params={destination_host:host,destination_path:url.pathname,product:product,route:route,page_path:location.pathname,cta_id:a.id||a.getAttribute('data-cta-id')||'',transport_type:'beacon'};
    params.transport_type='beacon';track('offer_cta_click',params);
    var attr=window.YMSQuiz&&window.YMSQuiz.getAttribution?window.YMSQuiz.getAttribution():null;
    if(!attr){try{attr={};['utm_source','utm_medium','utm_campaign','utm_id','utm_term','utm_content'].forEach(function(k){attr[k]=sessionStorage.getItem('yms_quiz_'+k)||''})}catch(e){}}
    if(attr){
      ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){if(attr[k]&&!url.searchParams.has(k))url.searchParams.set(k,attr[k])});
      a.href=url.toString();
    }
  },true);
  function openSettings(){
    var old=document.getElementById(bannerId);if(old){old.hidden=false;return}
    var banner=document.createElement('section');banner.id=bannerId;banner.setAttribute('role','dialog');banner.setAttribute('aria-label','Cookie and tracking choices');
    banner.innerHTML='<div class="yms-consent-copy"><strong>Cookie and tracking choices</strong><p>Your Mind Story uses analytics to understand how people use this site and assessment. You can allow analytics only, allow analytics and advertising pixels, or reject non-essential tracking. Your choice does not affect access to the site. <a href="/privacy.html">Privacy notice</a></p></div><div class="yms-consent-actions"><button type="button" data-choice="analytics">Allow analytics</button><button type="button" data-choice="all">Allow all</button><button type="button" data-choice="reject">Reject non-essential</button></div>';
    var style=document.createElement('style');style.textContent='#yms-consent-banner{position:fixed;z-index:99999;left:12px;right:12px;bottom:12px;max-width:760px;margin:auto;padding:15px 16px;background:#fff;color:#111827;border:1px solid #d6d9d4;box-shadow:0 8px 30px rgba(17,24,39,.17);font:14px/1.45 "DM Sans",Arial,sans-serif;display:flex;gap:18px;align-items:center;justify-content:space-between}#yms-consent-banner[hidden]{display:none}.yms-consent-copy{max-width:440px}.yms-consent-copy p{margin:5px 0 0;font-size:12px}.yms-consent-copy a{color:#111827}.yms-consent-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.yms-consent-actions button,.yms-consent-settings{font:600 11px "DM Sans",Arial,sans-serif;padding:9px 10px;border:1px solid #111827;background:#fff;color:#111827;cursor:pointer}.yms-consent-actions button[data-choice="analytics"]{background:#111827;color:#fff}#yms-consent-settings{position:fixed;z-index:99998;right:12px;bottom:12px;font:11px "DM Sans",Arial,sans-serif;background:#fff;color:#343b34;border:1px solid #d6d9d4;padding:6px 9px;cursor:pointer}@media(max-width:640px){#yms-consent-banner{display:block;padding:12px}.yms-consent-actions{justify-content:flex-start;margin-top:10px}.yms-consent-actions button{flex:1 1 30%;padding:8px 5px;font-size:10px}#yms-consent-settings{bottom:8px;right:8px}}';
    document.head.appendChild(style);document.body.appendChild(banner);
    banner.querySelectorAll('button[data-choice]').forEach(function(button){button.addEventListener('click',function(){
      var c=button.getAttribute('data-choice'),oldA=read(analyticsKey),oldD=read(adsKey);write(analyticsKey,c==='reject'?'no':'yes');write(adsKey,c==='all'?'yes':'no');window.__ymsPendingEvents=[];window.dataLayer=(window.dataLayer||[]).filter(function(x){return !x||x[0]!=='event'});
      if(c==='reject'||c==='analytics')clearFirstPartyTrackingCookies();
      banner.hidden=true;
      if(oldA!==null&&(oldA!==(c==='reject'?'no':'yes')||oldD!==(c==='all'?'yes':'no'))){location.reload();return}
      if(c!=='reject'){document.dispatchEvent(new Event('ymsConsentAnalyticsGranted'));loadAnalytics();setTimeout(function(){track('tracking_consent_updated',{analytics_consent:'yes',advertising_consent:c==='all'?'yes':'no'})},0)}
    })});
    return banner;
  }
  var settings=document.createElement('button');settings.id='yms-consent-settings';settings.type='button';settings.textContent='Cookie settings';settings.addEventListener('click',openSettings);document.body.appendChild(settings);
  if(choice!=='yes'&&choice!=='no')openSettings();
  else if(choice==='no'){} 
  window.YMSConsent={open:openSettings,load:loadAnalytics};
})();
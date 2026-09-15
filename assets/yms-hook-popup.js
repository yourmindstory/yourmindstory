(function(){
'use strict';
var CONFIG={enabled:true,brevoFormUrl:'https://43e2565f.sibforms.com/serve/MUIFACduns2Id6FZwOlGGlJ83xzdz8X2o6P_7K1BOVUt6c9MAszZR6z662xS-dtcGWNqVa4nS4_dHx8Ebm29ZbTJl9VHDCmoPCp0DXjv0VN3NxbT7rF-RTvY6v10r-YbV51BqHOfP0vk_v7jyxVelIBRKSycrxh-UrFJhcIvbPOQDPdskQVm3Mcy_yPSdMWg9mG65NTAp9YOlzuOOA==',guideUrl:'/guide.html?utm_source=hook_popup&utm_medium=lead_magnet&utm_campaign=hook&utm_content=success',minDelayMs:8000,fallbackDelayMs:20000,scrollTrigger:0.35,requestStorageKey:'yms_hook_requested_v1',dismissStorageKey:'yms_hook_dismissed_session_v1'};
var path=(location.pathname||'/').toLowerCase();
var testMode=false;
try{testMode=new URLSearchParams(location.search).get('hooktest')==='1';}catch(e){}

function normaliseMobileQuizCTA(){
  if(path!=='/'&&path!=='/index.html')return;
  function apply(){
    var mobile=document.querySelector('#mobile');
    if(!mobile)return;

    var nav=mobile.querySelector('.navbar');
    if(nav){
      var navLinks=Array.prototype.slice.call(nav.querySelectorAll('a[href*="quiz"]'));
      navLinks.slice(1).forEach(function(a){a.remove();});
      Array.prototype.slice.call(nav.children).forEach(function(el){if((el.textContent||'').trim()==='☰')el.remove();});
      if(!navLinks.length){
        var navQuiz=document.createElement('a');
        navQuiz.className='yms-mobile-nav-quiz';
        navQuiz.href='quiz.html';
        navQuiz.textContent='Take the Quiz';
        navQuiz.style.cssText='display:inline-block;background:#24231F;color:#FCFBF7;text-decoration:none;padding:9px 12px;border-radius:2px;font:600 10px/1.2 Inter,Arial,sans-serif;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;';
        navQuiz.addEventListener('click',function(){if(typeof window.gtag==='function'){window.gtag('event','nav_click',{link:'quiz'});window.gtag('event','nav_quiz_click');}});
        nav.appendChild(navQuiz);
      }
    }

    var hero=mobile.querySelector('.hero');
    if(hero){
      var heroCopy=hero.querySelector('.hero-copy');
      var preferred=heroCopy&&heroCopy.querySelector('a[href*="quiz"]');

      if(preferred){
        Array.prototype.slice.call(hero.querySelectorAll('a[href*="quiz"]')).forEach(function(a){
          if(a===preferred)return;
          var p=a.parentElement;
          if(p&&(/Not sure where to begin/i.test(p.textContent||'')||p.classList.contains('yms-mobile-hero-quiz')||p.classList.contains('yms-mobile-quiz-final'))){p.remove();}
          else{a.remove();}
        });
        Array.prototype.slice.call(hero.querySelectorAll('.yms-mobile-hero-quiz,.yms-mobile-quiz-final')).forEach(function(el){if(!el.contains(preferred))el.remove();});
      }else if(heroCopy){
        var paras=Array.prototype.slice.call(heroCopy.querySelectorAll('p.body'));
        var anchor=paras.find(function(p){return /trust yourself again/i.test(p.textContent||'');})||paras[paras.length-1];
        if(anchor){
          var block=document.createElement('div');
          block.className='yms-mobile-quiz-final';
          block.style.cssText='margin-top:18px;';
          block.innerHTML='<div style="font:400 13px/1.4 Inter,Arial,sans-serif;color:#4a473c;margin-bottom:8px;">Not sure where to begin?</div><a href="quiz.html" style="display:block;width:100%;text-align:center;background:#C9D4C2;color:#24231F;border:1px solid #24231F;text-decoration:none;padding:15px 18px;border-radius:2px;font:600 12px/1.2 Inter,Arial,sans-serif;letter-spacing:.05em;text-transform:uppercase;">Take the Free Quiz</a>';
          block.querySelector('a').addEventListener('click',function(){if(typeof window.gtag==='function')window.gtag('event','cta_click',{cta:'take_free_quiz_hero_mobile'});});
          anchor.insertAdjacentElement('afterend',block);
        }
      }
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
}
normaliseMobileQuizCTA();

var excluded=['/quiz','/result','/no-result','/low-result','/mixed-result','/guide','/hook-preview','/guide-interactive-preview','/bootcamp','/checkout','/quiet-the-alarm','/break-the-pull','/restore-self-trust','/return-to-yourself','/calm-the-spiral','/checkin-'];
if(excluded.some(function(x){return path.indexOf(x)!==-1;}))return;
if(!CONFIG.enabled||!CONFIG.brevoFormUrl)return;
if(!testMode){
  try{if(localStorage.getItem(CONFIG.requestStorageKey)==='1')return;}catch(e){}
  try{if(sessionStorage.getItem(CONFIG.dismissStorageKey)==='1')return;}catch(e){}
}
var startedAt=Date.now(),shown=false,overlay;
function track(name,params){params=params||{};params.page_path=location.pathname;params.page_title=document.title;if(testMode)params.test_mode='yes';if(typeof window.gtag==='function')window.gtag('event',name,params);}
function addFonts(){if(document.getElementById('yms-hook-fonts'))return;var l=document.createElement('link');l.id='yms-hook-fonts';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Gilda+Display&family=DM+Sans:wght@300;400;500;600&display=swap';document.head.appendChild(l);}
function build(){if(overlay)return;addFonts();overlay=document.createElement('div');overlay.className='yms-hook-overlay';overlay.setAttribute('aria-hidden','true');overlay.innerHTML='<div class="yms-hook-modal" role="dialog" aria-modal="true" aria-labelledby="yms-hook-title"><button class="yms-hook-close" type="button" aria-label="Close">×</button><div class="yms-hook-panel"><div class="yms-hook-art" aria-hidden="true"><div class="yms-hook-orbit"><div class="yms-hook-orbit-line"></div><div class="yms-hook-orbit-dot"></div><div class="yms-hook-orbit-copy">The hook is the pattern.</div></div></div><div class="yms-hook-content"><div class="yms-hook-step is-active" data-step="1"><div class="yms-hook-kicker">Free guide</div><h2 class="yms-hook-title" id="yms-hook-title">Hooked on your avoidant?</h2><div class="yms-hook-sub">Find out why knowing better hasn’t stopped the pull.</div><div class="yms-hook-body">This isn’t more information about him. It’s about what the pattern has started doing to you — and where I would start first.</div><button class="yms-hook-btn" type="button" data-next>Show me why I’m hooked</button><div class="yms-hook-micro">Free. Read it now, and I’ll send you a copy for later too.</div></div><form class="yms-hook-step" data-step="2" novalidate><div class="yms-hook-kicker">Send me the guide</div><div class="yms-hook-sub">Where should I send it?</div><label class="yms-hook-label" for="yms-hook-email">Email address</label><input class="yms-hook-input" id="yms-hook-email" name="EMAIL" type="email" autocomplete="email" required><label class="yms-hook-consent"><input type="checkbox" name="MARKETING_CONSENT" value="1"><span>Yes, I’d also like Your Mind Story tools, support and Bootcamp updates by email. I can unsubscribe any time.</span></label><input class="yms-hook-honeypot" type="text" name="email_address_check" tabindex="-1" autocomplete="off"><input type="hidden" name="HOOK_SOURCE" value="website_popup"><input type="hidden" name="HOOK_PAGE" value=""><div class="yms-hook-status" role="alert"></div><button class="yms-hook-btn" type="submit">Send me the guide</button><button class="yms-hook-back" type="button" data-back>Back</button></form><div class="yms-hook-step" data-step="3"><div class="yms-hook-kicker">You’re in</div><div class="yms-hook-sub">Your guide is on its way to your inbox.</div><div class="yms-hook-success">You can also <strong>start here now</strong>. You don’t need to wait for the email.</div><a class="yms-hook-btn" style="display:block;text-align:center;text-decoration:none" href="'+CONFIG.guideUrl+'" data-start>Start now</a><div class="yms-hook-micro">If you asked for ongoing emails too, you’ll also receive the Your Mind Story follow-up sequence.</div></div></div></div></div>';document.body.appendChild(overlay);overlay.querySelector('input[name="HOOK_PAGE"]').value=location.pathname;overlay.querySelector('.yms-hook-close').addEventListener('click',dismiss);overlay.addEventListener('click',function(e){if(e.target===overlay)dismiss();});overlay.querySelector('[data-next]').addEventListener('click',function(){showStep(2);track('hook_popup_step1',{trigger:overlay.dataset.trigger||'unknown'});});overlay.querySelector('[data-back]').addEventListener('click',function(){showStep(1);});overlay.querySelector('[data-start]').addEventListener('click',function(){track('hook_popup_success',{action:'start_now'});});overlay.querySelector('form').addEventListener('submit',submit);document.addEventListener('keydown',function(e){if(e.key==='Escape'&&overlay&&overlay.classList.contains('is-open'))dismiss();});}
function showStep(n){overlay.querySelectorAll('.yms-hook-step').forEach(function(s){s.classList.toggle('is-active',s.getAttribute('data-step')===String(n));});if(n===2)setTimeout(function(){var i=overlay.querySelector('#yms-hook-email');if(i)i.focus();},60);}
function open(trigger){if(shown)return;shown=true;build();overlay.dataset.trigger=trigger;overlay.classList.add('is-open');overlay.setAttribute('aria-hidden','false');track('hook_popup_view',{trigger:trigger});}
function dismiss(){if(!overlay)return;overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true');if(!testMode){try{sessionStorage.setItem(CONFIG.dismissStorageKey,'1');}catch(e){}}track('hook_popup_dismiss',{step:overlay.querySelector('.yms-hook-step.is-active')&&overlay.querySelector('.yms-hook-step.is-active').getAttribute('data-step')});}
function scrollRatio(){var max=document.documentElement.scrollHeight-window.innerHeight;return max>0?window.scrollY/max:0;}
function canOpen(){return Date.now()-startedAt>=CONFIG.minDelayMs;}
function onScroll(){if(shown)return;if(scrollRatio()>=CONFIG.scrollTrigger&&canOpen())open('scroll35');}
window.addEventListener('scroll',onScroll,{passive:true});
if(testMode){setTimeout(function(){if(!shown)open('qa_test');},900);}else{
  setTimeout(function(){if(!shown&&scrollRatio()>=CONFIG.scrollTrigger)open('scroll35');},CONFIG.minDelayMs);
  setTimeout(function(){if(!shown)open('time20');},CONFIG.fallbackDelayMs);
}
function submit(e){e.preventDefault();var form=e.currentTarget,email=form.querySelector('input[name="EMAIL"]'),status=form.querySelector('.yms-hook-status'),btn=form.querySelector('button[type="submit"]');status.classList.remove('show');status.textContent='';if(!email.value||!/^\S+@\S+\.\S+$/.test(email.value)){status.textContent='Please enter a valid email address.';status.classList.add('show');email.focus();return;}if(form.querySelector('input[name="email_address_check"]').value)return;btn.disabled=true;btn.textContent='Sending…';var body=new URLSearchParams();body.set('EMAIL',email.value.trim());body.set('HOOK_SOURCE',testMode?'website_popup_test':'website_popup');body.set('HOOK_PAGE',location.pathname);var consent=form.querySelector('input[name="MARKETING_CONSENT"]').checked;body.set('MARKETING_CONSENT',consent?'1':'0');track('hook_popup_submit_attempt',{trigger:overlay.dataset.trigger||'unknown',marketing_consent:consent?'yes':'no'});fetch(CONFIG.brevoFormUrl,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()}).then(function(){if(!testMode){try{localStorage.setItem(CONFIG.requestStorageKey,'1');}catch(e){}}track('hook_popup_submit',{trigger:overlay.dataset.trigger||'unknown',marketing_consent:consent?'yes':'no'});showStep(3);}).catch(function(){track('hook_popup_submit_error',{trigger:overlay.dataset.trigger||'unknown'});status.textContent='Something went wrong. Please try again.';status.classList.add('show');}).finally(function(){btn.disabled=false;btn.textContent='Send me the guide';});}
})();
/* Your Mind Story: first-party page log -> "Your Mind Story Sales Log (Payhip)" Google Sheet.
   Logs what visitors do on sales and welcome pages so it sits next to Payhip sales.
   No names, emails or free text are ever sent. Without analytics consent, events are counted
   anonymously (no visitor ID, nothing stored in the browser). With consent, a per-tab session ID
   is added so a visitor's journey can be followed from first view to purchase. */
(function(){
  if(window.__ymsSheetLog) return; window.__ymsSheetLog = true;
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwhdwd7KFEqGnu6qVtX9V_lp7JFI1XaeWidG6HdCJlS8-kr8AyH6WpnedvyyugKMBIH/exec';
  var UTM = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  function consent(){ try{ return localStorage.getItem('yms_analytics_consent') === 'yes'; }catch(e){ return false; } }
  function sid(){
    if(!consent()) return 'anon';
    try{ var s = sessionStorage.getItem('yms_sid'); if(!s){ s = Date.now().toString(36) + Math.random().toString(36).slice(2,8); sessionStorage.setItem('yms_sid', s); } return s; }catch(e){ return 'anon'; }
  }
  var q = new URLSearchParams(location.search);
  var attr = {};
  UTM.forEach(function(k){ var v = q.get(k); if(!v && consent()){ try{ v = sessionStorage.getItem('yms_quiz_' + k) || ''; }catch(e){} } attr[k] = (v || '').slice(0,80); });
  var refHost = ''; try{ refHost = document.referrer ? new URL(document.referrer).hostname : ''; }catch(e){}
  var device = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  var inApp = /TikTok|musical_ly|Bytedance|Instagram|FBAN|FBAV/i.test(navigator.userAgent) ? (/TikTok|musical_ly|Bytedance/i.test(navigator.userAgent) ? 'tiktok_app' : 'meta_app') : '';
  var start = Date.now(), maxScroll = 0, sent = {};
  function clean(t){ return String(t || '').replace(/\s+/g,' ').trim().slice(0,90); }
  function log(event, detail, extra){
    var body = { action:'event', event:event, detail:clean(detail), page:location.pathname, product:(extra && extra.product) || '',
      session:sid(), referrer:refHost, in_app:inApp, device:device, seconds:Math.round((Date.now()-start)/1000), scroll:maxScroll };
    UTM.forEach(function(k){ body[k] = attr[k]; });
    var json = JSON.stringify(body);
    try{ if(navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([json], {type:'text/plain;charset=UTF-8'}))) return; }catch(e){}
    try{ fetch(ENDPOINT, {method:'POST', mode:'no-cors', keepalive:true, headers:{'Content-Type':'text/plain;charset=utf-8'}, body:json}); }catch(e){}
  }
  function once(key, event, detail, extra){ if(sent[key]) return; sent[key] = 1; log(event, detail, extra); }
  window.YMSSheetLog = { log: log };

  var pageProduct = (document.body && document.body.getAttribute('data-log-product')) || q.get('p') || '';
  once('view', 'page_view', document.title, {product: pageProduct});

  /* Scroll depth */
  function onScroll(){
    var h = document.documentElement.scrollHeight - innerHeight; if(h <= 0) return;
    var pct = Math.round(scrollY / h * 100); if(pct > maxScroll) maxScroll = pct;
    [25,50,75,90].forEach(function(m){ if(maxScroll >= m) once('scroll'+m, 'scroll_depth', m + '%'); });
  }
  addEventListener('scroll', onScroll, {passive:true});

  /* Each section seen */
  function sectionName(s){
    var id = s.getAttribute('aria-labelledby'); var h = id && document.getElementById(id);
    return clean((h && h.textContent) || s.getAttribute('aria-label') || s.id || s.className).slice(0,60);
  }
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ var n = sectionName(e.target); once('sec:'+n, 'section_view', n); io.unobserve(e.target); } }); }, {threshold:0.35});
    document.querySelectorAll('main section, body > section, section').forEach(function(s){ io.observe(s); });
  }

  /* Every click on a button or link */
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a,button,summary'); if(!a) return;
    if(a.tagName === 'SUMMARY'){
      var d = a.parentNode; if(d && !d.open) log(d.id === 'guarantee' ? 'guarantee_open' : (d.classList.contains('jan-more') ? 'story_open' : 'faq_open'), a.textContent);
      return;
    }
    var label = a.getAttribute('aria-label') || a.textContent;
    var place = a.getAttribute('data-cta-placement') || '';
    var href = a.getAttribute('href') || '';
    var dest = ''; try{ dest = href ? new URL(href, location.href).hostname : ''; }catch(err){}
    if(a.classList.contains('js-buy')){
      log(/payhip\.com/.test(dest) ? 'buy_click' : 'cta_click', place + ' | ' + label, {product: pageProduct});
    } else if(a.classList.contains('js-checkin') || /\/(quiet|pull|trust|return|calm|no-contact)\/|checkin-/.test(href)){
      log('checkin_click', label, {product: pageProduct});
    } else if(a.classList.contains('menu-btn')){
      log('menu_toggle', label);
    } else {
      log('link_click', label + (href ? ' -> ' + href.slice(0,60) : ''));
    }
  }, true);

  /* Time on page + furthest scroll when she leaves */
  function leave(){ once('leave', 'page_leave', maxScroll + '% scrolled'); }
  addEventListener('pagehide', leave);
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'hidden') leave(); });
})();

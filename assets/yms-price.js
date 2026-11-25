/* r10 (25 Nov 2026, owner): Return to Yourself Self-Guided goes from £117 to £127 at 00:00 UK on 29 Nov 2026.
   Before then this does nothing. From then it swaps the self-guided price on static pages and hides the
   "Start before 29 November" lines. ?yms_price_test=after previews it. The Stan checkout price is changed in Stan. */
(function(){
  var after=Date.now()>=Date.UTC(2026,10,29,0,0,0)||/[?&]yms_price_test=after/.test(location.search);
  if(!after)return;
  function fix(t){return t.replace(/£117/g,'£127').replace(/([Ss]ave) £31/g,'$1 £21')}
  function run(root){
    root.querySelectorAll('.yms-price-rise,.v4-price-rise').forEach(function(e){e.style.display='none'});
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n;
    while(n=w.nextNode()){if(/£117|ave £31/.test(n.nodeValue))n.nodeValue=fix(n.nodeValue)}
    root.querySelectorAll('[aria-label*="£117"],[data-rec-price="117"],[data-price="117"]').forEach(function(e){
      if(e.getAttribute('aria-label'))e.setAttribute('aria-label',fix(e.getAttribute('aria-label')));
      if(e.getAttribute('data-rec-price')==='117')e.setAttribute('data-rec-price','127');
      if(e.getAttribute('data-price')==='117')e.setAttribute('data-price','127');
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){run(document.body)});else run(document.body);
})();

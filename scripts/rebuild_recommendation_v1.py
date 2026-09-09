from pathlib import Path

# Reconstruct YMS-REC-2026-V1 from the recovered 8 Sep build report.

quiz = Path('quiz.html')
s = quiz.read_text()
marker = "  // -------------------- submit --------------------\n"
if marker not in s:
    raise SystemExit('quiz submit marker not found')

rec_fn = '''  // -------------------- YMS-REC-2026-V1 recommendation mirror --------------------
  function computeRecommendationV1Client(scores, resultInfo){
    var total = V2_BUCKET_KEYS.reduce(function(sum, k){ return sum + Number(scores[k]); }, 0);
    var breadth = V2_BUCKET_KEYS.filter(function(k){ return Number(scores[k]) >= 3; }).length;
    var allLower = V2_BUCKET_KEYS.every(function(k){ return resultInfo.activation[k] === 'lower'; });
    var allFourAtLeastThree = V2_BUCKET_KEYS.every(function(k){ return Number(scores[k]) >= 3; });
    var level, rule, recommendedStage = null, mixedRequired = false;
    if (allLower){ level='bare_minimum'; rule='all_lower'; }
    else if (breadth >= 3 && total >= 15){ level='bootcamp_level'; rule='breadth_3_total_15'; }
    else {
      level='audio_first'; rule='active_contained';
      if (resultInfo.type === 'single' && resultInfo.primary){ recommendedStage = BUCKET_DISPLAY_NAMES[resultInfo.primary]; }
      else if (resultInfo.type === 'mixed'){ mixedRequired = true; }
    }
    return {
      recommendationEngineVersion:'YMS-REC-2026-V1', totalFourStageScore:total, breadthCount:breadth,
      recommendationLevel:level, recommendationRuleTriggered:rule,
      broadModerateBoundary:allFourAtLeastThree && total >= 12 && total <= 14,
      recommendedStage:recommendedStage, recommendedProduct:'',
      mixedClarificationRequired:mixedRequired, mixedClarificationSelection:''
    };
  }

'''
if 'function computeRecommendationV1Client' not in s:
    s = s.replace(marker, rec_fn + marker, 1)

old = "    var mixedNames = mixedKeys.map(function(k){ return BUCKET_DISPLAY_NAMES[k]; });\n\n    YMSQuiz.setResultData({"
new = """    var mixedNames = mixedKeys.map(function(k){ return BUCKET_DISPLAY_NAMES[k]; });

    var recommendation = computeRecommendationV1Client(clientScores, clientResult);
    if (serverData && serverData.recommendationLevel){
      recommendation = {
        recommendationEngineVersion: serverData.recommendationEngineVersion || 'YMS-REC-2026-V1',
        totalFourStageScore: serverData.totalFourStageScore,
        breadthCount: serverData.breadthCount,
        recommendationLevel: serverData.recommendationLevel,
        recommendationRuleTriggered: serverData.recommendationRuleTriggered || '',
        broadModerateBoundary: serverData.broadModerateBoundary === true,
        recommendedStage: serverData.recommendedStage || null,
        recommendedProduct: serverData.recommendedProduct || '',
        mixedClarificationRequired: serverData.mixedClarificationRequired === true,
        mixedClarificationSelection: serverData.mixedClarificationSelection || ''
      };
    }

    YMSQuiz.setResultData({"""
if old not in s:
    raise SystemExit('quiz resultData insertion marker not found')
s = s.replace(old, new, 1)

old = "      overallActivationStrength: overallActivation,\n      resultToken: finalResultToken\n    });"
new = """      overallActivationStrength: overallActivation,
      resultToken: finalResultToken,
      recommendationEngineVersion: recommendation.recommendationEngineVersion,
      totalFourStageScore: recommendation.totalFourStageScore,
      breadthCount: recommendation.breadthCount,
      recommendationLevel: recommendation.recommendationLevel,
      recommendationRuleTriggered: recommendation.recommendationRuleTriggered,
      broadModerateBoundary: recommendation.broadModerateBoundary,
      recommendedStage: recommendation.recommendedStage,
      recommendedProduct: recommendation.recommendedProduct,
      mixedClarificationRequired: recommendation.mixedClarificationRequired,
      mixedClarificationSelection: recommendation.mixedClarificationSelection
    });

    YMSQuiz.track('quiz_recommendation_assigned', {
      recommendation_level: recommendation.recommendationLevel,
      recommendation_rule_triggered: recommendation.recommendationRuleTriggered
    });"""
if old not in s:
    raise SystemExit('quiz resultData field marker not found')
s = s.replace(old, new, 1)
quiz.write_text(s)

shared = Path('assets/yms-quiz-shared.js')
s = shared.read_text()
export_marker = "  global.YMSQuiz = {\n"
if export_marker not in s:
    raise SystemExit('shared export marker not found')

router = '''  // ---------------- YMS-REC-2026-V1 recommendation router ----------------
  var QUIZ_BACKEND_URL_V1 = "https://script.google.com/macros/s/AKfycbx07a1k3XYK_jvTYQDtwq3zu-LZYpe8FgvvHvnd5WXiI7M8nw5YaMqiQCJ-AUfRYu54/exec";
  var AUDIO_PRODUCTS_V1 = {
    'Quiet the Alarm': {url:'https://payhip.com/b/53N2B', description:'Your body is reacting to what happens, and once that alarm starts it can be difficult to fully settle again.'},
    'Break the Pull': {url:'https://payhip.com/b/N8hbz', description:"You keep getting pulled back into him or the situation: checking, texting, replaying, analysing, looking for signs or trying to understand what is happening."},
    'Restore Self Trust': {url:'https://payhip.com/b/3RlF7', description:'What happens with him is making it harder to trust your own read of things and the decisions you make for yourself.'},
    'Restore Self-Trust': {url:'https://payhip.com/b/3RlF7', description:'What happens with him is making it harder to trust your own read of things and the decisions you make for yourself.'},
    'Return to Yourself': {url:'https://payhip.com/b/6pE8S', description:"You have started losing connection with yourself, or parts of your own life, needs and priorities have moved into the background."}
  };

  function renderAudioRecommendationV1(container, stageName){
    var product=AUDIO_PRODUCTS_V1[stageName];
    if(!product){ container.innerHTML='<p class="result-lede">Your next step is '+escapeText(stageName||'the area your result identified')+'.</p>'; return; }
    container.innerHTML='<div class="divider"></div><span class="og-label">YOUR RECOMMENDED NEXT STEP</span><p class="result-lede" style="margin-top:0;">'+escapeText(stageName)+'</p><p>'+escapeText(product.description)+'</p><p>This is the guided Cognitive Behavioural Hypnotherapy audio I would start with based on your result.</p><div class="cta-row"><a class="btn-cta" href="'+product.url+'" id="ymsAudioRecommendationCta">START WITH '+escapeText(stageName).toUpperCase()+'</a></div>';
    var cta=document.getElementById('ymsAudioRecommendationCta');
    if(cta) cta.addEventListener('click',function(){track('quiz_audio_recommendation_click',{selected_stage:stageName});});
  }

  function recordMixedSelectionV1(data, selectedStage){
    if(!data || !data.resultToken) return;
    fetch(QUIZ_BACKEND_URL_V1,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'recordMixedSelection',resultToken:data.resultToken,selectedStage:selectedStage})}).catch(function(){});
  }

  function renderMixedClarificationV1(container, data){
    var tied=(data&&data.tiedResults)||[];
    var valid=tied.filter(function(n){return !!AUDIO_PRODUCTS_V1[n];});
    if(!valid.length){ mountOGBootcampBridge(container.id); return; }
    var options=valid.map(function(name,i){return '<label class="fc-option" for="ymsMixed_'+i+'"><input type="radio" name="ymsMixedClarification" id="ymsMixed_'+i+'" value="'+i+'"><span class="fc-option-text"><strong>'+escapeText(name)+'</strong><br>'+escapeText(AUDIO_PRODUCTS_V1[name].description)+'</span><span class="fc-option-mark" aria-hidden="true"></span></label>';}).join('');
    container.innerHTML='<div class="divider"></div><span class="og-label">ONE QUICK QUESTION</span><p class="result-lede">Your scores are genuinely split between these areas. Rather than guess which one matters more to you, which is taking more from you right now?</p><div class="fc-options" id="ymsMixedOptions" role="radiogroup">'+options+'</div><div class="cta-row"><button type="button" class="btn-cta" id="ymsMixedContinue" disabled>CONTINUE</button></div>';
    var selected=null, btn=document.getElementById('ymsMixedContinue'), wrap=document.getElementById('ymsMixedOptions');
    wrap.addEventListener('change',function(e){ if(!e.target||e.target.type!=='radio')return; selected=valid[parseInt(e.target.value,10)]; Array.prototype.forEach.call(wrap.querySelectorAll('.fc-option'),function(el){el.classList.remove('selected');}); var label=e.target.closest('.fc-option'); if(label)label.classList.add('selected'); btn.disabled=!selected; });
    btn.addEventListener('click',function(){ if(!selected)return; data.recommendedStage=selected; data.mixedClarificationSelection=selected; data.mixedClarificationRequired=false; setResultData(data); track('quiz_mixed_clarification',{selected_stage:selected}); recordMixedSelectionV1(data,selected); renderAudioRecommendationV1(container,selected); });
  }

  function mountRecommendationV1(containerId,resultBucketKey){
    var container=document.getElementById(containerId); if(!container)return;
    var data=getResultData()||{}, level=data.recommendationLevel||'';
    if(!level){ mountOGBootcampBridge(containerId,resultBucketKey); return; }
    if(level==='bootcamp_level'){ mountOGBootcampBridge(containerId,resultBucketKey); return; }
    if(level==='bare_minimum'){ container.innerHTML='<div class="divider"></div><span class="og-label">YOUR RECOMMENDED NEXT STEP</span><p class="result-lede">Start with The Bare Minimum.</p><div class="cta-row"><a class="btn-cta" href="https://payhip.com/b/ZcdmX">START WITH THE BARE MINIMUM</a></div>'; return; }
    if(level==='audio_first'){
      if(data.resultType==='mixed' && data.mixedClarificationRequired && !data.mixedClarificationSelection){ renderMixedClarificationV1(container,data); return; }
      renderAudioRecommendationV1(container,data.mixedClarificationSelection||data.recommendedStage||data.primaryResult||''); return;
    }
    mountOGBootcampBridge(containerId,resultBucketKey);
  }

'''
if 'function mountRecommendationV1' not in s:
    s=s.replace(export_marker,router+export_marker,1)
old="    formatList: formatList,\n    mountOGBootcampBridge: mountOGBootcampBridge\n"
new="    formatList: formatList,\n    mountOGBootcampBridge: mountOGBootcampBridge,\n    mountRecommendationV1: mountRecommendationV1\n"
if old not in s:
    raise SystemExit('shared export marker not found')
s=s.replace(old,new,1)
shared.write_text(s)

repls={
'quiet-the-alarm.html':("YMSQuiz.mountOGBootcampBridge('ogBridge', 'quiet-the-alarm');","YMSQuiz.mountRecommendationV1('ogBridge', 'quiet-the-alarm');"),
'break-the-pull.html':("YMSQuiz.mountOGBootcampBridge('ogBridge', 'break-the-pull');","YMSQuiz.mountRecommendationV1('ogBridge', 'break-the-pull');"),
'restore-self-trust.html':("YMSQuiz.mountOGBootcampBridge('ogBridge', 'restore-self-trust');","YMSQuiz.mountRecommendationV1('ogBridge', 'restore-self-trust');"),
'return-to-yourself.html':("YMSQuiz.mountOGBootcampBridge('ogBridge', 'return-to-yourself');","YMSQuiz.mountRecommendationV1('ogBridge', 'return-to-yourself');"),
'mixed-result.html':("YMSQuiz.mountOGBootcampBridge('ogBridge');","YMSQuiz.mountRecommendationV1('ogBridge');")}
for name,(a,b) in repls.items():
    p=Path(name); t=p.read_text()
    if a not in t: raise SystemExit(name+': router marker not found')
    p.write_text(t.replace(a,b,1))

from pathlib import Path

VERSION='20260910-rec2'
shared='assets/yms-quiz-shared.js'
pages=[
    'quiz.html','quiz-landing-page.html','quiet-the-alarm.html','break-the-pull.html',
    'restore-self-trust.html','return-to-yourself.html','mixed-result.html','no-result.html'
]

for name in pages:
    p=Path(name)
    text=p.read_text(encoding='utf-8')
    text=text.replace(f'src="{shared}"', f'src="{shared}?v={VERSION}"')
    text=text.replace(f"src='{shared}'", f"src='{shared}?v={VERSION}'")
    p.write_text(text,encoding='utf-8')

# Force result navigation to fetch the current result HTML rather than a stale cached page.
p=Path('quiz.html')
text=p.read_text(encoding='utf-8')
for bare in [
    'quiet-the-alarm.html','break-the-pull.html','restore-self-trust.html',
    'return-to-yourself.html','mixed-result.html','no-result.html'
]:
    text=text.replace(f'"{bare}"', f'"{bare}?v={VERSION}"')
p.write_text(text,encoding='utf-8')

# Do not silently fall back to the old Bootcamp bridge if the current
# recommendation payload is missing. That can happen when an old cached quiz
# page creates the session data. A stale session must never masquerade as a
# valid current recommendation.
p=Path(shared)
text=p.read_text(encoding='utf-8')
old="    if(!level){ mountOGBootcampBridge(containerId,resultBucketKey); return; }"
new="""    if(!level){
      container.innerHTML='<div class="divider"></div><span class="og-label">YOUR UPDATED RESULT</span><p class="result-lede">I need the current quiz version to give you the right recommendation.</p><p>Your browser has carried over an older result session, so I will not guess which support level is right for you.</p><div class="cta-row"><a class="btn-cta" href="quiz.html?v=20260910-rec2">RETAKE THE UPDATED QUIZ</a></div>';
      return;
    }"""
if old not in text:
    raise SystemExit('Expected old fallback not found')
text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')

print('quiz result hotfix applied')

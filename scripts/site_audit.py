from pathlib import Path
from urllib.parse import unquote
import re, json, hashlib, posixpath
from collections import defaultdict

ROOT = Path('.')
SKIP_DIRS = {'.git'}
html_files = sorted([p for p in ROOT.rglob('*.html') if not any(part in SKIP_DIRS for part in p.parts)])
all_files = sorted([p for p in ROOT.rglob('*') if p.is_file() and not any(part in SKIP_DIRS for part in p.parts)])

GA_ID='G-0MFXQ5ETCD'
CLARITY_ID='xl81ev553e'
META_ID='1255763909834805'

# Only real HTML attributes; do not match data-action etc.
ref_re = re.compile(r'''(?<![-\w])(?:href|src|action)\s*=\s*["']([^"']+)["']''', re.I)
script_src_re = re.compile(r'''<script[^>]+src\s*=\s*["']([^"']+)["']''', re.I)
script_url_re = re.compile(r'https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec')
payhip_re = re.compile(r'https://payhip\.com/b/[A-Za-z0-9]+')

existing = {str(p).replace('\\','/') for p in all_files}
inbound = defaultdict(list)
outbound_internal = defaultdict(list)
broken = defaultdict(list)
rows=[]

hash_groups=defaultdict(list)
for p in all_files:
    try:
        hash_groups[hashlib.sha256(p.read_bytes()).hexdigest()].append(str(p).replace('\\','/'))
    except Exception:
        pass


def resolve_local(base_file, raw):
    raw = raw.strip()
    if not raw or raw.startswith(('#','mailto:','tel:','javascript:','data:')):
        return None, False
    if raw.startswith(('http://','https://','//')):
        return None, False
    target = unquote(raw.split('#',1)[0].split('?',1)[0])
    if not target:
        return None, False
    if target.startswith('/'):
        tpath = target.lstrip('/')
    else:
        base = base_file.parent.as_posix()
        tpath = posixpath.normpath((base.rstrip('/') + '/' + target) if base != '.' else target)
    candidates=[tpath]
    if tpath.endswith('/'):
        candidates.append(tpath+'index.html')
    elif '.' not in Path(tpath).name:
        candidates.append(tpath+'/index.html')
        candidates.append(tpath+'.html')
    resolved=next((c for c in candidates if c in existing), None)
    return resolved, True


def loaded_local_text(page, html_text):
    combined = html_text
    for raw in script_src_re.findall(html_text):
        resolved, is_local = resolve_local(page, raw)
        if resolved and resolved in existing:
            try:
                combined += '\n' + Path(resolved).read_text(encoding='utf-8', errors='ignore')
            except Exception:
                pass
    return combined

for p in html_files:
    rel=str(p).replace('\\','/')
    text=p.read_text(encoding='utf-8', errors='ignore')
    refs=ref_re.findall(text)
    for raw in refs:
        resolved, is_local = resolve_local(p, raw)
        if not is_local:
            continue
        if resolved:
            outbound_internal[rel].append(resolved)
            inbound[resolved].append(rel)
        else:
            broken[rel].append(raw)

    effective_text = loaded_local_text(p, text)
    rows.append({
        'path': rel,
        'size': p.stat().st_size,
        'title': (re.search(r'<title>(.*?)</title>', text, re.I|re.S).group(1).strip() if re.search(r'<title>(.*?)</title>', text, re.I|re.S) else ''),
        'noindex': bool(re.search(r'<meta[^>]+name=["\']robots["\'][^>]+noindex', text, re.I) or re.search(r'<meta[^>]+content=["\'][^"\']*noindex', text, re.I)),
        'ga4': GA_ID in effective_text,
        'clarity': CLARITY_ID in effective_text,
        'meta_pixel': META_ID in effective_text,
        'forms': len(re.findall(r'<form\b', text, re.I)),
        'apps_script_urls': sorted(set(script_url_re.findall(effective_text))),
        'payhip_urls': sorted(set(payhip_re.findall(effective_text))),
        'inbound_count': 0,
        'broken_internal_count': len(broken[rel]),
    })

for row in rows:
    row['inbound_count']=len(set(inbound[row['path']]))


def classify(path, row):
    name=Path(path).name.lower()
    if path=='index.html': return 'LIVE/KEEP','Homepage'
    if path in {'quiz.html','quiz-landing-page.html','quiet-the-alarm.html','break-the-pull.html','restore-self-trust.html','return-to-yourself.html','mixed-result.html','no-result.html'}:
        return 'LIVE/KEEP','Current quiz funnel'
    if path in {'checkin-quiet.html','checkin-pull.html','checkin-self-trust.html','checkin-return.html'}:
        return 'LIVE/KEEP','Current 4-audio check-in funnel'
    if path in {'about.html','privacy.html','why-this-works.html','success-stories.html','bootcamp-waitlist.html'}:
        return 'LIVE/KEEP','Core trust/funnel page'
    if name in {'quiz_2.html','quiz_fixed.html','low-result.html'}:
        return 'ARCHIVE CANDIDATE','Looks like old/duplicate quiz page; verify external links first'
    if name.startswith('checkin-') and path not in {'checkin-quiet.html','checkin-pull.html','checkin-self-trust.html','checkin-return.html'}:
        return 'REVIEW','Older/other check-in page; may still serve legacy products'
    if name.endswith('-intro.html'):
        return 'REVIEW','Product intro page; verify current customer links'
    if row['inbound_count']==0 and row['noindex']:
        return 'ARCHIVE CANDIDATE','No internal inbound links + noindex; verify external/customer links'
    if row['inbound_count']==0:
        return 'REVIEW','No internal inbound links; could be SEO landing page or orphan'
    return 'KEEP/REVIEW','Linked from site'

for row in rows:
    row['audit_status'], row['audit_reason']=classify(row['path'],row)

identical=[v for v in hash_groups.values() if len(v)>1]
report={
    'summary':{
        'html_pages':len(html_files),
        'all_files':len(all_files),
        'pages_with_ga4':sum(r['ga4'] for r in rows),
        'pages_with_clarity':sum(r['clarity'] for r in rows),
        'pages_with_meta_pixel':sum(r['meta_pixel'] for r in rows),
        'pages_with_forms':sum(r['forms']>0 for r in rows),
        'pages_with_broken_internal_links':sum(r['broken_internal_count']>0 for r in rows),
        'identical_file_groups':len(identical),
    },
    'pages':rows,
    'broken_internal_links':{k:sorted(set(v)) for k,v in broken.items() if v},
    'inbound_links':{k:sorted(set(v)) for k,v in inbound.items()},
    'identical_files':identical,
}
Path('AUDIT_REPORT.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')

lines=['# Your Mind Story Website Audit — 10 Sep 2026','',
'This is a non-destructive inventory. **Nothing was deleted.** Statuses marked REVIEW/ARCHIVE CANDIDATE require verification of external/customer links before any removal.','',
'## Snapshot']
for k,v in report['summary'].items(): lines.append(f'- {k.replace("_"," ").title()}: **{v}**')
lines += ['', '## Page map','', '| Status | Page | Inbound | GA4 | Clarity | Meta | Forms | Broken | Reason |','|---|---|---:|:---:|:---:|:---:|---:|---:|---|']
order={'LIVE/KEEP':0,'KEEP/REVIEW':1,'REVIEW':2,'ARCHIVE CANDIDATE':3}
for r in sorted(rows,key=lambda x:(order.get(x['audit_status'],9),x['path'])):
    lines.append(f"| {r['audit_status']} | `{r['path']}` | {r['inbound_count']} | {'✓' if r['ga4'] else '—'} | {'✓' if r['clarity'] else '—'} | {'✓' if r['meta_pixel'] else '—'} | {r['forms']} | {r['broken_internal_count']} | {r['audit_reason'].replace('|','/')} |")
lines += ['', '## Exact duplicate files']
for group in identical: lines.append('- ' + ' = '.join(f'`{x}`' for x in group))
if not identical: lines.append('- None detected by exact SHA-256 content hash.')
lines += ['', '## Broken internal links']
if report['broken_internal_links']:
    for page,refs in sorted(report['broken_internal_links'].items()): lines.append(f'- `{page}` → ' + ', '.join(f'`{x}`' for x in refs))
else: lines.append('- None detected.')
lines += ['', '## Tracking coverage',
 f'- GA4 `{GA_ID}` available to **{report["summary"]["pages_with_ga4"]}/{len(rows)}** HTML pages, including local shared scripts.',
 f'- Microsoft Clarity `{CLARITY_ID}` available to **{report["summary"]["pages_with_clarity"]}/{len(rows)}** HTML pages, including local shared scripts.',
 f'- Meta Pixel `{META_ID}` available to **{report["summary"]["pages_with_meta_pixel"]}/{len(rows)}** HTML pages, including local shared scripts.',
 '- Presence in source confirms installation code, not that each vendor is currently receiving/processing events. Live account-side verification is a separate step.',
 '', '## Safe cleanup rule',
 'Do not delete a page merely because it has zero internal inbound links. SEO pages, paid/customer-only pages, old email links and Payhip delivery links can legitimately be orphaned from the navigation. Archive/delete only after checking external traffic, email/product links and redirects.']
Path('WEBSITE_AUDIT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps(report['summary'],indent=2))

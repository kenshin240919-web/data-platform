"""One-off: 행정안전부 공공서비스(혜택) 정보(15113968, api.odcloud.kr gov24 v3) 표본 → reports/benefit/sample.md.
목록·상세·지원조건 전체를 받아 통계만 남김(키·원문 전체는 남기지 않음). 내근처 혜택 설계용.
Usage: DATA_GO_KR_KEY=... python scripts/benefit-sample.py"""
import json, os, re, urllib.parse, urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

key = urllib.parse.unquote(os.environ['DATA_GO_KR_KEY'].strip())
API = 'https://api.odcloud.kr/api/gov24/v3'
calls = 0


def page(name, p, per=1000):
    global calls
    calls += 1
    url = f'{API}/{name}?' + urllib.parse.urlencode({'page': p, 'perPage': per, 'returnType': 'JSON', 'serviceKey': key})
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=120) as r:
        return json.loads(r.read().decode('utf-8', 'replace'))


def all_rows(name):
    rows, p, total = [], 1, None
    while total is None or len(rows) < total:
        d = page(name, p)
        total = d.get('totalCount') or 0
        got = d.get('data') or []
        if not got:
            break
        rows += got
        p += 1
    return rows, total


out = [f'# 공공서비스(혜택) 정보 표본 {datetime.now(timezone(timedelta(hours=9))):%Y-%m-%d %H:%M} KST', '']
try:
    lst, tl = all_rows('serviceList')
except Exception as e:  # 승인 전이면 401/403
    out.append(f'serviceList 실패: {e}')
    lst, tl = [], 0
if lst:
    det, td = all_rows('serviceDetail')
    cond, tc = all_rows('supportConditions')
    n = len(lst)
    pc = lambda a: f'{a:,} ({a * 100 // max(n, 1)}%)'
    out += [f'- 호출 {calls}회 · 목록 {n:,}/{tl:,} · 상세 {len(det):,}/{td:,} · 지원조건 {len(cond):,}/{tc:,}', '']
    for k in ('소관기관유형', '사용자구분', '서비스분야', '지원유형', '접수기관'):
        c = Counter((r.get(k) or '(빈 값)') for r in lst)
        out += [f'## {k} (종류 {len(c):,})', ', '.join(f'{a} {b:,}' for a, b in c.most_common(25)), '']
    org = Counter(r.get('소관기관명') or '' for r in lst)
    out += [f'## 소관기관명 (종류 {len(org):,}) 많은 순', ', '.join(f'{a} {b:,}' for a, b in org.most_common(30)), '']
    gu = sum(1 for r in lst if re.search(r'(시|군|구)$', (r.get('소관기관명') or '').split(' ')[-1]) and (r.get('소관기관유형') or '').startswith('지방'))
    out += [f'- 소관기관명이 시·군·구로 끝나는 지자체 서비스: {pc(gu)}']
    dl = Counter()
    for r in lst:
        s = (r.get('신청기한') or '').strip()
        dl['상시' if '상시' in s else '날짜 있음' if re.search(r'\d{4}[.\-년]\s*\d{1,2}', s) else '빈 값' if not s else '그 밖(글)'] += 1
    out += [f'- 신청기한 형식: {dict(dl)}', '- 신청기한 예: ' + ' / '.join(sorted({(r.get('신청기한') or '')[:40] for r in lst if r.get('신청기한')})[:12])]
    money = sum(1 for r in lst if re.search(r'\d[\d,]*\s*(만\s*)?원', r.get('지원내용') or ''))
    out += [f'- 지원내용에 금액(숫자+원) 있음: {pc(money)}',
            f"- 상세조회URL 있음: {pc(sum(1 for r in lst if r.get('상세조회URL')))}",
            f"- 온라인신청사이트URL 있음(상세): {sum(1 for r in det if r.get('온라인신청사이트URL')):,}/{len(det):,}",
            f"- 구비서류 있음(상세): {sum(1 for r in det if (r.get('구비서류') or '').strip() not in ('', '-', '해당없음')):,}/{len(det):,}",
            f"- 자치법규 있음(상세): {sum(1 for r in det if r.get('자치법규')):,} · 법령 {sum(1 for r in det if r.get('법령')):,}",
            f"- 수정일시 최근 30일: {sum(1 for r in lst if re.sub(r'\\D', '', r.get('수정일시') or '')[:8] >= (datetime.now() - timedelta(days=30)).strftime('%Y%m%d')):,}",
            '- 수정일시 형식 예: ' + ', '.join(sorted({r.get('수정일시') or '' for r in lst})[-3:]), '']
    docs = Counter()
    for r in det:
        for w in ('주민등록등본', '주민등록초본', '가족관계증명서', '소득금액증명', '건강보험', '통장', '신분증', '임대차계약서', '사업자등록'):
            if w in (r.get('구비서류') or ''):
                docs[w] += 1
    out += ['## 구비서류에 자주 나오는 서류', ', '.join(f'{a} {b:,}' for a, b in docs.most_common()), '']
    codes = Counter()
    ages = 0
    for r in cond:
        for k, v in r.items():
            if k.startswith('JA') and k not in ('JA0110', 'JA0111') and str(v).upper() == 'Y':
                codes[k] += 1
        if r.get('JA0110') not in (None, '') or r.get('JA0111') not in (None, ''):
            ages += 1
    out += [f'## 지원조건 (조건 줄 {len(cond):,}곳)', f'- 나이 범위 있음: {ages:,}',
            '- Y 많은 코드: ' + ', '.join(f'{a} {b:,}' for a, b in codes.most_common(50)),
            f"- 조건 값 예: `{json.dumps(cond[0], ensure_ascii=False)[:500]}`", '']
    ex = lst[0]
    out += ['## 목록 한 줄 예(앞부분)', '`' + json.dumps({k: (str(v)[:60] if v else v) for k, v in ex.items()}, ensure_ascii=False) + '`']
path = Path('reports/benefit/sample.md')
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text('\n'.join(out) + '\n', encoding='utf-8')
print('\n'.join(out))

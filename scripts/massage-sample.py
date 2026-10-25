"""massage 설계용 표본(1회성): LOCALDATA 파일 3종(의료유사업·미용업·목욕장업) 건수·항목·영업상태·업태·좌표와
의료유사업 오픈API 응답 형식을 확인한다. 통계·항목 이름·이름 예시만 출력(공개 로그).
Usage: DATA_GO_KR_KEY=... python scripts/massage-sample.py
"""
import importlib.util, json, os, re, urllib.parse
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('service', ROOT / 'scripts/collect-service.py')
S = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(S)
log, http_json = S.log, S.http_json

WORDS = ['안마', '마사지', '스웨디시', '아로마', '타이', '스파', '테라피', '에스테틱', '피부', '찜질', '사우나', '1인', '건마']


def show(kind):
    try:
        rows = S.localdata_rows(kind)
    except SystemExit as e:
        log(f'{kind}: 받지 못함 {e}')
        return
    if not rows:
        return
    cols = list(rows[0].keys())
    log(f'[{kind}] {len(rows):,}행 · 항목 {len(cols)}개: {cols}')
    for c in cols:
        if any(k in c for k in ('영업상태', '상세영업상태', '업태', '위생업태', '업종', '구분')):
            log(f'  {c}: {Counter(r.get(c, "") for r in rows).most_common(15)}')
    st = next((c for c in cols if c == '영업상태명'), None)
    live = [r for r in rows if not st or r.get(st) in ('영업/정상', '영업', '정상')]
    log(f'  영업 중(영업상태명 기준): {len(live):,}')
    xy = [c for c in cols if re.search(r'좌표|위도|경도', c)]
    log(f'  좌표 항목 {xy}: 값 있는 영업 중 행 {sum(1 for r in live if all((r.get(c) or "").strip() for c in xy)):,}')
    name = next((c for c in cols if '사업장명' in c), None)
    if name:
        log(f'  이름 단어(영업 중): {[(w, sum(1 for r in live if w in (r.get(name) or ""))) for w in WORDS]}')
        log(f'  이름 예시: {[r.get(name) for r in live[:12]]}')
    addr = next((c for c in cols if '도로명' in c and '주소' in c), None) or next((c for c in cols if '주소' in c), None)
    if addr:
        log(f'  시도 분포(영업 중): {Counter((r.get(addr) or "").split(" ")[0] for r in live).most_common(18)}')
    for c in cols:
        if '인허가일자' in c:
            ys = Counter((r.get(c) or '')[:4] for r in live)
            log(f'  {c} 연도(영업 중, 상위): {ys.most_common(8)}')


show('medical_related_businesses')
show('beauty_salons')
show('public_baths')

key = os.environ.get('DATA_GO_KR_KEY', '').strip()
if key:
    base = 'https://apis.data.go.kr/1741000/medical_related_businesses'
    for path in ('/info', '', '/getMedicalRelatedBusinesses'):
        for extra in ({'returnType': 'json'}, {'type': 'json'}):
            q = urllib.parse.urlencode({'serviceKey': key, 'pageNo': 1, 'numOfRows': 3, **extra})
            st, d = http_json(f'{base}{path}?{q}', timeout=60)
            log(f'API {path or "(base)"} {list(extra)[0]}: {st} {json.dumps(d, ensure_ascii=False)[:600] if isinstance(d, (dict, list)) else str(d)[:300]}')

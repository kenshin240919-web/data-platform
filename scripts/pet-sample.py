"""pet 설계용 표본(1회성): 농림축산검역본부 구조동물·동물보호센터·분실동물 오픈API가 DATA_GO_KR_KEY로 되는지,
응답 항목·건수를 확인한다. 항목 이름·건수·첫 줄 일부만 출력(공개 로그 — 전화·이름 같은 개인 정보 값은 가림).
Usage: DATA_GO_KR_KEY=... python scripts/pet-sample.py
"""
import importlib.util, json, os, re, urllib.parse
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('academy', ROOT / 'scripts/collect-academy.py')
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)
log, http_json, KST = A.log, A.http_json, A.KST

key = os.environ.get('DATA_GO_KR_KEY', '').strip()
base = 'https://apis.data.go.kr/1543061'
today = datetime.now(KST)
d0 = (today - timedelta(days=30)).strftime('%Y%m%d')
d1 = today.strftime('%Y%m%d')
HIDE = re.compile(r'tel|phone|careNm|chargeNm|officetel|name|Nm$', re.I)

def mask(v):
    return {k: ('***' if HIDE.search(k) and k not in ('kindNm', 'orgNm', 'upKindNm', 'careRegNo') else str(x)[:60]) for k, x in v.items()} if isinstance(v, dict) else v

def items(d):
    try:
        b = d['response']['body']
        it = b.get('items') or {}
        it = it.get('item', it) if isinstance(it, dict) else it
        return (it if isinstance(it, list) else [it] if it else []), b.get('totalCount')
    except Exception:
        return None, None

for name, path, extra in [
    ('구조동물', 'abandonmentPublicService_v2/abandonmentPublic_v2', {'bgnde': d0, 'endde': d1, 'state': 'protect'}),
    ('구조동물 시도', 'abandonmentPublicService_v2/sido_v2', {}),
    ('동물보호센터', 'animalShelterSrvc_v2/shelterInfo_v2', {}),
    ('분실동물', 'lossInfoService/lossInfo', {'bgnde': d0, 'endde': d1}),
]:
    for typ in ({'_type': 'json'}, {'type': 'json'}):
        q = urllib.parse.urlencode({'serviceKey': key, 'pageNo': 1, 'numOfRows': 100, **typ, **extra})
        st, d = http_json(f'{base}/{path}?{q}', timeout=60)
        its, total = items(d) if isinstance(d, dict) else (None, None)
        if its is None:
            log(f'{name} {list(typ)[0]}: HTTP {st} {str(d)[:300]}')
            continue
        keys = sorted({k for i in its for k in i}) if its else []
        log(f'{name}: HTTP {st} · 전체 {total} · 받은 {len(its)} · 항목 {keys}')
        if its:
            log(f'  예시: {json.dumps(mask(its[0]), ensure_ascii=False)[:900]}')
            for k in ('processState', 'kindFullNm', 'upKindNm', 'sexCd', 'neuterYn', 'divisionNm', 'saveTrgtAnimal', 'orgNm'):
                vals = [i.get(k) for i in its if i.get(k)]
                if vals:
                    from collections import Counter
                    log(f'  {k}: {Counter(vals).most_common(8)}')
            img = [i.get('popfile1') or i.get('popfile') or i.get('filename') for i in its]
            log(f'  사진 주소 있는 행: {sum(1 for x in img if x)} · 예시 도메인 {sorted({urllib.parse.urlparse(x).netloc for x in img if x})[:3]}')
        break

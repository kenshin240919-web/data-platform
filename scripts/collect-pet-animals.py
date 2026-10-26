"""Collect animals for pet.guidejung.com (내근처 동물병원 2단계): 보호소에서 새 가족·보호자를 기다리는 구조동물(보호 중)과
분실 신고된 동물 → apps/pet/data/animals.json (daily, with collect-pet.py in pet-collect.yml).

Sources (농림축산검역본부 국가동물보호정보시스템 오픈API, DATA_GO_KR_KEY — 10/26 활용신청, 이용허락범위 제한 없음):
- abandonmentPublicService_v2/abandonmentPublic_v2  state=protect, 최근 90일 발생 → 보호 중인 동물(사진·공고 기간·보호소)
- lossInfoService/lossInfo                           최근 30일 분실 신고 → 신고자 이름·전화는 받지도 저장하지도 않음
Animals take the shelter's coordinates (careRegNo → apps/pet/data/places.json kind 'shelter', 'id' s-{careRegNo});
lost animals are placed by 시군구 only (주소 앞 두 마디 + 동 — 집 주소가 드러나지 않게).
Usage: DATA_GO_KR_KEY=... python scripts/collect-pet-animals.py
"""
import hashlib, importlib.util, json, os, re
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('pet', ROOT / 'scripts/collect-pet.py')
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)
S, K, A, log, txt = P.S, P.K, P.A, P.log, P.txt
OUT = ROOT / 'apps/pet/data/animals.json'
PLACES = ROOT / 'apps/pet/data/places.json'
BASE = 'https://apis.data.go.kr/1543061'
SEX = {'M': '수컷', 'F': '암컷', 'Q': '모름'}
NEUTER = {'Y': '중성화함', 'N': '중성화 안 함', 'U': None}


def ymd(v):
    s = re.sub(r'\D', '', v or '')
    return f'{s[:4]}-{s[4:6]}-{s[6:8]}' if len(s) >= 8 else None


def https(u):
    """사진 주소(http://openapi.animal.go.kr/…) — 사이트는 https라 Worker /photo/{id}가 대신 받아 줌. 주소는 그대로 저장."""
    u = txt(u)
    return u if u and re.match(r'https?://[\w.-]*animal\.go\.kr/', u) else None


def kind_label(full, up):
    k = re.sub(r'^\[[^\]]*\]\s*', '', full or '').strip()
    return k or up or None


def protected(key, shelters, regions):
    today = datetime.now(P.KST)
    # state: notice(공고 중 — 원래 보호자를 기다리는 기간) + protect(공고가 끝나고 보호 중 — 입양 문의)
    rows = []
    for state in ('notice', 'protect'):
        got = P.api_items(f'{BASE}/abandonmentPublicService_v2/abandonmentPublic_v2', key,
                          {'state': state, 'bgnde': (today - timedelta(days=90)).strftime('%Y%m%d'), 'endde': today.strftime('%Y%m%d')})
        if got is None:
            return None
        rows += got
    log('처리 상태', dict(Counter(r.get('processState') for r in rows)))
    out, miss, seen = [], Counter(), set()
    for r in rows:
        aid = re.sub(r'\D', '', r.get('desertionNo') or '')
        if not aid or aid in seen or r.get('processState') not in ('공고중', '보호중'):
            continue
        seen.add(aid)
        sh = shelters.get(f"s-{re.sub(r'[^0-9A-Za-z]', '', r.get('careRegNo') or '')[:24]}")
        if not sh:
            miss['보호소 목록에 없음'] += 1
        a = {'id': aid, 'up': txt(r.get('upKindNm')), 'kind': kind_label(r.get('kindFullNm'), r.get('upKindNm')),
             'color': txt(r.get('colorCd')), 'age': txt(r.get('age')), 'weight': txt(r.get('weight')),
             'sex': SEX.get(r.get('sexCd') or ''), 'neuter': NEUTER.get(r.get('neuterYn') or ''), 'mark': txt(r.get('specialMark')),
             'place': txt(r.get('happenPlace')), 'found': ymd(r.get('happenDt')), 'notice': txt(r.get('noticeNo')),
             'from': ymd(r.get('noticeSdt')), 'until': ymd(r.get('noticeEdt')), 'photo': https(r.get('popfile1')) or https(r.get('popfile2')),
             'shelter': sh['id'] if sh else None, 'org': txt(r.get('orgNm'))}
        if sh:
            a['lat'], a['lon'], a['region'], a['region_name'] = sh.get('lat'), sh.get('lon'), sh['region'], sh['region_name']
        else:  # 보호소 목록에 없으면 보호소 주소(없으면 관할 기관)로 시군구만
            a['_where'] = txt(r.get('careAddr')) or a['org']
            a['shelter_name'], a['shelter_tel'] = txt(r.get('careNm')), P.tel_of(txt(r.get('careTel')), txt(r.get('careAddr')))
        out.append({k: v for k, v in a.items() if v not in (None, '')})
    out = place_many(out, regions)
    log(f'보호 중 {len(out):,}마리', dict(Counter(a.get('up') for a in out)), dict(miss))
    return out


def place_many(items, regions):
    """'_where' 주소로 시군구를 정함(collect-parking.py place를 한 번에). 못 정한 것은 뺌."""
    todo = [a for a in items if '_where' in a]
    qs = [{'id': str(i), 'addr': a['_where'], 'jibun': None, 'org': a['_where'], 'lat': None, 'lon': None} for i, a in enumerate(todo)]
    hit = {q['id']: q for q in K.place(qs, regions)}
    for i, a in enumerate(todo):
        q = hit.get(str(i))
        if q:
            a['region'], a['region_name'] = q['region'], q['region_name']
        a.pop('_where')
    return [a for a in items if 'region' in a]


def lost(key, regions):
    today = datetime.now(P.KST)
    rows = P.api_items(f'{BASE}/lossInfoService/lossInfo', key, {'bgnde': (today - timedelta(days=30)).strftime('%Y%m%d'), 'endde': today.strftime('%Y%m%d')})
    if rows is None:
        return None
    out = []
    for r in rows:
        addr = txt(r.get('happenAddr')) or ''
        dong = re.search(r'\(([^,)]+?[동읍면리가])[,)]', addr)
        sig = '|'.join(str(r.get(k) or '') for k in ('happenDt', 'happenAddr', 'kindCd', 'specialMark', 'age'))
        a = {'id': 'l' + hashlib.sha1(sig.encode()).hexdigest()[:10], '_where': addr or txt(r.get('orgNm')), '_dong': dong.group(1) if dong else None,
             'kind': txt(r.get('kindCd')), 'color': txt(r.get('colorCd')), 'age': txt(r.get('age')), 'sex': SEX.get(r.get('sexCd') or ''),
             'mark': txt(r.get('specialMark')), 'lost': ymd(r.get('happenDt')),
             'photo': https(r.get('popfile'))}
        out.append({k: v for k, v in a.items() if v not in (None, '')})
    out = place_many(out, regions)
    for a in out:  # 잃어버린 곳은 시군구 + 동까지만(집 주소가 드러나지 않게)
        a['where'] = ' '.join(x for x in (a['region_name'], a.pop('_dong', None)) if x)
    out.sort(key=lambda a: a.get('lost') or '', reverse=True)
    log(f'분실 신고 {len(out):,}건')
    return out


def main():
    key = os.environ.get('DATA_GO_KR_KEY', '').strip()
    if not key:
        raise SystemExit('DATA_GO_KR_KEY missing')
    regions = A.weather_regions()
    places = json.loads(PLACES.read_text(encoding='utf-8'))['items']
    shelters = {p['id']: p for p in places if p['kind'] == 'shelter'}
    prev = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    a = protected(key, shelters, regions)
    b = lost(key, regions)
    if a is None and b is None:
        raise SystemExit('구조동물·분실동물 API를 받지 못했습니다')
    a = prev.get('animals', []) if a is None else a
    b = prev.get('lost', []) if b is None else b
    today = datetime.now(P.KST).strftime('%Y-%m-%d')
    a.sort(key=lambda x: ((x.get('until') or '9') < today, x.get('until') or '9', x['id']))  # 공고 마감이 가까운 순(지난 공고는 뒤로)
    data = {'status': {'updated_at': datetime.now(P.KST).isoformat(timespec='seconds'), 'animals': len(a), 'lost': len(b),
                       'with_photo': sum(1 for x in a if x.get('photo'))}, 'animals': a, 'lost': b}
    if prev.get('animals') == a and prev.get('lost') == b:
        log('변경 없음')
        return
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f"보호 중 {len(a):,}마리 · 분실 {len(b):,}건 · 파일 {OUT.stat().st_size / 1e6:.1f}MB")


if __name__ == '__main__':
    main()

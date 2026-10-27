"""One-off: 무인 프린트 검색 시험 — NAVER API HUB 지역 검색(NAVER_HUB_CLIENT_ID/SECRET)과 카카오 로컬 키워드 반경 검색(KAKAO_REST_KEY).
결과 내용(가게 이름·주소)은 저장하지 않고 건수·분류·겹침만 reports/civil/print-sample.md에 남긴다(카카오·네이버 결과 저장 금지).
Usage: NAVER_HUB_CLIENT_ID=... NAVER_HUB_CLIENT_SECRET=... KAKAO_REST_KEY=... python scripts/print-sample.py
"""
import os, re
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'reports/civil/print-sample.md'
# 시험 지점: 강남역 · 부산 서면 · 대전 둔산동
SPOTS = [('강남역', 37.4979, 127.0276, ['강남역', '역삼동']), ('서면', 35.1578, 129.0600, ['서면', '부전동']), ('둔산동', 36.3510, 127.3850, ['둔산동', '탄방동'])]
WORDS = ['무인프린트', '셀프프린트', '프린트카페']
NAME = lambda s: re.sub(r'<[^>]+>|\s+', '', s or '').lower()


def naver(q, cid, sec):
    r = requests.get('https://naverapihub.apigw.ntruss.com/search/v1/local', params={'query': q, 'display': 5, 'sort': 'random'},
                     headers={'X-NCP-APIGW-API-KEY-ID': cid, 'X-NCP-APIGW-API-KEY': sec}, timeout=20)
    return r.status_code, (r.json().get('items', []) if r.ok else r.text[:200])


def kakao(q, lat, lon, key):
    r = requests.get('https://dapi.kakao.com/v2/local/search/keyword.json', params={'query': q, 'x': lon, 'y': lat, 'radius': 3000, 'sort': 'distance', 'size': 15},
                     headers={'Authorization': f'KakaoAK {key}'}, timeout=20)
    return r.status_code, (r.json().get('documents', []) if r.ok else r.text[:200])


def main():
    cid, sec, kk = (os.environ.get(k, '').strip() for k in ('NAVER_HUB_CLIENT_ID', 'NAVER_HUB_CLIENT_SECRET', 'KAKAO_REST_KEY'))
    kst = datetime.now(timezone(timedelta(hours=9)))
    lines = [f'# 무인 프린트 검색 시험 {kst:%Y-%m-%d %H:%M}', '', f'- Secret: NAVER_HUB_CLIENT_ID {"있음" if cid else "없음"} · NAVER_HUB_CLIENT_SECRET {"있음" if sec else "없음"} · KAKAO_REST_KEY {"있음" if kk else "없음"}', '- 가게 이름·주소는 저장하지 않음(건수·분류만).', '']
    lines += ['| 지점 | 네이버(동네×검색어, 합친 곳) | 카카오(3km, 합친 곳) | 겹침 | 네이버 분류 | 카카오 분류 |', '|---|---|---|---|---|---|']
    errs = []
    for spot, lat, lon, dongs in SPOTS:
        nv, kv = {}, {}
        for w in WORDS:
            if cid and sec:
                for d in dongs:
                    st, it = naver(f'{d} {w}', cid, sec)
                    if st != 200: errs.append(f'네이버 {d} {w}: HTTP {st} {it}'); continue
                    for x in it: nv[NAME(x['title'])] = x.get('category', '')
            if kk:
                st, it = kakao(w, lat, lon, kk)
                if st != 200: errs.append(f'카카오 {spot} {w}: HTTP {st} {it}'); continue
                for x in it: kv[NAME(x['place_name'])] = x.get('category_name', '').split(' > ')[-1]
        both = len(set(nv) & set(kv))
        top = lambda c: ', '.join(f'{k} {v}' for k, v in Counter(c.values()).most_common(3)) or '-'
        lines.append(f'| {spot} | {len(nv)} | {len(kv)} | {both} | {top(nv)} | {top(kv)} |')
        print(spot, 'naver', len(nv), 'kakao', len(kv), 'both', both)
    if errs:
        lines += ['', '## 오류', ''] + [f'- {e}' for e in errs[:20]]
        print('\n'.join(errs[:20]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()

"""KOBIS 오픈API → apps/movie/data/kobis.json (내근처 영화관 박스오피스·영화 정보).

11/22 영화진흥위원회 저장·게시 사전 승낙(사용자) → 받은 결과로 정적 페이지(/boxoffice·/boxoffice/weekly|weekend·/film/{코드}).
파일은 저장소에 올리지 않음(공개 저장소라 원본 묶음 재배포가 되지 않게) — movie-deploy.yml이 빌드 전에 매번 받고,
지난 결과는 Actions cache(runtime/movie/kobis.json)에 두어 API가 실패한 날에도 페이지가 사라지지 않게 함.
호출: 일별 14 + 주간 4 + 주말 4 + 새 영화 상세(보통 수십) ≈ 하루 한도 3,000회 중 100회 안팎.
키: 환경변수 KOBIS_API_KEY(로그에 출력하지 않음).
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'apps/movie/data/kobis.json'
CACHE = ROOT / 'runtime/movie/kobis.json'
API = 'https://www.kobis.or.kr/kobisopenapi/webservice/rest'
KST = timezone(timedelta(hours=9))
DAYS, WEEKS = 14, 4
FILM_REFRESH_DAYS = 7  # 상영 중인 영화 정보(등급·배우 등)는 일주일마다 다시 확인
calls = 0


def get(path: str, **params) -> dict | None:
    global calls
    key = os.environ.get('KOBIS_API_KEY', '').strip()
    q = urllib.parse.urlencode({'key': key, **params})
    for i in range(3):
        calls += 1
        try:
            with urllib.request.urlopen(urllib.request.Request(f'{API}/{path}?{q}', headers={'User-Agent': 'guidejung-movie'}), timeout=20) as r:
                d = json.loads(r.read().decode('utf-8'))
            if 'faultInfo' in d:  # 키·인자 오류 — 다시 해도 같음
                print('KOBIS 오류:', d['faultInfo'].get('errorCode'), d['faultInfo'].get('message'))
                return None
            return d
        except Exception as e:  # noqa: BLE001
            print(f'  {path} 다시 시도 {i + 1}: {type(e).__name__}')
            time.sleep(3 * (i + 1))
    return None


def row(x: dict) -> dict:
    i = lambda k: int(x.get(k) or 0)  # noqa: E731
    return {'rank': i('rank'), 'inten': i('rankInten'), 'new': x.get('rankOldAndNew') == 'NEW', 'cd': x.get('movieCd'),
            'name': (x.get('movieNm') or '').strip(), 'open': x.get('openDt') or None, 'audi': i('audiCnt'), 'acc': i('audiAcc'),
            'scrn': i('scrnCnt'), 'show': i('showCnt'), 'share': float(x.get('salesShare') or 0)}


def film(cd: str) -> dict | None:
    d = get('movie/searchMovieInfo.json', movieCd=cd)
    m = (d or {}).get('movieInfoResult', {}).get('movieInfo')
    if not m:
        return None
    names = lambda k, f='peopleNm': [x[f] for x in m.get(k) or [] if x.get(f)]  # noqa: E731
    return {'cd': cd, 'name': m.get('movieNm'), 'en': m.get('movieNmEn') or None, 'runtime': int(m.get('showTm') or 0) or None,
            'year': m.get('prdtYear') or None, 'open': m.get('openDt') or None, 'state': m.get('prdtStatNm') or None,
            'type': m.get('typeNm') or None, 'nations': names('nations', 'nationNm'), 'genres': names('genres', 'genreNm'),
            'directors': names('directors'), 'actors': [{'name': a['peopleNm'], 'cast': a.get('cast') or None} for a in (m.get('actors') or [])[:12] if a.get('peopleNm')],
            'grade': next((a.get('watchGradeNm') for a in m.get('audits') or [] if a.get('watchGradeNm')), None),
            'dist': [c['companyNm'] for c in m.get('companys') or [] if c.get('companyPartNm') == '배급사'][:3],
            'checked': datetime.now(KST).strftime('%Y-%m-%d')}


def main() -> int:
    if not os.environ.get('KOBIS_API_KEY'):
        print('KOBIS_API_KEY 없음')
        return 1
    old = {}
    for p in (OUT, CACHE):
        if p.exists():
            old = json.loads(p.read_text('utf-8'))
            break
    today = datetime.now(KST).date()
    old_daily = {d['date']: d for d in old.get('daily', [])}
    daily = []
    for k in range(1, DAYS + 1):
        day = (today - timedelta(days=k)).strftime('%Y%m%d')
        # 지난 날짜는 바뀌지 않으므로 이미 받은 날은 다시 부르지 않음(어제·그제만 새로)
        if day in old_daily and k > 2:
            daily.append(old_daily[day]); continue
        d = get('boxoffice/searchDailyBoxOfficeList.json', targetDt=day)
        rows = (d or {}).get('boxOfficeResult', {}).get('dailyBoxOfficeList')
        if rows:
            daily.append({'date': day, 'rows': [row(x) for x in rows]})
        elif day in old_daily:
            daily.append(old_daily[day])
    # 지난 일요일 기준 주간(월~일)·주말(금~일)
    sun = today - timedelta(days=(today.weekday() + 1) % 7 or 7)
    def weeks(gb: str, prev: list) -> list:
        keep = {w['end']: w for w in prev}
        out = []
        for k in range(WEEKS):
            end = (sun - timedelta(days=7 * k)).strftime('%Y%m%d')
            if end in keep and k > 0:
                out.append(keep[end]); continue
            d = get('boxoffice/searchWeeklyBoxOfficeList.json', targetDt=end, weekGb=gb)
            r = (d or {}).get('boxOfficeResult', {})
            if r.get('weeklyBoxOfficeList'):
                out.append({'end': end, 'range': r.get('showRange'), 'rows': [row(x) for x in r['weeklyBoxOfficeList']]})
            elif end in keep:
                out.append(keep[end])
        return out
    weekly, weekend = weeks('0', old.get('weekly', [])), weeks('1', old.get('weekend', []))
    if not daily:
        print('일별 박스오피스를 하나도 받지 못함 — 저장하지 않음')
        return 1
    films = dict(old.get('films', {}))
    cds = {r['cd'] for g in (*daily, *weekly, *weekend) for r in g['rows'] if r['cd']}
    cutoff = (today - timedelta(days=FILM_REFRESH_DAYS)).strftime('%Y-%m-%d')
    for cd in sorted(cds):
        if cd in films and films[cd].get('checked', '') > cutoff:
            continue
        f = film(cd)
        if f:
            films[cd] = f
    films = {cd: f for cd, f in films.items() if cd in cds}  # 순위에서 빠진 지 14일·4주 지난 영화는 페이지도 내림
    data = {'updated_at': datetime.now(KST).isoformat(timespec='seconds'), 'daily': daily, 'weekly': weekly, 'weekend': weekend, 'films': films}
    text = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    for p in (OUT, CACHE):
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, 'utf-8')
    print(f'일별 {len(daily)}일·주간 {len(weekly)}·주말 {len(weekend)}·영화 {len(films)}편 (호출 {calls}회)')
    return 0


if __name__ == '__main__':
    sys.exit(main())

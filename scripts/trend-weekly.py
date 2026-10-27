"""매주: 네이버 검색어 트렌드(NAVER API HUB, 데이터랩과 같은 숫자)로 시기 콘텐츠 주제를 고른다 → reports/trend/주간-YYYY-MM-DD.md.
사이트 화면에는 쓰지 않고 '다음에 무슨 페이지·띠를 언제 올릴지' 판단용. 원본 추이(주별 값)는 저장하지 않고 요약 숫자만 남긴다.

주제마다 따로 조회(주제 하나만 넣으면 지난 2년 중 가장 많이 검색된 주가 100) →
  - 지금(최근 완성된 주)·4주 전·작년 같은 주 값
  - 작년 이맘때 이후 8주 안의 정점(있으면 '곧 정점' — 띠·페이지를 미리 준비할 때)
Secrets: NAVER_HUB_CLIENT_ID, NAVER_HUB_CLIENT_SECRET (NAVER API HUB 앱 'near'). 무료(현재 한시적), 주제당 1회 ≈ 주 50회.
Usage: python scripts/trend-weekly.py [--dry]
"""
import os, sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'reports/trend'
URL = 'https://naverapihub.apigw.ntruss.com/search-trend/v1/search'
# (주제, 사이트, 검색어 최대 20개). 사이트는 network.tsx SITES 이름.
TOPICS = [
    ('미세먼지', 'weather', ['미세먼지', '초미세먼지', '황사']), ('한파', 'weather', ['한파', '한파특보', '영하']), ('폭염', 'weather', ['폭염', '열대야', '폭염특보']),
    ('장마·태풍', 'weather', ['장마', '태풍', '호우특보']), ('첫눈·폭설', 'weather', ['첫눈', '폭설', '대설특보']),
    ('독감', 'hospital', ['독감', '독감 증상', '독감 예방접종', '인플루엔자']), ('감기·코로나', 'pharmacy', ['감기약', '코로나', '해열제']),
    ('밤·휴일 병원', 'hospital', ['달빛어린이병원', '야간진료', '일요일 진료', '응급실']), ('명절 문 여는 병원', 'hospital', ['설날 병원', '추석 병원', '명절 병원', '연휴 병원']),
    ('휴일 약국', 'pharmacy', ['문 여는 약국', '휴일지킴이약국', '일요일 약국', '심야약국']),
    ('해돋이', 'trip', ['해돋이', '일출 명소', '해맞이']), ('벚꽃', 'trip', ['벚꽃', '벚꽃 명소', '벚꽃축제']), ('단풍', 'trip', ['단풍', '단풍 명소', '단풍 절정']),
    ('빛축제·크리스마스', 'trip', ['빛축제', '크리스마스 데이트', '일루미네이션']), ('눈썰매장', 'trip', ['눈썰매장', '스키장']), ('물놀이·계곡', 'trip', ['계곡', '물놀이', '워터파크']),
    ('캠핑', 'trip', ['캠핑', '캠핑장', '차박']),
    ('명절 귀성길', 'traffic', ['귀성길', '귀경길', '고속도로 정체', '명절 교통']), ('기름값', 'oil', ['기름값', '휘발유 가격', '유가', '주유소 가격']),
    ('전기차 충전', 'charge', ['전기차 충전', '충전소', '전기차 겨울']),
    ('차 배터리·타이어', 'service', ['자동차 배터리', '배터리 방전', '스노우타이어', '윈터타이어', '부동액']), ('자동차 검사', 'service', ['자동차 검사', '자동차 정기검사', '검사 과태료']),
    ('수능', 'school', ['수능', '수능 시간표', '수능 도시락']), ('시험·성적', 'school', ['기말고사', '중간고사', '수능 성적']), ('방학·특강', 'academy', ['겨울방학 특강', '여름방학 특강', '윈터스쿨', '방학 학원']),
    ('새 학기', 'school', ['새학기 준비', '개학', '입학 준비물', '신학기']), ('학원비', 'academy', ['학원비', '학원 수강료', '교육비 지원']),
    ('연말정산 서류', 'civil', ['연말정산', '연말정산 서류', '간소화 자료']), ('등본·서류 발급', 'civil', ['주민등록등본', '무인민원발급기', '가족관계증명서', '서류 발급']),
    ('여권', 'civil', ['여권 발급', '여권 재발급', '여권 사진']),
    ('찜질방·사우나', 'rest', ['찜질방', '사우나', '목욕탕', '세신']),
    ('동물병원', 'pet', ['동물병원', '24시 동물병원', '강아지 병원']), ('반려동물 여행', 'pet', ['반려견 동반 여행', '애견동반', '강아지 호텔']), ('유기동물 입양', 'pet', ['유기견 입양', '보호소 입양', '유기묘']),
    ('무료 주차', 'parking', ['무료 주차장', '공영주차장', '주차 요금']),
]
NAME = {'weather': '날씨', 'hospital': '병원', 'pharmacy': '약국', 'trip': '여행', 'traffic': '고속도로', 'oil': '주유소', 'charge': '충전소', 'service': '정비소',
        'school': '학교', 'academy': '학원', 'civil': '서류', 'rest': '휴식', 'pet': '동물병원', 'parking': '주차장'}


def fetch(cid, sec, words, start, end):
    r = requests.post(URL, json={'startDate': start.isoformat(), 'endDate': end.isoformat(), 'timeUnit': 'week', 'keywordGroups': [{'groupName': words[0], 'keywords': words}]},
                      headers={'X-NCP-APIGW-API-KEY-ID': cid, 'X-NCP-APIGW-API-KEY': sec, 'Content-Type': 'application/json'}, timeout=30)
    if not r.ok:
        raise RuntimeError(f'{r.status_code} {r.text[:200]}')
    res = r.json().get('results') or [{}]
    return [(date.fromisoformat(d['period']), float(d['ratio'])) for d in res[0].get('data', [])]


def summary(series, today):
    """series: [(주 시작일, 값)] — 최근 완성된 주·4주 전·작년 같은 주·작년 이맘때 이후 8주 안 정점."""
    full = [(d, v) for d, v in series if d + timedelta(days=6) < today]
    if not full:
        return None
    val = dict(full)
    near = lambda d: min(full, key=lambda x: abs((x[0] - d).days))
    cur_d, cur = full[-1]
    ago4 = near(cur_d - timedelta(weeks=4))[1]
    ly_d, ly = near(cur_d - timedelta(weeks=52))
    ahead = [(d, v) for d, v in full if ly_d < d <= ly_d + timedelta(weeks=8)]
    peak_d, peak = max(ahead, key=lambda x: x[1]) if ahead else (None, 0)
    weeks = round((peak_d - ly_d).days / 7) if peak_d else None
    return {'cur': cur, 'ago4': ago4, 'ly': ly, 'peak': peak, 'peak_in': weeks, 'peak_on': (peak_d + timedelta(weeks=52)) if peak_d else None, 'week': cur_d}


def pct(a, b):
    if b <= 0:
        return '—' if a <= 0 else '새로 오름'
    p = round((a - b) / b * 100)
    return f'{p:+,}%'


def advice(s):
    soon = s['peak_in'] and s['peak'] >= max(30, s['ly'] * 1.5)
    if soon and s['peak_in'] <= 3:
        return f'🔥 {s["peak_in"]}주 뒤 정점(작년 기준) — 지금 띠·페이지 올리기'
    if soon:
        return f'⏳ {s["peak_in"]}주 뒤 정점(작년 기준) — 미리 준비'
    if s['ago4'] > 0 and s['cur'] >= s['ago4'] * 1.5 and s['cur'] >= 10:
        return '📈 4주 사이 크게 오름'
    if s['cur'] >= 70:
        return '지금이 많이 찾는 때'
    return ''


def main():
    dry = '--dry' in sys.argv
    cid, sec = (os.environ.get(k, '').strip() for k in ('NAVER_HUB_CLIENT_ID', 'NAVER_HUB_CLIENT_SECRET'))
    kst = datetime.now(timezone(timedelta(hours=9)))
    today = kst.date()
    start = today - timedelta(weeks=104)
    rows, errs = [], []
    for topic, site, words in TOPICS:
        if dry or not (cid and sec):
            errs.append(f'{topic}: 키 없음' if not dry else f'{topic}: 시험 실행(호출 안 함)')
            continue
        try:
            s = summary(fetch(cid, sec, words, start, today), today)
        except Exception as e:  # 한 주제 실패는 건너뜀
            errs.append(f'{topic}: {e}')
            continue
        if s:
            rows.append((topic, site, words, s, advice(s)))
    order = lambda r: (0 if r[4].startswith('🔥') else 1 if r[4].startswith('⏳') else 2 if r[4].startswith('📈') else 3, r[3]['peak_in'] or 99, -r[3]['cur'])
    rows.sort(key=order)
    wk = rows[0][3]['week'] if rows else None
    lines = [f'# 검색어 트렌드 주간 점검 {today.isoformat()}', '',
             f'- 네이버 검색어 트렌드(NAVER API HUB) · 주제마다 지난 2년 중 가장 많이 검색된 주 = 100 · 기준 주: {wk.isoformat() if wk else "—"} 시작 주',
             '- "정점"은 작년 같은 때 이후 8주 안에서 가장 많이 검색된 주(올해도 비슷하다고 가정한 예상) — 시기 페이지·띠를 올릴 때 참고.',
             '- 원본 추이는 저장하지 않고 요약 숫자만 남김.', '',
             '| 주제 | 사이트 | 지금 | 4주 전 대비 | 작년 같은 주 | 예상 정점 | 할 일 |', '|---|---|---|---|---|---|---|']
    for topic, site, words, s, adv in rows:
        peak = f'{s["peak_on"].month}/{s["peak_on"].day} 주 ({s["peak"]:.0f})' if s['peak_on'] and s['peak'] > s['cur'] else '—'
        lines.append(f'| {topic} | {NAME.get(site, site)} | {s["cur"]:.0f} | {pct(s["cur"], s["ago4"])} | {s["ly"]:.0f} | {peak} | {adv} |')
    if errs:
        lines += ['', '## 못 받은 주제', ''] + [f'- {e}' for e in errs]
    lines += ['', f'주제 {len(TOPICS)}개 · 받은 것 {len(rows)}개 · 호출 {len(TOPICS) if cid and sec and not dry else 0}회 · 만든 시각 {kst:%Y-%m-%d %H:%M} KST', '']
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'주간-{today.isoformat()}.md').write_text('\n'.join(lines), encoding='utf-8')
    print('\n'.join(lines))
    if not rows and not dry:
        sys.exit(1)


if __name__ == '__main__':
    main()

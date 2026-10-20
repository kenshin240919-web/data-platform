"""One-off check of NEIS school APIs with the key (prints statistics only): bulk meal by office, page size, schools."""
import json, os, time, urllib.parse, urllib.request
from collections import Counter
KEY = os.environ['NEIS_API_KEY'].strip()
def get(api, **q):
    q = {'KEY': KEY, 'Type': 'json', 'pSize': 1000, **q}
    t = time.time()
    with urllib.request.urlopen(f'https://open.neis.go.kr/hub/{api}?{urllib.parse.urlencode(q)}', timeout=90) as r:
        d = json.load(r)
    dt = time.time() - t
    if api not in d:
        return dt, None, d.get('RESULT')
    head, body = d[api]
    return dt, head['head'][0]['list_total_count'], body['row']
day = time.strftime('%Y%m%d', time.gmtime(time.time() + 9 * 3600))
for code in ('B10', 'J10'):
    dt, total, rows = get('mealServiceDietInfo', ATPT_OFCDC_SC_CODE=code, MLSV_YMD=day)
    print(f'meal {code} {day} 학교코드 없이: total={total} rows={len(rows) if isinstance(rows, list) else rows} {dt:.1f}s')
    if isinstance(rows, list):
        print('  끼니', Counter(r['MMEAL_SC_NM'] for r in rows).most_common(), '학교', len({r['SD_SCHUL_CODE'] for r in rows}))
dt, total, rows = get('schoolInfo', ATPT_OFCDC_SC_CODE='B10')
print(f'schoolInfo B10 total={total} page={len(rows)} {dt:.1f}s')
print('  종류', Counter(r['SCHUL_KND_SC_NM'] for r in rows).most_common())
print('  학교코드 빈칸', sum(1 for r in rows if not r['SD_SCHUL_CODE'].strip()), '개교일 미래', sum(1 for r in rows if (r.get('FOND_YMD') or '') > day))
dt, total, rows = get('SchoolSchedule', ATPT_OFCDC_SC_CODE='B10', AA_FROM_YMD=day, AA_TO_YMD=day[:4] + '1231')
print(f'schedule B10 학교코드 없이: total={total} {dt:.1f}s')
# 빠르게 20번 연속 호출해 한도·속도 제한이 있는지
errs = Counter()
for i in range(20):
    dt, total, rows = get('schoolInfo', ATPT_OFCDC_SC_CODE='T10', pSize=1)
    errs['ok' if total else str(rows)] += 1
print('연속 20회', dict(errs))

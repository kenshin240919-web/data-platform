"""One-off check of Kakao Local address search on NEIS academy addresses (prints statistics only).

Needs NEIS_API_KEY and KAKAO_REST_KEY.
"""
import json, os, random, re, sys, time, urllib.parse, urllib.request

NEIS = os.environ.get('NEIS_API_KEY', '').strip()
KAKAO = os.environ.get('KAKAO_REST_KEY', '').strip()


def get(url, headers=None):
    for n in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers or {}), timeout=30) as r:
                return r.status, json.load(r)
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode('utf-8', 'replace')[:300]
        except Exception as e:  # retry network errors
            print('retry', e, file=sys.stderr); time.sleep(3 * (n + 1))
    return 0, 'network'


def neis(code, page):
    q = urllib.parse.urlencode({'KEY': NEIS, 'Type': 'json', 'pIndex': page, 'pSize': 1000, 'ATPT_OFCDC_SC_CODE': code})
    _, d = get(f'https://open.neis.go.kr/hub/acaInsTiInfo?{q}')
    return d['acaInsTiInfo'][1]['row']


def geocode(addr):
    q = urllib.parse.urlencode({'query': addr})
    return get(f'https://dapi.kakao.com/v2/local/search/address.json?{q}', {'Authorization': f'KakaoAK {KAKAO}'})


def main():
    if not (NEIS and KAKAO):
        raise SystemExit('NEIS_API_KEY / KAKAO_REST_KEY missing')
    rows = []
    for code, page in (('B10', 3), ('J10', 10), ('C10', 2), ('K10', 1), ('T10', 1), ('P10', 2)):
        rows += neis(code, page)
    addrs = sorted({(r.get('FA_RDNMA') or '').strip() for r in rows} - {''})
    random.seed(7)
    sample = random.sample(addrs, min(300, len(addrs)))
    ok, fail, times, errs = 0, [], [], []
    for a in sample:
        t = time.time(); st, d = geocode(a); times.append(time.time() - t)
        if st != 200:
            errs.append((st, d)); 
            if len(errs) >= 3: break
            continue
        docs = d.get('documents') or []
        if docs:
            ok += 1
        else:
            fail.append(a)
    # retry failures with the parenthesis/building part removed
    fixed = 0
    for a in fail:
        b = re.sub(r'\s*\(.*$', '', a); b = re.sub(r',.*$', '', b)
        if b != a:
            st, d = geocode(b)
            if st == 200 and d.get('documents'):
                fixed += 1
    n = ok + len(fail)
    print(f'unique addresses {len(addrs):,} sampled {n:,}')
    print(f'found {ok:,} ({ok / max(1, n):.1%}) not found {len(fail):,} fixed by trimming {fixed:,}')
    print('not found samples', fail[:20])
    print('http errors', errs[:3])
    if times:
        times.sort(); print(f'latency p50 {times[len(times) // 2]:.2f}s p90 {times[int(len(times) * .9)]:.2f}s')
    if ok:
        st, d = geocode(sample[0]); doc = d['documents'][0]
        print('example', sample[0], '->', doc.get('y'), doc.get('x'), doc.get('address_type'))


if __name__ == '__main__':
    main()

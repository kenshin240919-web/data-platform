"""Build apps/weather/data/regions.json: 시군구 centroid, KMA grid, mid-term zone, nearest AirKorea station, trip link.

Inputs (passed as paths, never committed): admdongkor HangJeongDong geojson, AirKorea station list JSON
(MsrstnInfoInqireSvc/getMsrstnList response). Usage:
  python scripts/build-weather-regions.py <dong.geojson> <stations.json> apps/trip/data/trip.json apps/weather/data
"""
import json, math, re, sys
from pathlib import Path

def kma_grid(lat, lon):
    # KMA DFS (Lambert conformal conic) lat/lon -> nx, ny, from the official 단기예보 guide.
    RE, GRID, SLAT1, SLAT2, OLON, OLAT, XO, YO = 6371.00877, 5.0, 30.0, 60.0, 126.0, 38.0, 43, 136
    d = math.pi / 180.0; re = RE / GRID
    s1, s2, olon, olat = SLAT1 * d, SLAT2 * d, OLON * d, OLAT * d
    sn = math.log(math.cos(s1) / math.cos(s2)) / math.log(math.tan(math.pi / 4 + s2 / 2) / math.tan(math.pi / 4 + s1 / 2))
    sf = math.tan(math.pi / 4 + s1 / 2) ** sn * math.cos(s1) / sn
    ro = re * sf / math.tan(math.pi / 4 + olat / 2) ** sn
    ra = re * sf / math.tan(math.pi / 4 + lat * d / 2) ** sn
    theta = lon * d - olon
    theta = (theta + math.pi) % (2 * math.pi) - math.pi
    theta *= sn
    return int(ra * math.sin(theta) + XO + 0.5), int(ro - ra * math.cos(theta) + YO + 0.5)

def ring_centroid(ring):
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        c = x1 * y2 - x2 * y1; a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c
    return (a / 2, cx / (3 * a), cy / (3 * a)) if a else (0, 0, 0)

SIDO_SHORT = {'12':'전남광주','11':'서울','26':'부산','27':'대구','28':'인천','29':'광주','30':'대전','31':'울산','36':'세종','41':'경기','43':'충북','44':'충남','46':'전남','47':'경북','48':'경남','50':'제주','51':'강원','52':'전북'}
# 중기육상예보 구역(regId). 강원은 영동/영서로 나뉜다. 12 = 전남광주통합특별시(2026 통합, 옛 29·46).
MID_LAND = {'12':'11F20000','11':'11B00000','28':'11B00000','41':'11B00000','30':'11C20000','36':'11C20000','44':'11C20000','43':'11C10000',
            '29':'11F20000','46':'11F20000','52':'11F10000','27':'11H10000','47':'11H10000','26':'11H20000','31':'11H20000','48':'11H20000','50':'11G00000'}
# 중기기온 예보 지점(regId, 2026-10-10 API 응답으로 확인)과 대략적인 시청 좌표. 시군구는 가장 가까운 지점을 쓴다.
MID_TA = {'서울':('11B10101',37.566,126.978),'인천':('11B20201',37.456,126.705),'수원':('11B20601',37.263,127.029),'파주':('11B20305',37.760,126.780),
          '춘천':('11D10301',37.881,127.730),'원주':('11D10401',37.342,127.920),'강릉':('11D20501',37.752,128.876),'대전':('11C20401',36.351,127.385),
          '서산':('11C20101',36.785,126.450),'세종':('11C20404',36.480,127.289),'청주':('11C10301',36.642,127.489),'광주':('11F20501',35.160,126.852),
          '목포':('21F20801',34.812,126.392),'여수':('11F20401',34.760,127.662),'순천':('11F20603',34.951,127.487),'전주':('11F10201',35.824,127.148),
          '군산':('21F10501',35.968,126.737),'대구':('11H10701',35.871,128.602),'안동':('11H10501',36.568,128.730),'포항':('11H10201',36.019,129.343),
          '부산':('11H20201',35.180,129.076),'울산':('11H20101',35.539,129.311),'창원':('11H20301',35.228,128.682),'제주':('11G00201',33.500,126.531),
          '서귀포':('11G00401',33.254,126.560)}
TA_ZONES = {'11B00000':'서울 인천 수원 파주','11D10000':'춘천 원주','11D20000':'강릉','11C20000':'대전 서산 세종','11C10000':'청주',
            '11F20000':'광주 목포 여수 순천','11F10000':'전주 군산','11H10000':'대구 안동 포항','11H20000':'부산 울산 창원','11G00000':'제주 서귀포'}
YEONGDONG = {'강릉시','동해시','속초시','삼척시','태백시','고성군','양양군'}

def main(dong_path, stations_path, trip_path, out_dir):
    feats = json.load(open(dong_path, encoding='utf-8'))['features']
    acc = {}
    for f in feats:
        p = f['properties']; g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        r = acc.setdefault(p['sgg'], {'sido': p['sido'], 'sidonm': p['sidonm'], 'sggnm': p['sggnm'], 'a': 0.0, 'x': 0.0, 'y': 0.0, 'dongs': 0})
        r['dongs'] += 1
        for poly in polys:
            a, cx, cy = ring_centroid([tuple(pt[:2]) for pt in poly[0]])
            r['a'] += abs(a); r['x'] += cx * abs(a); r['y'] += cy * abs(a)
    raw = json.load(open(stations_path, encoding='utf-8'))['response']['body']['items']
    stations = [{'name': s['stationName'], 'addr': s['addr'], 'lat': float(s['dmX']), 'lon': float(s['dmY'])} for s in raw if s.get('dmX') and s.get('dmY')]
    trip = {r['code']: r for r in json.load(open(trip_path, encoding='utf-8'))['regions']}
    regions = []
    for code, r in sorted(acc.items()):
        lon, lat = r['x'] / r['a'], r['y'] / r['a']
        nx, ny = kma_grid(lat, lon)
        near = sorted(stations, key=lambda s: (s['lat'] - lat) ** 2 + ((s['lon'] - lon) * math.cos(lat * math.pi / 180)) ** 2)[:3]
        sido = r['sido']
        mid = MID_LAND.get(sido) or ('11D20000' if r['sggnm'] in YEONGDONG else '11D10000')
        ta = min(((k, MID_TA[k]) for k in TA_ZONES[mid].split()), key=lambda kv: (kv[1][1] - lat) ** 2 + ((kv[1][2] - lon) * math.cos(lat * math.pi / 180)) ** 2)
        t = trip.get(code) or next((v for k, v in trip.items() if k[:4] == code[:4] and k not in acc), None)
        name = re.sub(r'^(.+시)(.+구)$', r'\1 \2', r['sggnm'])
        regions.append({'code': code, 'sido': sido, 'sidoName': r['sidonm'], 'sidoShort': SIDO_SHORT.get(sido, r['sidonm']), 'name': name,
                        'lat': round(lat, 5), 'lon': round(lon, 5), 'nx': nx, 'ny': ny, 'midLand': mid, 'midTa': ta[1][0], 'midTaName': ta[0],
                        'stations': [s['name'] for s in near], 'trip': {'id': t['id'], 'count': t['count']} if t else None})
    out = Path(out_dir)
    (out / 'regions.json').write_text(json.dumps(regions, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    (out / 'air-stations.json').write_text(json.dumps(stations, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(len(regions), 'regions,', len(stations), 'stations,', sum(1 for r in regions if r['trip']), 'with trip data')

if __name__ == '__main__':
    main(*sys.argv[1:5])

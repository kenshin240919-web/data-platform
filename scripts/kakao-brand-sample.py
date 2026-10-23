"""One-off: 카카오 로컬 키워드 검색으로 브랜드 서비스센터가 잘 찾아지는지 확인(결과는 로그에 이름·거리만, 저장하지 않음)."""
import json, os, urllib.parse, urllib.request
KEY = os.environ['KAKAO_REST_KEY']
SPOTS = {'서울 강남': (127.0328, 37.5017), '대전 둔산': (127.3845, 36.3504), '제주시': (126.5312, 33.4996)}
QUERIES = {'samsung': ['삼성전자서비스'], 'lg': ['LG전자서비스', 'LG전자 서비스센터'], 'coway': ['코웨이 서비스센터'], 'cuckoo': ['쿠쿠 서비스센터'],
           'skmagic': ['SK매직 서비스센터'], 'winia': ['위니아 서비스센터', '딤채 서비스센터'], 'apple': ['애플 공인 서비스', 'Apple 공인 서비스 제공업체']}
for brand, qs in QUERIES.items():
    for q in qs:
        for spot, (x, y) in SPOTS.items():
            qs_ = urllib.parse.urlencode({'query': q, 'x': x, 'y': y, 'radius': 20000, 'sort': 'distance', 'size': 15})
            req = urllib.request.Request(f'https://dapi.kakao.com/v2/local/search/keyword.json?{qs_}', headers={'Authorization': f'KakaoAK {KEY}'})
            try:
                d = json.load(urllib.request.urlopen(req, timeout=20))
            except Exception as e:
                print(brand, q, spot, 'ERROR', e); continue
            docs = d.get('documents', [])
            print(f"{brand} | {q} | {spot} | total {d.get('meta', {}).get('total_count')} |",
                  ' / '.join(f"{p['place_name']}({int(p['distance'])/1000:.1f}km,{p['category_name'].split(' > ')[-1]})" for p in docs[:5]))

from datetime import date, timedelta
from sqlalchemy import select
from .models import Region, RegionVersion
from .pipeline import active_dataset, ingest

REGIONS=[('seoul','서울특별시 종로구','11110','서울특별시','11'),('gangneung','강원특별자치도 강릉시','51150','강원특별자치도','51'),('busan','부산광역시 해운대구','26350','부산광역시','26'),('jeju','제주특별자치도 제주시','50110','제주특별자치도','50'),('suwon','경기도 수원시','41110','경기도','41'),('jeonju','전북특별자치도 전주시','52110','전북특별자치도','52')]

def seed(session):
    if active_dataset(session,True): return
    version=RegionVersion(id='demo-regions-v1',source='개발 샘플 · 공식 최신 원장 아님',as_of='2026-10-06',checksum='demo')
    if not session.get(RegionVersion,version.id):
        session.add(version);session.flush()
    for rid,name,code,province,pc in REGIONS:
        if not session.get(Region,'demo-'+pc):
            session.add(Region(id='demo-'+pc,version_id=version.id,code_system='DEMO',code=pc,name=province,level='province'));session.flush()
        if not session.get(Region,rid):
            session.add(Region(id=rid,version_id=version.id,code_system='DEMO',code=code,name=name,level='city',parent_id='demo-'+pc))
    session.commit()
    places=[('경복궁','seoul','서울특별시 종로구 사직로 161',37.5796,126.977,'도심에서 역사와 건축을 살펴보는 장소 카드 예시입니다. 요금과 운영정보는 개발 샘플이며 실제 방문 전 공식 안내를 확인하세요.',{'kids':True}),
        ('경포호','gangneung','강원특별자치도 강릉시 경포로 365',37.7954,128.896,'호수 주변 산책 장소를 탐색하는 예시입니다. 무료와 동반 조건은 필터 기능 확인을 위한 샘플 값입니다.',{'free':True,'pet':True}),
        ('오죽헌','gangneung','강원특별자치도 강릉시 율곡로3139번길 24',37.7783,128.878,'강릉 지역의 문화 공간을 비교하는 카드 예시입니다. 운영정보는 공식 API 연결 후 검증해 제공합니다.',{'kids':True}),
        ('국립고궁박물관','seoul','서울특별시 종로구 효자로 12',37.5765,126.974,'비 오는 날의 실내 장소를 찾는 흐름을 확인하기 위한 샘플입니다. 시설과 요금은 실제 방문정보로 사용하지 마세요.',{'free':True,'indoor':True,'kids':True}),
        ('해운대해수욕장','busan','부산광역시 해운대구 해운대해변로 264',35.1587,129.160,'부산의 바닷가 장소를 찾는 검색 예시입니다. 반려동물·입장 정책은 별도 확인이 필요합니다.',{'free':True}),
        ('제주도립미술관','jeju','제주특별자치도 제주시 1100로 2894-78',33.4526,126.489,'제주 실내 문화 공간의 상세 화면 예시입니다. 전시와 요금은 공식 데이터 연동 전까지 확인 필요로 표시합니다.',{'indoor':True}),
        ('수원화성','suwon','경기도 수원시 장안구 영화동',37.2887,127.010,'지역과 날짜를 선택해 장소를 비교하는 개발용 카드입니다. 실제 운영 조건과 구역은 공식 안내를 확인하세요.',{'kids':True}),
        ('전주한옥마을','jeonju','전북특별자치도 전주시 완산구 기린대로 99',35.8152,127.153,'전주 지역 목록과 주변 거리 비교를 확인하는 예시입니다. 무료·동반 정책은 개발 샘플 값입니다.',{'free':True,'pet':True})]
    records=[]
    for i,(name,rid,address,lat,lon,description,conditions) in enumerate(places):
        records.append({'contentid':f'demo-{i+1}','contenttypeid':'12','title':name,'addr1':address,'mapy':lat,'mapx':lon,'overview':description,'demo_region_id':rid,'condition_evidence':{k:{'value':v,'source':'개발 샘플 — 실제 정책 아님','verified_at':date.today().isoformat()} for k,v in conditions.items()}})
    today=date.today();sat=today+timedelta(days=(5-today.weekday())%7)
    for i,rid in enumerate(('gangneung','seoul','busan')):
        example=next(r for r in records if r['demo_region_id']==rid)
        records.append({**example,'contentid':f'demo-event-{i}','contenttypeid':'15','title':['강릉 주말 행사 · 화면 예시','서울 문화 행사 · 화면 예시','부산 주말 행사 · 화면 예시'][i],'eventstartdate':sat.isoformat(),'eventenddate':(sat+timedelta(days=1)).isoformat(),'overview':'일정 필터와 행사 상세 기능을 확인하기 위한 가상의 행사입니다. 실제 개최 일정이 아닙니다. 샘플 모드에서만 표시됩니다.'})
    ingest(session,records,source_id='demo',demo=True)


import hashlib
import html
import json
import re
from datetime import date

CONDITIONS = ('free','kids','pet','indoor')

def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()

def clean(value):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', ' ', str(value or '')))).strip()

def number(value):
    try:
        parsed = float(value)
        return parsed if parsed == parsed and abs(parsed) != float('inf') else None
    except (TypeError, ValueError): return None

def image_records(raw):
    from urllib.parse import urlparse
    result=[]
    for row in raw.get('_images',[]):
        license=row.get('cpyrhtDivCd','');url=row.get('originimgurl','')
        if license not in {'Type1','Type3'} or urlparse(url).scheme!='https' or urlparse(url).hostname!='tong.visitkorea.or.kr':continue
        result.append({'url':url,'alt':clean(row.get('imgname')) or clean(raw.get('title')),'credit':'한국관광공사 TourAPI · '+clean(row.get('imgname')),'license':license,'modification_allowed':license=='Type1','source':'https://www.data.go.kr/data/15101578/openapi.do'})
    return result

def homepage(raw):
    from urllib.parse import urlparse
    text=str(raw.get('homepage') or '')
    match=re.search(r'href=[\"\']([^\"\']+)',text,re.I)
    plain=html.unescape(match.group(1) if match else text).strip()
    link=re.search(r'https?://[^\s<>\"\']+',plain)
    url=link.group(0) if link else plain
    return url if urlparse(url).scheme in {'http','https'} and urlparse(url).hostname else None

def normalize(raw):
    conditions = {key:None for key in CONDITIONS}
    evidence = {}
    # A boolean alone is insufficient: the importer must provide a source and verification date.
    for key in CONDITIONS:
        fact = raw.get('condition_evidence', {}).get(key, {})
        if isinstance(fact, dict) and isinstance(fact.get('value'), bool) and fact.get('source') and fact.get('verified_at'):
            try: date.fromisoformat(fact['verified_at'])
            except ValueError: continue
            conditions[key] = fact['value']
            evidence[key] = fact
    def first(*keys):
        return next((clean(raw.get(key)) for key in keys if clean(raw.get(key))),None)
    def facility_value(*names):
        return next((clean(r.get('infotext')) for r in raw.get('_facilities',[]) if clean(r.get('infoname')) in names and clean(r.get('infotext'))),None)
    return {'external_id':str(raw.get('contentid') or ''), 'name':clean(raw.get('title')),
        'address_raw':str(raw.get('addr1') or ''), 'address':clean(raw.get('addr1')),
        'latitude':number(raw.get('mapy')), 'longitude':number(raw.get('mapx')),
        'legal_province':str(raw.get('lDongRegnCd') or raw.get('ldongregncd') or ''),
        'legal_city':str(raw.get('lDongSignguCd') or raw.get('ldongsigngucd') or ''),
        'kind':'festival' if str(raw.get('contenttypeid')) == '15' else 'place',
        'description':clean(raw.get('overview')), 'hours':first('usetime','usetimeculture','usetimeleports','opentimefood','opentime','playtime'),
        'closed_days':first('restdate','restdateculture','restdateleports','restdatefood','restdateshopping'),
        'fee':first('usefee','usefeeLeports','usefeeleports','usefeeCulture','usefeeculture','usetimefestival') or facility_value('입장료','시설이용료','이용요금'), 'phone':first('tel','infocenter','infocenterculture','infocenterleports','sponsor1tel'),
        'conditions':conditions, 'evidence':evidence,
        'content_type':str(raw.get('contenttypeid') or ''),
        'parking':first('parking','parkingculture','parkingleports','parkingfood'),'parking_fee':first('parkingfee','parkingfeeculture','parkingfeeleports') or facility_value('주차요금'),
        'capacity':first('accomcount','accomcountculture','accomcountleports'),'age_guide':first('expagerange','expagerangeleports','agelimit'),'facilities':[{'name':clean(r.get('infoname')),'description':clean(r.get('infotext'))} for r in raw.get('_facilities',[]) if r.get('infoname') and r.get('infotext')],
        'pet_policy':{k:clean(v) for k,v in (raw.get('_pet') or {}).items() if k!='contentid' and v},'official_url':homepage(raw),'organizer':first('sponsor1','sponsor2'),'images':image_records(raw),
        'review_status':raw.get('review_status','pending'),'review_note':clean(raw.get('review_note')),'source_hidden':raw.get('showflag')=='0',
        'start_date':str(raw.get('eventstartdate') or ''), 'end_date':str(raw.get('eventenddate') or ''),
        'source_modified_at':str(raw.get('modifiedtime') or '')}

def checks(item, region):
    flags = [('identity', bool(item['external_id'] and item['name']), '원천 ID와 이름'),
        ('address', bool(item['address']), '주소 존재'),
        ('region', region is not None, '공식 코드 버전의 현존 시군구 매핑'),
        ('coordinates', item['latitude'] is not None and item['longitude'] is not None and 32 <= item['latitude'] <= 40 and 123 <= item['longitude'] <= 133, 'WGS84 좌표/한국 영역 범위')]
    if region:
        token = region.name.split()[-1]
        flags.append(('region_address',token in item['address'], '주소와 매핑된 지역명 대조; 공간 경계 정합성은 별도 검수'))
    if item['kind']=='festival':
        try:
            start=date.fromisoformat(item['start_date']); end=date.fromisoformat(item['end_date'])
            valid=start<=end
        except ValueError: valid=False
        flags.append(('event_dates', valid, '유효 시작/종료일'))
    valid = all(passed for _,passed,_ in flags)
    score = (25 if region else 0) + (25 if item['name'] and item['address'] else 0) + 10
    score += 20 if len(item['description'])>=80 else 0
    score += 10 if item['hours'] else 0
    score += 10 if item['fee'] else 0
    # Structural validation does not establish freshness or geographical boundary accuracy.
    return flags, min(score,100), valid


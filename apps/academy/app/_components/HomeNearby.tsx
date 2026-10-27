'use client';
// 메인 3초 답: 내 위치(이미 허용 → 정확, 아니면 접속 위치) 주변 학원 수와 가까운 학원. 위치를 모르면 카드만.
import {LocateCard,PosNote,useMyPosition} from '@guidejung/ui/geo';
import {LiveList} from './LiveList';
export function HomeNearby(){
  const {pos,status,request}=useMyPosition();
  return <>
    <PosNote/>{!pos?.precise&&<LocateCard title="내 위치 주변 학원 보기" desc="가까운 순으로 과목·학년별 학원과 공개 수강료를 보여 드려요" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&<LiveList key={`${pos.lat.toFixed(3)},${pos.lon.toFixed(3)}`} title={pos.precise?'📍 내 주변 2km 학원':'📍 접속 위치 주변 학원'} query={{lat:pos.lat,lon:pos.lon,km:pos.precise?2:5}} empty="주변에 등록된 학원이 없어요. 지역별 학원에서 찾아보세요."/>}
  </>;
}

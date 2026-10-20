import type {Metadata} from 'next';
import {n,status,updated} from '../../lib/data';
export const metadata:Metadata={title:'데이터·출처 안내',description:'내 학교의 데이터 출처(나이스 학교기본정보·급식식단정보·학사일정·시간표)와 갱신 주기를 안내합니다.',alternates:{canonical:'/data-policy'}};
export default function DataPolicy(){return <div className="page prose"><h1>데이터·출처 안내</h1>
  <h2>출처</h2><p>나이스(NEIS) 교육정보 개방 포털(시도교육청 입력, 한국교육학술정보원 제공)의 학교기본정보·급식식단정보·학사일정·학급정보·시간표를 씁니다.</p>
  <h2>갱신</h2><p>학교 목록은 매일 받아 정리합니다(마지막 갱신 {updated()}, {n(status.count)}곳). 급식은 학교 페이지를 열 때 나이스에서 받아 최대 6시간, 학사일정은 하루, 시간표는 12시간 보관했다가 다시 받습니다.</p>
  <h2>싣지 않는 학교</h2><p>아직 문을 열지 않은 학교(개교일이 미래이거나 ‘가칭’), 학교코드가 없는 곳, 공동실습소는 싣지 않습니다.</p>
  <h2>정확도</h2><p>급식·학사일정·시간표는 학교가 나이스에 입력한 내용입니다. 학교가 입력하지 않았거나 늦게 고친 내용은 다를 수 있으니, 중요한 일정은 학교 안내를 확인하세요. 위치는 도로명 주소를 카카오 로컬 API로 좌표로 바꿔 거리 계산에만 씁니다.</p></div>;}

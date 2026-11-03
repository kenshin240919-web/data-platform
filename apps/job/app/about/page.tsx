import type {Metadata} from 'next';
import {n,nation} from '../../lib/data';
export const metadata:Metadata={title:'서비스 소개',description:'내근처 일자리는 관할 고용센터·직업소개소·새일센터·노인일자리 기관·대학일자리플러스센터·자격증 시험장을 가까운 순으로 찾아 주는 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내근처 일자리 소개</h1>
  <p>내근처 일자리는 “일자리 찾으려면 어디로 가지?”에 답하는 서비스입니다. 실업급여를 신청하는 관할 고용센터 {n(nation.kinds.center)}곳, 지자체에 등록된 직업소개소 {n(nation.kinds.agency+nation.kinds.free)}곳, 여성새로일하기센터 {n(nation.kinds.women)}곳, 노인일자리 수행기관 {n(nation.kinds.senior)}곳, 대학일자리플러스센터 {n(nation.kinds.campus)}곳, 국가자격 시험장 {n(nation.kinds.exam)}곳을 가까운 순으로 보여 드립니다.</p>
  <ul><li>공공데이터로 만든 민간 안내 사이트입니다. 정부·지자체의 공식 사이트가 아닙니다.</li><li>일자리를 소개하거나 채용 공고를 싣지 않습니다. 공고는 고용24·노인일자리 여기·e새일 같은 공식 사이트에서 찾으세요.</li><li>이력서를 받거나 구인·구직 신청을 받지 않습니다.</li></ul>
  <p>내근처 여행·날씨·학원·약국·병원·서류·혜택 등과 함께 GuideJung이 운영합니다.</p></div>;}

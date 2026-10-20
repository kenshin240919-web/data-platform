import type {Metadata} from 'next';
import {n,status} from '../../lib/data';
export const metadata:Metadata={title:'서비스 소개',description:'내 학교는 우리 학교 오늘 급식·학사일정 D-day·시간표를 한 번에 보여 주는 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내 학교 소개</h1>
  <p>내 학교는 “오늘 급식 뭐야?”, “시험 언제야?”, “오늘 몇 교시 뭐야?”에 바로 답하는 서비스입니다. 전국 {n(status.count)}개 학교의 급식·학사일정·시간표를 나이스(NEIS) 공식 데이터로 보여 드립니다.</p>
  <ul><li>내 학교를 저장하면 열자마자 오늘 급식</li><li>이번 주 급식과 알레르기 유발 식품 표시(내 아이 알레르기 강조)</li><li>시험·방학·재량휴업일까지 D-day</li><li>학년·반 시간표</li></ul>
  <p>내근처 학원·여행·날씨·고속도로·충전소와 함께 GuideJung이 운영합니다.</p></div>;}

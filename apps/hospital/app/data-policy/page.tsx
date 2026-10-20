import type {Metadata} from 'next';
import {n,status,updated} from '../../lib/data';
export const metadata:Metadata={title:'데이터·출처 안내',description:'내근처 병원의 데이터 출처(국립중앙의료원 병·의원·응급의료기관), 갱신 주기, 진료 여부 계산 방법을 안내합니다.',alternates:{canonical:'/data-policy'}};
export default function DataPolicy(){return <div className="page prose"><h1>데이터·출처 안내</h1>
  <h2>출처</h2><p>공공데이터포털의 <b>국립중앙의료원 전국 병·의원 찾기 서비스</b>(기관·진료 시간·진료과목)와 <b>전국 응급의료기관 정보 조회 서비스</b>(응급실 실시간 가용병상)를 씁니다. 병·의원 목록은 매일 갱신합니다(마지막 {updated()}, {n(status.count)}곳). 응급실 병상은 방문할 때 몇 분마다 새로 받습니다.</p>
  <h2>진료과목</h2><p>병원이 신고한 ‘진료과목’입니다. 전문의가 있다는 뜻은 아니며, 한 병원에 여러 과목이 있을 수 있습니다.</p>
  <h2>지금 진료 중 계산</h2><p>병원이 신고한 요일별(월~일·공휴일) 시작·끝 시각과 지금 한국 시각으로 계산합니다. 점심시간·접수 마감·임시 휴진은 반영되지 않습니다. 공휴일에는 공휴일 진료 시간만 보고, 없으면 휴진으로 봅니다. <b>가기 전에 전화로 확인하세요.</b></p>
  <h2>의료 정보 아님</h2><p>이 사이트는 의료 상담·진단을 하지 않습니다. 위급한 상황에는 119(또는 응급의료정보센터 1339→119)에 전화하세요.</p></div>;}

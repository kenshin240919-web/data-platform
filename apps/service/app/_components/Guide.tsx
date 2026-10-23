import Link from 'next/link';
import {REPAIR_INFO} from '../../lib/fmt';
// 판단을 돕는 콘텐츠(설계안 0-1장, 출처 확인한 사실만). 메인·가이드·정비소 상세에서 함께 씀.
export const CHECKLIST:[string,string][]=[
  ['견적서를 먼저 받으세요','정비업자는 점검·정비 견적서를 발급할 의무가 있어요. 금액과 작업 내용을 글로 받아 두세요.'],
  ['두세 곳 견적을 비교하세요','한국소비자원은 여러 정비업체 견적을 비교하라고 권해요.'],
  ['부품을 확인하세요','정품인지, 중고·재생 부품인지 물어보고 견적서에 적어 달라고 하세요.'],
  ['수리 기간을 적어 두세요','견적서에 수리 기간을 적어 두면 늦어질 때 다투기 쉬워요.'],
  ['명세서를 보관하세요','같은 고장이 다시 생기면 명세서로 보증 수리를 요청할 수 있어요.'],
  ['분쟁이 생기면 1372','한국소비자원 소비자상담센터(국번 없이 1372)에 상담할 수 있어요.'],
];
export function Checklist(){return <section className="sv-guide"><h2>✅ 정비 맡기기 전 체크리스트</h2><ol>{CHECKLIST.map(([t,d])=><li key={t}><b>{t}</b><span>{d}</span></li>)}</ol>
  <p className="muted small">한국소비자원 발표(2025년)에 따르면 2022년~2025년 5월 자동차 정비 피해구제 신청 953건 중 정비 불량이 73.3%, 사전 안내 없는 청구·과잉 정비 같은 부당 청구가 18.2%였어요.</p></section>;}
export function RepairTypes({counts}:{counts?:Record<string,number>}){return <section className="sv-guide"><h2>🔧 정비소 종류, 어디로 가야 할까?</h2>
  <dl className="sv-types">{Object.entries(REPAIR_INFO).map(([k,v])=><div key={k}><dt>{k}{counts?.[k]!=null&&<small> {counts[k].toLocaleString('ko-KR')}곳</small>}</dt><dd>{v}</dd></div>)}</dl>
  <p className="muted small">엔진오일·필터 교환, 세차, 타이어 점검(휠 얼라인먼트 제외) 같은 간단한 작업은 정비업 등록 없이도 할 수 있는 작업이에요. 보증 수리·리콜은 제조사 서비스센터나 협력점에 먼저 문의하세요. <Link href="/guide">자세히 보기 →</Link></p></section>;}

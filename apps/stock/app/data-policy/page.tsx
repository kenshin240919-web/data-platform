import type {Metadata} from 'next';
export const metadata:Metadata={title:'데이터·출처 안내',description:'내근처 재고의 데이터 출처(다이소몰 공개 정보를 다시 보여 주는 공개 중계 서비스), 갱신 주기, 안내 글 작성 방법을 안내합니다.',alternates:{canonical:'/data-policy'}};
export default function DataPolicy(){return <div className="page prose"><h1>데이터·출처 안내</h1>
  <h2>출처</h2><ul><li>상품 후보·가격·매장별 재고·매장 정보: 다이소몰에 공개된 정보를 다시 보여 주는 공개 중계 서비스(mcp.aka.page) — 비공식이며, 같은 질문은 상품 10분·재고 5분 동안만 임시로 보관하고 모아 두지 않습니다.</li><li>시군구 이름·중심점: 행정안전부 행정구역 자료(내근처 날씨와 같은 지역표)</li><li>물건 고르는 법·자주 묻는 질문: 내근처 재고가 직접 쓴 일반 안내입니다.</li></ul>
  <h2>없는 정보</h2><p>매장 안 진열 위치·입고 예정일은 보여 드리지 않습니다. 실제 재고는 매장에 확인하세요.</p></div>;}

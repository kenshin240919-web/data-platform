import type {Metadata} from 'next';
import {ITEMS} from '../../lib/items';
export const metadata:Metadata={title:'서비스 소개',description:'내근처 재고는 급하게 필요한 물건이 내 동네 다이소 어느 매장에 있는지 가까운 순으로 찾아 주는 비공식 안내 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내근처 재고 소개</h1>
  <p>내근처 재고는 “그거 근처 매장에 있어?”에 바로 답하는 서비스입니다. 핫팩·건전지·우산처럼 급하게 필요한 물건을 고르고 동네를 고르면, 다이소몰에 공개된 매장별 재고를 가까운 순으로 보여 드립니다. 자주 찾는 물건 {ITEMS.length}가지는 고르는 법도 함께 정리했습니다.</p>
  <ul><li>다이소와 관계없는 비공식 안내입니다. 로고·상표는 쓰지 않습니다.</li><li>재고는 방문할 때마다 바로 확인하며 모아 두지 않습니다.</li><li>실제 매장 재고와 다를 수 있으니 급하면 매장에 전화로 확인하세요.</li></ul>
  <p>내근처 편의점·시장·주차장 등 내근처 시리즈를 GuideJung이 함께 운영합니다.</p></div>;}

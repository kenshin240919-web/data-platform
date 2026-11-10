// 시군구 목록(날씨 사이트 지역표의 이름·중심점) — 다이소 재고는 시군구 이름(예: '강남구', '수원시 장안구')으로 조회됨. 서버 컴포넌트에서만.
import raw from '../../weather/data/regions.json';
import type {Area} from '../app/_components/StockFinder';
type R={name:string;sidoShort:string;lat:number;lon:number};
export const AREAS:Area[]=(raw as R[]).map(r=>({name:r.name,sido:r.sidoShort,lat:r.lat,lon:r.lon}));

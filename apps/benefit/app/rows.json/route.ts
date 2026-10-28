import {items,row} from '../../lib/data';
// 맞춤 찾기·검색용 가벼운 목록(브라우저에서 조건을 맞춤 — 답은 서버로 보내지 않음).
export const dynamic='force-static';
export function GET(){return Response.json(items.map(row));}

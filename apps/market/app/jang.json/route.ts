import {fairs,slimFair} from '../../lib/data';
// 오늘 장날 목록(브라우저에서 날짜·거리 계산). 위치는 서버로 보내지 않음.
export const dynamic='force-static';
export function GET(){return Response.json(fairs.map(slimFair));}

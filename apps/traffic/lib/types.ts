// /api responses, shared by the Worker and the pages.
/** Live speed per 콘존(구간) ID: [평균 속도 km/h (-1 = 정보 없음), 등급 0 정보없음·1 원활·2 서행·3 정체]. */
export type TrafficResponse={time:string;zones:Record<string,[number,number]>;stale:boolean;refreshing?:boolean};
export type Incident={type:string;road:string;dir:string;text:string;date:string;time:string;blocked:number};
export type IncidentsResponse={time:string;items:Incident[];stale:boolean;refreshing?:boolean};
/** 고속도로 CCTV: 이름 "[경부선] 판교", 좌표, 실시간 영상(HLS) 주소. */
export type Cctv={name:string;lat:number;lng:number;url:string};
export type CctvResponse={time:string;items:Cctv[];stale:boolean;refreshing?:boolean};

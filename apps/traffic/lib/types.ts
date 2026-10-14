// /api responses, shared by the Worker and the pages.
/** Live speed per 콘존(구간) ID: [평균 속도 km/h (-1 = 정보 없음), 등급 0 정보없음·1 원활·2 서행·3 정체]. */
export type TrafficResponse={time:string;zones:Record<string,[number,number]>;stale:boolean;refreshing?:boolean};
export type Incident={type:string;road:string;dir:string;text:string;date:string;time:string;blocked:number};
export type IncidentsResponse={time:string;items:Incident[];stale:boolean;refreshing?:boolean};

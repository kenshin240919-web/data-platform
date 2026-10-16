// /api/stations response, shared by the Worker and the pages.
export type Charger={id:string;type:string;kw:number|null;stat:number;upd:string};
export type Station={id:string;name:string;addr:string;lat:number;lng:number;useTime:string;busi:string;call:string;freeParking:boolean;limited:string|null;chargers:Charger[]};
export type StationsResponse={code:string;fetched:string;total:number;stations:Station[];stale:boolean;refreshing?:boolean;updated?:number};

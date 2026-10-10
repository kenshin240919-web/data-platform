// Shape of /api/weather responses, shared by the Worker and the pages.
export type Region={code:string;sido:string;sidoName:string;sidoShort:string;name:string;lat:number;lon:number;nx:number;ny:number;
  midLand:string;midTa:string;midTaName:string;stations:string[];trip:{id:string;count:number}|null};
export type Now={time:string;temp:number|null;humidity:number|null;wind:number|null;rain1h:string|null;pty:number|null}|null;
export type Hour={time:string;temp:number|null;sky:number|null;pty:number|null;pop:number|null;pcp:string|null;humidity:number|null;wind:number|null};
export type Day={date:string;min:number|null;max:number|null;am:{sky:string;pop:number|null};pm:{sky:string;pop:number|null};source:'short'|'mid'};
export type Air={station:string;time:string;pm10:number|null;pm25:number|null;pm10Grade:number|null;pm25Grade:number|null;khai:number|null}|null;
export type Uv={time:string;values:{offset:number;value:number}[]}|null;
export type WeatherResponse={code:string;issued:{now:string|null;short:string|null;mid:string|null};now:Now;hourly:Hour[];daily:Day[];air:Air;uv:Uv;stale:boolean;errors:string[]};

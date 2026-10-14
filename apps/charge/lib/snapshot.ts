// Daily static snapshot (scripts/collect-charge-snapshot.py, GitHub Actions) — server components only.
// Gives each district page its station list and counts in the HTML; live status still comes from /api/stations.
import data from '../data/snapshot.json';

export type SnapStation={id:string;name:string;addr:string;lat:number;lng:number;useTime:string;busi:string;freeParking:boolean;limited:boolean;fast:number;slow:number;maxKw:number};
export type SnapRegion={stations:number;chargers:number;fast:number;freeParking:number;h24:number;list:SnapStation[]};
type Snapshot={fetched:string;chargers:number;stations:number;regions:Record<string,SnapRegion>};

const snap=data as Snapshot;
export const snapFetched=snap.fetched;
export const snapTotal={stations:snap.stations,chargers:snap.chargers};
export const snapRegion=(code:string):SnapRegion|null=>snap.regions[code]??null;
/** Sum of several districts (a 시도 page). */
export function snapSum(codes:string[]){
  return codes.map(snapRegion).reduce((a,r)=>r?{stations:a.stations+r.stations,chargers:a.chargers+r.chargers,fast:a.fast+r.fast}:a,{stations:0,chargers:0,fast:0});
}
/** 2026.10.15 */
export const fmtDate=(t:string)=>t?`${t.slice(0,4)}.${t.slice(4,6)}.${t.slice(6,8)}`:'';

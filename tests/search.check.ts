// node tests/search.check.ts — browser-side search logic (port of the API's /v1/search).
import assert from 'node:assert/strict';
import {search,todayKST,withEventStatus} from '../packages/ui/src/search.ts';

const base={address:'',description:'',region_name:'',conditions:{},quality_score:50,images:[]};
const items:any[]=[
  {...base,id:'a',name:'가',kind:'place',region_id:'r1',latitude:37.57,longitude:126.98,conditions:{free:true}},
  {...base,id:'b',name:'나',kind:'place',region_id:'r2',latitude:35.1,longitude:129.0,quality_score:90},
  {...base,id:'sat',name:'토요행사',kind:'festival',region_id:'r1',latitude:37.5,longitude:127,start_date:'2026-10-10',end_date:'2026-10-10',event_status:'scheduled'},
  {...base,id:'old',name:'지난행사',kind:'festival',region_id:'r1',latitude:37.5,longitude:127,start_date:'2026-09-01',end_date:'2026-09-02',event_status:'scheduled'},
];
const wed='2026-10-07';
assert.equal(todayKST(Date.parse('2026-10-06T15:30:00Z')),wed); // 00:30 KST is already the next day
assert.deepEqual(search(items,{when:'weekend'},wed).items.map(i=>i.id),['sat']);
assert.deepEqual(search(items,{when:'weekend'},'2026-10-11').items.map(i=>i.id),['sat']); // Sunday still covers Saturday
assert.deepEqual(search(items,{condition:'free'},wed).items.map(i=>i.id),['a']);
assert.deepEqual(search(items,{kind:'place'},wed).items.map(i=>i.id),['b','a']); // quality first
assert.deepEqual(search(items,{lat:37.57,lon:126.98,radius_km:5},wed).items.map(i=>i.id),['a']);
assert.equal(withEventStatus(items[3],wed).event_status,'ended');
assert.equal(search(items,{limit:1,page:2},wed).pages,4);
console.log('search checks passed');

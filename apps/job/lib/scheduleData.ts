// Static build only: data/exam-schedule.json (scripts/collect-job.py, daily).
import raw from '../data/exam-schedule.json';
import {CAT_ORDER,rounds,type Cat,type Raw,type Round} from './schedule';
export * from './schedule';
const D=raw as unknown as {updated_at:string;names:Record<string,string>;rows:Raw[]};
export const schedUpdated=D.updated_at;
export const allRounds:Round[]=rounds(D.rows);
export const byCat=(c:Cat)=>allRounds.filter(r=>r.cat===c);
export const cats=CAT_ORDER.filter(c=>allRounds.some(r=>r.cat===c));
export const years=[...new Set(allRounds.map(r=>r.y))].sort();
export const buildDay=new Date(Date.now()+9*3600e3).toISOString().slice(0,10);

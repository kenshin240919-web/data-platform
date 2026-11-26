import {SENIOR,seniorOn,seniorPath,seniorSpan} from '../../lib/season';
// 노인일자리 신청 시즌 띠(11/26): 모집 2주 전부터 마감일까지(빌드 날 기준 — 매일 다시 빌드).
export const SeniorBand=()=>seniorOn?<a className="jb-season" href={seniorPath} data-ev="jb_senior_band"><span aria-hidden="true">👴</span><span><b>{SENIOR.year} 노인일자리 신청 {seniorSpan}</b><small>신청 대상·방법과 내 주변 수행기관</small></span><em>보기 →</em></a>:null;

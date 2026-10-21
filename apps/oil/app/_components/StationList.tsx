// 주유소 카드 목록(서버·브라우저 공용): 순위·이름·상표·셀프·거리·가격·평균 대비.
import {brandName,diff,km,PROD_LABEL,stationPath,won,type Prod,type Station} from '../../lib/fmt';
export type Item=Pick<Station,'id'|'name'|'brand'|'self'|'address'|'prices'>&{km?:number};
export function StationList({items,prod='B027',avg,avgLabel='평균',rank=true}:{items:Item[];prod?:Prod;avg?:number|null;avgLabel?:string;rank?:boolean}){
  return <div className="oi-cards">{items.map((s,i)=>{const p=s.prices[prod];
    return <a key={s.id} className="oi-card" href={stationPath(s.id)}>
      {rank&&<span className="oi-rank-no">{i+1}</span>}
      <span className="oi-card-body"><b>{s.name}</b>
        <small>{s.self&&<span className="oi-tag self">셀프</span>}{s.brand&&<span className="oi-tag">{brandName(s.brand)}</span>}{s.km!=null&&<>{km(s.km)} · </>}{s.address}</small></span>
      <span className="oi-price"><b>{won(p)}</b><small>{PROD_LABEL[prod]}{avg&&p?` · ${avgLabel} ${diff(p-avg)}`:''}</small></span>
    </a>;})}</div>;
}

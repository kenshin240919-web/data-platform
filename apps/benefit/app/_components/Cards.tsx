// Server-rendered rows (no hooks): one benefit per line with money·deadline on the right.
import {FIELDS,benefitPath,dueLabel,scopeLabel,won,type Item} from '../../lib/fmt';
export function ItemRow({i,today,hideScope}:{i:Item;today:string;hideScope?:boolean}){
  const due=i.due?dueLabel(i.due,i.due_exact,today):null;
  return <li><a className="bf-item" href={benefitPath(i.id)}>
    <span aria-hidden="true">{FIELDS[i.field].icon}</span>
    <span className="bf-item-body"><b>{i.name}</b><small>{!hideScope&&<span className="bf-scope">{scopeLabel(i)}</span>}{i.sum??i.target??i.kind?.join('·')}</small></span>
    <span className="bf-item-side">{i.amount?<span className="bf-money">최대 {won(i.amount)}</span>:null}{due?<span className={i.due!<today?'bf-due past':'bf-due'}>{due}</span>:null}</span>
  </a></li>;
}
export function ItemList({list,today,hideScope}:{list:Item[];today:string;hideScope?:boolean}){
  return <ul className="bf-list">{list.map(i=><ItemRow key={i.id} i={i} today={today} hideScope={hideScope}/>)}</ul>;
}

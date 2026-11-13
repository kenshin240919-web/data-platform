import type {Metadata} from 'next';
import {CALCS} from '../info';
import {CalcView} from '../view';
const c=CALCS.yearend;
export const metadata:Metadata={title:c.title,description:c.desc,alternates:{canonical:'/calc/yearend'}};
export default function YearEnd(){return <CalcView s="yearend"/>;}

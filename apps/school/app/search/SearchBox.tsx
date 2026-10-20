'use client';
import {useSearchParams} from 'next/navigation';
import {SchoolPicker} from '../_components/SchoolPicker';
export function SearchBox(){const sp=useSearchParams();return <SchoolPicker initialQ={sp.get('q')??''}/>;}

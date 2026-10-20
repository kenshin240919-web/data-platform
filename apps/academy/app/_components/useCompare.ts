'use client';
import {useEffect,useState} from 'react';
import {onCompare,readCompare,type Picked} from '../../lib/compare';
export function useCompare(){const [list,setList]=useState<Picked[]>([]);useEffect(()=>{setList(readCompare());return onCompare(()=>setList(readCompare()));},[]);return list;}

import {AdSlot} from '@guidejung/ui/ads';
import {ADS} from '../../lib/fmt';
/** 수동 광고 칸: lib/fmt.ts ADS 스위치가 꺼지면 아무것도 그리지 않음. */
export const Ad=()=>ADS?<AdSlot/>:null;

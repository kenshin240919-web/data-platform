import {ADSENSE_CLIENT} from './adsense';
// Auto ads loader; ad formats (anchor, side rail, vignette, in-page) are switched on in the AdSense dashboard, not here.
export function AdSenseScript(){return <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`} crossOrigin="anonymous"/>;}

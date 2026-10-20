import {AdSlot} from '@guidejung/ui/ads';
// Template for the Worker: it renders /hospital/{id} by filling this page's <main> (same header, footer, scripts).
// Not linked and not in the sitemap; the Worker answers 404 for /hospital/shell itself.
export default function HospitalShell(){return <div className="page"><div id="hospital-detail">HOSPITAL_DETAIL</div><AdSlot/></div>;}

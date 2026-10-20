import {AdSlot} from '@guidejung/ui/ads';
// Template for the Worker: it renders /pharmacy/{id} by filling this page's <main> (same header, footer, scripts).
// Not linked and not in the sitemap; the Worker answers 404 for /pharmacy/shell itself.
export default function PharmacyShell(){return <div className="page"><div id="pharmacy-detail">PHARMACY_DETAIL</div><AdSlot/></div>;}

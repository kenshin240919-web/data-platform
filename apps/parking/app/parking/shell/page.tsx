import {AdSlot} from '@guidejung/ui/ads';
// Template for the Worker: it renders /parking/{id} by filling this page's <main> (same header, footer, scripts).
// Not linked and not in the sitemap; the Worker answers 404 for /parking/shell itself.
export default function ParkingShell(){return <div className="page"><div id="parking-detail">PARKING_DETAIL</div><AdSlot/></div>;}

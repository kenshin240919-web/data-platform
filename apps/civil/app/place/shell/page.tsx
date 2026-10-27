import {Ad} from '../../_components/Ad';
// Template for the Worker: it renders /place/{id} by filling this page's <main> (same header, footer, scripts).
// Not linked and not in the sitemap; the Worker answers 404 for /place/shell itself.
export default function PlaceShell(){return <div className="page"><div id="place-detail">PLACE_DETAIL</div><Ad/></div>;}

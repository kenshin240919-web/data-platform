import {Ad} from '../../_components/Ad';
// Template for the Worker: it renders /store/{id} by filling this page's <main> (same header, footer, scripts).
// Not linked and not in the sitemap; the Worker answers 404 for /store/shell itself.
export const metadata={robots:{index:false,follow:true}};
export default function StoreShell(){return <div className="page"><div id="store-detail">STORE_DETAIL</div><Ad/></div>;}

import {searchIndex} from '@guidejung/ui';
// Slim item list the browser loads for search, filters and date-based listings.
export const dynamic='force-static';
export function GET(){return Response.json(searchIndex());}

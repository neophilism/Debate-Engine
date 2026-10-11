const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const OFFICE=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export type DebateFilters={office?:string;election?:string;q?:string;cursor?:string};
export function parseDebateFilters(params:URLSearchParams):DebateFilters {
 const office=(params.get("office")||"").trim();
 const election=(params.get("election")||"").trim();
 const q=(params.get("q")||"").trim();
 const cursor=(params.get("cursor")||"").trim();
 if(office&&(office.length>100||!OFFICE.test(office)))throw Error("Invalid office filter.");
 if(election&&!UUID.test(election))throw Error("Invalid election filter.");
 if(q.length>160)throw Error("Search is limited to 160 characters.");
 if(cursor&&(cursor.length>256||!/^[a-zA-Z0-9_-]+$/.test(cursor)))throw Error("Invalid page cursor.");
 return {office:office||undefined,election:election||undefined,q:q||undefined,cursor:cursor||undefined};
}
export function debateFilterUrl(filters:DebateFilters){
 const p=new URLSearchParams();
 if(filters.office)p.set("office",filters.office);
 if(filters.election)p.set("election",filters.election);
 if(filters.q)p.set("q",filters.q);
 if(filters.cursor)p.set("cursor",filters.cursor);
 return "/debates"+(p.size?"?"+p.toString():"");
}

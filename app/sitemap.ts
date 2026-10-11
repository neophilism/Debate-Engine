import type {MetadataRoute} from "next";
import {database} from "../lib/server/db";
export const dynamic="force-dynamic";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const base=process.env.PUBLIC_BASE_URL||process.env.RENDER_EXTERNAL_URL||"http://localhost:3000";
 const routes=["/","/debates","/candidates","/protocol","/press"].map(path=>({url:new URL(path,base).toString(),changeFrequency:"weekly" as const}));
 try{
  const [debates,candidates]=await Promise.all([
   database().query<{id:string;published_at:string}>("SELECT id,published_at FROM debates WHERE status='published' ORDER BY published_at DESC LIMIT 5000"),
   database().query<{id:string}>("SELECT id FROM candidacies WHERE verification_status='verified' LIMIT 5000")
  ]);
  return [...routes,...debates.rows.map(x=>({url:new URL("/debates/"+x.id,base).toString(),lastModified:x.published_at,changeFrequency:"weekly" as const})),...candidates.rows.map(x=>({url:new URL("/candidates/"+x.id,base).toString(),changeFrequency:"weekly" as const}))];
 }catch{return routes;}
}

/** Public read-only client suitable for neutral websites and candidate embeds. */
export interface PublicPage<T>{
 schemaVersion:"1.0.0";items:T[];nextCursor:string|null;
}
export interface PublicDebate {
 id:string;title:string;proposition:string;published_at:string;
 originator:string;office:string;election_label:string;
 contribution_count:number;contender_count:number;
}
export class PublicDebateEngineClient {
 readonly baseUrl:URL;
 constructor(baseUrl:string){
  const url=new URL(baseUrl);
  if(url.protocol!=="https:"&&!(url.protocol==="http:"&&["localhost","127.0.0.1"].includes(url.hostname)))
   throw Error("Public Debate Engine SDK requires HTTPS outside local development.");
  this.baseUrl=url;
 }
 private async read(path:string,query?:URLSearchParams){
  const url=new URL(path,this.baseUrl);if(query)url.search=query.toString();
  const response=await fetch(url,{method:"GET",cache:"no-store",credentials:"omit"});
  if(!response.ok)throw Error("Public debate API returned HTTP "+response.status);
  return response.json();
 }
 async debates(options:{limit?:number;cursor?:string}={}):Promise<PublicPage<PublicDebate>>{
  const q=new URLSearchParams();
  if(options.limit)q.set("limit",String(options.limit));
  if(options.cursor)q.set("cursor",options.cursor);
  return this.read("/api/v1/debates",q);
 }
 async debate(id:string):Promise<unknown>{return this.read("/api/v1/debates/"+encodeURIComponent(id));}
 async agreedPressKit(branchId:string):Promise<unknown>{return this.read("/api/v1/branches/"+encodeURIComponent(branchId)+"/press-kit");}
 embedUrl(debateId:string){
  if(!/^[a-f0-9-]{36}$/i.test(debateId))throw Error("Invalid public debate ID.");
  return new URL("/embed/debates/"+debateId,this.baseUrl).toString();
 }
}

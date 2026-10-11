/** Candidate-neutral, read-only v1 adapter for an external Interlocutor-branded site.
 * Never sends auth cookies or attempts to mutate the underlying debate archive.
 */
export interface PublicDebateSummary {
 id:string;title:string;proposition:string;originator:string;
 office:string;election_label:string;contribution_count:number;contender_count:number;
}
export interface PageResult<T>{schemaVersion:string;items:T[];nextCursor:string|null}
export class InterlocutorReadClient{
 constructor(private origin:string){
  const u=new URL(origin);
  if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||u.pathname!=="/")throw Error("Public Debate Engine origin must be an HTTPS root.");
  this.origin=u.origin;
 }
 private async read<T>(path:string):Promise<T>{
  const res=await fetch(this.origin+path,{method:"GET",headers:{Accept:"application/json"},credentials:"omit",cache:"no-store",redirect:"error"});
  if(!res.ok)throw Error("Public Debate Engine read failed ("+res.status+").");
  const data=await res.json() as T;
  return data;
 }
 listDebates(input?:{limit?:number;cursor?:string}):Promise<PageResult<PublicDebateSummary>>{
  const limit=input?.limit??20;
  if(!Number.isInteger(limit)||limit<1||limit>100)throw Error("Page limit must be 1–100.");
  const p=new URLSearchParams({limit:String(limit)});
  if(input?.cursor)p.set("cursor",input.cursor);
  return this.read<PageResult<PublicDebateSummary>>("/api/v1/debates?"+p.toString());
 }
 loadPublicDebate(id:string):Promise<Record<string,unknown>>{
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)||id.length!==36)throw Error("Invalid debate identifier.");
  return this.read<Record<string,unknown>>("/api/v1/debates/"+encodeURIComponent(id));
 }
 embedUrl(debateId:string):string{
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(debateId)||debateId.length!==36)throw Error("Invalid debate identifier.");
  return this.origin+"/embed/debates/"+encodeURIComponent(debateId);
 }
}

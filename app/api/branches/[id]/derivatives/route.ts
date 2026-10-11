import {NextRequest,NextResponse} from "next/server";
import {jsonError,HttpError,requireIdentity,requireSameOrigin,parseJson,record,field,uuid} from "../../../../../lib/server/http";
import {submitEditorialPlan} from "../../../../../lib/server/derivative-rights";
import type {EditorialManifest,SourceClip} from "../../../../../packages/domain/rights";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true);
  const branchId=uuid((await params).id,"branch id");
  const b=record(await parseJson(request)),obj=record(b.manifest);
  if(!["master","five_minutes","three_minutes","one_minute","thirty_seconds"].includes(String(obj.outputKind)))throw new HttpError(400,"Invalid summary format.");
  if(!Array.isArray(obj.clips)||!Array.isArray(obj.captions))throw new HttpError(400,"Source clips and captions required.");
  const clips:SourceClip[]=obj.clips.map(x=>{const c=record(x);return {mediaAssetId:uuid(c.mediaAssetId,"media ID"),startSeconds:Number(c.startSeconds),endSeconds:Number(c.endSeconds)};});
  if(obj.captions.some(x=>typeof x!=="string"))throw new HttpError(400,"Captions must be text.");
  const manifest:EditorialManifest={branchId,clips,captions:obj.captions,outputKind:obj.outputKind as EditorialManifest["outputKind"],releaseTitle:field(obj.releaseTitle,"release title",180)};
  const result=await submitEditorialPlan({manifest,candidateId:uuid(b.candidacyId,"candidate ID"),authSubject:user.id});
  return NextResponse.json(result,{status:201});
 }catch(e){return jsonError(e);}
}

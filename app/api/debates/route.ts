import {NextRequest,NextResponse} from "next/server";
import {listPublicDebates} from "../../../lib/server/public-debates";
import {publishOpening} from "../../../lib/server/publish-debate";
import {requireIdentity,requireSameOrigin,parseJson,record,field,uuid,jsonError,HttpError} from "../../../lib/server/http";
import {parseModalities} from "../../../packages/domain/modalities";
import {readModality,readQuestionItem} from "../../../lib/server/contribution-source";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
 try{return NextResponse.json({debates:await listPublicDebates()},{headers:{"Cache-Control":"public,max-age=60"}});}
 catch(e){return jsonError(e);}
}
export async function POST(request:NextRequest){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true);
  const b=record(await parseJson(request));
  if(b.archiveConsent!==true||b.sequenceConsent!==true)throw new HttpError(400,"Explicit archival and qualifying-sequence permissions are required.");
  const q=b.questions;
  if(!Array.isArray(q)||q.length<1||q.length>3)throw new HttpError(400,"Pose one to three questions.");
  let allowedModalities;
  try{allowedModalities=parseModalities(b.allowedModalities)}catch(e){throw new HttpError(400,e instanceof Error?e.message:"Invalid media choices.");}
  const modality=readModality(b.modality);
  const questions=q.map(item=>readQuestionItem(record(item),modality));
  const published=await publishOpening({
    candidateId:uuid(b.candidacyId,"candidacyId"),authSubject:user.id,
    title:field(b.title,"title",180),proposition:field(b.proposition,"proposition",20000),
    source:{modality,mediaAssetId:modality==="writing"?null:uuid(b.mediaAssetId,"mediaAssetId"),
     writtenContent:modality==="writing"?field(b.writtenContent,"writtenContent",100000):null},
    allowedModalities,maxResponseSeconds:Number(b.maxResponseSeconds),
    replyWindowHours:b.replyWindowHours==null?null:Number(b.replyWindowHours),questions
  });
  return NextResponse.json(published,{status:201,headers:{"Cache-Control":"no-store"}});
 }catch(e){return jsonError(e);}
}

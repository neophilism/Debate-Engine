import {NextRequest,NextResponse} from "next/server";
import {publishContinuation} from "../../../../../lib/server/continue-debate";
import {requireIdentity,requireSameOrigin,parseJson,record,uuid,field,jsonError,HttpError} from "../../../../../lib/server/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  requireSameOrigin(request);const actor=await requireIdentity(true);
  const debateId=uuid((await params).id,"debate id");const body=record(await parseJson(request));
  if(body.archiveConsent!==true||body.sequenceConsent!==true)throw new HttpError(400,"Explicit archival and unedited-sequence permissions are required.");
  if(!Array.isArray(body.questions)||!Array.isArray(body.answers))throw new HttpError(400,"Questions and answer mappings are required.");
  const questions=body.questions.map(value=>{const q=record(value);return {text:field(q.text,"question",600),timestamp:Number(q.timestamp)};});
  const answers=body.answers.map(value=>{const a=record(value);return {questionId:uuid(a.questionId,"questionId"),timestamp:Number(a.timestamp),explanation:typeof a.explanation==="string"?a.explanation.slice(0,1200):undefined};});
  const result=await publishContinuation({debateId,authSubject:actor.id,candidateId:uuid(body.candidacyId,"candidacyId"),mediaAssetId:uuid(body.mediaAssetId,"mediaAssetId"),parentSubmissionId:uuid(body.parentSubmissionId,"parentSubmissionId"),questions,answers});
  return NextResponse.json(result,{status:201});
 }catch(e){return jsonError(e);}
}

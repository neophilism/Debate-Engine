import {NextRequest,NextResponse} from "next/server";
import {publishContinuation} from "../../../../../lib/server/continue-debate";
import {requireIdentity,requireSameOrigin,parseJson,record,uuid,field,jsonError,HttpError} from "../../../../../lib/server/http";
import {readModality,readQuestionItem,readAnswerItem} from "../../../../../lib/server/contribution-source";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  requireSameOrigin(request);const actor=await requireIdentity(true);
  const debateId=uuid((await params).id,"debate id");const body=record(await parseJson(request));
  if(body.archiveConsent!==true||body.sequenceConsent!==true)throw new HttpError(400,"Explicit archival and unedited-sequence permissions are required.");
  if(!Array.isArray(body.questions)||!Array.isArray(body.answers))throw new HttpError(400,"Questions and answer mappings are required.");
  if(body.questions.length>10||body.answers.length>50)throw new HttpError(400,"Too many questions or answer references.");
  const modality=readModality(body.modality);
  const questions=body.questions.map(value=>readQuestionItem(record(value),modality));
  const answers=body.answers.map(value=>{const a=readAnswerItem(record(value),modality);return {...a,questionId:uuid(a.questionId,"questionId")};});
  const result=await publishContinuation({debateId,authSubject:actor.id,candidateId:uuid(body.candidacyId,"candidacyId"),
   source:{modality,mediaAssetId:modality==="writing"?null:uuid(body.mediaAssetId,"mediaAssetId"),
    writtenContent:modality==="writing"?field(body.writtenContent,"writtenContent",100000):null},
   parentSubmissionId:uuid(body.parentSubmissionId,"parentSubmissionId"),questions,answers});
  return NextResponse.json(result,{status:201});
 }catch(e){return jsonError(e);}
}

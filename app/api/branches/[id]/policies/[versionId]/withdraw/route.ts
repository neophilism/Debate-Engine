import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,parseJson,record,uuid,jsonError,HttpError} from "../../../../../../../lib/server/http";
import {withdrawPolicy} from "../../../../../../../lib/server/policy-convergence";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string;versionId:string}>}){
 try{
  requireSameOrigin(request);const actor=await requireIdentity(true);const p=await params;
  const b=record(await parseJson(request));
  if(typeof b.sha256!=="string"||!/^[0-9a-f]{64}$/.test(b.sha256))
   throw new HttpError(400,"The exact approved proposal digest is required.");
  const result=await withdrawPolicy({
   branchId:uuid(p.id,"branch id"),versionId:uuid(p.versionId,"version id"),
   candidateId:uuid(b.candidacyId,"candidacyId"),authSubject:actor.id,sha256:b.sha256
  });
  return NextResponse.json(result,{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e)}
}

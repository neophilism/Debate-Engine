import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,uuid,jsonError,parseJson,record,HttpError} from "../../../../../../../lib/server/http";
import {approveRendered} from "../../../../../../../lib/server/summary-approval";
export const dynamic="force-dynamic";export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string;artifactId:string}>}){
 try{requireSameOrigin(request);const user=await requireIdentity(true);const p=await params;const body=record(await parseJson(request));
 if(typeof body.outputSha256!=="string"||!/^[a-f0-9]{64}$/.test(body.outputSha256))throw new HttpError(400,"The exact file SHA-256 is required.");
 const result=await approveRendered({branchId:uuid(p.id,"branch id"),artifactId:uuid(p.artifactId,"artifact id"),candidateId:uuid(body.candidacyId,"candidate id"),authSubject:user.id,outputSha256:body.outputSha256});
 return NextResponse.json(result);
 }catch(e){return jsonError(e);}
}

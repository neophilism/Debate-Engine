import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,uuid,jsonError,parseJson,record} from "../../../../../../../lib/server/http";
import {releaseSummary} from "../../../../../../../lib/server/summary-approval";
export const dynamic="force-dynamic";export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string;artifactId:string}>}){
 try{requireSameOrigin(request);const user=await requireIdentity(true);const p=await params;const body=record(await parseJson(request));
 const result=await releaseSummary({branchId:uuid(p.id,"branch id"),artifactId:uuid(p.artifactId,"artifact id"),candidateId:uuid(body.candidacyId,"candidate id"),authSubject:user.id});
 return NextResponse.json(result);
 }catch(e){return jsonError(e);}
}

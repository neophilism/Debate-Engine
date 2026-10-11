import {NextResponse} from "next/server";
import {candidateProfile} from "../../../../lib/server/discovery";
import {uuid,jsonError,HttpError} from "../../../../lib/server/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{const id=uuid((await params).id,"candidate id");const profile=await candidateProfile(id);if(!profile)throw new HttpError(404,"Candidate profile not found.");return NextResponse.json(profile,{headers:{"Cache-Control":"public,max-age=30"}});}
 catch(e){return jsonError(e);}
}

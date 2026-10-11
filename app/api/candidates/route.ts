import {NextRequest,NextResponse} from "next/server";
import {candidateDirectory} from "../../../lib/server/discovery";
import {jsonError,HttpError} from "../../../lib/server/http";
export const dynamic="force-dynamic";export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{const office=request.nextUrl.searchParams.get("office"),election=request.nextUrl.searchParams.get("election");
 if(office&&!/^[a-z0-9-]{1,120}$/.test(office))throw new HttpError(400,"Invalid office filter.");
 if(election&&!/^[0-9a-f-]{36}$/i.test(election))throw new HttpError(400,"Invalid election filter.");
 return NextResponse.json({candidates:await candidateDirectory(office,election)},{headers:{"Cache-Control":"public,max-age=30"}});
 }catch(e){return jsonError(e);}
}

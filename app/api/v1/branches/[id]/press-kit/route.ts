import {NextResponse} from "next/server";
import {uuid,jsonError} from "../../../../../../lib/server/http";
import {pressKitForBranch} from "../../../../../../lib/server/press-kit";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{const kit=await pressKitForBranch(uuid((await params).id,"branch id"));
 return NextResponse.json(kit,{headers:{"Cache-Control":"public,max-age=30"}});
 }catch(e){return jsonError(e);}
}

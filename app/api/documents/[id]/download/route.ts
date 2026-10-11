import {NextResponse} from "next/server";
import {uuid,jsonError} from "../../../../../lib/server/http";
import {signedDocumentUrl} from "../../../../../lib/server/documents";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{const id=uuid((await params).id,"document ID");const url=await signedDocumentUrl(id);
 return NextResponse.redirect(url,{status:307,headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return jsonError(e);}
}

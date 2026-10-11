import {NextRequest,NextResponse} from "next/server";
import {listPublicDebatesPage} from "../../../lib/server/public-debates";
import {parseDebateFilters} from "../../../packages/domain/discovery";
import {jsonError} from "../../../lib/server/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 try{
  let filters:ReturnType<typeof parseDebateFilters>;
  try{filters=parseDebateFilters(request.nextUrl.searchParams);}catch{return NextResponse.json({error:"Invalid debate search filters."},{status:400});}
  const results=await listPublicDebatesPage(filters);
  return NextResponse.json(results,{headers:{"Cache-Control":"public,max-age=60"}});
 }catch(e){if(e instanceof Error&&e.message==="Malformed page cursor.")return NextResponse.json({error:e.message},{status:400});return jsonError(e)}
}
export async function POST(){return NextResponse.json({error:"Direct publication is disabled. Use a private candidate-reviewed draft and explicit confirmation."},{status:409})}

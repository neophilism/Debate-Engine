import "server-only";
import {NextRequest} from "next/server";
import {HttpError,record} from "./http";
export async function parsePrivateJson(request:NextRequest):Promise<Record<string,unknown>>{
 if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
  throw new HttpError(415,"Expected application/json.");
 const size=Number(request.headers.get("content-length"));
 if(Number.isFinite(size)&&size>155000)throw new HttpError(413,"Draft exceeds 155 KB.");
 const content=await request.text();
 if(content.length>155000)throw new HttpError(413,"Draft is too large.");
 try{return record(JSON.parse(content));}
 catch(e){if(e instanceof HttpError)throw e;throw new HttpError(400,"Invalid draft JSON.");}
}

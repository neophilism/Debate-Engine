import "server-only";
import { S3Client,GetObjectCommand,PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HttpError } from "./http";

let s3:S3Client|undefined;
export function objectStorage(){
 const endpoint=process.env.AWS_ENDPOINT_URL_S3;
 if(!endpoint?.startsWith("https://") || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.MEDIA_BUCKET)
   throw new HttpError(503,"Permanent media storage is not configured.");
 s3??=new S3Client({
   endpoint,region:process.env.AWS_REGION||"us-east-2",forcePathStyle:true,
   credentials:{accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY}
 });
 return {client:s3,bucket:process.env.MEDIA_BUCKET};
}
export async function storeOriginal(key:string,bytes:Buffer,contentType:string){
 const {client,bucket}=objectStorage();
 await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:contentType,
   CacheControl:"private, no-store",Metadata:{archival:"original-unaltered"}}));
}
export async function playOriginal(key:string){
 const {client,bucket}=objectStorage();
 return getSignedUrl(client,new GetObjectCommand({Bucket:bucket,Key:key,ResponseContentDisposition:"inline"}),{expiresIn:300});
}

import {createHash} from "node:crypto";

export function canonicalEntries(entries){
 return entries.map(x=>({kind:String(x.kind),id:String(x.id),sha256:String(x.sha256),sizeBytes:x.sizeBytes==null?null:Number(x.sizeBytes)}))
 .sort((a,b)=>a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
}
export function archiveManifestDigest(entries){
 return createHash("sha256").update(JSON.stringify({schemaVersion:"1.0.0",entries:canonicalEntries(entries)})).digest("hex");
}

/** Streaming byte integrity verification. Refuses short, oversized, or tampered objects. */
export async function verifyByteStream(stream,{expectedSha256,expectedSize=null,maxBytes=150*1024*1024}){
 if(!/^[a-f0-9]{64}$/.test(expectedSha256))throw Error("Invalid expected SHA-256.");
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1)throw Error("Invalid safety limit.");
 if(expectedSize!==null&&(!Number.isSafeInteger(expectedSize)||expectedSize<0||expectedSize>maxBytes))
  throw Error("Expected object size exceeds safety limits.");
 const hash=createHash("sha256");let bytes=0;
 for await(const chunk of stream){
  const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
  bytes+=buffer.length;
  if(bytes>maxBytes||expectedSize!==null&&bytes>expectedSize)throw Error("Object exceeded authorized byte count.");
  hash.update(buffer);
 }
 const computed=hash.digest("hex");
 if(expectedSize!==null&&bytes!==expectedSize)throw Error("Object length mismatch.");
 if(computed!==expectedSha256)throw Error("Object hash mismatch.");
 return {bytes,sha256:computed,verified:true};
}

/** 8 MiB parts satisfy S3's 5 MiB nonfinal multipart minimum. */
export const MEDIA_PART_BYTES=8*1024*1024;
export const MAX_MEDIA_BYTES=60*1024*1024;
export type UploadedPart={PartNumber?:number;ETag?:string;Size?:number};
export function partCount(totalBytes:number){
 if(!Number.isSafeInteger(totalBytes)||totalBytes<64||totalBytes>MAX_MEDIA_BYTES)
  throw new Error("Original media must be between 64 bytes and 60 MiB.");
 return Math.ceil(totalBytes/MEDIA_PART_BYTES);
}
export function expectedPartSize(totalBytes:number,partNumber:number){
 const count=partCount(totalBytes);
 if(!Number.isSafeInteger(partNumber)||partNumber<1||partNumber>count)
  throw new Error("Part number is outside the declared upload.");
 return partNumber<count?MEDIA_PART_BYTES:totalBytes-MEDIA_PART_BYTES*(count-1);
}
/** Only trusted ListParts data from S3 may authorize final assembly. */
export function completionParts(totalBytes:number,parts:UploadedPart[]){
 const count=partCount(totalBytes);
 if(parts.length!==count)throw new Error("Not all upload parts have reached durable storage.");
 const byNumber=new Map<number,UploadedPart>();
 for(const part of parts){
  const n=part.PartNumber;
  if(!Number.isSafeInteger(n)||n===undefined||n<1||n>count||byNumber.has(n))
   throw new Error("Unexpected or duplicate multipart number.");
  if(part.Size!==expectedPartSize(totalBytes,n))
   throw new Error("Stored part size differs from the declared original.");
  if(typeof part.ETag!=="string"||!/^"?[a-zA-Z0-9_-]{8,128}"?$/.test(part.ETag))
   throw new Error("Multipart part lacks a valid storage ETag.");
  byNumber.set(n,part);
 }
 return [...byNumber].sort(([a],[b])=>a-b).map(([PartNumber,part])=>({PartNumber,ETag:part.ETag!}));
}

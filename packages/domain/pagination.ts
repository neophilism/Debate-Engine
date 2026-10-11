const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function encodeDebateCursor(instant:Date|string,id:string){
 const date=instant instanceof Date?instant:new Date(instant);
 if(!Number.isFinite(date.valueOf())||!UUID.test(id))throw Error("Invalid cursor input.");
 return Buffer.from(JSON.stringify([date.toISOString(),id]),"utf8").toString("base64url");
}
export function decodeDebateCursor(input:string){
 if(!/^[A-Za-z0-9_-]{1,256}$/.test(input))throw Error("Malformed page cursor.");
 try{
  const value=JSON.parse(Buffer.from(input,"base64url").toString("utf8"));
  if(!Array.isArray(value)||value.length!==2||typeof value[0]!=="string"||typeof value[1]!=="string"||!UUID.test(value[1]))throw Error("Cursor malformed");
  const date=new Date(value[0]);
  if(!Number.isFinite(date.valueOf())||date.toISOString()!==value[0])throw Error("Cursor date invalid");
  return {publishedAt:value[0],id:value[1]};
 }catch{throw Error("Malformed page cursor.");}
}

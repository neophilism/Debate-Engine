import {createConnection} from "node:net";

/** ClamAV's local Unix-socket INSTREAM protocol, with bounded input and timeout. */
export type ScanVerdict={scanner:"clamav";verdict:"clean"};
export class ScanFailure extends Error{
 constructor(public readonly reason:"detected"|"unavailable",message:string){
  super(message);this.name="ScanFailure";
 }
}
export function scanWithClamd(data:Buffer,socketPath:string):Promise<ScanVerdict>{
 if(!Buffer.isBuffer(data)||data.length<64||data.length>60*1024*1024)
  return Promise.reject(new ScanFailure("unavailable","Invalid scanning input."));
 if(!socketPath.startsWith("/")||socketPath.includes("\0"))
  return Promise.reject(new ScanFailure("unavailable","An approved local scanner socket is required."));
 return new Promise((resolve,reject)=>{
  const client=createConnection({path:socketPath});
  client.setTimeout(60000);
  let ended=false,output=Buffer.alloc(0);
  const finish=(error:ScanFailure|null)=>{
   if(ended)return;ended=true;client.destroy();
   if(error)reject(error);else resolve({scanner:"clamav",verdict:"clean"});
  };
  client.once("connect",()=>{
   client.write(Buffer.from("zINSTREAM\0"));
   for(let offset=0;offset<data.length;offset+=1024*1024){
    const part=data.subarray(offset,Math.min(offset+1024*1024,data.length));
    const length=Buffer.alloc(4);length.writeUInt32BE(part.length,0);
    client.write(length);client.write(part);
   }
   client.write(Buffer.alloc(4));
  });
  client.on("data",(next:Buffer)=>{
   output=Buffer.concat([output,next]);
   if(output.length>2048){finish(new ScanFailure("unavailable","Scanner reply exceeded limit."));return;}
   const end=output.indexOf(0);
   if(end<0)return;
   const reply=output.subarray(0,end).toString("utf8").trim();
   if(reply==="stream: OK")finish(null);
   else if(/^stream: .{1,200} FOUND$/.test(reply))
    finish(new ScanFailure("detected","Original was rejected by the content scanner."));
   else finish(new ScanFailure("unavailable","No successful scan verdict was returned."));
  });
  client.once("error",()=>finish(new ScanFailure("unavailable","Scanner unavailable.")));
  client.once("timeout",()=>finish(new ScanFailure("unavailable","Scanner timed out.")));
  client.once("close",()=>finish(new ScanFailure("unavailable","Scanner closed without a completed verdict.")));
 });
}

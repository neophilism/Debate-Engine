import "server-only";
import {randomUUID,createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {writeFileSync,unlinkSync,mkdtempSync,rmdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {HttpError} from "./http";

const MAX_VIDEO_BYTES=60*1024*1024;
export function examineVideo(data:Buffer,fileMime:string){
 if(data.length<64 || data.length>MAX_VIDEO_BYTES)throw new HttpError(413,"Video must be between 64 bytes and 60 MiB.");
 const mp4=data.toString("ascii",4,8)==="ftyp";
 const webm=data.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
 if(!mp4&&!webm)throw new HttpError(415,"Only valid MP4/MOV or WebM files are supported.");
 const mime=webm?"video/webm":fileMime==="video/quicktime"?"video/quicktime":"video/mp4";
 const dir=mkdtempSync(join(tmpdir(),"pde-video-"));
 const path=join(dir,randomUUID()+(webm?".webm":".mp4"));
 try{
  writeFileSync(path,data,{flag:"wx",mode:0o600});
  const proc=spawnSync("ffprobe",["-v","error","-print_format","json","-show_format","-show_streams",path],{encoding:"utf8",timeout:20000,maxBuffer:800000});
  if(proc.error?.message?.includes("ENOENT"))throw new HttpError(503,"Server video validation is unavailable.");
  if(proc.status!==0)throw new HttpError(415,"This video could not be validated.");
  const report=JSON.parse(proc.stdout) as {streams?:Array<{codec_type?:string}>,format?:{duration?:string}};
  if(!report.streams?.some(s=>s.codec_type==="video"))throw new HttpError(415,"No video stream was detected.");
  const duration=Number(report.format?.duration);
  if(!Number.isFinite(duration)||duration<1||duration>4*3600)throw new HttpError(415,"Invalid video duration.");
  return {mime,duration,sha256:createHash("sha256").update(data).digest("hex")};
 }finally{try{unlinkSync(path);}catch{} try{rmdirSync(dir);}catch{}}
}

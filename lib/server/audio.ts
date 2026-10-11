import "server-only";
import {createHash,randomUUID} from "node:crypto";
import {mkdtempSync,writeFileSync,unlinkSync,rmdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {HttpError} from "./http";
const LIMIT=60*1024*1024;
export function examineAudio(bytes:Buffer,claimedMime:string){
 if(bytes.length<64||bytes.length>LIMIT)throw new HttpError(413,"Audio file must be 64 bytes–60 MiB.");
 const hdr=bytes.subarray(0,12),prefix=hdr.toString("ascii");
 const mp3=prefix.startsWith("ID3")||(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0);
 const wav=prefix.startsWith("RIFF")&&prefix.slice(8,12)==="WAVE";
 const flac=prefix.startsWith("fLaC"),ogg=prefix.startsWith("OggS");
 const webm=hdr.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
 const m4a=prefix.slice(4,8)==="ftyp";
 if(!mp3&&!wav&&!flac&&!ogg&&!webm&&!m4a)throw new HttpError(415,"Unsupported audio container.");
 const mime=mp3?"audio/mpeg":wav?"audio/wav":flac?"audio/flac":ogg?"audio/ogg":webm?"audio/webm":"audio/mp4";
 if(!claimedMime.startsWith("audio/")&&claimedMime!=="application/octet-stream")
  throw new HttpError(415,"Only audio uploads are accepted in audio mode.");
 const dir=mkdtempSync(join(tmpdir(),"pde-audio-")),path=join(dir,randomUUID());
 try{
  writeFileSync(path,bytes,{flag:"wx",mode:0o600});
  const probe=spawnSync("ffprobe",["-v","error","-print_format","json","-show_format","-show_streams",path],{encoding:"utf8",timeout:20000,maxBuffer:800000});
  if(probe.error?.message?.includes("ENOENT"))throw new HttpError(503,"Audio validation unavailable.");
  if(probe.status!==0)throw new HttpError(415,"Audio could not be decoded.");
  const parsed=JSON.parse(probe.stdout) as {streams?:Array<{codec_type?:string}>;format?:{duration?:string}};
  if(!parsed.streams?.some(s=>s.codec_type==="audio")||parsed.streams.some(s=>s.codec_type==="video"))
   throw new HttpError(415,"Audio contributions must contain audio and no video.");
  const duration=Number(parsed.format?.duration);
  if(!Number.isFinite(duration)||duration<1||duration>14400)throw new HttpError(415,"Audio duration invalid or exceeds four hours.");
  return {mime,duration,sha256:createHash("sha256").update(bytes).digest("hex")};
 }finally{try{unlinkSync(path)}catch{}try{rmdirSync(dir)}catch{}}
}

import "server-only";
import {createHash,randomUUID} from "node:crypto";
import {spawnSync} from "node:child_process";
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {GetObjectCommand} from "@aws-sdk/client-s3";
import {objectStorage} from "./storage";
import {database,transaction} from "./db";
import {HttpError} from "./http";
import {loadPrivateDraft} from "./private-drafts";
import {draftFingerprint} from "../../packages/domain/private-assessment";

function transcriptionProvider(){
 const base=process.env.DEBATE_ASSISTANT_STT_BASE_URL;
 const token=process.env.DEBATE_ASSISTANT_STT_KEY;
 const model=process.env.DEBATE_ASSISTANT_STT_MODEL;
 if(!base||!token||!model)return null;
 const url=new URL(base);
 if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash)
  throw new HttpError(503,"Transcription endpoint configuration is invalid.");
 return {url:new URL("/v1/audio/transcriptions",url),token,model};
}
async function fetchPrivateOriginal(key:string){
 const {client,bucket}=objectStorage();
 const object=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}));
 if(!object.Body)throw new HttpError(503,"Original audio could not be retrieved.");
 const bytes=Buffer.from(await object.Body.transformToByteArray());
 if(!bytes.length||bytes.length>60*1024*1024)throw new HttpError(413,"Unsupported original-media size.");
 return bytes;
}
function extractSpeechAudio(data:Buffer):Buffer{
 const dir=mkdtempSync(join(tmpdir(),"pde-speech-"));
 try{
  const input=join(dir,randomUUID()+".original"),output=join(dir,"speech.mp3");
  writeFileSync(input,data,{mode:0o600,flag:"wx"});
  const result=spawnSync("ffmpeg",[
   "-nostdin","-hide_banner","-loglevel","error","-y",
   "-protocol_whitelist","file,pipe,crypto","-i",input,
   "-vn","-ac","1","-ar","16000","-b:a","48k","-c:a","libmp3lame",output
  ],{encoding:"utf8",timeout:60000,maxBuffer:1000000});
  if(result.status!==0||result.error)throw new HttpError(422,"Speech audio extraction failed or exceeded time limits.");
  const audio=readFileSync(output);
  if(!audio.length||audio.length>20*1024*1024)throw new HttpError(413,"Transcription audio exceeds provider limits.");
  return audio;
 }finally{rmSync(dir,{recursive:true,force:true});}
}
export async function transcribePrivateSpeech(draftId:string,authSubject:string){
 const draft=await loadPrivateDraft(draftId,authSubject);
 if(draft.modality==="writing")throw new HttpError(400,"Written speeches do not require audio transcription.");
 if(!draft.provider_consent)throw new HttpError(403,"Explicit consent to send speech audio to a third-party provider is required.");
 if(!["draft","reviewed"].includes(draft.status))throw new HttpError(409,"Only unapproved private drafts may be transcribed.");
 const provider=transcriptionProvider();
 if(!provider)throw new HttpError(503,"Private speech transcription is not configured; you can type a transcript instead.");
 const ref=draft.payload.mediaAssetId;
 if(typeof ref!=="string")throw new HttpError(400,"Draft has no original media.");
 const media=await database().query<{storage_key:string;original_sha256:string;duration_seconds:string}>(
  "SELECT storage_key,original_sha256,duration_seconds FROM media_assets WHERE id=$1 AND owner_candidacy_id=$2 AND processing_status='ready' AND mime_type LIKE $3",
  [ref,draft.candidacy_id,draft.modality+"/%"]);
 if(!media.rowCount)throw new HttpError(403,"Original audio/video does not belong to this candidate.");
 if(Number(media.rows[0].duration_seconds)>1800)
  throw new HttpError(422,"Automatic transcription currently supports up to thirty minutes; supply a transcript for longer speeches.");
 const input=await fetchPrivateOriginal(media.rows[0].storage_key);
 if(createHash("sha256").update(input).digest("hex")!==media.rows[0].original_sha256)
  throw new HttpError(503,"Media integrity could not be verified; transcription was stopped.");
 const audio=extractSpeechAudio(input);
 const form=new FormData();
 form.set("model",provider.model);
 form.set("file",new Blob([new Uint8Array(audio)],{type:"audio/mpeg"}),"speech.mp3");
 let response:Response;
 try{response=await fetch(provider.url,{
  method:"POST",headers:{"Authorization":"Bearer "+provider.token},body:form,signal:AbortSignal.timeout(120000)
 });}catch{throw new HttpError(502,"Private transcription provider could not be reached.");}
 if(!response.ok)throw new HttpError(502,"Private speech transcription failed.");
 const result=await response.json() as {text?:unknown};
 if(typeof result.text!=="string"||!result.text.trim()||result.text.length>48000)
  throw new HttpError(502,"Provider returned no valid transcript.");
 const transcript=result.text as string;
 return transaction(async db=>{
  const fresh=await loadPrivateDraft(draftId,authSubject,true,db);
  if(fresh.content_sha256!==draft.content_sha256||fresh.status!==draft.status)
   throw new HttpError(409,"Draft changed during transcription. The generated text was not saved.");
  const hash=draftFingerprint(fresh.payload,transcript);
  await db.query("UPDATE private_submission_drafts SET transcript_text=$2,content_sha256=$3,status='draft',skipped_preliminary=false,updated_at=now() WHERE id=$1",
   [draftId,transcript,hash]);
  return {draftId,transcript,sha256:hash,private:true};
 });
}

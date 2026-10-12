import "server-only";
import type {PoolClient} from "pg";
import {HttpError} from "./http";
import {parseModalities,type DebateModality} from "../../packages/domain/modalities";
export interface AnchoredQuestion{text:string;timestamp?:number;characterOffset?:number}
export interface AnchoredAnswer{questionId:string;timestamp?:number;characterOffset?:number;explanation?:string}
export interface ContributionSource{modality:DebateModality;mediaAssetId:string|null;writtenContent:string|null}
export function validateContributionSource(source:ContributionSource) {
 if(source.modality==="writing"){
  if(source.mediaAssetId!==null||!source.writtenContent||!source.writtenContent.trim()||source.writtenContent.length>100000)
   throw new HttpError(400,"Written contributions require 1–100,000 characters and no media file.");
 }else if(!source.mediaAssetId||source.writtenContent!==null)
  throw new HttpError(400,"Audio/video contributions require a validated original file and no written content.");
}
export function validateReference(modality:DebateModality,raw:{timestamp?:number;characterOffset?:number},size:number){
 if(modality==="writing"){
  if(!Number.isSafeInteger(raw.characterOffset)||Number(raw.characterOffset)<0||
     Number(raw.characterOffset)>size)throw new HttpError(400,"Written anchor must point into the source text.");
  return {timestamp:null as number|null,anchor:"char:"+raw.characterOffset};
 }
 if(!Number.isFinite(raw.timestamp)||Number(raw.timestamp)<0||Number(raw.timestamp)>size)
  throw new HttpError(400,"Media timestamp must point into the audio or video source.");
 return {timestamp:Number(raw.timestamp),anchor:null as string|null};
}
export async function verifiedCandidateSource(
 db:PoolClient,input:{candidateId:string;authSubject:string;source:ContributionSource},electionId?:string
){
 validateContributionSource(input.source);
 const q=await db.query<{account_id:string;election_id:string}>(
  "SELECT c.account_id,c.election_id FROM candidacies c JOIN accounts a ON a.id=c.account_id WHERE c.id=$1 AND a.identity_provider='neon-auth' AND a.external_subject=$2 AND c.verification_status='verified' FOR UPDATE OF c",
  [input.candidateId,input.authSubject]);
 if(!q.rowCount)throw new HttpError(403,"A verified candidacy is required.");
 const user=q.rows[0];
 if(electionId&&user.election_id!==electionId)throw new HttpError(403,"Only candidates for the same election may respond.");
 if(input.source.modality==="writing")return {...user,duration:null as number|null};
 const m=await db.query<{duration_seconds:string;mime_type:string}>(
  "SELECT m.duration_seconds,m.mime_type FROM media_assets m JOIN media_scan_attestations attest ON attest.media_asset_id=m.id AND attest.original_sha256=m.original_sha256 AND attest.verdict='clean' WHERE m.id=$1 AND m.owner_candidacy_id=$2 AND m.processing_status='ready' FOR UPDATE OF m",
  [input.source.mediaAssetId,input.candidateId]);
 if(!m.rowCount)throw new HttpError(403,"An attested clean original must be owned by the candidate.");
 if(!m.rows[0].mime_type.startsWith(input.source.modality+"/"))
  throw new HttpError(400,"The media asset has a different format.");
 if((await db.query("SELECT 1 FROM submissions WHERE media_asset_id=$1",[input.source.mediaAssetId])).rowCount)
  throw new HttpError(409,"Original media is already published in another contribution.");
 return {...user,duration:Number(m.rows[0].duration_seconds)};
}
export function readModality(x:unknown):DebateModality{
 try{return parseModalities([x??"video"])[0]}
 catch{throw new HttpError(400,"Invalid contribution medium.");}
}
export function readQuestionItem(raw:Record<string,unknown>,modality:DebateModality):AnchoredQuestion{
 if(typeof raw.text!=="string"||!raw.text.trim()||raw.text.length>600)throw new HttpError(400,"Question text must be 1–600 characters.");
 const position=modality==="writing"?Number(raw.characterOffset):Number(raw.timestamp);
 if(!Number.isFinite(position))throw new HttpError(400,"Question position required.");
 return modality==="writing"?{text:raw.text.trim(),characterOffset:position}:{text:raw.text.trim(),timestamp:position};
}
export function readAnswerItem(raw:Record<string,unknown>,modality:DebateModality):AnchoredAnswer{
 if(typeof raw.questionId!=="string")throw new HttpError(400,"Answer question ID required.");
 const position=modality==="writing"?Number(raw.characterOffset):Number(raw.timestamp);
 if(!Number.isFinite(position))throw new HttpError(400,"Answer position required.");
 return {...(modality==="writing"?{characterOffset:position}:{timestamp:position}),questionId:raw.questionId,explanation:typeof raw.explanation==="string"?raw.explanation.slice(0,1200):undefined};
}

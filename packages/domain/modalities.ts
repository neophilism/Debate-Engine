export const ALL_MODALITIES = ["video","audio","writing"] as const;
export type DebateModality = typeof ALL_MODALITIES[number];
export type SourcePointer={timestampSeconds:number}|{characterOffset:number};
export const DEFAULT_MODALITIES:readonly DebateModality[]=["video"];
export function parseModalities(raw:unknown):DebateModality[]{
 if(raw===undefined||raw===null)return ["video"];
 if(!Array.isArray(raw)||raw.length===0||raw.length>3||
  raw.some(x=>typeof x!=="string"||!ALL_MODALITIES.includes(x as DebateModality))||
  new Set(raw).size!==raw.length)throw Error("Select one or more unique, supported debate media.");
 return [...raw] as DebateModality[];
}
export function parseSourcePointer(raw:unknown,modality:DebateModality):SourcePointer{
 if(!raw||typeof raw!=="object")throw Error("A source position is required.");
 const x=raw as Record<string,unknown>;
 if(modality==="writing"){
  if(!Number.isSafeInteger(x.characterOffset)||Number(x.characterOffset)<0||Number(x.characterOffset)>100000)
   throw Error("A valid written character offset is required.");
  return {characterOffset:Number(x.characterOffset)};
 }
 if(!Number.isFinite(x.timestampSeconds)||Number(x.timestampSeconds)<0)
  throw Error("A nonnegative audio or video timestamp is required.");
 return {timestampSeconds:Number(x.timestampSeconds)};
}
export function writtenWordCount(content:string){
 return (content.trim().match(/\S+/gu)||[]).length;
}
/** Approximately 150 speaking words per minute, exposed as a debate rule. */
export function equitableWritingWordLimit(maxResponseSeconds:number){
 if(!Number.isSafeInteger(maxResponseSeconds)||maxResponseSeconds<=0)throw Error("Invalid reciprocal response duration.");
 return Math.ceil(maxResponseSeconds*150/60);
}
export function formatProblems(input:{modality:DebateModality; allowed:readonly DebateModality[];durationSeconds:number|null;maxResponseSeconds:number;writtenContent?:string|null;firstResponse:boolean;questionCount:number}):string[]{
 const r:string[]=[];
 if(!input.allowed.includes(input.modality))r.push("This medium is not permitted in this debate.");
 if(input.questionCount>3)r.push("Contribution asks more than three questions.");
 if(input.firstResponse&&input.questionCount===0)r.push("The responder did not pose a reciprocal question.");
 if(input.modality==="writing"){
  const words=writtenWordCount(input.writtenContent||"");
  if(!words)r.push("Written speech is empty.");
  if(words>equitableWritingWordLimit(input.maxResponseSeconds))
   r.push("Written reply exceeds the published equivalent limit of "+equitableWritingWordLimit(input.maxResponseSeconds)+" words.");
 }else if(!Number.isFinite(input.durationSeconds)||Number(input.durationSeconds)<=0)
  r.push("Audio or video duration is unavailable.");
 else if(Number(input.durationSeconds)>input.maxResponseSeconds+0.001)
  r.push("Audio or video response exceeds the reciprocal limit of "+input.maxResponseSeconds+" seconds.");
 return r;
}

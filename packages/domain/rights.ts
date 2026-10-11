import {createHash} from "node:crypto";
/** A candidate-authorized fixed clip specification. Original source media stays immutable. */
export interface SourceClip {
  mediaAssetId:string;
  startSeconds:number;
  endSeconds:number;
}
export interface EditorialManifest {
  branchId:string;
  clips:SourceClip[];
  captions:string[];
  outputKind:"master"|"five_minutes"|"three_minutes"|"one_minute"|"thirty_seconds";
  releaseTitle:string;
}
export function validateManifest(m:EditorialManifest):string[]{
  const problems:string[]=[];
  if(!m.clips.length||m.clips.length>200)problems.push("At least one and at most 200 source clips required.");
  if(m.captions.length>100)problems.push("Too many caption elements.");
  if(!m.releaseTitle.trim()||m.releaseTitle.length>180)problems.push("A meaningful title is required.");
  for(const [i,c] of m.clips.entries()){
    if(!Number.isFinite(c.startSeconds)||!Number.isFinite(c.endSeconds)||c.startSeconds<0||c.endSeconds<=c.startSeconds)
      problems.push("Invalid source time range "+i);
    if(c.endSeconds-c.startSeconds>7200)problems.push("Single clip exceeds time limit");
  }
  if(m.captions.some(x=>x.length>500))problems.push("Caption exceeds 500 characters.");
  return problems;
}
export function exactManifestHash(m:EditorialManifest):string{
  const problems=validateManifest(m);
  if(problems.length)throw new Error(problems[0]);
  return createHash("sha256").update(JSON.stringify({
    branchId:m.branchId,
    clips:m.clips.map(x=>({mediaAssetId:x.mediaAssetId,startSeconds:x.startSeconds,endSeconds:x.endSeconds})),
    captions:m.captions,
    outputKind:m.outputKind,
    releaseTitle:m.releaseTitle.trim(),
  })).digest("hex");
}

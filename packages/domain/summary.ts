import type {EditorialManifest} from "./rights.ts";
const maximum:Record<EditorialManifest["outputKind"],number>={
 master:1200,five_minutes:300,three_minutes:180,one_minute:60,thirty_seconds:30
};
export function summaryLength(m:EditorialManifest){
 return m.clips.reduce((n,c)=>n+c.endSeconds-c.startSeconds,0);
}
export function summaryDurationErrors(m:EditorialManifest){
 const length=summaryLength(m);
 const errors:string[]=[];
 if(!Number.isFinite(length)||length<=0)errors.push("Summary has no valid duration.");
 if(length>maximum[m.outputKind]+0.001)errors.push("Summary is longer than the selected format.");
 return errors;
}

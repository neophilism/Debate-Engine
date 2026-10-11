/** Parse conservative WebVTT cue text. No rendering markup or HTML from uploads. */
export function normalizeCaptions(raw:string){
 if(raw.length>250000)throw Error("Transcript exceeds allowed length.");
 const text=raw.replace(/\r\n?/g,"\n").trim();
 const rows=text.split("\n");
 if(!rows[0]?.trim().startsWith("WEBVTT"))throw Error("WebVTT header required.");
 const cues:{start:number;end:number;startText:string;endText:string;content:string}[]=[];
 const matchTime=(v:string)=>{
   const m=v.match(/^(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})$/);
   if(!m)return null;
   const sec=Number(m[1]||0)*3600+Number(m[2])*60+Number(m[3])+Number(m[4])/1000;
   return Number.isFinite(sec)?sec:null;
 };
 const pattern=/^((?:\d{2}:)?\d{2}:\d{2}\.\d{3}) --> ((?:\d{2}:)?\d{2}:\d{2}\.\d{3})$/;
 for(let i=1;i<rows.length;i++){
  const line=rows[i].trim();
  const range=line.match(pattern);
  if(!range)continue;
  const start=matchTime(range[1]),end=matchTime(range[2]);
  if(start===null||end===null||end<=start)throw Error("Invalid WebVTT cue timing.");
  if(cues.length>20000)throw Error("Too many captions.");
  const contentLines:string[]=[];
  while(i+1<rows.length && rows[i+1].trim()){i++;if(/<|>/.test(rows[i]))throw Error("Caption markup is not permitted.");contentLines.push(rows[i].trim());}
  if(!contentLines.length)throw Error("Empty caption cue.");
  cues.push({start,end,startText:range[1],endText:range[2],content:contentLines.join("\n")});
 }
 if(!cues.length)throw Error("At least one time-coded caption cue required.");
 const cleaned="WEBVTT\n\n"+cues.map(c=>c.startText+" --> "+c.endText+"\n"+c.content).join("\n\n")+"\n";
 return {webvtt:cleaned,searchableText:cues.map(c=>c.content).join(" "),duration:cues.at(-1)!.end};
}

import type {DebateAssistantReport} from "./private-assessment.ts";
/** Never show candidate a quotation the submitted text does not actually contain. */
function canonical(text:string){return text.normalize("NFKC").replace(/\s+/gu," ").trim().toLocaleLowerCase("en-US")}
export function groundPrivateReport(report:DebateAssistantReport,source:string):DebateAssistantReport{
 const body=canonical(source);
 const findings=report.findings.filter(f=>Boolean(canonical(f.excerpt))&&body.includes(canonical(f.excerpt)));
 const removed=report.findings.length-findings.length;
 return removed?{...report,findings,limitations:report.limitations+" "+removed+" unverified quotation(s) were omitted; inspect the full source."}:report;
}
export type FeedbackChoice="accept"|"reject"|"uncertain";
export function internalFeedbackSummary(items:readonly FeedbackChoice[],minimumGroupSize=5){
 if(!Number.isSafeInteger(minimumGroupSize)||minimumGroupSize<5)throw Error("Group threshold must protect small samples.");
 if(items.length<minimumGroupSize)return null;
 return {count:items.length,accepted:items.filter(x=>x==="accept").length,rejected:items.filter(x=>x==="reject").length,uncertain:items.filter(x=>x==="uncertain").length};
}

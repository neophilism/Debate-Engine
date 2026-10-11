/** Candidate-neutral participation rules are evaluated independently of archiving. */
export function responseFormatIssues(input:{
 durationSeconds:number;maxResponseSeconds:number;questionCount:number;firstResponse:boolean
}):string[]{
 const issues:string[]=[];
 if(!Number.isFinite(input.durationSeconds)||input.durationSeconds<=0)
  throw Error("Uploaded video requires a valid duration.");
 if(!Number.isFinite(input.maxResponseSeconds)||input.maxResponseSeconds<=0)
  throw Error("Debate requires a valid symmetrical response limit.");
 if(input.durationSeconds>input.maxResponseSeconds+0.001)
  issues.push("The response video exceeds the reciprocal duration limit of "+input.maxResponseSeconds+" seconds.");
 if(input.questionCount>3)
  issues.push("The contribution poses more than three questions.");
 if(input.firstResponse&&input.questionCount<1)
  issues.push("The contender did not pose a reciprocal question for the originator.");
 return issues;
}

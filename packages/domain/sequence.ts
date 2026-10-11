import {qualifyExchange, type Assessment as ProtocolAssessment, type ExchangeInput, type Question, type RecordedAnswer} from "./debate.ts";
export interface PublishedSubmission {id:string;branch_id:string|null;parent_submission_id:string|null;candidacy_id:string;kind:string;published_at:string}
export interface PublishedQuestion {id:string;submission_id:string;asked_by_candidacy_id:string;question_text:string}
export interface PublishedAnswer {question_id:string;submission_id:string;video_timestamp_seconds:string|number}
export interface PublishedAssessment {question_id:string;answer_submission_id:string;reviewer_candidacy_id:string;decision:string;reasoning:string;created_at:string;id:string}

export function branchSequence(
  originatorId:string,branchId:string,contenderId:string,
  submissions:readonly PublishedSubmission[],questions:readonly PublishedQuestion[],
  answers:readonly PublishedAnswer[],assessments:readonly PublishedAssessment[]
) {
 const opening=submissions.find(s=>s.kind==="opening");
 if(!opening)return {state:"unavailable",qualifyingSubmissionIds:[],exchanges:[]};
 const qualifyingSubmissionIds=[opening.id];
 const exchanges:Array<{responseId:string;originatorReplyId:string|null;state:string;reason:string}>= [];
 let current=opening;
 // One canonical continuation per predecessor per branch. A failed exchange stops qualification,
 // but all later submissions remain visible in the independent public record.
 for(let i=0;i<100;i++){
   const response=submissions.find(s=>s.branch_id===branchId&&s.parent_submission_id===current.id&&s.candidacy_id===contenderId);
   if(!response)break;
   const reply=submissions.find(s=>s.branch_id===branchId&&s.parent_submission_id===response.id&&s.candidacy_id===originatorId);
   const initialQuestions:Question[]=questions.filter(q=>q.submission_id===current.id).map(q=>({id:q.id,askedBy:q.asked_by_candidacy_id,text:q.question_text}));
   const reciprocal:Question[]=questions.filter(q=>q.submission_id===response.id).map(q=>({id:q.id,askedBy:q.asked_by_candidacy_id,text:q.question_text}));
   const toAnswers = (id: string): RecordedAnswer[] => answers.filter(a=>a.submission_id===id).map(a=>({questionId:a.question_id,candidateId:id===response.id?contenderId:originatorId,videoTimestampSeconds:Number(a.video_timestamp_seconds)}));
   function latestReview(qid:string,sid:string,reviewerId:string):ProtocolAssessment|undefined{
     const matching=assessments.filter(a=>a.question_id===qid&&a.answer_submission_id===sid&&a.reviewer_candidacy_id===reviewerId).sort((a,b)=>a.created_at===b.created_at?a.id.localeCompare(b.id):a.created_at.localeCompare(b.created_at));
     const last=matching.at(-1);return last?{questionId:qid,reviewerId,decision:last.decision==="answered"?"answered":"unanswered",explanation:last.reasoning}:undefined;
   }
   const reviews=[...initialQuestions.map(q=>latestReview(q.id,response.id,originatorId)),...(reply?reciprocal.map(q=>latestReview(q.id,reply.id,contenderId)):[])].filter((a):a is ProtocolAssessment=>Boolean(a));
   const input:ExchangeInput={originatorId,responderId:contenderId,initialQuestions,responderQuestions:reciprocal,responderAnswers:toAnswers(response.id),originatorAnswers:reply?toAnswers(reply.id):[],assessments:reviews};
   const assessed=qualifyExchange(input);
   const state=reply?assessed.state:(assessed.state==="footnoted"||assessed.state==="awaiting_originator_assessment")?assessed.state:"awaiting_originator_answer";
   const reason=reply?assessed.reason:"A reciprocal originator reply is not yet published.";
   exchanges.push({responseId:response.id,originatorReplyId:reply?.id||null,state,reason});
   if(!reply||!assessed.eligible)break;
   qualifyingSubmissionIds.push(response.id,reply.id);
   current=reply;
 }
 return {state:exchanges.every(x=>x.state==="qualified")?"qualified_up_to_date":"pending_or_disputed",qualifyingSubmissionIds,exchanges};
}

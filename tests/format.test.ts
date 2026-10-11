import test from "node:test";
import assert from "node:assert/strict";
import {responseFormatIssues} from "../packages/domain/format.ts";
import {branchSequence} from "../packages/domain/sequence.ts";
test("overlong safe video is footnoted rather than automatically banned from public record",()=>{
 const issues=responseFormatIssues({durationSeconds:310,maxResponseSeconds:300,questionCount:1,firstResponse:true});
 assert.equal(issues.length,1);
 assert.match(issues[0],/duration limit/);
});
test("no reciprocal question marks first response outside qualifying sequence",()=>{
 const issues=responseFormatIssues({durationSeconds:200,maxResponseSeconds:300,questionCount:0,firstResponse:true});
 assert.match(issues.join(" "),/reciprocal question/);
 assert.deepEqual(responseFormatIssues({durationSeconds:200,maxResponseSeconds:300,questionCount:0,firstResponse:false}),[]);
});
test("even a favorable assessment cannot add a format-noncompliant response to the official sequence",()=>{
 const submissions=[
  {id:"a",branch_id:null,parent_submission_id:null,candidacy_id:"A",kind:"opening",published_at:"2026-10-11"},
  {id:"b",branch_id:"branch",parent_submission_id:"a",candidacy_id:"B",kind:"response",published_at:"2026-10-11",format_issues:["Video too long"]},
  {id:"c",branch_id:"branch",parent_submission_id:"b",candidacy_id:"A",kind:"reply",published_at:"2026-10-11"}
 ];
 const questions=[{id:"q",submission_id:"a",asked_by_candidacy_id:"A",question_text:"Why?"},{id:"r",submission_id:"b",asked_by_candidacy_id:"B",question_text:"How?"}];
 const answers=[{question_id:"q",submission_id:"b",video_timestamp_seconds:5},{question_id:"r",submission_id:"c",video_timestamp_seconds:5}];
 const assessments=[{id:"1",question_id:"q",answer_submission_id:"b",reviewer_candidacy_id:"A",decision:"answered",reasoning:"fine",created_at:"2026-10-11"},
 {id:"2",question_id:"r",answer_submission_id:"c",reviewer_candidacy_id:"B",decision:"answered",reasoning:"fine",created_at:"2026-10-11"}];
 const result=branchSequence("A","branch","B",submissions,questions,answers,assessments);
 assert.deepEqual(result.qualifyingSubmissionIds,["a"]);
 assert.equal(result.exchanges[0].state,"footnoted_format");
});

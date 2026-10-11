import test from "node:test";
import assert from "node:assert/strict";
import {branchSequence} from "../packages/domain/sequence.ts";
const submissions=[
 {id:"A0",branch_id:null,parent_submission_id:null,candidacy_id:"A",kind:"opening",published_at:"2026-10-10"},
 {id:"B1",branch_id:"branch",parent_submission_id:"A0",candidacy_id:"B",kind:"response",published_at:"2026-10-11"},
 {id:"A2",branch_id:"branch",parent_submission_id:"B1",candidacy_id:"A",kind:"reply",published_at:"2026-10-12"},
];
const questions=[
 {id:"Q1",submission_id:"A0",asked_by_candidacy_id:"A",question_text:"How?"},
 {id:"Q2",submission_id:"B1",asked_by_candidacy_id:"B",question_text:"Why?"},
];
const answers=[
 {question_id:"Q1",submission_id:"B1",video_timestamp_seconds:12},
 {question_id:"Q2",submission_id:"A2",video_timestamp_seconds:15},
];
const reviews=[
 {id:"r1",question_id:"Q1",answer_submission_id:"B1",reviewer_candidacy_id:"A",decision:"answered",reasoning:"Answered",created_at:"2026-10-13T10:00:00Z"},
 {id:"r2",question_id:"Q2",answer_submission_id:"A2",reviewer_candidacy_id:"B",decision:"answered",reasoning:"Answered",created_at:"2026-10-13T11:00:00Z"},
];
test("complete reciprocal exchange joins official sequence",()=>{
 const x=branchSequence("A","branch","B",submissions,questions,answers,reviews);
 assert.deepEqual(x.qualifyingSubmissionIds,["A0","B1","A2"]);
 assert.equal(x.exchanges[0].state,"qualified");
});
test("originator missing an answer cannot include challenger even if it is published",()=>{
 const x=branchSequence("A","branch","B",submissions,questions,answers.filter(a=>a.submission_id!=="A2"),reviews);
 assert.deepEqual(x.qualifyingSubmissionIds,["A0"]);
 assert.equal(x.exchanges[0].state,"awaiting_originator_answer");
});
test("questioner's later correction supersedes old assessment",()=>{
 const x=branchSequence("A","branch","B",submissions,questions,answers,[...reviews,{
  id:"r3",question_id:"Q1",answer_submission_id:"B1",reviewer_candidacy_id:"A",decision:"not_answered",reasoning:"Still not an answer",created_at:"2026-10-14T10:00:00Z"}]);
 assert.deepEqual(x.qualifyingSubmissionIds,["A0"]);
 assert.equal(x.exchanges[0].state,"footnoted");
});
test("challenge remains in public record when originator never replies",()=>{
 const x=branchSequence("A","branch","B",submissions.slice(0,2),questions,answers,reviews);
 assert.deepEqual(x.qualifyingSubmissionIds,["A0"]);
 assert.equal(x.exchanges[0].state,"awaiting_originator_answer");
});

import test from "node:test";
import assert from "node:assert/strict";
import { qualifyExchange, validateRules, mayPublishJointDerivative, type ExchangeInput } from "../packages/domain/debate.ts";

const base: ExchangeInput = {
  originatorId: "A",
  responderId: "B",
  initialQuestions: [{ id: "q1", askedBy: "A", text: "How would it work?" }],
  responderQuestions: [{ id: "q2", askedBy: "B", text: "How is it financed?" }],
  responderAnswers: [{ candidateId: "B", questionId: "q1", videoTimestampSeconds: 60 }],
  originatorAnswers: [{ candidateId: "A", questionId: "q2", videoTimestampSeconds: 31 }],
  assessments: [
    { questionId: "q1", reviewerId: "A", decision: "answered", explanation: "" },
    { questionId: "q2", reviewerId: "B", decision: "answered", explanation: "" },
  ],
};

test("A0/B1/A2 reciprocal exchange becomes eligible", () => {
  assert.equal(qualifyExchange(base).state, "qualified");
  assert.equal(qualifyExchange(base).eligible, true);
});
test("originator cannot include B without answering B's question", () => {
  const result = qualifyExchange({ ...base, originatorAnswers: [] });
  assert.equal(result.state, "awaiting_originator_answer");
  assert.equal(result.eligible, false);
});
test("a public but nonqualifying response is footnoted by the originator", () => {
  const result = qualifyExchange({ ...base, assessments: [{ questionId: "q1", reviewerId: "A", decision: "unanswered", explanation: "Did not explain implementation." }] });
  assert.equal(result.state, "footnoted");
  assert.equal(result.questionId, "q1");
});
test("missing originator assessment is not a failure finding", () => {
  assert.equal(qualifyExchange({ ...base, assessments: [] }).state, "awaiting_originator_assessment");
});
test("B can dispute whether A answered B's question", () => {
  const result = qualifyExchange({ ...base, assessments: [
    base.assessments[0],
    { questionId: "q2", reviewerId: "B", decision: "unanswered", explanation: "Financing was not explained." },
  ] });
  assert.equal(result.state, "reciprocity_disputed");
});
test("a third party cannot manufacture a qualifying assessment", () => {
  const result = qualifyExchange({ ...base, assessments: [{ questionId: "q1", reviewerId: "C", decision: "answered", explanation: "" }] });
  assert.equal(result.state, "awaiting_originator_assessment");
});
test("response without relevant answer timestamp does not qualify", () => {
  assert.equal(qualifyExchange({ ...base, responderAnswers: [] }).state, "footnoted");
});
test("separate equal rules reject zero and unlimited question counts", () => {
  assert.deepEqual(validateRules({ maxResponseSeconds: 300, replyWindowHours: 48, openingQuestionLimit: 3 }), []);
  assert.ok(validateRules({ maxResponseSeconds: 0, replyWindowHours: -2, openingQuestionLimit: 8 }).length >= 3);
});
test("jointly attributed derivative needs source permissions and both approvals", () => {
  assert.equal(mayPublishJointDerivative(["B1"], ["B1"], ["A", "B"], ["A"]), false);
  assert.equal(mayPublishJointDerivative(["B1"], ["B1"], ["A", "B"], ["A", "B"]), true);
  assert.equal(mayPublishJointDerivative(["B1"], [], ["A", "B"], ["A", "B"]), false);
});
test("originator cannot assess responder's own questions", () => {
  const changed: ExchangeInput = { ...base, assessments: [
    base.assessments[0],
    { questionId: "q2", reviewerId: "A", decision: "answered", explanation: "Self-certified" },
  ] };
  assert.equal(qualifyExchange(changed).state, "awaiting_responder_assessment");
});

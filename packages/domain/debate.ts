/**
 * Neutral, pure rules for one candidate-to-candidate asynchronous exchange.
 * Content persists independently of qualification; no delete operation exists here.
 */
export type Decision = "answered" | "unanswered";
export type ExchangeState =
  | "awaiting_originator_assessment"
  | "footnoted"
  | "awaiting_originator_answer"
  | "awaiting_responder_assessment"
  | "reciprocity_disputed"
  | "qualified";

export interface DebateRules {
  maxResponseSeconds: number;
  replyWindowHours: number | null;
  openingQuestionLimit: number;
}

export interface Question {
  id: string;
  askedBy: string;
  text: string;
}
export interface Assessment {
  questionId: string;
  reviewerId: string;
  decision: Decision;
  explanation: string;
}
export interface RecordedAnswer {
  questionId: string;
  candidateId: string;
  videoTimestampSeconds: number;
  writtenAnchor?: string;
}
export interface ExchangeInput {
  originatorId: string;
  responderId: string;
  initialQuestions: readonly Question[];
  responderQuestions: readonly Question[];
  responderAnswers: readonly RecordedAnswer[];
  originatorAnswers: readonly RecordedAnswer[];
  assessments: readonly Assessment[];
}
export interface Qualification {
  state: ExchangeState;
  eligible: boolean;
  questionId?: string;
  reason: string;
}

export function validateRules(r: DebateRules): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(r.maxResponseSeconds) || r.maxResponseSeconds <= 0) {
    errors.push("Maximum response duration must be a positive whole number of seconds.");
  }
  if (r.replyWindowHours !== null && (!Number.isInteger(r.replyWindowHours) || r.replyWindowHours <= 0)) {
    errors.push("Reply window must be null or a positive whole number of hours.");
  }
  if (!Number.isInteger(r.openingQuestionLimit) || r.openingQuestionLimit < 1 || r.openingQuestionLimit > 3) {
    errors.push("Opening question limit must be between one and three.");
  }
  return errors;
}

/** A questioner alone assesses the answer to their own question. */
function effectiveAssessment(
  assessments: readonly Assessment[],
  question: Question,
  expectedReviewer: string,
): Assessment | undefined {
  return assessments.find((a) => a.questionId === question.id && a.reviewerId === expectedReviewer);
}

function recordedAnswer(
  answers: readonly RecordedAnswer[],
  questionId: string,
  expectedCandidate: string,
): boolean {
  return answers.some(
    (a) => a.questionId === questionId &&
      a.candidateId === expectedCandidate &&
      ((Number.isFinite(a.videoTimestampSeconds) && a.videoTimestampSeconds >= 0) ||
       (typeof a.writtenAnchor === "string" && /^char:[0-9]+$/.test(a.writtenAnchor))),
  );
}

export function qualifyExchange(input: ExchangeInput): Qualification {
  const { originatorId, responderId, initialQuestions, responderQuestions, responderAnswers, originatorAnswers, assessments } = input;
  if (!originatorId || !responderId || originatorId === responderId) {
    throw new Error("An exchange requires two distinct candidate identities.");
  }
  for (const q of initialQuestions) {
    if (q.askedBy !== originatorId) throw new Error("Opening question attribution mismatch.");
    const review = effectiveAssessment(assessments, q, originatorId);
    if (!review) {
      return { state: "awaiting_originator_assessment", eligible: false, questionId: q.id, reason: "The originator has not assessed the response to this question." };
    }
    if (review.decision === "unanswered" || !recordedAnswer(responderAnswers, q.id, responderId)) {
      return { state: "footnoted", eligible: false, questionId: q.id, reason: review.explanation || "The originator considers this opening question unanswered or the response lacks an answer reference." };
    }
  }
  for (const q of responderQuestions) {
    if (q.askedBy !== responderId) throw new Error("Responder question attribution mismatch.");
    if (!recordedAnswer(originatorAnswers, q.id, originatorId)) {
      return { state: "awaiting_originator_answer", eligible: false, questionId: q.id, reason: "The originator must answer the responder's questions before qualifying use." };
    }
    const review = effectiveAssessment(assessments, q, responderId);
    if (!review) {
      return { state: "awaiting_responder_assessment", eligible: false, questionId: q.id, reason: "The responder has not assessed the originator's answer." };
    }
    if (review.decision === "unanswered") {
      return { state: "reciprocity_disputed", eligible: false, questionId: q.id, reason: review.explanation || "The responder considers this reciprocal answer inadequate." };
    }
  }
  return { state: "qualified", eligible: true, reason: "All reciprocal question-answer obligations for this exchange are satisfied." };
}

/** A source-video permission does not imply editing rights. */
export function mayPublishJointDerivative(
  sourceIds: readonly string[],
  permissionedSourceIds: readonly string[],
  candidateIds: readonly string[],
  approvingCandidateIds: readonly string[],
): boolean {
  const permissions = new Set(permissionedSourceIds);
  const approvals = new Set(approvingCandidateIds);
  return sourceIds.length > 0 && candidateIds.length >= 2 &&
    sourceIds.every((id) => permissions.has(id)) &&
    candidateIds.every((id) => approvals.has(id));
}

import test from "node:test";
import assert from "node:assert/strict";
import {mayRecoverConfirmation,CONFIRMATION_RETRY_AFTER_MS} from "../packages/domain/confirmation.ts";
const now=Date.parse("2026-10-11T21:00:00.000Z");
test("in-flight confirmation is never stolen while within its lease",()=>{
 assert.equal(mayRecoverConfirmation(new Date(now-1000),now),false);
 assert.equal(mayRecoverConfirmation(new Date(now-CONFIRMATION_RETRY_AFTER_MS+1),now),false);
 assert.equal(mayRecoverConfirmation(new Date(now+10000),now),false);
});
test("abandoned confirming state can be reclaimed only after recovery window",()=>{
 assert.equal(mayRecoverConfirmation(new Date(now-CONFIRMATION_RETRY_AFTER_MS),now),true);
 assert.equal(mayRecoverConfirmation(new Date(now-60*60*1000),now),true);
 assert.equal(mayRecoverConfirmation("invalid",now),false);
});

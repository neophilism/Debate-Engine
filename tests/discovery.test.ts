import test from "node:test";
import assert from "node:assert/strict";
import {parseDebateFilters,debateFilterUrl} from "../packages/domain/discovery.ts";
test("default and filtered discovery accept safe office, UUID and plain search",()=>{
 assert.deepEqual(parseDebateFilters(new URLSearchParams()),{office:undefined,election:undefined,q:undefined,cursor:undefined});
 assert.deepEqual(parseDebateFilters(new URLSearchParams("office=us-senate&election=123e4567-e89b-42d3-a456-426614174000&q=renewable+power")),{office:"us-senate",election:"123e4567-e89b-42d3-a456-426614174000",q:"renewable power",cursor:undefined});
});
test("invalid filters are refused, not silently ignored",()=>{
 for(const [key,value] of [["office","us senate"],["office","a".repeat(101)],["election","1 OR 1=1"],["q","x".repeat(161)],["cursor","!"]])
  assert.throws(()=>parseDebateFilters(new URLSearchParams({[key]:value})));
});
test("discovery link preserves filters without HTML markup",()=>{
 const link=debateFilterUrl({office:"president",q:"jobs & industry",cursor:"abc"});
 assert.equal(link,"/debates?office=president&q=jobs+%26+industry&cursor=abc");
});

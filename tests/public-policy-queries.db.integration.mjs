import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import pg from "pg";

// Actual SQL strings from the production read handlers, planned by migrated
// PostgreSQL. Do not merely duplicate a corrected query in a fixture: that
// would let the production handler regress without breaking this test.
if(!process.env.DATABASE_URL)throw Error("Requires disposable CI PostgreSQL.");
const placeholder="00000000-0000-4000-8000-000000000000";
const cases=[
 {path:"lib/server/public-debates.ts",
  expression:/database\(\)\.query\("([^"]*policy_endorsement_events[^"]*)",\[debateId\]\)/,
  context:"public debate detail"},
 {path:"app/api/branches/[id]/policies/route.ts",
  expression:/database\(\)\.query\(\`([\s\S]*?)\`,\[id\]\)/,
  context:"public policy listing"}
];
test("public debate and branch policy read queries can be planned against real migrated columns",async()=>{
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});
 await db.connect();
 try{
  const relation=await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='policy_endorsement_events'");
  assert.ok(relation.rows.some(x=>x.column_name==="candidacy_id"));
  assert.ok(!relation.rows.some(x=>x.column_name==="candidate_id"));
  for(const item of cases){
   const source=await readFile(item.path,"utf8");
   const match=source.match(item.expression);
   assert.ok(match,"Expected exact production SQL query in "+item.context);
   assert.ok(match[1].includes("policy_endorsement_events"));
   assert.ok(match[1].includes("candidacy_id"),"Read query must use candidacy_id.");
   const result=await db.query("EXPLAIN "+match[1],[placeholder]);
   assert.ok(result.rows.length>0,"PostgreSQL must successfully parse and plan "+item.context);
  }
 }finally{await db.end()}
});

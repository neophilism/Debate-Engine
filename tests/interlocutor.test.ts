import test from "node:test";
import assert from "node:assert/strict";
import {InterlocutorReadClient} from "../packages/sdk/interlocutor.ts";
test("Interlocutor read adapter requires HTTPS and rejects credentials",()=>{
 assert.throws(()=>new InterlocutorReadClient("http://example.com"));
 assert.throws(()=>new InterlocutorReadClient("https://user:pass@example.com/"));
 assert.throws(()=>new InterlocutorReadClient("https://example.com/path"));
});
test("public embed URL only accepts stable UUIDs",()=>{
 const x=new InterlocutorReadClient("https://debates.example");
 assert.equal(x.embedUrl("00000000-0000-4000-8000-000000000000"),"https://debates.example/embed/debates/00000000-0000-4000-8000-000000000000");
 assert.throws(()=>x.embedUrl("../../private"));
});

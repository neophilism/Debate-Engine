import test from "node:test";
import assert from "node:assert/strict";
import {collectExpiredUploads} from "../scripts/cleanup-uploads.mjs";
const now=new Date("2026-10-11T15:00:00Z");
const rows=[
 {id:"a",status:"uploading",expires_at:new Date("2026-10-10"),storage_key:"key-a",storage_upload_id:"upload-a"},
 {id:"b",status:"finalizing",expires_at:new Date("2026-10-10"),storage_key:"key-b",storage_upload_id:"upload-b"},
 {id:"c",status:"uploading",expires_at:new Date("2026-10-10"),storage_key:"key-c",storage_upload_id:"upload-c"}
];
function fixture(){
 const commands=[],updates=[];
 const connection={query:async(sql,args)=>{
  if(sql.startsWith("SELECT id,"))return {rows};
  if(sql.startsWith("SELECT status"))return {rowCount:1,rows:[{status:"uploading"}]};
  if(sql.startsWith("UPDATE")){updates.push(args[0]);return {rowCount:1}};
  throw Error("unexpected SQL: "+sql);
 },release:()=>{}};
 return {commands,updates,pool:{connect:async()=>connection},client:{send:async(cmd)=>{commands.push(cmd.input.UploadId)}}};
}
test("dry-run never touches storage or mutates session rows",async()=>{
 const x=fixture(),out=await collectExpiredUploads({...x,bucket:"test",dryRun:true,now});
 assert.equal(out.aborted,2);assert.equal(out.skipped,1);assert.equal(x.commands.length,0);assert.equal(x.updates.length,0);
});
test("only uploading sessions are aborted; finalizing sessions are preserved",async()=>{
 const x=fixture(),out=await collectExpiredUploads({...x,bucket:"test",now});
 assert.equal(out.aborted,2);assert.equal(out.skipped,1);
 assert.deepEqual(x.commands,["upload-a","upload-c"]);assert.deepEqual(x.updates,["a","c"]);
});

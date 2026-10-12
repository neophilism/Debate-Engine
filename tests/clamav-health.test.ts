import test from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:net";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {probeClamd} from "../packages/media/clamav.ts";
async function withPingServer(response:string,fn:(path:string)=>Promise<void>){
 const dir=await mkdtemp(join(tmpdir(),"pde-scanner-health-")),socketPath=join(dir,"daemon.sock");
 const server=createServer(client=>{
  client.once("data",chunk=>{
   assert.equal(chunk.toString("utf8"),"zPING\0");
   client.end(response+"\0");
  });
 });
 await new Promise<void>((resolve,reject)=>{
  server.once("error",reject);server.listen(socketPath,()=>resolve());
 });
 try{await fn(socketPath);}finally{
  await new Promise<void>(resolve=>server.close(()=>resolve()));
  await rm(dir,{recursive:true,force:true});
 }
}
test("genuine ClamAV PONG is accepted as liveness, not final scan acceptance",async()=>{
 await withPingServer("PONG",async path=>{
  assert.equal(await probeClamd(path),true);
 });
});
test("unexpected responses, missing socket, and nonlocal socket paths fail closed",async()=>{
 await withPingServer("ERROR",async path=>{
  assert.equal(await probeClamd(path),false);
 });
 for(const path of ["","http://example.org:3310","/tmp/not-a-real-pde-scanner.socket","/tmp/a\0b"])
  assert.equal(await probeClamd(path,150),false);
});

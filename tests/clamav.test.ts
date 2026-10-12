import test from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:net";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {scanWithClamd,ScanFailure} from "../packages/media/clamav.ts";

const source=Buffer.from("fictional binary source validation ".repeat(8));
async function withScanner(answer:string,fn:(socketPath:string)=>Promise<void>){
 const dir=await mkdtemp(join(tmpdir(),"pde-scantest-")),path=join(dir,"daemon.sock");
 const server=createServer(socket=>{
  let buffer=Buffer.alloc(0),started=false,received=Buffer.alloc(0);
  socket.on("data",chunk=>{
   buffer=Buffer.concat([buffer,chunk]);
   if(!started){
    const expected=Buffer.from("zINSTREAM\0");
    if(buffer.length<expected.length)return;
    assert.ok(buffer.subarray(0,expected.length).equals(expected));
    buffer=buffer.subarray(expected.length);started=true;
   }
   while(buffer.length>=4){
    const size=buffer.readUInt32BE(0);
    if(buffer.length<size+4)return;
    if(size===0){
     assert.ok(received.equals(source));
     socket.end(answer+"\0");
     return;
    }
    received=Buffer.concat([received,buffer.subarray(4,4+size)]);
    buffer=buffer.subarray(4+size);
   }
  });
 });
 await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(path,()=>resolve())});
 try{await fn(path)}
 finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{force:true,recursive:true})}
}
test("only a real clean INSTREAM reply clears source media",async()=>{
 await withScanner("stream: OK",async socketPath=>{
  assert.deepEqual(await scanWithClamd(source,socketPath),{scanner:"clamav",verdict:"clean"});
 });
});
test("a detected signature prevents an original from being cleared",async()=>{
 await withScanner("stream: UnitTestThreat FOUND",async socketPath=>{
  await assert.rejects(scanWithClamd(source,socketPath),e=>e instanceof ScanFailure&&e.reason==="detected");
 });
});
test("scanner protocol errors and absence must fail closed",async()=>{
 await withScanner("stream: limit ERROR",async socketPath=>{
  await assert.rejects(scanWithClamd(source,socketPath),e=>e instanceof ScanFailure&&e.reason==="unavailable");
 });
 await assert.rejects(scanWithClamd(source,""),e=>e instanceof ScanFailure&&e.reason==="unavailable");
 await assert.rejects(scanWithClamd(source,"tcp://outside.example:3310"));
});

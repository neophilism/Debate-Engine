import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {runFfmpeg,probeVideo,encodeClip,concatenateClips} from "../packages/media/render.mjs";

test("FFmpeg renders and combines a silent and voiced source without changing originals",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"pde-media-test-"));
 try{
  const silent=join(dir,"silent.mp4"),voiced=join(dir,"voice.mp4");
  await runFfmpeg(["-f","lavfi","-i","color=c=black:s=320x180:r=25","-t","3","-c:v","libx264","-pix_fmt","yuv420p",silent],45000);
  await runFfmpeg(["-f","lavfi","-i","color=c=white:s=640x360:r=24","-f","lavfi","-i","sine=frequency=440:sample_rate=48000","-t","3","-c:v","libx264","-c:a","aac","-pix_fmt","yuv420p",voiced],45000);
  const inputHash=[silent,voiced].map(()=>null);
  for(let i=0;i<2;i++)inputHash[i]=createHash("sha256").update(await readFile([silent,voiced][i])).digest("hex");
  const quiet=await probeVideo(silent),loud=await probeVideo(voiced);
  assert.ok(!quiet.streams.some(s=>s.codec_type==="audio"));
  assert.ok(loud.streams.some(s=>s.codec_type==="audio"));
  const targets=[join(dir,"segment-1.mp4"),join(dir,"segment-2.mp4")];
  await encodeClip({path:silent,hasAudio:false},{startSeconds:0,endSeconds:2.2},targets[0]);
  await encodeClip({path:voiced,hasAudio:true},{startSeconds:0.5,endSeconds:2.5},targets[1]);
  const combined=await concatenateClips(targets,dir);
  const metadata=await probeVideo(combined);
  const duration=Number(metadata.format?.duration);
  assert.ok(duration>3.5&&duration<5.4,"Combined clip duration "+duration);
  assert.ok(metadata.streams.some(s=>s.codec_type==="video"));
  assert.ok(metadata.streams.some(s=>s.codec_type==="audio"));
  for(let i=0;i<2;i++)assert.equal(createHash("sha256").update(await readFile([silent,voiced][i])).digest("hex"),inputHash[i],"Original source must remain unaltered.");
 }finally{await rm(dir,{recursive:true,force:true});}
},{timeout:180000});
test("Encoder rejects reversed or negative clips",()=>{
 assert.rejects(()=>encodeClip({path:"/invalid",hasAudio:false},{startSeconds:5,endSeconds:1},"/tmp/out.mp4"),/Invalid video clip/);
});

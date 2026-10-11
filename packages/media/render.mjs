import {spawn} from "node:child_process";
import {writeFile} from "node:fs/promises";
import {join} from "node:path";

/** Run only executable names and known fixed command arguments; never a shell. */
export async function runFfmpeg(args,timeoutMs=180000){
 await new Promise((resolve,reject)=>{
  const child=spawn("ffmpeg",["-nostdin","-hide_banner","-loglevel","error","-y",...args],{stdio:["ignore","ignore","pipe"]});
  let error="",done=false;
  const timer=setTimeout(()=>{child.kill("SIGKILL");},timeoutMs);
  child.stderr.on("data",x=>{if(error.length<5000)error+=String(x);});
  child.once("error",e=>{clearTimeout(timer);if(!done){done=true;reject(e);}});
  child.once("close",code=>{clearTimeout(timer);if(!done){done=true;code===0?resolve():reject(Error("FFmpeg failure: "+error.slice(0,500)));}});
 });
}

export async function probeVideo(path){
 return new Promise((resolve,reject)=>{
  const child=spawn("ffprobe",["-v","error","-show_streams","-show_format","-print_format","json",path],{stdio:["ignore","pipe","pipe"]});
  let output="",stderr="",done=false;
  const timer=setTimeout(()=>child.kill("SIGKILL"),30000);
  child.stdout.on("data",x=>{if(output.length<300000)output+=String(x);});
  child.stderr.on("data",x=>{if(stderr.length<1000)stderr+=String(x);});
  child.once("error",e=>{clearTimeout(timer);if(!done){done=true;reject(e);}});
  child.once("close",code=>{clearTimeout(timer);if(!done){done=true;
   if(code!==0){reject(Error("ffprobe failed: "+stderr.slice(0,150)));return;}
   try{resolve(JSON.parse(output));}catch(e){reject(e);}
  }});
 });
}
export function encodeArgs(source,clip,target){
 if(!source?.path||!Number.isFinite(clip?.startSeconds)||!Number.isFinite(clip?.endSeconds)||
  clip.startSeconds<0||clip.endSeconds<=clip.startSeconds)throw Error("Invalid video clip.");
 const duration=clip.endSeconds-clip.startSeconds;
 const args=["-ss",String(clip.startSeconds),"-i",source.path];
 if(!source.hasAudio)args.push("-f","lavfi","-i","anullsrc=channel_layout=stereo:sample_rate=48000");
 args.push("-t",String(duration),"-map","0:v:0","-map",source.hasAudio?"0:a:0":"1:a:0",
  "-c:v","libx264","-preset","veryfast","-crf","24","-pix_fmt","yuv420p",
  "-vf","scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1",
  "-r","30","-c:a","aac","-ar","48000","-ac","2","-af","apad","-movflags","+faststart",target);
 return args;
}
export async function encodeClip(source,clip,target){
 await runFfmpeg(encodeArgs(source,clip,target),120000);
 const data=await probeVideo(target);
 if(!data.streams?.some(x=>x.codec_type==="video")||!data.streams?.some(x=>x.codec_type==="audio"))
  throw Error("Normalized clip lacks video or audio tracks.");
 const length=Number(data.format?.duration);
 const requested=clip.endSeconds-clip.startSeconds;
 if(!Number.isFinite(length)||Math.abs(length-requested)>1.5)throw Error("Normalized clip duration mismatch.");
 return {target,duration:length};
}
export async function concatenateClips(paths,dir){
 if(!paths?.length||paths.length>80)throw Error("Invalid clip count.");
 const listing=join(dir,"concat.txt");
 await writeFile(listing,paths.map(p=>"file '"+p.replaceAll("'","'\\''")+"'").join("\n"),{mode:0o600});
 const output=join(dir,"summary.mp4");
 await runFfmpeg(["-f","concat","-safe","0","-i",listing,"-c","copy","-movflags","+faststart",output],180000);
 return output;
}

type Content={id:string;modality:string;written_content?:string|null;media_asset_id:string|null;candidate_name:string};
export default function SubmissionContent({item,featured=false}:{item:Content;featured?:boolean}){
 const label=item.modality==="writing"?"Written speech":item.modality==="audio"?"Audio statement":"Video statement";
 if(item.modality==="writing")
  return <article className={"published-writing"+(featured?" featured-writing":"")} aria-label={label+" by "+item.candidate_name}>
   <p className="small-label">ORIGINAL WRITTEN CONTRIBUTION</p>
   <div className="speech-body">{item.written_content||"This publication's written source is unavailable."}</div>
  </article>;
 if(!item.media_asset_id)return <p role="status">Original media not available.</p>;
 const src="/api/media/"+item.media_asset_id+"/play";
 if(item.modality==="audio")
  return <div className="published-audio"><p className="small-label">ORIGINAL AUDIO CONTRIBUTION</p>
   <audio controls preload="metadata" src={src} aria-label={label+" by "+item.candidate_name}>
    <track kind="captions" src={"/api/media/"+item.media_asset_id+"/captions"} srcLang="en" label="English captions" default/>
    Your browser does not support audio playback.
   </audio>
  </div>;
 return <video controls preload={featured?"metadata":"none"} playsInline src={src} aria-label={label+" by "+item.candidate_name}>
  <track kind="captions" src={"/api/media/"+item.media_asset_id+"/captions"} srcLang="en" label="English captions" default/>
  Your browser does not support video playback.
 </video>;
}

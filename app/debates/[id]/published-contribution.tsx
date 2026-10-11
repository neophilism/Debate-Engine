import React from "react";
export type PublishedContent={id:string;modality?:string;written_content?:string|null;media_asset_id?:string|null;candidate_name:string};
export default function PublishedContribution({submission,preload="none"}:{submission:PublishedContent;preload?:"metadata"|"none"}){
 const modality=submission.modality||"video";
 if(modality==="writing")return <article className="written-publication" aria-label={"Written contribution by "+submission.candidate_name}><p className="small-label">WRITTEN CONTRIBUTION — COMPLETE TEXT</p><div className="speech-body">{submission.written_content||"Written content unavailable."}</div></article>;
 if(!submission.media_asset_id)return <p role="status">The original media could not be located.</p>;
 if(modality==="audio")return <div className="audio-publication"><p className="small-label">UNEDITED AUDIO CONTRIBUTION</p><audio controls preload={preload} src={"/api/media/"+submission.media_asset_id+"/play"} aria-label={"Audio contribution by "+submission.candidate_name}><track kind="captions" src={"/api/media/"+submission.media_asset_id+"/captions"} srcLang="en" label="English captions"/>Audio player unavailable.</audio></div>;
 return <video controls preload={preload} playsInline src={"/api/media/"+submission.media_asset_id+"/play"} aria-label={"Video contribution by "+submission.candidate_name}><track kind="captions" src={"/api/media/"+submission.media_asset_id+"/captions"} srcLang="en" label="English captions" default/>Video player unavailable.</video>;
}

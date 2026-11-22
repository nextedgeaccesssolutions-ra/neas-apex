"use client";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useConversationControls, useConversationMode } from "@elevenlabs/react";
import { Camera, Mic, PhoneOff, Radio } from "lucide-react";
import type { OrbState } from "./ApexHeroOrb";
const STATE_LABEL: Record<OrbState,string> = { idle:"STANDBY", listening:"LISTENING", thinking:"THINKING", speaking:"SPEAKING" };
export default function ApexVoiceAvatar({state,connected}:{state:OrbState;connected:boolean}) {
  const {isSpeaking}=useConversationMode();
  const {getOutputVolume}=useConversationControls();
  const [outputLevel,setOutputLevel]=useState(0);
  const [photoPreview,setPhotoPreview]=useState("");
  const [photoName,setPhotoName]=useState("");
  const [photoError,setPhotoError]=useState("");
  const fileInput=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    if(!isSpeaking){setOutputLevel(0);return;}
    const timer=window.setInterval(()=>{try{const level=getOutputVolume();setOutputLevel(Math.max(0,Math.min(1,Number.isFinite(level)?level:0)));}catch{setOutputLevel(0);}},70);
    return ()=>window.clearInterval(timer);
  },[getOutputVolume,isSpeaking]);
  useEffect(()=>()=>{if(photoPreview)URL.revokeObjectURL(photoPreview);},[photoPreview]);
  const startVoice=()=>window.dispatchEvent(new CustomEvent("neas-ai-start-voice"));
  const stopVoice=()=>window.dispatchEvent(new CustomEvent("neas-ai-stop-voice"));
  const choosePhoto=(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.currentTarget.files?.[0];event.currentTarget.value="";if(!file)return;
    if(!file.type.startsWith("image/")){setPhotoError("Select an image file.");return;}
    if(file.size>10*1024*1024){setPhotoError("Image must be 10 MB or smaller.");return;}
    setPhotoError("");setPhotoName(file.name);setPhotoPreview(URL.createObjectURL(file));
    window.dispatchEvent(new CustomEvent("neas-ai-photo-selected",{detail:file}));
  };
  const mouthScale=0.72+outputLevel*2.1;
  return <div className="neas-avatar-console" data-state={state} aria-label="NEAS AI holographic voice assistant">
    <div className="neas-avatar-portrait" aria-hidden="true"><div className="neas-avatar-halo"/>
      <svg viewBox="0 0 240 260" className="neas-avatar-face">
        <defs>
          <linearGradient id="neas-avatar-face-fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--neas-avatar-light)" stopOpacity=".9"/><stop offset=".48" stopColor="var(--neas-avatar-cyan)" stopOpacity=".72"/><stop offset="1" stopColor="var(--neas-avatar-deep)" stopOpacity=".98"/></linearGradient>
          <filter id="neas-avatar-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <path d="M120 10 C69 10 43 49 43 103 L48 164 C52 211 81 238 120 246 C159 238 188 211 192 164 L197 103 C197 49 171 10 120 10Z" className="neas-avatar-outline" fill="url(#neas-avatar-face-fill)" filter="url(#neas-avatar-glow)"/>
        <path d="M62 104 Q63 44 120 35 Q177 44 178 104 L170 164 Q160 214 120 226 Q80 214 70 164Z" className="neas-avatar-inner"/>
        <path d="M46 103 Q23 95 30 133 Q34 155 54 157 M194 103 Q217 95 210 133 Q206 155 186 157" className="neas-avatar-outline-only"/>
        <path d="M78 104 Q96 88 112 104 Q96 121 78 104Z M128 104 Q144 88 162 104 Q144 121 128 104Z" className="neas-avatar-eye-frame"/>
        <ellipse className="neas-avatar-eye" cx="95" cy="104" rx="8" ry="6" filter="url(#neas-avatar-glow)"/><ellipse className="neas-avatar-eye" cx="145" cy="104" rx="8" ry="6" filter="url(#neas-avatar-glow)"/>
        <path d="M120 112 L109 157 Q120 165 131 157" className="neas-avatar-detail"/><path d="M91 178 Q120 190 149 178" className="neas-avatar-detail"/>
        <g className="neas-avatar-mouth" style={{transform:`scaleY(${mouthScale})`}}><path d="M91 187 Q120 198 149 187" className="neas-avatar-mouth-line"/><path d="M101 190 Q120 195 139 190" className="neas-avatar-mouth-inner"/></g>
        <path d="M64 65 L84 55 L93 63 M176 65 L156 55 L147 63 M68 143 L84 151 M172 143 L156 151" className="neas-avatar-detail"/>
        <path d="M120 15 V43 M111 24 H129 M54 184 L74 194 M186 184 L166 194 M89 226 L95 243 M151 226 L145 243" className="neas-avatar-detail"/>
        <path d="M75 78 H91 M149 78 H165 M106 70 H134 M105 212 H135" className="neas-avatar-circuit"/><circle cx="120" cy="53" r="3" className="neas-avatar-node"/>
      </svg><div className="neas-avatar-scanline"/>
    </div>
    <div className="neas-avatar-caption"><span className="neas-avatar-live-dot"/><span>NEAS AI CORE</span><span className="neas-avatar-state">{STATE_LABEL[state]}</span></div>
    {photoPreview&&<div className="neas-avatar-photo-preview" title={photoName}><img src={photoPreview} alt="Selected image for NEAS AI analysis"/><span>{photoName}</span></div>}
    {photoError&&<div className="neas-avatar-photo-error" role="alert">{photoError}</div>}
    <div className="neas-avatar-controls">
      <button type="button" className="neas-avatar-action neas-avatar-mic" onClick={startVoice} aria-label="Start NEAS AI two-way voice conversation" title="Talk to NEAS AI">{state==="listening"?<Radio size={16}/>:<Mic size={16}/>}<span>{connected?"VOICE LIVE":"TALK"}</span></button>
      {connected&&<button type="button" className="neas-avatar-action neas-avatar-stop" onClick={stopVoice} aria-label="End NEAS AI conversation" title="End conversation"><PhoneOff size={15}/><span>END</span></button>}
      <button type="button" className="neas-avatar-action neas-avatar-photo" onClick={()=>fileInput.current?.click()} aria-label="Choose a photo for NEAS AI visual analysis" title="Share a photo"><Camera size={16}/><span>PHOTO</span></button>
      <input ref={fileInput} type="file" accept="image/*" capture="environment" hidden onChange={choosePhoto}/>
    </div>
  </div>;
}

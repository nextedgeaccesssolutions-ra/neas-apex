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
      <img src="/neas-ai-avatar.webp" alt="NEAS AI holographic face" className="neas-avatar-face-image" />
      <span className="neas-avatar-eye-glow neas-avatar-eye-left" />
      <span className="neas-avatar-eye-glow neas-avatar-eye-right" />
      <div className="neas-avatar-wave-bars" style={{ transform: `scaleY(${0.45 + outputLevel * 1.8})` }} aria-hidden="true"><span key="0" /><span key="1" /><span key="2" /><span key="3" /><span key="4" /><span key="5" /><span key="6" /><span key="7" /><span key="8" /><span key="9" /><span key="10" /><span key="11" /><span key="12" /><span key="13" /><span key="14" /></div><div className="neas-avatar-scanline"/>
    </div>
    <div className="neas-avatar-caption"><span className="neas-avatar-live-dot"/><span>NEAS AI CORE</span><span className="neas-avatar-state">{STATE_LABEL[state]}</span></div>
    {photoPreview&&<div className="neas-avatar-photo-preview" title={photoName}><img src={photoPreview} alt="Selected image for NEAS AI analysis"/><span>{photoName}</span></div>}
    {photoError&&<div className="neas-avatar-photo-error" role="alert">{photoError}</div>}
    <div className="neas-avatar-controls">
      <button type="button" className="neas-avatar-action neas-avatar-mic" onClick={startVoice} aria-label="Start NEAS AI two-way voice conversation" title="Talk to NEAS AI">{state==="listening"?<Radio size={16}/>:<Mic size={16}/>}<span>{connected?"CONNECTED":"TALK"}</span></button>
      {connected&&<button type="button" className="neas-avatar-action neas-avatar-stop" onClick={stopVoice} aria-label="End NEAS AI conversation" title="End conversation"><PhoneOff size={15}/><span>END</span></button>}
      <button type="button" className="neas-avatar-action neas-avatar-photo" onClick={()=>fileInput.current?.click()} aria-label="Choose a photo for NEAS AI visual analysis" title="Share a photo"><Camera size={16}/><span>PHOTO</span></button>
      <input ref={fileInput} type="file" accept="image/*" capture="environment" hidden onChange={choosePhoto}/>
    </div>
  </div>;
}

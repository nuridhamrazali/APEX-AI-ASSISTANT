"use client";
import {useEffect,useRef,useState} from "react";

// Browser speech detection, not an amplitude animation. No requests during silence.
export function useSpeechInput(enabled:boolean, paused:boolean, lang:string,
  onText:(text:string)=>void, onError:(message:string)=>void) {
  const [detected,setDetected]=useState(false);
  const callbacks=useRef({onText,onError});
  callbacks.current={onText,onError};
  useEffect(()=>{
    setDetected(false);
    if(!enabled || paused) return;
    const R=(window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if(!R){callbacks.current.onError("Speech detection is unavailable in this browser. Use Chrome or Edge, or type in Chat.");return;}
    let disposed=false, submitted=false, timer:ReturnType<typeof setTimeout>;
    let recognition:any;
    const start=()=>{
      if(disposed || submitted)return;
      const r=new R();recognition=r;
      r.lang=lang;r.continuous=true;r.interimResults=true;
      const active=()=>!disposed && !submitted && recognition===r;
      r.onspeechstart=()=>{if(active())setDetected(true);};
      r.onspeechend=()=>{if(active())setDetected(false);};
      r.onresult=(e:any)=>{
        if(!active())return;
        let final="";
        for(let i=e.resultIndex;i<e.results.length;i++){
          const text=e.results[i][0].transcript.trim();
          if(text)setDetected(true);
          if(e.results[i].isFinal)final+=(final?" ":"")+text;
        }
        if(final){submitted=true;setDetected(false);r.abort();callbacks.current.onText(final);}
      };
      r.onerror=(e:any)=>{
        if(!active() || e.error==="no-speech" || e.error==="aborted")return;
        disposed=true;setDetected(false);r.abort();
        callbacks.current.onError(`Microphone: ${e.error}. Check browser permissions and connection.`);
      };
      r.onend=()=>{
        if(!active())return;
        setDetected(false);
        timer=setTimeout(start,500);
      };
      try{r.start();}catch{
        disposed=true;setDetected(false);
        callbacks.current.onError("Microphone could not start. Enable speech detection again.");
      }
    };
    start();
    return ()=>{disposed=true;clearTimeout(timer);recognition?.abort();};
  },[enabled,paused,lang]);
  return enabled && !paused && detected;
}

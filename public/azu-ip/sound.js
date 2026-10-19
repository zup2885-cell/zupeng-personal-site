// A saved preference is not proof that the browser has enabled audio in this document.
export function createSiteSound(){
  let context=null,master=null,analyser=null,voice=null,enabled=true,lastAt=-Infinity;
  let intent=0,meterFrame=0,meterUntil=0,previousState='',events=0;
  try{enabled=localStorage.getItem('azu-sound')!=='off';}catch{}
  const root=document.documentElement,toggle=document.getElementById('sound-toggle');
  const hint=document.createElement('button');
  hint.type='button';hint.id='sound-unlock';hint.className='sound-unlock';
  hint.textContent='点击开启声音';hint.hidden=true;document.body.append(hint);
  const Audio=window.AudioContext||window.webkitAudioContext;
  function update(){
    const state=!Audio?'unavailable':!enabled?'off':context?.state==='running'?'ready':'waiting';
    root.dataset.sound=state;root.dataset.soundContext=context?.state||'uninitialized';
    if(toggle){
      const label=state==='ready'?'关闭音效':state==='unavailable'?'此浏览器不支持音效':'开启音效';
      toggle.setAttribute('aria-pressed',String(state==='ready'));
      toggle.setAttribute('aria-label',label);toggle.title=label;toggle.disabled=!Audio;
    }
    hint.hidden=state!=='waiting';
    if(state!==previousState){
      previousState=state;
      document.dispatchEvent(new Event('azu:sound-change'));
      if(state==='ready')document.dispatchEvent(new Event('azu:sound-ready'));
    }
  }
  function ensure(){
    if(!enabled||!Audio)return null;
    if(!context||context.state==='closed'){
      try{context=new Audio();}catch{update();return null;}
      master=context.createGain();master.gain.value=.28;
      analyser=context.createAnalyser();analyser.fftSize=256;
      master.connect(analyser);analyser.connect(context.destination);
      voice=null;lastAt=-Infinity;
      context.addEventListener('statechange',update);
    }
    return context;
  }
  // Call resume synchronously within the gesture, even if an earlier autoplay attempt is pending.
  // A blocked autoplay promise may never settle, so it must not hold up page entry.
  async function unlock(){
    const ctx=ensure();
    if(!ctx){update();return null;}
    if(ctx.state!=='running'){
      let timer;
      try{await Promise.race([ctx.resume(),new Promise(resolve=>{timer=setTimeout(resolve,450);})]);}
      catch{}finally{clearTimeout(timer);}
    }
    update();return enabled&&ctx===context&&ctx.state==='running'?ctx:null;
  }
  function stopVoice(){
    if(!voice||!context)return;
    const old=voice,now=context.currentTime;voice=null;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setTargetAtTime(0,now,.008);
    try{old.oscillator.stop(now+.035);}catch{}
  }
  // Keep a small, read-only output diagnostic for checking the real audio graph.
  // Sampling runs only while effects are playing, never as a background polling loop.
  function monitor(duration=240){
    meterUntil=Math.max(meterUntil,performance.now()+duration);
    if(meterFrame)return;
    const samples=new Float32Array(256);
    const sample=()=>{
      meterFrame=0;
      if(!analyser||document.hidden)return;
      analyser.getFloatTimeDomainData(samples);
      let peak=0;for(const value of samples)peak=Math.max(peak,Math.abs(value));
      root.dataset.soundPeak=String(Math.max(Number(root.dataset.soundPeak)||0,peak));
      if(performance.now()<meterUntil)meterFrame=requestAnimationFrame(sample);
    };
    meterFrame=requestAnimationFrame(sample);
  }
  function card(){
    if(!enabled||context?.state!=='running'||document.hidden)return;
    const now=context.currentTime;
    if(now-lastAt<.085)return;
    lastAt=now;stopVoice();
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type='sine';
    oscillator.frequency.setValueAtTime(260,now);
    oscillator.frequency.exponentialRampToValueAtTime(480,now+.055);
    oscillator.frequency.exponentialRampToValueAtTime(370,now+.15);
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(.32,now+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.17);
    oscillator.connect(gain).connect(master);
    const current={oscillator,gain};voice=current;
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();if(voice===current)voice=null;};
    oscillator.start(now);oscillator.stop(now+.18);
    root.dataset.soundEvents=String(++events);monitor();
  }
  const controls='#sound-toggle,#sound-unlock';
  const firstGesture=event=>{if(enabled&&!event.target.closest?.(controls))void unlock();};
  document.addEventListener('pointerdown',firstGesture,{capture:true,passive:true});
  document.addEventListener('keydown',firstGesture,{capture:true});
  // Click is also an activation gesture on browsers that do not unlock at pointerdown.
  document.addEventListener('click',firstGesture,{capture:true});
  const selector='.photo-trigger,.work-select,.toolbox-card,.song-art';
  document.addEventListener('pointerover',event=>{
    if(event.pointerType==='touch')return;
    const target=event.target.closest?.(selector);
    if(target&&(!event.relatedTarget||!target.contains(event.relatedTarget))){++intent;card();}
  });
  document.addEventListener('pointerout',event=>{
    const target=event.target.closest?.(selector);
    if(target&&(!event.relatedTarget||!target.contains(event.relatedTarget)))++intent;
  });
  document.addEventListener('click',async event=>{
    if(!event.target.closest?.(selector))return;
    const request=++intent;
    if(await unlock())if(request===intent)card();
  });
  function save(){try{localStorage.setItem('azu-sound',enabled?'on':'off');}catch{}}
  async function enable(){
    enabled=true;save();
    const pending=unlock();
    if(master)master.gain.setTargetAtTime(.28,context.currentTime,.015);
    if(await pending)card();
  }
  toggle?.addEventListener('click',()=>{
    // A waiting speaker is an enable action, never a mute action.
    if(!enabled||context?.state!=='running'){void enable();return;}
    enabled=false;save();++intent;stopVoice();
    if(master)master.gain.setTargetAtTime(0,context.currentTime,.015);
    update();
  });
  hint.addEventListener('click',enable);
  const recover=()=>{if(!document.hidden&&enabled)void unlock();};
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){++intent;stopVoice();cancelAnimationFrame(meterFrame);meterFrame=0;}
    else recover();
  });
  window.addEventListener('pageshow',recover);
  window.addEventListener('focus',recover);
  window.addEventListener('pagehide',()=>{++intent;stopVoice();});
  update();recover();
  return {unlock,ready:unlock,output:()=>master,card,monitor,isEnabled:()=>enabled};
}

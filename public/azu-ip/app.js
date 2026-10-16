const $ = (s) => document.querySelector(s);
// Resolves when the visitor clicks into the site (enter page), or straight away when there is none.
const entered = new Promise(resolve => {
  const root = document.documentElement, gate = document.getElementById('enter-gate');
  if (!root.classList.contains('has-gate') || !gate) { resolve(false); return; }
  const go = () => { root.classList.add('entered'); gate.setAttribute('aria-hidden', 'true'); resolve(true); };
  document.getElementById('gate-button').addEventListener('click', go, { once: true });
  addEventListener('keydown', e => { if (!root.classList.contains('entered') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(); } });
  document.getElementById('gate-button').focus({ preventScroll: true });
});
const content = await fetch('./content.json').then(r => {if(!r.ok) throw Error('Content unavailable');return r.json();});
import { setupWorld } from './world.js?v=20261015-c33';

fillPhotoFan($('#world .photo-fan'));
setupWorld();
$('#intro-lead').textContent = content.introLead;
$('#intro-detail').textContent = content.introDetail;
const modules = [{id:'home',number:'01',title:'首屏 Hero'}, ...content.chapters];
modules.forEach(item => {
  const link = document.createElement('a');
  link.href = `#${item.id}`;
  const number = document.createElement('span');
  number.textContent = item.number;
  link.append(number, document.createTextNode(item.title));
  $('#module-links').append(link);
});

// Old chapter links now arrive at the matching section in this same document.
const url = new URL(location.href);
const previousPage = url.searchParams.get('page');
// Removed modules (关于我 / 工作方法) and older anchors land on the nearest remaining section.
const aliases = {profile:'world', about:'world', method:'work', chapters:'modules'};
const legacyHash = aliases[url.hash.slice(1)];
if(modules.some(item => item.id === previousPage) || legacyHash){
  const target = legacyHash || previousPage;
  url.searchParams.delete('page');
  url.hash = target;
  history.replaceState(null, '', url);
  requestAnimationFrame(() => document.getElementById(target).scrollIntoView({behavior:'instant'}));
}
setupWorkGallery();
setupIpBoards();
setupNowPlaying();
setupContact();
setupHeadlineDrop();
setupCharacter();

function setupWorkGallery(){
  const track = $('#work-track'), previous = $('#work-prev'), next = $('#work-next');
  const update = () => {
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  };
  const move = direction => {
    const step = track.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap);
    track.scrollBy({left:direction * step, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  };
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', update, {passive:true});
  track.addEventListener('keydown', event => {
    if(event.key === 'ArrowLeft' || event.key === 'ArrowRight'){
      event.preventDefault();move(event.key === 'ArrowLeft'?-1:1);
    }
  });
  new ResizeObserver(update).observe(track);
  update();
}

function setupContact(){
  const email = content.contact?.email?.trim();
  if(!email) return;
  $('#contact-email').textContent = email;
  $('#copy-email').disabled = false;
  $('#send-email').hidden = false;
  $('#send-email').href = `mailto:${email}`;
  $('#contact-status').textContent = '';
  $('#copy-email').addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(email);
      $('#contact-status').textContent = '邮箱已复制';
    }catch{
      $('#contact-status').textContent = '暂时无法自动复制，请选中上方邮箱手动复制。';
    }
  });
}

function fillPhotoFan(gallery){
  // Photos left of centre turn the character left, right of centre turn him right.
  const photos = content.worldPhotos || [];
  const middle = (photos.length - 1) / 2;
  photos.forEach((photo, index) => {
    const card = document.createElement('li');
    card.className = 'fan-card';
    const image = document.createElement('img');
    image.src = photo.src;
    image.alt = photo.alt;
    image.width = photo.width;
    image.height = photo.height;
    image.decoding = 'async';
    image.loading = 'lazy';
    image.style.objectPosition = photo.position || 'center';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'photo-trigger';
    trigger.dataset.look = index < middle ? 'left' : index > middle ? 'right' : 'front';
    trigger.setAttribute('aria-label', photo.alt);
    trigger.append(image);
    card.append(trigger);
    gallery.append(card);
  });
}

async function setupCharacter(){
  const video=$('#character'),figure=$('.figure'),replay=$('#replay');
  const revealAll=()=>document.body.classList.add('intro-visible','scroll-visible');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let manifest,callback=null,broken=false,run=0,decodedAtStart=0,droppedAtStart=0,presented=new Set();
  video.muted=true;video.defaultMuted=true;video.loop=false;video.playbackRate=1;
  const quality=()=>video.getVideoPlaybackQuality?.()||{};
  const debug=new URLSearchParams(location.search).has('qa')?document.body.appendChild(document.createElement('pre')):null;
  if(debug){debug.id='playback-diagnostics';debug.style.cssText='position:fixed;right:10px;bottom:10px;z-index:99;background:#111;color:#fff;padding:12px;max-width:380px;font:11px monospace;white-space:pre-wrap';}
  const report=()=>{
    const q=quality();
    figure.dataset.playback=JSON.stringify({run,codec:figure.dataset.codec,time:video.currentTime,duration:video.duration,decodedTotal:q.totalVideoFrames,decodedSincePlay:(q.totalVideoFrames||0)-decodedAtStart,droppedTotal:q.droppedVideoFrames,dropped:(q.droppedVideoFrames||0)-droppedAtStart,frameCallbacks:presented.size,firstFrame:Math.min(...presented),lastFrame:Math.max(...presented),rate:video.playbackRate,loop:video.loop,ended:video.ended});
    if(debug)debug.textContent=figure.dataset.playback;
  };
  const cues=(time)=>{
    if(time>=42/24)document.body.classList.add('intro-visible');
    if(time>=84/24)document.body.classList.add('scroll-visible');
  };
  const observe=(_,frame)=>{
    presented.add(Math.round(frame.mediaTime*(manifest?.fps||48)));cues(frame.mediaTime);
    callback=video.requestVideoFrameCallback(observe);
  };
  const fallback=()=>{
    if(broken)return;broken=true;
    video.pause();if(callback!==null)video.cancelVideoFrameCallback?.(callback);
    const image=document.createElement('img');image.id='character';image.alt='阿祖的男性潮玩形象';image.width=720;image.height=1280;image.src=video.poster;
    // Replace the whole media element; never stack a poster below transparent video.
    video.replaceWith(image);figure.dataset.state='fallback';replay&&(replay.hidden=true);revealAll();
  };
  const play=async()=>{
    if(broken)return;
    video.pause();if(video.currentTime>0)video.currentTime=0;video.playbackRate=1;
    if(callback!==null)video.cancelVideoFrameCallback?.(callback);
    const q=quality();decodedAtStart=q.totalVideoFrames||0;droppedAtStart=q.droppedVideoFrames||0;presented=new Set();run++;
    if(video.requestVideoFrameCallback)callback=video.requestVideoFrameCallback(observe);
    try{await video.play();figure.dataset.state='playing';}
    catch(error){if(error.name==='NotAllowedError'){figure.dataset.state='static';revealAll();
      // autoplay was blocked: start on the visitor's first click or key anywhere on the page
      const go=()=>{removeEventListener('pointerdown',go);removeEventListener('keydown',go);play();};addEventListener('pointerdown',go);addEventListener('keydown',go);}else fallback();}
  };
  if(replay)replay.disabled=true;
  video.addEventListener('error',fallback);
  video.addEventListener('timeupdate',()=>{cues(video.currentTime);report();});
  video.addEventListener('ended',()=>{figure.dataset.state='complete';revealAll();report();if(callback!==null){video.cancelVideoFrameCallback?.(callback);callback=null;}});
  try{
    manifest=await fetch('./release.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Missing release');return r.json();});
    figure.dataset.release=manifest.release;video.poster=manifest.assets['poster.png'].path;
    // Prefer the smaller VP9 file when the browser actually decodes its alpha.
    // HEVC is probed separately for browsers that need Apple's alpha format.
    const key=await supportsVideoAlpha(manifest.assets['vp9.webm'].path)?'vp9.webm':
      await supportsVideoAlpha(manifest.assets['hevc.mov'].path)?'hevc.mov':null;
    if(!key){fallback();return;}figure.dataset.codec=key;
    figure.dataset.state='loading';
    video.addEventListener('canplay',()=>{if(replay)replay.disabled=false;if(reduced){figure.dataset.state='static';revealAll();}else entered.then(play);},{once:true});
    replay?.addEventListener('click',play);video.src=manifest.assets[key].path;video.load();
  }catch(error){console.warn('Character static fallback',error);fallback();}
  window.addEventListener('pagehide',()=>{video.pause();if(callback!==null)video.cancelVideoFrameCallback?.(callback);},{once:true});
  // Native video keeps the final decoded frame. No rewind or final-image swap.
  setTimeout(()=>{if(figure.dataset.state==='loading')revealAll();},6000);
}

async function supportsVideoAlpha(url){
  const probe=document.createElement('video');probe.muted=true;probe.playsInline=true;probe.preload='auto';
  let timeout;
  try{
    await new Promise((resolve,reject)=>{timeout=setTimeout(()=>reject(Error('Alpha probe timeout')),5000);probe.addEventListener('loadeddata',resolve,{once:true});probe.addEventListener('error',reject,{once:true});probe.src=url;probe.load();});
    // Two-pixel capability check only, not a frame renderer. Require both a transparent
    // corner and a fully opaque jacket pixel so an empty decoder cannot pass.
    const canvas=document.createElement('canvas');canvas.width=2;canvas.height=1;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    context.drawImage(probe,0,0,1,1,0,0,1,1);context.drawImage(probe,350,400,1,1,1,0,1,1);
    const pixels=context.getImageData(0,0,2,1).data;
    return pixels[3]===0&&pixels[7]===255;
  }catch{return false;}
  finally{clearTimeout(timeout);probe.pause();probe.removeAttribute('src');probe.load();}
}

// 03–05 boards: each has one looping transparent IP clip. The codec is chosen once by a real
// alpha check (VP9 alpha for Chrome/Firefox, HEVC alpha for Safari); without either, the still
// poster is shown. Clips play only while their board is on screen.
async function setupIpBoards(){
  const stages=[...document.querySelectorAll('.ip-stage[data-ip]')];
  if(!stages.length)return;
  let manifest;
  try{manifest=await fetch('./assets/ip/manifest.json').then(r=>{if(!r.ok)throw Error('IP manifest');return r.json();});}catch{return;}
  for(const stage of stages){const clip=manifest[stage.dataset.ip];if(!clip)continue;const v=stage.querySelector('video');v.poster=clip.assets.png.path;v.width=clip.size[0];v.height=clip.size[1];}
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The mouse-following frames need no video codec, so they start before the codec check.
  const arsenal=stages.find(s=>s.dataset.ip==='arsenal');
  if(arsenal&&manifest.arsenal?.gaze&&!reducedMotion)setupGaze(arsenal,manifest.arsenal);
  const sample=manifest[stages[0].dataset.ip];
  const kind=await hasAlpha(sample.assets.webm.path)?'webm':await hasAlpha(sample.assets.mov.path)?'mov':null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer=new IntersectionObserver(entries=>{
    for(const e of entries){
      const v=e.target.querySelector('video');if(!v)continue;
      if(e.isIntersecting){
        if(!v.src){v.src=manifest[e.target.dataset.ip].assets[kind].path;}
        if(e.target.dataset.ip==='music'&&!e.target.dataset.seen){e.target.dataset.seen='1';greet(v,manifest.music);}
        v.play().catch(()=>{});
      }
      else{v.pause();delete e.target.dataset.seen;}
    }
  },{rootMargin:'200px 0px'});
  // The arsenal clip is replaced by the mouse-following frames, so its loop video is not loaded.
  const gazes=s=>s.dataset.ip==='arsenal'&&manifest.arsenal?.gaze;
  if(kind&&!reduced)stages.filter(s=>!gazes(s)).forEach(s=>observer.observe(s));
}

// 04 秘密武器库: he watches the mouse the normal way — only real frames of him turning his eyes and
// head: the stretch of the clip where he looks left (source 60) → at you (80) → right (124), RIFE 2x,
// neighbouring frames blended by position. No warping. A responsive spring makes it feel like he
// is following the pointer; with nobody pointing he looks at you and glances aside now and then.
function setupGaze(stage,clip){
  const g=clip.gaze,section=stage.closest('section'),video=stage.querySelector('video');
  const P=g.poses,first=g.firstSource,last=first+(g.frames.length-1)/g.perSource;
  const images=[];let canvas,ctx,raf=null,prev=null,ready=false,inView=false;
  let p=P.front,v=0,target=P.front,pointer=false,holdUntil=0,glanceAt=0,looked=null;
  function aimAt(x){
    const r=stage.getBoundingClientRect(),b=section.getBoundingClientRect(),hx=r.left+r.width*0.5;
    // left of his face measured to the board's left edge, right of it to the right edge
    const t=Math.max(-1,Math.min(1,x<hx?(x-hx)/Math.max(80,(hx-b.left)*0.7):(x-hx)/Math.max(80,(b.right-hx)*0.7)));
    target=t<0?P.front+t*(P.front-P.left):P.front+t*(P.right-P.front);
  }
  function lookAtRow(li){looked?.classList.remove('is-looked');looked=li;li?.classList.add('is-looked');}
  function draw(){
    const q=(p-first)*g.perSource,i=Math.max(0,Math.min(images.length-1,Math.floor(q))),j=Math.min(images.length-1,i+1),w=q-i;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(w<0.02||i===j)ctx.drawImage(images[i],0,0);
    else{ // 'lighter' adds premultiplied colour and alpha: an exact blend of the two neighbours
      ctx.globalCompositeOperation='lighter';ctx.globalAlpha=1-w;ctx.drawImage(images[i],0,0);
      ctx.globalAlpha=w;ctx.drawImage(images[j],0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
    canvas.dataset.gaze=p.toFixed(1);
  }
  function tick(t){
    raf=null;if(!inView||document.hidden){prev=null;return;}
    const dt=prev===null?1/60:Math.min(0.04,(t-prev)/1000);prev=t;
    if(!pointer&&t>holdUntil&&t>glanceAt){target=P.front+(Math.random()-0.5)*(Math.random()<0.5?8:24);glanceAt=t+1800+Math.random()*2400;}
    const w0=12,z=0.85;v+=(w0*w0*(target-p)-2*z*w0*v)*dt;p+=v*dt;p=Math.max(first,Math.min(last,p));
    draw();raf=requestAnimationFrame(tick);
  }
  const run=()=>{if(ready&&inView&&raf===null)raf=requestAnimationFrame(tick);};
  section.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;pointer=true;
    if(performance.now()<holdUntil)return;
    const li=e.target.closest('.skill-rows li');lookAtRow(li);aimAt(e.clientX);
  },{passive:true});
  section.addEventListener('pointerleave',()=>{pointer=false;glanceAt=0;lookAtRow(null);});
  section.addEventListener('pointerdown',e=>{lookAtRow(e.target.closest('.skill-rows li'));aimAt(e.clientX);
    holdUntil=performance.now()+(e.pointerType==='touch'?1800:700);glanceAt=holdUntil;});
  // Frames start loading well before the board is reached, so he is ready when you arrive.
  const load=new IntersectionObserver(async entries=>{
    if(!entries.some(e=>e.isIntersecting)||images.length)return;
    load.disconnect();images.length=g.frames.length;
    await Promise.all(g.frames.map(async(name,i)=>{const im=new Image();im.src=`${g.dir}/${name}`;await im.decode();images[i]=im;}));
    canvas=document.createElement('canvas');[canvas.width,canvas.height]=clip.size;canvas.className='ip-video';
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label',video.getAttribute('aria-label'));
    ctx=canvas.getContext('2d');draw();video.pause();video.replaceWith(canvas);ready=true;run();
  },{rootMargin:'1400px 0px'});
  load.observe(section);
  new IntersectionObserver(entries=>{inView=entries[entries.length-1].isIntersecting;run();},{rootMargin:'100px 0px'}).observe(section);
  document.addEventListener('visibilitychange',run);
}

// Each time the music board comes on screen he starts from where he turns to you and smiles
// (source 118), then carries on with his own groove at normal speed.
function greet(v,clip){
  const start=()=>{v.currentTime=(118-clip.loopStartSource)/24;};
  if(v.readyState>=1)start();else v.addEventListener('loadedmetadata',start,{once:true});
}
// The now-playing card plays / pauses the song (content.json → bgm). Browsers only allow sound
// after a click, so it starts paused.
function setupNowPlaying(){
  const button=document.querySelector('.now-playing'),audio=document.getElementById('bgm'),hint=document.getElementById('now-playing-hint');
  if(!button||!audio)return;
  const bgm=content.bgm||{};
  if(bgm.title)button.querySelector('.track b').textContent=bgm.title;
  if(bgm.artist)button.querySelector('.track small').textContent=bgm.artist;
  const show=playing=>{button.setAttribute('aria-pressed',String(playing));button.setAttribute('aria-label',`${playing?'暂停':'播放'} ${bgm.artist||''}《${bgm.title||''}》`);};
  audio.addEventListener('play',()=>show(true));audio.addEventListener('pause',()=>show(false));
  const source=document.getElementById('now-playing-source');
  if(bgm.appleMusicUrl&&!bgm.src){source.href=bgm.appleMusicUrl;source.hidden=false;}
  // Own licensed file first; otherwise Apple's official 30-second preview, looked up at click time
  // (preview addresses change, the track id does not).
  async function resolve(){
    if(bgm.src)return bgm.src;
    if(!bgm.appleTrackId)return null;
    const r=await fetch(`https://itunes.apple.com/lookup?id=${bgm.appleTrackId}`).then(r=>r.json());
    return r.results?.[0]?.previewUrl||null;
  }
  button.addEventListener('click',async()=>{
    if(!audio.src){
      hint.textContent='正在载入…';
      let url=null;try{url=await resolve();}catch{}
      if(!url){hint.textContent='暂时连不上音乐，请稍后再试';return;}
      audio.src=url;
    }
    if(audio.paused){try{audio.volume=.7;await audio.play();hint.textContent='';}catch{hint.textContent='暂时无法播放，请再点一次';}}
    else audio.pause();
  });
  // Leaving the page section far behind does not stop the song; leaving the tab does.
  document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.pause();});
}
async function hasAlpha(url){
  const probe=document.createElement('video');probe.muted=true;probe.playsInline=true;probe.preload='auto';let timeout;
  try{
    await new Promise((resolve,reject)=>{timeout=setTimeout(()=>reject(Error('timeout')),5000);probe.addEventListener('loadeddata',resolve,{once:true});probe.addEventListener('error',reject,{once:true});probe.src=url;probe.load();});
    // Real alpha means the frame has both fully transparent and fully opaque pixels.
    const c=document.createElement('canvas');c.width=32;c.height=32;const x=c.getContext('2d',{willReadFrequently:true});
    x.drawImage(probe,0,0,32,32);const d=x.getImageData(0,0,32,32).data;let clear=false,solid=false;
    for(let i=3;i<d.length;i+=4){if(d[i]===0)clear=true;else if(d[i]===255)solid=true;}
    return clear&&solid;
  }catch{return false;}
  finally{clearTimeout(timeout);probe.pause();probe.removeAttribute('src');probe.load();}
}

// 01 headline. Entrance, cartoon style: each letter of SOCIAL MEDIA drops in from above the page,
// lands a little below its place with a squash and a bounce, and cracks in two along one slanted
// line that only just opens (a couple of tiny chips, a small puff). Once all are down the chunks snap
// back together and the letters hop up into place; then the profile text on the left appears.
// After that the letters play with the mouse: the one nearest the pointer is pushed taller and a
// little wider, its neighbours a little less, and they spring back when the pointer leaves.
// Sound (a crisp tap on landing, a crack and glassy chips on breaking) is made live with Web Audio. Browsers keep sound off until
// the page is clicked, so the first drop is usually silent; clicking the headline replays it.
function setupHeadlineDrop(){
  const box=document.querySelector('.hero-headline'),svg=box?.querySelector('svg'),text=svg?.querySelector('text');
  const reveal=()=>document.body.classList.add('headline-done');
  if(!text||!document.documentElement.classList.contains('js-drop')){reveal();return;}
  const ns='http://www.w3.org/2000/svg',str=text.textContent,base=Number(text.getAttribute('y'));
  const rnd=(a,b)=>a+Math.random()*(b-a),FALL=820,STEP=65,FLOOR=26;
  let running=false,audio=null,live=[];
  const el=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const k in attrs)n.setAttribute(k,attrs[k]);return n;};
  const defs=svg.querySelector('defs')||svg.insertBefore(el('defs',{}),svg.firstChild);
  const extents=()=>[...str].map((c,i)=>c===' '?null:{c,e:text.getExtentOfChar(i)}).filter(Boolean);

  // --- sound -----------------------------------------------------------------------------------
  async function soundReady(){
    if(!audio){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;audio=new C();}
    if(audio.state!=='running'){try{await Promise.race([audio.resume(),new Promise(r=>setTimeout(r,250))]);}catch{}}
    return audio.state==='running'?audio:null;
  }
  // any first click / key on the page unlocks sound for later drops
  const unlock=()=>{soundReady();removeEventListener('pointerdown',unlock);removeEventListener('keydown',unlock);};
  addEventListener('pointerdown',unlock);addEventListener('keydown',unlock);
  function noise(ctx,sec){const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*sec),ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b;}
  // everything goes through one gentle compressor so eleven overlapping hits never clip
  let bus=null;
  function out(ctx){
    if(bus&&bus.context===ctx)return bus;
    const comp=ctx.createDynamicsCompressor(),g=ctx.createGain();
    comp.threshold.value=-18;comp.ratio.value=6;comp.attack.value=0.002;comp.release.value=0.12;g.gain.value=1.2;
    comp.connect(g).connect(ctx.destination);bus=comp;return bus;
  }
  function burst(ctx,t,{type,freq,q=1,vol,len}){ // a short filtered noise hit
    const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    n.buffer=noise(ctx,len+0.02);f.type=type;f.frequency.value=freq;f.Q.value=q;
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0005,t+len);n.connect(f).connect(g).connect(out(ctx));n.start(t);n.stop(t+len+0.02);
  }
  function ping(ctx,t,{freq,vol,len,type='sine'}){ // a short ringing tone
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*0.97,t+len);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.003);g.gain.exponentialRampToValueAtTime(0.0005,t+len);
    o.connect(g).connect(out(ctx));o.start(t);o.stop(t+len+0.02);
  }
  // landing: a crisp "tok" — a bright click, a short woody ring and only a little body underneath
  function land(ctx,t,vol){
    burst(ctx,t,{type:'highpass',freq:2500,vol:vol*0.9,len:0.018});
    ping(ctx,t,{freq:rnd(1300,1700),vol:vol*0.55,len:0.07,type:'triangle'});
    ping(ctx,t,{freq:rnd(420,520),vol:vol*0.35,len:0.05});
  }
  // breaking: a sharp "crack", then a few bright glassy chips ringing out over a quarter second
  function breakSound(ctx,t,vol){
    burst(ctx,t,{type:'bandpass',freq:rnd(3000,4200),q:0.8,vol,len:0.035});
    burst(ctx,t+0.012,{type:'highpass',freq:5000,vol:vol*0.6,len:0.05});
    for(let k=0;k<5;k++){const s=t+0.02+rnd(0,0.22);
      ping(ctx,s,{freq:rnd(3200,7200),vol:vol*rnd(.18,.35),len:rnd(0.06,0.16)});
      burst(ctx,s,{type:'bandpass',freq:rnd(4000,8000),q:3,vol:vol*0.25,len:0.012});}
  }

  // --- letters: two chunks each, cut along one slanted crack ---------------------------------------
  function clearLetters(){svg.querySelectorAll('.drop-ch,.live-ch').forEach(n=>n.remove());defs.querySelectorAll('.drop-clip').forEach(n=>n.remove());live=[];}
  function build(){
    clearLetters();
    return extents().map(({c,e},i)=>{
      const x0=e.x-2,x1=e.x+e.width+2,y0=e.y-6,y1=base+10,h=y1-y0;
      const m=y0+h*rnd(.42,.58),ta=rnd(.08,.16)*h*(Math.random()<.5?-1:1);
      // one crack with a small kink in the middle, like a cartoon break
      const kx=(x0+x1)/2,ky=m+rnd(-.05,.05)*h;
      const polys=[[[x0,y0],[x1,y0],[x1,m+ta],[kx,ky],[x0,m-ta]],[[x0,m-ta],[kx,ky],[x1,m+ta],[x1,y1],[x0,y1]]];
      const g=el('g',{class:'drop-ch','aria-hidden':'true'}),pieces=polys.map((poly,k)=>{
        const id=`drop-${i}-${k}`,clip=el('clipPath',{id,class:'drop-clip',clipPathUnits:'userSpaceOnUse'});
        clip.append(el('polygon',{points:poly.map(p=>p.join(',')).join(' ')}));defs.append(clip);
        const pg=el('g',{class:'drop-piece'}),t=el('text',{x:e.x,y:base,textLength:e.width,lengthAdjust:'spacingAndGlyphs','clip-path':`url(#${id})`});
        t.textContent=c;pg.append(t);g.append(pg);return pg;
      });
      svg.append(g);return {g,pieces,e};
    });
  }
  function puff(e){
    const ground=base+FLOOR;
    for(let k=0;k<2;k++){
      const s=rnd(4,7),cx=e.x+e.width*(k?rnd(.65,.9):rnd(.1,.35)),p=el('polygon',{class:'drop-shard',points:`${cx},${ground} ${cx+s},${ground+s*0.3} ${cx+s*0.4},${ground-s*0.8}`});svg.append(p);
      const dx=(k?1:-1)*rnd(18,38),dy=rnd(-40,-22);
      p.animate([{transform:'translate(0,0)',opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(${rnd(-120,120)}deg)`,opacity:1,offset:.5},{transform:`translate(${dx*1.3}px,4px) rotate(${rnd(-200,200)}deg)`,opacity:0}],
        {duration:520,easing:'ease-out',fill:'forwards'}).finished.then(()=>p.remove());
    }
    const dust=el('ellipse',{class:'drop-dust',cx:e.x+e.width/2,cy:ground,rx:e.width*0.35,ry:6});svg.append(dust);
    dust.animate([{transform:'scale(.4,.5)',opacity:.35},{transform:'scale(1.25,1.2)',opacity:0}],{duration:450,easing:'ease-out',fill:'forwards'}).finished.then(()=>dust.remove());
  }

  async function run(withSound){
    if(running)return;running=true;
    document.body.classList.remove('headline-done');box.classList.remove('is-dropped');box.classList.add('is-dropping');
    const ctx=withSound?await soundReady():null,letters=build(),t0=ctx?ctx.currentTime+0.02:0;
    letters.forEach(({g,pieces,e},i)=>{
      const rot=rnd(4,9)*(Math.random()<.5?-1:1),delay=100+i*STEP,hit=delay+FALL*0.7;
      g.animate([
        {transform:`translate(0,-1100px)`,opacity:0,easing:'cubic-bezier(.55,0,1,.45)'},
        {offset:.05,opacity:1},
        {offset:.7,transform:`translate(0,${FLOOR}px) scale(1.18,.72)`,easing:'cubic-bezier(.2,.9,.35,1)'},
        {offset:.84,transform:`translate(0,${FLOOR-26}px) rotate(${rot*0.5}deg) scale(.92,1.1)`,easing:'cubic-bezier(.6,0,1,1)'},
        {transform:`translate(0,${FLOOR}px) rotate(${rot}deg) scale(1,1)`,opacity:1}
      ],{duration:FALL,delay,fill:'forwards'});
      // the crack opens just a hair: the top chunk slips sideways and tips a degree or two
      const slip=rnd(2,4)*(Math.random()<.5?-1:1);
      pieces[0].animate([{transform:'translate(0,0) rotate(0deg)'},{transform:`translate(${slip}px,-2px) rotate(${slip*0.5}deg)`}],
        {duration:220,delay:hit+FALL*0.14,easing:'cubic-bezier(.3,1.6,.6,1)',fill:'forwards'});
      setTimeout(()=>puff(e),hit);
      if(ctx){land(ctx,t0+hit/1000,0.75);breakSound(ctx,t0+(hit+FALL*0.14)/1000,0.6);}
    });
    const allDown=100+(letters.length-1)*STEP+FALL+350;
    setTimeout(()=>{
      const back=[];
      letters.forEach(({g,pieces},i)=>{
        const d=Math.abs(i-(letters.length-1)/2)*35;
        pieces.forEach(pg=>back.push(pg.animate([{transform:getComputedStyle(pg).transform},{transform:'translate(0,0) rotate(0deg)'}],{duration:240,delay:d,easing:'cubic-bezier(.3,1.4,.6,1)',fill:'forwards'}).finished));
        back.push(g.animate([{transform:getComputedStyle(g).transform},{transform:`translate(0,-14px) rotate(0deg) scale(.97,1.05)`,offset:.55},{transform:'translate(0,0) rotate(0deg) scale(1,1)'}],{duration:620,delay:d+160,easing:'cubic-bezier(.3,.9,.4,1.2)',fill:'forwards'}).finished);
      });
      Promise.all(back).then(()=>{box.classList.remove('is-dropping');goLive();running=false;reveal();});
    },allDown);
  }

  // --- after the entrance: one plain letter each, which the mouse can squeeze -------------------
  function goLive(){
    clearLetters();
    live=extents().map(({c,e})=>{
      const g=el('g',{class:'live-ch','aria-hidden':'true'}),t=el('text',{x:e.x,y:base,textLength:e.width,lengthAdjust:'spacingAndGlyphs'});
      t.textContent=c;g.append(t);svg.append(g);return {g,cx:e.x+e.width/2};
    });
    box.classList.add('is-live');
  }
  let frame=null,last=null;
  function squeeze(){
    frame=null;
    if(!live.length)return;
    const r=svg.getBoundingClientRect(),unit=1400/r.width;
    live.forEach(({g,cx})=>{
      let k=0;
      if(last){
        const dx=(last.x-r.left)*unit-cx,dy=Math.max(0,Math.abs((last.y-r.top)-r.height/2)-r.height*0.35);
        k=Math.exp(-(dx*dx)/(2*115*115))*Math.exp(-(dy*dy)/(2*90*90));
      }
      g.style.transform=k<0.01?'':`scale(${(1+0.14*k).toFixed(3)},${(1+0.3*k).toFixed(3)})`;
    });
  }
  const hero=box.closest('.hero')||box;
  hero.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;last={x:e.clientX,y:e.clientY};if(!frame)frame=requestAnimationFrame(squeeze);},{passive:true});
  hero.addEventListener('pointerleave',()=>{last=null;if(!frame)frame=requestAnimationFrame(squeeze);});
  addEventListener('resize',()=>{if(live.length&&!running)goLive();});

  // The enter click is a user gesture: open the sound inside it, then drop with sound.
  document.getElementById('gate-button')?.addEventListener('click',()=>{soundReady();},{once:true});
  entered.then(()=>document.fonts.ready).then(()=>run(true));
  box.style.cursor='pointer';box.title='点一下，再摔一次（有声音）';
  box.addEventListener('click',()=>run(true));
}

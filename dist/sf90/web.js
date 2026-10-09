(() => {
 'use strict';
 const intro=document.getElementById('intro'),opening=document.getElementById('opening-video'),website=document.getElementById('website');
 const gate=document.getElementById('entry-gate'),enter=document.getElementById('enter-opening'),introError=document.getElementById('intro-error');
 const evidence=document.getElementById('reference-sf90'),dialog=document.getElementById('motion-dialog'),motion=document.getElementById('motion-video');
 // Music follows the active viewing context; the opening keeps its approved sound.
 const music=document.getElementById('background-music'),videoMusic=document.getElementById('motion-music'),musicDock=document.getElementById('music-dock');
 const musicToggle=document.getElementById('music-toggle'),musicInfo=document.getElementById('music-info'),musicCredit=document.getElementById('music-credit');
 const musicTracks=[music,videoMusic],musicPreferenceKey='ferrari-sf90-music-enabled',musicVolume=.06,videoMusicVolume=.08;
 let musicEnabled=true,musicBlocked=false,siteEntered=false,musicAttempt=0,musicFade=0;
 try{musicEnabled=localStorage.getItem(musicPreferenceKey)!=='false';}catch{}
 function activeMusic(){return dialog.open?videoMusic:music;}
 function canPlayMusic(track){return siteEntered&&intro.hidden&&musicEnabled&&!document.hidden&&(evidence.paused||evidence.muted||evidence.volume===0)&&(track===videoMusic?dialog.open&&!motion.paused:!dialog.open);}
 function syncMusicControl(){
  const track=activeMusic(),inVideo=track===videoMusic,playing=!track.paused&&!musicBlocked;
  musicDock.dataset.state=playing?'playing':musicEnabled&&!musicBlocked?'paused':'off';musicDock.dataset.context=inVideo?'video':'page';
  musicToggle.setAttribute('aria-pressed',String(musicEnabled&&!musicBlocked));
  musicToggle.setAttribute('aria-label',musicEnabled&&!musicBlocked?(inVideo?'暂停视频配乐':'关闭背景音乐'):(inVideo?'播放视频配乐':'播放背景音乐'));
  musicToggle.title=(inVideo?'外观视频配乐':'背景音乐：Reverie')+' · '+(musicEnabled&&!musicBlocked?'点击暂停':'点击播放');
  document.getElementById('music-credit-page').hidden=inVideo;document.getElementById('music-credit-video').hidden=!inVideo;
 }
 function pauseMusic(){musicAttempt++;cancelAnimationFrame(musicFade);musicFade=0;musicTracks.forEach(track=>{track.pause();track.volume=0;});syncMusicControl();}
 async function syncMusic(){
  const track=activeMusic();
  if(!canPlayMusic(track)){pauseMusic();return;}
  musicTracks.filter(other=>other!==track).forEach(other=>{other.pause();other.volume=0;});
  if(!track.paused){syncMusicControl();return;}
  const current=++musicAttempt;cancelAnimationFrame(musicFade);track.volume=0;
  try{
   await track.play();
   if(current!==musicAttempt||!canPlayMusic(track)){if(!canPlayMusic(track))pauseMusic();return;}
   musicBlocked=false;syncMusicControl();
   const started=performance.now(),level=track===videoMusic?videoMusicVolume:musicVolume;
   function fade(now){
    if(current!==musicAttempt||!canPlayMusic(track))return;
    const progress=Math.min(1,(now-started)/(track===videoMusic?800:1800));track.volume=level*progress*progress*(3-2*progress);
    if(progress<1)musicFade=requestAnimationFrame(fade);else musicFade=0;
   }
   musicFade=requestAnimationFrame(fade);
  }catch{if(current===musicAttempt){musicBlocked=true;syncMusicControl();}}
 }
 function closeMusicCredit(){musicCredit.hidden=true;musicInfo.setAttribute('aria-expanded','false');}
 musicToggle.addEventListener('click',()=>{
  if(musicEnabled&&musicBlocked)musicBlocked=false;else musicEnabled=!musicEnabled;
  try{localStorage.setItem(musicPreferenceKey,String(musicEnabled));}catch{}
  syncMusicControl();void syncMusic();
 });
 musicInfo.addEventListener('click',()=>{musicCredit.hidden=!musicCredit.hidden;musicInfo.setAttribute('aria-expanded',String(!musicCredit.hidden));});
 document.addEventListener('pointerdown',event=>{if(!musicDock.contains(event.target))closeMusicCredit();});
 musicDock.addEventListener('keydown',event=>{if(event.key==='Escape'&&!musicCredit.hidden){event.stopPropagation();closeMusicCredit();musicInfo.focus();}});
 musicTracks.forEach(track=>{track.addEventListener('play',syncMusicControl);track.addEventListener('pause',syncMusicControl);});
 document.addEventListener('visibilitychange',()=>void syncMusic());
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 // Real clipped fragments converge into clean typography on the red story panel.
 const fragmentPanel=document.getElementById('ninety');
 let fragmentTimer=0,fragmentObserver;
 function resetFragments(){
  clearTimeout(fragmentTimer);fragmentPanel.classList.remove('fragments-entered','fragments-settled');
  fragmentPanel.dataset.fragmentPhase=reduced?'static':'ready';
 }
 function enterFragments(){
  if(reduced||fragmentPanel.classList.contains('fragments-entered')||!document.body.classList.contains('website-ready'))return;
  fragmentPanel.classList.add('fragments-entered');fragmentPanel.dataset.fragmentPhase='assembling';
  fragmentTimer=setTimeout(()=>{fragmentPanel.classList.add('fragments-settled');fragmentPanel.dataset.fragmentPhase='settled';},2250);
 }
 function observeFragments(){if(fragmentObserver){fragmentObserver.disconnect();fragmentObserver.observe(fragmentPanel);}}
 if(!reduced){
  const cuts=[
   'polygon(0 0,55% 0,48% 49%,0 59%)',
   'polygon(54% 0,100% 0,100% 53%,47% 50%)',
   'polygon(0 58%,49% 48%,57% 100%,0 100%)',
   'polygon(47% 48%,100% 52%,100% 100%,56% 100%)'
  ];
  const vectors=[[-28,-18,60,-9,12],[26,-13,-65,8,-14],[-22,24,-40,-7,10],[30,18,70,9,-12]];
  fragmentPanel.querySelectorAll('[data-fragment]').forEach(element=>{
   const kind=element.dataset.fragment,lines=[''];
   element.childNodes.forEach(node=>{if(node.nodeName==='BR')lines.push('');else lines[lines.length-1]+=node.textContent;});
   const readable=document.createElement('span');readable.className='fragment-readable';readable.textContent=lines.join(' ');
   const visual=document.createElement('span');visual.className='fragment-visual';visual.setAttribute('aria-hidden','true');
   lines.forEach((text,lineIndex)=>{
    const line=document.createElement('span');line.className='fragment-line';
    const groups=[];
    if(kind==='number')groups.push(text);
    else{
     const glyphs=Array.from(text),size=kind==='headline'?2:8;
     for(let i=0;i<glyphs.length;i+=size){let part=glyphs.slice(i,i+size).join('');while(/[，。！？、；：]/u.test(glyphs[i+size]||'')){part+=glyphs[i+size];i++;}groups.push(part);}
    }
    groups.forEach((text,index)=>{
     const run=document.createElement('span');run.className='fragment-run';
     const solid=document.createElement('span');solid.className='fragment-solid';solid.textContent=text;run.append(solid);
     const delay=kind==='headline'?80+lineIndex*170+index*75:kind==='body'?720+lineIndex*120+index*55:180;
     const duration=kind==='number'?1450:kind==='headline'?1350:1050;
     run.style.setProperty('--fragment-delay',`${delay}ms`);run.style.setProperty('--fragment-duration',`${duration}ms`);
     cuts.forEach((cut,piece)=>{
      const shard=document.createElement('span');shard.className='fragment-shard';shard.textContent=text;shard.style.clipPath=cut;
      const [x,y,z,rotation,ry]=vectors[(piece+index)%4],factor=kind==='body'?.5:kind==='number'?1.65:1;
      shard.style.setProperty('--fragment-x',`${x*factor}px`);shard.style.setProperty('--fragment-y',`${y*factor}px`);shard.style.setProperty('--fragment-z',`${z*factor}px`);
      shard.style.setProperty('--fragment-rotation',`${rotation}deg`);shard.style.setProperty('--fragment-ry',`${ry}deg`);shard.style.setProperty('--fragment-piece-delay',`${piece*35}ms`);run.append(shard);
     });line.append(run);
    });visual.append(line);
   });element.replaceChildren(readable,visual);
  });
  fragmentPanel.classList.add('fragments-ready');fragmentPanel.dataset.fragmentPhase='ready';
  fragmentObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(!entry.isIntersecting)resetFragments();else if(entry.intersectionRatio>=.35)enterFragments();
  }),{threshold:[0,.35],rootMargin:'-8% 0px -8% 0px'});
 }else fragmentPanel.dataset.fragmentPhase='static';
 const photos=[...document.querySelectorAll('[data-image]')];
 const motionCards=[...document.querySelectorAll('.appearance-stage,.detail-item,.history-card,.founder-photo,.horse-connection,.film-card')];
 motionCards.forEach((card,index)=>{
  card.classList.add('motion-card');
  card.dataset.motionKind=card.matches('.history-card,.founder-photo')?'archive':card.matches('.film-card')?'film':'car';
  card.style.setProperty('--motion-delay',`${index%3*360}ms`);
  const surface=document.createElement('div');surface.className='motion-surface';surface.setAttribute('aria-hidden','true');
  surface.innerHTML='<span class="racing-glint"></span><span class="racing-rail"></span>';
  card.append(surface);
 });
 const motionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('motion-active',entry.isIntersecting)),{threshold:.15});
 motionCards.forEach(card=>motionObserver.observe(card));
 if(!reduced)motionCards.forEach(card=>{
  let frame=0,lastX=0,lastY=0;
  function reset(){cancelAnimationFrame(frame);frame=0;card.classList.remove('is-engaged');['--card-rx','--card-ry'].forEach(name=>card.style.setProperty(name,'0deg'));card.style.setProperty('--card-lift','0px');}
  card.addEventListener('pointermove',event=>{
   if(event.pointerType!=='mouse'||(card.dataset.motionKind==='film'&&!evidence.paused))return;
   const box=card.getBoundingClientRect();lastX=Math.max(-.5,Math.min(.5,(event.clientX-box.left)/box.width-.5));lastY=Math.max(-.5,Math.min(.5,(event.clientY-box.top)/box.height-.5));
   card.classList.add('is-engaged');
   if(frame)return;frame=requestAnimationFrame(()=>{frame=0;const angle=card.dataset.motionKind==='archive'?5:9;card.style.setProperty('--card-rx',`${-lastY*angle}deg`);card.style.setProperty('--card-ry',`${lastX*angle}deg`);card.style.setProperty('--card-lift','-11px');card.style.setProperty('--beam-x',`${(lastX+.5)*100}%`);});
  },{passive:true});
  card.addEventListener('pointerleave',reset);
  if(card.dataset.motionKind==='film')evidence.addEventListener('play',reset);
 });
 let attempt=0,finishTimer,scrollFrame=0;
 function revealPhoto(photo,inView){photo.classList.toggle('is-inview',inView);if(inView&&document.body.classList.contains('website-ready'))photo.classList.add('is-revealed');}
 function finishOpening(){
  attempt++;opening.pause();gate.hidden=true;website.inert=false;document.body.classList.remove('opening-active');document.body.classList.add('website-ready');
  intro.dataset.mode='finishing';intro.classList.add('is-finishing');clearTimeout(finishTimer);finishTimer=setTimeout(()=>{intro.hidden=true;siteEntered=true;musicDock.hidden=false;syncMusicControl();void syncMusic();observeFragments();},450);
  photos.forEach(photo=>{const box=photo.getBoundingClientRect();revealPhoto(photo,box.bottom>0&&box.top<innerHeight);});updateScroll();
 }
 async function startOpening(){
  const current=++attempt;siteEntered=false;musicDock.hidden=true;closeMusicCredit();pauseMusic();resetFragments();clearTimeout(finishTimer);evidence.pause();motion.pause();if(dialog.open)dialog.close();
  intro.hidden=false;intro.classList.remove('is-finishing');intro.dataset.mode='starting';introError.hidden=true;gate.hidden=true;enter.textContent='进入 SF90 ↗';
  document.body.classList.add('opening-active');document.body.classList.remove('website-ready');website.inert=true;
  opening.currentTime=0;opening.defaultMuted=false;opening.muted=false;opening.volume=1;
  try{await opening.play();if(current===attempt)intro.dataset.mode='playing';}
  catch(error){
   if(current!==attempt)return;
   // Keep picture and sound together when the browser requires a first interaction.
   opening.pause();intro.dataset.mode=error.name==='NotAllowedError'?'waiting':'error';gate.hidden=false;
   if(error.name!=='NotAllowedError'){introError.hidden=false;enter.textContent='重试进场 ↗';}
  }
 }
 intro.addEventListener('click',event=>{if(event.target.closest('#skip-opening'))return;if(intro.dataset.mode==='waiting'||intro.dataset.mode==='error')startOpening();});
 intro.addEventListener('keydown',event=>{if(event.target.closest('#skip-opening')||!['Enter',' '].includes(event.key))return;if(intro.dataset.mode==='waiting'||intro.dataset.mode==='error'){event.preventDefault();startOpening();}});
 opening.addEventListener('ended',finishOpening);
 opening.addEventListener('error',()=>{intro.dataset.mode='error';introError.hidden=false;gate.hidden=false;enter.textContent='重试进场 ↗';});
 document.getElementById('skip-opening').addEventListener('click',finishOpening);
 document.querySelectorAll('[data-replay]').forEach(button=>button.addEventListener('click',startOpening));
 document.querySelector('[data-play]').addEventListener('click',async()=>{pauseMusic();motion.pause();evidence.controls=true;evidence.muted=false;try{await evidence.play();}catch{evidence.controls=true;void syncMusic();}});
 evidence.addEventListener('play',()=>evidence.parentElement.classList.add('is-playing'));evidence.addEventListener('ended',()=>evidence.parentElement.classList.remove('is-playing'));
 ['play','pause','ended','volumechange'].forEach(event=>evidence.addEventListener(event,()=>void syncMusic()));
 function syncMotionButton(){const button=document.getElementById('toggle-motion');button.textContent=motion.paused?'▶':'Ⅱ';button.setAttribute('aria-label',motion.paused?'播放外观视频':'暂停外观视频');}
 document.getElementById('open-motion').addEventListener('click',async()=>{pauseMusic();evidence.pause();dialog.showModal();dialog.append(musicDock);closeMusicCredit();musicBlocked=false;motion.currentTime=0;videoMusic.currentTime=0;motion.muted=true;syncMusicControl();try{await motion.play();}catch{}syncMotionButton();void syncMusic();});
 document.getElementById('close-motion').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{pauseMusic();document.body.insertBefore(musicDock,dialog);closeMusicCredit();musicBlocked=false;motion.pause();videoMusic.currentTime=0;syncMusicControl();void syncMusic();});
 ['play','pause','ended'].forEach(event=>motion.addEventListener(event,()=>void syncMusic()));
 document.getElementById('toggle-motion').addEventListener('click',async()=>{if(motion.paused){try{await motion.play();}catch{}}else motion.pause();syncMotionButton();});
 function count(element){if(reduced)return;const end=Number(element.dataset.count),started=performance.now();function tick(now){const p=Math.min(1,(now-started)/1250);element.textContent=(end*(1-Math.pow(1-p,3))).toFixed(1);if(p<1)requestAnimationFrame(tick);else element.textContent=end.toFixed(1);}requestAnimationFrame(tick);}
 const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.classList.add('is-visible');entry.target.querySelectorAll('[data-count]').forEach(count);observer.unobserve(entry.target);});},{threshold:.12});
 document.querySelectorAll('.reveal').forEach(element=>observer.observe(element));
 document.querySelectorAll('.detail-pair,.horse-history-grid').forEach(group=>[...group.children].forEach((item,index)=>item.style.setProperty('--reveal-delay',`${index*170}ms`)));
 const photoObserver=new IntersectionObserver(entries=>entries.forEach(entry=>revealPhoto(entry.target,entry.isIntersecting)),{threshold:.12});photos.forEach(photo=>photoObserver.observe(photo));
 const hero=document.querySelector('.hero'),visual=document.querySelector('.hero-visual'),ninety=document.getElementById('ninety');
 function updateScroll(){
  scrollFrame=0;if(reduced)return;const p=Math.min(1,Math.max(0,scrollY/(hero.offsetHeight*.65)));visual.style.setProperty('--hero-y',`${8*(1-p)}px`);visual.style.setProperty('--hero-scale',String(.965+.035*p));
  const box=ninety.getBoundingClientRect();const n=Math.max(-1,Math.min(1,(box.top-innerHeight*.2)/innerHeight));ninety.style.setProperty('--ninety-y',`${n*15}px`);
  photos.forEach(photo=>{const box=photo.getBoundingClientRect();if(box.bottom<0||box.top>innerHeight)return;const progress=Math.max(-1,Math.min(1,(box.top+box.height/2-innerHeight/2)/innerHeight));photo.style.setProperty('--scroll-drift',`${progress*-2}px`);});
 }
 function scheduleScroll(){if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll);}addEventListener('scroll',scheduleScroll,{passive:true});addEventListener('resize',scheduleScroll);
 if(!reduced)photos.forEach(photo=>{
  photo.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse')return;const box=photo.getBoundingClientRect();const x=(event.clientX-box.left)/box.width-.5,y=(event.clientY-box.top)/box.height-.5;
   photo.style.setProperty('--pointer-x',`${x*6}px`);photo.style.setProperty('--pointer-y',`${y*2}px`);photo.style.setProperty('--tilt-x',`${-y*1.4}deg`);photo.style.setProperty('--tilt-y',`${x*1.4}deg`);photo.style.setProperty('--focus-x',`${(x+.5)*100}%`);photo.style.setProperty('--focus-y',`${(y+.5)*100}%`);
  },{passive:true});
  photo.addEventListener('pointerleave',()=>{['--pointer-x','--pointer-y','--tilt-x','--tilt-y'].forEach(property=>photo.style.setProperty(property,property.includes('tilt')?'0deg':'0px'));});
 });
 fetch('images.json').then(response=>{if(!response.ok)throw new Error('图片清单未加载');return response.json();}).then(images=>{
  photos.forEach(slot=>{const entry=images[slot.dataset.image];if(!entry?.src)return;const image=new Image();image.alt=entry.alt||'';image.loading=slot.classList.contains('hero-photo')?'eager':'lazy';image.decoding='async';
   const camera=document.createElement('div');camera.className='photo-float';const stage=document.createElement('div');stage.className='image-crop';
   if(entry.crop){const c=entry.crop;image.style.width=`${c.sourceWidth/c.width*100}%`;image.style.height=`${c.sourceHeight/c.height*100}%`;image.style.left=`${-c.x/c.width*100}%`;image.style.top=`${-c.y/c.height*100}%`;}
   else{image.style.width='100%';image.style.height='100%';image.style.objectFit=entry.fit||'cover';}
   image.addEventListener('load',()=>slot.classList.add('has-image'));image.src=entry.src;stage.append(image);camera.append(stage);slot.prepend(camera);
  });
 }).catch(error=>console.warn(error.message));
 updateScroll();startOpening();
})();

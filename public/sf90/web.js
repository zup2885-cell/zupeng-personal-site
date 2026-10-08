(() => {
 'use strict';
 const intro=document.getElementById('intro'),opening=document.getElementById('opening-video'),website=document.getElementById('website');
 const gate=document.getElementById('entry-gate'),enter=document.getElementById('enter-opening'),introError=document.getElementById('intro-error');
 const evidence=document.getElementById('reference-sf90'),dialog=document.getElementById('motion-dialog'),motion=document.getElementById('motion-video');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  intro.dataset.mode='finishing';intro.classList.add('is-finishing');clearTimeout(finishTimer);finishTimer=setTimeout(()=>{intro.hidden=true;},450);
  photos.forEach(photo=>{const box=photo.getBoundingClientRect();revealPhoto(photo,box.bottom>0&&box.top<innerHeight);});updateScroll();
 }
 async function startOpening(){
  const current=++attempt;clearTimeout(finishTimer);evidence.pause();motion.pause();if(dialog.open)dialog.close();
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
 document.querySelector('[data-play]').addEventListener('click',async()=>{motion.pause();evidence.controls=true;evidence.muted=false;try{await evidence.play();}catch{evidence.controls=true;}});
 evidence.addEventListener('play',()=>evidence.parentElement.classList.add('is-playing'));evidence.addEventListener('ended',()=>evidence.parentElement.classList.remove('is-playing'));
 function syncMotionButton(){const button=document.getElementById('toggle-motion');button.textContent=motion.paused?'▶':'Ⅱ';button.setAttribute('aria-label',motion.paused?'播放外观视频':'暂停外观视频');}
 document.getElementById('open-motion').addEventListener('click',async()=>{evidence.pause();dialog.showModal();motion.currentTime=0;motion.muted=true;try{await motion.play();}catch{}syncMotionButton();});
 document.getElementById('close-motion').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>motion.pause());
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

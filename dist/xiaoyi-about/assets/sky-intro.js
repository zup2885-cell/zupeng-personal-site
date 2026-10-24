'use strict';

// Desktop hover: one reversible progress clock drives two doors, the trunk and meadow flowers.
(() => {
  const root = document.documentElement;
  const intro = document.querySelector('#sky-intro');
  if (!intro) return;
  const main = document.querySelector('main');
  const header = document.querySelector('.topbar');
  const hero = document.querySelector('#top');
  const stage = intro.querySelector('.car-intro-stage');
  const rig = intro.querySelector('.car-rig');
  const image = intro.querySelector('.car-rig-base');
  const target = intro.querySelector('.car-hover-target');
  const enter = intro.querySelector('.car-door-entry');
  const hint = intro.querySelector('.car-interaction-hint');
  const blooms = [...intro.querySelectorAll('.car-bloom')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = [];
  const DURATION = 1500;
  const bloomWindows = [[.42,.86],[.51,.96],[.53,.90],[.60,.97],[.68,1]];
  let unlocked = false;
  let finished = false, exiting = false, loadTimer = 0, endTimer = 0;
  let startedAt = 0, progress = 0, direction = 0, last = 0, frame = 0;
  let previousFocus;
  const clamp = v => Math.min(1, Math.max(0, v));
  const slice = (t,a,b) => clamp((t-a)/(b-a));
  const cubic = x => 1 - (1-x)**3;
  const bloomEase = x => 1 + 2.3*(x-1)**3 + 1.3*(x-1)**2;
  const render = () => {
    rig.style.setProperty('--front', cubic(slice(progress,0,.42)).toFixed(5));
    rig.style.setProperty('--rear', cubic(slice(progress,.12,.56)).toFixed(5));
    rig.style.setProperty('--trunk', cubic(slice(progress,.30,.74)).toFixed(5));
    blooms.forEach((flower,i) => flower.style.setProperty('--bloom', Math.max(0,bloomEase(slice(progress,...bloomWindows[i]))).toFixed(5)));
    intro.dataset.hoverProgress = progress.toFixed(5);
    // The door handle unlocks once and remains available when the car closes.
    if (!unlocked && progress >= 1) {
      unlocked = true;
      intro.dataset.entryReady = 'true';
      enter.hidden = false;
      hint.textContent = '门把手已亮起 · 上车出发';
      if (!reduced.matches) animate(enter, [{opacity:0},{opacity:1}],450);
    }
    target.setAttribute('aria-pressed', String(direction > 0 || progress >= .999));
  };
  const tick = now => {
    frame = 0;
    if (finished || exiting || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(60, now-last) : 0;
    last = now;
    progress = clamp(progress + direction*dt/DURATION);
    render();
    if ((direction>0 && progress<1) || (direction<0 && progress>0)) frame = requestAnimationFrame(tick);
    else last = 0;
  };
  const go = dir => {
    if (finished || exiting) return;
    direction = dir;
    if (reduced.matches) { progress = dir>0 ? 1 : 0; render(); return; }
    if (!frame && !document.hidden) { last = 0; frame = requestAnimationFrame(tick); }
  };
  const onVisibility = () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame=0; last=0; }
    else go(-1);
  };
  const onHash = () => { if (location.hash && location.hash!=='#top') finish('deep-link'); };
  const finish = (reason='entered') => {
    if (finished) return;
    finished = true;
    clearTimeout(loadTimer); clearTimeout(endTimer); cancelAnimationFrame(frame); frame=0;
    const shown = root.classList.contains('ticket-intro-ready');
    root.classList.remove('ticket-intro-ready');
    intro.setAttribute('aria-hidden','true');
    animations.forEach(a=>a.cancel());
    root.dataset.introState = ['deep-link','reduced-motion'].includes(reason) ? 'skipped' : 'complete';
    root.dataset.introReason = reason;
    root.dataset.introDuration = startedAt ? String(Math.round(performance.now()-startedAt)) : '0';
    main.inert = false; header.inert = false;
    if (shown) { root.classList.add('cover-revealing'); hero.classList.add('paper-arrive'); }
    if (intro.contains(document.activeElement)) {
      intro.blur();
      if (previousFocus && previousFocus!==document.body) previousFocus.focus({preventScroll:true});
    }
    document.dispatchEvent(new CustomEvent('xiaoyi:cover-enter'));
    document.removeEventListener('visibilitychange',onVisibility);
    document.removeEventListener('keydown',onKeydown,true);
    removeEventListener('hashchange',onHash);
  };
  const animate = (el,frames,duration,delay=0) => {
    const a=el.animate(frames,{duration,delay,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both',iterations:1});
    animations.push(a);return a;
  };
  const enterHome = () => {
    if (finished || exiting || !unlocked) return;
    exiting=true;cancelAnimationFrame(frame);frame=0;
    root.dataset.introState='exiting';
    if (reduced.matches || !Element.prototype.animate) { finish();return; }
    // Move the camera toward the open driver's door, then reveal the original cover.
    stage.style.transformOrigin='34% 52%';
    animate(stage,[{transform:'scale(1)',opacity:1,offset:0},{transform:'scale(1.7)',opacity:1,offset:.62},{transform:'scale(2.35)',opacity:0,offset:1}],900);
    intro.querySelectorAll('.car-intro-copy,.car-intro-note,.car-intro-actions,.car-intro-brand').forEach(el=>animate(el,[{opacity:1},{opacity:0}],260));
    animate(intro,[{opacity:1},{opacity:0}],420,480);
    endTimer=setTimeout(()=>finish(),900);
  };
  stage.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')go(1)});
  stage.addEventListener('pointerleave',()=>go(-1));
  target.addEventListener('focus',()=>go(1));
  target.addEventListener('blur',()=>go(-1));
  target.addEventListener('click',event=>{
    if(event.detail===0)go(direction>0?-1:1);
    else go(1);
  });
  enter.addEventListener('pointerenter',()=>go(1));
  enter.addEventListener('focus',()=>go(1));
  enter.addEventListener('click',enterHome);
  function onKeydown(event){
    if(finished)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish('keyboard');}
    else if(event.key==='Enter' && (event.target===intro || event.target===document.body)){event.preventDefault();if(unlocked)enterHome();else go(1);}
    else if(event.key==='Tab'){
      event.preventDefault();event.stopPropagation();
      const focused=document.activeElement;
      (focused===target && unlocked ? enter : target).focus({preventScroll:true});
    }
  }
  reduced.addEventListener('change',event=>{if(event.matches)finish('reduced-motion')});
  if(!root.classList.contains('ticket-intro-ready') || (location.hash && location.hash!=='#top')){finish('deep-link');return;}
  if(reduced.matches){finish('reduced-motion');return;}
  if(!image || !Element.prototype.animate){finish('unsupported');return;}
  previousFocus=document.activeElement;
  main.inert=true;header.inert=true;
  root.dataset.introState='loading';
  intro.dataset.phase='loading';
  intro.focus({preventScroll:true});
  document.addEventListener('visibilitychange',onVisibility);
  document.addEventListener('keydown',onKeydown,true);
  addEventListener('hashchange',onHash);
  render();
  const begin=()=>{
    clearTimeout(loadTimer);
    if(finished)return;
    if(!image.naturalWidth){finish('asset-error');return;}
    startedAt=performance.now();
    root.dataset.introState='interactive';root.dataset.introStyle='hover-doors-trunk';
    intro.dataset.phase='interactive';stage.style.opacity='1';
    animate(rig,[{opacity:0,transform:'translateY(15px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],800);
    [...intro.querySelector('.car-intro-copy').children].forEach((el,i)=>animate(el,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],650,i*90));
    intro.querySelectorAll('.car-intro-note').forEach((el,i)=>animate(el,[{opacity:0},{opacity:1}],650,350+i*80));
    window.ChartSound?.activateIfAllowed?.().catch(()=>{});
  };
  loadTimer=setTimeout(()=>finish('asset-timeout'),2500);
  if(image.complete)begin();
  else{image.addEventListener('load',begin,{once:true});image.addEventListener('error',()=>finish('asset-error'),{once:true});}
})();

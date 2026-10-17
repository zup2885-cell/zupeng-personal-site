'use strict';

(() => {
  const root = document.documentElement;
  const intro = document.querySelector('#ticket-intro');
  if (!intro) return;
  const main = document.querySelector('main');
  const header = document.querySelector('.topbar');
  const skip = intro.querySelector('.intro-skip');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sheets = [...intro.querySelectorAll('.intro-paper')];
  const image = sheets[0].querySelector('img');
  const hero = document.querySelector('#top');
  const motions = new Set();
  let finished = false;
  let timeout;
  let visibleResolve;
  const arrive = () => {
    if (reduced.matches || (location.hash && location.hash !== '#top')) return;
    root.classList.add('cover-revealing');
    hero.classList.add('paper-arrive');
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    visibleResolve?.(); visibleResolve = null;
    motions.forEach(motion => motion.cancel()); motions.clear();
    if (root.classList.contains('ticket-intro-ready')) arrive();
    root.classList.remove('ticket-intro-ready');
    intro.setAttribute('aria-hidden','true');
    intro.removeAttribute('aria-busy');
    intro.dataset.phase = 'complete';
    root.dataset.introState = 'complete';
    main.inert = false; header.inert = false;
    if (document.activeElement === skip) header.querySelector('a')?.focus({preventScroll:true});
  };
  const whenVisible = () => document.hidden ? new Promise(resolve => { visibleResolve = resolve; }) : Promise.resolve();
  const unfold = async () => {
    await whenVisible();
    if (finished) return;
    intro.dataset.phase = 'pulling';
    root.dataset.introState = 'pulling';
    intro.setAttribute('aria-busy','true');
    // Never wait on an audio permission promise before automatic paper motion.
    root.dataset.introStartedAt = performance.now().toFixed(0);
    // Each stack layer (three bands) is drawn out like one tissue: it lifts off the stack with a
    // shadow and a slight 3D bend, then whips away. Layers overlap to keep the opening short.
    const layerGap = 115, bandGap = 24, pullTime = 380;
    const layers = [];
    for (let index=0;index<sheets.length;index+=3) layers.push(sheets.slice(index,index+3));
    const pulls = layers.map((bands,layer) => new Promise(resolve => {
      setTimeout(async () => {
        if (finished) { resolve(); return; }
        await whenVisible();
        if (finished) { resolve(); return; }
        root.dataset.introSheet = String(layer+1);
        root.dataset.introDirection = layer%2 ? 'right' : 'left';
        if (layer === layers.length-1) arrive();
        if (window.ChartSound?.tissuePull) window.ChartSound.tissuePull(layer,pullTime+bandGap*2);
        else window.ChartSound?.paperPull(layer,0,pullTime);
        const direction = layer%2 ? 1 : -1;
        Promise.all(bands.map(async (sheet,band) => {
          const x = parseFloat(sheet.style.getPropertyValue('--stack-x')) || 0;
          const y = parseFloat(sheet.style.getPropertyValue('--stack-y')) || 0;
          const a = parseFloat(sheet.style.getPropertyValue('--stack-angle')) || 0;
          const destination = `perspective(1400px) translate3d(${direction*135}%,${-direction*(10+band*2.5)}%,0) rotate(${direction*(4+band*1.5)}deg) rotateY(${-direction*24}deg) scale(1.05)`;
          const motion = sheet.animate([
            {transform:`perspective(1400px) translate3d(${x}%,${y}%,0) rotate(${a}deg) rotateY(0deg) scale(1)`,easing:'cubic-bezier(.3,0,.4,1)'},
            {transform:`perspective(1400px) translate3d(${x+direction*4}%,${y-.7}%,0) rotate(${a+direction}deg) rotateY(${-direction*11}deg) scale(1.025)`,offset:.26,easing:'cubic-bezier(.55,0,.75,.4)'},
            {transform:destination}
          ],{duration:pullTime,delay:band*bandGap,fill:'forwards'});
          motions.add(motion);
          try { await motion.finished; } catch { return; }
          motions.delete(motion);
          sheet.style.transform = destination;
          sheet.style.visibility = 'hidden';
          motion.cancel();
        })).then(resolve);
      },layer*layerGap);
    }));
    await Promise.all(pulls);
    if (finished) return;
    root.dataset.introDuration = (performance.now()-Number(root.dataset.introStartedAt)).toFixed(0);
    finish();
  };
  const begin = async () => {
    if (finished) return;
    // Preload the exact reference composition before pulling its sheets apart.
    if (!image.complete) await new Promise(resolve => {
      image.addEventListener('load',resolve,{once:true});
      image.addEventListener('error',resolve,{once:true});
      timeout = setTimeout(resolve,1200);
    });
    clearTimeout(timeout);
    if (finished) return;
    if (!image.naturalWidth) { finish(); return; }
    // Give every sheet its lift shadow now, so it is rasterised once during the hold and the
    // pulls themselves only animate transforms on the compositor.
    sheets.forEach(sheet => { sheet.style.filter = 'drop-shadow(0 14px 20px rgba(45,4,0,.42))'; });
    // Pull with sound right away when the browser allows audio. If it blocks autoplay, hold the
    // stack with a prompt: the first touch unlocks audio and starts the pull, so they always match.
    await whenVisible();
    if (finished) return;
    const audible = await (window.ChartSound?.activateIfAllowed() ?? Promise.resolve(true));
    if (finished) return;
    if (audible) { timeout = setTimeout(unfold,80); return; }
    intro.dataset.phase = 'waiting';
    const start = event => {
      if (event.target.closest?.('.intro-skip')) return;
      if (event.type === 'keydown' && ['Tab','Escape'].includes(event.key)) return;
      intro.removeEventListener('pointerdown',start);
      intro.removeEventListener('keydown',start);
      window.ChartSound?.unlock(true).then(() => { if (!finished) unfold(); });
    };
    intro.addEventListener('pointerdown',start);
    intro.addEventListener('keydown',start);
    intro.focus({preventScroll:true});
  };
  skip.addEventListener('click',finish);
  intro.addEventListener('keydown',event => {
    if (event.key === 'Escape') { event.preventDefault(); finish(); }
    if (event.key === 'Tab') { event.preventDefault(); skip.focus({preventScroll:true}); }
  });
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) motions.forEach(motion => motion.pause());
    else {
      visibleResolve?.(); visibleResolve = null;
      motions.forEach(motion => { if (motion.playState === 'paused') motion.play(); });
    }
  });
  reduced.addEventListener('change',event => { if (event.matches) finish(); });
  window.addEventListener('hashchange',() => { if (location.hash && location.hash !== '#top') finish(); });
  if (root.classList.contains('ticket-intro-ready') && !reduced.matches) {
    root.dataset.introState = 'ready';
    main.inert = true; header.inert = true;
    begin();
  } else {
    finish();
    root.dataset.introState = 'skipped';
  }
})();

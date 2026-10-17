'use strict';

(() => {
  const main = document.querySelector('#main');
  const cover = document.querySelector('#top');
  const cards = Array.from(main?.querySelectorAll(':scope>.section') || []);
  if (!main || !cover || !cards.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const anchors = new Map();
  const metrics = new Map();
  const rail = document.createElement('nav');
  rail.className = 'scene-rail';
  rail.setAttribute('aria-label','板块导航');
  const links = [];
  const topLinks = Array.from(document.querySelectorAll('.topbar nav a'));
  const clamp = value => Math.min(1, Math.max(0, value));
  let frame = 0;
  let needsMeasure = true;
  let userMoved = false;
  let navigationSerial = 0;

  cards.forEach((card, index) => {
    const anchor = document.createElement('div');
    anchor.className = 'scene-anchor';
    anchor.setAttribute('aria-hidden','true');
    card.before(anchor);
    anchors.set(card, anchor);
    card.classList.add('scene-card');
    card.style.zIndex = String(index + 2);
    const pixels = document.createElement('span');
    pixels.className = 'scene-pixels';
    pixels.setAttribute('aria-hidden','true');
    const squares = Array.from({length:50}, (_, position) => {
      const seed = (position * 29 + index * 11) % 23;
      const size = 5 + seed % 7;
      const x = position * 20 + seed % 9;
      const y = 16 + seed % 18;
      return `<rect x="${x}" y="${y}" width="${size}" height="${size}" opacity="${.4 + seed % 5 * .12}"/>`;
    }).join('');
    pixels.innerHTML = `<svg viewBox="0 0 1000 42" preserveAspectRatio="none">${squares}</svg>`;
    card.append(pixels);
    const link = document.createElement('a');
    link.href = `#${card.id}`;
    const label = document.querySelector(`.topbar nav a[href="#${card.id}"]`)?.textContent || card.id;
    const number = document.createElement('span');
    number.textContent = String(index + 1).padStart(2,'0');
    link.append(number, document.createTextNode(label));
    rail.append(link);
    links.push(link);
  });
  document.body.append(rail);
  document.documentElement.classList.add('scene-ready');

  const measure = () => {
    const coverEnd = cover.offsetTop + cover.offsetHeight;
    main.style.setProperty('--cover-end', `${coverEnd}px`);
    const gap = innerWidth <= 760 ? 90 : 110;
    cards.forEach(card => {
      const height = card.offsetHeight;
      const top = Math.min(gap, innerHeight - height - 38);
      card.style.setProperty('--scene-top', `${top}px`);
      metrics.set(card, {height, top});
    });
    needsMeasure = false;
  };
  const update = () => {
    frame = 0;
    if (needsMeasure) measure();
    const editing = document.documentElement.classList.contains('page-editing');
    const tops = cards.map(card => anchors.get(card).getBoundingClientRect().bottom);
    const inContent = cover.getBoundingClientRect().bottom < innerHeight * .8;
    document.body.classList.toggle('scene-content',inContent);
    let active = 0;
    tops.forEach((top,index) => { if (top <= innerHeight * .38) active = index; });
    cards.forEach((card,index) => {
      const {height} = metrics.get(card);
      const enter = clamp((innerHeight - tops[index]) / (innerHeight * .7));
      const nextTop = tops[index + 1] ?? Infinity;
      const behind = clamp((innerHeight * .94 - nextTop) / (innerHeight * .72));
      const narrow = innerWidth <= 760;
      const tilt = Math.min(narrow ? 2.2 : 5.5, 3600 / height);
      const direction = index % 2 ? -1 : 1;
      const rotation = reduced.matches || editing ? 0 : direction * (tilt * (1 - enter) - tilt * behind);
      const scale = reduced.matches || editing ? 1 : 1 - (narrow ? .02 : .045) * (1 - enter) - (narrow ? .018 : .04) * behind;
      const x = reduced.matches || editing ? 0 : direction * (narrow ? 5 : 15) * behind;
      const y = reduced.matches || editing ? 0 : -behind * (narrow ? 12 : 24);
      card.style.setProperty('--scene-angle',`${rotation.toFixed(3)}deg`);
      card.style.setProperty('--scene-scale',scale.toFixed(4));
      card.style.setProperty('--scene-x',`${x.toFixed(2)}px`);
      card.style.setProperty('--scene-y',`${y.toFixed(2)}px`);
      card.style.setProperty('--scene-pixels', reduced.matches || editing ? '0' : (Math.sin(enter * Math.PI) * .75).toFixed(3));
      card.style.setProperty('--scene-pixel-y',`${(1 - enter) * 12}px`);
      card.classList.toggle('scene-current',index === active);
      card.dataset.sceneDepth = behind.toFixed(2);
      if (inContent && index === active) links[index].setAttribute('aria-current','location');
      else links[index].removeAttribute('aria-current');
    });
    document.documentElement.dataset.sceneActive = inContent ? cards[active].id : 'top';
    if (inContent) topLinks.forEach(link => {
      const current = link.hash === `#${cards[active].id}`;
      link.classList.toggle('current',current);
      if (current) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  };
  const schedule = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(update); };
  const resize = () => { needsMeasure = true; schedule(); };
  const positionFor = target => {
    const card = target.matches('.scene-card') ? target : target.closest('.scene-card');
    if (!card) return null;
    let offset = 0;
    let node = target;
    while (node && node !== card) { offset += node.offsetTop; node = node.offsetParent; }
    return anchors.get(card).getBoundingClientRect().bottom + scrollY + offset - (innerWidth <= 760 ? 90 : 110);
  };
  const go = (hash, smooth) => {
    const target = document.getElementById(hash.slice(1));
    if (!target) return false;
    if (needsMeasure) measure();
    const top = positionFor(target);
    if (top === null) return false;
    window.scrollTo({top:Math.max(0,top), behavior:smooth && !reduced.matches ? 'smooth' : 'instant'});
    schedule();
    return true;
  };
  document.querySelectorAll('.topbar nav a,.scene-rail a').forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (document.getElementById(link.hash.slice(1))?.matches('.scene-card')) {
      event.preventDefault();
      userMoved = true;
      navigationSerial++;
      if (location.hash !== link.hash) history.pushState(null,'',link.hash);
      go(link.hash,true);
    }
  }));
  window.addEventListener('hashchange', () => { navigationSerial++; go(location.hash,false); });
  window.addEventListener('popstate', () => { navigationSerial++; go(location.hash,false); });
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', resize, {passive:true});
  ['wheel','touchstart','pointerdown','keydown'].forEach(type => document.addEventListener(type, () => { userMoved = true; }, {passive:true,capture:true}));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else resize();
  });
  reduced.addEventListener('change', resize);
  new ResizeObserver(resize).observe(main);
  const cardsObserver = new ResizeObserver(resize);
  cards.forEach(card => cardsObserver.observe(card));
  new MutationObserver(resize).observe(document.documentElement, {attributes:true,attributeFilter:['class']});
  measure(); update();
  const initialSerial = navigationSerial;
  document.fonts.ready.then(() => {
    resize();
    requestAnimationFrame(() => { if (!userMoved && initialSerial === navigationSerial) go(location.hash,false); });
  });
})();

'use strict';

function createPublicationPeakChart(plot, videos, onSelect) {
  const ns = 'http://www.w3.org/2000/svg';
  const baseY = 390;
  const step = 61;
  const groups = [];
  const controls = [];
  const points = [];
  const riseParts = [];
  let filter = 'all';
  const el = (name, attributes = {}, parent) => {
    const node = document.createElementNS(ns, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (parent) parent.append(node);
    return node;
  };
  const pathOf = points => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const curve = (cx, height, depth = 0, ratio = 1) => Array.from({length: 49}, (_, i) => {
    const t = i / 48 * 2 - 1;
    return [cx + t * 32 + depth * 17, baseY - depth * 24 - height * ratio * Math.exp(-6.5 * t * t)];
  });
  const silhouette = (line, cx, depth) => `M${cx - 32 + depth * 17},${baseY - depth * 24} ${pathOf(line).replace(/^M/, 'L')} L${cx + 32 + depth * 17},${baseY - depth * 24}Z`;
  plot.classList.add('peak-chart');
  plot.setAttribute('aria-label', '最近15条视频播放量，立体光峰图');
  const svg = el('svg', {viewBox: '0 0 1000 480', class: 'peak-visual', 'aria-hidden': 'true', focusable: 'false'}, plot);
  svg.innerHTML = `<defs>
    <linearGradient id="peak-warm" x1="0" y1="0" x2="0.32" y2="1"><stop stop-color="#ffe0af" stop-opacity=".95"/><stop offset=".32" stop-color="#ffa772" stop-opacity=".82"/><stop offset=".78" stop-color="#e7643c" stop-opacity=".65"/><stop offset="1" stop-color="#e7643c" stop-opacity=".05"/></linearGradient>
    <linearGradient id="peak-sage" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#daf5ff" stop-opacity=".98"/><stop offset=".38" stop-color="#76c8ed" stop-opacity=".84"/><stop offset="1" stop-color="#3c8dab" stop-opacity=".09"/></linearGradient>
    <linearGradient id="peak-floor" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ddbfa3" stop-opacity=".05"/><stop offset=".54" stop-color="#dfac83" stop-opacity=".15"/><stop offset="1" stop-color="#b98568" stop-opacity=".05"/></linearGradient>
    <linearGradient id="peak-edge" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#efd0ad" stop-opacity="0"/><stop offset=".5" stop-color="#ffd2a0" stop-opacity=".65"/><stop offset="1" stop-color="#efd0ad" stop-opacity="0"/></linearGradient>
    <radialGradient id="peak-halo"><stop stop-color="#ffd7a6" stop-opacity=".6"/><stop offset="1" stop-color="#ff9768" stop-opacity="0"/></radialGradient>
    <clipPath id="peak-reflection-clip"><path d="M48 391H962L978 414H63Z"/></clipPath>
  </defs>`;
  const grid = el('g', {class: 'peak-grid'}, svg);
  [0, 250, 500, 750, 1000].forEach(value => {
    const y = baseY - value / 1000 * 300;
    el('path', {d: `M48 ${y}H963`, class: 'peak-grid-line'}, grid);
    const label = el('text', {x: 22, y: y + 4, class: 'peak-axis-label', 'text-anchor': 'middle'}, grid);
    label.textContent = String(value);
  });
  el('path', {d: 'M48 390H960L981 365H69Z', fill: 'url(#peak-floor)', class: 'peak-floor'}, svg);
  [0, 1, 2, 3].forEach(i => el('path', {d: `M${48 + i * 5.5} ${390 - i * 6.25}H${960 + i * 5.25}`, class: 'peak-plane-line'}, svg));
  const reflected = el('g', {'clip-path': 'url(#peak-reflection-clip)', opacity: '.22'}, svg);
  const shells = el('g', {class: 'peak-shells'}, svg);
  const nodes = el('g', {class: 'peak-nodes'}, svg);
  const trace = el('path', {id: 'peak-trace', class: 'peak-trace', fill: 'none'}, nodes);
  videos.forEach(([date, plays, type, title], index) => {
    const cx = 82 + index * step;
    const height = plays / 1000 * 300;
    const front = curve(cx, height);
    const group = el('g', {class: `peak-series ${type}`, 'data-peak-index': index, 'data-plays': plays}, shells);
    const clipId = `peak-water-clip-${index}`;
    const clip = el('clipPath', {id: clipId}, svg.querySelector('defs'));
    el('path', {d: silhouette(front, cx, 0)}, clip);
    for (let j = 0; j < 3; j++) {
      el('ellipse', {cx, cy: baseY + .6, rx: 13, ry: 2.6, class: 'water-ripple', style: `transform-origin:${cx}px ${baseY + .6}px;--water-delay:-${index * .23 + j * 2}s`}, group);
    }
    const column = el('g', {class:'peak-rise-column'}, group);
    el('path', {d: silhouette(front, cx, 0), fill: `url(#peak-${type === 'business' ? 'warm' : 'sage'})`, class: 'peak-front'}, column);
    const water = el('g', {'clip-path': `url(#${clipId})`, class: 'water-texture'}, column);
    const duration = 8.4 + index % 4 * .45;
    for (let j = 0; j < 5; j++) {
      const wave = Array.from({length: 29}, (_, k) => {
        const t = k / 28;
        return [cx - 40 + t * 80, baseY + Math.sin(t * Math.PI * 3 + j * 1.3) * 4];
      });
      const style = `--water-rise:${-height}px;--water-duration:${duration}s;--water-delay:-${duration * j / 5 + index * .19}s`;
      el('path', {d: pathOf(wave), class: 'water-band', style}, water);
      if (j < 3) el('circle', {cx: cx - 5 + j * 5, cy: baseY, r: .95 + j * .2, class: 'water-bubble', style}, water);
    }
    el('path', {d: pathOf(front), class: 'peak-rim', style: `--peak-delay:${index * -.37}s`}, column);
    const reflection = el('path', {d: silhouette(front, cx, 0), fill: `url(#peak-${type === 'business' ? 'warm' : 'sage'})`}, reflected);
    const tipY = baseY - height;
    const nodeGroup = el('g', {class: `peak-label-group ${type}`, 'data-peak-index': index}, nodes);
    const tip = el('g', {class:'peak-rise-tip'}, nodeGroup);
    const feedback = el('g', {class:'peak-node-feedback'}, tip);
    el('circle', {cx, cy: tipY, r: 13, class: 'peak-node-halo'}, feedback);
    el('circle', {cx, cy: tipY, r: 3.5, class: 'peak-node'}, feedback);
    el('circle', {cx, cy: tipY, r: 9, class:'peak-pointer-ring'}, feedback);
    const clickRipple = el('circle', {cx, cy:tipY, r:7, class:'peak-click-echo', style:`transform-origin:${cx}px ${tipY}px`}, feedback);
    const number = el('text', {x: cx, y: tipY - 15, 'text-anchor': 'middle', class: 'peak-number'}, tip);
    number.textContent = String(plays);
    const dateLabel = el('text', {x: cx, y: 443, 'text-anchor': 'middle', class: 'peak-date'}, nodeGroup);
    dateLabel.textContent = date;
    el('path', {d: `M${cx} 399V409`, class: 'peak-date-tick'}, nodeGroup);
    groups.push([group, nodeGroup]);
    points.push([cx, tipY]);
    riseParts.push({column, tip, reflection, height});
    const cell = document.createElement('div');
    cell.className = `bar-cell ${type}`;
    cell.style.left = `${(cx - step / 2) / 10}%`;
    cell.style.width = `${step / 10}%`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bar-button';
    button.setAttribute('aria-label', `${date}，${title}，${type === 'business' ? '品牌内容' : '个人视频'}，播放量${plays}万`);
    button.addEventListener('click', async () => {
      onSelect(index);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        clickRipple.animate([{opacity:.85, transform:'scale(.7)'}, {opacity:0, transform:'scale(3.6)'}], {duration:650, easing:'cubic-bezier(.2,.7,.2,1)'});
      }
      if (await window.ChartSound?.unlock()) window.ChartSound.water(index, true);
    });
    button.addEventListener('pointerenter', async () => {
      if (button.disabled) return;
      onSelect(index);
      if (await window.ChartSound?.activateIfAllowed()) {
        if (button.matches(':hover') && !button.disabled) window.ChartSound.water(index);
      }
    });
    button.addEventListener('pointermove', event => {
      if (button.disabled) return;
      const bounds = plot.getBoundingClientRect();
      const tipX = bounds.left + cx / 1000 * bounds.width;
      const tipTop = bounds.top + (baseY - height * riseProgress) / 480 * bounds.height;
      const dx = event.clientX - tipX;
      const dy = event.clientY - tipTop;
      const overTip = Math.hypot(dx, dy) < 28;
      nodeGroup.classList.toggle('is-near', overTip);
      feedback.style.transform = overTip ? `translate(${Math.max(-3,Math.min(3,dx * .12)).toFixed(2)}px,${Math.max(-3,Math.min(3,dy * .12)).toFixed(2)}px)` : 'none';
      if (overTip && button.dataset.overTip !== 'true') window.ChartSound?.water(index);
      button.dataset.overTip = String(overTip);
    });
    button.addEventListener('pointerleave', () => {
      button.dataset.overTip = 'false';
      nodeGroup.classList.remove('is-near');
      feedback.style.transform = 'none';
    });
    button.addEventListener('focus', () => { if (!button.disabled) onSelect(index); });
    cell.append(button);
    plot.append(cell);
    controls.push(button);
  });
  el('path', {d: 'M48 391H960L978 413H64Z', fill: 'none', stroke: 'url(#peak-edge)', 'stroke-width': '1'}, svg);
  el('path', {d: 'M65 414H978', fill: 'none', stroke: 'url(#peak-edge)', 'stroke-width': '1.4'}, svg);
  const traveller = el('g', {class: 'peak-traveller'}, svg);
  el('circle', {r: 11, fill: 'url(#peak-halo)'}, traveller);
  el('circle', {r: 2.3, fill: '#fff0d0'}, traveller);
  const motion = el('animateMotion', {dur: '22s', repeatCount: 'indefinite', calcMode: 'paced'}, traveller);
  let riseProgress = 0;
  const updateTrace = () => {
    const selectedPoints = points.map(([x,y]) => [x,baseY - (baseY - y) * riseProgress])
      .filter((_, i) => filter === 'all' || videos[i][2] === filter);
    trace.setAttribute('d', pathOf(selectedPoints));
    if (riseProgress === 1) motion.setAttribute('path', pathOf([...selectedPoints, ...selectedPoints.slice(0, -1).reverse()]));
  };
  const renderRise = progress => {
    riseProgress = progress;
    riseParts.forEach(({column,tip,reflection,height}) => {
      column.setAttribute('transform', `translate(0 ${baseY * (1-progress)}) scale(1 ${progress})`);
      tip.setAttribute('transform', `translate(0 ${height * (1-progress)})`);
      reflection.setAttribute('transform', `translate(0 ${baseY + baseY * .08 * progress}) scale(1 ${-.08 * progress})`);
    });
    traveller.style.opacity = progress === 1 ? '1' : '0';
    plot.dataset.riseProgress = progress.toFixed(3);
    plot.dataset.riseState = progress === 1 ? 'complete' : progress === 0 ? 'baseline' : 'rising';
    updateTrace();
  };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let inView = false;
  let riseFrame = 0;
  let riseElapsed = 0;
  let risePrevious = 0;
  const panel = plot.closest('.chart-panel');
  const currentScene = () => !document.documentElement.classList.contains('scene-ready') ||
    document.documentElement.dataset.sceneActive === 'performance';
  const stopRise = () => { cancelAnimationFrame(riseFrame); riseFrame = 0; risePrevious = 0; };
  const advanceRise = time => {
    if (!inView || !currentScene() || document.hidden || reduced.matches) { stopRise(); return; }
    if (risePrevious) riseElapsed += Math.min(80, time-risePrevious);
    risePrevious = time;
    const fraction = Math.max(0,Math.min(1,(riseElapsed-140)/2500));
    renderRise((1-Math.cos(Math.PI*fraction))/2);
    if (fraction < 1) riseFrame = requestAnimationFrame(advanceRise);
    else { riseFrame = 0; risePrevious = 0; }
  };
  const syncMotion = () => {
    const current = currentScene();
    const running = inView && current && !document.hidden && !reduced.matches;
    panel.classList.toggle('chart-active', running);
    if (running) svg.unpauseAnimations(); else svg.pauseAnimations();
    if (reduced.matches) { stopRise(); renderRise(1); }
    else if (!current) { stopRise(); riseElapsed = 0; renderRise(0); }
    else if (running && riseProgress < 1 && !riseFrame) riseFrame = requestAnimationFrame(advanceRise);
    else if (!running) stopRise();
  };
  const observer = new IntersectionObserver(entries => {
    const entry = entries[0];
    if (!entry.isIntersecting) {
      inView = false;
      stopRise();
      riseElapsed = 0;
      renderRise(reduced.matches ? 1 : 0);
    } else inView = entry.intersectionRatio >= .35;
    syncMotion();
  }, {threshold:[0,.35], rootMargin:'-80px 0px -30px 0px'});
  observer.observe(plot);
  document.addEventListener('visibilitychange', syncMotion);
  reduced.addEventListener('change', syncMotion);
  let previousScene;
  new MutationObserver(() => {
    const next = currentScene();
    if (next !== previousScene) { previousScene = next; syncMotion(); }
  }).observe(document.documentElement, {attributes:true,attributeFilter:['data-scene-active','class']});
  renderRise(reduced.matches ? 1 : 0);
  syncMotion();
  plot.dataset.chartReady = 'true';
  return {
    setActive(index) {
      groups.forEach(([shape, label], i) => {
        shape.classList.toggle('is-active', i === index);
        label.classList.toggle('is-active', i === index);
      });
    },
    setFilter(value) {
      filter = value;
      groups.forEach(([shape, label], i) => {
        const muted = filter !== 'all' && videos[i][2] !== filter;
        shape.classList.toggle('is-muted', muted);
        label.classList.toggle('is-muted', muted);
        controls[i].disabled = muted;
      });
      updateTrace();
    }
  };
}

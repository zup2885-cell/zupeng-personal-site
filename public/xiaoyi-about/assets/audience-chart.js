'use strict';

function createAudienceChart(root) {
  const ns = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs = {}) => {
    const node = document.createElementNS(ns, tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    return node;
  };
  const polar = (radius, angle, cx = 190, cy = 190) => {
    const radians = angle * Math.PI / 180;
    return [cx + Math.cos(radians) * radius, cy + Math.sin(radians) * radius];
  };
  const point = values => values.map(value => value.toFixed(3)).join(' ');
  const sector = (start, end, outer, cx = 190, cy = 190) => {
    const inner = 76;
    const large = end - start > 180 ? 1 : 0;
    return `M ${point(polar(outer, start, cx, cy))} A ${outer} ${outer} 0 ${large} 1 ${point(polar(outer, end, cx, cy))} L ${point(polar(inner, end, cx, cy))} A ${inner} ${inner} 0 ${large} 0 ${point(polar(inner, start, cx, cy))} Z`;
  };
  const svg = make('svg', {viewBox:'0 0 380 380', class:'gender-radial', role:'img'});
  const title = make('title');
  svg.append(title);
  const defs = make('defs');
  for (const [id, colors] of [['gender-male', ['#ecaf89','#d76a43','#b94529']], ['gender-female', ['#fff0d8','#dfbd91','#c39668']]]) {
    const gradient = make('linearGradient', {id, x1:'0%', y1:'0%', x2:'80%', y2:'100%'});
    colors.forEach((color, index) => gradient.append(make('stop', {offset:`${index * 50}%`, 'stop-color':color})));
    defs.append(gradient);
  }
  svg.append(defs);
  const guide = make('g', {class:'gender-guides', 'aria-hidden':'true'});
  guide.append(make('circle', {cx:190, cy:190, r:170, class:'radial-orbit'}));
  for (let angle = -90; angle < 270; angle += 10) {
    const major = (angle + 90) % 30 === 0;
    guide.append(make('line', {x1:polar(major ? 166 : 169, angle)[0], y1:polar(major ? 166 : 169, angle)[1], x2:polar(175, angle)[0], y2:polar(175, angle)[1], class:major ? 'radial-tick major' : 'radial-tick'}));
  }
  svg.append(guide);
  const shapes = make('g', {class:'gender-sectors', 'aria-hidden':'true'});
  const male = make('path', {fill:'url(#gender-male)', class:'gender-sector male-sector'});
  const female = make('path', {fill:'url(#gender-female)', class:'gender-sector female-sector'});
  shapes.append(male, female);
  shapes.append(make('circle', {cx:190, cy:190, r:108, class:'radial-inner-guide'}));
  const dividers = make('g', {class:'radial-dividers'});
  for (let angle = -90; angle < 270; angle += 45) {
    dividers.append(make('line', {x1:polar(81, angle)[0], y1:polar(81, angle)[1], x2:polar(140, angle)[0], y2:polar(140, angle)[1]}));
  }
  shapes.append(dividers);
  const rotor = make('g', {class:'gender-rotor'});
  rotor.append(shapes);
  svg.append(rotor);
  const pointerMarker = make('circle', {cx:190, cy:19, r:3.5, class:'gender-pointer-marker', 'aria-hidden':'true'});
  const clickEcho = make('circle', {cx:190, cy:190, r:140, class:'gender-click-echo', 'aria-hidden':'true'});
  svg.append(pointerMarker, clickEcho);
  const callouts = make('g', {class:'gender-callouts', 'aria-hidden':'true'});
  const femaleLine = make('path');
  const maleLine = make('path');
  const femaleDot = make('circle', {r:2.5});
  const maleDot = make('circle', {r:2.5});
  const femaleText = make('text', {x:18, y:53});
  const maleText = make('text', {x:348, y:327, 'text-anchor':'end'});
  femaleText.textContent = '女性';
  maleText.textContent = '男性';
  callouts.append(femaleLine, maleLine, femaleDot, maleDot, femaleText, maleText);
  svg.append(callouts);
  root.prepend(svg);

  const layout = root.closest('.audience-layout');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let entranceAnimations = [];
  const cancelEntrance = () => {
    entranceAnimations.forEach(animation => animation.cancel());
    entranceAnimations = [];
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const wasVisible = layout.classList.contains('audience-in-view');
        layout.classList.toggle('audience-in-view', entry.isIntersecting);
        if (!entry.isIntersecting) {
          cancelEntrance();
          return;
        }
        if (wasVisible || motionPreference.matches || typeof shapes.animate !== 'function') return;
        cancelEntrance();
        entranceAnimations.push(shapes.animate([
          {opacity:0, transform:'rotate(-14deg) scale(.88)'},
          {opacity:1, transform:'none'}
        ], {duration:1100, easing:'cubic-bezier(.2,.7,.2,1)'}));
        entranceAnimations.push(callouts.animate([{opacity:0}, {opacity:1}], {duration:750, delay:400, fill:'backwards'}));
        layout.querySelectorAll('.region-fill').forEach((fill, index) => {
          entranceAnimations.push(fill.animate([{transform:'scaleX(0)'}, {transform:'scaleX(1)'}], {
            duration:2100, delay:index * 110, easing:'cubic-bezier(.25,.1,.25,1)', fill:'backwards'
          }));
        });
      });
    }, {threshold:0.08, rootMargin:'0px 0px -40px 0px'});
    observer.observe(layout);
  }
  motionPreference.addEventListener('change', event => { if (event.matches) cancelEntrance(); });
  let currentAngle = 0;
  let targetAngle = 0;
  let tracking = false;
  let rotationFrame = 0;
  let lastNotch = 0;
  const rotate = () => {
    const difference = ((targetAngle - currentAngle + 180) % 360 + 360) % 360 - 180;
    currentAngle += motionPreference.matches ? difference : difference * .18;
    rotor.style.transform = `rotate(${currentAngle.toFixed(3)}deg)`;
    const markerPosition = polar(171, currentAngle - 90);
    pointerMarker.setAttribute('cx', markerPosition[0]);
    pointerMarker.setAttribute('cy', markerPosition[1]);
    const notch = Math.floor(currentAngle / 12);
    if (tracking && notch !== lastNotch) window.ChartSound?.tick(notch);
    lastNotch = notch;
    if (Math.abs(difference) > .12) rotationFrame = requestAnimationFrame(rotate);
    else {
      rotationFrame = 0;
      if (!tracking) {
        currentAngle = 0;
        rotor.style.transform = 'none';
        root.classList.remove('is-tracking');
      }
    }
  };
  const startRotation = () => { if (!rotationFrame) rotationFrame = requestAnimationFrame(rotate); };
  root.addEventListener('pointerenter', async () => {
    if (await window.ChartSound?.activateIfAllowed()) {
      if (root.matches(':hover')) window.ChartSound.tick();
    }
  });
  root.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const bounds = root.getBoundingClientRect();
    const dx = event.clientX - bounds.left - bounds.width / 2;
    const dy = event.clientY - bounds.top - bounds.height / 2;
    if (Math.hypot(dx, dy) < bounds.width * .13) return;
    tracking = true;
    root.classList.add('is-tracking');
    targetAngle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    startRotation();
  });
  root.addEventListener('pointerdown', async () => {
    if (!motionPreference.matches && typeof clickEcho.animate === 'function') {
      clickEcho.animate([{opacity:.8, transform:'scale(.98)'}, {opacity:0, transform:'scale(1.28)'}], {duration:600, easing:'cubic-bezier(.2,.7,.2,1)'});
      shapes.animate([{transform:'scale(.97)'}, {transform:'scale(1)'}], {duration:260, easing:'cubic-bezier(.2,.7,.2,1)'});
    }
    if (await window.ChartSound?.unlock()) window.ChartSound.tick();
  });
  layout.querySelectorAll('[data-audience]').forEach(button => button.addEventListener('click', async () => {
    if (await window.ChartSound?.unlock()) window.ChartSound.tick();
  }));
  layout.querySelectorAll('.region-bars>div').forEach((row, index) => {
    let lastPianoX = 0;
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `${row.querySelector('span').textContent}，粉丝占比${row.querySelector('b').textContent}`);
    row.addEventListener('pointerenter', async event => {
      lastPianoX = event.clientX;
      if (await window.ChartSound?.activateIfAllowed()) {
        if (row.matches(':hover')) window.ChartSound.piano(index);
      }
    });
    row.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || Math.abs(event.clientX - lastPianoX) < 80) return;
      lastPianoX = event.clientX;
      window.ChartSound?.piano(index);
    });
    row.addEventListener('click', async () => {
      if (!motionPreference.matches) row.querySelector('b').animate([{transform:'translateY(2px)'}, {transform:'none'}], {duration:240});
      if (await window.ChartSound?.unlock()) window.ChartSound.piano(index, true);
    });
    row.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); row.click(); }
    });
  });
  root.addEventListener('pointerleave', () => {
    tracking = false;
    targetAngle = 0;
    startRotation();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    cancelAnimationFrame(rotationFrame);
    rotationFrame = 0;
    currentAngle = targetAngle = 0;
    tracking = false;
    rotor.style.transform = 'none';
    root.classList.remove('is-tracking');
  });

  return {
    update(audience) {
      const split = -90 + audience.male * 3.6;
      const femaleAngle = (split + 270) / 2;
      const femaleOffset = polar(9, femaleAngle, 0, 0);
      male.setAttribute('d', sector(-90, split, 140));
      female.setAttribute('d', sector(split, 270, 156, 190 + femaleOffset[0], 190 + femaleOffset[1]));
      const femalePoint = polar(168, femaleAngle);
      const malePoint = polar(148, (-90 + split) / 2);
      femaleLine.setAttribute('d', `M ${point(femalePoint)} L 55 65 H 18`);
      maleLine.setAttribute('d', `M ${point(malePoint)} L 324 303 H 348`);
      [femaleDot, maleDot].forEach((dot, index) => {
        const position = index === 0 ? femalePoint : malePoint;
        dot.setAttribute('cx', position[0]);
        dot.setAttribute('cy', position[1]);
      });
      const group = audience.caption.endsWith('粉丝') ? '粉丝' : '观众';
      const description = `${group}性别比例：男性 ${audience.male}%，女性 ${audience.female}%。`;
      title.textContent = description;
      svg.setAttribute('aria-label', description);
      if (!motionPreference.matches && layout.classList.contains('audience-in-view') && typeof shapes.animate === 'function') {
        shapes.animate([{opacity:0.35, transform:'rotate(-7deg) scale(.96)'}, {opacity:1, transform:'none'}], {duration:650, easing:'cubic-bezier(.2,.7,.2,1)'});
      }
    }
  };
}

'use strict';

// 2022 fan milestones as a road trip: a Tank 500 drives past four road signs, each lighting up
// as it passes, while an odometer counts fans from 0 to 1,000,000. Click the road to replay.
(() => {
  const source = document.querySelector('#history .milestones');
  if (!source) return;
  const items = [...source.children].map(item => ({
    label: item.querySelector('strong')?.textContent.trim() || '',
    date: item.querySelector('p')?.textContent.trim() || '',
    day: item.querySelector('small')?.textContent.trim() || ''
  }));
  const toFans = label => parseFloat(label) * (label.includes('万') ? 10000 : 1);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const trip = el('div', 'ms-trip');
  trip.setAttribute('role', 'img');
  trip.setAttribute('aria-label', items.map(i => `${i.label}粉丝 ${i.date}`).join('，'));
  const odo = el('div', 'ms-odo');
  odo.append(el('span', 'ms-odo-label', '粉丝里程'));
  const reading = el('b', 'ms-odo-value', '0000000');
  odo.append(reading);
  const scene = el('div', 'ms-scene');
  const road = el('div', 'ms-road');
  const lit = el('span', 'ms-lit');
  road.append(lit);
  const car = el('span', 'ms-car');
  // Same Tank 500 as the section rail, turned to drive left → right.
  const tank = document.querySelector('.rail-car svg');
  if (tank) car.append(tank.cloneNode(true));
  road.append(car);
  const positions = items.map((_, i) => 12 + i * (76 / Math.max(1, items.length - 1)));
  const signs = items.map((item, i) => {
    const sign = el('div', 'ms-sign');
    sign.style.left = `${positions[i]}%`;
    const board = el('div', 'ms-board');
    board.append(el('strong', '', item.label), el('span', '', '粉丝'));
    const post = el('i', 'ms-post');
    const meta = el('div', 'ms-meta');
    meta.append(el('b', '', item.date), el('small', '', item.day));
    sign.append(board, post, meta);
    scene.append(sign);
    return sign;
  });
  scene.append(road);
  trip.append(odo, scene, el('span', 'ms-hint', '点击重播'));
  source.replaceWith(trip);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DURATION = 3600;
  const fans = items.map(i => toFans(i.label));
  let frame = 0;
  const fansAt = x => {
    // Fans grow between signs; before the first sign they climb from 0.
    if (x <= positions[0]) return fans[0] * (x - 4) / (positions[0] - 4);
    for (let i = 1; i < positions.length; i++) {
      if (x <= positions[i]) return fans[i - 1] + (fans[i] - fans[i - 1]) * (x - positions[i - 1]) / (positions[i] - positions[i - 1]);
    }
    return fans[fans.length - 1];
  };
  const show = x => {
    car.style.left = `${x}%`;
    lit.style.width = `${x}%`;
    reading.textContent = String(Math.max(0, Math.round(fansAt(x)))).padStart(7, '0');
    signs.forEach((sign, i) => sign.classList.toggle('ms-on', x >= positions[i] - .5));
  };
  const play = () => {
    cancelAnimationFrame(frame);
    if (reduced) { show(93); return; }
    trip.classList.add('ms-driving');
    const start = performance.now();
    const step = now => {
      const t = Math.min(1, (now - start) / DURATION);
      // Gentle start and a soft stop, like real driving.
      const eased = t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      show(4 + eased * 89);
      if (t < 1) frame = requestAnimationFrame(step);
      else { trip.classList.remove('ms-driving'); window.ChartSound?.horn?.(); }
    };
    frame = requestAnimationFrame(step);
  };
  show(4);
  trip.addEventListener('click', play);
  if (!('IntersectionObserver' in window)) { play(); return; }
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { play(); observer.disconnect(); }
  }, {threshold: .55});
  observer.observe(trip);
})();

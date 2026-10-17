'use strict';

// Section rail as a little road: a car drives along it with the reader's scroll, clicks its
// turn signal as it passes each section, and blinks toward a section you point at.
(() => {
  const start = () => {
    const rail = document.querySelector('.scene-rail');
    const anchors = Array.from(document.querySelectorAll('#main>.scene-anchor'));
    if (!rail || !anchors.length) return false;
    const links = Array.from(rail.querySelectorAll('a'));
    // Wrap each label so it can take the racing type treatment; the words stay the same.
    links.forEach(link => {
      const text = [...link.childNodes].find(node => node.nodeType === 3 && node.textContent.trim());
      if (!text) return;
      const label = document.createElement('b');
      label.className = 'rail-label';
      label.textContent = text.textContent.trim();
      text.replaceWith(label);
      link.querySelector('span')?.classList.add('rail-number');
    });
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');

    const road = document.createElement('div');
    road.className = 'rail-road';
    road.setAttribute('aria-hidden', 'true');
    road.innerHTML = `
      <span class="rail-trail"></span>
      <span class="rail-car">
        <span class="rail-beam"></span>
        <svg viewBox="0 0 34 58" width="34" height="58">
          <!-- Tank 500 seen from above; the front (headlights) faces down. -->
          <rect x="0" y="10" width="4.5" height="9" rx="1.6" class="tank-tire"/>
          <rect x="29.5" y="10" width="4.5" height="9" rx="1.6" class="tank-tire"/>
          <rect x="0" y="40" width="4.5" height="9" rx="1.6" class="tank-tire"/>
          <rect x="29.5" y="40" width="4.5" height="9" rx="1.6" class="tank-tire"/>
          <rect x="2.5" y="4" width="29" height="51" rx="3.2" class="tank-body"/>
          <rect x="1.2" y="34.5" width="3" height="2.6" rx=".8" class="tank-body"/>
          <rect x="29.8" y="34.5" width="3" height="2.6" rx=".8" class="tank-body"/>
          <path d="M5 40.5h24v11.8a1.8 1.8 0 0 1-1.8 1.8H6.8A1.8 1.8 0 0 1 5 52.3z" class="tank-hood"/>
          <path d="M13 42.5v10M21 42.5v10" class="tank-crease"/>
          <path d="M6 34.6h22l-1.2 5.2H7.2z" class="tank-glass"/>
          <path d="M6.6 9.2h20.8l-.8 3.2H7.4z" class="tank-glass"/>
          <rect x="6.2" y="12.8" width="21.6" height="21.4" rx="1.4" class="tank-roof"/>
          <path d="M8.4 13.6v19.8M25.6 13.6v19.8" class="tank-rail"/>
          <path d="M8.4 18h17.2M8.4 29h17.2" class="tank-bar"/>
          <rect x="5.2" y="53.4" width="5.4" height="2.4" rx=".6" class="car-light"/>
          <rect x="23.4" y="53.4" width="5.4" height="2.4" rx=".6" class="car-light"/>
          <path d="M12.4 54.6h9.2" class="tank-grille"/>
          <rect x="3.2" y="4.6" width="2" height="5.4" rx=".8" class="car-tail"/>
          <rect x="28.8" y="4.6" width="2" height="5.4" rx=".8" class="car-tail"/>
          <circle cx="17" cy="4.4" r="5" class="tank-tire"/>
          <circle cx="17" cy="4.4" r="2.4" class="tank-hub"/>
          <circle cx="2.6" cy="50.5" r="1.7" class="car-signal"/>
          <circle cx="31.4" cy="50.5" r="1.7" class="car-signal"/>
          <circle cx="2.6" cy="8" r="1.7" class="car-signal"/>
          <circle cx="31.4" cy="8" r="1.7" class="car-signal"/>
        </svg>
      </span>`;
    rail.prepend(road);
    rail.classList.add('rail-driving');
    const car = road.querySelector('.rail-car');
    const trail = road.querySelector('.rail-trail');
    // A traffic light beside the road at every section.
    const lights = links.map(() => {
      const light = document.createElement('span');
      light.className = 'rail-light';
      light.innerHTML = '<i></i><i></i><i></i>';
      road.append(light);
      return light;
    });
    let lightTimer = 0, stoppedAt = -1, drove = false;
    const setLight = (index, state) => {
      if (lights[index] && lights[index].dataset.light !== state) {
        if (state) lights[index].dataset.light = state;
        else delete lights[index].dataset.light;
      }
    };
    // Driving: green at the destination and every light on the way. Stopped: the light where
    // the car waits goes amber, then red, and the brake lights come on.
    const driveLights = (from, to) => {
      clearTimeout(lightTimer); stoppedAt = -1; drove = true;
      rail.classList.remove('rail-braking');
      const up = to < from;
      const first = up ? Math.ceil(to) : Math.floor(from + .02) + 1;
      const lastStop = up ? Math.ceil(from - .02) - 1 : Math.floor(to);
      lights.forEach((_, i) => setLight(i, i >= first && i <= lastStop ? 'green' : ''));
    };
    const stopLights = index => {
      if (stoppedAt === index) return;
      stoppedAt = index;
      clearTimeout(lightTimer);
      lights.forEach((_, i) => { if (i !== index) setLight(i, ''); });
      setLight(index, 'amber');
      lightTimer = setTimeout(() => {
        setLight(index, 'red');
        rail.classList.add('rail-braking');
        // A short beep once the car has pulled up at the red light (not on first load).
        if (drove) { drove = false; window.ChartSound?.horn?.(); }
      }, reduced.matches ? 0 : 320);
    };

    let stops = [];
    const measure = () => {
      const top = road.getBoundingClientRect().top;
      stops = links.map(link => {
        const box = link.getBoundingClientRect();
        return box.top + box.height / 2 - top;
      });
      lights.forEach((light, i) => { light.style.top = `${stops[i].toFixed(1)}px`; });
    };

    // Continuous position: whole numbers are sections, fractions are the way between them.
    const target = () => {
      const line = innerHeight * .38;
      const bottoms = anchors.map(anchor => anchor.getBoundingClientRect().bottom);
      let index = 0;
      bottoms.forEach((bottom, i) => { if (bottom <= line) index = i; });
      const next = bottoms[index + 1];
      if (next === undefined || bottoms[index] > line) return index;
      return index + Math.min(1, Math.max(0, (line - bottoms[index]) / (next - bottoms[index])));
    };
    const yFor = position => {
      const i = Math.min(stops.length - 1, Math.floor(position));
      const t = position - i;
      return stops[i] + ((stops[i + 1] ?? stops[i]) - stops[i]) * t;
    };

    let position = Math.floor(target() + .001), heading = 0, angle = 0, passed = Math.round(position), frame = 0, last = 0;
    const tick = now => {
      frame = 0;
      if (!stops.length) measure();
      const dt = Math.min(64, now - (last || now)) / 1000;
      last = now;
      // The car waits at the section being read and only drives when that section changes.
      const goal = Math.floor(target() + .001);
      const before = position;
      // Ease toward the goal like a car accelerating and braking, never overshooting.
      position = reduced.matches ? goal : position + (goal - position) * (1 - Math.exp(-dt * 7));
      if (Math.abs(goal - position) < .002) position = goal;
      const moved = position - before;
      if (Math.abs(moved) > .0008) heading = moved > 0 ? 0 : 180;
      angle += (heading - angle) * (1 - Math.exp(-dt * 10));
      const y = yFor(position);
      car.style.transform = `translate(-50%,${y.toFixed(1)}px) translateY(-50%) rotate(${angle.toFixed(1)}deg)`;
      trail.style.height = `${Math.max(0, y).toFixed(1)}px`;
      rail.style.setProperty('--car-speed', Math.min(1, Math.abs(moved) * 40).toFixed(2));
      const nearest = Math.round(position);
      if (nearest !== passed && Math.abs(position - nearest) < .12) {
        passed = nearest;
        window.ChartSound?.tick?.(nearest);
        rail.classList.remove('rail-blink'); void rail.offsetWidth; rail.classList.add('rail-blink');
      }
      // Between sections the car is heading for the next one in its direction of travel.
      const settled = Math.abs(goal - position) <= .02 && Math.abs(goal - Math.round(goal)) < .02;
      if (settled) stopLights(Math.round(goal));
      else {
        const forward = heading === 0;
        driveLights(position, forward ? Math.max(Math.ceil(goal - .02), Math.ceil(position)) : Math.min(Math.floor(goal + .02), Math.floor(position)));
      }
      if (Math.abs(goal - position) > .001) frame = requestAnimationFrame(tick);
      else last = 0;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(tick); };

    links.forEach((link, index) => {
      link.addEventListener('pointerenter', () => {
        rail.dataset.signal = index > position + .05 ? 'down' : index < position - .05 ? 'up' : 'here';
        link.classList.add('rail-hover');
      });
      link.addEventListener('pointerleave', () => { delete rail.dataset.signal; link.classList.remove('rail-hover'); });
      link.addEventListener('click', () => { rail.classList.add('rail-go'); setTimeout(() => rail.classList.remove('rail-go'), 900); });
    });
    addEventListener('scroll', schedule, {passive: true});
    addEventListener('resize', () => { stops = []; schedule(); }, {passive: true});
    new ResizeObserver(() => { stops = []; schedule(); }).observe(rail);
    measure();
    schedule();
    return true;
  };
  if (!start()) addEventListener('load', start, {once: true});
})();

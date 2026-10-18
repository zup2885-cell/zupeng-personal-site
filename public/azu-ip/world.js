// Poses read from the real source footage (潮玩男生交互动画.mp4, 24fps, 121 frames); not mirrored.
// Positions below are source frames. Between every two neighbouring source frames the shipped set
// has as many RIFE in-betweens as that step needs (manifest.dense), so no two neighbouring images
// differ much and slow playback shows motion rather than a cross-fade.
//   0–41    thinking, hand on chin                 (idle)
//   62      points to the upper left               (2nd photo)
//   75      points out low to the left             (1st photo, the lowest on the left)
//   90      points straight up                     (middle photo)
//   108     points up to the right, hand by head   (4th photo)
//   119     reaches out to the right               (5th photo, the lowest on the right)
// He moves along one of two tracks, both continuous pictures:
//   L  the source timeline itself, 20 → 120. All five pointing poses lie on it, so moving between
//      photos plays straight through and never drops back to thinking.
//   R  thinking (≤ 41) → RIFE in-betweens 41 → 103 (hand stays by the chin) → 103 → 120.
//      This is how he goes from thinking to the right-hand photos and back, without passing the
//      left/up poses and without stopping or cross-fading on the way.
// Both tracks show the same frames at ≤ 41 and ≥ 103, so he can change track there mid-motion.
export const THINK = 41;
export const JUNCTION = 103;
export const CARD_POSES = [75, 62, 90, 108, 119];   // photos from left to right
const CARD_LEAN = [-2.6, -1.3, 0, 1.3, 2.6];         // degrees he leans toward each photo
export const FIRST = 34, LAST = 120;   // source frames used
export const BRIDGE = 5;               // track R spends this many source-frame units in the in-betweens (kept short: its middle is soft)
const IDLE = [34, THINK];              // thinking drifts back and forth here, never far from the start
const IDLE_SPEED = 4;                  // source frames per second while thinking
const SPEED = 38;                      // top speed, in average-source-frame units of visual change per second
const ACCEL = 190;                     // per second², for easing in and out
const LEAVE_DELAY = 220;               // ms; crossing the gap between photos does not drop back to thinking
const HOLD = 1800;                     // ms a tapped photo is held after he points at it

const R_TOP = THINK + BRIDGE;          // track-R position of frame 103
export const toR = f => (f <= THINK ? f : f - JUNCTION + R_TOP);
export const toL = u => (u <= THINK ? u : u - R_TOP + JUNCTION);
// What a track position shows: a source frame, or a point inside the in-betweens (0…1).
export function pictureAt(track, u) {
  if (track === 'L' || u <= THINK) return { frame: u };
  if (u >= R_TOP) return { frame: toL(u) };
  return { bridge: (u - THINK) / BRIDGE };
}

// The stages to reach a goal frame from where he is: [{ track, u }], each one a place he stops
// or turns. Changing track only ever happens at a point both tracks share.
export function plan(track, u, goal) {
  const at = pictureAt(track, u), f = at.frame;
  const inBridge = at.bridge !== undefined;
  const right = goal >= JUNCTION, thinking = goal === THINK;
  if (thinking) {
    if (track === 'R' || f >= JUNCTION) return [{ track: 'R', u: THINK }];
    return [{ track: 'L', u: THINK }];
  }
  if (right) {
    if (track === 'R') return [{ track: 'R', u: toR(goal) }];
    return f <= THINK ? [{ track: 'R', u: toR(goal) }] : [{ track: 'L', u: goal }];
  }
  // A middle pose (62, 75, 90).
  const up = goal > 80;
  if (track === 'R' && !inBridge && f >= JUNCTION) return [{ track: 'L', u: goal }];
  if (inBridge) return up ? [{ track: 'R', u: R_TOP }, { track: 'L', u: goal }] : [{ track: 'R', u: THINK }, { track: 'L', u: goal }];
  if (f <= THINK && up) return [{ track: 'R', u: R_TOP }, { track: 'L', u: goal }];
  return [{ track: 'L', u: goal }];
}

// Even visual speed. The source moves in bursts: some neighbouring frames differ 3× the average,
// others are nearly still. The walker measures position in "how much the picture has changed"
// (manifest.dense.motion, per image step) so speed and easing are even to the eye.
// One unit is the average change per source frame; near-still stretches still count a little.
export class VisualMetric {
  constructor(dense) {
    this.pairs = {};
    const totals = Object.values(dense.motion).map(steps => steps.reduce((a, b) => a + b, 0));
    const unit = totals.reduce((a, b) => a + b, 0) / totals.length;
    const strip = steps => {
      const cum = [0], floor = 0.15 / steps.length;
      for (const x of steps) cum.push(cum[cum.length - 1] + Math.max(floor, x / unit));
      return cum;
    };
    this.start = {}; let at = 0;
    for (let k = FIRST; k < LAST; k++) {
      this.pairs[k] = strip(dense.motion[k]); this.start[k] = at; at += this.pairs[k][this.pairs[k].length - 1];
    }
    this.end = at;
    this.bridge = strip(dense.bridgeMotion);
  }
  static within(cum, t) {
    const n = cum.length - 1, q = Math.min(n, Math.max(0, t * n)), i = Math.min(n - 1, Math.floor(q));
    return cum[i] + (cum[i + 1] - cum[i]) * (q - i);
  }
  timeline(f) {
    if (f >= LAST) return this.end;
    const k = Math.max(FIRST, Math.floor(f));
    return this.start[k] + VisualMetric.within(this.pairs[k], f - k);
  }
  // Distance along a track to track position u.
  at(track, u) {
    if (track === 'L' || u <= THINK) return this.timeline(u);
    const base = this.timeline(THINK), across = this.bridge[this.bridge.length - 1];
    if (u >= R_TOP) return base + across + this.timeline(toL(u)) - this.timeline(JUNCTION);
    return base + VisualMetric.within(this.bridge, (u - THINK) / BRIDGE);
  }
  // Track position for a distance (the distance is strictly increasing, so bisection is exact enough).
  position(track, s) {
    let lo = FIRST, hi = track === 'L' ? LAST : toR(LAST);
    for (let n = 0; n < 32; n++) { const mid = (lo + hi) / 2; if (this.at(track, mid) < s) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
}
const FLAT = { at: (track, u) => u, position: (track, s) => s };

// A continuous cursor: fractional position, eased speed, and a new goal bends the current motion.
export class SmoothWalker {
  constructor(start = THINK, metric = FLAT) {
    this.metric = metric;
    this.track = 'L'; this.u = start; this.v = 0;
    this.goal = start; this.stages = [];
    this.idleDir = -1;
  }
  get picture() { return pictureAt(this.track, this.u); }
  get frame() { return this.picture.frame; }
  aim(goal) {
    if (goal === this.goal && (this.stages.length || this.idling)) return;
    this.goal = goal;
    this.stages = plan(this.track, this.u, goal);
    this.enter();
  }
  // Move onto the first stage's track; positions agree there, so nothing visibly changes.
  enter() {
    const s = this.stages[0];
    if (!s || s.track === this.track) return;
    const f = this.picture.frame;
    if (f === undefined || (f > THINK && f < JUNCTION)) return; // not on a shared stretch yet
    this.u = s.track === 'R' ? toR(f) : f;
    this.track = s.track;
  }
  get idling() { return this.goal === THINK && !this.stages.length; }
  get settled() { return !this.stages.length && this.goal !== THINK && Math.abs(this.frame - this.goal) < 0.01; }
  tick(seconds) {
    const dt = Math.max(0, Math.min(seconds, 1 / 20));
    let target, speed = SPEED;
    const s = this.stages[0];
    if (s) target = s.u;
    else if (this.goal === THINK) {
      if (this.u > IDLE[1] + 0.01 || this.u < IDLE[0] - 0.01) target = THINK;
      else { target = this.idleDir < 0 ? IDLE[0] : IDLE[1]; speed = IDLE_SPEED; }
    } else return false;
    // Speed and easing are in visual distance; position follows from it.
    // (The thinking drift stays in plain frames: its changes are tiny and should stay slow.)
    const m = s ? this.metric : FLAT, before = this.u;
    const here = m.at(this.track, this.u), there = m.at(this.track, target);
    const distance = there - here, dir = Math.sign(distance);
    const desired = dir * Math.min(speed, Math.sqrt(2 * ACCEL * Math.abs(distance)));
    const dv = ACCEL * dt;
    this.v += Math.max(-dv, Math.min(dv, desired - this.v));
    const next = here + this.v * dt;
    if (dir && Math.sign(there - next) !== dir) { this.u = target; this.v = 0; }
    else this.u = m.position(this.track, next);
    if (Math.abs(target - this.u) < 0.01 && Math.abs(this.v) < 2) {
      this.u = target; this.v = 0;
      if (s) { this.stages.shift(); this.enter(); }
      else if (target === IDLE[0] || target === IDLE[1]) this.idleDir *= -1;
    }
    return this.u !== before;
  }
  snap(goal = this.goal) { this.track = 'L'; this.u = goal; this.v = 0; this.goal = goal; this.stages = []; }
}

export async function setupWorld() {
  const stage = document.getElementById('world');
  const figure = document.getElementById('world-character');
  const image = document.getElementById('world-character-frame');
  const cards = [...stage.querySelectorAll('.photo-trigger')];
  let canvas = null, context = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const decoded = new Map();
  let dense = null, timeline = null, bridgeFrames = null, rest = null, walker = null, raf = null, previous = null, inView = false, ready = false, loading = null;
  // Intentions, highest priority first: a tapped photo (held briefly), the hovered photo, keyboard focus.
  let tapped = null, hovered = null, focused = null;
  let leaveTimer = null, holdTimer = null;

  const centre = el => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };

  // Each photo has its own pose, by its place from left to right.
  function slotOf(card) {
    const order = [...cards].sort((a, b) => centre(a) - centre(b));
    const i = order.indexOf(card);
    return Math.round(i * (CARD_POSES.length - 1) / Math.max(1, order.length - 1));
  }
  const current = () => tapped ?? hovered ?? focused;

  // The only place that changes intention. It moves the goal; the walker follows.
  function update() {
    const card = current();
    const slot = card ? slotOf(card) : -1;
    const goal = card ? CARD_POSES[slot] : THINK;
    figure.style.setProperty('--lean', `${card ? CARD_LEAN[slot] : 0}deg`);
    for (const c of cards) {
      c.classList.toggle('is-active', c === card);
      if (c !== card) c.classList.remove('is-answered');
    }
    figure.dataset.look = card ? `card-${slot + 1}` : 'think';
    if (ready) {
      walker.aim(goal);
      figure.dataset.target = String(goal);
      schedule();
      arrived();
    }
  }
  // Once he is pointing at it, the photo answers: it lifts and glows. A tap is then held briefly.
  function arrived() {
    const card = current();
    if (!card || !ready || !walker.settled) return;
    card.classList.add('is-answered');
    if (tapped && holdTimer === null) {
      const held = tapped;
      holdTimer = setTimeout(() => { holdTimer = null; if (tapped === held) { tapped = null; update(); } }, HOLD);
    }
  }
  function clearTap() { clearTimeout(holdTimer); holdTimer = null; tapped = null; }

  // Only a photo under the mouse makes him point; elsewhere he keeps thinking. The rest of the
  // mouse play on this screen (light, shadow, tilting photos) is in setupWorldLight below.
  setupWorldLight(stage, figure, cards);
  for (const card of cards) {
    card.addEventListener('pointerenter', e => {
      if (e.pointerType === 'touch') return;
      clearTimeout(leaveTimer); leaveTimer = null;
      hovered = card; update();
    });
    card.addEventListener('pointerleave', e => {
      if (e.pointerType === 'touch' || hovered !== card) return;
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => { leaveTimer = null; if (hovered === card) { hovered = null; update(); } }, LEAVE_DELAY);
    });
    card.addEventListener('pointerup', e => {
      const tile = card.closest('.fan-card');
      tile.classList.remove('is-pressed'); void tile.offsetWidth; tile.classList.add('is-pressed');
      if (e.pointerType !== 'touch') return;
      const again = tapped === card;
      clearTap();
      if (!again) tapped = card;
      update();
    });
    card.closest('.fan-card').addEventListener('animationend', e => e.currentTarget.classList.remove('is-pressed'));
    card.addEventListener('focusin', () => { if (card.matches(':focus-visible')) { focused = card; update(); } });
    card.addEventListener('focusout', () => { if (focused === card) { focused = null; update(); } });
  }
  stage.addEventListener('keydown', e => {
    if (e.key === 'Escape') { hovered = focused = null; clearTap(); update(); }
  });

  // The in-betweens are dense enough that the nearest image is always close to the exact
  // position, so one sharp image is drawn instead of a blend of two (blending two neighbours
  // softened the picture). Only redrawn when the image actually changes.
  // One sharp image at a time (no blending of neighbours, which softened the picture); the
  // canvas is only touched when the image actually changes.
  let shown = null;
  function show(key) {
    if (key === shown) return;
    shown = key;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(decoded.get(key), 0, 0);
  }
  // Images arrive in stages (see preload), so drawing only ever picks among the images already
  // decoded: the nearest one to the exact position. Early on that is a coarser step, later every
  // in-between; the motion just gets finer as the rest arrives.
  const nearestLoaded = (list, x) => {
    let best = null, bd = Infinity;
    for (const f of list) { const d = Math.abs(f.x - x); if (d < bd && decoded.has(f.key)) { bd = d; best = f.key; } }
    return best;
  };
  function render() {
    const at = walker.picture;
    let key;
    if (at.bridge !== undefined) {
      key = nearestLoaded(bridgeFrames, at.bridge);
      figure.dataset.frame = `bridge ${at.bridge.toFixed(3)}`;
    } else {
      key = nearestLoaded(timeline, Math.min(LAST, at.frame));
      figure.dataset.frame = at.frame.toFixed(2);
    }
    if (key) show(key);
  }
  function schedule() {
    if (!ready || !inView || document.hidden || raf !== null) return;
    if (reduced.matches) { walker.snap(); render(); arrived(); return; }
    raf = requestAnimationFrame(tick);
  }
  function tick(time) {
    raf = null;
    if (!inView || document.hidden) { previous = null; return; }
    const dt = previous === null ? 1 / 60 : Math.min(0.05, (time - previous) / 1000);
    previous = time;
    if (walker.tick(dt)) render();
    if (walker.settled) { arrived(); previous = null; }
    else schedule();
  }
  function stop() { if (raf !== null) cancelAnimationFrame(raf); raf = null; previous = null; }
  function reset() {
    stop(); clearTimeout(leaveTimer); leaveTimer = null; hovered = focused = null; clearTap();
    // Off screen he goes back to the thinking pose, the same picture as the static fallback.
    if (ready) { walker.snap(THINK); render(); }
    update();
  }

  async function preload() {
    const response = await fetch('./assets/world-interact/manifest.json');
    if (!response.ok) throw Error('World motion manifest unavailable');
    const manifest = await response.json();
    dense = manifest.dense;
    // Keep at most 3 images per source step (12 across the bridge): still dense where he moves fast,
    // but about half the memory, so the browser never has to throw decoded frames away and
    // decode them again mid-motion (that was the stutter).
    const pick = (names, cap) => {
      const n = names.length, m = Math.min(n, cap);
      return Array.from({ length: m }, (_, i) => Math.round(i * n / m)).map(j => ({ t: j / n, name: names[j] }));
    };
    // timeline: every kept image on the source timeline at x = source frame (+ fraction);
    // bridgeFrames: the in-betweens of track R at x = 0…1, closed by frames 41 and 103.
    const jobs = [];
    timeline = [{ x: LAST, key: `${LAST}:0` }]; jobs.push({ key: `${LAST}:0`, name: dense.lastFrame, stage: 0 });
    const poses = new Set([THINK, JUNCTION, LAST, ...CARD_POSES]);
    for (const [k, names] of Object.entries(dense.pairs)) {
      const f = Number(k);
      for (const p of pick(names, 3)) {
        const key = `${k}:${p.t}`;
        timeline.push({ x: f + p.t, key });
        // stage 0: enough to point at every photo right away; 1: every source frame; 2: in-betweens
        const stage = p.t > 0 ? 2 : (poses.has(f) || f % 4 === 0 || (f >= IDLE[0] && f <= IDLE[1])) ? 0 : 1;
        jobs.push({ key, name: p.name, stage });
      }
    }
    const bridge = pick(dense.bridge.frames, 12);
    bridgeFrames = [{ x: 0, key: `${THINK}:0` }, ...bridge.map(f => ({ x: f.t, key: `b:${f.t}` })), { x: 1, key: `${JUNCTION}:0` }];
    bridge.forEach((f, i) => jobs.push({ key: `b:${f.t}`, name: f.name, stage: i % 3 === 0 ? 0 : 2 }));
    // within a stage, frames nearest the thinking pose first
    const near = j => (j.key.startsWith('b:') ? 4 : Math.abs(parseInt(j.key, 10) - THINK));
    jobs.sort((a, b) => a.stage - b.stage || near(a) - near(b));
    const load = async ({ key, name }) => {
      const frame = new Image();
      frame.src = `./assets/world-interact/dense/${name}`;
      await frame.decode();
      if (!frame.naturalWidth) throw Error(`Empty frame ${name}`);
      // an ImageBitmap stays decoded, ready to draw without any decoding during playback
      decoded.set(key, typeof createImageBitmap === 'function' ? await createImageBitmap(frame) : frame);
    };
    const run = async list => {
      let next = 0;
      await Promise.all(Array.from({ length: 6 }, async () => { while (next < list.length) await load(list[next++]); }));
    };
    await run(jobs.filter(j => j.stage === 0));
    // the rest keeps arriving while he already moves; a missing image just means a coarser step
    rest = run(jobs.filter(j => j.stage > 0)).then(() => { figure.dataset.state = 'complete'; })
      .catch(error => console.warn('World animation stays on its first image set:', error.message));
    walker = new SmoothWalker(THINK, new VisualMetric(dense));
    canvas = document.createElement('canvas');
    [canvas.width, canvas.height] = manifest.size;
    canvas.id = 'world-character-frame';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', image.alt);
    context = canvas.getContext('2d');
    render();
    // The static <img> shows the same thinking frame at the same place, so this swap is invisible.
    image.replaceWith(canvas);
    ready = true; figure.dataset.state = 'ready'; update();
  }

  const observer = new IntersectionObserver(entries => {
    inView = entries[entries.length - 1].isIntersecting;
    if (inView) schedule(); else reset();
  }, { rootMargin: '100px' });
  observer.observe(stage);
  // Start decoding only as the page approaches, not during the hero intro.
  const early = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting) && !loading) {
      early.disconnect();
      loading = preload().catch(error => {
        stop(); figure.dataset.state = 'static';
        console.warn('World animation kept its static thinking frame:', error.message);
      });
    }
  }, { rootMargin: '900px 0px' });
  early.observe(stage);

  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); else schedule(); });
  reduced.addEventListener('change', schedule);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', schedule);
}

// 02 mouse play. The pointer works like a lamp: a soft light follows it, his floor shadow falls
// the other way and stretches, the photos near it lean toward it, and photos and figure shift a
// little in depth. Everything is CSS custom properties written once per frame; the browser does
// the moving on the GPU, so it costs almost nothing.
export function setupWorldLight(stage, figure, cards) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const tiles = cards.map(c => c.closest('.fan-card'));
  let pending = null;
  const apply = () => {
    const e = pending; pending = null;
    const b = stage.getBoundingClientRect();
    if (!e) {
      stage.style.setProperty('--lit', '0'); stage.style.setProperty('--px', '0'); stage.style.setProperty('--py', '0');
      figure.style.setProperty('--sx', '0px'); figure.style.setProperty('--ss', '1');
      tiles.forEach(t => { for (const v of ['--rx', '--ry', '--tx', '--ty']) t.style.removeProperty(v); });
      return;
    }
    const x = e.clientX - b.left, y = e.clientY - b.top;
    stage.style.setProperty('--mx', `${x}px`); stage.style.setProperty('--my', `${y}px`); stage.style.setProperty('--lit', '1');
    stage.style.setProperty('--px', ((x / b.width) * 2 - 1).toFixed(3)); stage.style.setProperty('--py', ((y / b.height) * 2 - 1).toFixed(3));
    const f = figure.getBoundingClientRect(), dx = (f.left + f.width / 2) - e.clientX;
    const lean = Math.max(-1, Math.min(1, dx / (b.width * 0.5)));
    figure.style.setProperty('--sx', `${(lean * 28).toFixed(1)}px`); figure.style.setProperty('--ss', (1 + Math.abs(lean) * 0.35).toFixed(3));
    for (const t of tiles) {
      const r = t.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const ddx = e.clientX - cx, ddy = e.clientY - cy, d = Math.hypot(ddx, ddy), reach = 360;
      if (d > reach) { for (const v of ['--rx', '--ry', '--tx', '--ty']) t.style.removeProperty(v); continue; }
      const k = 1 - d / reach;
      t.style.setProperty('--ry', `${(ddx / reach * 16 * k).toFixed(2)}deg`); t.style.setProperty('--rx', `${(-ddy / reach * 16 * k).toFixed(2)}deg`);
      t.style.setProperty('--tx', `${(ddx * 0.05 * k).toFixed(1)}px`); t.style.setProperty('--ty', `${(ddy * 0.05 * k).toFixed(1)}px`);
    }
  };
  const queue = e => { const first = pending === undefined || pending === null; pending = e; if (first) requestAnimationFrame(apply); };
  stage.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') queue(e); }, { passive: true });
  stage.addEventListener('pointerleave', () => queue(null));
}

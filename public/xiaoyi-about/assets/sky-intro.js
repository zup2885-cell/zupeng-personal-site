'use strict';

// Opening: looking up at the sky through a ring of clover and yellow flowers while a plane
// crosses; the camera then pushes through the opening into the cover page.
(() => {
  const root = document.documentElement;
  const intro = document.querySelector('#sky-intro');
  if (!intro) return;
  const canvas = intro.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const skip = intro.querySelector('.intro-skip');
  const main = document.querySelector('main');
  const header = document.querySelector('.topbar');
  const hero = document.querySelector('#top');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const HOLD = 450;
  let W = 0, H = 0, dpr = 1, sky, leaves = [], frame = 0, finished = false;
  let startedAt = 0, arrived = false;

  // Small deterministic random, so every visit draws the same composition.
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const buildSky = () => {
    sky = document.createElement('canvas');
    sky.width = W * dpr; sky.height = H * dpr;
    const g = sky.getContext('2d');
    g.scale(dpr, dpr);
    const gradient = g.createLinearGradient(0, 0, W * .3, H);
    gradient.addColorStop(0, '#1f5fae');
    gradient.addColorStop(.45, '#3d8ad6');
    gradient.addColorStop(1, '#9fd0f2');
    g.fillStyle = gradient;
    g.fillRect(0, 0, W, H);
    // Cumulus: many crisp puffs, bright on top and faintly blue-grey underneath.
    const cloud = (x, y, r, count) => {
      for (let pass = 0; pass < 2; pass++) {
        let cx = x, cy = y;
        seed = Math.round(x * 13 + y * 7) || 3;
        g.filter = `blur(${pass ? r * .015 : r * .06}px)`;
        for (let i = 0; i < count; i++) {
          const cr = r * (.16 + rand() * .22) * (1 - Math.abs(i / count - .5) * .8);
          const shade = g.createLinearGradient(0, cy - cr, 0, cy + cr);
          shade.addColorStop(0, pass ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,.7)');
          shade.addColorStop(.55, pass ? 'rgba(246,249,252,1)' : 'rgba(240,245,250,.6)');
          shade.addColorStop(1, pass ? 'rgba(196,212,228,1)' : 'rgba(200,215,232,.4)');
          g.fillStyle = shade;
          g.beginPath(); g.arc(cx, cy - (pass ? 0 : cr * .1), cr * (pass ? 1 : 1.15), 0, Math.PI * 2); g.fill();
          cx += r * (.06 + rand() * .1); cy += (rand() - .55) * r * .12;
        }
      }
      g.filter = 'none';
    };
    const r = Math.min(W, H);
    cloud(-W * .04, H * .33, r * .4, 18);
    cloud(W * .74, H * .6, r * .48, 22);
    cloud(W * .6, H * .2, r * .14, 9);
  };

  // Leaf and flower sprites at several light levels, drawn once and stamped many times.
  const SPRITE = 96;
  const sprites = {leaf: [], flower: []};
  const buildSprites = () => {
    const make = paint => {
      const c = document.createElement('canvas');
      c.width = c.height = SPRITE * 2;
      const g = c.getContext('2d');
      g.translate(SPRITE, SPRITE);
      paint(g, SPRITE * .9);
      return c;
    };
    for (let level = 0; level < 8; level++) {
      const light = level / 7;
      sprites.leaf.push(make((g, size) => {
        for (let k = 0; k < 3; k++) {
          g.save(); g.rotate(k * Math.PI * 2 / 3);
          const fill = g.createLinearGradient(0, 0, size, 0);
          fill.addColorStop(0, `hsl(${100 + light * 6} ${40 + light * 25}% ${8 + light * 22}%)`);
          fill.addColorStop(1, `hsl(${92 + light * 10} ${45 + light * 30}% ${14 + light * 34}%)`);
          g.fillStyle = fill;
          g.beginPath();
          g.moveTo(0, 0);
          g.bezierCurveTo(size * .5, -size * .62, size * 1.12, -size * .3, size * .96, 0);
          g.bezierCurveTo(size * 1.12, size * .3, size * .5, size * .62, 0, 0);
          g.fill();
          g.strokeStyle = `hsla(95 40% ${4 + light * 10}% / .55)`;
          g.lineWidth = size * .035; g.stroke();
          // Pale chevron that clover leaflets carry.
          g.strokeStyle = `hsla(80 50% ${30 + light * 45}% / ${.25 + light * .25})`;
          g.lineWidth = size * .05;
          g.beginPath(); g.moveTo(size * .62, -size * .2); g.lineTo(size * .42, 0); g.lineTo(size * .62, size * .2); g.stroke();
          g.restore();
        }
      }));
    }
    for (let level = 0; level < 5; level++) {
      const light = level / 4;
      sprites.flower.push(make((g, size) => {
        for (let k = 0; k < 5; k++) {
          const a = k * Math.PI * 2 / 5;
          g.save(); g.rotate(a);
          const petal = g.createRadialGradient(size * .2, 0, 0, size * .45, 0, size * .55);
          petal.addColorStop(0, `hsl(38 95% ${42 + light * 18}%)`);
          petal.addColorStop(1, `hsl(48 96% ${46 + light * 22}%)`);
          g.fillStyle = petal;
          g.beginPath(); g.ellipse(size * .46, 0, size * .46, size * .34, 0, 0, Math.PI * 2); g.fill();
          g.restore();
        }
        g.fillStyle = `hsl(25 85% ${26 + light * 14}%)`;
        g.beginPath(); g.arc(0, 0, size * .17, 0, Math.PI * 2); g.fill();
      }));
    }
  };
  buildSprites();

  // Clover and flowers around an elliptical opening; nearer the camera = bigger and darker.
  const buildLeaves = () => {
    seed = 7; leaves = [];
    const unit = Math.min(W, H) * .03;
    const area = W * H / 1e6;
    const add = (count, near, far, curve) => {
      for (let i = 0; i < count; i++) {
        const angle = rand() * Math.PI * 2;
        const d = near + Math.pow(rand(), curve) * (far - near);
        const sunny = Math.sin(angle) < 0 ? .1 : 0;
        const light = Math.max(0, Math.min(1, 1 - (d - .86) / .7 + sunny + (rand() - .5) * .3));
        leaves.push({
          angle, d, light,
          flower: d < 1.3 && rand() < .3,
          size: unit * (.6 + (d - .85) * 1.25) * (.75 + rand() * .55),
          spin: rand() * Math.PI * 2,
          phase: rand() * Math.PI * 2,
        });
      }
    };
    add(Math.round(420 * Math.min(1.6, area)), .9, 1.04, 1);
    add(Math.round(700 * Math.min(1.6, area)), .86, 1.22, 1.4);
    add(Math.round(520 * Math.min(1.6, area)), 1.12, 2.3, 1.3);
    leaves.sort((a, b) => a.d - b.d);
  };

  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = scene.width = W * dpr; canvas.height = scene.height = H * dpr;
    buildSky(); buildLeaves();
  };

  const leafPath = size => {
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI * 2 / 3;
      const c = Math.cos(a), s = Math.sin(a);
      const pt = (x, y) => [x * c - y * s, x * s + y * c];
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(...pt(size * .55, -size * .55), ...pt(size * 1.15, -size * .2), ...pt(size * .95, 0));
      ctx.bezierCurveTo(...pt(size * 1.15, size * .2), ...pt(size * .55, size * .55), 0, 0);
    }
  };
  const flowerPath = size => {
    for (let k = 0; k < 5; k++) {
      const a = k * Math.PI * 2 / 5;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * size * .42, Math.sin(a) * size * .42, size * .42, size * .3, a, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // The scene (sky, plane, foliage) is painted off-screen, then cut along the contrail.
  const scene = document.createElement('canvas');
  const sctx = scene.getContext('2d');
  const FLY = 1150, SPLIT = 700;
  let flyAt = Infinity, splitAt = Infinity;
  const easeInOut = x => x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
  // Flight path: left edge to right edge, gently descending through the middle of the sky.
  const path = () => ({ax: -W * .1, ay: H * .3, bx: W * 1.1, by: H * .5});

  const paintScene = (t, flight) => {
    const g = sctx;
    const cx = W * .5, cy = H * .42, rx = W * .56, ry = H * .3;
    const turn = (-1 + Math.min(t, 4) * .5) * Math.PI / 180;
    const zoom = 1.02 + Math.min(t, 4) * .012;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.save();
    g.translate(cx, cy); g.scale(zoom, zoom); g.rotate(turn * .5); g.translate(-cx, -cy);
    g.drawImage(sky, 0, 0, W, H);
    g.restore();

    // Plane and contrail: the contrail is exactly where the paper will be cut.
    if (flight > 0) {
      const {ax, ay, bx, by} = path();
      const px = ax + (bx - ax) * flight, py = ay + (by - ay) * flight;
      const trail = g.createLinearGradient(ax, ay, px, py);
      trail.addColorStop(0, 'rgba(255,255,255,.55)');
      trail.addColorStop(1, 'rgba(255,255,255,.98)');
      g.strokeStyle = trail; g.lineWidth = Math.max(2, W * .0026); g.lineCap = 'round';
      g.shadowColor = 'rgba(255,255,255,.85)'; g.shadowBlur = 7;
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(px, py); g.stroke();
      g.shadowBlur = 0;
      g.save();
      g.translate(px, py); g.rotate(Math.atan2(by - ay, bx - ax)); g.fillStyle = '#26303b';
      const p = Math.max(9, W * .013);
      g.beginPath(); g.ellipse(p * .2, 0, p * 1.3, p * .16, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(p * .4, 0); g.lineTo(-p * .15, -p * 1.05); g.lineTo(-p * .4, -p * 1.05); g.lineTo(-p * .05, 0);
      g.lineTo(-p * .4, p * 1.05); g.lineTo(-p * .15, p * 1.05); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-p * .75, 0); g.lineTo(-p * 1.05, -p * .42); g.lineTo(-p * 1.15, -p * .42); g.lineTo(-p, 0);
      g.lineTo(-p * 1.15, p * .42); g.lineTo(-p * 1.05, p * .42); g.closePath(); g.fill();
      g.restore();
    }

    g.save();
    g.translate(cx, cy); g.scale(zoom, zoom); g.rotate(turn); g.translate(-cx, -cy);
    g.fillStyle = '#0f1409';
    g.beginPath();
    g.rect(-W, -H, W * 3, H * 3);
    g.ellipse(cx, cy, rx * 1.02, ry * 1.02, 0, 0, Math.PI * 2);
    g.fill('evenodd');
    for (const leaf of leaves) {
      const sway = Math.sin(t * 1.7 + leaf.phase) * .06;
      const x = cx + Math.cos(leaf.angle) * rx * leaf.d;
      const y = cy + Math.sin(leaf.angle) * ry * leaf.d;
      g.save();
      g.translate(x, y); g.rotate(leaf.spin + sway);
      const sprite = leaf.flower ? sprites.flower[Math.round(leaf.light * 4)] : sprites.leaf[Math.round(leaf.light * 7)];
      const half = leaf.size * (leaf.flower ? .85 : 1.1);
      g.drawImage(sprite, -half, -half, half * 2, half * 2);
      g.restore();
    }
    g.restore();
    const vignette = g.createRadialGradient(cx, cy, Math.min(W, H) * .35, cx, cy, Math.max(W, H) * .8);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,.45)');
    g.fillStyle = vignette; g.fillRect(0, 0, W, H);
  };

  // Behind the plane the sheet is sheared open along the contrail, like paper parting behind
  // a pair of scissors; ahead of the plane it is still whole. Shearing (rather than rotating)
  // keeps the two halves joined exactly at the scissor tip.
  const drawPiece = (side, tx, ty, ux, uy, nx, ny, k, lift) => {
    const M = (W + H) * 3;
    const uT = ux * tx + uy * ty;
    const s = -side * k;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(nx * lift * side, ny * lift * side);
    ctx.transform(1 + s * nx * ux, s * ny * ux, s * nx * uy, 1 + s * ny * uy, -s * nx * uT, -s * ny * uT);
    // Soft shadow the lifted edge casts on the page underneath.
    const edge = () => { ctx.beginPath(); ctx.moveTo(tx - ux * M, ty - uy * M); ctx.lineTo(tx, ty); };
    ctx.save();
    ctx.shadowColor = 'rgba(30,8,0,.55)'; ctx.shadowBlur = 18; ctx.shadowOffsetX = nx * 6 * side; ctx.shadowOffsetY = ny * 6 * side;
    ctx.strokeStyle = 'rgba(30,8,0,.35)'; ctx.lineWidth = 6; edge(); ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - ux * M, ty - uy * M);
    ctx.lineTo(tx - ux * M + nx * M * side, ty - uy * M + ny * M * side);
    ctx.lineTo(tx + nx * M * side, ty + ny * M * side);
    ctx.closePath();
    ctx.clip();
    drawScene();
    // Freshly cut paper edge.
    ctx.strokeStyle = 'rgba(255,250,240,.9)'; ctx.lineWidth = 1.6; edge(); ctx.stroke();
    ctx.restore();
  };

  // Drawn a little oversized so the sheared halves never expose a bare edge of the screen.
  const drawScene = () => ctx.drawImage(scene, -W * .05, -H * .05, W * 1.1, H * 1.1);

  const draw = now => {
    const t = (now - startedAt) / 1000;
    const flight = Math.max(0, Math.min(1, (now - flyAt) / FLY));
    const split = Math.max(0, Math.min(1, (now - splitAt) / SPLIT));
    paintScene(t, flight > 0 ? easeInOut(flight) * .97 + .03 * flight : 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (flight <= 0) {
      drawScene();
    } else {
      const {ax, ay, bx, by} = path();
      const len = Math.hypot(bx - ax, by - ay);
      const ux = (bx - ax) / len, uy = (by - ay) / len;
      const nx = -uy, ny = ux;
      const f = easeInOut(flight) * .97 + .03 * flight;
      // Scissor tip trails just behind the plane's tail.
      const tip = Math.max(0, f * len - W * .025);
      const tx = ax + ux * tip, ty = ay + uy * tip;
      const sp = split * split * (3 - 2 * split);
      const k = .012 + .05 * flight + sp * .9;
      const lift = sp * sp * Math.max(W, H) * .9;
      // Ahead of the scissor tip the sheet is still uncut.
      const M = (W + H) * 3;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tx - nx * M, ty - ny * M); ctx.lineTo(tx + nx * M, ty + ny * M);
      ctx.lineTo(tx + nx * M + ux * M, ty + ny * M + uy * M); ctx.lineTo(tx - nx * M + ux * M, ty - ny * M + uy * M);
      ctx.closePath(); ctx.clip();
      drawScene();
      ctx.restore();
      drawPiece(-1, tx, ty, ux, uy, nx, ny, k, lift);
      drawPiece(1, tx, ty, ux, uy, nx, ny, k, lift);
      if (flight >= 1 && splitAt === Infinity) {
        splitAt = now;
        intro.dataset.phase = 'splitting';
        window.ChartSound?.paper?.(0);
      }
      if (!arrived && flight > .55) {
        arrived = true;
        root.classList.add('cover-revealing');
        hero.classList.add('paper-arrive');
      }
      if (split >= 1) { finish(); return; }
    }
    frame = requestAnimationFrame(draw);
  };

  const push = () => {
    if (finished || flyAt !== Infinity) return;
    intro.dataset.phase = 'cutting';
    intro.classList.add('cutting');
    flyAt = performance.now();
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    if (!arrived && root.classList.contains('ticket-intro-ready') && !(location.hash && location.hash !== '#top')) {
      root.classList.add('cover-revealing');
      hero.classList.add('paper-arrive');
    }
    root.classList.remove('ticket-intro-ready');
    intro.setAttribute('aria-hidden', 'true');
    root.dataset.introState = 'complete';
    root.dataset.introDuration = startedAt ? (performance.now() - startedAt).toFixed(0) : '0';
    main.inert = false; header.inert = false;
    removeEventListener('resize', resize);
  };

  skip.addEventListener('click', event => { event.stopPropagation(); finish(); });
  intro.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); finish(); }
  });
  reduced.addEventListener('change', event => { if (event.matches) finish(); });

  const begin = async () => {
    root.dataset.introState = 'ready';
    main.inert = true; header.inert = true;
    resize();
    addEventListener('resize', resize);
    startedAt = performance.now();
    frame = requestAnimationFrame(draw);
    // With audio allowed, push through on its own. If the browser blocks sound, the sky keeps
    // playing until the first touch, so the whoosh always accompanies the push.
    const audible = await (window.ChartSound?.activateIfAllowed() ?? Promise.resolve(true));
    if (finished) return;
    if (audible) { setTimeout(push, Math.max(0, HOLD - (performance.now() - startedAt))); return; }
    intro.dataset.phase = 'waiting';
    const go = event => {
      if (event.target.closest?.('.intro-skip')) return;
      if (event.type === 'keydown' && ['Tab', 'Escape'].includes(event.key)) return;
      intro.removeEventListener('pointerdown', go);
      intro.removeEventListener('keydown', go);
      window.ChartSound?.unlock(true).then(push);
    };
    intro.addEventListener('pointerdown', go);
    intro.addEventListener('keydown', go);
    intro.focus({preventScroll: true});
  };

  if (root.classList.contains('ticket-intro-ready') && !reduced.matches) begin();
  else { finish(); root.dataset.introState = 'skipped'; }
})();

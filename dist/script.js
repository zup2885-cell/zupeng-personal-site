const stage = document.querySelector('.orbit-stage');
const orbitCards = [...document.querySelectorAll('.orbit-card')];
const sizeInput = document.getElementById('orbit-size');
const roundInput = document.getElementById('orbit-round');
const motionButton = document.querySelector('.motion-toggle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let angle = -.5;
let layout = 'ring';
let paused = reducedMotion.matches;
let interacting = false;
let stageVisible = true;
let lastTime = 0;
let frameId = 0;
let stageWidth = stage.clientWidth;
let stageHeight = stage.clientHeight;
function renderOrbit() {
  const size = Number(sizeInput.value) / 100;
  const cardWidth = orbitCards[0].offsetWidth;
  const radiusX = Math.max(50, (stageWidth - cardWidth * 1.3) / 2);
  const radiusY = Math.max(80, (stageHeight - 160) / 2);
  orbitCards.forEach((card, i) => {
    let x, y, scale, rotate, depth;
    if (layout === 'ring') {
      const t = angle + i * Math.PI * 2 / orbitCards.length;
      depth = (Math.sin(t) + 1) / 2;
      x = Math.sin(t) * radiusX;
      y = Math.cos(t) * radiusY;
      scale = (.46 + depth * .57) * size;
      rotate = Math.cos(t) * 7;
    } else {
      const narrow = stageWidth < 450;
      const columns = narrow ? 3 : 4;
      const rows = Math.ceil(orbitCards.length / columns);
      scale = Math.min(.82, (stageWidth - 20) / (columns * cardWidth + (columns - 1) * 13)) * size;
      const stepX = stageWidth / columns;
      const stepY = (stageHeight - 12) / rows;
      const row = Math.floor(i / columns);
      const items = Math.min(columns, orbitCards.length - row * columns);
      x = (i % columns - (items - 1) / 2) * stepX;
      y = (row - (rows - 1) / 2) * stepY;
      rotate = (i % 2 ? 1 : -1) * 3;
      depth = .5;
    }
    card.style.transform = `translate3d(${x}px,${y}px,0) rotate(${rotate}deg) scale(${scale})`;
    card.style.zIndex = String(Math.round(depth * 100));
  });
}
function updateMotionButton() {
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.setAttribute('aria-label', paused ? '播放照片旋转' : '暂停照片旋转');
  motionButton.querySelector('.motion-icon').textContent = paused ? '▷' : 'Ⅱ';
  motionButton.querySelector('.motion-label').textContent = paused ? '播放' : '暂停';
  motionButton.hidden = layout === 'spread';
}
function tick(time) {
  if (stageVisible && !paused && !interacting && layout === 'ring' && lastTime && !document.hidden) {
    angle += Math.min(time - lastTime, 40) * .00018;
    renderOrbit();
  }
  lastTime = time;
  frameId = requestAnimationFrame(tick);
}
function setPaused(value) { paused = value; updateMotionButton(); }
motionButton.addEventListener('click', () => setPaused(!paused));
stage.addEventListener('pointerenter', () => { interacting = true; });
stage.addEventListener('pointerleave', () => { interacting = false; });
stage.addEventListener('focusin', () => { interacting = true; });
stage.addEventListener('focusout', event => { if (!stage.contains(event.relatedTarget)) interacting = false; });
document.querySelectorAll('[data-layout]').forEach(button => {
  button.addEventListener('click', () => {
    layout = button.dataset.layout;
    document.querySelectorAll('[data-layout]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.querySelector('.orbit-center').hidden = layout === 'spread';
    updateMotionButton();
    renderOrbit();
  });
});
sizeInput.addEventListener('input', renderOrbit);
roundInput.addEventListener('input', () => orbitCards.forEach(card => card.style.setProperty('--card-round', `${roundInput.value}%`)));
new ResizeObserver(() => { stageWidth = stage.clientWidth; stageHeight = stage.clientHeight; renderOrbit(); }).observe(stage);
reducedMotion.addEventListener('change', event => { if (event.matches) setPaused(true); });
new IntersectionObserver(([entry]) => { stageVisible = entry.isIntersecting; }, {rootMargin:'100px'}).observe(stage);
const hero = document.querySelector('.hero');
const eyes = document.querySelector('.eyes');
hero.addEventListener('pointermove', event => {
  if (reducedMotion.matches || event.pointerType === 'touch') return;
  const bounds = eyes.getBoundingClientRect();
  const x = Math.max(-10, Math.min(10, (event.clientX - bounds.left - bounds.width / 2) / 35));
  const y = Math.max(-18, Math.min(3, (event.clientY - bounds.top - bounds.height / 2) / 24));
  eyes.style.setProperty('--eye-x', `${x}px`);
  eyes.style.setProperty('--eye-y', `${y}px`);
});
hero.addEventListener('pointerleave', () => { eyes.style.setProperty('--eye-x','0px');eyes.style.setProperty('--eye-y','0px'); });
updateMotionButton();renderOrbit();frameId = requestAnimationFrame(tick);
const messages = { sky:'听着《海阔天空》，提醒自己保持热爱，继续探索。', glory:'《光辉岁月》里那份坚持，是我喜欢 Beyond 的理由之一。' };
document.querySelectorAll('[data-song]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-song]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  document.getElementById('song-note').textContent = messages[button.dataset.song];
}));

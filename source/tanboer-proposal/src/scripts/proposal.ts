const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const filmDialog = document.querySelector<HTMLDialogElement>('.film-dialog')!;
const filmVideo = filmDialog.querySelector<HTMLVideoElement>('.proposal-film')!;
const filmTrigger = document.querySelector<HTMLButtonElement>('.film-trigger')!;
const filmStatus = filmDialog.querySelector<HTMLParagraphElement>('.film-status')!;
let overflowBeforeFilm = '';
const hero = document.querySelector<HTMLElement>('.hero')!;
const heroDepth = hero.querySelector<HTMLElement>('.hero-depth')!;
const heroCopy = hero.querySelector<HTMLElement>('.hero-copy')!;
const video = document.querySelector<HTMLVideoElement>('.hero-video')!;
const motionButton = document.querySelector<HTMLButtonElement>('.motion-toggle')!;
const motionLabel = motionButton.querySelector('.motion-label')!;
const motionIcon = motionButton.querySelector('.motion-icon')!;
let wantsMotion = !reduceMotion.matches;
let heroVisible = true;
const syncPlayback = () => {
  const active = wantsMotion && heroVisible && !document.hidden && !filmDialog.open;
  hero.classList.toggle('motion-paused', !active);
  heroDepth.style.willChange = active && !reduceMotion.matches ? 'transform' : 'auto';
  if (active) {
    video.muted = true;
    video.play().catch(() => { updateMotionControl(); });
  } else video.pause();
};
function updateMotionControl() {
  const playing = !video.paused;
  motionButton.setAttribute('aria-pressed', String(playing));
  motionButton.setAttribute('aria-label', playing ? '暂停雪山动画' : '播放雪山动画');
  motionLabel.textContent = playing ? '暂停动态' : '播放动态';
  motionIcon.textContent = playing ? 'Ⅱ' : '▶';
}
video.addEventListener('playing', () => {
  if (!wantsMotion || !heroVisible || document.hidden || filmDialog.open) { video.pause(); return; }
  video.classList.add('ready');
  updateMotionControl();
  scheduleHeroFrame();
});
video.addEventListener('pause', updateMotionControl);
video.addEventListener('error', () => { video.classList.remove('ready'); wantsMotion = false; updateMotionControl(); });
motionButton.addEventListener('click', () => { wantsMotion = video.paused; syncPlayback(); });
reduceMotion.addEventListener('change', () => { wantsMotion = !reduceMotion.matches; syncPlayback(); scheduleHeroFrame(); });
document.addEventListener('visibilitychange', syncPlayback);
new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting && entry.intersectionRatio > .01; syncPlayback(); scheduleHeroFrame(); }, { threshold: [0, .01] }).observe(hero);

// Native scrolling controls a bounded depth offset; no pinned scroll or continuous RAF loop.
let heroFrame = 0;
function scheduleHeroFrame() {
  if (heroFrame) return;
  heroFrame = requestAnimationFrame(() => {
    heroFrame = 0;
    if (reduceMotion.matches) {
      heroDepth.style.transform = '';
      heroCopy.style.transform = '';
      heroCopy.style.opacity = '';
      return;
    }
    if (!heroVisible || !wantsMotion || document.hidden) return;
    const rect = hero.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -rect.top / rect.height));
    heroDepth.style.transform = `translate3d(0,${progress * rect.height * .14}px,0) scale(${1 + progress * .045})`;
    heroCopy.style.transform = `translate3d(0,${-progress * 65}px,0)`;
    heroCopy.style.opacity = String(Math.max(0, 1 - progress * 1.55));
  });
}
window.addEventListener('scroll', scheduleHeroFrame, { passive: true });
window.addEventListener('resize', scheduleHeroFrame, { passive: true });

filmTrigger.addEventListener('click', () => {
  overflowBeforeFilm = document.body.style.overflow;
  filmStatus.hidden = true;
  filmDialog.showModal();
  document.body.style.overflow = 'hidden';
  syncPlayback();
  if (filmVideo.readyState >= 1) filmVideo.currentTime = 0;
  filmVideo.play().catch(() => {
    filmStatus.textContent = filmVideo.error ? '视频暂时无法播放，请刷新页面后重试' : '点击播放器中的播放按钮开始放映';
    filmStatus.hidden = false;
  });
});
filmVideo.addEventListener('playing', () => { filmStatus.hidden = true; });
filmVideo.addEventListener('error', () => { filmStatus.textContent = '视频暂时无法播放，请刷新页面后重试'; filmStatus.hidden = false; });
filmDialog.querySelector('.film-close')!.addEventListener('click', () => filmDialog.close());
filmDialog.addEventListener('click', event => {
  if (event.target !== filmDialog) return;
  const r = filmDialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) filmDialog.close();
});
filmDialog.addEventListener('close', () => {
  filmVideo.pause();
  document.body.style.overflow = overflowBeforeFilm;
  filmTrigger.focus({ preventScroll: true });
  syncPlayback();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) filmVideo.pause(); });

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      if (!reduceMotion.matches) entry.target.classList.add('reveal-arrived');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .12 });
document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));

const navLinks = document.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]');
const chapterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) navLinks.forEach(link => link.setAttribute('aria-current', String(link.dataset.chapterLink === entry.target.id)));
  });
}, { rootMargin: '-30% 0px -55% 0px' });
document.querySelectorAll('.chapter').forEach(el => chapterObserver.observe(el));

const dialog = document.querySelector<HTMLDialogElement>('.lightbox')!;
const dialogImage = dialog.querySelector('img')!;
let dialogTrigger: HTMLButtonElement | null = null;
document.querySelectorAll<HTMLButtonElement>('.gallery-item').forEach(button => button.addEventListener('click', () => {
  dialogTrigger = button;
  dialogImage.src = button.dataset.image!;
  dialogImage.alt = button.querySelector('img')!.alt;
  dialog.querySelector('p')!.textContent = button.dataset.caption!;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}));
dialog.querySelector('button')!.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
dialog.addEventListener('close', () => { document.body.style.overflow = ''; dialogTrigger?.focus({ preventScroll: true }); });

const presentButton = document.querySelector<HTMLButtonElement>('.present-toggle')!;
const presentControls = document.querySelector<HTMLElement>('.present-controls')!;
const presentationSections = [...document.querySelectorAll<HTMLElement>('#home,#intro,#strategy,.chapter,#inspiration')];
let presenting = false;
function setPresentation(value: boolean) {
  presenting = value;
  document.body.classList.toggle('presentation', value);
  presentControls.hidden = !value;
  presentButton.setAttribute('aria-pressed', String(value));
  presentButton.innerHTML = value ? '退出演示 <span aria-hidden="true">↙</span>' : '演示模式 <span aria-hidden="true">↗</span>';
  if (value) presentControls.querySelector<HTMLButtonElement>('button')!.focus({ preventScroll: true });
}
function currentSectionIndex() {
  const at = window.innerHeight * .45;
  let index = 0;
  presentationSections.forEach((section,i) => { if (section.getBoundingClientRect().top <= at) index = i; });
  return index;
}
function goSection(direction: number) {
  const target = presentationSections[Math.max(0,Math.min(presentationSections.length - 1,currentSectionIndex() + direction))];
  target.scrollIntoView({ behavior: reduceMotion.matches ? 'instant' : 'smooth', block: 'start' });
}
presentButton.addEventListener('click', () => setPresentation(!presenting));
document.querySelector('.exit-present')!.addEventListener('click', () => setPresentation(false));
document.querySelector('.previous-section')!.addEventListener('click', () => goSection(-1));
document.querySelector('.next-section')!.addEventListener('click', () => goSection(1));
document.addEventListener('keydown', event => {
  if (!presenting || dialog.open || filmDialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'Escape') { setPresentation(false); return; }
  if (event.key === 'ArrowDown' || event.key === 'PageDown') { event.preventDefault(); goSection(1); }
  if (event.key === 'ArrowUp' || event.key === 'PageUp') { event.preventDefault(); goSection(-1); }
});
let scrollScheduled = false;
window.addEventListener('scroll', () => {
  if (scrollScheduled || !presenting) return;
  scrollScheduled = true;
  requestAnimationFrame(() => {
    const section = presentationSections[currentSectionIndex()];
    document.querySelector('.present-label')!.textContent = section.dataset.sectionName || (section.id === 'home' ? '首页' : section.id === 'intro' ? '开场思路' : section.id === 'strategy' ? '整体思路' : '视觉灵感');
    scrollScheduled = false;
  });
}, { passive: true });

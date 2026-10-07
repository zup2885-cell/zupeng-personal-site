import { useEffect, useId, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

const stories = [
  { file: 'portrait.jpg', title: '你好，我是祖朋', short: '关于我', en: 'THE PERSON', href: '#about' },
  { file: 'marine.jpg', title: '向海而行的日子', short: '军旅', en: 'THE MARINE YEARS', href: '#service' },
  { file: 'court.jpg', title: '球场上，随时见', short: '运动', en: 'ALWAYS IN MOTION', href: '#sports' },
  { file: 'fitness.jpg', title: '再来一次，再强一点', short: '健身', en: 'A LITTLE STRONGER', href: '#sports' },
  { file: 'beyond-original.jpg', title: 'Beyond，经典永流传', short: '音乐', en: 'THE SOUNDTRACK', href: '#music' },
  { file: 'book-namiya.jpg', title: '在细节里，寻找真相', short: '阅读', en: 'BETWEEN THE LINES', href: '#reading' },
  { file: 'guiyang.jpg', title: '从爽爽的贵阳出发', short: '家乡', en: 'WHERE IT ALL BEGAN', href: '#hometown' },
];
const count = stories.length;
const wrap = (n: number) => ((n % count) + count) % count;
const relativeTo = (index: number, phase: number) => wrap(index - phase + count / 2) - count / 2;

function SmallArrow({ left = false }: { left?: boolean }) {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ transform: left ? 'rotate(180deg)' : undefined }}><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ChromeStar() {
  const id = useId();
  return <svg viewBox="0 0 120 120" aria-hidden="true" className="chrome-star"><defs><linearGradient id={id} x1=".1" y1="0" x2=".9" y2="1"><stop stopColor="#f2f9ff" /><stop offset=".22" stopColor="#43596a" /><stop offset=".4" stopColor="#c5d8e9" /><stop offset=".5" stopColor="#172432" /><stop offset=".64" stopColor="#758897" /><stop offset=".85" stopColor="#e6f3fd" /><stop offset="1" stopColor="#1b2934" /></linearGradient></defs><path d="M60 4C64 48 72 54 116 60C72 65 65 74 60 116C55 74 47 66 4 60C47 54 55 47 60 4Z" fill={`url(#${id})`} stroke="#aabfcf" strokeWidth=".5" /><path d="M60 5L60 60L115 60M60 60L60 115M60 60L5 60" fill="none" stroke="#d2e6f4" strokeOpacity=".4" strokeWidth=".6" /></svg>;
}

export default function MotionHero() {
  const hero = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const stars = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const state = useRef({ phase: 0, target: null as number | null, width: 1200, paused: false, reduced: false, hovered: false, focused: false, dragging: false, suppressClickUntil: 0 });
  const gesture = useRef<{ id: number; x: number; startPhase: number; lastX: number; time: number; velocity: number; moved: boolean } | null>(null);
  const current = stories[active];

  useEffect(() => {
    const pref = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(pref.matches);
    change(); pref.addEventListener('change', change);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    if (hero.current) observer.observe(hero.current);
    return () => { pref.removeEventListener('change', change); observer.disconnect(); };
  }, []);

  useEffect(() => {
    state.current.paused = paused;
    state.current.reduced = reduced;
    const updateVideo = () => {
      if (paused || reduced || !visible || document.hidden) video.current?.pause();
      else video.current?.play().catch(() => { /* The static poster remains visible if autoplay is unavailable. */ });
    };
    updateVideo(); document.addEventListener('visibilitychange', updateVideo);
    return () => document.removeEventListener('visibilitychange', updateVideo);
  }, [paused, reduced, visible]);

  useEffect(() => {
    const element = hero.current;
    if (!element) return;
    let frame = 0, lastTime = 0, lastActive = -1, lastPhase = NaN, lastWidth = 0;
    const resize = new ResizeObserver(([entry]) => { state.current.width = entry.contentRect.width; });
    resize.observe(element);

    function draw(now: number) {
      const s = state.current;
      const dt = Math.min(lastTime ? now - lastTime : 16, 48);
      lastTime = now;
      if (s.target !== null && !s.dragging) {
        s.phase += (s.target - s.phase) * (s.reduced ? 1 : 1 - Math.exp(-dt / 160));
        if (Math.abs(s.target - s.phase) < .0005) { s.phase = s.target; s.target = null; }
      } else if (!s.paused && !s.reduced && !s.hovered && !s.focused && !s.dragging) s.phase += dt * .000075;

      const small = s.width < 768;
      const spacing = small ? 188 : Math.min(290, s.width * .205);
      const paint = (el: HTMLElement | null, relative: number, accent = false) => {
        if (!el) return;
        const distance = Math.abs(relative);
        const x = relative * spacing;
        const y = -Math.pow(distance, 1.65) * (small ? 6 : 14);
        const z = -distance * (small ? 35 : 55);
        const angle = Math.max(-44, Math.min(44, -relative * 15));
        el.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateY(${angle}deg)${accent ? ` rotateZ(${relative * 22}deg)` : ''}`;
        el.style.opacity = String(Math.max(0, 1 - distance * (accent ? .19 : .21)));
        el.style.zIndex = String(20 - Math.round(distance * 3));
      };
      if (s.phase !== lastPhase || s.width !== lastWidth) {
        cards.current.forEach((el, i) => paint(el, relativeTo(i, s.phase)));
        stars.current.forEach((el, i) => paint(el, relativeTo(i * 2 + .5, s.phase), true));
        lastPhase = s.phase; lastWidth = s.width;
      }
      const next = wrap(Math.round(s.target ?? s.phase));
      if (next !== lastActive) { lastActive = next; setActive(next); }
      frame = requestAnimationFrame(draw);
    }
    const resume = () => {
      cancelAnimationFrame(frame); lastTime = 0;
      if (visible && !document.hidden) frame = requestAnimationFrame(draw);
    };
    resume(); document.addEventListener('visibilitychange', resume);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); document.removeEventListener('visibilitychange', resume); };
  }, [visible]);

  function select(index: number) {
    setPaused(true);
    const s = state.current;
    s.target = s.phase + relativeTo(index, s.phase);
    setActive(index);
  }
  function step(direction: number) {
    setPaused(true);
    state.current.target = Math.round(state.current.target ?? state.current.phase) + direction;
    setActive(wrap(state.current.target));
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    gesture.current = { id: event.pointerId, x: event.clientX, startPhase: state.current.phase, lastX: event.clientX, time: performance.now(), velocity: 0, moved: false };
    state.current.target = null;
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || event.pointerId !== g.id) return;
    const distance = event.clientX - g.x;
    if (!g.moved && Math.abs(distance) > 7) { g.moved = true; event.currentTarget.setPointerCapture(event.pointerId); setPaused(true); }
    if (!g.moved) return;
    state.current.dragging = true;
    const spacing = state.current.width < 768 ? 188 : Math.min(290, state.current.width * .205);
    const now = performance.now();
    g.velocity = (g.lastX - event.clientX) / spacing / Math.max(8, now - g.time) * 1000;
    g.lastX = event.clientX; g.time = now;
    state.current.phase = g.startPhase - distance / spacing;
  }
  function pointerEnd(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    if (g.moved) {
      state.current.target = Math.round(state.current.phase + Math.max(-1.1, Math.min(1.1, g.velocity * .12)));
      state.current.suppressClickUntil = performance.now() + 250;
    }
    state.current.dragging = false; gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <section id="home" ref={hero} className="motion-hero" aria-labelledby="motion-title">
    <video ref={video} className="motion-earth" autoPlay muted playsInline loop preload="metadata" poster="./assets/serene-poster.jpg" aria-hidden="true"><source src="./assets/serene-background.mp4" type="video/mp4" /></video>
    <div className="motion-vignette" aria-hidden="true" />
    <div className="motion-copy">
      <p className="motion-kicker"><span /> 祖朋的个人空间 <span className="kicker-slash">/</span> GUIYANG, CHINA</p>
      <h1 id="motion-title">认真做事，自由生活。<em>More than one story.</em></h1>
      <p className="motion-intro">你好，我是祖朋。带着军人的坚定，也带着对世界的好奇。</p>
      <div className="motion-topic" aria-live={paused ? 'polite' : 'off'} onMouseEnter={() => { state.current.hovered = true; }} onMouseLeave={() => { state.current.hovered = false; }}><span className="topic-star"><ChromeStar /></span><a href={current.href} key={active} onFocus={() => setPaused(true)}><span>{current.title}</span><SmallArrow /></a></div>
      <div className="topic-switcher" role="group" aria-label="选择想了解的生活主题">{[0, 1, 2, 4, 5, 6].map(i => <button key={i} type="button" aria-pressed={active === i || (i === 2 && active === 3)} onClick={() => select(i)}>{stories[i].short}</button>)}</div>
    </div>

    <div id="stories" className="motion-stage" tabIndex={0} role="group" aria-roledescription="轮播图" aria-label="立体照片画廊，可拖动或使用左右方向键" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onMouseEnter={() => { state.current.hovered = true; }} onMouseLeave={() => { state.current.hovered = false; }} onFocusCapture={() => { state.current.focused = true; }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) state.current.focused = false; }} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1); } }}>
      <div className="motion-track">{stories.map((story, i) => <button ref={el => { cards.current[i] = el; }} key={story.file} type="button" className={`motion-card ${active === i ? 'is-selected' : ''}`} style={{ transform: `translate3d(${relativeTo(i, 0) * 246}px,0,0)` }} aria-label={`选择照片：${story.short}`} aria-pressed={active === i} onClick={() => { if (performance.now() > state.current.suppressClickUntil) select(i); }}><img src={`./assets/${story.file}`} alt={story.title} draggable={false} loading="eager" /><span className="motion-card-info"><span>{story.short}</span><small>0{i + 1} / {story.en}</small></span></button>)}
        {[0, 1, 2].map(i => <div className="motion-accent" ref={el => { stars.current[i] = el; }} key={i} aria-hidden="true"><ChromeStar /></div>)}
      </div>
    </div>

    <div className="motion-rail">
      <span className="rail-hint"><span className="drag-mark" aria-hidden="true">↔</span> 拖动照片，探索我的另一面</span>
      <div className="motion-controls"><button type="button" aria-label="上一张照片" onClick={() => step(-1)}><SmallArrow left /></button><span className="motion-count">0{active + 1}<span> / 07</span></span><button type="button" aria-label="下一张照片" onClick={() => step(1)}><SmallArrow /></button><button className="motion-toggle" type="button" aria-label={paused || reduced ? '播放动态' : '暂停动态'} aria-pressed={paused || reduced} disabled={reduced} onClick={() => { state.current.target = null; setPaused(value => !value); }}>{paused || reduced ? '▷' : 'Ⅱ'}</button></div>
      <a className="motion-more" href={current.href}>阅读这段故事 <SmallArrow /></a>
    </div>
    <div className="motion-footer"><span>DISCIPLINE. CURIOSITY. EVERYDAY.</span><a href="#perspective">继续向下探索 <span aria-hidden="true">↓</span></a><span>PERSONAL ARCHIVE — 2026</span></div>
  </section>;
}

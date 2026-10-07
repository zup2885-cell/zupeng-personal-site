import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';

const stars = Array.from({ length: 54 }, (_, i) => ({ x: (i * 37.73 + 11) % 100, y: (i * 19.31 + 7) % 72, size: i % 9 === 0 ? 2.5 : i % 3 === 0 ? 1.7 : 1, delay: -(i % 11), duration: 4 + i % 7 }));

export default function EarthOpening() {
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update(); media.addEventListener('change', update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio > .12), { threshold: [0, .12] });
    if (section.current) observer.observe(section.current);
    return () => { media.removeEventListener('change', update); observer.disconnect(); };
  }, []);
  useEffect(() => {
    const update = () => {
      setHidden(document.hidden);
      if (paused || reduced || !visible || document.hidden) video.current?.pause();
      else video.current?.play().catch(() => { /* Preserve the earth poster when autoplay is unavailable. */ });
    };
    update(); document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, [paused, reduced, visible]);
  const pointerFrame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(pointerFrame.current), []);
  function move(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' || reduced || paused) return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = requestAnimationFrame(() => {
      const box = section.current?.getBoundingClientRect();
      if (!box || !section.current) return;
      section.current.style.setProperty('--space-x', `${(clientX / box.width - .5) * 18}px`);
      section.current.style.setProperty('--space-y', `${((clientY - box.top) / box.height - .5) * 12}px`);
    });
  }
  return <section id="home" ref={section} className={`earth-opening ${paused || reduced || !visible || hidden ? 'space-paused' : ''}`} aria-label="地球动画开场" onPointerMove={move} onPointerLeave={() => { cancelAnimationFrame(pointerFrame.current); section.current?.style.setProperty('--space-x', '0px'); section.current?.style.setProperty('--space-y', '0px'); }}>

    <video ref={video} autoPlay muted playsInline loop preload="auto" poster="./assets/serene-poster.jpg" aria-hidden="true"><source src="./assets/serene-background.mp4" type="video/mp4" /></video>
    <div className="opening-shade" aria-hidden="true" />
    <div className="space-depth" aria-hidden="true"><div className="space-nebula" /><div className="space-stars">{stars.map((star, i) => <i key={i} style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size, '--twinkle-delay': `${star.delay}s`, '--twinkle-time': `${star.duration}s` } as CSSProperties} />)}</div><div className="space-orbit"><i /></div><div className="space-airglow" /><div className="space-sunrise"><i /></div></div>
    <span className="space-coordinate" aria-hidden="true">EARTH / OUR LITTLE BLUE WORLD</span>
    <button className="meteor-wish" type="button" onClick={() => window.dispatchEvent(new Event('zupeng:meteor'))} aria-label="划过一颗流星">许个愿 ↗</button>
    <button className="opening-pause" type="button" disabled={reduced} aria-pressed={paused || reduced} onClick={() => { const next = !paused; setPaused(next); window.dispatchEvent(new CustomEvent('zupeng:space-pause', { detail: next })); }}>{paused || reduced ? '▷ 播放开场' : 'Ⅱ 暂停开场'}</button>
    <a className="opening-enter" href="#explore"><span>向下探索</span><span aria-hidden="true">↓</span></a>
  </section>;
}

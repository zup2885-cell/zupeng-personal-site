import { useEffect, useRef, useState } from 'react';

export default function EarthOpening() {
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
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
      if (paused || reduced || !visible || document.hidden) video.current?.pause();
      else video.current?.play().catch(() => { /* Preserve the earth poster when autoplay is unavailable. */ });
    };
    update(); document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, [paused, reduced, visible]);
  return <section id="home" ref={section} className="earth-opening" aria-label="地球动画开场">
    <video ref={video} autoPlay muted playsInline loop preload="auto" poster="./assets/serene-poster.jpg" aria-hidden="true"><source src="./assets/serene-background.mp4" type="video/mp4" /></video>
    <div className="opening-shade" aria-hidden="true" />
    <button className="opening-pause" type="button" disabled={reduced} aria-pressed={paused || reduced} onClick={() => setPaused(value => !value)}>{paused || reduced ? '▷ 播放地球' : 'Ⅱ 暂停地球'}</button>
    <a className="opening-enter" href="#explore"><span>向下探索</span><span aria-hidden="true">↓</span></a>
  </section>;
}

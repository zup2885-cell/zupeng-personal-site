import { useEffect, useState } from 'react';

export default function Atmosphere() {
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [wish, setWish] = useState(0);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    const pauseOpening = (event: Event) => setPaused(Boolean((event as CustomEvent<boolean>).detail));
    const summon = () => { setPaused(false); setWish(value => value + 1); };
    update(); document.addEventListener('visibilitychange', update);
    window.addEventListener('zupeng:meteor', summon);
    window.addEventListener('zupeng:space-pause', pauseOpening);
    return () => { document.removeEventListener('visibilitychange', update); window.removeEventListener('zupeng:meteor', summon); window.removeEventListener('zupeng:space-pause', pauseOpening); };
  }, []);
  return <>
    <div className={`ambient-sky ${paused || hidden ? 'is-paused' : ''}`} aria-hidden="true"><i /><i /><i /><i /><i />{wish > 0 && <i key={`wish-${wish}`} className="wish-meteor" />}</div>
    <button type="button" className="sky-toggle" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? '✦ 开启流星' : '✦ 暂停流星'}</button>
  </>;
}

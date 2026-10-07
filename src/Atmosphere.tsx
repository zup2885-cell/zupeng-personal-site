import { useEffect, useState } from 'react';

export default function Atmosphere() {
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update(); document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return <>
    <div className={`ambient-sky ${paused || hidden ? 'is-paused' : ''}`} aria-hidden="true"><i /><i /><i /></div>
    <button type="button" className="sky-toggle" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? '✦ 开启流星' : '✦ 暂停流星'}</button>
  </>;
}

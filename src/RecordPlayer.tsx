import { useRef, useState } from 'react';
import tracks from './music-tracks.json';

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function RecordPlayer() {
  const audio = useRef<HTMLAudioElement>(null);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(.65);
  const [error, setError] = useState('');
  const request = useRef(0);
  const track = tracks[selected];

  async function play() {
    const id = ++request.current;
    setError(''); setLoading(true);
    try { await audio.current?.play(); }
    catch { if (id === request.current) { setLoading(false); setError('试听暂时未能加载，请重试或前往官方平台收听。'); } }
  }
  function choose(index: number) {
    if (index === selected) return;
    ++request.current;
    audio.current?.pause();
    setPlaying(false); setSelected(index); setElapsed(0); setDuration(0); setLoading(false); setError('');
  }
  function toggle() {
    if (!audio.current) return;
    if (!audio.current.paused || loading) { ++request.current; audio.current.pause(); setLoading(false); }
    else void play();
  }
  return <section className={`record-player ${playing ? 'is-playing' : ''}`} aria-label="Beyond 黑胶唱片试听">
    <audio ref={audio} src={track.preview} preload="none" onPlaying={() => { setPlaying(true); setLoading(false); }} onPause={() => setPlaying(false)} onWaiting={() => { setPlaying(false); setLoading(true); }} onEnded={() => { setPlaying(false); setLoading(false); }} onError={() => { setPlaying(false); setLoading(false); setError('试听暂时未能加载，请重试或前往官方平台收听。'); }} onTimeUpdate={event => setElapsed(event.currentTarget.currentTime)} onLoadedMetadata={event => { setDuration(event.currentTarget.duration); event.currentTarget.volume = volume; }} />
    <div className="turntable" aria-hidden="true">
      <span className="deck-label">THE BLUE ROOM <small>33⅓ RPM / STEREO</small></span>
      <div className="record-platter"><div className="vinyl"><div className="vinyl-label"><img src={`./assets/${track.cover}`} alt="" /><span>BEYOND</span><i /></div></div></div>
      <div className="tonearm"><i /><span /></div>
      <span className="deck-light" /><span className="deck-signature">Sound memories.</span>
    </div>
    <div className="record-console">
      <p className="eyebrow">ON THE RECORD / 私藏唱片</p>
      <h4>总有一首，<br /><em>唱出心中的辽阔。</em></h4>
      <div className="record-tracks" role="group" aria-label="选择 Beyond 歌曲">{tracks.map((song, index) => <button type="button" key={song.title} aria-pressed={selected === index} onClick={() => choose(index)}><span className="track-index">0{index + 1}</span><span><strong>{index === 0 ? '海阔天空' : '光辉岁月'}</strong><small>BEYOND · {song.year}</small></span><span className="track-indicator">{selected === index ? '●' : '↗'}</span></button>)}</div>
      <p className="record-note">{track.note}</p>
      <div className="record-transport"><button type="button" className="record-play" onClick={toggle} aria-label={playing || loading ? '暂停试听' : `播放${selected === 0 ? '海阔天空' : '光辉岁月'}试听`}>{loading ? '···' : playing ? 'Ⅱ' : '▶'}</button><div className="record-progress"><div><span aria-live="polite">{loading ? '正在载入' : playing ? '正在试听' : elapsed > 0 ? '试听已暂停 / 结束' : '点击播放 · 官方试听'}</span><span>{time(elapsed)} / {time(duration)}</span></div><input aria-label="试听进度" type="range" min="0" max={duration || 1} step="0.1" value={elapsed} disabled={!duration} onChange={event => { if (audio.current) { audio.current.currentTime = +event.target.value; setElapsed(+event.target.value); } }} /></div></div>
      <label className="record-volume">音量 <input aria-label="音乐音量" type="range" min="0" max="1" step="0.05" value={volume} onChange={event => { const value = +event.target.value; setVolume(value); if (audio.current) audio.current.volume = value; }} /><span>{Math.round(volume * 100)}%</span></label>
      {error && <p className="record-error" role="alert">{error}</p>}
      <div className="record-source"><a href={track.url} target="_blank" rel="noopener noreferrer" aria-label={`在 iTunes 查看 ${track.title} 完整歌曲`}><img src="https://www.apple.com/ca/itunes/link/images/link-badge-itunes.png" alt="Get it on iTunes" width="138" height="40" /></a><p>喜欢这首？前往官方平台听完整歌曲。<small>试听音频 provided courtesy of iTunes</small></p></div>
    </div>
  </section>;
}

import { useEffect, useRef, useState } from 'react';

const asset = (name: string) => `./assets/${name}`;
const navLinks = [{ label: '关于我', en: 'About', href: '#about' }, { label: '军旅经历', en: 'Experience', href: '#service' }, { label: '生活与热爱', en: 'Journal', href: '#life' }, { label: '下一站', en: 'What’s next', href: '#future' }];

function Arrow({ down = false }: { down?: boolean }) {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" className={down ? 'rotate-90' : ''}><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 40);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    menuRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); }
      if (event.key === 'Tab') {
        const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('a') ?? []), toggleRef.current!];
        const index = items.indexOf(document.activeElement as HTMLElement);
        if (event.shiftKey && index === 0) { event.preventDefault(); items.at(-1)?.focus(); }
        else if (!event.shiftKey && index === items.length - 1) { event.preventDefault(); items[0]?.focus(); }
      }
    };
    const resize = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', resize);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKey); window.removeEventListener('resize', resize); };
  }, [open]);
  return <>
    <header className={`navbar ${scrolled || open ? 'navbar-scrolled' : ''}`}>
      <a href="#home" className="brand" aria-label="祖朋，回到首页" onClick={() => setOpen(false)}>Zu Peng<span>祖朋</span></a>
      <nav className="hidden md:flex items-center gap-8 lg:gap-12" aria-label="主导航">{navLinks.map(link => <a href={link.href} key={link.href}>{link.label}</a>)}</nav>
      <a className="pill nav-cta hidden md:inline-flex" href="#about">认识祖朋 <Arrow /></a>
      <button ref={toggleRef} type="button" className={`menu-toggle md:hidden ${open ? 'is-open' : ''}`} aria-label={open ? '关闭菜单' : '打开菜单'} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(value => !value)}><span /><span /><span /></button>
    </header>
    {open && <button className="menu-backdrop" aria-label="关闭导航菜单" onClick={() => { setOpen(false); toggleRef.current?.focus(); }} />}
    <div ref={menuRef} id="mobile-menu" className={`mobile-menu ${open ? 'is-open' : ''}`} role={open ? 'dialog' : undefined} aria-modal={open || undefined} aria-label="网站导航" inert={!open}>
      <p className="eyebrow">A LITTLE MORE ABOUT ME</p>
      {navLinks.map((link, i) => <a style={{ transitionDelay: open ? `${150 + i * 75}ms` : '0ms' }} href={link.href} key={link.href} onClick={() => setOpen(false)}><span>{link.label}</span><small>{link.en}</small></a>)}
      <a href="#about" className="pill mobile-cta" onClick={() => setOpen(false)} style={{ transitionDelay: open ? '450ms' : '0ms' }}>开始认识我 <Arrow /></a>
      <span className="mobile-signature">Guiyang · China</span>
    </div>
  </>;
}

function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      if (preference.matches) { videoRef.current?.pause(); setPaused(true); }
      else videoRef.current?.play().catch(() => setPaused(true));
    };
    apply(); preference.addEventListener('change', apply);
    return () => preference.removeEventListener('change', apply);
  }, []);
  async function togglePlayback() {
    if (!videoRef.current) return;
    if (videoRef.current.paused) { try { await videoRef.current.play(); setPaused(false); } catch { setPaused(true); } }
    else { videoRef.current.pause(); setPaused(true); }
  }
  return <section id="home" className="hero" aria-labelledby="hero-heading">
    <video ref={videoRef} className="hero-video" autoPlay muted loop playsInline preload="auto" poster={asset('serene-poster.jpg')} aria-hidden="true" onPlay={() => setPaused(false)} onPause={() => setPaused(true)}><source src={asset('serene-background.mp4')} type="video/mp4" /></video>
    <div className="hero-overlay" />
    <div className="hero-content">
      <p className="eyebrow hero-eyebrow">ZU PENG · 贵阳出发，向世界生长</p>
      <h1 id="hero-heading" className="font-instrument text-glow">A steady heart.<br /><em>A curious soul.</em></h1>
      <p className="hero-description">你好，我是祖朋。<span>带着军人的坚定，也带着对生活的热爱。</span></p>
      <a href="#about" className="pill button-glow hero-cta">开始认识我 <Arrow /></a>
    </div>
    <div className="hero-bottom">
      <button type="button" className="sound-control" onClick={togglePlayback} aria-label={paused ? '播放背景视频' : '暂停背景视频'} aria-pressed={!paused}><span className="sound-circle" aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span><span>Experience<br /><strong>{paused ? '播放画面' : '暂停画面'}</strong></span></button>
      <a href="#perspective" className="scroll-cue"><span>SCROLL TO DISCOVER</span><Arrow down /></a>
      <span className="hero-coordinate">26.65° N · 106.63° E</span>
    </div>
  </section>;
}

function QuoteSection() {
  const section = useRef<HTMLElement>(null);
  const rainbow = useRef<HTMLImageElement>(null);
  const left = useRef<HTMLImageElement>(null);
  const right = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let rainbowY = 120, cloudX = 200, cloudY = 0;
    function render() {
      if (!section.current) return;
      const rect = section.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
      const targetY = 120 - progress * 280;
      const targetX = progress > .12 && progress < .92 ? 0 : 200;
      const targetCloudY = progress * -50;
      rainbowY += (targetY - rainbowY) * .06;
      cloudX += (targetX - cloudX) * .04;
      cloudY += (targetCloudY - cloudY) * .04;
      if (rainbow.current) rainbow.current.style.transform = `translate3d(0,${preference.matches ? 0 : rainbowY}px,0)`;
      [left.current, right.current].forEach((el, i) => { if (el) { el.style.transform = `translate3d(${preference.matches ? 0 : cloudX * (i === 0 ? -1 : 1)}px,${preference.matches ? 0 : cloudY}px,0)${i === 1 ? ' scaleX(-1)' : ''}`; el.style.opacity = preference.matches ? '1' : String(1 - cloudX / 200); } });
      if (!preference.matches && (Math.abs(targetY - rainbowY) > .1 || Math.abs(targetX - cloudX) > .1 || Math.abs(targetCloudY - cloudY) > .1)) frame = requestAnimationFrame(render);
      else frame = 0;
    }
    const start = () => { if (!frame) frame = requestAnimationFrame(render); };
    start(); window.addEventListener('scroll', start, { passive: true }); window.addEventListener('resize', start); preference.addEventListener('change', start);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', start); window.removeEventListener('resize', start); preference.removeEventListener('change', start); };
  }, []);
  return <section ref={section} id="perspective" className="quote-section" aria-labelledby="personality-title">
    <img ref={rainbow} className="rainbow" src={asset('rainbow.png')} alt="" aria-hidden="true" />
    <img ref={left} className="cloud cloud-left" src={asset('cloud.png')} alt="" aria-hidden="true" />
    <img ref={right} className="cloud cloud-right" src={asset('cloud.png')} alt="" aria-hidden="true" />
    <div className="quote-content">
      <h2 id="personality-title" className="eyebrow">🤩个人性格</h2>
      <span className="quote-mark font-instrument" aria-hidden="true">“</span>
      <blockquote>雷厉风行，令行禁止；认准的事，干到底。5年军旅，把“扛事”刻进了骨子里。</blockquote>
      <p className="quote-attribution">祖朋 <span>—</span> 坚定向前，保持好奇</p>
    </div>
    <span className="section-coordinate">01 / A NOTE ON WHO I AM</span>
    <a className="quote-next" href="#stories" aria-label="探索个人照片画廊"><Arrow down /></a>
  </section>;
}

function Photo({ file, caption, className = '' }: { file: string; caption: string; className?: string }) {
  return <figure className={`source-photo ${className}`}><a href={asset(file)} target="_blank" rel="noopener noreferrer" aria-label={`查看${caption}完整图片`}><img src={asset(file)} alt={caption} loading="lazy" /></a><figcaption><span>{caption}</span><Arrow /></figcaption></figure>;
}

const galleryCards = [
  { file: 'portrait.jpg', title: '你好，我是祖朋', label: 'THE PERSON', href: '#about' },
  { file: 'marine.jpg', title: '向海而行', label: 'THE MARINE YEARS', href: '#service' },
  { file: 'court.jpg', title: '球场见', label: 'STAY IN MOTION', href: '#sports' },
  { file: 'fitness.jpg', title: '健身房打卡', label: 'A LITTLE STRONGER', href: '#sports' },
  { file: 'beyond-original.jpg', title: '经典永流传', label: 'BEYOND', href: '#music' },
  { file: 'book-namiya.jpg', title: '在细节里找真相', label: 'BETWEEN THE LINES', href: '#reading' },
  { file: 'guiyang.jpg', title: '爽爽的贵阳', label: 'WHERE I COME FROM', href: '#hometown' },
];

function StoryGallery() {
  const root = useRef<HTMLElement>(null);
  const dragStart = useRef<number | null>(null);
  const dragged = useRef(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [width, setWidth] = useState(1000);
  const count = galleryCards.length;
  const selected = galleryCards[((active % count) + count) % count];
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .15 });
    const resize = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    const pref = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(pref.matches);
    update(); pref.addEventListener('change', update); observer.observe(element); resize.observe(element);
    return () => { observer.disconnect(); resize.disconnect(); pref.removeEventListener('change', update); };
  }, []);
  useEffect(() => {
    if (paused || interacting || !inView || reducedMotion) return;
    const timer = window.setInterval(() => setActive(value => value + 1), 3800);
    return () => window.clearInterval(timer);
  }, [paused, interacting, inView, reducedMotion]);
  const step = (amount: number) => { setPaused(true); setActive(value => value + amount); };
  const mobile = width < 768;
  return <section ref={root} className="story-gallery" id="stories" aria-label="祖朋的立体照片画廊" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
    <div className="gallery-intro"><p className="eyebrow">A FEW PIECES OF MY WORLD</p><h2 className="font-instrument">Many sides.<br /><em>One story.</em></h2><p>军旅之外，生活还有很多面。</p></div>
    <div className="carousel-stage" tabIndex={0} role="group" aria-roledescription="轮播图" aria-label="使用左右方向键切换照片，也可以左右拖动" onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1); } }} onPointerDown={event => { dragStart.current = event.clientX; dragged.current = false; }} onPointerMove={event => { if (dragStart.current !== null && Math.abs(event.clientX - dragStart.current) > 10) dragged.current = true; }} onPointerUp={event => { if (dragStart.current !== null && Math.abs(event.clientX - dragStart.current) > 35) step(event.clientX < dragStart.current ? 1 : -1); dragStart.current = null; }} onPointerCancel={() => { dragStart.current = null; }} onPointerLeave={() => { dragStart.current = null; }}>
      <div className="carousel-halo" aria-hidden="true" />
      <div className="carousel-track">{galleryCards.map((card, i) => {
        const relative = ((i - active) % count + count + Math.floor(count / 2)) % count - Math.floor(count / 2);
        const angle = relative * (Math.PI * 2 / count);
        const radius = Math.min(width * .43, 525);
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * (mobile ? 65 : 130);
        const rotation = -Math.sin(angle) * 45;
        return <button key={card.file} className={`story-card ${relative === 0 ? 'is-active' : ''}`} type="button" aria-label={`选择照片：${card.title}`} aria-pressed={relative === 0} style={{ transform: `translate3d(${x}px,${Math.abs(relative) * (mobile ? 4 : 8)}px,${z}px) rotateY(${rotation}deg)`, zIndex: 10 - Math.abs(relative), opacity: Math.abs(relative) === 3 ? .22 : Math.abs(relative) === 2 ? .55 : 1 }} onClick={() => { if (dragged.current) return; setPaused(true); setActive(value => value + relative); }}><img src={asset(card.file)} alt={card.title} loading="lazy" draggable={false} /><span className="story-card-label"><small>0{i + 1} / {card.label}</small></span></button>;
      })}</div>
    </div>
    <div className="gallery-caption" aria-live={paused ? 'polite' : 'off'}><span className="eyebrow">{selected.label}</span><a href={selected.href}>{selected.title}<Arrow /></a></div>
    <div className="gallery-controls"><button type="button" aria-label="上一张照片" onClick={() => step(-1)}><span className="rotate-180"><Arrow /></span></button><span className="gallery-count">0{((active % count) + count) % count + 1}<span> / 07</span></span><button type="button" aria-label="下一张照片" onClick={() => step(1)}><Arrow /></button><button type="button" className="gallery-pause" aria-label={paused || reducedMotion ? '照片自动旋转已暂停，点击切换' : '暂停照片自动旋转'} aria-pressed={paused || reducedMotion} disabled={reducedMotion} onClick={() => setPaused(value => !value)}>{paused || reducedMotion ? '▷' : 'Ⅱ'}</button></div>
    <p className="gallery-hint">左右拖动，发现我的另一面</p>
  </section>;
}

function SectionHeading({ number, english, title, subtitle }: { number: string; english: string; title: string; subtitle?: string }) {
  return <div className="section-heading"><p className="eyebrow"><span>{number}</span> / {english}</p><h2>{title}</h2>{subtitle && <p className="section-description">{subtitle}</p>}</div>;
}

function About() {
  return <section id="about" className="content-section about-section">
    <div className="about-photo"><Photo file="portrait.jpg" caption="祖朋 · 自我介绍" /><span className="portrait-note font-instrument">Hello, I’m Zu Peng.</span></div>
    <div className="about-copy"><SectionHeading number="02" english="THE PERSON BEHIND THE NAME" title="祖朋 · 自我介绍" subtitle="希望帮你能更好地了解我。" />
      <div className="about-details"><p className="profile-name">祖朋（也可以叫我"啊祖"）</p><p>2021年9月入伍 · 海军陆战队</p><p>广州软件学院毕业</p></div>
      <ul className="tags">{['入伍5年', '执行力拉满', '运动全能选手', 'AI 学习者'].map(t => <li key={t}>{t}</li>)}</ul>
      <a href="#service" className="text-link">走进我的军旅故事 <Arrow /></a>
    </div>
  </section>;
}

const abilities = [
  ['执行力', '令行禁止、任务导向，交代的事必有回响'],
  ['抗压能力', '高强度训练都扛过来了，工作上的急难险重不在话下'],
  ['团队协作', '习惯把团队目标放在第一位，配合度高'],
  ['自律与体能', '作息规律、精力在线，扛得住节奏'],
];

function Service() {
  return <section id="service" className="service-section"><div className="content-section">
    <SectionHeading number="03" english="THE MARINE YEARS" title="🤝职业亮点" subtitle="5年海军陆战队服役，用任务与荣誉说话：" />
    <div className="service-facts"><article><span className="fact-number font-instrument">Honor.</span><h3>🏅荣誉</h3><ul><li>两次“四有”优秀士兵、两次嘉奖</li><li>班三等功</li><li>集体嘉奖</li></ul></article><article><span className="fact-number font-instrument">Purpose.</span><h3>🌊重大任务</h3><ul><li>第47批亚丁湾护航</li><li>联合利剑-2024A</li></ul></article></div>
    <div className="abilities"><h3>💪能力沉淀</h3><div className="ability-grid">{abilities.map(([label, text], i) => <p key={label}><span className="ability-number">0{i + 1}</span><span><strong>{label}</strong>：{text}</span></p>)}</div></div>
    <div className="military-gallery"><div className="gallery-heading"><h3>📸军旅掠影</h3><span className="eyebrow">MOMENTS AT SEA & IN THE SKY</span></div><div className="photo-grid two-photos"><Photo file="marine.jpg" caption="海上执勤" /><Photo file="deck.jpg" caption="甲板列队" /></div>
      <div className="photo-grid video-grid">{[{ name: 'sea-training', caption: '海上训练' }, { name: 'parachuting', caption: '空降跳伞' }].map(video => <figure key={video.name}><video controls playsInline preload="metadata" poster={asset(`${video.name}-poster.jpg`)} aria-label={`${video.caption}视频`}><source src={asset(`${video.name}.mp4`)} type="video/mp4" />你的浏览器不支持视频播放，请打开下方原视频链接。</video><figcaption><span>{video.caption}</span><a href={asset(`${video.name}.mp4`)} target="_blank" rel="noopener noreferrer">原视频 ↗</a></figcaption></figure>)}</div>
    </div>
  </div></section>;
}

const chapters = [
  { id: 'hometown', title: '⛰️贵州贵阳人', english: 'ROOTS & ROADS', lead: 'Where it all began.', photos: [['guiyang.jpg', '甲秀楼'], ['qingyan.jpg', '青岩古镇'], ['qianling.jpg', '黔灵山公园']], lines: ['爽爽的贵阳，避暑之都', '从小吃折耳根长大，酸汤鱼、肠旺面是真爱', '性格直爽，说话不绕弯'] },
  { id: 'sports', title: '⚽爱运动', english: 'ALWAYS IN MOTION', lead: 'Feel alive.', photos: [['court.jpg', '球场见'], ['fitness.jpg', '健身房打卡']], lines: ['足球、健身、游泳，球场上随时可以约球。'] },
  { id: 'music', title: '🎵爱听歌', english: 'THE SOUNDTRACK OF LIFE', lead: 'Beyond the ordinary.', photos: [['beyond-original.jpg', 'Beyond 四子'], ['boundless.jpg', '海阔天空'], ['glorious.jpg', '光辉岁月']], lines: ['Beyond 的忠实听众，经典永流传。'] },
  { id: 'reading', title: '📖爱阅读', english: 'BETWEEN THE LINES', lead: 'A world within pages.', photos: [['book-white-night.jpg', '白夜行'], ['book-namiya.jpg', '解忧杂货店'], ['book-suspect-x.jpg', '嫌疑人X的献身']], lines: ['东野圭吾推理小说爱好者，喜欢在细节里找真相。'] },
];

function Life() {
  return <section id="life" className="content-section life-section"><SectionHeading number="04" english="LIFE, WITH INTENTION" title="🫡关于生活" /><nav className="chapter-nav" aria-label="生活篇章">{chapters.map(c => <a key={c.id} href={`#${c.id}`}>{c.title}<Arrow down /></a>)}</nav>
    {chapters.map((c, i) => <article id={c.id} key={c.id} className={`life-chapter ${c.id}-chapter`}><div className="chapter-heading"><div><p className="eyebrow">0{i + 1} / {c.english}</p><h3>{c.title}</h3></div><p className="chapter-lead font-instrument">{c.lead}</p></div><div className={`photo-grid ${c.photos.length === 2 ? 'two-photos' : 'three-photos'}`}>{c.photos.map(([file, caption]) => <Photo key={file} file={file} caption={caption} />)}</div><div className="chapter-copy">{c.lines.map(line => <p key={line}>{line}</p>)}</div></article>)}
  </section>;
}

function Future() {
  return <section id="future" className="future-section"><div className="future-glow" aria-hidden="true" /><div className="content-section"><SectionHeading number="05" english="THE NEXT CHAPTER" title="🐻‍❄️工作期望" /><p className="future-title font-instrument">Still learning.<br /><em>Always becoming.</em></p><p className="future-original"><span>🚀</span>带着军人的执行力把每件事做到位，同时把 AI 学深学透，做一个能扛事、跟得上时代的人。</p><a className="pill liquid-glass" href="https://my.feishu.cn/docx/PAUidcBMUoMoutxaVZOc7zPWnPb" target="_blank" rel="noopener noreferrer">查看飞书原文 <Arrow /></a></div></section>;
}

export default function App() {
  useEffect(() => {
    if (!window.location.hash) return;
    const frame = requestAnimationFrame(() => {
      try { document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' }); }
      catch { /* An invalid URL fragment should not interrupt the page. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="site-shell"><a className="skip-link" href="#about">跳到自我介绍</a><Navbar /><main><Hero /><QuoteSection /><StoryGallery /><About /><Service /><Life /><Future /></main><footer><a href="#home" className="brand" aria-label="祖朋，回到首页">Zu Peng</a><span>认真做事，自由生活。</span><a className="text-link" href="#home">回到顶部 <span aria-hidden="true">↑</span></a><div className="footer-bottom"><span>© {new Date().getFullYear()} 祖朋 · PERSONAL WEBSITE</span><span>GUIYANG, CHINA</span></div></footer></div>;
}

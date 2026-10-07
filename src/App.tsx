import { useEffect, useRef, useState } from 'react';
import MotionHero from './MotionHero';
import EarthOpening from './EarthOpening';
import Atmosphere from './Atmosphere';
import RecordPlayer from './RecordPlayer';
import useJournalEffects from './useJournalEffects';

const asset = (name: string) => `./assets/${name}`;
const navLinks = [{ label: '关于我', en: 'About', href: '#about' }, { label: '生活与热爱', en: 'Journal', href: '#life' }, { label: '一路走来', en: 'Experience', href: '#service' }, { label: '下一站', en: 'What’s next', href: '#future' }];

function Arrow({ down = false }: { down?: boolean }) {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" className={down ? 'rotate-90' : ''}><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > window.innerHeight * .8);
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
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
    <header inert={!scrolled && !open} className={`navbar ${scrolled || open ? 'navbar-scrolled' : 'navbar-intro-hidden'}`}>
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
      <blockquote>认真生活，也尽兴去玩。<br />保持热爱，下一站总有新发现。</blockquote>
      <p className="quote-attribution">祖朋 <span>—</span> 坚定向前，保持好奇</p>
    </div>
    <span className="section-coordinate">01 / A NOTE ON WHO I AM</span>
    <a className="quote-next" href="#about" aria-label="继续阅读自我介绍"><Arrow down /></a>
  </section>;
}

function Photo({ file, caption, className = '' }: { file: string; caption: string; className?: string }) {
  return <figure data-reveal="photo" className={`source-photo ${className}`}><a href={asset(file)} target="_blank" rel="noopener noreferrer" aria-label={`查看${caption}完整图片`}><img src={asset(file)} alt={caption} loading="lazy" /></a><figcaption><span>{caption}</span><Arrow /></figcaption></figure>;
}

function SectionHeading({ number, english, title, subtitle }: { number: string; english: string; title: string; subtitle?: string }) {
  return <div className="section-heading"><p className="eyebrow"><span>{number}</span> / {english}</p><h2>{title}</h2>{subtitle && <p className="section-description">{subtitle}</p>}</div>;
}

function About() {
  return <section id="about" className="content-section about-section journal-surface">
    <div className="about-orbit" aria-hidden="true"><i /><i /><span>✦</span></div>
    <div className="about-photo"><div className="portrait-frame"><Photo file="portrait.jpg" caption="祖朋 · 自我介绍" /></div><span className="portrait-sticker">贵阳出发<br /><strong>保持好奇 ↗</strong></span><span className="portrait-note font-instrument">A little more me.</span></div>
    <div className="about-copy"><p className="eyebrow">02 / HELLO, THIS IS MY LITTLE WORLD</p><p className="about-original-title">祖朋 · 自我介绍</p><h2>你好啊，<br />我是<span>祖朋</span><i>✳</i></h2><p className="about-opening">阳光开朗，热爱运动。<br />听 Beyond，读东野圭吾，也在探索 AI 的新世界。</p>
      <div className="about-details"><p className="profile-name">祖朋（也可以叫我"啊祖"）</p><p>广州软件学院毕业</p><p>希望帮你能更好地了解我。</p></div>
      <ul className="tags">{['运动全能选手', 'AI 学习者', 'Beyond 忠实听众', '推理小说爱好者'].map(t => <li key={t}>{t}</li>)}</ul>
      <a href="#life" className="text-link">来看看我的日常 <Arrow /></a>
    </div>
    <div className="interest-links">{[{ href: '#sports', number: '01', title: '去运动', sub: 'MOVE & FEEL', icon: '↗' }, { href: '#music', number: '02', title: '听一首歌', sub: 'PRESS PLAY', icon: '◉' }, { href: '#reading', number: '03', title: '翻几页书', sub: 'ONE MORE PAGE', icon: '✦' }, { href: '#future', number: '04', title: '探索 AI', sub: 'STAY CURIOUS', icon: '✳' }].map(item => <a href={item.href} key={item.href}><small>{item.number} / {item.sub}</small><span>{item.title}<i>{item.icon}</i></span></a>)}</div>
  </section>;
}

const abilities = [
  ['执行力', '令行禁止、任务导向，交代的事必有回响'],
  ['抗压能力', '高强度训练都扛过来了，工作上的急难险重不在话下'],
  ['团队协作', '习惯把团队目标放在第一位，配合度高'],
  ['自律与体能', '作息规律、精力在线，扛得住节奏'],
];

function Service() {
  return <section id="service" className="service-section journal-surface"><div className="content-section">
    <div className="journey-heading"><p className="eyebrow">04 / SOMEWHERE ALONG THE WAY</p><h2>走过的路，<em>都算数。</em></h2><p>那些与海有关的日子，是人生里很珍贵的一章。</p></div><div className="journey-source"><h3>🤝职业亮点</h3><p>2021年9月入伍 · 海军陆战队</p><p>5年海军陆战队服役，用任务与荣誉说话：</p><div className="tags"><span>入伍5年</span><span>执行力拉满</span></div></div>
    <div className="service-facts"><article><span className="fact-number font-instrument">Honor.</span><h3>🏅荣誉</h3><ul><li>两次“四有”优秀士兵、两次嘉奖</li><li>班三等功</li><li>集体嘉奖</li></ul></article><article><span className="fact-number font-instrument">Purpose.</span><h3>🌊重大任务</h3><ul><li>第47批亚丁湾护航</li><li>联合利剑-2024A</li></ul></article></div>
    <div className="abilities"><p className="journey-original">雷厉风行，令行禁止；认准的事，干到底。5年军旅，把“扛事”刻进了骨子里。</p><h3>💪能力沉淀</h3><div className="ability-grid">{abilities.map(([label, text], i) => <p key={label}><span className="ability-number">0{i + 1}</span><span><strong>{label}</strong>：{text}</span></p>)}</div></div>
    <div className="military-gallery"><div className="gallery-heading"><h3>📸军旅掠影</h3><span className="eyebrow">MOMENTS AT SEA & IN THE SKY</span></div><div className="photo-grid two-photos"><Photo file="marine.jpg" caption="海上执勤" /><Photo file="deck.jpg" caption="甲板列队" /></div>
      <div className="photo-grid video-grid">{[{ name: 'sea-training', caption: '海上训练' }, { name: 'parachuting', caption: '空降跳伞' }].map(video => <figure data-reveal="photo" key={video.name}><video controls playsInline preload="metadata" poster={asset(`${video.name}-poster.jpg`)} aria-label={`${video.caption}视频`}><source src={asset(`${video.name}.mp4`)} type="video/mp4" />你的浏览器不支持视频播放，请打开下方原视频链接。</video><figcaption><span>{video.caption}</span><a href={asset(`${video.name}.mp4`)} target="_blank" rel="noopener noreferrer">原视频 ↗</a></figcaption></figure>)}</div>
    </div>
  </div></section>;
}

const chapters = [
  { id: 'hometown', title: '⛰️贵州贵阳人', english: 'ROOTS & ROADS', lead: 'Where it all began.', photos: [['guiyang.jpg', '甲秀楼'], ['qingyan.jpg', '青岩古镇'], ['qianling.jpg', '黔灵山公园']], lines: ['爽爽的贵阳，避暑之都', '从小吃折耳根长大，酸汤鱼、肠旺面是真爱', '性格直爽，说话不绕弯'] },
  { id: 'sports', title: '⚽爱运动', english: 'ALWAYS IN MOTION', lead: 'Feel alive.', photos: [['court.jpg', '球场见'], ['fitness.jpg', '健身房打卡']], lines: ['足球、健身、游泳，球场上随时可以约球。'] },
  { id: 'music', title: '🎵爱听歌', english: 'THE SOUNDTRACK OF LIFE', lead: 'Beyond the ordinary.', photos: [['beyond-original.jpg', 'Beyond 四子'], ['boundless.jpg', '海阔天空'], ['glorious.jpg', '光辉岁月']], lines: ['Beyond 的忠实听众，经典永流传。'] },
  { id: 'reading', title: '📖爱阅读', english: 'BETWEEN THE LINES', lead: 'A world within pages.', photos: [['book-white-night.jpg', '白夜行'], ['book-namiya.jpg', '解忧杂货店'], ['book-suspect-x.jpg', '嫌疑人X的献身']], lines: ['东野圭吾推理小说爱好者，喜欢在细节里找真相。'] },
];

const bookNotes = [
  { title: '白夜行', quote: '我的天空里没有太阳，总是黑夜，但并不暗。', note: '一道光，可能是救赎，也可能成为执念。读这本书时，不妨留意人物没有说出口的部分：沉默同样是线索。', source: 'https://book.douban.com/subject/3259440/' },
  { title: '解忧杂货店', quote: '对你来说，一切都是自由的，在你面前是无限的可能。', note: '人生没有标准答案。那些看似平凡的来信，让选择与善意有了回声，也让尚未写下的未来值得期待。', source: 'https://book.douban.com/subject/25862578/blockquotes?sort=page_num&start=420' },
  { title: '嫌疑人X的献身', quote: '有时候，一个人只要好好活着，就足以拯救某人。', note: '逻辑可以逼近真相，却不一定能解释一个人的全部。谜底之外，更值得回看的，是人物之间那些微小而深刻的连接。', source: 'https://book.douban.com/subject/3211779/blockquotes?sort=page_num' },
];
function ReadingNotes() {
  return <div className="reading-notes">{bookNotes.map((book, i) => <section data-reveal className="reading-note" key={book.title} aria-label={`${book.title}摘句与阅读侧记`}><p className="eyebrow">PASSAGE 0{i + 1} / 纸页之间</p><blockquote>“{book.quote}”</blockquote><cite>— 东野圭吾《{book.title}》</cite><p className="reading-comment"><span>阅读侧记</span>{book.note}</p><a href={book.source} target="_blank" rel="noopener noreferrer">摘句来源 ↗</a></section>)}</div>;
}

function Life() {
  return <section id="life" className="content-section life-section"><div className="life-intro"><p className="eyebrow">03 / THE THINGS THAT MAKE ME, ME</p><p className="life-super-title">Life in <em>full color.</em></p><SectionHeading number="03" english="LIFE, WITH INTENTION" title="🫡关于生活" /></div><nav className="chapter-nav" aria-label="生活篇章">{chapters.map(c => <a key={c.id} href={`#${c.id}`}>{c.title}<Arrow down /></a>)}</nav>
    {chapters.map((c, i) => <article id={c.id} key={c.id} className={`life-chapter ${c.id}-chapter journal-surface`}><div className="chapter-heading"><div><p className="eyebrow">0{i + 1} / {c.english}</p><h3>{c.title}</h3></div><p className="chapter-lead font-instrument">{c.lead}</p></div><div className={`photo-grid ${c.photos.length === 2 ? 'two-photos' : 'three-photos'}`}>{c.photos.map(([file, caption]) => <Photo key={file} file={file} caption={caption} />)}</div><div className="chapter-copy">{c.lines.map(line => <p key={line}>{line}</p>)}</div>{c.id === 'music' && <RecordPlayer />}{c.id === 'reading' && <ReadingNotes />}</article>)}
  </section>;
}

function Future() {
  return <section id="future" className="future-section"><div className="future-glow" aria-hidden="true" /><div className="content-section"><SectionHeading number="05" english="THE NEXT CHAPTER" title="🐻‍❄️工作期望" /><p className="future-curiosity" aria-hidden="true">✳</p><p className="future-title font-instrument" data-reveal>Still learning.<br /><em>Always becoming.</em></p><p className="future-lead">把好奇心留给新事物，把热情留给每一天。</p><p className="future-original"><span>🚀</span>带着军人的执行力把每件事做到位，同时把 AI 学深学透，做一个能扛事、跟得上时代的人。</p><a className="pill liquid-glass" href="https://my.feishu.cn/docx/PAUidcBMUoMoutxaVZOc7zPWnPb" target="_blank" rel="noopener noreferrer">查看飞书原文 <Arrow /></a></div></section>;
}

export default function App() {
  useJournalEffects();
  useEffect(() => {
    if (!window.location.hash) return;
    const frame = requestAnimationFrame(() => {
      try { document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' }); }
      catch { /* An invalid URL fragment should not interrupt the page. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="site-shell"><a className="skip-link" href="#about">跳到自我介绍</a><Navbar /><main><EarthOpening /><MotionHero /><QuoteSection /><About /><Life /><Service /><Future /></main><footer><a href="#home" className="brand" aria-label="祖朋，回到首页">Zu Peng</a><span>认真做事，自由生活。</span><a className="text-link" href="#home">回到顶部 <span aria-hidden="true">↑</span></a><div className="footer-bottom"><span>© {new Date().getFullYear()} 祖朋 · PERSONAL WEBSITE</span><span>GUIYANG, CHINA</span></div><Atmosphere /></footer></div>;
}

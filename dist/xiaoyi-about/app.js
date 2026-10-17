'use strict';

const videos = [
  ['06.18',220.3,'business','6月18日作品'],
  ['06.22',375,'business','6月22日作品'],
  ['06.23',108.8,'personal','乐道L80 · 宠物与家庭出行'],
  ['06.25',28.8,'personal','个人视频'],
  ['07.22',522.5,'business','启境GT7 · 辅助驾驶体验'],
  ['07.29',463.1,'business','尊界V800 · 产品工艺与选车'],
  ['08.07',360.9,'business','深蓝S05 · 西湖晚高峰'],
  ['08.20',110.5,'business','iCAR V25 · 新车体验'],
  ['08.21',999.9,'business','ID.ERA 5S · 山城道路体验'],
  ['08.22',10.6,'personal','2026成都车展'],
  ['09.02',83.2,'personal','风云A9 · 续航体验'],
  ['09.07',325,'business','鸿蒙智行 · ADS5辅助驾驶'],
  ['09.14',250.4,'business','奕境X9 · 门店试驾'],
  ['09.28',221.2,'business','智界R7焕新版 · 家用体验'],
  ['09.29',218.1,'business','方程S · 城市出游']
];

let activeFilter = 'all';
let activeVideo = 8;
const plot = document.querySelector('#bars-plot');
const detail = document.querySelector('#chart-detail');
const typeLabel = type => type === 'business' ? '品牌内容' : '个人视频';

function showVideo(index) {
  activeVideo = index;
  const [date, plays, type, title] = videos[index];
  plot.querySelectorAll('.bar-cell').forEach((cell,i) => {
    cell.classList.toggle('selected',i === index);
    cell.querySelector('button').setAttribute('aria-pressed',String(i === index));
  });
  peakChart.setActive(index);
  detail.replaceChildren();
  const time = document.createElement('time');
  time.dateTime = `2026-${date.replace('.','-')}`;
  time.textContent = `2026.${date}`;
  const name = document.createElement('span');
  name.className = 'detail-title';
  name.textContent = title;
  const kind = document.createElement('span');
  kind.className = 'detail-type';
  kind.textContent = typeLabel(type);
  const number = document.createElement('strong');
  number.textContent = plays.toFixed(1);
  const unit = document.createElement('small');
  unit.textContent = '万次播放';
  number.append(unit);
  detail.append(time,name,kind,number);
}

const peakChart = createPublicationPeakChart(plot, videos, showVideo);
showVideo(activeVideo);

document.querySelectorAll('[data-chart-filter]').forEach(button => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.chartFilter;
    document.querySelectorAll('[data-chart-filter]').forEach(b => {
      b.classList.toggle('active',b === button);
      b.setAttribute('aria-pressed',String(b === button));
    });
    plot.querySelectorAll('.bar-cell').forEach((cell,index) => {
      const muted = activeFilter !== 'all' && videos[index][2] !== activeFilter;
      cell.classList.toggle('muted',muted);
      cell.querySelector('button').disabled = muted;
    });
    if(activeFilter !== 'all' && videos[activeVideo][2] !== activeFilter) {
      showVideo(videos.findIndex(video => video[2] === activeFilter));
    }
    peakChart.setFilter(activeFilter);
    const count = videos.filter(video => activeFilter === 'all' || video[2] === activeFilter).length;
    document.querySelector('.chart-toolbar h3').textContent = activeFilter === 'all' ? '最近15条作品的播放量' : `15条样本中的${count}条${typeLabel(activeFilter)}`;
  });
});

const audiences = {
  fans:{male:91.49,female:8.51,caption:'男性粉丝',note:'我的粉丝里，<strong>31—40岁</strong>的朋友最多，占<strong>33.27%</strong>。'},
  viewers:{male:70.2,female:29.8,caption:'男性观众',note:'看过我视频的观众里，<strong>50岁以上</strong>的朋友最多。'}
};
const audienceChart = createAudienceChart(document.querySelector('#gender-ring'));
function showAudience(key) {
  const audience = audiences[key];
  audienceChart.update(audience);
  document.querySelector('#gender-caption').textContent = audience.caption;
  const value = document.querySelector('#gender-value');
  value.replaceChildren(document.createTextNode(String(audience.male)));
  const percent = document.createElement('span');
  percent.textContent = '%';
  value.append(percent);
  document.querySelector('#male-label').textContent = `${audience.male}%`;
  document.querySelector('#female-label').textContent = `${audience.female}%`;
  const note = document.querySelector('#audience-caption');
  if (note) note.innerHTML = audience.note;
  document.querySelectorAll('[data-audience]').forEach(button => {
    const active = button.dataset.audience === key;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
}
document.querySelectorAll('[data-audience]').forEach(button => button.addEventListener('click', () => showAudience(button.dataset.audience)));
showAudience('fans');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduceMotion && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('motion-ready');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    });
  },{threshold:0.06,rootMargin:'0px 0px -20px 0px'});
  document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
}

let scheduled = false;
const progress = document.querySelector('.reading-progress span');
const navLinks = Array.from(document.querySelectorAll('.topbar nav a'));
function updateReading() {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${total > 0 ? Math.min(1,Math.max(0,window.scrollY / total)) : 0})`;
  let active = '';
  navLinks.forEach(link => {
    const section = document.querySelector(link.getAttribute('href'));
    if(section.getBoundingClientRect().top <= 160) active = link.getAttribute('href');
  });
  navLinks.forEach(link => {
    const current = link.getAttribute('href') === active;
    link.classList.toggle('current',current);
    if(current) link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  });
  scheduled = false;
}
window.addEventListener('scroll', () => {
  if(scheduled) return;
  scheduled = true;
  requestAnimationFrame(updateReading);
},{passive:true});
window.addEventListener('resize',updateReading,{passive:true});
updateReading();

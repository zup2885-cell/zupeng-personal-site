const chapters = [
  ['#about', '走近啊祖'],
  ['#service', '我的军旅故事'],
  ['#hometown', '看看我的家乡'],
  ['#music', '听听我的热爱'],
  ['#reading', '翻开我的书单'],
  ['#future', '走向下一程']
];
const chapterButtons = [...document.querySelectorAll('[data-chapter]')];
const reel = document.querySelector('.image-reel');
const slides = [...document.querySelectorAll('.reel-slide')];
const chapterLink = document.getElementById('chapter-link');
function selectChapter(index) {
  reel.style.setProperty('--chapter', index);
  chapterButtons.forEach((button, i) => {
    button.classList.toggle('active', i === index);
    button.setAttribute('aria-pressed', String(i === index));
    slides[i].setAttribute('aria-hidden', String(i !== index));
  });
  document.getElementById('chapter-counter').textContent = `${String(index + 1).padStart(2, '0')} / 06`;
  chapterLink.href = chapters[index][0];
  chapterLink.replaceChildren(document.createTextNode(chapters[index][1] + ' '));
  const arrow = document.createElement('span');
  arrow.textContent = '↗';
  arrow.setAttribute('aria-hidden', 'true');
  chapterLink.append(arrow);
}
chapterButtons.forEach((button, index) => {
  button.addEventListener('click', () => selectChapter(index));
  button.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(event.key)) return;
    event.preventDefault();
    const direction = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
    const next = (index + direction + chapterButtons.length) % chapterButtons.length;
    chapterButtons[next].focus();
    selectChapter(next);
  });
});
selectChapter(0);
const messages = {
  sky: '听着《海阔天空》，提醒自己保持热爱，继续探索。',
  glory: '《光辉岁月》里那份坚持，是我喜欢 Beyond 的理由之一。'
};
document.querySelectorAll('[data-song]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-song]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.getElementById('song-note').textContent = messages[button.dataset.song];
  });
});
const navLinks = [...document.querySelectorAll('.site-header nav a')];
const sections = [...document.querySelectorAll('main > section[id]')];
let framePending = false;
function updateActiveSection() {
  let activeId = 'home';
  for (const section of sections) if (section.getBoundingClientRect().top <= window.innerHeight * .38) activeId = section.id;
  navLinks.forEach(link => {
    const active = link.getAttribute('href') === `#${activeId}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
  });
  framePending = false;
}
window.addEventListener('scroll', () => {
  if (!framePending) { framePending = true; requestAnimationFrame(updateActiveSection); }
}, {passive:true});
window.addEventListener('resize', updateActiveSection);
updateActiveSection();

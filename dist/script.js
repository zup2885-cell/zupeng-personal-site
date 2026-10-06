const messages = {
  sky: '听着《海阔天空》，提醒自己保持热爱，继续探索。',
  glory: '《光辉岁月》里那份坚持，是我喜欢 Beyond 的理由之一。'
};
document.querySelectorAll('[data-song]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-song]').forEach(item => {
      item.setAttribute('aria-pressed', String(item === button));
    });
    document.getElementById('song-note').textContent = messages[button.dataset.song];
  });
});
const navLinks = [...document.querySelectorAll('.site-header nav a')];
const sections = [...document.querySelectorAll('main > section[id]')];
let framePending = false;
function updateActiveSection() {
  const marker = window.innerHeight * 0.38;
  let activeId = 'home';
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= marker) activeId = section.id;
  }
  const target = activeId === 'home' ? '#about' : `#${activeId}`;
  navLinks.forEach(link => {
    const active = link.getAttribute('href') === target;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  framePending = false;
}
window.addEventListener('scroll', () => {
  if (!framePending) {
    framePending = true;
    requestAnimationFrame(updateActiveSection);
  }
}, { passive: true });
window.addEventListener('resize', updateActiveSection);
updateActiveSection();

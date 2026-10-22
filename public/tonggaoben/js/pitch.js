/* 通告本提案页 · OYLA 气质动效（GSAP-free）
 * - Hero sticky scroll-zoom into Mac mock
 * - Light parallax on 下一场 card
 * - Reveal: opacity + translateY
 * Fallback: prefers-reduced-motion / no sticky → static hero
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* —— Reveal —— */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* —— Hero scroll-zoom ——
   * Progress 0→1 over hero-pin scroll range.
   * Scale focal from ~0.92 → 1.35, slight blur→sharp, copy fades late.
   */
  var pin = document.querySelector('.hero-pin');
  var focal = document.getElementById('hero-focal');
  var copy = document.querySelector('.hero-copy');
  var hint = document.querySelector('.hero-scroll-hint');

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function heroProgress() {
    if (!pin) return 0;
    var rect = pin.getBoundingClientRect();
    var total = pin.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return clamp(-rect.top / total, 0, 1);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      updateHero();
      updateParallax();
    });
  }

  function updateHero() {
    if (reduce || !focal) return;
    var p = heroProgress();
    // ease-out curve
    var e = 1 - Math.pow(1 - p, 1.6);
    var scale = 0.88 + e * 0.72; // 0.88 → 1.60
    var y = (1 - e) * 24;
    focal.style.transform = 'scale(' + scale.toFixed(4) + ') translateY(' + y.toFixed(2) + 'px)';

    if (copy) {
      var fade = clamp(1 - p * 1.35, 0, 1);
      copy.style.opacity = fade.toFixed(3);
      copy.style.transform = 'translateY(' + (p * -28).toFixed(2) + 'px)';
    }
    if (hint) {
      hint.style.opacity = clamp(1 - p * 2, 0, 1).toFixed(3);
    }
  }

  /* —— Parallax on 下一场 card —— */
  var paraCard = document.getElementById('parallax-card');
  function updateParallax() {
    if (reduce || !paraCard) return;
    var r = paraCard.getBoundingClientRect();
    var vh = window.innerHeight;
    var mid = r.top + r.height / 2;
    var offset = (mid - vh / 2) / vh; // -0.5…0.5-ish
    var ty = clamp(-offset * 28, -36, 36);
    paraCard.style.transform = 'translateY(' + ty.toFixed(2) + 'px)';
  }

  if (!reduce) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateHero();
  }

  /* —— Countdown to 14:00 —— */
  var hEl = document.getElementById('cd-h');
  var mEl = document.getElementById('cd-m');
  var sEl = document.getElementById('cd-s');
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function nextTarget() {
    var now = new Date();
    var t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
    if (t.getTime() <= now.getTime()) t.setDate(t.getDate() + 1);
    return t;
  }
  var target = nextTarget();
  function tick() {
    var diff = Math.max(0, target.getTime() - Date.now());
    if (diff === 0) { target = nextTarget(); diff = Math.max(0, target.getTime() - Date.now()); }
    var total = Math.floor(diff / 1000);
    if (hEl) hEl.textContent = pad(Math.floor(total / 3600));
    if (mEl) mEl.textContent = pad(Math.floor((total % 3600) / 60));
    if (sEl) sEl.textContent = pad(total % 60);
  }
  tick();
  setInterval(tick, 1000);

  /* —— 遮词 —— */
  var words = document.getElementById('script-words');
  var line = document.getElementById('script-line');
  var state = document.getElementById('mask-state');
  var btnReveal = document.getElementById('btn-reveal');
  var btnRemask = document.getElementById('btn-remask');
  function showFull() {
    if (!words) return;
    words.textContent = words.getAttribute('data-full');
    line.classList.remove('masked');
    state.textContent = '原文';
  }
  function showMasked() {
    if (!words) return;
    words.textContent = words.getAttribute('data-masked');
    line.classList.add('masked');
    state.textContent = '遮词中';
  }
  if (btnReveal) btnReveal.addEventListener('click', showFull);
  if (btnRemask) btnRemask.addEventListener('click', showMasked);

  /* —— 复制转发 —— */
  var btnCopy = document.getElementById('btn-copy');
  var fwdText = document.getElementById('fwd-text');
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }
  if (btnCopy && fwdText) {
    btnCopy.addEventListener('click', function () {
      var text = fwdText.textContent || '';
      function done() {
        btnCopy.textContent = '已复制';
        btnCopy.classList.add('is-copied');
        setTimeout(function () {
          btnCopy.textContent = '复制转发';
          btnCopy.classList.remove('is-copied');
        }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    });
  }

  /* —— 接缓拒 —— */
  var decide = document.getElementById('decide-btns');
  if (decide) {
    decide.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      decide.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-on'); });
      btn.classList.add('is-on');
    });
  }
})();

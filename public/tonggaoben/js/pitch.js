/* 通告本提案 · OYLA shell
 * - Sticky scroll-zoom into outstretched hands (1 → 2.85)
 * - Selectable 3-col strips (hover/click active + panel swap)
 * - prefers-reduced-motion: static hero
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Reveal */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Hero enter zoom — drill into hands */
  var pin = document.querySelector('.hero-pin');
  var focal = document.getElementById('hero-focal');
  var bg = document.getElementById('hero-bg');
  var fg = document.getElementById('hero-fg');
  var stage = document.querySelector('.hero-stage');
  var copy = document.getElementById('hero-copy');
  var lead = document.getElementById('hero-lead');
  var cta = document.getElementById('hero-cta');
  var title = document.querySelector('.hero-title');
  var eyebrow = document.querySelector('.hero-eyebrow');
  var hint = document.querySelector('.hero-scroll-hint');

  var SCALE_START = 1.0;
  var SCALE_END = 2.85;

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

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
    });
  }

  function updateHero() {
    if (reduce || !focal) return;
    var p = heroProgress();
    var e = easeOutCubic(p);
    var scale = SCALE_START + (SCALE_END - SCALE_START) * e;
    focal.style.transform =
      'scale(' + scale.toFixed(4) + ') translate3d(0,' + (e * -3.2).toFixed(2) + '%,0)';

    if (bg) {
      bg.style.transform =
        'scale(' + (1 + e * 0.06).toFixed(4) + ') translate3d(0,' + (e * 1.6).toFixed(2) + '%,0)';
    }
    if (fg) {
      fg.style.transform =
        'scale(' + (1 + e * 0.16).toFixed(4) + ') translate3d(0,' + (e * -2.4).toFixed(2) + '%,0)';
    }
    if (stage) {
      if (p > 0.32) stage.classList.add('is-deep');
      else stage.classList.remove('is-deep');
    }

    var titleFade = easeInOut(clamp(1 - p / 0.52, 0, 1));
    if (title) {
      title.style.opacity = titleFade.toFixed(3);
      title.style.transform = 'translateY(' + ((1 - titleFade) * -40).toFixed(2) + 'px)';
    }
    if (eyebrow) eyebrow.style.opacity = titleFade.toFixed(3);
    if (lead) lead.style.opacity = clamp(1 - p / 0.4, 0, 1).toFixed(3);

    if (cta) {
      var ctaFade = clamp(1 - (p - 0.36) / 0.36, 0, 1);
      cta.style.opacity = ctaFade.toFixed(3);
      cta.style.pointerEvents = ctaFade < 0.12 ? 'none' : 'auto';
    }
    if (copy) copy.style.transform = 'translateY(' + (p * -18).toFixed(2) + 'px)';
    if (hint) hint.style.opacity = clamp(1 - p * 2.4, 0, 1).toFixed(3);
  }

  if (!reduce) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateHero();
  }

  /* —— Selection UX (3-col) —— */
  var cols = document.querySelectorAll('.select-col');
  var panels = document.querySelectorAll('[data-panel-body]');

  function activate(id) {
    cols.forEach(function (col) {
      var on = col.getAttribute('data-panel') === id;
      col.classList.toggle('is-active', on);
      col.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(function (panel) {
      var on = panel.getAttribute('data-panel-body') === id;
      panel.classList.toggle('is-open', on);
    });
  }

  cols.forEach(function (col) {
    col.addEventListener('click', function () {
      activate(col.getAttribute('data-panel'));
    });
    col.addEventListener('mouseenter', function () {
      // hover preview: visual only via CSS; keep click for panel
    });
  });

  document.querySelectorAll('[data-pick]').forEach(function (a) {
    a.addEventListener('click', function () {
      var id = a.getAttribute('data-pick');
      if (id) activate(id);
    });
  });

  /* Countdown */
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

  /* 遮词 */
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

  /* Copy */
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
      var label = btnCopy.childNodes[0];
      function done() {
        if (label && label.nodeType === 3) label.textContent = '已复制';
        setTimeout(function () {
          if (label && label.nodeType === 3) label.textContent = '复制';
        }, 1400);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    });
  }

  /* 接缓拒 */
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

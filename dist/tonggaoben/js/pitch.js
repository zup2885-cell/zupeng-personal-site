/* 通告本提案页 · OYLA enter
 * Hero: sticky pin + aggressive zoom into outstretched hands (scale 1 → ~2.6)
 * Light parallax: fg hands vs bg face
 * prefers-reduced-motion: static full hero, no zoom
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

  /* —— Hero enter zoom ——
   * Progress 0→1 over hero-pin.
   * Scale: 1.0 → 2.65 (within 2.2–3.0), origin on hands.
   * Title fades early; CTAs hold until mid-zoom then fade.
   */
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
  var SCALE_END = 2.85; // aggressive crop into outstretched hands

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
      updateParallaxCard();
    });
  }

  function updateHero() {
    if (reduce || !focal) return;
    var p = heroProgress();
    var e = easeOutCubic(p);

    var scale = SCALE_START + (SCALE_END - SCALE_START) * e;
    // slight upward drift so hands stay in frame while zooming
    var ty = e * -4; // % via translate — keep small; scale does the crop
    focal.style.transform =
      'scale(' + scale.toFixed(4) + ') translate3d(0,' + ty.toFixed(2) + '%,0)';

    // Parallax layers: bg (face) slower, fg (hands) slightly faster toward camera
    if (bg) {
      var bgScale = 1 + e * 0.06;
      bg.style.transform = 'scale(' + bgScale.toFixed(4) + ') translate3d(0,' + (e * 1.5).toFixed(2) + '%,0)';
    }
    if (fg) {
      var fgScale = 1 + e * 0.14;
      fg.style.transform = 'scale(' + fgScale.toFixed(4) + ') translate3d(0,' + (e * -2.2).toFixed(2) + '%,0)';
    }

    if (stage) {
      if (p > 0.35) stage.classList.add('is-deep');
      else stage.classList.remove('is-deep');
    }

    // Title + eyebrow: fade across first ~55% of pin
    var titleFade = clamp(1 - p / 0.55, 0, 1);
    var titleEase = easeInOut(titleFade);
    if (title) {
      title.style.opacity = titleEase.toFixed(3);
      title.style.transform = 'translateY(' + ((1 - titleEase) * -36).toFixed(2) + 'px)';
    }
    if (eyebrow) {
      eyebrow.style.opacity = titleEase.toFixed(3);
    }
    if (lead) {
      var leadFade = clamp(1 - p / 0.42, 0, 1);
      lead.style.opacity = leadFade.toFixed(3);
    }

    // CTAs: hold until mid-zoom (~0.4), then fade by ~0.72
    if (cta) {
      var ctaFade = clamp(1 - (p - 0.38) / 0.34, 0, 1);
      cta.style.opacity = ctaFade.toFixed(3);
      cta.style.pointerEvents = ctaFade < 0.15 ? 'none' : 'auto';
    }

    if (copy) {
      // whole copy block slight lift
      copy.style.transform = 'translateY(' + (p * -20).toFixed(2) + 'px)';
    }
    if (hint) {
      hint.style.opacity = clamp(1 - p * 2.2, 0, 1).toFixed(3);
    }
  }

  /* —— Parallax on 下一场 card (content section) —— */
  var paraCard = document.getElementById('parallax-card');
  function updateParallaxCard() {
    if (reduce || !paraCard) return;
    var r = paraCard.getBoundingClientRect();
    var vh = window.innerHeight;
    var mid = r.top + r.height / 2;
    var offset = (mid - vh / 2) / vh;
    var ty = clamp(-offset * 28, -36, 36);
    paraCard.style.transform = 'translateY(' + ty.toFixed(2) + 'px)';
  }

  if (!reduce) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateHero();
  } else {
    // ensure static readable hero
    if (focal) focal.style.transform = 'none';
    if (bg) bg.style.transform = 'none';
    if (fg) fg.style.transform = 'none';
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

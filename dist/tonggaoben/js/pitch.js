/* 通告本提案
 * 1) 入场：滚动驱动 scrub（bewpost/OYLA 整段）
 *    主路径：帧序列 → canvas（可靠 seek）
 *    辅路径：paused video currentTime（若浏览器可 seek）
 *    RAF 插值 + seeking 守卫
 * 2) 标题按字淡出上移；CTA pow(p,4) 更陡淡出，与标题同期收干净
 * 3) 入场之后：why 区人物对焦/轻浮动
 * 4) Orla masonry 点选
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

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

  /* —— Hero scrub —— */
  var pin = document.querySelector('.hero-pin');
  var stage = document.querySelector('.hero-stage');
  var wrap = document.querySelector('.hero-video-wrap');
  var canvas = document.getElementById('hero-canvas');
  var video = document.getElementById('hero-scrub');
  var copy = document.getElementById('hero-copy');
  var lead = document.getElementById('hero-lead');
  var cta = document.getElementById('hero-cta');
  var eyebrow = document.getElementById('hero-eyebrow');
  var hint = document.getElementById('hero-hint');
  var chars = document.querySelectorAll('.hero-title .ch');

  var targetProgress = 0;
  var smoothProgress = 0;
  var rafId = 0;
  var lastFrameIdx = -1;

  var frames = [];
  var framesReady = false;
  var frameCount = 0;
  var useFrames = true;

  var videoDuration = 0;
  var videoReady = false;
  var videoCanSeek = false;

  function heroProgress() {
    if (!pin) return 0;
    var rect = pin.getBoundingClientRect();
    var total = pin.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return clamp(-rect.top / total, 0, 1);
  }

  function padNum(n, width) {
    var s = String(n);
    while (s.length < width) s = '0' + s;
    return s;
  }

  function loadFrames() {
    if (!wrap || !canvas || reduce) return Promise.resolve(false);
    var dir = wrap.getAttribute('data-scrub-dir') || 'img/scrub';
    var count = parseInt(wrap.getAttribute('data-scrub-count') || '0', 10);
    var pad = parseInt(wrap.getAttribute('data-scrub-pad') || '3', 10);
    var ext = wrap.getAttribute('data-scrub-ext') || 'jpg';
    if (!count) return Promise.resolve(false);
    frameCount = count;

    var ctx = canvas.getContext('2d', { alpha: false });
    var loaded = 0;
    frames = new Array(count);

    return new Promise(function (resolve) {
      var i;
      for (i = 1; i <= count; i++) {
        (function (idx) {
          var img = new Image();
          img.decoding = 'async';
          img.onload = function () {
            frames[idx - 1] = img;
            loaded++;
            if (loaded === 1) {
              /* draw first frame ASAP */
              drawFrame(0);
              canvas.classList.add('is-ready');
              if (stage) {
                stage.classList.add('is-frames-on');
                stage.classList.add('is-video-on');
              }
              framesReady = true;
              kickLoop();
            }
            if (loaded === count) resolve(true);
          };
          img.onerror = function () {
            loaded++;
            if (loaded === count) resolve(frames.filter(Boolean).length > 0);
          };
          img.src = dir + '/f-' + padNum(idx, pad) + '.' + ext;
        })(i);
      }
    });
  }

  function drawFrame(idx) {
    if (!canvas || !frames.length) return;
    idx = clamp(idx | 0, 0, frames.length - 1);
    var img = frames[idx];
    if (!img) return;
    if (idx === lastFrameIdx) return;
    lastFrameIdx = idx;
    var ctx = canvas.getContext('2d', { alpha: false });
    var cw = canvas.width;
    var ch = canvas.height;
    /* cover fit */
    var ir = img.naturalWidth / img.naturalHeight;
    var cr = cw / ch;
    var dw, dh, dx, dy;
    if (ir > cr) {
      dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0;
    } else {
      dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2;
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function armVideo() {
    if (!video || reduce) return;
    try {
      video.pause();
      video.muted = true;
    } catch (e) {}

    function onMeta() {
      videoDuration = video.duration || 0;
      if (!(videoDuration > 0) || !isFinite(videoDuration)) return;
      videoReady = true;
      /* Probe seekability once */
      var probeAt = Math.min(0.5, videoDuration * 0.1);
      var start = video.currentTime;
      var onSeeked = function () {
        video.removeEventListener('seeked', onSeeked);
        videoCanSeek = Math.abs(video.currentTime - probeAt) > 0.05;
        if (videoCanSeek && !framesReady) {
          video.classList.add('is-ready');
          if (stage) stage.classList.add('is-video-on');
        }
        try { video.currentTime = 0; } catch (e) {}
      };
      video.addEventListener('seeked', onSeeked);
      try { video.currentTime = probeAt; } catch (e) {
        video.removeEventListener('seeked', onSeeked);
        videoCanSeek = false;
      }
      /* timeout fallback */
      setTimeout(function () {
        if (!videoCanSeek) {
          try { video.currentTime = 0; } catch (e) {}
        }
      }, 800);
    }

    if (video.readyState >= 1 && video.duration) onMeta();
    video.addEventListener('loadedmetadata', onMeta);
  }

  function applyCopy(p) {
    var titleWindow = clamp(1 - p / 0.42, 0, 1);
    var titleEase = easeInOut(titleWindow);
    chars.forEach(function (ch, i) {
      var stagger = i * 0.07;
      var fade = clamp((titleEase - stagger) / Math.max(0.001, 1 - stagger * 0.5), 0, 1);
      ch.style.opacity = fade.toFixed(3);
      ch.style.transform = 'translate3d(0,' + ((1 - fade) * -36).toFixed(2) + 'px,0)';
    });

    if (eyebrow) {
      eyebrow.style.opacity = titleEase.toFixed(3);
      eyebrow.style.transform = 'translateY(' + ((1 - titleEase) * -18).toFixed(2) + 'px)';
    }
    if (lead) {
      var leadFade = clamp(1 - p / 0.36, 0, 1);
      lead.style.opacity = leadFade.toFixed(3);
      lead.style.transform = 'translateY(' + ((1 - leadFade) * -14).toFixed(2) + 'px)';
    }
    if (cta) {
      var ctaLinear = clamp(1 - p / 0.40, 0, 1);
      var ctaFade = Math.pow(ctaLinear, 4);
      cta.style.opacity = ctaFade.toFixed(3);
      cta.style.pointerEvents = ctaFade < 0.08 ? 'none' : 'auto';
      cta.style.transform = 'translateY(' + ((1 - ctaFade) * -10).toFixed(2) + 'px)';
    }
    if (copy) copy.style.transform = 'translate3d(0,' + (p * -22).toFixed(2) + 'px,0)';
    if (hint) hint.style.opacity = clamp(1 - p * 2.6, 0, 1).toFixed(3);
    if (stage) {
      if (p > 0.22) stage.classList.add('is-deep');
      else stage.classList.remove('is-deep');
    }
  }

  function scrubVisual(progress) {
    var p = clamp(progress, 0, 1);
    if (useFrames && framesReady && frames.length) {
      var idx = Math.round(p * (frames.length - 1));
      drawFrame(idx);
      return;
    }
    if (videoReady && videoCanSeek && video && !video.seeking) {
      var t = p * Math.max(0, videoDuration - 0.04);
      if (Math.abs(video.currentTime - t) >= 0.02) {
        try { video.currentTime = t; } catch (e) {}
      }
    }
  }

  function frame() {
    rafId = 0;
    targetProgress = heroProgress();
    smoothProgress = lerp(smoothProgress, targetProgress, 0.28);
    if (Math.abs(smoothProgress - targetProgress) < 0.0006) {
      smoothProgress = targetProgress;
    }
    applyCopy(smoothProgress);
    scrubVisual(smoothProgress);
    updateWhyFloat(smoothProgress);

    var pinRect = pin ? pin.getBoundingClientRect() : null;
    var inPlay = pinRect && pinRect.bottom > 0 && pinRect.top < window.innerHeight * 1.25;
    var easing = Math.abs(smoothProgress - targetProgress) > 0.0006;
    if (inPlay || easing) rafId = requestAnimationFrame(frame);
  }

  function kickLoop() {
    if (rafId) return;
    rafId = requestAnimationFrame(frame);
  }

  function onScroll() {
    targetProgress = heroProgress();
    kickLoop();
  }

  /* —— why figure AFTER entrance —— */
  var whyFig = document.getElementById('why-fig-wrap');
  var whySection = document.getElementById('why');
  var floatChips = document.querySelectorAll('.float-chip');

  function updateWhyFloat(heroP) {
    if (reduce || !whyFig || !whySection) return;
    var rect = whySection.getBoundingClientRect();
    var vh = window.innerHeight;
    var visible = rect.top < vh * 0.9 && rect.bottom > vh * 0.05;
    if (!visible) return;
    var gate = heroP == null ? 1 : clamp((heroP - 0.72) / 0.28, 0, 1);
    if (gate <= 0 && rect.top > vh * 0.2) {
      whyFig.style.filter = 'grayscale(0.5) blur(5px)';
      return;
    }
    var local = clamp(1 - rect.top / vh, 0, 1);
    var drift = Math.sin(local * Math.PI) * 7 * Math.max(gate, 0.35);
    var focus = clamp((local - 0.05) / 0.4, 0, 1) * Math.max(gate, 0.5);
    whyFig.style.transform =
      'translate3d(0,' + (-drift).toFixed(2) + 'px,0) scale(' + lerp(1.03, 1, focus).toFixed(4) + ')';
    whyFig.style.filter =
      'grayscale(' + lerp(0.5, 0.18, focus).toFixed(2) + ') blur(' +
      lerp(5.5, 0, focus).toFixed(2) + 'px) brightness(' + lerp(1.07, 1.02, focus).toFixed(3) + ')';
    floatChips.forEach(function (chip) {
      var id = chip.getAttribute('data-float');
      var amp = id === '2' ? 11 : id === '3' ? 8 : 9;
      var phase = id === '2' ? 0.6 : id === '3' ? 1.15 : 0;
      var y = Math.sin(local * Math.PI + phase) * amp * Math.max(gate, 0.4);
      var x = Math.cos(local * Math.PI * 0.85 + phase) * (amp * 0.35);
      chip.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    });
  }

  if (!reduce) {
    loadFrames().then(function (ok) {
      useFrames = !!ok;
      if (!ok) armVideo();
    });
    armVideo();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  } else {
    applyCopy(0);
    if (stage) {
      stage.classList.remove('is-video-on');
      stage.classList.remove('is-frames-on');
    }
  }

  /* —— Selection UX —— */
  var cols = document.querySelectorAll('.shop-card, .select-col');
  var panels = document.querySelectorAll('[data-panel-body]');

  function activate(id) {
    if (!id) return;
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
  if (btnReveal) btnReveal.addEventListener('click', function () {
    if (!words) return;
    words.textContent = words.getAttribute('data-full');
    line.classList.remove('masked');
    state.textContent = '原文';
  });
  if (btnRemask) btnRemask.addEventListener('click', function () {
    if (!words) return;
    words.textContent = words.getAttribute('data-masked');
    line.classList.add('masked');
    state.textContent = '遮词中';
  });

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
      function done() {
        btnCopy.textContent = '已复制';
        setTimeout(function () { btnCopy.textContent = '复制'; }, 1400);
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

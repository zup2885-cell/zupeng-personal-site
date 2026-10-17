'use strict';

// Instruments and paper friction share one graph, resumed by normal page interaction.
window.ChartSound = (() => {
  let context;
  let master;
  let analyser;
  let clickNoise;
  let tissueNoise;
  let meterFrame = 0;
  let meterUntil = 0;
  let outputPeak = 0;
  const waveform = new Float32Array(256);
  let activated = false;
  let hasUnlocked = false;
  let firstGestureAcknowledged = false;
  let recoveryTimer = 0;
  let lastRecovery = -Infinity;
  let lastTick = -Infinity;
  let lastWater = -Infinity;
  let lastExpand = -Infinity;
  let lastEvent = '';
  let played = 0;
  let resumeAttempt;
  let slide;
  // Real book page turn (public-domain recording "Turning a page" by planish, Wikimedia Commons).
  const bookFlipBytes = fetch(new URL('assets/audio/book-page-flip.m4a', document.baseURI), {cache:'force-cache'})
    .then(response => response.ok ? response.arrayBuffer() : null).catch(() => null);
  let bookFlip;
  let bookFlipDecode;
  const loadBookFlip = () => {
    if (bookFlip) return Promise.resolve(bookFlip);
    if (!context) return Promise.resolve(null);
    bookFlipDecode ||= bookFlipBytes
      .then(bytes => bytes ? context.decodeAudioData(bytes.slice(0)) : null)
      .then(buffer => { bookFlip = buffer; document.documentElement.dataset.bookFlip = buffer ? 'ready' : 'unavailable'; return buffer; })
      .catch(() => { document.documentElement.dataset.bookFlip = 'unavailable'; return null; });
    return bookFlipDecode;
  };
  let scrollIntentUntil = 0;
  const counts = {piano:0, mechanical:0, paper:0, slide:0, intro:0};
  const voices = new Set();
  const syncState = () => {
    const state = document.documentElement.dataset;
    state.audioState = context?.state || 'uninitialized';
    state.audioClock = (context?.currentTime || 0).toFixed(3);
    state.audioUnlocked = String(hasUnlocked);
    state.audioNeedsGesture = String(!hasUnlocked && context?.state === 'suspended');
    state.soundCount = String(played);
    state.soundLastEvent = lastEvent;
    state.soundVolume = String(master?.gain.value || 0);
    state.soundOutputPeak = outputPeak.toFixed(4);
    state.soundPianoCount = String(counts.piano);
    state.soundMechanicalCount = String(counts.mechanical);
    state.soundPaperCount = String(counts.paper);
    state.soundSlideCount = String(counts.slide);
    state.soundIntroCount = String(counts.intro);
    const needsClick = context?.state !== 'running';
    const peakHint = document.querySelector('.chart-hint');
    const ringHint = document.querySelector('.audience-tools span');
    const peakText = needsClick ? '点一下光峰，聆听钢琴声' : '移到光峰上，或点击查看';
    const ringText = needsClick ? '点一下圆环，听见机械表声' : '移动鼠标，转动圆环';
    if (peakHint && peakHint.textContent !== peakText) peakHint.textContent = peakText;
    if (ringHint && ringHint.textContent !== ringText) ringHint.textContent = ringText;
  };
  const unlock = async (forceResume = false) => {
    if (document.hidden) return false;
    try {
      if (!context || context.state === 'closed') {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return false;
        context = new Audio();
        resumeAttempt = null;
        lastTick = lastWater = lastExpand = -Infinity;
        master = context.createGain();
        master.gain.value = .92;
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -14;
        compressor.knee.value = 20;
        compressor.ratio.value = 3;
        compressor.attack.value = .003;
        compressor.release.value = .12;
        analyser = context.createAnalyser();
        analyser.fftSize = 256;
        master.connect(compressor);
        compressor.connect(analyser);
        analyser.connect(context.destination);
        clickNoise = context.createBuffer(1, Math.ceil(context.sampleRate * .06), context.sampleRate);
        const noiseData = clickNoise.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
        // Soft, slightly low-passed noise for the tissue body: fibres rubbing against the box slot.
        tissueNoise = context.createBuffer(1, Math.ceil(context.sampleRate * .7), context.sampleRate);
        const fibres = tissueNoise.getChannelData(0);
        let soft = 0;
        for (let i = 0; i < fibres.length; i++) {
          soft = soft * .55 + (Math.random() * 2 - 1) * .45;
          fibres[i] = soft * (.82 + .18 * Math.random());
        }
        context.addEventListener('statechange', () => {
          activated = context.state === 'running';
          if (activated) hasUnlocked = true;
          syncState();
          if (!activated && hasUnlocked && !document.hidden && !recoveryTimer && performance.now()-lastRecovery > 1000) {
            recoveryTimer = setTimeout(() => { recoveryTimer = 0; restoreAudio(); }, 250);
          }
        });
        loadBookFlip();
      }
      if (context.state !== 'running') {
        if (!resumeAttempt || forceResume || navigator.userActivation?.isActive) {
          const pending = context.resume().catch(() => {}).finally(() => {
            if (resumeAttempt === pending) resumeAttempt = null;
          });
          resumeAttempt = pending;
        }
        // A blocked autoplay request must not queue old hover notes for a later click.
        await Promise.race([resumeAttempt, new Promise(resolve => setTimeout(resolve, forceResume ? 650 : 180))]);
      }
      activated = context.state === 'running';
      if (activated) hasUnlocked = true;
      syncState();
      return activated;
    } catch {
      return false;
    }
  };
  const measureOutput = () => {
    if (!analyser || document.hidden) { meterFrame = 0; return; }
    analyser.getFloatTimeDomainData(waveform);
    document.documentElement.dataset.audioClock = context.currentTime.toFixed(3);
    outputPeak = Math.max(outputPeak, ...waveform.map(value => Math.abs(value)));
    document.documentElement.dataset.soundOutputPeak = outputPeak.toFixed(4);
    meterFrame = performance.now() < meterUntil ? requestAnimationFrame(measureOutput) : 0;
  };
  const tone = (frequency, endFrequency, delay, duration, volume, type) => {
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration * .8);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .005);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + .01);
    meterUntil = Math.max(meterUntil, performance.now() + (delay + duration + .08) * 1000);
    if (!meterFrame) meterFrame = requestAnimationFrame(measureOutput);
    voices.add(oscillator);
    oscillator.onended = () => {
      voices.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
  };
  const canPlay = () => context?.state === 'running' && !document.hidden;
  const activateIfAllowed = () => {
    if (canPlay()) return Promise.resolve(true);
    // Some hosts already allow audio. Always try; restricted browsers resume on a click.
    return unlock(hasUnlocked);
  };
  const markPlayed = event => {
    outputPeak = 0;
    lastEvent = event;
    played++;
    if (event.startsWith('piano')) counts.piano++;
    else if (event === 'mechanical-tick') counts.mechanical++;
    else if (event === 'paper-rustle') counts.paper++;
    else if (event === 'intro-whoosh') counts.intro++;
    else if (event === 'paper-pull' || event === 'tissue-pull') { counts.paper++; counts.intro++; }
    else if (event === 'paper-page-turn') counts.slide++;
    syncState();
  };
  const mechanicalClick = (frequency, delay, duration, volume) => {
    const start = context.currentTime + delay;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = clickNoise;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 1.3;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .001);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + duration + .002);
    voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
  };
  const tick = (step = 0) => {
    if (!canPlay()) { activateIfAllowed().then(ready => { if (ready) tick(step); }); return; }
    if (context.currentTime - lastTick < .055) return;
    lastTick = context.currentTime;
    mechanicalClick(2700 + step % 5 * 70, 0, .036, .65);
    mechanicalClick(3900, .018, .02, .25);
    tone(2180, 2140, .002, .05, .13, 'sine');
    markPlayed('mechanical-tick');
  };
  const piano = (index = 0, accent = false) => {
    if (!canPlay()) { activateIfAllowed().then(ready => { if (ready) piano(index, accent); }); return; }
    if (!accent && context.currentTime - lastWater < .11) return;
    lastWater = context.currentTime;
    const notes = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.26];
    const pitch = notes[index % notes.length];
    const intensity = accent ? 1.2 : 1;
    tone(pitch, pitch, 0, .8, .44 * intensity, 'sine');
    tone(pitch * 1.003, pitch * 1.001, 0, .55, .075 * intensity, 'sine');
    tone(pitch * 2, pitch * 2, 0, .4, .14 * intensity, 'sine');
    tone(pitch * 3, pitch * 3, .001, .27, .061 * intensity, 'sine');
    tone(pitch * 4, pitch * 4, .001, .17, .03 * intensity, 'sine');
    markPlayed(accent ? 'piano-accent' : 'piano');
  };
  // Every moving-paper moment uses the same real book page turn, at slightly different speeds
  // and lengths so repeated sounds never feel mechanical.
  let flipVoice;
  const playBookFlip = ({rate = 1.1, offset = 0, duration, volume = .9, interrupt = true} = {}) => {
    if (!bookFlip || !canPlay()) return 0;
    if (interrupt && flipVoice) {
      flipVoice.gain.gain.setTargetAtTime(.0001, context.currentTime, .03);
      try { flipVoice.source.stop(context.currentTime + .12); } catch {}
    }
    const start = context.currentTime;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const span = Math.max(.05, Math.min(bookFlip.duration - offset, duration ?? Infinity));
    source.buffer = bookFlip;
    source.playbackRate.value = rate * (1 + (Math.random() - .5) * .04);
    const length = span / source.playbackRate.value;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + .012);
    gain.gain.setValueAtTime(volume, start + Math.max(.013, length - .08));
    gain.gain.linearRampToValueAtTime(.0001, start + length);
    source.connect(gain); gain.connect(master);
    const current = {source, gain};
    if (interrupt) flipVoice = current;
    voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); if (flipVoice === current) flipVoice = null; };
    source.start(start, offset, span);
    meterUntil = Math.max(meterUntil, performance.now() + (length + .1) * 1000);
    if (!meterFrame) meterFrame = requestAnimationFrame(measureOutput);
    return length;
  };
  const withBookFlip = async (requestedAt, limitMs) => {
    if (!canPlay() && !await activateIfAllowed()) return false;
    await loadBookFlip();
    return Boolean(bookFlip) && canPlay() && performance.now() - requestedAt <= limitMs;
  };
  // Practice panels unfolding.
  const paper = async (index = 0) => {
    const requestedAt = performance.now();
    if (!await withBookFlip(requestedAt, 250) || context.currentTime - lastExpand < .18) return;
    stopSlide();
    lastExpand = context.currentTime;
    playBookFlip({rate: 1.12 + index * .03, offset: .24, duration: .62});
    markPlayed('paper-rustle');
  };
  const stopSlide = () => {
    clearTimeout(slide);
    slide = null;
    document.documentElement.dataset.paperSliding = 'false';
  };
  const preparePaper = async () => {
    if (!await unlock(true)) return false;
    return Boolean(await loadBookFlip());
  };
  // Short page turn, used for first-touch feedback.
  const paperPull = async (index = 0, progress = 0, durationMs) => {
    const requestedAt = performance.now();
    if (progress >= .95 || !await withBookFlip(requestedAt, durationMs || 400)) return;
    playBookFlip({rate: 1.2 + index * .03, offset: .2, duration: .75});
    markPlayed('paper-pull');
  };
  // Opening sheets: one quick, overlapping page turn per pulled layer.
  const tissuePull = async (index = 0, durationMs = 430) => {
    const requestedAt = performance.now();
    if (!await withBookFlip(requestedAt, 160)) return;
    playBookFlip({rate: 1.3 + index * .05, offset: .22, duration: Math.max(.4, durationMs / 1000 * 1.3), volume: .85, interrupt: false});
    markPlayed('tissue-pull');
  };
  // A short car horn "beep": two detuned reed-like tones, like a real dual-note horn.
  const horn = async () => {
    if (!canPlay() && !await activateIfAllowed()) return;
    if (!canPlay()) return;
    const start = context.currentTime + .005;
    const length = .2;
    const low = context.createBiquadFilter();
    const gain = context.createGain();
    low.type = 'lowpass';
    low.frequency.value = 2200;
    low.Q.value = 1.2;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(.22, start + .012);
    gain.gain.setValueAtTime(.22, start + length - .05);
    gain.gain.exponentialRampToValueAtTime(.0001, start + length);
    low.connect(gain); gain.connect(master);
    [415, 523].forEach(frequency => {
      const reed = context.createOscillator();
      reed.type = 'sawtooth';
      reed.frequency.setValueAtTime(frequency * .985, start);
      reed.frequency.linearRampToValueAtTime(frequency, start + .03);
      reed.connect(low);
      reed.start(start);
      reed.stop(start + length + .02);
      voices.add(reed);
      reed.onended = () => { voices.delete(reed); reed.disconnect(); };
    });
    setTimeout(() => { low.disconnect(); gain.disconnect(); }, (length + .1) * 1000);
    meterUntil = Math.max(meterUntil, performance.now() + (length + .1) * 1000);
    if (!meterFrame) meterFrame = requestAnimationFrame(measureOutput);
    markPlayed('car-horn');
  };
  // Air rushing past as the opening camera pushes through: low, soft, rising then fading.
  const airWhoosh = async (durationMs = 760) => {
    if (!canPlay() && !await activateIfAllowed()) return;
    if (!canPlay() || !tissueNoise) return;
    const start = context.currentTime + .005;
    const length = durationMs / 1000 + .35;
    const source = context.createBufferSource();
    const low = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = tissueNoise;
    source.loop = true;
    source.playbackRate.value = .55;
    low.type = 'lowpass';
    low.Q.value = 1.4;
    low.frequency.setValueAtTime(260, start);
    low.frequency.exponentialRampToValueAtTime(1500, start + length * .62);
    low.frequency.exponentialRampToValueAtTime(380, start + length);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(.7, start + length * .6);
    gain.gain.exponentialRampToValueAtTime(.0001, start + length);
    source.connect(low); low.connect(gain); gain.connect(master);
    source.start(start);
    source.stop(start + length + .02);
    voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); low.disconnect(); gain.disconnect(); };
    meterUntil = Math.max(meterUntil, performance.now() + (length + .1) * 1000);
    if (!meterFrame) meterFrame = requestAnimationFrame(measureOutput);
    markPlayed('intro-whoosh');
  };
  const restoreAudio = () => {
    if (document.hidden || (!hasUnlocked && !navigator.userActivation?.hasBeenActive)) return;
    lastRecovery = performance.now();
    unlock(true);
  };
  const beginScroll = event => {
    if (!event.isTrusted || document.hidden || document.documentElement.classList.contains('page-editing')) return;
    if (event.type === 'wheel' && Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    scrollIntentUntil = performance.now() + (event.type === 'keydown' ? 1000 : 330);
    unlock();
  };
  document.addEventListener('wheel', beginScroll, {capture:true, passive:true});
  document.addEventListener('touchmove', beginScroll, {capture:true, passive:true});
  const unlockFromGesture = event => {
    if (!event.isTrusted) return;
    const target = event.target;
    unlock(true).then(ready => {
      if (!ready || firstGestureAcknowledged) return;
      firstGestureAcknowledged = true;
      const opening = ['ready','pulling'].includes(document.documentElement.dataset.introState);
      // First contact gives audible feedback even after the automatic opening has finished.
      // Instrument and disclosure targets play their own matching sound.
      if (!opening && played === 0 && !target?.closest?.('.bar-button,.gender-ring,.region-bars,.practice-plan')) paperPull(0,0,220);
    });
  };
  document.addEventListener('pointerdown', event => {
    if (event.isTrusted) { scrollIntentUntil = 0; stopSlide(); unlockFromGesture(event); }
  }, {capture:true, passive:true});
  ['pointerup','click'].forEach(type => document.addEventListener(type, event => {
    unlockFromGesture(event);
  }, {capture:true, passive:true}));
  document.addEventListener('keydown', event => {
    if (!event.isTrusted || event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    unlockFromGesture(event);
    if (['ArrowUp','ArrowDown','PageUp','PageDown',' '].includes(event.key) && !event.target.closest('button,summary,a')) beginScroll(event);
  }, {capture:true});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopSlide(); voices.forEach(voice => { try { voice.stop(); } catch {} }); }
    else restoreAudio();
  });
  window.addEventListener('focus', restoreAudio);
  window.addEventListener('pageshow', restoreAudio);
  document.addEventListener('pointermove', () => {
    if (hasUnlocked && !canPlay() && performance.now()-lastRecovery > 1000) restoreAudio();
  }, {passive:true});
  new MutationObserver(() => {
    if (document.documentElement.classList.contains('page-editing')) stopSlide();
  }).observe(document.documentElement, {attributes:true,attributeFilter:['class']});
  syncState();
  // Check permission on every route, so a blocked first visit always has a clear cue.
  activateIfAllowed();
  return {
    unlock, tick, piano, water:piano, paper, brush:paper, expand:paper, activateIfAllowed, stopSlide, preparePaper, paperPull, tissuePull, airWhoosh, horn,
    getState() { return {activated, hasUnlocked, volume:master?.gain.value || 0, state:context?.state || 'uninitialized', played, lastEvent, activeVoices:voices.size}; }
  };
})();

'use strict';

(() => {
  const buttons = Array.from(document.querySelectorAll('[data-open-practice]'));
  const plans = Array.from(document.querySelectorAll('.practice-plans .practice-plan'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motions = new Map();
  const brushes = new Map();
  const hoverTimers = new Map();
  const closeTimers = new Map();
  const manuallyClosed = new Set();
  const intentions = new Map(plans.map(plan => [plan, plan.open]));
  const staysOpen = plan => plan === plans[plans.length - 1];
  let layoutSettlesAt = 0;
  let anchorFrame = 0;
  let navigationTimer = 0;
  const stopAnchor = () => {
    cancelAnimationFrame(anchorFrame);
    anchorFrame = 0;
    document.documentElement.classList.remove('practice-layout-settling');
  };
  const holdHeaderPosition = (target, top) => {
    stopAnchor();
    const until = performance.now() + (reduced.matches ? 60 : 850);
    let previousTop = top;
    let previousScroll = scrollY;
    document.documentElement.classList.add('practice-layout-settling');
    const hold = () => {
      if (performance.now() > until) { stopAnchor(); return; }
      // Compensate only for the layout change. A wheel movement still moves the page.
      const drift = target.getBoundingClientRect().top - previousTop + scrollY - previousScroll;
      if (Math.abs(drift) > .5) window.scrollBy({top:drift, behavior:'instant'});
      previousTop = target.getBoundingClientRect().top;
      previousScroll = scrollY;
      anchorFrame = requestAnimationFrame(hold);
    };
    anchorFrame = requestAnimationFrame(hold);
  };
  const cancelNavigation = () => { clearTimeout(navigationTimer); navigationTimer = 0; };
  document.addEventListener('wheel', cancelNavigation, {passive:true});
  document.addEventListener('touchstart', cancelNavigation, {passive:true});
  const holdNextHeader = plan => {
    const next = plans[plans.indexOf(plan) + 1];
    if (!next) return;
    const summary = next.querySelector('summary');
    const top = summary.getBoundingClientRect().top;
    if (top >= -30 && top <= innerHeight + 180) holdHeaderPosition(summary, top);
  };
  const sync = () => {
    buttons.forEach(button => {
      const plan = document.getElementById(button.dataset.openPractice);
      button.setAttribute('aria-expanded', String(Boolean(plan && intentions.get(plan))));
    });
    plans.forEach(plan => plan.querySelector('summary').setAttribute('aria-expanded', String(intentions.get(plan))));
  };
  const clearHover = plan => {
    clearTimeout(hoverTimers.get(plan));
    hoverTimers.delete(plan);
  };
  const clearClose = plan => {
    clearTimeout(closeTimers.get(plan));
    closeTimers.delete(plan);
  };
  const stopBrush = plan => {
    const brush = brushes.get(plan);
    if (brush) brush.forEach(motion => motion.cancel());
    brushes.delete(plan);
    plan.classList.remove('is-unrolling');
  };
  const paintEdge = progress => {
    const edge = offset => `${Math.max(0, Math.min(100, progress + offset))}%`;
    return `polygon(0 0,100% 0,100% ${edge(0)},94% ${edge(-.4)},87% ${edge(.3)},80% ${edge(-.6)},72% ${edge(.4)},63% ${edge(-.2)},55% ${edge(.5)},46% ${edge(-.4)},37% ${edge(.3)},27% ${edge(-.5)},17% ${edge(.4)},8% ${edge(-.3)},0 ${edge(0)})`;
  };
  const paintReveal = plan => {
    stopBrush(plan);
    if (reduced.matches || typeof plan.animate !== 'function') return;
    const body = plan.querySelector('.practice-plan-body');
    const pass = body.querySelector('.practice-paper-pass');
    const travel = body.getBoundingClientRect().height;
    const timing = {duration:1080, easing:'cubic-bezier(.3,.15,.45,1)', fill:'both'};
    plan.classList.add('is-unrolling');
    const reveal = body.animate([
      {clipPath:paintEdge(-2)},
      {clipPath:paintEdge(45), offset:.5},
      {clipPath:paintEdge(102)}
    ], timing);
    const sweep = pass.animate([
      {transform:'translateY(0)', opacity:0},
      {transform:`translateY(${travel * .11}px)`, opacity:.9, offset:.14},
      {transform:`translateY(${travel * .45}px)`, opacity:.85, offset:.5},
      {transform:`translateY(${travel * .88}px)`, opacity:.65, offset:.85},
      {transform:`translateY(${travel * 1.02 + 30}px)`, opacity:0}
    ], timing);
    brushes.set(plan, [reveal, sweep]);
    reveal.onfinish = () => {
      if (brushes.get(plan)?.[0] === reveal) stopBrush(plan);
    };
  };
  const setOpen = (plan, open) => {
    if (intentions.get(plan) === open) return;
    const from = plan.offsetHeight;
    intentions.set(plan, open);
    clearHover(plan);
    clearClose(plan);
    stopBrush(plan);
    const previous = motions.get(plan);
    if (previous) previous.cancel();
    motions.delete(plan);
    plan.style.overflow = '';
    const summary = plan.querySelector('summary');
    summary.setAttribute('aria-expanded', String(open));
    if (reduced.matches || typeof plan.animate !== 'function') {
      plan.open = open;
      sync();
      return;
    }
    plan.open = true;
    const to = open ? plan.offsetHeight : summary.offsetHeight + 2;
    plan.style.overflow = 'hidden';
    const motion = plan.animate([{height:`${from}px`}, {height:`${to}px`}], {
      duration:open ? 720 : 300, easing:'cubic-bezier(.22,.7,.2,1)', fill:'both'
    });
    motions.set(plan, motion);
    motion.onfinish = () => {
      if (motions.get(plan) !== motion) return;
      plan.open = intentions.get(plan);
      motion.cancel();
      motions.delete(plan);
      plan.style.overflow = '';
      sync();
    };
    if (open) paintReveal(plan);
    sync();
  };
  const openPlan = (target, source) => {
    clearClose(target);
    if (intentions.get(target)) return;
    const summary = target.querySelector('summary');
    const top = summary.getBoundingClientRect().top;
    const precedingPanelCloses = plans.some(plan => intentions.get(plan) && plans.indexOf(plan) < plans.indexOf(target));
    if (precedingPanelCloses && top > 50 && top < innerHeight + 180) holdHeaderPosition(summary, top);
    plans.forEach(plan => {
      clearHover(plan);
      if (plan !== target && intentions.get(plan)) plan.dataset.closeSource = 'switch';
      setOpen(plan, plan === target);
    });
    // Moving panels must not open another header that happens to pass under the pointer.
    layoutSettlesAt = performance.now() + (reduced.matches ? 0 : 750);
    target.dataset.openSource = source;
    const index = plans.indexOf(target);
    const sound = window.ChartSound;
    sound?.activateIfAllowed().then(ready => {
      if (ready && intentions.get(target)) sound.paper(index);
    });
  };
  const queueHover = plan => {
    clearClose(plan);
    if (intentions.get(plan) || hoverTimers.has(plan) || manuallyClosed.has(plan)) return;
    const summary = plan.querySelector('summary');
    hoverTimers.set(plan, setTimeout(() => {
      hoverTimers.delete(plan);
      if (summary.matches(':hover') && performance.now() >= layoutSettlesAt) openPlan(plan, 'hover');
    }, Math.max(100, layoutSettlesAt - performance.now() + 30)));
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    const target = document.getElementById(button.dataset.openPractice);
    if (!target) return;
    openPlan(target, 'button');
    cancelNavigation();
    // Finish resizing before navigating; concurrent smooth scrolling can skip a panel.
    navigationTimer = setTimeout(() => {
      stopAnchor();
      target.scrollIntoView({block:'start', behavior:reduced.matches ? 'auto' : 'smooth'});
      navigationTimer = 0;
    }, reduced.matches ? 0 : 860);
  }));
  plans.forEach(plan => {
    const summary = plan.querySelector('summary');
    const pass = document.createElement('span');
    pass.className = 'practice-paper-pass';
    pass.setAttribute('aria-hidden', 'true');
    plan.querySelector('.practice-plan-body').append(pass);
    plan.addEventListener('pointerenter', () => clearClose(plan));
    summary.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch' && hoverPointer.matches) queueHover(plan);
    });
    summary.addEventListener('pointermove', event => {
      if (event.pointerType !== 'touch' && hoverPointer.matches && (event.movementX || event.movementY)) queueHover(plan);
    });
    summary.addEventListener('pointerleave', () => { clearHover(plan); manuallyClosed.delete(plan); });
    plan.addEventListener('pointerleave', event => {
      clearHover(plan);
      if (staysOpen(plan) || event.pointerType === 'touch' || !hoverPointer.matches || !intentions.get(plan)) return;
      clearClose(plan);
      closeTimers.set(plan, setTimeout(() => {
        closeTimers.delete(plan);
        if (!plan.matches(':hover')) {
          plan.dataset.closeSource = 'pointerleave';
          holdNextHeader(plan);
          setOpen(plan, false);
        }
      }, 130));
    });
    summary.addEventListener('click', event => {
      event.preventDefault();
      clearHover(plan);
      clearClose(plan);
      // A desktop click keeps a hovered panel open; keyboard and touch can toggle it.
      if (intentions.get(plan) && event.detail > 0 && hoverPointer.matches && summary.matches(':hover')) return;
      if (intentions.get(plan)) {
        manuallyClosed.add(plan);
        holdNextHeader(plan);
        setOpen(plan, false);
      }
      else openPlan(plan, 'click');
    });
    plan.addEventListener('toggle', () => {
      if (!motions.has(plan)) intentions.set(plan, plan.open);
      sync();
    });
  });
  reduced.addEventListener('change', event => {
    if (!event.matches) return;
    stopAnchor();
    motions.forEach((motion, plan) => {
      motion.cancel();
      plan.open = intentions.get(plan);
      plan.style.overflow = '';
    });
    motions.clear();
    plans.forEach(stopBrush);
    sync();
  });
  sync();
})();

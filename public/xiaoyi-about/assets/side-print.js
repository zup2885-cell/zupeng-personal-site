'use strict';

// Embossed flourish in the right margin; it drifts slower than the page for a little depth.
(() => {
  const print = document.createElement('div');
  print.className = 'side-print';
  print.setAttribute('aria-hidden', 'true');
  print.innerHTML = '<i class="print-shadow"></i><i class="print-light"></i>';
  document.body.append(print);
  const main = document.querySelector('main');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame = 0;
  const drift = () => {
    frame = 0;
    if (!still) print.style.setProperty('--print-y', `${(-scrollY * .22).toFixed(1)}px`);
    // Stop the print where the red page ends, so it never covers the light footer.
    const end = main ? main.getBoundingClientRect().bottom : innerHeight;
    print.style.bottom = `${Math.max(0, innerHeight - end).toFixed(0)}px`;
  };
  addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(drift); }, {passive: true});
  addEventListener('resize', drift, {passive: true});
  drift();
})();

import { useEffect } from 'react';

export default function useJournalEffects() {
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    // Reveal small reading units, so copy and images enter in a clear sequence.
    const selector = '[data-reveal], .about-copy > *, .interest-links > a, .portrait-sticker, .portrait-note, .life-intro > p, .life-intro .section-heading, .chapter-nav, .chapter-heading > div > *, .chapter-lead, .chapter-copy > p, .journey-heading > *, .journey-source > *, .service-facts > article, .journey-original, .abilities > h3, .ability-grid > p, .gallery-heading, .future-section .section-heading, .future-lead, .future-original, .future-section .pill, .record-player';
    const elements = [...document.querySelectorAll<HTMLElement>(selector)];
    elements.forEach(element => {
      element.classList.remove('is-revealed');
      element.classList.add('reveal-ready');
      const siblings = [...(element.parentElement?.children ?? [])].filter(child => elements.includes(child as HTMLElement));
      element.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(element), 4) * 100}ms`);
    });
    const enter = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('is-revealed');
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    // Re-arm only after the whole element leaves the viewport, avoiding flicker at the edge.
    const exit = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting && !entry.target.contains(document.activeElement)) entry.target.classList.remove('is-revealed');
      });
    }, { threshold: 0 });
    elements.forEach(element => { enter.observe(element); exit.observe(element); });
    const revealFocused = (event: FocusEvent) => {
      elements.forEach(element => { if (element.contains(event.target as Node)) element.classList.add('is-revealed'); });
    };
    document.addEventListener('focusin', revealFocused);

    const surfaces = [...document.querySelectorAll<HTMLElement>('.journal-surface')];
    const photos = [...document.querySelectorAll<HTMLElement>('.source-photo > a')];
    const cleanups: (() => void)[] = [];
    [...surfaces, ...photos].forEach(element => {
      let frame = 0;
      const move = (event: PointerEvent) => {
        if (preference.matches || !finePointer.matches) return;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const box = element.getBoundingClientRect();
          const x = (event.clientX - box.left) / box.width;
          const y = (event.clientY - box.top) / box.height;
          element.style.setProperty('--pointer-x', `${x * 100}%`);
          element.style.setProperty('--pointer-y', `${y * 100}%`);
          if (element.tagName === 'A') {
            element.style.setProperty('--tilt-x', `${(y - .5) * -5}deg`);
            element.style.setProperty('--tilt-y', `${(x - .5) * 5}deg`);
          }
        });
      };
      const leave = () => {
        cancelAnimationFrame(frame);
        element.style.removeProperty('--tilt-x'); element.style.removeProperty('--tilt-y');
      };
      element.addEventListener('pointermove', move, { passive: true });
      element.addEventListener('pointerleave', leave);
      cleanups.push(() => { leave(); element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', leave); });
    });
    return () => { enter.disconnect(); exit.disconnect(); document.removeEventListener('focusin', revealFocused); elements.forEach(element => { element.classList.remove('reveal-ready', 'is-revealed'); element.style.removeProperty('--reveal-delay'); }); cleanups.forEach(cleanup => cleanup()); };
  }, []);
}

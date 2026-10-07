import { useEffect } from 'react';

export default function useJournalEffects() {
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const elements = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08 });
    elements.forEach(element => {
      element.classList.add('reveal-ready');
      observer.observe(element);
    });

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
    return () => { observer.disconnect(); elements.forEach(element => element.classList.remove('reveal-ready')); cleanups.forEach(cleanup => cleanup()); };
  }, []);
}

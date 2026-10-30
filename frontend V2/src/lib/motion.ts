import { useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
  The front door's motion, authored once with GSAP:
  - the headline sets line by line and the photo plate is unmasked on load,
  - the plates drift against the scroll (parallax),
  - table rows print in as they enter, and figures count up to their value.
  Everything is hidden only by script and only when reduced motion is not requested, so the
  page is complete without it.
*/
export function useLandingMotion(scope: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = scope.current;
    if (!root) return;
    const mm = gsap.matchMedia(root);

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root);

      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from(q('[data-line]'), { yPercent: 105, duration: 1, stagger: 0.09 })
        .from(q('[data-fade]'), { opacity: 0, y: 14, duration: 0.7, stagger: 0.08 }, '-=0.6')
        .from(q('[data-unmask]'), { clipPath: 'inset(0 0 100% 0)', duration: 1.2 }, 0.1)
        .from(q('[data-unmask] img'), { scale: 1.18, duration: 1.6 }, 0.1);

      q('[data-parallax]').forEach((el: Element) => {
        const depth = Number((el as HTMLElement).dataset.parallax) || 12;
        gsap.fromTo(
          el,
          { yPercent: depth },
          {
            yPercent: -depth,
            ease: 'none',
            scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
          },
        );
      });

      gsap.set(q('[data-row]'), { opacity: 0, y: 12 });
      ScrollTrigger.batch(q('[data-row]'), {
        start: 'top 92%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.55, stagger: 0.05, ease: 'power3.out' }),
      });

      gsap.set(q('[data-rise]'), { opacity: 0, y: 28 });
      ScrollTrigger.batch(q('[data-rise]'), {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'expo.out' }),
      });

      q('[data-count]').forEach((el: Element) => {
        const node = el as HTMLElement;
        const to = Number(node.dataset.count);
        const prefix = node.dataset.prefix ?? '';
        const value = { n: 0 };
        gsap.to(value, {
          n: to,
          duration: 1.4,
          ease: 'power2.out',
          snap: { n: 1 },
          scrollTrigger: { trigger: node, start: 'top 90%', once: true },
          onUpdate: () => {
            node.textContent = prefix + Math.round(value.n).toLocaleString('en-IN');
          },
        });
      });
    });

    return () => mm.revert();
  }, [scope]);
}

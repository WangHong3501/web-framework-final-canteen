import { gsap } from 'gsap'

export function mountScene(root, { login = false } = {}) {
  if (!(root instanceof Element)) return { revert() {} }
  const media = gsap.matchMedia()
  media.add(
    { all: '(min-width: 0px)', reduce: '(prefers-reduced-motion: reduce)' },
    (context) => {
      if (context.conditions.reduce) return
      const timeline = gsap.timeline({
        defaults: { duration: 0.5, ease: 'power2.out', clearProps: 'transform,opacity,visibility' },
      })
      timeline
        .addLabel('enter')
        .from('[data-enter]', { autoAlpha: 0, y: 14, stagger: 0.055 }, 'enter')
      if (login) timeline.from('[data-hero]', { autoAlpha: 0, x: 20, duration: 0.7 }, 'enter+=0.05')
    },
    root,
  )
  return media
}

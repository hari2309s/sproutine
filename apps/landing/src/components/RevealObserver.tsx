'use client'

import { useEffect } from 'react'

/** Fades `[data-reveal]` elements in as they scroll into view, staggering siblings. */
export function RevealObserver() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>('[data-reveal]')]
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach((el) => (el.dataset.reveal = 'in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const el = e.target as HTMLElement
          const i = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0
          el.style.transitionDelay = `${Math.min(i, 4) * 70}ms`
          el.dataset.reveal = 'in'
          io.unobserve(el)
        }
      },
      { threshold: 0.12 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return null
}

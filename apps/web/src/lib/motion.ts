/** Shared easing — matches accordion / UI motion. */
export const truffleEase = [0.4, 0, 0.2, 1] as const

export const transitionBase = {
  duration: 0.38,
  ease: truffleEase,
}

export const transitionSnappy = {
  duration: 0.28,
  ease: truffleEase,
}

/** Page / section entrance */
export const pageEnterVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: transitionBase,
}

/** Staggered list children */
export const staggerListVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
}

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: transitionSnappy,
  },
}

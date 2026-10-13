import Image from 'next/image'

/**
 * The sprouts plate cropped into a rounded tile. Sized by classes (not a
 * prop) so a single element can change size responsively.
 */
export function LogoTile({ className = 'h-[34px] w-[34px]' }: { className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-sproutine-border bg-sproutine-card ${className}`}
    >
      <Image
        src="/icons/sproutine.png"
        alt=""
        width={58}
        height={58}
        className="h-[130%] w-[130%] max-w-none object-cover"
      />
    </span>
  )
}

export function Wordmark({
  tileClass,
  textClass = 'text-xl',
}: {
  tileClass?: string
  textClass?: string
}) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoTile className={tileClass} />
      <span className={`font-display ${textClass} text-sproutine-text`}>Sproutine</span>
    </span>
  )
}

/** Rosie's avatar: the plate, zoomed in, on a soft terracotta disc. */
export function RosieAvatar({ size = 40 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-sproutine-accent-soft"
      style={{ width: size, height: size }}
    >
      <Image
        src="/icons/sproutine.png"
        alt=""
        width={Math.round(size * 1.75)}
        height={Math.round(size * 1.75)}
        className="max-w-none object-cover"
      />
    </span>
  )
}

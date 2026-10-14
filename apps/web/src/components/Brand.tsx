import Image from 'next/image'

/**
 * The sprouts plate on its own, no tile behind it. Sized by classes (not a
 * prop) so a single element can change size responsively.
 */
export function LogoTile({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <Image
      src="/icons/sproutine.png"
      alt=""
      width={88}
      height={88}
      className={`shrink-0 object-contain ${className}`}
    />
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
    <span className="flex items-center gap-1.5">
      <LogoTile className={tileClass} />
      <span className={`font-display ${textClass} text-sproutine-text`}>Sproutine</span>
    </span>
  )
}

/** Rosie's avatar: the plate on its own, no disc behind it. */
export function RosieAvatar({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/icons/sproutine.png"
      alt=""
      width={size * 2}
      height={size * 2}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  )
}

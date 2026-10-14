'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

// EAN-8, UPC-A, EAN-13, GTIN-14 — the codes Open Food Facts indexes.
const BARCODE = /^\d{8}$|^\d{12,14}$/
const SCAN_INTERVAL_MS = 250

type Decoder = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<string | null>

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
}
type BarcodeDetectorCtor = {
  new (opts: { formats: string[] }): BarcodeDetectorLike
  getSupportedFormats(): Promise<string[]>
}

/**
 * Native BarcodeDetector where the browser has it (Chrome on Android/macOS),
 * otherwise zxing-wasm (iOS Safari, Firefox). The wasm is self-hosted under
 * /wasm so scanning makes no third-party requests.
 */
async function createDecoder(force?: 'zxing'): Promise<Decoder> {
  const Native = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  if (Native && force !== 'zxing') {
    const supported = await Native.getSupportedFormats().catch(() => [] as string[])
    const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e'].filter((f) => supported.includes(f))
    if (formats.length) {
      const detector = new Native({ formats })
      return async (video) => (await detector.detect(video))[0]?.rawValue ?? null
    }
  }

  const zxing = await import('zxing-wasm/reader')
  zxing.prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith('.wasm') ? `/wasm/${path}` : prefix + path,
    },
  })
  return async (video, canvas) => {
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return null
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, w, h)
    const results = await zxing.readBarcodes(ctx.getImageData(0, 0, w, h), {
      formats: ['EAN13', 'EAN8', 'UPCA', 'UPCE'],
      tryHarder: true,
      maxNumberOfSymbols: 1,
    })
    return results.find((r) => r.isValid)?.text ?? null
  }
}

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onClose: () => void
  /** "Or just tell Rosie what it is" — hands off to chat. */
  onTellRosie?: () => void
  /** Test hook: force the zxing-wasm path even where BarcodeDetector exists. */
  decoder?: 'auto' | 'zxing'
}

export function BarcodeScanner({
  onDetected,
  onClose,
  onTellRosie,
  decoder = 'auto',
}: BarcodeScannerProps) {
  const { t } = useLanguage()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const doneRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [manual, setManual] = useState(false)
  const [typed, setTyped] = useState('')

  // Callbacks and copy live in refs so a parent re-render (an inline
  // onDetected, a language switch) never restarts the camera.
  const onDetectedRef = useRef(onDetected)
  const unavailableRef = useRef(t.scanner.cameraUnavailable)
  useEffect(() => {
    onDetectedRef.current = onDetected
    unavailableRef.current = t.scanner.cameraUnavailable
  })
  const streamRef = useRef<MediaStream | null>(null)

  /** Turns the camera (and its indicator light) off. */
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop())
    streamRef.current = null
    trackRef.current = null
  }, [])

  const finish = useCallback(
    (code: string) => {
      if (doneRef.current) return
      doneRef.current = true
      stopCamera()
      navigator.vibrate?.(30)
      onDetectedRef.current(code)
    },
    [stopCamera]
  )

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        })
        if (cancelled || doneRef.current) return stream.getTracks().forEach((tr) => tr.stop())
        streamRef.current = stream
        const track = stream.getVideoTracks()[0]
        trackRef.current = track ?? null
        const caps = track?.getCapabilities?.() as { torch?: boolean } | undefined
        setTorchSupported(!!caps?.torch)

        const video = videoRef.current!
        video.srcObject = stream
        await video.play()
        const decode = await createDecoder(decoder === 'zxing' ? 'zxing' : undefined)

        const tick = async () => {
          if (cancelled || doneRef.current) return
          try {
            const code = await decode(video, canvasRef.current!)
            if (code && BARCODE.test(code)) return finish(code)
          } catch {
            // A single bad frame is fine; keep scanning.
          }
          timer = setTimeout(tick, SCAN_INTERVAL_MS)
        }
        tick()
      } catch (e) {
        if (cancelled) return
        console.warn('[scanner]', e)
        // Camera or decoder unavailable: release the camera, offer typing.
        stopCamera()
        setError(unavailableRef.current)
        setManual(true)
      }
    })()

    return () => {
      cancelled = true
      clearTimeout(timer)
      stopCamera()
    }
  }, [decoder, finish, stopCamera])

  const toggleTorch = async () => {
    const track = trackRef.current
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setTorchOn(next)
    } catch {
      setTorchSupported(false)
    }
  }

  const typedValid = BARCODE.test(typed)

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={t.scanner.title}
      className="fixed inset-0 z-50 flex flex-col bg-[#14100d] text-[#f4eadc]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
        aria-hidden
      />
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label={t.scanner.close}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1c1612]/75"
        >
          <Icon name="close" size={22} />
        </button>
        <span className="text-base font-semibold">{t.scanner.title}</span>
        {torchSupported ? (
          <button
            type="button"
            onClick={toggleTorch}
            aria-label={torchOn ? t.scanner.torchOff : t.scanner.torchOn}
            aria-pressed={torchOn}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1c1612]/75"
          >
            <Icon name={torchOn ? 'flashlight_off' : 'flashlight_on'} size={22} />
          </button>
        ) : (
          <span className="w-11" />
        )}
      </div>

      {/* Viewfinder */}
      <div className="relative flex flex-1 items-center justify-center" aria-hidden>
        <div className="relative h-[170px] w-[280px]">
          {[
            'left-0 top-0 border-l-4 border-t-4 rounded-tl-[20px]',
            'right-0 top-0 border-r-4 border-t-4 rounded-tr-[20px]',
            'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-[20px]',
            'right-0 bottom-0 border-r-4 border-b-4 rounded-br-[20px]',
          ].map((c) => (
            <span key={c} className={`absolute h-10 w-10 border-sproutine-accent ${c}`} />
          ))}
          {!manual && (
            <span className="absolute top-1/2 right-5 left-5 h-0.5 rounded-sm bg-sproutine-accent motion-safe:animate-pulse" />
          )}
        </div>
      </div>

      <div className="safe-bottom relative flex flex-col gap-3 rounded-t-[28px] bg-sproutine-bg px-5 pt-5 pb-8 text-sproutine-text">
        <h2 className="font-display text-[22px]">
          {manual ? t.scanner.typeTitle : t.scanner.pointTitle}
        </h2>
        <p
          className="text-[15px] leading-normal text-sproutine-text-secondary"
          role={error ? 'alert' : undefined}
        >
          {error ?? (manual ? t.scanner.typeBody : t.scanner.pointBody)}
        </p>

        {manual ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (typedValid) finish(typed)
            }}
            className="flex gap-2"
          >
            <label htmlFor="barcode-input" className="sr-only">
              {t.scanner.typeTitle}
            </label>
            <input
              id="barcode-input"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              maxLength={14}
              value={typed}
              onChange={(e) => setTyped(e.target.value.replace(/\D/g, ''))}
              placeholder="4008400404127"
              className="field flex-1 font-mono tracking-wider"
            />
            <button type="submit" disabled={!typedValid} className="btn-primary px-5">
              {t.scanner.lookUp}
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setManual(true)} className="btn-secondary w-full">
            <Icon name="keyboard" size={20} />
            {t.scanner.typeInstead}
          </button>
        )}

        {onTellRosie && (
          <button type="button" onClick={onTellRosie} className="btn-ghost h-11 text-[15px]">
            {t.scanner.tellRosie}
          </button>
        )}
      </div>
    </motion.div>
  )
}

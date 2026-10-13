'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import posthog from 'posthog-js'

interface UseVoiceRecorderReturn {
  isRecording: boolean
  startRecording: () => Promise<void>
  stopRecording: () => void
  audioBlob: Blob | null
  transcript: string | null
  isTranscribing: boolean
  error: string | null
}

export function useVoiceRecorder(userId: string): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const startRecording = useCallback(async () => {
    try {
      // getUserMedia must be first — Safari revokes the user gesture after any other async op
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setError(null)
      setTranscript(null)

      // Pick best supported MIME type
      const mimeType =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find(
          (type) => MediaRecorder.isTypeSupported(type)
        ) ?? ''

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const resolvedMime = mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: resolvedMime })
        setAudioBlob(blob)
        await transcribeAudio(blob, resolvedMime)
      }

      mediaRecorder.start(250) // collect data every 250ms
      setIsRecording(true)
    } catch (err) {
      setError('Microphone access denied or unavailable')
      console.error('Recording error:', err)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [])

  // Stop microphone track if the component unmounts while recording is in progress
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const transcribeAudio = async (blob: Blob, mime: string) => {
    setIsTranscribing(true)
    try {
      const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'
      const formData = new FormData()
      formData.append('audio', blob, `recording.${ext}`)

      const response = await fetch('/api/voice', {
        method: 'POST',
        body: formData,
      })

      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Transcription failed')

      posthog.capture('voice_input_used', { mime_type: mime })

      setTranscript(json.transcript)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not transcribe audio.'
      setError(msg)
      console.error('Transcription error:', err)
    } finally {
      setIsTranscribing(false)
    }
  }

  return {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    transcript,
    isTranscribing,
    error,
  }
}

'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ProGateSheet, type GateSource } from '@/components/ProGateSheet'
import { useEntitlement } from './useEntitlement'

async function needsCrisisReply(message: string): Promise<boolean> {
  try {
    const res = await fetch('/api/chat/screen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    return res.ok && ((await res.json()) as { urgent: boolean }).urgent
  } catch {
    return false
  }
}

/**
 * Pro entry points (chat, mic, photo) for Free users open the Pro sheet
 * instead. While the plan is loading everything is allowed: the server
 * enforces the plan either way.
 */
export function useProGuard() {
  const { pro } = useEntitlement()
  const [gate, setGate] = useState<GateSource | null>(null)
  const locked = pro === false

  const guard = (source: GateSource, action: () => void) => () => {
    if (locked) setGate(source)
    else action()
  }

  /**
   * Sends a chat message. For Free users only messages that need the crisis
   * reply go through; anything else opens the sheet. Resolves to whether it sent.
   */
  const sendGuarded = async (text: string, send: (text: string) => void): Promise<boolean> => {
    if (!locked || (await needsCrisisReply(text))) {
      send(text)
      return true
    }
    setGate('chat')
    return false
  }

  const sheet = (
    <AnimatePresence>
      {gate && <ProGateSheet source={gate} onClose={() => setGate(null)} />}
    </AnimatePresence>
  )

  return { locked, guard, sendGuarded, sheet }
}

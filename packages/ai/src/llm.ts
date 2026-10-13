// GPT-OSS models (Groq, Cerebras) are reasoning models. `reasoningEffort: 'low'`
// keeps the chain-of-thought short so it barely eats into `maxOutputTokens`, and
// `reasoningFormat: 'parsed'` moves it into a separate field so `text` is only
// the answer (callers parse labels out of it). Non-Groq providers ignore the
// `groq` key.
export const groqProviderOptions = {
  groq: { reasoningFormat: 'parsed' as const, reasoningEffort: 'low' as const },
}

// Conversational replies get a little more deliberation — warmer, less clipped.
// Callers must leave `maxOutputTokens` headroom: parsed reasoning still counts.
export const groqChatProviderOptions = {
  groq: { reasoningFormat: 'parsed' as const, reasoningEffort: 'medium' as const },
}

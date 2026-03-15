import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
export const CLAUDE_MODEL = 'claude-sonnet-4-6' as const

/**
 * Calls Claude with a timeout. Returns the text of the first content block,
 * or throws if the call times out, errors, or returns a non-text response.
 * Clears the timeout timer after the race settles to avoid leaks.
 */
export async function callClaude({
  system,
  userMessage,
  maxTokens,
  timeoutMs,
}: {
  system: string
  userMessage: string
  maxTokens: number
  timeoutMs: number
}): Promise<string> {
  let timerId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => reject(new Error('Claude timeout')), timeoutMs)
  })

  try {
    const response = await Promise.race([
      anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userMessage }],
      }),
      timeoutPromise,
    ])

    const content = response.content[0]
    if (content.type !== 'text' || !content.text.trim()) {
      throw new Error('Unparseable Claude response')
    }
    return content.text.trim()
  } finally {
    clearTimeout(timerId)
  }
}

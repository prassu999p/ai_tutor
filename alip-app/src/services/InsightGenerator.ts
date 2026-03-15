import { callClaude } from '@/lib/anthropic'

export interface ParentInsightResult {
  whatToDo: string
  source: 'llm' | 'fallback'
}

export interface ParentInsightParams {
  studentName: string
  misconceptionId: string
  misconceptionPlainName: string   // e.g., "Adding denominators together"
  occurrenceCount: number
  exampleWrongAnswer: string       // e.g., student wrote "2/7" for 1/3 + 1/4
  exampleQuestion: string          // e.g., "1/3 + 1/4 = ?"
  remediationStrategy?: string     // from misconception_types.remediation_strategy
}

const SYSTEM_PROMPT = `You are helping a parent understand how to support their child's math learning at home.
The child has been making a specific type of mistake in fractions.
Write ONE specific, actionable thing the parent can do with their child in 5 minutes at home.

Rules:
- Address the parent as "you" and the child by first name
- Use plain, friendly language — no math jargon
- Be concrete and specific (describe exactly what to do, not just "practice fractions")
- Keep it to 2-3 sentences maximum
- Tone: supportive and encouraging, not alarming`

export const InsightGenerator = {
  generateParentInsight: async (
    params: ParentInsightParams
  ): Promise<ParentInsightResult> => {
    const userMessage = [
      `Child's name: ${params.studentName}`,
      `Mistake pattern: ${params.misconceptionPlainName}`,
      `Example: ${params.studentName} answered "${params.exampleWrongAnswer}" when asked "${params.exampleQuestion}"`,
      `This has happened ${params.occurrenceCount} time(s).`,
      params.remediationStrategy
        ? `Teaching note: ${params.remediationStrategy}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const whatToDo = await callClaude({
        system: SYSTEM_PROMPT,
        userMessage,
        maxTokens: 150,
        timeoutMs: 5000,
      })
      return { whatToDo, source: 'llm' }
    } catch {
      return {
        whatToDo:
          'Try working through a few fraction problems together on paper, focusing on what the top and bottom numbers each mean.',
        source: 'fallback',
      }
    }
  },
}

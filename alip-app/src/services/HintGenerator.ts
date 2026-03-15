import { callClaude } from '@/lib/anthropic'

export interface HintResult {
  hint: string
  source: 'llm' | 'fallback'
}

export interface HintParams {
  skillName: string
  questionText: string
  masteryScore: number
  sessionErrors: string[]  // wrong answers given this session for this skill
  staticHint?: string      // pre-written hint from question.hint_text (fallback)
}

const SYSTEM_PROMPT = `You are a patient math tutor giving a student a hint on a fractions problem.
Write exactly ONE sentence that helps the student think in the right direction
without giving away the answer.

Rules:
- Address the student as "you"
- Never reveal the correct answer
- Reference their specific errors if they made any
- Keep it under 20 words
- Start with an action verb (e.g., "Think about...", "Remember that...", "Look at...")`

export const HintGenerator = {
  generate: async (params: HintParams): Promise<HintResult> => {
    const errorsLine =
      params.sessionErrors.length > 0
        ? `Student's recent wrong answers: ${params.sessionErrors.join(', ')}`
        : ''

    const userMessage = [
      `Skill: ${params.skillName}`,
      `Question: ${params.questionText}`,
      errorsLine,
      `Mastery: ${Math.round(params.masteryScore * 100)}%`,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const hint = await callClaude({
        system: SYSTEM_PROMPT,
        userMessage,
        maxTokens: 60,
        timeoutMs: 3000,
      })
      return { hint, source: 'llm' }
    } catch {
      return {
        hint:
          params.staticHint ??
          'Think carefully about what each part of the fraction represents.',
        source: 'fallback',
      }
    }
  },
}

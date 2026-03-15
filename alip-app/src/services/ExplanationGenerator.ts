import { callClaude } from '@/lib/anthropic'

export interface ExplanationResult {
  explanation: string
  source: 'llm' | 'fallback'
}

export interface ExplanationParams {
  skillName: string
  skillId: string
  questionText: string
  correctAnswer: string
  studentAnswer: string
  isCorrect: boolean
  masteryScore: number           // 0.0–1.0 — adjust language complexity
  recentMisconceptions: string[] // list of recent misconception plain names
}

const SYSTEM_PROMPT = `You are a patient math tutor helping a student who is learning fractions.
Your job is to explain why their answer was correct or incorrect in 2-3 sentences.

Rules:
- Address the student directly as "you" (never "students" or "the student")
- Never say "this is easy", "obviously", "simply", or "just"
- If wrong: explain exactly what error was made and show the correct reasoning
- If correct: briefly reinforce why their approach was right
- Use simple language appropriate for a student 2 years below grade level
- Maximum 3 sentences. Be concise.
- Never end with a question.`

export const ExplanationGenerator = {
  generate: async (params: ExplanationParams): Promise<ExplanationResult> => {
    const misconceptionsLine =
      params.recentMisconceptions.length > 0
        ? `Recent misconceptions: ${params.recentMisconceptions.join(', ')}`
        : ''

    const userMessage = [
      `Skill: ${params.skillName}`,
      `Question: ${params.questionText}`,
      `Correct answer: ${params.correctAnswer}`,
      `Student answered: ${params.studentAnswer}`,
      `Result: ${params.isCorrect ? 'Correct' : 'Incorrect'}`,
      `Student mastery level: ${Math.round(params.masteryScore * 100)}%`,
      misconceptionsLine,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const explanation = await callClaude({
        system: SYSTEM_PROMPT,
        userMessage,
        maxTokens: 150,
        timeoutMs: 4000,
      })
      return { explanation, source: 'llm' }
    } catch {
      const explanation =
        params.isCorrect
          ? 'Great work! That is exactly right.'
          : `The correct answer is ${params.correctAnswer}.`
      return { explanation, source: 'fallback' }
    }
  },
}

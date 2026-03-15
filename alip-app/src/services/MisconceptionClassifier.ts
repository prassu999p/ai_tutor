import { supabaseServer } from '@/lib/supabase'
import type { ClassifierResult, Distractor } from '@/types'

// Module-level cache: questionId → Map<answer, misconceptionId>
let distractorCache: Map<string, Map<string, string>> | null = null

async function loadDistractorCache(): Promise<void> {
  const { data, error } = await supabaseServer
    .from('questions')
    .select('id, distractors')

  if (error) {
    throw new Error(`Failed to load questions for classifier: ${error.message}`)
  }

  distractorCache = new Map()

  for (const question of data ?? []) {
    const answerMap = new Map<string, string>()

    if (Array.isArray(question.distractors)) {
      for (const distractor of question.distractors as Distractor[]) {
        if (distractor.answer != null && distractor.misconception_id != null) {
          answerMap.set(
            String(distractor.answer).trim().toLowerCase(),
            distractor.misconception_id
          )
        }
      }
    }

    distractorCache.set(question.id, answerMap)
  }
}

const MisconceptionClassifier = {
  classify: async (
    questionId: string,
    studentAnswer: string,
    correctAnswer: string
  ): Promise<ClassifierResult> => {
    try {
      if (studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
        return { misconceptionId: null, confidence: null, classifierType: 'rule_based', reasoning: null }
      }

      if (distractorCache === null) {
        await loadDistractorCache()
      }

      const answerMap = distractorCache!.get(questionId)
      if (answerMap == null) {
        return { misconceptionId: null, confidence: null, classifierType: 'rule_based', reasoning: null }
      }

      const misconceptionId = answerMap.get(studentAnswer.trim().toLowerCase()) ?? null
      return { misconceptionId, confidence: null, classifierType: 'rule_based', reasoning: null }
    } catch {
      return { misconceptionId: null, confidence: null, classifierType: 'rule_based', reasoning: null }
    }
  },
}

export default MisconceptionClassifier

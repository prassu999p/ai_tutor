import { supabaseServer } from '@/lib/supabase';
import { QuestionSelector } from './QuestionSelector';
import { MasteryService } from './MasteryService';
import { DEFAULT_CONCEPT_ID } from '@/lib/constants';
import type { Question, MicroSkill, Session } from '@/types';

// ── Response Types ──────────────────────────────────────────

export interface SessionStartResult {
    sessionId: string;
    skillId: string;
    skill: MicroSkill;
    introVideoUrl: string | null;
    firstQuestion: Question;
    currentMastery: number;
}

export interface SessionSummary {
    sessionId: string;
    questionsAnswered: number;
    skillsImproved: Array<{
        skillName: string;
        before: number;
        after: number;
    }>;
    skillsPracticed: number;
    skillsMastered: string[];
    sessionDurationMin: number;
}

/**
 * SessionService — manages session lifecycle.
 */
export const SessionService = {

    async startSession(studentId: string): Promise<SessionStartResult> {
        // 1. Get the next skill
        let nextSkillId = await MasteryService.getNextSkill(studentId, DEFAULT_CONCEPT_ID);

        // If no skill is found, it could be a new student. Initialize their skills and try again.
        if (!nextSkillId) {
            console.log(`Initializing skills for new student: ${studentId}`);
            try {
                await MasteryService.initStudentSkills(studentId, DEFAULT_CONCEPT_ID);
                nextSkillId = await MasteryService.getNextSkill(studentId, DEFAULT_CONCEPT_ID);
            } catch (err) {
                console.error('Failed to initialize student skills:', err);
                throw new Error('Failed to initialize student profile. Please ensure the student exists.');
            }
            
            if (!nextSkillId) {
                throw new Error('No available skill to practice. All skills may be mastered.');
            }
        }

        // 2. Get skill details
        const { data: rawSkill } = await supabaseServer
            .from('micro_skills')
            .select('*')
            .eq('id', nextSkillId)
            .single();

        const skill = rawSkill as MicroSkill | null;
        if (!skill) {
            throw new Error(`Skill ${nextSkillId} not found`);
        }

        // 3. Get student's current mastery for this skill
        const { data: rawSkillState } = await supabaseServer
            .from('student_skill_state')
            .select('mastery_score, last_practiced_at')
            .eq('student_id', studentId)
            .eq('skill_id', nextSkillId)
            .single();

        // Validate and cast skill state with proper null handling
        const skillState = rawSkillState as { mastery_score: number; last_practiced_at: string | null } | null;
        const masteryScore = skillState?.mastery_score ?? 0;
        const isNewSkill = !skillState?.last_practiced_at;

        // 4. Create session
        const { data: rawSession, error: sessionError } = await supabaseServer
            .from('sessions')
            .insert({
                student_id: studentId,
                status: 'active',
                started_at: new Date().toISOString(),
                questions_answered: 0,
                skills_practiced: [nextSkillId],
            })
            .select()
            .single();

        const session = rawSession as Session | null;
        if (sessionError || !session) {
            // Log detailed error server-side, return generic message to client
            console.error('Session creation error:', sessionError);
            throw new Error('Failed to create session. Please try again.');
        }

        // 5. Select the first question
        const firstQuestion = await QuestionSelector.selectQuestion(
            nextSkillId,
            studentId,
            session.id,
            masteryScore
        );

        // 6. Get intro video URL (only for new skills)
        const skillRecord = skill as unknown as Record<string, unknown>;
        const introVideoUrl: string | null = isNewSkill
            ? (skillRecord.intro_video_url as string | null) ?? null
            : null;

        return {
            sessionId: session.id,
            skillId: nextSkillId,
            skill,
            introVideoUrl,
            firstQuestion,
            currentMastery: masteryScore,
        };
    },

    async endSession(sessionId: string): Promise<SessionSummary> {
        const now = new Date().toISOString();
        const { data: rawSession } = await supabaseServer
            .from('sessions')
            .update({
                status: 'completed',
                ended_at: now,
            })
            .eq('id', sessionId)
            .select()
            .single();

        const session = rawSession as Session | null;
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const startTime = new Date(session.started_at).getTime();
        const endTime = new Date(now).getTime();
        const durationMin = Math.round((endTime - startTime) / 60000);

        // Get interactions for skill improvement calculation
        const { data: rawInteractions } = await supabaseServer
            .from('interactions')
            .select('skill_id, mastery_before, mastery_after')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        type InteractionSlice = { skill_id: string; mastery_before: number; mastery_after: number };
        const interactions = (rawInteractions ?? []) as InteractionSlice[];

        const skillChanges = new Map<string, { first: number; last: number }>();
        for (const interaction of interactions) {
            if (!skillChanges.has(interaction.skill_id)) {
                skillChanges.set(interaction.skill_id, {
                    first: interaction.mastery_before ?? 0,
                    last: interaction.mastery_after ?? 0,
                });
            } else {
                skillChanges.get(interaction.skill_id)!.last = interaction.mastery_after ?? 0;
            }
        }

        // Get skill names
        const skillIds = Array.from(skillChanges.keys());
        const { data: rawSkills } = await supabaseServer
            .from('micro_skills')
            .select('id, name')
            .in('id', skillIds);

        const skills = (rawSkills ?? []) as Array<{ id: string; name: string }>;
        const skillNameMap = new Map(skills.map((s) => [s.id, s.name]));

        const skillsImproved = Array.from(skillChanges.entries())
            .filter(([, change]) => change.last > change.first)
            .map(([skillId, change]) => ({
                skillName: skillNameMap.get(skillId) ?? skillId,
                before: Math.round(change.first * 100) / 100,
                after: Math.round(change.last * 100) / 100,
            }));

        const skillsMastered = Array.from(skillChanges.entries())
            .filter(([, change]) => change.last >= 0.80 && change.first < 0.80)
            .map(([skillId]) => skillNameMap.get(skillId) ?? skillId);

        // Calculate actual skills practiced from the session table directly, 
        // fallback to unique interactions length if null
        const sessionRecord = session as unknown as { skills_practiced: string[] | null };
        const skillsPracticed = sessionRecord.skills_practiced?.length ?? skillIds.length;

        return {
            sessionId,
            questionsAnswered: session.questions_answered,
            skillsImproved,
            skillsPracticed,
            skillsMastered,
            sessionDurationMin: durationMin,
        };
    },

    async getNextQuestion(
        sessionId: string,
        skillId: string,
        studentId: string
    ): Promise<Question> {
        const { data: rawState } = await supabaseServer
            .from('student_skill_state')
            .select('mastery_score')
            .eq('student_id', studentId)
            .eq('skill_id', skillId)
            .single();

        const masteryScore = (rawState as { mastery_score: number } | null)?.mastery_score ?? 0;
        return QuestionSelector.selectQuestion(skillId, studentId, sessionId, masteryScore);
    },

    async updateSkillsPracticed(sessionId: string, skillId: string): Promise<void> {
        const { data: rawSession } = await supabaseServer
            .from('sessions')
            .select('skills_practiced')
            .eq('id', sessionId)
            .single();

        const session = rawSession as { skills_practiced: string[] } | null;
        if (session) {
            const current = session.skills_practiced ?? [];
            if (!current.includes(skillId)) {
                await supabaseServer
                    .from('sessions')
                    .update({ skills_practiced: [...current, skillId] })
                    .eq('id', sessionId);
            }
        }
    },

    async incrementQuestionCount(sessionId: string): Promise<void> {
        const { data: rawSession } = await supabaseServer
            .from('sessions')
            .select('questions_answered')
            .eq('id', sessionId)
            .single();

        const session = rawSession as { questions_answered: number } | null;
        if (session) {
            await supabaseServer
                .from('sessions')
                .update({ questions_answered: session.questions_answered + 1 })
                .eq('id', sessionId);
        }
    },
};

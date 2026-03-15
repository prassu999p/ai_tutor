import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseServer = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: interactions } = await supabaseServer
        .from('interactions')
        .select('id, skill_id, mastery_before, mastery_after, event_type')
        .order('created_at', { ascending: false })
        .limit(10);
    console.log("Interactions:", interactions);

    const { data: skills } = await supabaseServer
        .from('student_skill_state')
        .select('skill_id, mastery_score')
        .limit(5);
    console.log("Skill states:", skills);

    const { data: sessionData } = await supabaseServer
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2);
    console.log("Sessions:", sessionData?.map(s => ({ id: s.id, q_ans: s.questions_answered })));
}

test();

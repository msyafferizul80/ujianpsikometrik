import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const teras = searchParams.get('teras');

        // Use service role or anon key to get user
        const authHeader = req.headers.get('Authorization') || '';
        const token = authHeader.replace('Bearer ', '');

        let targetDifficulty = 2; // Default starting difficulty if no user state

        let authenticatedClient = supabaseAdmin;

        if (token) {
            const { data: { user } } = await supabaseAuth.auth.getUser(token);
            if (user) {
                // Determine target difficulty based on performance.
                authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
                    global: { headers: { Authorization: `Bearer ${token}` } }
                });

                const { data: attempts } = await authenticatedClient
                    .from('exam_attempts')
                    .select('teras_scores')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);
                if (attempts && attempts.length > 0) {
                    let totalScore = 0;
                    let count = 0;

                    attempts.forEach(a => {
                        const scores = a.teras_scores as Record<string, number>;
                        if (scores) {
                            if (teras && scores[teras] !== undefined) {
                                totalScore += scores[teras];
                                count += 10; // Assuming max is 10 per teras per attempt for normalization, though actual varies.
                            } else {
                                // Average across all
                                Object.values(scores).forEach(s => {
                                    totalScore += s;
                                    count += 10;
                                });
                            }
                        }
                    });

                    if (count > 0) {
                        const pct = (totalScore / count) * 100;
                        if (pct >= 85) targetDifficulty = 4;
                        else if (pct >= 70) targetDifficulty = 3;
                        else if (pct >= 50) targetDifficulty = 2;
                        else targetDifficulty = 1;
                    }
                }
            }
        }

        // Fetch questions around the target difficulty (+- 1)
        console.log(`🧠 Adaptive Algo: Target Difficulty is ${targetDifficulty}`);

        // Construct query safely
        let qQuery = authenticatedClient.from('questions').select('id, teras, question, options, correct_answer');

        // Supabase v2 PostgREST builder allows chaining or conditional chaining via .match() or just building the query
        if (teras) {
            qQuery = qQuery.eq('teras', teras);
        }

        // Fetch a mix: 60% at target difficulty, 20% harder (+1), 20% easier (-1)
        qQuery = qQuery.in('difficulty_level', [
            Math.max(1, targetDifficulty - 1),
            targetDifficulty,
            Math.min(5, targetDifficulty + 1)
        ]);

        const { data: rawQuestions, error } = await qQuery.limit(50); // Fetch pool

        if (error) throw error;

        // Shuffle the pool and pick ~10 (or requested limit)
        const shuffled = (rawQuestions || []).sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 10);

        // Secure map
        const secureQuestions = selected.map((q: any) => ({
            id: q.id,
            teras: q.teras,
            question: q.question,
            options: q.options,
            // Keep correct_answer if frontend uses it for scoring, or omit if scored server-side.
            // Existing app relies on frontend scoring (based on quiz/page.tsx check)
            correctAnswer: q.correct_answer
        }));

        return NextResponse.json(secureQuestions);

    } catch (err: any) {
        console.error("Adaptive API Error:", err);
        return NextResponse.json({ error: "Failed to load adaptive questions" }, { status: 500 });
    }
}

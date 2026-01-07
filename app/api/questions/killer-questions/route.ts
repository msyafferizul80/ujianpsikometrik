import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import questions from '@/data/questions.json';

export async function GET() {
    try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            throw new Error("Missing Supabase Env Vars");
        }

        // Initialize Supabase inside handler to ensure env vars are ready and avoid caching stale clients
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // 1. Fetch recent attempts (limit 200 for speed)
        // We only need the 'answers' column. 
        // NOTE: Table name is 'attempts', NOT 'quiz_attempts'
        const { data: attempts, error } = await supabase
            .from('attempts')
            .select('answers')
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw new Error(`Supabase Error: ${error.message}`);

        // 2. Initialize stats container using ID as key
        const stats: Record<number, { correct: number, total: number }> = {};

        if (!questions || !Array.isArray(questions)) {
            throw new Error("Questions data is missing or invalid");
        }

        questions.forEach(q => {
            stats[q.id] = { correct: 0, total: 0 };
        });

        // 3. Analyze attempts
        attempts?.forEach((attempt: { answers: any }) => {
            if (!attempt.answers) return;
            const userAnswers = attempt.answers;

            // Safety check for userAnswers type
            if (typeof userAnswers !== 'object') return;

            Object.keys(userAnswers).forEach((qIdStr) => {
                const qId = parseInt(qIdStr);
                const userAns = userAnswers[qIdStr];

                // Find correct answer for this question
                const questionDef = questions.find(q => q.id === qId);

                if (questionDef && stats[qId]) {
                    stats[qId].total++;
                    if (userAns === questionDef.bestAnswer) {
                        stats[qId].correct++;
                    }
                }
            });
        });

        // 4. Calculate Failure Rate & Sort
        const killerQuestions = questions.map(q => {
            const s = stats[q.id];
            const attemptsCount = s.total;
            const failureRate = attemptsCount > 0 ? 1 - (s.correct / attemptsCount) : 0;
            return { ...q, failureRate, attemptsCount };
        })
            .filter(q => q.attemptsCount > 0)
            .sort((a, b) => b.failureRate - a.failureRate)
            .slice(0, 20);

        // If not enough data (e.g. fresh DB), fallback to random hard questions or just first 20
        let finalQuestions: any[] = killerQuestions;
        if (finalQuestions.length < 5) {
            // console.log("Not enough data, using fallback questions");
            finalQuestions = questions.slice(0, 20);
        }

        return NextResponse.json(finalQuestions);

    } catch (error: any) {
        console.error("Killer Algo Error (Using Fallback):", error);
        // Fallback to first 20 questions if DB fails to prevent "No questions found" UI
        const fallback = questions && Array.isArray(questions) ? questions.slice(0, 20) : [];
        return NextResponse.json(fallback);
    }
}

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    try {
        const { score, quizId } = await req.json();

        if (score === undefined || !quizId) {
            return NextResponse.json({ error: "Missing score or quizId" }, { status: 400 });
        }

        // 1. Get all attempts for this quiz from the CORRECT table: 'attempts'
        const { data: attempts, error } = await supabase
            .from('attempts')              // ← was incorrectly 'quiz_attempts'
            .select('score, quizzes(total_questions)')
            .eq('quiz_id', quizId);

        if (error) throw error;

        if (!attempts || attempts.length === 0) {
            return NextResponse.json({
                averageScore: null,
                percentile: null,
                totalCandidates: 0
            });
        }

        // 2. Convert raw scores to percentages for fair comparison
        // attempts.score is raw points (e.g. 770), quiz has total_questions * 10 = max points
        const toPercentage = (raw: number, maxScore: number) =>
            maxScore > 0 ? Math.round((raw / maxScore) * 100) : 0;

        const percentageScores = attempts.map((a) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const totalQ = (a.quizzes as any)?.total_questions || 0;
            const maxScore = totalQ * 10;
            return toPercentage(a.score || 0, maxScore);
        });

        // 3. Calculate Statistics
        const totalCandidates = percentageScores.length;
        const sumScores = percentageScores.reduce((acc, s) => acc + s, 0);
        const averageScore = Math.round(sumScores / totalCandidates);

        // 4. Calculate current user's percentage
        // The `score` param from client is raw points; convert it
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const firstAttempt = attempts[0] as any;
        const totalQ = firstAttempt?.quizzes?.total_questions || 0;
        const maxScore = totalQ * 10;
        const userPercentage = toPercentage(score, maxScore);

        // 5. Percentile: how many scored strictly below the user
        const peopleStrictlyBelow = percentageScores.filter(s => s < userPercentage).length;
        let percentile = totalCandidates > 0
            ? Math.round((peopleStrictlyBelow / totalCandidates) * 100)
            : 0;

        // Clamp 1–99
        percentile = Math.max(1, Math.min(99, percentile));

        // Edge case: If user has highest score → Top 1%
        if (userPercentage >= Math.max(...percentageScores)) {
            percentile = 99;
        }

        return NextResponse.json({
            averageScore,
            percentile,
            totalCandidates,
            userPercentage,
        });

    } catch (error) {
        console.error("Analytics Error:", error);
        return NextResponse.json({ error: "Failed to calculate analytics" }, { status: 500 });
    }
}

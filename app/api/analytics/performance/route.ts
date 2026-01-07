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

        // 1. Get all attempts for this quiz to calculate stats
        // Optimally, this should be a stored procedure or materialized view for scale,
        // but for now, we'll do a direct query as volume is manageable.
        const { data: attempts, error } = await supabase
            .from('quiz_attempts')
            .select('score')
            .eq('quiz_id', quizId);

        if (error) throw error;

        if (!attempts || attempts.length === 0) {
            return NextResponse.json({
                averageScore: score,
                percentile: 100,
                totalCandidates: 1
            });
        }

        // 2. Calculate Statistics
        const totalCandidates = attempts.length;
        const totalScore = attempts.reduce((acc, curr) => acc + (curr.score || 0), 0);
        const averageScore = Math.round(totalScore / totalCandidates);

        // 3. Calculate Percentile
        // Percentile = (Number of people below you / Total people) * 100
        const peopleBelowAndEqual = attempts.filter(a => (a.score || 0) <= score).length;

        // Use standard percentile formula: (Rank / N) * 100
        // Rank is position in sorted list (ascending).
        const peopleStrictlyBelow = attempts.filter(a => (a.score || 0) < score).length;

        // We'll use a friendly "Top X%" metric or standard percentile.
        // Let's return standard percentile: "You scored higher than P% of candidates."
        let percentile = (peopleStrictlyBelow / totalCandidates) * 100;

        // Clamp min/max for UX
        if (percentile < 1) percentile = 1;
        if (percentile > 99) percentile = 99;

        // Edge case: If you have the highest score (or tied for highest), allow 99+ or "Top 1%"
        if (score >= Math.max(...attempts.map(a => a.score || 0))) {
            percentile = 99;
        }

        return NextResponse.json({
            averageScore,
            percentile: Math.round(percentile),
            totalCandidates
        });

    } catch (error) {
        console.error("Analytics Error:", error);
        return NextResponse.json({ error: "Failed to calculate analytics" }, { status: 500 });
    }
}

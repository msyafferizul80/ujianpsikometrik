import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Use service role to bypass RLS for server-side writes
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { quiz_id, user_id, user_name, duration_minutes = 90 } = await req.json();

        if (!quiz_id || !user_id) {
            return NextResponse.json({ error: 'Missing quiz_id or user_id' }, { status: 400 });
        }

        // Check if there's already an active (unsubmitted) session for this user + quiz
        // to prevent multiple sessions
        const { data: existing } = await supabase
            .from('attempts')
            .select('id, started_at, duration_minutes')
            .eq('quiz_id', quiz_id)
            .eq('user_id', user_id)
            .is('score', null)  // Not yet submitted
            .not('started_at', 'is', null)
            .order('started_at', { ascending: false })
            .limit(1)
            .single();

        if (existing) {
            // Resume existing session
            const startedAt = new Date(existing.started_at);
            const dur = existing.duration_minutes ?? duration_minutes;
            const endsAt = new Date(startedAt.getTime() + dur * 60 * 1000);
            const secondsRemaining = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 1000));

            if (secondsRemaining > 0) {
                return NextResponse.json({
                    attempt_id: existing.id,
                    started_at: existing.started_at,
                    ends_at: endsAt.toISOString(),
                    seconds_remaining: secondsRemaining,
                    resumed: true,
                });
            }
            // Session expired — fall through to create a new one
        }

        // Create a new attempt row with started_at = now
        const startedAt = new Date();
        const endsAt = new Date(startedAt.getTime() + duration_minutes * 60 * 1000);

        const { data: attempt, error } = await supabase
            .from('attempts')
            .insert({
                quiz_id,
                user_id,
                user_name: user_name || 'Calon',
                started_at: startedAt.toISOString(),
                duration_minutes,
                score: null,     // Will be set on submit
                answers: {},
                tab_switches: 0,
                violations: [],
            })
            .select('id')
            .single();

        if (error) throw error;

        return NextResponse.json({
            attempt_id: attempt.id,
            started_at: startedAt.toISOString(),
            ends_at: endsAt.toISOString(),
            seconds_remaining: duration_minutes * 60,
            resumed: false,
        });

    } catch (error) {
        console.error('Exam start error:', error);
        return NextResponse.json({ error: 'Failed to start exam session' }, { status: 500 });
    }
}

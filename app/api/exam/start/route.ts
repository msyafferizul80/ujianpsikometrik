import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        // Extract user's JWT token from Authorization header
        // This makes auth.uid() work correctly on the server, satisfying RLS policies
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        // Use service role key if available (bypasses RLS entirely),
        // otherwise use anon key + user's JWT token via Authorization header
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            supabaseKey,
            token && !process.env.SUPABASE_SERVICE_ROLE_KEY
                ? { global: { headers: { Authorization: `Bearer ${token}` } } }
                : {}
        );

        const { quiz_id, user_id, user_name, duration_minutes = 90 } = await req.json();

        if (!quiz_id || !user_id) {
            return NextResponse.json({ error: 'Missing quiz_id or user_id' }, { status: 400 });
        }

        // Check if there's already an active (unsubmitted) session for this user + quiz
        const { data: existing } = await supabase
            .from('attempts')
            .select('id, started_at, duration_minutes')
            .eq('quiz_id', quiz_id)
            .eq('user_id', user_id)
            .is('score', null)
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

        // Create a new attempt row
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
                score: null,
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

    } catch (error: any) {
        console.error('Exam start error:', error);
        const msg = error?.message || 'Failed to start exam session';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

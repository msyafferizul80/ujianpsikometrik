import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { attempt_id, answers, tab_switches, violation } = await req.json();

        if (!attempt_id) {
            return NextResponse.json({ error: 'Missing attempt_id' }, { status: 400 });
        }

        // 1. Fetch the session to get timing info
        const { data: attempt, error: fetchError } = await supabase
            .from('attempts')
            .select('started_at, duration_minutes, violations')
            .eq('id', attempt_id)
            .single();

        if (fetchError || !attempt) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // 2. Compute seconds remaining (server-authoritative)
        const startedAt = new Date(attempt.started_at);
        const dur = attempt.duration_minutes ?? 90;
        const endsAt = new Date(startedAt.getTime() + dur * 60 * 1000);
        const secondsRemaining = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 1000));

        // 3. Build updated violations list
        let updatedViolations = Array.isArray(attempt.violations) ? [...attempt.violations] : [];
        if (violation) {
            updatedViolations.push({
                type: violation.type,
                timestamp: new Date().toISOString(),
            });
        }

        // 4. Save answers snapshot + violations
        const updatePayload: Record<string, unknown> = {
            violations: updatedViolations,
        };
        if (answers !== undefined) updatePayload.answers = answers;
        if (tab_switches !== undefined) updatePayload.tab_switches = tab_switches;

        await supabase
            .from('attempts')
            .update(updatePayload)
            .eq('id', attempt_id);

        return NextResponse.json({
            seconds_remaining: secondsRemaining,
            ends_at: endsAt.toISOString(),
            violations_count: updatedViolations.length,
            time_expired: secondsRemaining <= 0,
        });

    } catch (error) {
        console.error('Heartbeat error:', error);
        return NextResponse.json({ error: 'Heartbeat failed' }, { status: 500 });
    }
}

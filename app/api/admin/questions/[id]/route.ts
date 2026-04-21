import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET a single question by ID
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    const { data, error } = await supabaseAdmin
        .from('questions')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

// PATCH - Update a single question
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    try {
        const body = await request.json();
        const { question_text, options, correct_answer, teras, explanation } = body;

        // Build update payload - only include provided fields
        const updatePayload: Record<string, any> = {};
        if (question_text !== undefined) updatePayload.question_text = question_text;
        if (options !== undefined) updatePayload.options = options;
        if (correct_answer !== undefined) updatePayload.correct_answer = correct_answer;
        if (teras !== undefined) updatePayload.teras = teras;
        if (explanation !== undefined) updatePayload.explanation = explanation;

        if (Object.keys(updatePayload).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('questions')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

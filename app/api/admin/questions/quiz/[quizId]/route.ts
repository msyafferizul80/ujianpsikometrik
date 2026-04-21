import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET all questions for a quiz
export async function GET(
    request: NextRequest,
    { params }: { params: { quizId: string } }
) {
    const { quizId } = params;

    // Validate quizId
    if (!quizId) {
        return NextResponse.json({ error: 'Quiz ID diperlukan' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase environment variables tidak dikonfigurasi' }, { status: 500 });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Try both string and integer comparison to handle different column types
        const numericId = parseInt(quizId, 10);
        const useNumeric = !isNaN(numericId);

        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('quiz_id', useNumeric ? numericId : quizId)
            .order('id', { ascending: true });

        if (error) {
            console.error('[API /admin/questions/quiz] Supabase error:', error);
            return NextResponse.json(
                { error: `Database error: ${error.message}`, details: error.details, hint: error.hint },
                { status: 500 }
            );
        }

        return NextResponse.json(data || []);

    } catch (err: any) {
        console.error('[API /admin/questions/quiz] Unexpected error:', err);
        return NextResponse.json({ error: err.message || 'Ralat tidak dijangka' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { calculateScores } from '@/utils/scoring';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { answers } = body;
        // answers is Record<number, string> e.g. { 1: 'A', 2: 'B' }

        if (!answers) {
            return NextResponse.json({ error: 'No answers provided' }, { status: 400 });
        }

        const result = calculateScores(answers);

        return NextResponse.json(result);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

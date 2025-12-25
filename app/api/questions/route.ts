import { NextResponse } from 'next/server';
import questions from '@/data/questions.json';

export async function GET() {
    // Return questions without the bestAnswer/explanation to frontend to prevent cheating inspection?
    // But this is a simple app, maybe sending all is fine?
    // Secure approach: Map to remove answer.
    const secureQuestions = questions.map(q => ({
        id: q.id,
        teras: q.teras,
        question: q.question,
        options: q.options
    }));
    return NextResponse.json(secureQuestions);
}

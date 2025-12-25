import questions from '@/data/questions.json';

type Teras = 'Kerjasama' | 'Emosi' | 'Komunikasi';

export interface ScoreResult {
    totalScore: number;
    maxScore: number;
    terasScores: Record<Teras, { score: number; max: number; percentage: number }>;
}

function getCloseMatch(best: string): string | null {
    // Heuristic: A<->B, D<->E. 
    // If best is middle (C), usually means Neutral, neighbors B or D might be partial?
    // Based on user request "picking B when A is best".
    if (best === 'A') return 'B';
    if (best === 'B') return 'A'; // or maybe C? But A is closer to "Agree".
    if (best === 'D') return 'E';
    if (best === 'E') return 'D';
    return null;
}

export function calculateScores(answers: Record<number, string>): ScoreResult {
    const terasScores: Record<string, { score: number; max: number }> = {
        'Kerjasama': { score: 0, max: 0 },
        'Emosi': { score: 0, max: 0 },
        'Komunikasi': { score: 0, max: 0 }
    };

    let totalScore = 0;
    let maxTotal = 0;

    questions.forEach((q) => {
        const userAnswer = answers[q.id];
        // Clean teras name (remove 'Soalan: ...' if extraction failed, though we fixed parser, safe to trim)
        // My extraction output looked clean: "Kerjasama", "Emosi", "Komunikasi".
        let teras = q.teras.trim() as Teras;
        // Fallback for safety if parsing had artifacts
        // Extensive mapping for inconsistent Teras names
        if (teras.includes('Kerjasama') || teras.includes('Sikap membantu pasukan') || teras.includes('Sikap') || teras.includes('pasukan')) teras = 'Kerjasama';
        else if (teras.includes('Emosi') || teras.includes('Stabil') || teras.includes('rasional') || teras.includes('tenang')) teras = 'Emosi';
        else if (teras.includes('Komunikasi') || teras.includes('Kejelasan') || teras.includes('bahasa')) teras = 'Komunikasi';

        if (!terasScores[teras]) {
            // Should not happen if data is consistent
            terasScores[teras] = { score: 0, max: 0 };
        }

        terasScores[teras].max += 10;
        maxTotal += 10;

        if (userAnswer) {
            if (userAnswer === q.bestAnswer) {
                terasScores[teras].score += 10;
                totalScore += 10;
            } else if (getCloseMatch(q.bestAnswer) === userAnswer) {
                terasScores[teras].score += 7;
                totalScore += 7;
            }
            // Else 0
        }
    });

    // Format output
    const formattedTeras: Record<Teras, { score: number; max: number; percentage: number }> = {
        'Kerjasama': { ...terasScores['Kerjasama'], percentage: 0 },
        'Emosi': { ...terasScores['Emosi'], percentage: 0 },
        'Komunikasi': { ...terasScores['Komunikasi'], percentage: 0 }
    };

    (Object.keys(formattedTeras) as Teras[]).forEach(k => {
        if (formattedTeras[k].max > 0) {
            formattedTeras[k].percentage = Math.round((formattedTeras[k].score / formattedTeras[k].max) * 100);
        }
    });

    return {
        totalScore,
        maxScore: maxTotal,
        terasScores: formattedTeras
    };
}

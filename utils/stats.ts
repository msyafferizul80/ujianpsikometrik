// Utility functions for dashboard statistics

export interface QuizStats {
    quizzesCompleted: number;
    readinessPercentage: number;
    currentStreak: number;
    lastQuizDate: string | null;
}

interface StatAttempt {
    date: string;
    score: number; // Renamed from totalScore to match saveQuizAttempt
    maxScore: number;
    totalQuestions: number; // Added to match saveQuizAttempt
    percentage: number;
    terasScores: Record<string, { score: number; max: number; percentage: number }>;
    answers?: Record<number, string>; // Added to match saveQuizAttempt
}

export function getQuizStats(): QuizStats {
    if (typeof window === 'undefined') {
        return {
            quizzesCompleted: 0,
            readinessPercentage: 0,
            currentStreak: 0,
            lastQuizDate: null
        };
    }

    // Get quiz history
    const historyStr = localStorage.getItem('quizHistory');
    const history: StatAttempt[] = historyStr ? JSON.parse(historyStr) : [];

    // Calculate quizzes completed
    const quizzesCompleted = history.length;

    // Calculate readiness (average of last 3 attempts or last attempt)
    let readinessPercentage = 0;
    if (history.length > 0) {
        const recentAttempts = history.slice(-3); // Keep original logic for "last 3 attempts"
        const totalPercentage = recentAttempts.reduce((sum: number, attempt: StatAttempt) => sum + attempt.percentage, 0);
        readinessPercentage = Math.round(totalPercentage / recentAttempts.length);
    }

    // Calculate streak (consecutive days)
    // Extract unique dates from history, sort them in ascending order for streak calculation
    const uniqueDates = Array.from(new Set(history.map(h => new Date(h.date).toISOString().split('T')[0])))
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const currentStreak = calculateStreak(uniqueDates);

    // Get last quiz date (from the most recent attempt in history)
    const lastQuizDate = history.length > 0 ? history[history.length - 1].date : null;

    return {
        quizzesCompleted,
        readinessPercentage,
        currentStreak,
        lastQuizDate
    };
}

function calculateStreak(dates: string[]): number {
    if (dates.length === 0) return 0;

    // Dates are expected to be unique and sorted ascending or descending. 
    // Let's assume input is unique dates YYYY-MM-DD.

    // Sort descending to check from most recent
    const sorted = [...dates].sort((a, b) => b.localeCompare(a));

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check if streak is active (today or yesterday must be present)
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

    let streak = 1;

    for (let i = 0; i < sorted.length - 1; i++) {
        const curr = new Date(sorted[i]);
        const prev = new Date(sorted[i + 1]);

        const diffTime = Math.abs(curr.getTime() - prev.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

export function saveQuizAttempt(score: number, maxScore: number, terasScores: Record<string, { score: number; max: number; percentage: number }>, answers?: Record<number, string>) {
    const percentage = Math.round((score / maxScore) * 100);

    const attempt = {
        date: new Date().toISOString(),
        score,
        totalQuestions: 100,
        percentage,
        terasScores,
        answers // Store detailed answers
    };

    // Get existing history
    const historyStr = localStorage.getItem('quizHistory');
    const history = historyStr ? JSON.parse(historyStr) : [];

    // Add new attempt
    history.push(attempt);

    // Save back to localStorage
    localStorage.setItem('quizHistory', JSON.stringify(history));
}

export function hasInProgressQuiz(): boolean {
    if (typeof window === 'undefined') return false;

    const inProgress = localStorage.getItem('quizInProgress');
    return inProgress === 'true';
}

export function getInProgressQuiz() {
    if (typeof window === 'undefined') return null;

    const answersStr = localStorage.getItem('quizAnswers');
    const currentQuestion = localStorage.getItem('currentQuestion');

    if (answersStr && currentQuestion) {
        return {
            answers: JSON.parse(answersStr),
            currentQuestion: parseInt(currentQuestion)
        };
    }

    return null;
}

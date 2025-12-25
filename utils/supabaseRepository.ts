
import { supabase } from '@/lib/supabase';

export const quizRepository = {
    // --- Quiz Management ---

    async createQuiz(title: string, description: string, totalQuestions: number) {
        const { data, error } = await supabase
            .from('quizzes')
            .insert([
                { title, description, total_questions: totalQuestions }
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getAllQuizzes() {
        const { data, error } = await supabase
            .from('quizzes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getQuizById(id: string) {
        const { data, error } = await supabase
            .from('quizzes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async deleteQuiz(id: string) {
        const { error } = await supabase
            .from('quizzes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    // --- Question Management ---

    async saveQuestions(quizId: number, questions: any[]) {
        const formattedQuestions = questions.map(q => ({
            quiz_id: quizId,
            question_text: q.question, // Mapping 'question' -> 'question_text'
            options: q.options,
            correct_answer: q.correctAnswer,
            teras: q.teras,
            explanation: q.explanation
        }));

        const { data, error } = await supabase
            .from('questions')
            .insert(formattedQuestions);

        if (error) throw error;
        return data;
    },

    async getQuestionsByQuizId(quizId: string) {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('quiz_id', quizId)
            .order('id', { ascending: true });

        if (error) throw error;

        // Map back to app structure
        return data.map((q: any) => ({
            id: q.id,
            question: q.question_text,
            options: q.options,
            correctAnswer: q.correct_answer,
            teras: q.teras,
            explanation: q.explanation
        }));
    },

    // --- Attempts / History ---

    async saveAttempt(userName: string, quizId: number, score: number, answers: any) {
        const { data, error } = await supabase
            .from('attempts')
            .insert([
                { user_name: userName, quiz_id: quizId, score, answers }
            ]);

        if (error) throw error;
        return data;
    },

    async getUserHistory(userName: string) {
        const { data, error } = await supabase
            .from('attempts')
            .select('*, quizzes(title)')
            .eq('user_name', userName)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // --- User Management (RBAC) ---

    async getUserProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        return { data, error };
    },

    async getAllUsers() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async updateUserStatus(userId: string, status: 'active' | 'suspended') {
        const { error } = await supabase
            .from('profiles')
            .update({ status })
            .eq('id', userId);

        if (error) throw error;
    },

    async updateUserRole(userId: string, role: 'user' | 'admin') {
        const { error } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', userId);

        if (error) throw error;
    }
};

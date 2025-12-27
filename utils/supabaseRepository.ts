
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

    async getAllQuizzes(onlyActive: boolean = false) {
        let query = supabase
            .from('quizzes')
            .select('*')
            .order('created_at', { ascending: false });

        if (onlyActive) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    },

    async getQuizzesPaginated({ page = 1, limit = 10, search = '', status = 'all' }) {
        let query = supabase
            .from('quizzes')
            .select('*', { count: 'exact' });

        // Search
        if (search) {
            query = query.ilike('title', `%${search}%`);
        }

        // Filter Status
        if (status === 'active') {
            query = query.eq('is_active', true);
        } else if (status === 'inactive') {
            query = query.eq('is_active', false);
        }

        // Pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        query = query.range(from, to).order('created_at', { ascending: false });

        const { data, error, count } = await query;

        if (error) throw error;
        return { data, count };
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
        // 1. Delete associated attempts first (Manual Cascade)
        const { error: attemptError } = await supabase
            .from('attempts')
            .delete()
            .eq('quiz_id', id);

        if (attemptError) {
            console.error("Error deleting attempts:", attemptError);
            throw new Error(`Failed to delete attempts: ${attemptError.message} (${attemptError.details})`);
        }

        // 2. Delete the quiz (Questions will cascade automatically via DB constraint)
        const { error } = await supabase
            .from('quizzes')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting quiz:", error);
            throw new Error(`Failed to delete quiz: ${error.message} (${error.details})`);
        }
        return true;
    },

    async toggleQuizStatus(id: string, isActive: boolean) {
        const { error } = await supabase
            .from('quizzes')
            .update({ is_active: isActive })
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

    async getQuestionsSecurely(quizId: string, userId: string) {
        const { data, error } = await supabase
            .rpc('get_secure_questions', {
                p_quiz_id: parseInt(quizId),
                p_user_id: userId
            });

        if (error) throw error;

        return data.map((q: any) => ({
            id: q.id,
            question: q.question_text,
            options: q.options,
            correctAnswer: q.correct_answer,
            teras: q.teras,
            explanation: q.explanation
        }));
    },

    async getQuestionsByTeras(teras: string, limit: number = 10) {
        // Fetch random questions for specific Teras
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .ilike('teras', `%${teras}%`) // Flexible match
            .limit(limit);

        if (error) throw error;

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

    async saveAttempt(userName: string, quizId: number, score: number, answers: any, userId?: string) {
        const payload: any = { user_name: userName, quiz_id: quizId, score, answers };
        if (userId) payload.user_id = userId;

        const { data, error } = await supabase
            .from('attempts')
            .insert([payload]);

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
            .update({ status }) // Note: 'status' column in profiles, separate from subscription_status
            .eq('id', userId);

        if (error) throw error;
    },

    async extendSubscription(userId: string, days: number) {
        // First get current expiry
        const { data: profile } = await supabase.from('profiles').select('subscription_end_date').eq('id', userId).single();

        let newDate = new Date();
        if (profile?.subscription_end_date && new Date(profile.subscription_end_date) > new Date()) {
            newDate = new Date(profile.subscription_end_date);
        }

        // Add days
        newDate.setDate(newDate.getDate() + days);

        const { error } = await supabase
            .from('profiles')
            .update({
                subscription_status: 'active',
                subscription_end_date: newDate.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) throw error;
    },

    async updateUserRole(userId: string, role: 'user' | 'admin') {
        const { error } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', userId);

        if (error) throw error;
    },

    // --- System Settings ---

    async getExamDate() {
        const { data, error } = await supabase
            .rpc('get_exam_date');

        if (error) throw error;
        return data;
    },

    async setExamDate(date: Date) {
        const { error } = await supabase
            .rpc('set_exam_date', { p_date: date.toISOString() });

        if (error) throw error;
    },

    // --- Support Ticket System ---

    async createTicket(userId: string, subject: string, message: string) {
        const { error } = await supabase
            .from('support_tickets')
            .insert({ user_id: userId, subject, message });

        if (error) throw error;
    },

    async getUserTickets(userId: string) {
        const { data, error } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getAllTickets() {
        const { data, error } = await supabase
            .from('support_tickets')
            .select('*, profiles(full_name, email)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error in getAllTickets:", error.message, error.details, error.hint);
            throw error;
        }
        return data;
    },

    async resolveTicket(ticketId: string, reply: string, status: 'replied' | 'closed') {
        const { error } = await supabase
            .from('support_tickets')
            .update({
                admin_reply: reply,
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', ticketId);

        if (error) throw error;
    },

    // --- Leaderboard ---
    async getLeaderboard(limit: number = 20) {
        const { data, error } = await supabase
            .from('leaderboard_view')
            .select('*')
            .limit(limit);

        if (error) throw error;
        return data;
    }
};

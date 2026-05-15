
import { supabase } from '@/lib/supabase';

export const quizRepository = {
    // --- Quiz Management ---

    async createQuiz(title: string, description: string, totalQuestions: number, isPremium: boolean = true) {
        const { data, error } = await supabase
            .from('quizzes')
            .insert([
                { title, description, total_questions: totalQuestions, is_premium: isPremium }
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateQuiz(id: string, title: string, description: string) {
        const { data, error } = await supabase
            .from('quizzes')
            .update({ title, description })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateQuizTags(id: string, jobTags: string[]) {
        const { error } = await supabase
            .from('quizzes')
            .update({ job_tags: jobTags })
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    async toggleQuizPremium(id: string, isPremium: boolean) {
        const { error } = await supabase
            .from('quizzes')
            .update({ is_premium: isPremium })
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    async incrementQuestionCount(quizId: string, amount: number) {
        // RPC or direct update? Direct update requires reading first or raw SQL.
        // Let's read first to be safe, or just use an RPC if one existed.
        // For simplicity, let's read and update.
        const { data: quiz, error: fetchError } = await supabase
            .from('quizzes')
            .select('total_questions')
            .eq('id', quizId)
            .single();

        if (fetchError) throw fetchError;

        const newTotal = (quiz.total_questions || 0) + amount;

        const { error: updateError } = await supabase
            .from('quizzes')
            .update({ total_questions: newTotal })
            .eq('id', quizId);

        if (updateError) throw updateError;
    },

    async getAllQuizzes(onlyActive: boolean = false) {
        // Try ordering by display_order first; fall back to created_at if column doesn't exist yet
        let query = supabase
            .from('quizzes')
            .select('*');

        if (onlyActive) {
            query = query.eq('is_active', true);
        }

        // Attempt with display_order
        let { data, error } = await query
            .order('display_order', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false });

        // If display_order column doesn't exist yet, fall back gracefully
        if (error && error.code === '42703') {
            const fallback = await supabase
                .from('quizzes')
                .select('*')
                .order('created_at', { ascending: false });
            if (fallback.error) throw fallback.error;
            return fallback.data;
        }

        if (error) throw error;
        return data;
    },

    async updateQuizOrder(orderedIds: string[]) {
        // Update display_order for each quiz in bulk using individual updates
        const updates = orderedIds.map((id, index) =>
            supabase
                .from('quizzes')
                .update({ display_order: index + 1 })
                .eq('id', id)
        );
        const results = await Promise.all(updates);
        const failed = results.find(r => r.error);
        if (failed?.error) throw failed.error;
        return true;
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

        query = query.range(from, to)
            .order('display_order', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false });

        const { data, error, count } = await query;

        if (error) throw error;
        return { data, count };
    },

    async updateStreak(userId: string) {
        try {
            // 1. Get current profile data
            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('streak_count, last_activity_date')
                .eq('id', userId)
                .single();

            if (fetchError) throw fetchError;

            const now = new Date();
            const lastActivity = profile.last_activity_date ? new Date(profile.last_activity_date) : null;
            let newStreak = profile.streak_count || 0;

            // 2. Logic to calculate streak
            if (lastActivity) {
                const isSameDay = now.toDateString() === lastActivity.toDateString();

                // If already active today, do nothing (keep streak)
                if (isSameDay) {
                    // Update timestamp only if you want precise last active time, 
                    // but usually strictly for streak we don't increment.
                    // Let's just update last_activity_date to now anyway for analytics.
                } else {
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const isYesterday = yesterday.toDateString() === lastActivity.toDateString();

                    if (isYesterday) {
                        // Consecutive day
                        newStreak += 1;
                    } else {
                        // Missed a day (or more), reset to 1 (since today is active)
                        newStreak = 1;
                    }
                }
            } else {
                // First time ever
                newStreak = 1;
            }

            // 3. Update DB
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    streak_count: newStreak,
                    last_activity_date: now.toISOString()
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            return newStreak;
        } catch (error) {
            console.error("Streak update error:", error);
            return null;
        }
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

    async saveQuestions(quizId: number, questions: { question: string, options: { label: string; text: string }[], correctAnswer: string, teras: string, explanation: string }[]) {
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
        return data.map((q: { id: number, question_text: string, options: any, correct_answer: string, teras: string, explanation: string }) => ({
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

        return data.map((q: { id: number, question_text: string, options: any, correct_answer: string, teras: string, explanation: string }) => ({
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

        return data.map((q: { id: number, question_text: string, options: any, correct_answer: string, teras: string, explanation: string }) => ({
            id: q.id,
            question: q.question_text,
            options: q.options,
            correctAnswer: q.correct_answer,
            teras: q.teras,
            explanation: q.explanation
        }));
    },

    // --- Attempts / History ---

    async saveAttempt(userName: string, quizId: number, score: number, answers: Record<string, any>, userId?: string) {
        const payload: Record<string, any> = { user_name: userName, quiz_id: quizId, score, answers };
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

    async extendSubscription(userId: string, days: number, amountPaid: number = 0) {
        const { error } = await supabase.rpc('admin_extend_subscription', {
            p_user_id: userId,
            p_days: days,
            p_amount: amountPaid
        });

        if (error) {
            console.error("Error extending subscription (RPC Failure):", JSON.stringify(error, null, 2));
            console.error("Error Details:", error.message, error.details, error.hint, error.code);
            throw error;
        }
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

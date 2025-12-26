'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Trophy, Medal, User, Crown, Activity } from 'lucide-react';
import { quizRepository } from '@/utils/supabaseRepository';
import { createClient } from '@supabase/supabase-js';

type LeaderboardEntry = {
    user_id: string;
    full_name: string;
    max_score: number;
    attempts_count: number;
    last_attempt_at: string;
};

export default function LeaderboardPage() {
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            // Get current user to highlight them
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { data: { session } } = await supabase.auth.getSession();
            setCurrentUserEmail(session?.user?.email || null);

            try {
                const data = await quizRepository.getLeaderboard(50); // Top 50
                if (data) setLeaders(data);
            } catch (error) {
                console.error("Failed to fetch leaderboard", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    const getRankIcon = (index: number) => {
        if (index === 0) return <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500 animate-pulse" />;
        if (index === 1) return <Medal className="w-6 h-6 text-gray-400 fill-gray-400" />;
        if (index === 2) return <Medal className="w-6 h-6 text-amber-700 fill-amber-700" />;
        return <span className="font-bold text-gray-400 text-lg w-6 text-center">{index + 1}</span>;
    };

    const getRowStyle = (index: number, isMe: boolean) => {
        if (isMe) return "bg-blue-50 border-blue-200 ring-1 ring-blue-300 transform scale-[1.01] shadow-md z-10 transition-all";
        if (index === 0) return "bg-yellow-50/50 border-yellow-100 hover:bg-yellow-100/50 transition-colors";
        if (index === 1) return "bg-gray-50/50 hover:bg-gray-100/50 transition-colors";
        if (index === 2) return "bg-amber-50/50 hover:bg-amber-100/50 transition-colors";
        return "hover:bg-gray-50 transition-colors";
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Hero / Header */}
                <div className="text-center space-y-4 py-8">
                    <div className="inline-flex p-3 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-full shadow-inner mb-4">
                        <Trophy className="w-12 h-12 text-amber-600" />
                    </div>
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent">
                        Dewan Kemasyhuran
                    </h1>
                    <p className="text-gray-500 max-w-2xl mx-auto text-lg">
                        Senarai calon terbaik yang menunjukkan penguasaan cemerlang dalam Ujian Psikometrik. Adakah anda salah seorang daripada mereka?
                    </p>
                </div>

                <Card className="shadow-xl border-t-4 border-t-amber-500 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Kedudukan</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Calon</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Skor Tertinggi</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Percubaan</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Tarikh Terakhir</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        // Skeleton Loading Rows
                                        [...Array(5)].map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="px-6 py-4"><div className="h-6 w-6 bg-gray-200 rounded-full mx-auto" /></td>
                                                <td className="px-6 py-4"><div className="h-4 w-48 bg-gray-200 rounded" /></td>
                                                <td className="px-6 py-4"><div className="h-6 w-12 bg-gray-200 rounded mx-auto" /></td>
                                                <td className="px-6 py-4"><div className="h-4 w-8 bg-gray-200 rounded mx-auto" /></td>
                                                <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded ml-auto" /></td>
                                            </tr>
                                        ))
                                    ) : leaders.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                <Activity className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                                <p>Belum ada rekod. Jadilah yang pertama!</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        leaders.map((leader, index) => {
                                            const isMe = false; // We can't safely match 'email' as view might not expose it to anon if RLS is strict, but let's try with what we have.
                                            // Actually view select * so we have email, but let's rely on Full Name fallback or simple visual distinct if needed. 
                                            // For now, no "isMe" highlight unless we're sure. 

                                            return (
                                                <tr key={leader.user_id} className={getRowStyle(index, isMe)}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center justify-center">
                                                            {getRankIcon(index)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-sm border-2 border-white shadow-sm ring-1 ring-gray-100">
                                                                {leader.full_name ? leader.full_name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    {leader.full_name || "Calon Tanpa Nama"}
                                                                </div>
                                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                                    {index < 3 ? "🔥 Elite Top 3" : "✨ Calon Aktif"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800 border border-green-200">
                                                            {leader.max_score}%
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 hidden sm:table-cell">
                                                        {leader.attempts_count} Set
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 hidden sm:table-cell">
                                                        {new Date(leader.last_attempt_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

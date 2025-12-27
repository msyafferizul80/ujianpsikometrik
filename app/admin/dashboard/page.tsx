"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Trash2, User, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { quizRepository } from "@/utils/supabaseRepository";
import { createClient } from '@supabase/supabase-js';
import { AdminSalesChart } from "@/components/AdminSalesChart";
import { AdminLiveFeed } from "@/components/AdminLiveFeed";
import debounce from "lodash/debounce"; // You might need to install lodash or write a simple debounce

interface QuizSet {
    id: string;
    title: string;
    totalQuestions: number;
    createdAt: string;
    isActive: boolean;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeSubs: 0,
        totalRevenue: 0,
        conversionRate: 0
    });

    // Quiz Management State
    const [quizzes, setQuizzes] = useState<QuizSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Supabase Client
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Initial Auth & Stats Fetch
    useEffect(() => {
        const initDashboard = async () => {
            // 1. Check Admin Auth
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/admin/login");
                return;
            }

            try {
                // 2. Fetch Stats
                const { data: profiles } = await supabase.from('profiles').select('id, subscription_status, subscription_tier');
                const { data: transactions } = await supabase.from('transactions').select('amount, status').eq('status', 'paid');

                // Calculate Stats
                const totalUsers = profiles?.length || 0;
                const activeSubs = profiles?.filter(p => p.subscription_status === 'active').length || 0;
                const totalRevenue = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
                const conversionRate = totalUsers > 0 ? ((activeSubs / totalUsers) * 100).toFixed(1) : "0";

                setStats({
                    totalUsers,
                    activeSubs,
                    totalRevenue, // in cents
                    conversionRate: Number(conversionRate)
                });

            } catch (err) {
                console.error("Dashboard fetch error:", err);
            }
        };

        initDashboard();
    }, [router]);

    // Fetch Quizzes with Pagination, Search & Filter
    const fetchQuizzes = async () => {
        setLoading(true);
        try {
            const { data, count }: any = await quizRepository.getQuizzesPaginated({
                page: currentPage,
                limit: ITEMS_PER_PAGE,
                search: searchQuery,
                status: filterStatus
            });

            if (data) {
                setQuizzes(data.map((q: any) => ({
                    id: q.id,
                    title: q.title,
                    totalQuestions: q.total_questions,
                    createdAt: new Date(q.created_at).toLocaleDateString(),
                    isActive: q.is_active === null ? true : q.is_active
                })));

                if (count !== null) {
                    setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
                }
            }
        } catch (err) {
            console.error("Failed to fetch quizzes", err);
        } finally {
            setLoading(false);
        }
    };

    // Debounced Search Handler
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSearch = useCallback(
        debounce((query: string) => {
            setSearchQuery(query);
            setCurrentPage(1); // Reset to page 1 on search
        }, 500),
        []
    );

    // Trigger fetch on state change
    useEffect(() => {
        fetchQuizzes();
    }, [currentPage, searchQuery, filterStatus]); // Add dependencies

    const handleDelete = async (id: string) => {
        if (confirm("Adakah anda pasti mahu memadam set soalan ini?")) {
            try {
                await quizRepository.deleteQuiz(id);
                fetchQuizzes(); // Refresh list
            } catch (err) {
                alert("Gagal memadam set soalan.");
            }
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await quizRepository.toggleQuizStatus(id, !currentStatus);
            // Optimistic update
            setQuizzes(prev => prev.map(q =>
                q.id === id ? { ...q, isActive: !currentStatus } : q
            ));
        } catch (err) {
            console.error(err);
            alert("Gagal mengemaskini status.");
            fetchQuizzes(); // Revert on error
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Top Navigation Bar */}
            <div className="bg-white border-b sticky top-0 z-30 px-8 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Admin Command Center</h1>
                        <p className="text-xs text-gray-500">Overview & Management</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/admin/settings">
                        <Button variant="outline" className="gap-2">
                            Exam Date Settings
                        </Button>
                    </Link>
                    <Link href="/admin/transactions">
                        <Button variant="outline" className="gap-2">
                            Transaction History
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="p-8 max-w-7xl mx-auto space-y-8">

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Total Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{stats.totalUsers}</div>
                            <p className="text-xs text-blue-600 mt-1">+ Registered Candidates</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Active Subscriptions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{stats.activeSubs}</div>
                            <p className="text-xs text-green-600 mt-1">{stats.conversionRate}% Conversion Rate</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Total Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">RM {(stats.totalRevenue / 100).toFixed(2)}</div>
                            <p className="text-xs text-purple-600 mt-1">Gross Earnings</p>
                        </CardContent>
                    </Card>

                    <Link href="/admin/settings" className="block h-full">
                        <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all h-full cursor-pointer bg-orange-50/50 border-orange-100">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">System Status</CardTitle>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between">
                                <div>
                                    <div className="text-xl font-bold text-gray-900">Exam Date</div>
                                    <p className="text-xs text-orange-600">Click to Configure</p>
                                </div>
                                <Plus className="h-6 w-6 text-orange-400" />
                            </CardContent>
                        </Card>
                    </Link>
                </div>
                {/* Visual Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <AdminSalesChart />
                    <AdminLiveFeed />
                </div>

                {/* Left Column: Quiz Management (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-800">Quiz Management</h2>
                        <Link href="/admin/upload">
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="mr-2 h-4 w-4" />
                                Upload New Set
                            </Button>
                        </Link>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Cari set soalan..."
                                className="pl-9"
                                onChange={(e) => debouncedSearch(e.target.value)}
                            />
                        </div>
                        <Select value={filterStatus} onValueChange={(val) => { setFilterStatus(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="active">Active Sahaja</SelectItem>
                                <SelectItem value="inactive">Inactive Sahaja</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="p-8 text-center text-gray-400 animate-pulse">
                                    Loading quizzes...
                                </div>
                            ) : quizzes.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    No quiz sets found matching your criteria.
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {quizzes.map((quiz) => (
                                        <div key={quiz.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded ${quiz.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                                                    <FileText className={`h-5 w-5 ${quiz.isActive ? 'text-green-600' : 'text-gray-500'}`} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${quiz.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            {quiz.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500">{quiz.totalQuestions} Questions • {quiz.createdAt}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleToggleStatus(quiz.id, quiz.isActive)}
                                                    className={`text-xs h-8 ${quiz.isActive ? 'text-orange-600 border-orange-200 hover:bg-orange-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
                                                >
                                                    {quiz.isActive ? 'Deactivate' : 'Activate'}
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0" onClick={() => handleDelete(quiz.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pagination Footer */}
                            {!loading && quizzes.length > 0 && (
                                <div className="p-4 border-t flex items-center justify-between bg-gray-50/50">
                                    <div className="text-xs text-gray-500">
                                        Page {currentPage} of {totalPages}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Quick Actions & Links (1/3 width) */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-800">Quick Actions</h2>
                    <div className="grid gap-4">
                        <Link href="/admin/users">
                            <Card className="hover:border-blue-300 transition-colors cursor-pointer group">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors">
                                        <User className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">Manage Users</div>
                                        <div className="text-xs text-gray-500">View profiles & edit subs</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/admin/transactions">
                            <Card className="hover:border-green-300 transition-colors cursor-pointer group">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="bg-green-100 p-3 rounded-full group-hover:bg-green-200 transition-colors">
                                        <FileText className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">Sales Report</div>
                                        <div className="text-xs text-gray-500">View full transaction logs</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>

            </div>
        </div>

    );
}

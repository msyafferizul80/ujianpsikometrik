"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, ArrowRight, Star, Briefcase, Search, X } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

import { quizRepository } from "@/utils/supabaseRepository";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Lock } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function QuizSelectPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading...</div>}>
            <QuizSelectContent />
        </Suspense>
    );
}

function QuizSelectContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const filterTopic = searchParams.get('filter');

    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [jobRoles, setJobRoles] = useState<string[]>([]);
    const [activeJob, setActiveJob] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const { createClient } = require('@supabase/supabase-js');

    useEffect(() => {
        // Fetch available job tags from DB
        fetch('/api/admin/job-tags')
            .then(r => r.json())
            .then(d => setJobRoles((d.tags || []).map((t: any) => t.name)))
            .catch(() => setJobRoles([]));
    }, []);

    useEffect(() => {
        const fetchQuizzesAndSubscription = async () => {
            try {
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );
                const { data: { session } } = await supabase.auth.getSession();
                let isPremium = false;

                if (session) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('subscription_tier, role, subscription_end_date')
                        .eq('id', session.user.id)
                        .single();

                    if (profile && (profile.role === 'admin' || profile.subscription_tier !== 'free')) {
                        if (!profile.subscription_end_date || new Date(profile.subscription_end_date) > new Date()) {
                            isPremium = true;
                        }
                    }
                }

                const data: any = await quizRepository.getAllQuizzes(true);
                const formatted = data.map((q: any) => ({
                    id: q.id,
                    title: q.title,
                    description: q.description || "Set soalan latihan ujian psikometrik.",
                    totalQuestions: q.total_questions,
                    duration: q.duration_minutes || Math.ceil(q.total_questions * 0.8),
                    isNew: new Date(q.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    isLocked: !isPremium && (q.is_premium !== false),
                    jobTags: Array.isArray(q.job_tags) ? q.job_tags : [],
                }));
                setQuizzes(formatted);
            } catch (err) {
                console.error("Failed to fetch quizzes", err);
                setQuizzes([]);
            }
        };

        fetchQuizzesAndSubscription();
    }, []);

    const handleStartQuiz = (quizId: string) => {
        const selected = quizzes.find(q => q.id === quizId);
        if (selected) {
            localStorage.setItem('activeQuizId', selected.id);
            localStorage.setItem('activeQuizTitle', selected.title);
            localStorage.removeItem('quizQuestions');
            localStorage.removeItem('quizAnswers');
            localStorage.removeItem('currentQuestion');
            localStorage.setItem('quizInProgress', 'true');
            router.push('/quiz');
        }
    };

    const handleStartSmartReview = (topic: string) => {
        localStorage.setItem('activeQuizId', 'smart-review');
        localStorage.setItem('activeQuizTitle', `Latih Tubi Fokus: ${topic.toUpperCase()}`);
        localStorage.setItem('activeTeras', topic);
        localStorage.removeItem('quizQuestions');
        localStorage.removeItem('quizAnswers');
        localStorage.removeItem('currentQuestion');
        localStorage.setItem('quizInProgress', 'true');
        router.push('/quiz');
    };

    // Filter quizzes by job tag and search
    const filteredQuizzes = quizzes.filter(quiz => {
        const matchesJob = activeJob === 'all' || quiz.jobTags.includes(activeJob);
        const matchesSearch = !searchQuery ||
            quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            quiz.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesJob && matchesSearch;
    });

    const taggedCount = quizzes.filter(q => q.jobTags.length > 0).length;

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
                        <Briefcase className="h-8 w-8 text-blue-600" />
                        Bank Soalan
                    </h1>
                    <p className="text-gray-500">
                        {quizzes.length} set soalan tersedia — {taggedCount} dikategorikan mengikut jawatan
                    </p>
                </div>

                {/* Job Role Filter Chips — loaded from DB */}
                <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                        <Briefcase className="h-4 w-4" /> Tapis Mengikut Jawatan
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {/* Always show 'Semua' chip */}
                        <button
                            onClick={() => setActiveJob('all')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 ${activeJob === 'all' ? 'ring-2 ring-offset-1 ring-blue-400 shadow-md scale-105' : 'opacity-80'
                                }`}
                        >
                            🗂 Semua Set
                        </button>

                        {/* Dynamic chips from DB */}
                        {jobRoles.map(role => (
                            <button
                                key={role}
                                onClick={() => setActiveJob(role)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 ${activeJob === role
                                        ? 'ring-2 ring-offset-1 ring-blue-400 shadow-md scale-105'
                                        : 'opacity-80'
                                    }`}
                            >
                                {role}
                                {activeJob === role && (
                                    <X className="h-3 w-3 ml-1" onClick={(e) => { e.stopPropagation(); setActiveJob('all'); }} />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari set soalan..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                <X className="h-4 w-4 text-gray-400" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Targeted Practice Card (Only shows if filter param) */}
                {filterTopic && (
                    <div className="animate-fade-in">
                        <Card className="border-2 border-indigo-500 shadow-xl bg-gradient-to-r from-indigo-50 to-white">
                            <CardHeader>
                                <div className="flex justify-between items-start mb-2">
                                    <Badge className="bg-indigo-600 hover:bg-indigo-700">Disyorkan oleh AI</Badge>
                                </div>
                                <CardTitle className="text-2xl font-bold text-gray-900">
                                    Latih Tubi Fokus: {filterTopic.toUpperCase()}
                                </CardTitle>
                                <CardDescription className="text-base text-gray-700 mt-2">
                                    Sesi khas untuk memantapkan penguasaan anda dalam kompetensi <strong>{filterTopic}</strong>. Soalan dipilih secara rawak daripada bank soalan untuk topik ini sahaja.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <BookOpen className="h-5 w-5 text-indigo-600" />
                                        <span>10 Soalan Fokus</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-5 w-5 text-indigo-600" />
                                        <span>~8 minit</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 font-bold text-lg py-6 px-8 shadow-lg"
                                    onClick={() => handleStartSmartReview(filterTopic)}
                                >
                                    Mula Latihan Fokus <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </CardFooter>
                        </Card>
                        <hr className="my-6 border-gray-200" />
                    </div>
                )}

                {/* Results count */}
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-700">
                        {filteredQuizzes.length === 0
                            ? 'Tiada set soalan dijumpai'
                            : `${filteredQuizzes.length} set soalan ${activeJob !== 'all' ? `untuk ${activeJob}` : ''}`
                        }
                    </h3>
                    {(activeJob !== 'all' || searchQuery) && (
                        <button
                            onClick={() => { setActiveJob('all'); setSearchQuery(''); }}
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                            <X className="h-3.5 w-3.5" /> Reset Filter
                        </button>
                    )}
                </div>

                {/* Quiz Cards Grid */}
                {filteredQuizzes.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <h4 className="font-semibold text-gray-500">Tiada set soalan untuk jawatan ini</h4>
                        <p className="text-sm text-gray-400 mt-1">Cuba tapis jawatan lain atau lihat semua set soalan.</p>
                        <Button variant="outline" className="mt-4" onClick={() => setActiveJob('all')}>
                            Lihat Semua
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredQuizzes.map((quiz) => (
                            <Card key={quiz.id} className={`flex flex-col transition-all border-blue-100/50 ${quiz.isLocked ? 'opacity-75 grayscale-[0.5]' : 'hover:shadow-lg hover:-translate-y-0.5'}`}>
                                <CardHeader>
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant={quiz.isNew ? "default" : "secondary"} className={quiz.isNew ? "bg-blue-600" : ""}>
                                            {quiz.isNew ? "Terkini" : "Standard"}
                                        </Badge>
                                        {quiz.isLocked ? (
                                            <Lock className="h-5 w-5 text-gray-400" />
                                        ) : (
                                            quiz.isNew && <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                        )}
                                    </div>
                                    <CardTitle className="text-xl leading-tight text-gray-800">
                                        {quiz.title}
                                    </CardTitle>
                                    <CardDescription className="mt-2 line-clamp-2">
                                        {quiz.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-3">
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <BookOpen className="h-4 w-4" />
                                            <span>{quiz.totalQuestions} soalan</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            <span>{quiz.duration} minit</span>
                                        </div>
                                    </div>

                                    {/* Job Tags */}
                                    {quiz.jobTags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {quiz.jobTags.map((tag: string) => (
                                                <span
                                                    key={tag}
                                                    onClick={() => setActiveJob(tag)}
                                                    className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full cursor-pointer hover:bg-blue-100 transition"
                                                >
                                                    <Briefcase className="h-2.5 w-2.5" />
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    {quiz.isLocked ? (
                                        <Button
                                            variant="outline"
                                            className="w-full border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-600"
                                            onClick={() => setShowUpgradeDialog(true)}
                                        >
                                            <Lock className="mr-2 h-4 w-4" />
                                            Kunci (Premium)
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full bg-blue-600 hover:bg-blue-700 font-semibold"
                                            onClick={() => handleStartQuiz(quiz.id)}
                                        >
                                            Mula Kuiz <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Upgrade Dialog */}
            <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl text-gray-900">
                            <span className="text-2xl">🔒</span>
                            Akses Premium Diperlukan
                        </DialogTitle>
                        <DialogDescription className="text-base pt-2 text-gray-600">
                            Set soalan ini dikhaskan untuk pengguna Premium. Naik taraf sekarang untuk membuka kunci:
                        </DialogDescription>
                    </DialogHeader>

                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 my-2">
                        <ul className="space-y-3">
                            {['Akses ke semua Bank Soalan (1000+ Soalan)', 'Analisis Prestasi & Kelemahan AI', 'Huraian Jawapan Lengkap', 'Set Soalan Khusus Jawatan'].map(item => (
                                <li key={item} className="flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                    <span className="text-sm text-blue-900 font-medium">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-3 mt-2">
                        <Button variant="ghost" onClick={() => setShowUpgradeDialog(false)} className="w-full sm:w-auto">
                            Nanti Dulu
                        </Button>
                        <Button
                            onClick={() => router.push('/pricing')}
                            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md font-semibold"
                        >
                            Dapatkan Akses Premium
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}

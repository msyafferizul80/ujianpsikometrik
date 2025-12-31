"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, ArrowRight, Star } from "lucide-react";
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

    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const { createClient } = require('@supabase/supabase-js');

    useEffect(() => {
        const fetchQuizzesAndSubscription = async () => {
            try {
                // 1. Fetch User Subscription Status
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

                // 2. Fetch Quizzes
                const data: any = await quizRepository.getAllQuizzes(true);
                const formatted = data.map((q: any, index: number) => ({
                    id: q.id,
                    title: q.title,
                    description: q.description || "Set soalan latihan ujian psikometrik.",
                    totalQuestions: q.total_questions,
                    duration: q.duration_minutes || Math.ceil(q.total_questions * 0.8),
                    isNew: new Date(q.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // New if created within 7 days
                    // LOCK LOGIC: Lock if NOT premium AND quiz is marked as premium
                    isLocked: !isPremium && (q.is_premium !== false) // Default to true if undefined
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
            // Save selected quiz context
            localStorage.setItem('activeQuizId', selected.id);
            localStorage.setItem('activeQuizTitle', selected.title);

            // Clean up previous session data
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

        // Clean up previous session
        localStorage.removeItem('quizQuestions');
        localStorage.removeItem('quizAnswers');
        localStorage.removeItem('currentQuestion');
        localStorage.setItem('quizInProgress', 'true');

        router.push('/quiz');
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Bank Soalan</h1>
                    <p className="text-gray-600">Pilih dari koleksi set soalan terkini untuk memulakan latihan anda.</p>
                </div>

                {/* Targeted Practice Card (Only shows if filter is present) */}
                {filterTopic && (
                    <div className="mb-8 animate-fade-in">
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
                                    Mula Latihan Fokus
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </CardFooter>
                        </Card>
                        <hr className="my-8 border-gray-200" />
                    </div>
                )}

                <h3 className="text-xl font-semibold text-gray-800 mb-4">Semua Set Soalan</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes.map((quiz) => (
                        <Card key={quiz.id} className={`flex flex-col transition-all border-blue-100/50 ${quiz.isLocked ? 'opacity-75 grayscale-[0.5]' : 'hover:shadow-lg'}`}>
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
                                <CardTitle className="text-xl leading-tight text-gray-800 flex items-center gap-2">
                                    {quiz.title}
                                </CardTitle>
                                <CardDescription className="mt-2 line-clamp-2">
                                    {quiz.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                                    <div className="flex items-center gap-1">
                                        <BookOpen className="h-4 w-4" />
                                        <span>{quiz.totalQuestions} soalan</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        <span>{quiz.duration} minit</span>
                                    </div>
                                </div>
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
            </div>

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
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                <span className="text-sm text-blue-900 font-medium">Akses ke semua Bank Soalan (1000+ Soalan)</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                <span className="text-sm text-blue-900 font-medium">Analisis Prestasi & Kelemahan AI</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                <span className="text-sm text-blue-900 font-medium">Huraian Jawapan Lengkap</span>
                            </li>
                        </ul>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-3 mt-2">
                        <Button
                            variant="ghost"
                            onClick={() => setShowUpgradeDialog(false)}
                            className="w-full sm:w-auto"
                        >
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

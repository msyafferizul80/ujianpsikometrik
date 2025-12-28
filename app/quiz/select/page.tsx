"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, ArrowRight, Star } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

import { quizRepository } from "@/utils/supabaseRepository";

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

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const data: any = await quizRepository.getAllQuizzes(true);
                const formatted = data.map((q: any) => ({
                    id: q.id,
                    title: q.title,
                    description: q.description || "Set soalan latihan ujian psikometrik.",
                    totalQuestions: q.total_questions,
                    duration: q.duration_minutes || Math.ceil(q.total_questions * 0.8),
                    isNew: new Date(q.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // New if created within 7 days
                }));
                setQuizzes(formatted);
            } catch (err) {
                console.error("Failed to fetch quizzes", err);
                setQuizzes([]);
            }
        };

        fetchQuizzes();
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
                        <Card key={quiz.id} className="flex flex-col hover:shadow-lg transition-shadow border-blue-100/50">
                            <CardHeader>
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={quiz.isNew ? "default" : "secondary"} className={quiz.isNew ? "bg-blue-600" : ""}>
                                        {quiz.isNew ? "Terkini" : "Standard"}
                                    </Badge>
                                    {quiz.isNew && <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />}
                                </div>
                                <CardTitle className="text-xl leading-tight text-gray-800">{quiz.title}</CardTitle>
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
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 font-semibold"
                                    onClick={() => handleStartQuiz(quiz.id)}
                                >
                                    Mula Kuiz <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}

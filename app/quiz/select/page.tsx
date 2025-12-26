"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, ArrowRight, Star } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

import { quizRepository } from "@/utils/supabaseRepository";

// Default/Demo Data
// Default/Demo Data Removed per user request
const DEMO_QUIZ: any[] = [];

export default function QuizSelectPage() {
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<any[]>([]);

    // ... imports ...

    // ... inside component ...
    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const data: any = await quizRepository.getAllQuizzes();
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
            localStorage.removeItem('quizQuestions'); // Ensure we don't load stale local questions
            localStorage.removeItem('quizAnswers');
            localStorage.removeItem('currentQuestion');
            localStorage.setItem('quizInProgress', 'true');

            router.push('/quiz');
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Bank Soalan</h1>
                    <p className="text-gray-600">Pilih dari koleksi set soalan terkini untuk memulakan latihan anda.</p>
                </div>

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

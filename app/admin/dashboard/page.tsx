"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, FileText, Trash2, User } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { quizRepository } from "@/utils/supabaseRepository";
import { createClient } from '@supabase/supabase-js';

interface QuizSet {
    id: string;
    title: string;
    totalQuestions: number;
    createdAt: string;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<QuizSet[]>([]);
    const [loading, setLoading] = useState(true);

    // Check Auth and Fetch Quizzes
    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // Double check localStorage just in case (optional, but good for transition)
                // If strictly Supabase, we remove localStorage check
                router.push("/admin/login");
            }
        };

        checkAuth();

        const fetchQuizzes = async () => {
            try {
                const data: any = await quizRepository.getAllQuizzes();
                // Map Supabase fields to component state if needed (mostly 1:1 match)
                setQuizzes(data.map((q: any) => ({
                    id: q.id,
                    title: q.title,
                    totalQuestions: q.total_questions,
                    createdAt: new Date(q.created_at).toLocaleDateString()
                })));
            } catch (err) {
                console.error("Failed to fetch quizzes", err);
                alert("Gagal mengambil senarai kuiz.");
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, [router]);

    const handleDelete = async (id: string) => {
        if (confirm("Adakah anda pasti mahu memadam set soalan ini?")) {
            try {
                await quizRepository.deleteQuiz(id);
                // Update state
                setQuizzes(prev => prev.filter(q => q.id !== id));
            } catch (err) {
                console.error("Delete failed", err);
                alert("Gagal memadam set soalan.");
            }
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Admin Panel...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-500">Uruskan set soalan dan upload fail baru.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                    <Link href="/admin/upload">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="mr-2 h-4 w-4" />
                            Tambah Set Soalan
                        </Button>
                    </Link>
                    <Link href="/admin/users">
                        <Button variant="outline" className="ml-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                            <User className="mr-2 h-4 w-4" />
                            Urus Pengguna
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Senarai Set Soalan</CardTitle>
                        <CardDescription>
                            Senarai kuiz yang aktif dalam sistem.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {quizzes.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-lg">
                                Tiada set soalan dijumpai. Sila upload baru.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {quizzes.map((quiz) => (
                                    <div key={quiz.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-100 p-2 rounded-lg">
                                                <FileText className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-800">{quiz.title}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {quiz.totalQuestions} Soalan • Tarikh: {quiz.createdAt}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(quiz.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

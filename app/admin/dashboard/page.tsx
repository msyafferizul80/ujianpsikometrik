"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

    useEffect(() => {
        // Check Auth
        const isAdmin = localStorage.getItem("isAdmin");
        if (!isAdmin) {
            router.push("/admin/login");
            return;
        }

        // Fetch existing quizzes from localStorage (Mock + Custom)
        const customQuizzes = JSON.parse(localStorage.getItem('customQuizzes') || "[]");
        const defaultQuizzes = [
            { id: "demo-1", title: "Set Soalan Disember 2025 (Demo)", totalQuestions: 100, createdAt: "2024-12-01" },
        ];

        setQuizzes([...defaultQuizzes, ...customQuizzes]);
        setLoading(false);
    }, [router]);

    const handleDelete = (id: string) => {
        if (confirm("Adakah anda pasti mahu memadam set soalan ini?")) {
            // Check if it's a custom quiz
            const customQuizzes = JSON.parse(localStorage.getItem('customQuizzes') || "[]");
            const newCustomQuizzes = customQuizzes.filter((q: any) => q.id !== id);
            localStorage.setItem('customQuizzes', JSON.stringify(newCustomQuizzes));

            // Update state
            setQuizzes(prev => prev.filter(q => q.id !== id));
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
                <Link href="/admin/upload">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="mr-2 h-4 w-4" />
                        Upload Soalan (.docx)
                    </Button>
                </Link>
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

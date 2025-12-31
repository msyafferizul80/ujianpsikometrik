"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { quizRepository } from "@/utils/supabaseRepository";
import { Loader2, BookOpen, Lock, Unlock, Trash2, Plus } from "lucide-react";

export default function QuizManagementPage() {
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQuizzes = async () => {
        setLoading(true);
        try {
            const data = await quizRepository.getAllQuizzes(false); // Fetch all, not just active
            setQuizzes(data || []);
        } catch (error) {
            console.error("Error fetching quizzes:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const togglePremium = async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        try {
            // Optimistic update
            setQuizzes(prev => prev.map(q => q.id === id ? { ...q, is_premium: newStatus } : q));

            await quizRepository.toggleQuizPremium(id, newStatus);
        } catch (error) {
            console.error("Error toggling premium:", error);
            alert("Gagal menukar status premium.");
            fetchQuizzes(); // Revert on error
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (confirm(`Adakah anda pasti mahu memadam set soalan "${title}"? Tindakan ini tidak boleh dikembalikan.`)) {
            try {
                await quizRepository.deleteQuiz(id);
                fetchQuizzes();
            } catch (error) {
                console.error("Error deleting quiz:", error);
                alert("Gagal memadam kuiz.");
            }
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-[1600px] mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <BookOpen className="h-8 w-8 text-blue-600" />
                            Pengurusan Kuiz
                        </h1>
                        <p className="text-gray-600">Total Set Soalan: {quizzes.length}</p>
                    </div>
                    <Button onClick={() => router.push('/admin/upload')} className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4" /> Upload Soalan Baru
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Senarai Bank Soalan</CardTitle>
                        <CardDescription>Uruskan status akses (Free/Premium) bagi setiap set soalan.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead className="w-[400px]">Tajuk & Deskripsi</TableHead>
                                            <TableHead>Jumlah Soalan</TableHead>
                                            <TableHead>Status Akses</TableHead>
                                            <TableHead>Tarikh Cipta</TableHead>
                                            <TableHead className="text-right">Tindakan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {quizzes.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                                    Tiada soalan dijumpai.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            quizzes.map((quiz) => (
                                                <TableRow key={quiz.id} className="hover:bg-gray-50/50">
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-gray-900 text-lg">
                                                                {quiz.title}
                                                            </span>
                                                            <span className="text-sm text-gray-500 line-clamp-1">{quiz.description}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="font-mono">
                                                            {quiz.total_questions} Soalan
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => togglePremium(quiz.id, quiz.is_premium)}
                                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${quiz.is_premium
                                                                        ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                                                        : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                                                    }`}
                                                            >
                                                                {quiz.is_premium ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                                                {quiz.is_premium ? "PREMIUM (LOCKED)" : "FREE (OPEN)"}
                                                            </button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm text-gray-500">
                                                            {new Date(quiz.created_at).toLocaleDateString()}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(quiz.id, quiz.title)}
                                                            className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                            title="Padam Set Soalan"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

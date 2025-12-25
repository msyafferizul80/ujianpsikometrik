"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Filter, Download, Eye, FileSpreadsheet } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { QuestionReview } from "@/components/QuestionReview";

interface QuizAttempt {
    date: string;
    score: number;
    totalQuestions: number;
    percentage: number;
    terasScores?: Record<string, any>;
    answers?: Record<number, string>;
}

export default function HistoryPage() {
    const [history, setHistory] = useState<QuizAttempt[]>([]);
    const [sortDesc, setSortDesc] = useState(true);
    const [filterDate, setFilterDate] = useState("");
    const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);
    const [questions, setQuestions] = useState<any[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('quizHistory');
        if (saved) {
            setHistory(JSON.parse(saved));
        }

        // Fetch questions for review modal
        fetch('/api/questions')
            .then(res => res.json())
            .then(data => setQuestions(data));
    }, []);

    const clearHistory = () => {
        if (confirm("Adakah anda pasti mahu memadam semua sejarah ujian?")) {
            localStorage.removeItem('quizHistory');
            setHistory([]);
        }
    };

    const handleExportCSV = () => {
        if (history.length === 0) return;

        const headers = ["Date", "Score", "Percentage", "Status"];
        const rows = history.map(item => [
            new Date(item.date).toLocaleString(),
            item.score,
            `${item.percentage}%`,
            item.percentage >= 80 ? "Sangat Baik" : item.percentage >= 50 ? "Baik" : "Lemah"
        ]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "sejarah_ujian_psikometrik.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const sortedHistory = [...history].filter(item => {
        if (!filterDate) return true;
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        return itemDate === filterDate;
    }).sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortDesc ? dateB - dateA : dateA - dateB;
    });

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Sejarah Ujian</h1>
                            <p className="text-gray-600">Rekod prestasi terkini anda</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Input
                                type="date"
                                className="w-full md:w-40 bg-white"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                            <Button variant="outline" onClick={() => setSortDesc(!sortDesc)}>
                                <Filter className="h-4 w-4 mr-2" />
                                {sortDesc ? "Terkini" : "Terlama"}
                            </Button>
                            <Button variant="outline" onClick={handleExportCSV}>
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                            <Button variant="destructive" onClick={clearHistory}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Padam
                            </Button>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Senarai Percubaan ({sortedHistory.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {history.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    Tiada sejarah ujian dijumpai. <br />
                                    Mula menjawab ujian di Dashboard.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {sortedHistory.map((attempt, i) => (
                                        <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-white ${attempt.percentage >= 80 ? 'bg-green-500' :
                                                        attempt.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`}>
                                                    {attempt.percentage}%
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {new Date(attempt.date).toLocaleDateString('ms-MY', {
                                                            weekday: 'long',
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {new Date(attempt.date).toLocaleTimeString('ms-MY')} • Skor: {attempt.score}/{attempt.totalQuestions * 10}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <Badge variant="outline" className={`
                                                    ${attempt.percentage >= 80 ? 'text-green-600 border-green-200 bg-green-50' :
                                                        attempt.percentage >= 50 ? 'text-yellow-600 border-yellow-200 bg-yellow-50' :
                                                            'text-red-600 border-red-200 bg-red-50'}
                                                `}>
                                                    {attempt.percentage >= 80 ? "Cemerlang" : attempt.percentage >= 50 ? "Lulus" : "Gagal"}
                                                </Badge>

                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" onClick={() => setSelectedAttempt(attempt)}>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            Lihat
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>Semakan Jawapan Ujian</DialogTitle>
                                                            <DialogDescription>
                                                                Tarikh: {new Date(attempt.date).toLocaleString()} | Skor: {attempt.percentage}%
                                                            </DialogDescription>
                                                        </DialogHeader>

                                                        {attempt.answers ? (
                                                            <QuestionReview
                                                                questions={questions}
                                                                userAnswers={attempt.answers}
                                                            />
                                                        ) : (
                                                            <div className="py-10 text-center text-gray-500">
                                                                <p>Detail jawapan tidak tersedia untuk ujian ini (Rekod lama).</p>
                                                            </div>
                                                        )}
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}

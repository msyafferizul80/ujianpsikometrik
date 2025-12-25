"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar } from "lucide-react";
import Link from "next/link";

interface QuizAttempt {
    date: string;
    score: number;
    percentage: number;
    totalQuestions: number;
}

export function RecentActivity() {
    const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([]);

    useEffect(() => {
        // Get quiz history from localStorage
        const history = localStorage.getItem('quizHistory');
        if (history) {
            const parsed = JSON.parse(history);
            // Get last 3 attempts
            setRecentAttempts(parsed.slice(-3).reverse());
        }
    }, []);

    if (recentAttempts.length === 0) {
        return (
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-md">Aktiviti Terkini</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm italic border-2 border-dashed border-gray-100 rounded-lg">
                        Tiada rekod ujian
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-md">Aktiviti Terkini</CardTitle>
                <Link href="/history" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    Lihat Semua
                </Link>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {recentAttempts.map((attempt, index) => (
                        <div
                            key={index}
                            className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(attempt.date).toLocaleDateString('ms-MY', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </div>
                                <div className={`text-xs font-semibold ${attempt.percentage >= 80 ? 'text-green-600' :
                                    attempt.percentage >= 60 ? 'text-yellow-600' :
                                        'text-red-600'
                                    }`}>
                                    {attempt.percentage}%
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    {attempt.score}/{attempt.totalQuestions * 10} markah
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

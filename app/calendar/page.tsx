"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Calendar as CalendarIcon, Flame, Clock, Target, AlertCircle, CheckCircle2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function CalendarPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [activityDates, setActivityDates] = useState<Date[]>([]);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [examDate, setExamDate] = useState<string>("");
    const [daysLeft, setDaysLeft] = useState<number | null>(null);

    useEffect(() => {
        // Load History
        const savedHistory = localStorage.getItem('quizHistory');
        if (savedHistory) {
            const parsed = JSON.parse(savedHistory);
            const dates = parsed.map((item: any) => new Date(item.date));
            setActivityDates(dates);
            setHistoryData(parsed);
        }

        // Load Exam Date
        const savedExam = localStorage.getItem('examDate');
        if (savedExam) {
            setExamDate(savedExam);
            calculateDaysLeft(savedExam);
        }
    }, []);

    const calculateDaysLeft = (target: string) => {
        const targetDate = new Date(target);
        const today = new Date();
        const diff = targetDate.getTime() - today.getTime();
        setDaysLeft(Math.ceil(diff / (1000 * 3600 * 24)));
    };

    const handleSaveExamDate = () => {
        localStorage.setItem('examDate', examDate);
        calculateDaysLeft(examDate);
    };

    const getDailyFocus = () => {
        const day = new Date().getDay(); // 0 = Sun, 1 = Mon...
        const topics = ["Rehat / Ulangkaji Santai", "Kerjasama (Teamwork)", "Emosi & Psikologi", "Komunikasi Berkesan", "Disiplin & Integriti", "Kepimpinan", "Ujian Simulasi Penuh"];
        return topics[day];
    };

    const getSelectedDateActivity = () => {
        if (!date) return [];
        return historyData.filter(h => {
            const hDate = new Date(h.date);
            return hDate.getDate() === date.getDate() &&
                hDate.getMonth() === date.getMonth() &&
                hDate.getFullYear() === date.getFullYear();
        });
    };

    const selectedActivities = getSelectedDateActivity();

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Perancang Studi</h1>
                        <p className="text-gray-600">Jadualkan kejayaan anda dari sekarang.</p>
                    </div>

                    {daysLeft !== null && daysLeft >= 0 ? (
                        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0 shadow-lg text-white">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-full">
                                    <Clock className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Masa Tinggal</p>
                                    <h3 className="text-2xl font-bold">{daysLeft} Hari Lagi</h3>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                className="w-auto"
                                value={examDate}
                                onChange={(e) => setExamDate(e.target.value)}
                            />
                            <Button onClick={handleSaveExamDate}>Set Tarikh Exam</Button>
                        </div>
                    )}
                </div>

                {/* Top Section: Daily Focus & Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-white border-l-4 border-l-orange-500 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-widest">Fokus Hari Ini</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Target className="h-6 w-6 text-orange-600" />
                                <span className="text-xl font-bold text-gray-900">{getDailyFocus()}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Disarankan luangkan 15 minit untuk topik ini.</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-l-4 border-l-green-500 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-widest">Konsistensi</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Flame className="h-6 w-6 text-green-600" />
                                <span className="text-xl font-bold text-gray-900">{new Set(activityDates.map(d => d.toDateString())).size} Hari</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Jumlah hari anda telah berlatih.</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-l-4 border-l-purple-500 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-widest">Status Exam</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-6 w-6 text-purple-600" />
                                <span className="text-xl font-bold text-gray-900">{examDate ? new Date(examDate).toLocaleDateString('ms-MY') : "Belum Set"}</span>
                            </div>
                            {examDate ? (
                                <Button variant="link" className="p-0 h-auto text-xs text-purple-600" onClick={() => { setExamDate(""); setDaysLeft(null); localStorage.removeItem('examDate'); }}>Ubah Tarikh</Button>
                            ) : (
                                <p className="text-xs text-gray-500 mt-2">Sila tetapkan tarikh ujian anda.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Calendar */}
                    <Card className="col-span-1 lg:col-span-2 shadow-md border-0 ring-1 ring-gray-100">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5 text-blue-600" />
                                Kalendar Aktiviti
                            </CardTitle>
                            <CardDescription>
                                Klik pada tarikh untuk melihat rekod latihan anda.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center p-6">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                modifiers={{
                                    activity: activityDates
                                }}
                                modifiersStyles={{
                                    activity: {
                                        fontWeight: 'bold',
                                        color: '#2563eb',
                                        backgroundColor: '#eff6ff',
                                        borderRadius: '8px',
                                        border: '1px solid #bfdbfe'
                                    }
                                }}
                                className="rounded-md border shadow-sm p-6 w-full max-w-md"
                            />
                        </CardContent>
                    </Card>

                    {/* Detailed Log Side Panel */}
                    <div className="space-y-6">
                        <Card className="h-full shadow-md border-0 ring-1 ring-gray-100 flex flex-col">
                            <CardHeader className="bg-gray-50/50 border-b pb-4">
                                <CardTitle className="text-lg">
                                    {date ? date.toLocaleDateString("ms-MY", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Pilih Tarikh"}
                                </CardTitle>
                                <CardDescription>Ringkasan aktiviti pada tarikh ini</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                                {selectedActivities.length > 0 ? (
                                    selectedActivities.map((activity, idx) => (
                                        <div key={idx} className="flex items-start gap-4 p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                            <div className={`p-2 rounded-full ${activity.percentage >= 80 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {activity.percentage >= 80 ? <CheckCircle2 className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">Ujian Latihan #{idx + 1}</h4>
                                                <div className="flex gap-2 mt-1">
                                                    <Badge variant={activity.percentage >= 80 ? "default" : "secondary"}>Skor: {activity.percentage}%</Badge>
                                                    <span className="text-xs text-gray-500 self-center">{new Date(activity.date).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10">
                                        <div className="bg-gray-100 p-4 rounded-full inline-block mb-3">
                                            <CalendarIcon className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-500 font-medium">Tiada aktiviti direkodkan.</p>
                                        <p className="text-xs text-gray-400 mt-1">Cuba buat latihan pada hari ini!</p>
                                        {date && date.toDateString() === new Date().toDateString() && (
                                            <Button className="mt-4 w-full" onClick={() => window.location.href = '/quiz'}>Mula Latihan Sekarang</Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

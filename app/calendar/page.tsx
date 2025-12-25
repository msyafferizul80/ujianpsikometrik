"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Calendar as CalendarIcon, Flame } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

export default function CalendarPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [activityDates, setActivityDates] = useState<Date[]>([]);
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        const history = localStorage.getItem('quizHistory');
        if (history) {
            const data = JSON.parse(history);
            const dates = data.map((item: any) => new Date(item.date));
            setActivityDates(dates);

            // Calculate streak (simplified)
            // You might want to import the robust calculateStreak from stats.ts used in Dashboard
            // For now, simple fallback or reuse logic
        }
    }, []);

    const isDayWithActivity = (day: Date) => {
        return activityDates.some(d =>
            d.getDate() === day.getDate() &&
            d.getMonth() === day.getMonth() &&
            d.getFullYear() === day.getFullYear()
        );
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Kalendar Latihan</h1>
                    <p className="text-gray-600">Jejak konsistensi latihan anda</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="shadow-lg border-0 ring-1 ring-gray-100">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5 text-blue-600" />
                                Jadual Aktiviti
                            </CardTitle>
                            <CardDescription>
                                Tarikh anda telah melakukan latihan ditandakan di bawah.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center">
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
                                        borderRadius: '100%'
                                    }
                                }}
                                className="rounded-md border shadow-sm p-4"
                            />
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-100 shadow-md">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                                    <Flame className="h-8 w-8 text-orange-500 fill-orange-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-orange-900">Consistency Strike</h3>
                                    <p className="text-sm text-orange-700/80">
                                        Kekalkan momentum latihan anda setiap hari untuk meningkatkan prestasi.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Ringkasan Aktiviti</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-4">
                                    <li className="flex justify-between items-center text-sm border-b pb-2">
                                        <span className="text-gray-600">Hari ini</span>
                                        <span className="font-medium text-gray-900">
                                            {isDayWithActivity(new Date()) ? "Selesai ✅" : "Belum latihan"}
                                        </span>
                                    </li>
                                    <li className="flex justify-between items-center text-sm border-b pb-2">
                                        <span className="text-gray-600">Jumlah Hari Latihan</span>
                                        <span className="font-medium text-gray-900">{new Set(activityDates.map(d => d.toDateString())).size} hari</span>
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

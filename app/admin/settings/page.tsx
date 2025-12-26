"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { quizRepository } from "@/utils/supabaseRepository";
import { Calendar, Save, Clock, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminSettingsPage() {
    const [examDate, setExamDate] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState("");

    useEffect(() => {
        fetchExamDate();
    }, []);

    const fetchExamDate = async () => {
        try {
            const dateStr = await quizRepository.getExamDate();
            if (dateStr) {
                // Format for input type="date" (YYYY-MM-DD)
                const d = new Date(dateStr);
                const formatted = d.toISOString().split('T')[0];
                setExamDate(formatted);
                setLastSaved(d.toLocaleDateString('ms-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
            }
        } catch (error) {
            console.error("Error fetching exam date:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!examDate) {
            alert("Sila pilih tarikh.");
            return;
        }

        setSaving(true);
        try {
            const dateObj = new Date(examDate);
            // Set time to 23:59:59 to verify end of that day
            dateObj.setHours(23, 59, 59, 999);

            await quizRepository.setExamDate(dateObj);

            setLastSaved(dateObj.toLocaleDateString('ms-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
            alert("Tarikh peperiksaan berjaya dikemaskini.");
        } catch (error) {
            console.error("Error saving exam date:", error);
            alert("Gagal menyimpan tarikh.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-8 w-8 text-blue-600" />
                        Tetapan Sistem
                    </h1>
                    <p className="text-gray-600">Konfigurasi global untuk Ujian Psikometrik.</p>
                </div>

                <div className="grid gap-6">
                    <Card className="border-l-4 border-l-blue-600">
                        <CardHeader>
                            <CardTitle>Tarikh Peperiksaan Utama</CardTitle>
                            <CardDescription>
                                Tarikh ini akan digunakan untuk mengira "Countdown" di dashboard pengguna dan menentukan tamat tempoh langganan pakej "Exam-Ready".
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-gray-500">Loading settings...</div>
                            ) : (
                                <form onSubmit={handleSave} className="space-y-6">
                                    <div className="flex flex-col md:flex-row gap-4 items-end">
                                        <div className="w-full md:w-1/2 space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Pilih Tarikh Exam</label>
                                            <div className="relative">
                                                <Input
                                                    type="date"
                                                    value={examDate}
                                                    onChange={(e) => setExamDate(e.target.value)}
                                                    className="pl-10"
                                                />
                                                <Calendar className="h-4 w-4 text-gray-500 absolute left-3 top-3" />
                                            </div>
                                        </div>
                                        <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                                            {saving ? "Menyimpan..." : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" /> Simpan Perubahan
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {lastSaved && (
                                        <Alert className="bg-blue-50 border-blue-200">
                                            <Clock className="h-4 w-4 text-blue-600" />
                                            <AlertTitle className="text-blue-800">Tarikh Semasa</AlertTitle>
                                            <AlertDescription className="text-blue-600">
                                                Peperiksaan dijadualkan pada: <strong>{lastSaved}</strong>
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 flex gap-3 text-sm text-yellow-800">
                                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                                        <div>
                                            <strong>Perhatian:</strong> Mengubah tarikh ini akan memberi kesan kepada semua pengguna yang melanggan pakej "Exam-Ready". Countdown timer mereka akan berubah serta-merta mengikut tarikh baru ini.
                                        </div>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}

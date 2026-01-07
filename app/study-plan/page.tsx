"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarIcon, Clock, Sparkles, BookOpen, Save, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function StudyPlanPage() {
    const [date, setDate] = useState<Date>();
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<any>(null);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [dailyHours, setDailyHours] = useState("1");
    const [focusArea, setFocusArea] = useState("all");

    // Load from LocalStorage on Mount
    useEffect(() => {
        const savedPlan = localStorage.getItem('studyPlan');
        const savedSettings = localStorage.getItem('studyPlanSettings');

        if (savedPlan) {
            try {
                setPlan(JSON.parse(savedPlan));
            } catch (e) {
                console.error("Failed to parse saved plan", e);
            }
        }

        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                if (settings.examDate) setDate(new Date(settings.examDate));
                if (settings.selectedDays) setSelectedDays(settings.selectedDays);
                if (settings.dailyHours) setDailyHours(settings.dailyHours);
                if (settings.focusArea) setFocusArea(settings.focusArea);
            } catch (e) {
                console.error("Failed to parse saved settings", e);
            }
        }
    }, []);

    const days = [
        { id: "Mon", label: "Isnin" },
        { id: "Tue", label: "Selasa" },
        { id: "Wed", label: "Rabu" },
        { id: "Thu", label: "Khamis" },
        { id: "Fri", label: "Jumaat" },
        { id: "Sat", label: "Sabtu" },
        { id: "Sun", label: "Ahad" },
    ];

    const toggleDay = (dayId: string) => {
        if (selectedDays.includes(dayId)) {
            setSelectedDays(selectedDays.filter(d => d !== dayId));
        } else {
            setSelectedDays([...selectedDays, dayId]);
        }
    };

    const handleGenerate = async () => {
        if (!date || selectedDays.length === 0) {
            alert("Sila pilih tarikh peperiksaan dan hari-hari yang anda luang.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examDate: date.toISOString(),
                    availableDays: selectedDays,
                    dailyHours,
                    focusArea
                })
            });
            const data = await res.json();
            if (data.plan) {
                setPlan(data.plan);

                // Save to LocalStorage
                localStorage.setItem('studyPlan', JSON.stringify(data.plan));
                localStorage.setItem('studyPlanSettings', JSON.stringify({
                    examDate: date.toISOString(),
                    selectedDays,
                    dailyHours,
                    focusArea
                }));
            }
        } catch (error) {
            console.error("Failed to generate plan", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-5xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-indigo-500" />
                        Penjana Jadual AI
                    </h1>
                    <p className="text-gray-500 mt-2">
                        Biarkan AI merancang strategi ulangkaji anda berdasarkan masa yang anda ada.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Configuration Panel */}
                    <Card className="md:col-span-1 h-fit shadow-md border-indigo-100">
                        <CardHeader className="bg-indigo-50/50">
                            <CardTitle className="text-lg">Tetapan Jadual</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            {/* Exam Date */}
                            <div className="space-y-2">
                                <Label>Tarikh Peperiksaan</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>Pilih tarikh</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                            disabled={(date) => date < new Date()}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Available Days */}
                            <div className="space-y-3">
                                <Label>Hari Kelapangan</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {days.map((day) => (
                                        <div key={day.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={day.id}
                                                checked={selectedDays.includes(day.id)}
                                                onCheckedChange={() => toggleDay(day.id)}
                                            />
                                            <label
                                                htmlFor={day.id}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {day.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Daily Hours */}
                            <div className="space-y-2">
                                <Label>Jam Belajar (Sehari)</Label>
                                <Select value={dailyHours} onValueChange={setDailyHours}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih jam" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0.5">30 Minit</SelectItem>
                                        <SelectItem value="1">1 Jam</SelectItem>
                                        <SelectItem value="2">2 Jam</SelectItem>
                                        <SelectItem value="3">3 Jam</SelectItem>
                                        <SelectItem value="4">4+ Jam (Hardcore)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Focus Area */}
                            <div className="space-y-2">
                                <Label>Fokus Utama</Label>
                                <Select value={focusArea} onValueChange={setFocusArea}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih fokus" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Topik (Seimbang)</SelectItem>
                                        <SelectItem value="social">Teras Sosial</SelectItem>
                                        <SelectItem value="emotional">Teras Emosi</SelectItem>
                                        <SelectItem value="communication">Teras Komunikasi</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
                                onClick={handleGenerate}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Sedang Menjana...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Jana Jadual
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Results Panel */}
                    <div className="md:col-span-2 space-y-6">
                        {!plan ? (
                            <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-center">
                                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                                    <CalendarIcon className="h-10 w-10 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Tiada Jadual Dijana</h3>
                                <p className="text-gray-500 max-w-sm mt-1">
                                    Sila isi tetapan di sebelah kiri dan klik "Jana Jadual" untuk mendapatkan pelan ulangkaji anda.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <Alert className="bg-green-50 border-green-200 text-green-800">
                                    <Sparkles className="h-4 w-4 text-green-600" />
                                    <AlertTitle>Jadual Berjaya Dijana!</AlertTitle>
                                    <AlertDescription>
                                        Ini adalah cadangan strategi berdasarkan tarikh exam anda.
                                    </AlertDescription>
                                </Alert>

                                <div className="space-y-4">
                                    {plan.map((item: any, index: number) => (
                                        <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow">
                                            <div className="flex flex-col md:flex-row border-l-4 border-indigo-500">
                                                <div className="bg-gray-50 p-4 md:w-48 flex flex-col justify-center items-center md:items-start border-b md:border-b-0 md:border-r border-gray-100">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">{format(new Date(item.date), "EEEE")}</span>
                                                    <span className="text-2xl font-bold text-gray-800">{format(new Date(item.date), "d MMM")}</span>
                                                    <div className="mt-2 flex items-center text-xs text-gray-500">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        {item.duration}
                                                    </div>
                                                </div>
                                                <div className="p-4 flex-1">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-lg text-gray-900">{item.topic}</h4>
                                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.type === 'Quiz' ? 'bg-blue-100 text-blue-700' :
                                                            item.type === 'Revision' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'
                                                            }`}>
                                                            {item.type}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-600 text-sm">{item.activity}</p>

                                                    {item.tips && (
                                                        <div className="mt-3 text-xs bg-indigo-50 text-indigo-700 p-2 rounded border border-indigo-100 flex gap-2">
                                                            <Sparkles className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                                            {item.tips}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

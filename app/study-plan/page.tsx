"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Calendar as CalendarIcon, Clock, Sparkles, RefreshCw,
    Brain, CheckCircle2, Circle, AlertTriangle, Briefcase, ChevronRight, Target
} from "lucide-react";
import { format } from "date-fns";
import { ms } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";

const INTENSITY_CONFIG = {
    Low: { color: "bg-green-100 text-green-700 border-green-200", bar: "bg-green-400", label: "Ringan" },
    Medium: { color: "bg-amber-100 text-amber-700 border-amber-200", bar: "bg-amber-400", label: "Sederhana" },
    High: { color: "bg-red-100 text-red-700 border-red-200", bar: "bg-red-500", label: "Intensif" },
};

const TYPE_COLOR: Record<string, string> = {
    Revision: "bg-indigo-100 text-indigo-700",
    Quiz: "bg-blue-100 text-blue-700",
    Simulation: "bg-purple-100 text-purple-700",
};

const TERAS_COLORS: Record<string, string> = {
    Emosi: "border-rose-400",
    Sosial: "border-sky-400",
    Komunikasi: "border-emerald-400",
    Kepimpinan: "border-amber-400",
    Integriti: "border-violet-400",
};

interface PlanItem {
    date: string;
    topic: string;
    teras?: string;
    type: string;
    intensity?: "Low" | "Medium" | "High";
    activity: string;
    duration: string;
    tips?: string;
    done?: boolean;
}

interface StudyPlan {
    summary?: string;
    weakAreasFocus?: string[];
    totalSessions?: number;
    plan: PlanItem[];
}
import { useRouter } from "next/navigation";

export default function StudyPlanPage() {
    const router = useRouter();
    const [date, setDate] = useState<Date>();
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<StudyPlan | null>(null);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [dailyHours, setDailyHours] = useState("1");
    const [focusArea, setFocusArea] = useState("all");
    const [jobRole, setJobRole] = useState("all");
    const [jobRoles, setJobRoles] = useState<string[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [completedSessions, setCompletedSessions] = useState<Set<string>>(new Set());

    const days = [
        { id: "Mon", label: "Isnin" }, { id: "Tue", label: "Selasa" },
        { id: "Wed", label: "Rabu" }, { id: "Thu", label: "Khamis" },
        { id: "Fri", label: "Jumaat" }, { id: "Sat", label: "Sabtu" },
        { id: "Sun", label: "Ahad" },
    ];

    useEffect(() => {
        // Load saved state
        const savedPlan = localStorage.getItem('studyPlan');
        const savedSettings = localStorage.getItem('studyPlanSettings');
        const savedCompleted = localStorage.getItem('studyPlanCompleted');

        if (savedPlan) {
            try {
                const parsed = JSON.parse(savedPlan);
                // Backward compat: old format was a plain array, new format is {plan:[...], summary:...}
                if (Array.isArray(parsed)) {
                    setPlan({ plan: parsed });
                } else if (parsed && Array.isArray(parsed.plan)) {
                    setPlan(parsed);
                }
            } catch { /**/ }
        }
        if (savedCompleted) { try { setCompletedSessions(new Set(JSON.parse(savedCompleted))); } catch { /**/ } }
        if (savedSettings) {
            try {
                const s = JSON.parse(savedSettings);
                if (s.examDate) setDate(new Date(s.examDate));
                if (s.selectedDays) setSelectedDays(s.selectedDays);
                if (s.dailyHours) setDailyHours(s.dailyHours);
                if (s.focusArea) setFocusArea(s.focusArea);
                if (s.jobRole) setJobRole(s.jobRole);
            } catch { /**/ }
        }

        // Fetch user session + job tag options
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setUserId(session.user.id);
        });

        fetch('/api/admin/job-tags')
            .then(r => r.json())
            .then(d => setJobRoles((d.tags || []).map((t: any) => t.name)))
            .catch(() => { });
    }, []);

    const toggleDay = (dayId: string) => {
        setSelectedDays(prev =>
            prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
        );
    };

    const toggleSession = (dateStr: string) => {
        setCompletedSessions(prev => {
            const next = new Set(prev);
            if (next.has(dateStr)) next.delete(dateStr);
            else next.add(dateStr);
            localStorage.setItem('studyPlanCompleted', JSON.stringify([...next]));
            return next;
        });
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
                    focusArea,
                    jobRole: jobRole === 'all' ? null : jobRole,
                    userId,
                })
            });
            const data = await res.json();
            if (data.plan) {
                const planData: StudyPlan = {
                    summary: data.summary,
                    weakAreasFocus: data.weakAreasFocus,
                    totalSessions: data.totalSessions,
                    plan: data.plan,
                };
                setPlan(planData);
                setCompletedSessions(new Set()); // Reset progress on new plan
                localStorage.setItem('studyPlan', JSON.stringify(planData));
                localStorage.removeItem('studyPlanCompleted');
                localStorage.setItem('studyPlanSettings', JSON.stringify({
                    examDate: date.toISOString(), selectedDays, dailyHours, focusArea, jobRole
                }));
            }
        } catch (error) {
            console.error("Failed to generate plan", error);
            alert("Gagal menjana jadual. Cuba lagi.");
        } finally {
            setLoading(false);
        }
    };

    const handleStartAdaptiveSession = (teras: string | undefined) => {
        localStorage.setItem('activeQuizId', 'adaptive-mode');
        localStorage.setItem('activeQuizTitle', `Latihan Adaptif: ${teras || 'Umum'}`);
        if (teras) {
            localStorage.setItem('activeTeras', teras); // The API uses this to filter
        } else {
            localStorage.removeItem('activeTeras');
        }
        router.push('/quiz');
    };

    const doneCount = plan ? plan.plan.filter(s => completedSessions.has(s.date)).length : 0;
    const totalCount = plan?.plan.length ?? 0;
    const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    return (
        <DashboardLayout>
            <div className="p-6 max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-indigo-500" />
                        Jadual Belajar AI
                    </h1>
                    <p className="text-gray-500 mt-1">
                        AI akan jana jadual peribadi berdasarkan kelemahan anda dari sejarah kuiz.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ── Config Panel ───────────────────────────────── */}
                    <Card className="lg:col-span-1 h-fit shadow-sm border-indigo-100">
                        <CardHeader className="bg-indigo-50/50 pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Target className="h-4 w-4 text-indigo-600" />
                                Tetapan Jadual
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-5">
                            {/* Exam Date */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Tarikh Peperiksaan</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn("w-full justify-start text-left font-normal text-sm", !date && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "d MMMM yyyy", { locale: ms }) : "Pilih tarikh"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single" selected={date} onSelect={setDate}
                                            initialFocus disabled={(d) => d < new Date()}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Job Role */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-1.5">
                                    <Briefcase className="h-3.5 w-3.5 text-gray-400" /> Jawatan Disasarkan
                                </Label>
                                <Select value={jobRole} onValueChange={setJobRole}>
                                    <SelectTrigger className="text-sm">
                                        <SelectValue placeholder="Pilih jawatan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Umum (Tiada Spesifik)</SelectItem>
                                        {jobRoles.map(role => (
                                            <SelectItem key={role} value={role}>{role}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Available Days */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Hari Kelapangan</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {days.map((day) => (
                                        <div key={day.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={day.id}
                                                checked={selectedDays.includes(day.id)}
                                                onCheckedChange={() => toggleDay(day.id)}
                                            />
                                            <label htmlFor={day.id} className="text-sm cursor-pointer select-none">
                                                {day.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Daily Hours */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Jam Belajar (Sehari)</Label>
                                <Select value={dailyHours} onValueChange={setDailyHours}>
                                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
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
                                <Label className="text-sm font-medium">Fokus Utama</Label>
                                <Select value={focusArea} onValueChange={setFocusArea}>
                                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Seimbang (Semua Teras)</SelectItem>
                                        <SelectItem value="Emosi">Teras Emosi</SelectItem>
                                        <SelectItem value="Sosial">Teras Sosial</SelectItem>
                                        <SelectItem value="Komunikasi">Komunikasi</SelectItem>
                                        <SelectItem value="Kepimpinan">Kepimpinan</SelectItem>
                                        <SelectItem value="Integriti">Integriti</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md font-semibold"
                                onClick={handleGenerate}
                                disabled={loading}
                            >
                                {loading ? (
                                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />AI Sedang Merancang...</>
                                ) : (
                                    <><Sparkles className="mr-2 h-4 w-4" />Jana Jadual</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* ── Results Panel ─────────────────────────────── */}
                    <div className="lg:col-span-2 space-y-4">
                        {!plan ? (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 text-center">
                                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                                    <Brain className="h-10 w-10 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700">Belum Ada Jadual</h3>
                                <p className="text-gray-400 max-w-xs mt-2 text-sm">
                                    Isi tetapan di sebelah kiri dan klik "Jana Jadual" — AI akan analisis kelemahan anda dan buat pelan yang personal.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Progress Banner */}
                                <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-sm">
                                    <CardContent className="pt-4 pb-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Kemajuan Jadual</p>
                                                <p className="text-2xl font-extrabold text-gray-900 mt-0.5">
                                                    {doneCount} / {totalCount}
                                                    <span className="text-sm font-normal text-gray-500 ml-2">sesi selesai</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-3xl font-extrabold text-indigo-600">{progressPct}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                                                style={{ width: `${progressPct}%` }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* AI Summary */}
                                {plan.summary && (
                                    <div className="bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm text-gray-700 flex gap-3 items-start shadow-sm">
                                        <Sparkles className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                                        <p>{plan.summary}</p>
                                    </div>
                                )}

                                {/* Weak Areas Banner */}
                                {plan.weakAreasFocus && plan.weakAreasFocus.length > 0 && (
                                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                        <div className="text-sm">
                                            <span className="font-semibold text-amber-900">Fokus Kelemahan: </span>
                                            <span className="text-amber-800">{plan.weakAreasFocus.join(", ")}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Session Cards */}
                                <div className="space-y-3">
                                    {plan.plan.map((item, index) => {
                                        const isDone = completedSessions.has(item.date);
                                        const intensity = item.intensity || "Medium";
                                        const intensityConf = INTENSITY_CONFIG[intensity] || INTENSITY_CONFIG.Medium;
                                        const terasBorder = TERAS_COLORS[item.teras || ""] || "border-indigo-400";
                                        const typeColor = TYPE_COLOR[item.type] || "bg-gray-100 text-gray-700";

                                        return (
                                            <Card
                                                key={index}
                                                className={cn(
                                                    "overflow-hidden border-l-4 shadow-sm transition-all",
                                                    terasBorder,
                                                    isDone ? "opacity-60 bg-gray-50" : "hover:shadow-md"
                                                )}
                                            >
                                                <div className="flex">
                                                    {/* Date Column */}
                                                    <div className="bg-gray-50 border-r border-gray-100 p-4 w-28 flex flex-col items-center justify-center text-center gap-1 shrink-0">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                                                            {format(new Date(item.date), "EEE", { locale: ms })}
                                                        </span>
                                                        <span className="text-2xl font-extrabold text-gray-800 leading-none">
                                                            {format(new Date(item.date), "d")}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-medium">
                                                            {format(new Date(item.date), "MMM", { locale: ms })}
                                                        </span>
                                                        <div className="flex items-center gap-0.5 text-gray-400 mt-1">
                                                            <Clock className="h-2.5 w-2.5" />
                                                            <span className="text-[10px]">{item.duration}</span>
                                                        </div>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="p-4 flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-3 mb-2">
                                                            <div className="min-w-0">
                                                                <h4 className={cn("font-bold text-base text-gray-900 leading-tight", isDone && "line-through text-gray-400")}>
                                                                    {item.topic}
                                                                </h4>
                                                                {item.teras && (
                                                                    <span className="text-[10px] text-gray-400 font-medium">Teras {item.teras}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${intensityConf.color}`}>
                                                                    {intensityConf.label}
                                                                </span>
                                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeColor}`}>
                                                                    {item.type}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <p className="text-sm text-gray-600 mb-3">{item.activity}</p>

                                                        {item.tips && (
                                                            <div className="flex gap-2 text-xs bg-indigo-50 text-indigo-700 p-2 rounded-lg border border-indigo-100 mb-3">
                                                                <ChevronRight className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                                                {item.tips}
                                                            </div>
                                                        )}

                                                        {/* Action Buttons */}
                                                        {!isDone && (item.type === "Quiz" || item.type === "Simulation") && (
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                className="mt-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                                                                onClick={() => handleStartAdaptiveSession(item.teras)}
                                                            >
                                                                <Brain className="w-3 h-3 mr-1.5" /> Mula Sesi Adaptif
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {/* Done Toggle */}
                                                    <div
                                                        className="flex items-center px-4 cursor-pointer group"
                                                        onClick={() => toggleSession(item.date)}
                                                    >
                                                        {isDone
                                                            ? <CheckCircle2 className="h-6 w-6 text-green-500" />
                                                            : <Circle className="h-6 w-6 text-gray-200 group-hover:text-indigo-300 transition-colors" />
                                                        }
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>

                                {/* Regenerate */}
                                <Button
                                    variant="outline"
                                    className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                    onClick={handleGenerate}
                                    disabled={loading}
                                >
                                    <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                                    Jana Semula Jadual
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

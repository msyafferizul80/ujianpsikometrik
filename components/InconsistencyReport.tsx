"use client";

import { AlertTriangle, CheckCircle, ShieldCheck, Brain, AlertOctagon, Lightbulb, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface Inconsistency {
    question1_id: number;
    question2_id: number;
    question1_text?: string;
    question2_text?: string;
    answer1_text?: string;
    answer2_text?: string;
    reason: string;
    severity: "HIGH" | "MEDIUM";
    // New fields from Advanced AI Engine
    type?: "CONTRADICTORY" | "SOCIALLY_DESIRABLE" | "BIASED" | "INCONSISTENT_TRAIT";
    bias_pattern?: string;
    simulasi_pemikiran?: string;
}

interface InconsistencyReportProps {
    inconsistencies: Inconsistency[];
    score?: number;
    loading: boolean;
}

// Type configuration for visual display
const TYPE_CONFIG = {
    CONTRADICTORY: {
        label: "Percanggahan Langsung",
        color: "bg-orange-100 text-orange-800 border-orange-300",
        cardBg: "bg-orange-50 border-orange-200",
        headerBg: "bg-orange-100/60 border-orange-200",
        icon: AlertOctagon,
        iconColor: "text-orange-600",
        dot: "bg-orange-500",
    },
    SOCIALLY_DESIRABLE: {
        label: "Jawapan Sosial Palsu",
        color: "bg-red-100 text-red-800 border-red-300",
        cardBg: "bg-red-50 border-red-200",
        headerBg: "bg-red-100/60 border-red-200",
        icon: Eye,
        iconColor: "text-red-600",
        dot: "bg-red-500",
    },
    BIASED: {
        label: "Bias — Imej Terlalu Sempurna",
        color: "bg-rose-100 text-rose-800 border-rose-300",
        cardBg: "bg-rose-50 border-rose-200",
        headerBg: "bg-rose-100/60 border-rose-200",
        icon: AlertTriangle,
        iconColor: "text-rose-600",
        dot: "bg-rose-500",
    },
    INCONSISTENT_TRAIT: {
        label: "Trait Tidak Stabil",
        color: "bg-amber-100 text-amber-800 border-amber-300",
        cardBg: "bg-amber-50 border-amber-200",
        headerBg: "bg-amber-100/60 border-amber-200",
        icon: Brain,
        iconColor: "text-amber-600",
        dot: "bg-amber-500",
    },
};

const DEFAULT_TYPE_CONFIG = TYPE_CONFIG["CONTRADICTORY"];

export function InconsistencyReport({ inconsistencies, score, loading }: InconsistencyReportProps) {
    if (loading) {
        return (
            <Card className="border-blue-100 bg-blue-50/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 animate-pulse" />
                        AI sedang mengaudit red flag dalam jawapan anda...
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="h-3 bg-blue-100 rounded-full w-3/4 animate-pulse" />
                    <div className="h-3 bg-blue-100 rounded-full w-1/2 animate-pulse" />
                    <div className="h-3 bg-blue-100 rounded-full w-2/3 animate-pulse" />
                </CardContent>
            </Card>
        );
    }

    const scoreValue = score !== undefined ? score : (inconsistencies.length === 0 ? 100 : 50);
    const highCount = inconsistencies.filter(i => i.severity === "HIGH").length;
    const mediumCount = inconsistencies.filter(i => i.severity === "MEDIUM").length;

    if (inconsistencies.length === 0 && scoreValue > 90) {
        return (
            <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-sm">
                <CardContent className="py-5 flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-full">
                        <CheckCircle className="h-7 w-7 text-green-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-green-900 text-base">✅ Tiada Red Flag Dikesan</h4>
                        <p className="text-sm text-green-700 mt-0.5">AI mendapati jawapan anda konsisten dan autentik. Tiada percanggahan ketara atau corak penipuan dikesan.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Header */}
            <Card className="border-red-200 bg-gradient-to-r from-red-50 to-rose-50 shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-red-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2 text-red-900 text-lg">
                            <AlertOctagon className="h-5 w-5 text-red-600" />
                            Laporan Red Flag — Analisis Integriti AI
                        </CardTitle>

                        {/* Score pill */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${scoreValue >= 80 ? 'bg-green-100 text-green-800 border-green-300' :
                                scoreValue >= 60 ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                    'bg-red-100 text-red-800 border-red-300'
                            }`}>
                            <span className="text-lg">{scoreValue}%</span>
                            <span className="font-medium opacity-75">Konsistensi</span>
                        </div>
                    </div>

                    {/* Stats bar */}
                    <div className="flex flex-wrap gap-2 mt-2">
                        {highCount > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-100 text-red-800 px-3 py-1 rounded-full border border-red-200">
                                <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                                {highCount} Isu Kritikal (HIGH)
                            </span>
                        )}
                        {mediumCount > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
                                <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                                {mediumCount} Isu Sederhana (MEDIUM)
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 px-3 py-1 rounded-full border border-gray-200 bg-white">
                            Jawapan bercanggah boleh menyebabkan anda gagal tapisan integriti SPA
                        </span>
                    </div>
                </CardHeader>
            </Card>

            {/* Red Flag Cards */}
            {inconsistencies.map((item, idx) => {
                const typeKey = item.type || "CONTRADICTORY";
                const config = TYPE_CONFIG[typeKey as keyof typeof TYPE_CONFIG] || DEFAULT_TYPE_CONFIG;
                const Icon = config.icon;

                return (
                    <Card key={idx} className={`border shadow-sm overflow-hidden ${config.cardBg}`}>
                        {/* Card Header */}
                        <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${config.headerBg}`}>
                            <div className="flex items-center gap-3">
                                {/* Severity indicator */}
                                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${item.severity === 'HIGH' ? 'bg-red-200' : 'bg-amber-200'
                                    }`}>
                                    <Icon className={`h-4 w-4 ${config.iconColor}`} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-gray-500">🚩 Isu #{idx + 1}</span>
                                        {/* Severity badge */}
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${item.severity === 'HIGH'
                                                ? 'bg-red-200 text-red-800 border-red-300'
                                                : 'bg-amber-200 text-amber-800 border-amber-300'
                                            }`}>
                                            {item.severity === 'HIGH' ? '🔴 KRITIKAL' : '🟡 SEDERHANA'}
                                        </span>
                                        {/* Type badge */}
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config.color}`}>
                                            {config.label}
                                        </span>
                                    </div>
                                    {item.bias_pattern && (
                                        <p className="text-xs text-gray-600 font-medium mt-0.5">Pattern: {item.bias_pattern}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <CardContent className="p-4 space-y-4">
                            {/* Reason */}
                            <div className="bg-white/80 border border-gray-200 rounded-lg p-3">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1.5">
                                    <AlertTriangle className="h-3 w-3" /> Masalah Yang Dikesan
                                </p>
                                <p className="text-sm text-gray-800 leading-relaxed">{item.reason}</p>
                            </div>

                            {/* Q&A Evidence */}
                            {(item.question1_text || item.question2_text) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="bg-white/70 rounded-lg p-3 border border-gray-200">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Situasi A</p>
                                        <p className="text-xs text-gray-700 mb-2 line-clamp-2">{item.question1_text || `Soalan ${item.question1_id}`}</p>
                                        <span className="inline-block text-xs bg-gray-100 border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                                            Jawapan Anda: {item.answer1_text || "—"}
                                        </span>
                                    </div>
                                    <div className="bg-white/70 rounded-lg p-3 border border-gray-200">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Situasi B</p>
                                        <p className="text-xs text-gray-700 mb-2 line-clamp-2">{item.question2_text || `Soalan ${item.question2_id}`}</p>
                                        <span className="inline-block text-xs bg-gray-100 border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                                            Jawapan Anda: {item.answer2_text || "—"}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Simulasi Pemikiran — Coaching Box */}
                            {item.simulasi_pemikiran && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-1.5">
                                        <Lightbulb className="h-3.5 w-3.5" />
                                        💡 Simulasi Pemikiran — Cara Penjawat Awam Sebenar
                                    </p>
                                    <p className="text-sm text-blue-900 leading-relaxed italic">
                                        &quot;{item.simulasi_pemikiran}&quot;
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

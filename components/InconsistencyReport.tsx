"use client";

import { AlertTriangle, CheckCircle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
}

interface InconsistencyReportProps {
    inconsistencies: Inconsistency[];
    score?: number;
    loading: boolean;
}

export function InconsistencyReport({ inconsistencies, score, loading }: InconsistencyReportProps) {
    if (loading) {
        return (
            <Card className="border-blue-100 bg-blue-50/50 animate-pulse">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Sedang mengaudit konsistensi jawapan...
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-4 bg-blue-100 rounded w-3/4"></div>
                </CardContent>
            </Card>
        );
    }

    const scoreValue = score !== undefined ? score : (inconsistencies.length === 0 ? 100 : 50);

    if (inconsistencies.length === 0 && scoreValue > 90) {
        return (
            <Card className="border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 shadow-sm">
                <CardContent className="py-4 flex items-center gap-4">
                    <div className="bg-green-100 p-2 rounded-full">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-green-900">Integriti Tinggi</h4>
                        <p className="text-sm text-green-700">Analisis AI mendapati jawapan anda konsisten dan tiada percanggahan ketara.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-amber-200 bg-amber-50 shadow-md overflow-hidden">
            <CardHeader className="pb-4 border-b border-amber-100 bg-amber-100/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-amber-900 text-lg">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            Analisis Konsistensi Jawapan
                        </CardTitle>
                        <p className="text-sm text-amber-700/80 mt-1">
                            Semakan integriti jawapan untuk mengesan percanggahan.
                        </p>
                    </div>

                    {/* Gauge Meter */}
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-amber-200">
                        <div className="relative h-12 w-12 flex items-center justify-center">
                            {/* Circular Progress (Simple CSS/SVG) */}
                            <svg className="h-full w-full transform -rotate-90">
                                <circle
                                    className="text-gray-200"
                                    strokeWidth="4"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="20"
                                    cx="24"
                                    cy="24"
                                />
                                <circle
                                    className={`${(score ?? 100) > 80 ? 'text-green-500' : (score ?? 100) > 60 ? 'text-amber-500' : 'text-red-500'}`}
                                    strokeWidth="4"
                                    strokeDasharray={126}
                                    strokeDashoffset={126 - ((score ?? 100) / 100) * 126}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="20"
                                    cx="24"
                                    cy="24"
                                />
                            </svg>
                            <span className={`absolute text-sm font-bold ${(score ?? 100) > 80 ? 'text-green-700' : (score ?? 100) > 60 ? 'text-amber-700' : 'text-red-700'}`}>
                                {score}%
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Skor Konsistensi</span>
                            <span className={`text-sm font-bold ${(score ?? 100) > 80 ? 'text-green-600' : (score ?? 100) > 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                {(score ?? 100) > 80 ? 'Sangat Konsisten' : (score ?? 100) > 60 ? 'Sederhana' : 'Bahaya'}
                            </span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <p className="text-sm text-amber-900 mb-4 font-medium">
                    Amaran: Jawapan yang bercanggah boleh menyebabkan anda gagal dalam tapisan integriti.
                </p>

                <Accordion type="single" collapsible className="space-y-2">
                    {inconsistencies.map((item, idx) => (
                        <AccordionItem key={idx} value={`item-${idx}`} className="border border-amber-200 bg-white rounded-lg px-2">
                            <AccordionTrigger className="hover:no-underline py-2 text-sm text-amber-900">
                                <span className="flex items-center gap-2 text-left">
                                    <Badge variant={item.severity === 'HIGH' ? 'destructive' : 'secondary'} className="text-[10px]">
                                        {item.severity}
                                    </Badge>
                                    Isu #{idx + 1}: Percanggahan Jawapan
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 px-2">
                                <div className="bg-amber-50 p-3 rounded text-sm text-amber-800 mb-3 border border-amber-100 italic">
                                    &quot;{item.reason}&quot;
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-gray-500 uppercase">Situasi 1</p>
                                        <div className="p-2 border rounded bg-gray-50">
                                            <p className="text-xs text-gray-800 mb-1">{item.question1_text || `Soalan ID ${item.question1_id}`}</p>
                                            <Badge variant="outline" className="bg-white">Jawapan Anda: {item.answer1_text || "..."}</Badge>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-gray-500 uppercase">Situasi 2</p>
                                        <div className="p-2 border rounded bg-gray-50">
                                            <p className="text-xs text-gray-800 mb-1">{item.question2_text || `Soalan ID ${item.question2_id}`}</p>
                                            <Badge variant="outline" className="bg-white">Jawapan Anda: {item.answer2_text || "..."}</Badge>
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
}

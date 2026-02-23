"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ExamViolationBannerProps {
    violationCount: number;
    onDismiss: () => void;
}

export function ExamViolationBanner({ violationCount, onDismiss }: ExamViolationBannerProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        // Auto-dismiss after 8 seconds
        const t = setTimeout(() => {
            setVisible(false);
            onDismiss();
        }, 8000);
        return () => clearTimeout(t);
    }, [onDismiss]);

    if (!visible) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
            <div className="bg-red-600 text-white px-6 py-3 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 animate-pulse" />
                    <div>
                        <p className="font-bold text-sm">⚠️ Pelanggaran Dikesan — Pertukaran Tab/Tetingkap</p>
                        <p className="text-xs text-red-100">
                            Tindakan ini direkodkan. Pelanggaran: {violationCount}. Sila kekal dalam halaman peperiksaan.
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => { setVisible(false); onDismiss(); }}
                    className="ml-4 p-1 hover:bg-red-500 rounded transition"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnswerOptionProps {
    label: string;
    text: string;
    isSelected: boolean;
    onSelect: () => void;
}

export function AnswerOption({ label, text, isSelected, onSelect }: AnswerOptionProps) {
    return (
        <div
            onClick={onSelect}
            className={cn(
                "relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer group",
                "hover:shadow-md hover:scale-[1.02]",
                isSelected
                    ? "border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30"
            )}
        >
            {/* Radio Circle */}
            <div className={cn(
                "flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all mt-0.5",
                isSelected
                    ? "border-blue-600 bg-blue-600"
                    : "border-gray-300 group-hover:border-blue-400"
            )}>
                {isSelected && <Check className="h-4 w-4 text-white" />}
            </div>

            {/* Option Content */}
            <div className="flex-1">
                <div className="flex items-baseline gap-2">
                    <span className={cn(
                        "font-bold text-lg",
                        isSelected ? "text-blue-700" : "text-gray-700"
                    )}>
                        {label}.
                    </span>
                    <p className={cn(
                        "text-base leading-relaxed",
                        isSelected ? "text-gray-900 font-medium" : "text-gray-700"
                    )}>
                        {text}
                    </p>
                </div>
            </div>

            {/* Selected Badge */}
            {isSelected && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    Dipilih
                </div>
            )}
        </div>
    );
}

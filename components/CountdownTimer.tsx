"use client";

import { useEffect, useState } from "react";
import { Clock, AlertCircle } from "lucide-react";

interface CountdownTimerProps {
    initialMinutes?: number;
    onTimeUp: () => void;
}

export function CountdownTimer({ initialMinutes = 60, onTimeUp }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState(initialMinutes * 60); // in seconds
    const [isWarning, setIsWarning] = useState(false);

    useEffect(() => {
        // Check if there's saved time in localStorage
        const savedTime = localStorage.getItem('quizTimeLeft');
        if (savedTime) {
            setTimeLeft(parseInt(savedTime));
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                const newTime = prev - 1;

                // Save to localStorage
                localStorage.setItem('quizTimeLeft', newTime.toString());

                // Warning when less than 5 minutes
                if (newTime <= 300 && newTime > 0) {
                    setIsWarning(true);
                }

                // Time's up
                if (newTime <= 0) {
                    clearInterval(timer);
                    localStorage.removeItem('quizTimeLeft');
                    onTimeUp();
                    return 0;
                }

                return newTime;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onTimeUp]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const formatTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold transition-colors ${isWarning
                ? 'bg-red-50 text-red-700 border-2 border-red-200 animate-pulse'
                : 'bg-blue-50 text-blue-700 border-2 border-blue-200'
            }`}>
            {isWarning ? (
                <AlertCircle className="h-5 w-5 animate-pulse" />
            ) : (
                <Clock className="h-5 w-5" />
            )}
            <span>{formatTime}</span>
        </div>
    );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Clock, AlertCircle } from "lucide-react";

interface CountdownTimerProps {
    /** ISO timestamp when the exam ends (server-authoritative). Primary source of truth. */
    endsAt?: string;
    /** Fallback: minutes from now. Used only if endsAt is not provided. */
    initialMinutes?: number;
    onTimeUp: () => void;
    quizId?: string;
    /** Called every 30s for heartbeat sync. Returns server seconds_remaining. */
    onHeartbeat?: () => Promise<number | null>;
}

export function CountdownTimer({
    endsAt,
    initialMinutes = 60,
    onTimeUp,
    quizId,
    onHeartbeat,
}: CountdownTimerProps) {
    const computeSecondsLeft = useCallback(() => {
        if (endsAt) {
            return Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
        }
        // Fallback: restore from localStorage (legacy non-server-sync mode)
        const storedQuizId = localStorage.getItem('timerQuizId');
        const savedTime = localStorage.getItem('quizTimeLeft');
        const currentQuizId = quizId || 'default';
        if (savedTime && storedQuizId === currentQuizId) {
            return parseInt(savedTime);
        }
        return initialMinutes * 60;
    }, [endsAt, initialMinutes, quizId]);

    const [timeLeft, setTimeLeft] = useState(() => computeSecondsLeft());
    const [isWarning, setIsWarning] = useState(false);
    const [isCritical, setIsCritical] = useState(false);
    const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
    const timeUpFired = useRef(false);

    // Re-sync when endsAt changes (e.g. on mount after server response)
    useEffect(() => {
        const secs = computeSecondsLeft();
        setTimeLeft(secs);
        setIsWarning(secs <= 300 && secs > 60);
        setIsCritical(secs <= 60 && secs > 0);
    }, [endsAt, computeSecondsLeft]);

    // Main countdown tick
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                const newTime = prev - 1;

                // Legacy localStorage backup (ignored in server-sync mode but harmless)
                if (!endsAt) {
                    localStorage.setItem('quizTimeLeft', newTime.toString());
                    if (!localStorage.getItem('timerQuizId')) {
                        localStorage.setItem('timerQuizId', quizId || 'default');
                    }
                }

                if (newTime <= 300 && newTime > 60) setIsWarning(true);
                if (newTime <= 60 && newTime > 0) { setIsWarning(false); setIsCritical(true); }

                if (newTime <= 0 && !timeUpFired.current) {
                    timeUpFired.current = true;
                    clearInterval(timer);
                    localStorage.removeItem('quizTimeLeft');
                    onTimeUp();
                    return 0;
                }

                return Math.max(0, newTime);
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onTimeUp, endsAt, quizId]);

    // Heartbeat: re-sync with server every 30 seconds
    useEffect(() => {
        if (!onHeartbeat) return;

        heartbeatRef.current = setInterval(async () => {
            try {
                const serverSecsRemaining = await onHeartbeat();
                if (serverSecsRemaining !== null && serverSecsRemaining >= 0) {
                    // Correct drift if >5s off
                    setTimeLeft(prev => {
                        const drift = Math.abs(prev - serverSecsRemaining);
                        if (drift > 5) return serverSecsRemaining;
                        return prev;
                    });

                    if (serverSecsRemaining <= 0 && !timeUpFired.current) {
                        timeUpFired.current = true;
                        onTimeUp();
                    }
                }
            } catch {
                // silent – heartbeat failure shouldn't crash the exam
            }
        }, 30_000);

        return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
    }, [onHeartbeat, onTimeUp]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formatTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold transition-all duration-300 ${isCritical
                ? 'bg-red-600 text-white border-2 border-red-700 animate-pulse scale-110'
                : isWarning
                    ? 'bg-red-50 text-red-700 border-2 border-red-200 animate-pulse'
                    : 'bg-blue-50 text-blue-700 border-2 border-blue-200'
            }`}>
            {(isCritical || isWarning) ? (
                <AlertCircle className="h-5 w-5 animate-pulse" />
            ) : (
                <Clock className="h-5 w-5" />
            )}
            <span>{formatTime}</span>
        </div>
    );
}

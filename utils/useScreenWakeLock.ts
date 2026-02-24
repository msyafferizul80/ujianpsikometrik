import { useEffect, useState, useCallback } from 'react';

export function useScreenWakeLock(isActive: boolean) {
    const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
    const [isSupported, setIsSupported] = useState(true);

    const requestWakeLock = useCallback(async () => {
        if ('wakeLock' in navigator) {
            try {
                const lock = await navigator.wakeLock.request('screen');
                setWakeLock(lock);
                console.log('Screen Wake Lock acquired');

                lock.addEventListener('release', () => {
                    console.log('Screen Wake Lock released');
                    setWakeLock(null);
                });
            } catch (err: any) {
                console.error(`${err.name}, ${err.message}`);
            }
        } else {
            setIsSupported(false);
        }
    }, []);

    const releaseWakeLock = useCallback(async () => {
        if (wakeLock !== null) {
            await wakeLock.release();
            setWakeLock(null);
        }
    }, [wakeLock]);

    useEffect(() => {
        if (isActive && isSupported) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }

        // Re-acquire wake lock when tab is visible again
        const handleVisibilityChange = () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
        };
    }, [isActive, isSupported, requestWakeLock, releaseWakeLock, wakeLock]);

    return { isSupported, wakeLock };
}

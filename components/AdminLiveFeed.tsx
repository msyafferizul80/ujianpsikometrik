"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from '@supabase/supabase-js';
import { Bell, ShoppingCart, User } from 'lucide-react';

export function AdminLiveFeed() {
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Fetch initial recent events
        const fetchInitial = async () => {
            const { data } = await supabase
                .from('transactions')
                .select('*')
                .eq('status', 'paid')
                .order('created_at', { ascending: false })
                .limit(5);

            if (data) {
                setEvents(data.map(t => ({
                    id: t.id,
                    type: 'purchase',
                    message: `Pembelian baru: ${t.plan_id}`,
                    amount: t.amount,
                    time: t.created_at
                })));
            }
        };

        fetchInitial();

        // Subscribe to Realtime
        const channel = supabase
            .channel('admin-feed')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'transactions', filter: 'status=eq.paid' },
                (payload) => {
                    const newEvent = {
                        id: payload.new.id,
                        type: 'purchase',
                        message: `Pembelian TERKINI: ${payload.new.plan_id}`,
                        amount: payload.new.amount,
                        time: new Date().toISOString()
                    };
                    setEvents(prev => [newEvent, ...prev].slice(0, 10));

                    // Browser Notification (Optional)
                    if (Notification.permission === 'granted') {
                        new Notification("Jualan Baru!", { body: `RM ${(payload.new.amount / 100).toFixed(2)} diterima.` });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-blue-500" />
                    Live Feed
                </CardTitle>
                <CardDescription>Aktiviti terkini (Real-time)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {events.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Tiada aktiviti terkini.</p>
                    ) : (
                        events.map((event) => (
                            <div key={event.id} className="flex items-start gap-3 border-b border-gray-100 last:border-0 pb-3 last:pb-0 animate-in slide-in-from-left duration-300">
                                <div className="bg-green-100 p-2 rounded-full mt-1">
                                    <ShoppingCart className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{event.message}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-[10px] h-5">
                                            RM {(event.amount / 100).toFixed(2)}
                                        </Badge>
                                        <span className="text-xs text-gray-400">
                                            {new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

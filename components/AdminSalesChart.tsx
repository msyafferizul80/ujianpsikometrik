"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@supabase/supabase-js';

export function AdminSalesChart() {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            // Fetch paid transactions
            const { data: transactions } = await supabase
                .from('transactions')
                .select('amount, created_at')
                .eq('status', 'paid')
                .order('created_at', { ascending: true });

            if (transactions) {
                // Group by Date
                const grouped = transactions.reduce((acc: any, curr: any) => {
                    const date = new Date(curr.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                    if (!acc[date]) {
                        acc[date] = 0;
                    }
                    acc[date] += (curr.amount || 0) / 100; // Convert cents to RM
                    return acc;
                }, {});

                // Format for Recharts
                const chartData = Object.keys(grouped).map(date => ({
                    name: date,
                    total: grouped[date]
                }));

                // Fill missing days if needed (optional optimization)
                setData(chartData);
            }
        };

        fetchData();
    }, []);

    return (
        <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
                <CardTitle>Trend Jualan (30 Hari)</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `RM${value}`}
                            />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <Tooltip
                                formatter={(value: number) => [`RM ${value.toFixed(2)}`, "Jualan"]}
                                contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#8884d8"
                                fillOpacity={1}
                                fill="url(#colorTotal)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

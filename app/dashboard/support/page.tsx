'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { quizRepository } from '@/utils/supabaseRepository';
import { Loader2, Send, MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';

type Ticket = {
    id: string;
    subject: string;
    message: string;
    status: 'open' | 'replied' | 'closed';
    admin_reply?: string;
    created_at: string;
};

export default function SupportPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    // Import Supabase Client
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const data = await quizRepository.getUserTickets(session.user.id);
                setTickets(data as Ticket[]);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            await quizRepository.createTicket(session.user.id, subject, message);
            setSubject('');
            setMessage('');
            await fetchTickets(); // Refresh list
            alert("Tiket berjaya dihantar! Kami akan balas secepat mungkin.");
        } catch (error) {
            console.error('Error submitting ticket:', error);
            alert("Gagal menghantar tiket. Sila cuba lagi.");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'replied':
                return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Dijawab</Badge>;
            case 'closed':
                return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Ditutup</Badge>;
            default:
                return <Badge className="bg-yellow-500 hover:bg-yellow-600"><AlertCircle className="w-3 h-3 mr-1" /> Baru</Badge>;
        }
    };

    return (
        <DashboardLayout>
            <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Pusat Bantuan
                    </h1>
                    <p className="text-gray-500 mt-2">
                        Ada masalah atau pertanyaan? Kami sedia membantu.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Col: Submission Form */}
                    <Card className="md:col-span-1 shadow-md border-t-4 border-t-blue-500 h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Send className="w-5 h-5 text-blue-600" />
                                Hantar Tiket Baru
                            </CardTitle>
                            <CardDescription>
                                Nyatakan masalah anda dengan jelas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tajuk</label>
                                    <Input
                                        placeholder="Contoh: Pembayaran Gagal"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Mesej</label>
                                    <Textarea
                                        placeholder="Terangkan detail masalah..."
                                        className="min-h-[120px]"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                    Hantar Tiket
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Right Col: History */}
                    <div className="md:col-span-2 space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            Sejarah Tiket Anda
                        </h2>

                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : tickets.length === 0 ? (
                            <Card className="bg-gray-50 border-dashed">
                                <CardContent className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
                                    <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                                    <p>Tiada tiket bantuan dijumpai.</p>
                                    <p className="text-sm">Sebarang pertanyaan anda akan muncul di sini.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {tickets.map((ticket) => (
                                    <Card key={ticket.id} className="transition-all hover:shadow-md border-l-4 border-l-gray-200 data-[status=replied]:border-l-green-500" data-status={ticket.status}>
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                                                    <CardDescription className="mt-1">
                                                        {new Date(ticket.created_at).toLocaleDateString("ms-MY", {
                                                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </CardDescription>
                                                </div>
                                                {getStatusBadge(ticket.status)}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
                                                {ticket.message}
                                            </div>

                                            {ticket.admin_reply && (
                                                <div className="bg-green-50 border border-green-100 p-4 rounded-md mt-4 animate-in slide-in-from-top-2">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-green-700 text-xs font-bold">A</div>
                                                        <span className="text-sm font-semibold text-green-800">Balasan Admin</span>
                                                    </div>
                                                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                                        {ticket.admin_reply}
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { quizRepository } from '@/utils/supabaseRepository';
import { Loader2, MessageSquare, Send, CheckCircle, Clock, Filter, User } from 'lucide-react';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'; // Removed unused import

type Ticket = {
    id: string;
    user_id: string;
    subject: string;
    message: string;
    status: 'open' | 'replied' | 'closed';
    admin_reply?: string;
    created_at: string;
    profiles: {
        full_name: string;
        email: string;
    };
};

export default function AdminSupportPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [filter, setFilter] = useState<'all' | 'open'>('all');

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const data = await quizRepository.getAllTickets();
            // @ts-ignore
            setTickets(data as Ticket[]);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async () => {
        if (!selectedTicket || !reply) return;
        setSending(true);
        try {
            await quizRepository.resolveTicket(selectedTicket.id, reply, 'replied');
            setReply('');
            await fetchTickets(); // Refresh list
            setSelectedTicket(null); // Deselect or update detailed view
            alert("Balasan dihantar!");
        } catch (error) {
            console.error("Error replying:", error);
            alert("Gagal menghantar balasan.");
        } finally {
            setSending(false);
        }
    };

    const handleCloseTicket = async () => {
        if (!selectedTicket) return;
        if (!confirm("Tutup tiket ini?")) return;
        try {
            await quizRepository.resolveTicket(selectedTicket.id, selectedTicket.admin_reply || '', 'closed');
            await fetchTickets();
            setSelectedTicket(null);
        } catch (error) {
            console.error("Error closing ticket:", error);
        }
    };

    const filteredTickets = tickets.filter(t => filter === 'all' ? true : t.status === 'open');

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'replied': return <Badge className="bg-green-500">Dijawab</Badge>;
            case 'closed': return <Badge variant="secondary">Ditutup</Badge>;
            default: return <Badge className="bg-yellow-500">Baru</Badge>;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 h-screen flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Inbox Aduan</h1>
                    <p className="text-gray-500">Uruskan pertanyaan daripada pengguna.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        onClick={() => setFilter('all')}
                    >
                        Semua
                    </Button>
                    <Button
                        variant={filter === 'open' ? 'default' : 'outline'}
                        onClick={() => setFilter('open')}
                        className={filter === 'open' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                    >
                        Belum Dijawab
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* List Column */}
                <Card className="md:col-span-1 flex flex-col overflow-hidden">
                    <CardHeader className="py-4 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" /> Senarai Tiket ({filteredTickets.length})
                        </CardTitle>
                    </CardHeader>
                    <div className="overflow-y-auto flex-1 p-2 space-y-2">
                        {loading ? (
                            <div className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">Tiada tiket.</div>
                        ) : (
                            filteredTickets.map(ticket => (
                                <div
                                    key={ticket.id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className={`p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-300' : 'bg-white'}`}
                                >
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs font-semibold text-gray-500">
                                            {new Date(ticket.created_at).toLocaleDateString()}
                                        </span>
                                        {getStatusBadge(ticket.status)}
                                    </div>
                                    <h4 className="font-semibold text-gray-900 truncate">{ticket.subject}</h4>
                                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1 truncate">
                                        <User className="w-3 h-3" /> {ticket.profiles?.full_name || 'Tanpa Nama'}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Detail & Reply Column */}
                <Card className="md:col-span-2 flex flex-col overflow-hidden bg-gray-50/50">
                    {selectedTicket ? (
                        <>
                            <CardHeader className="bg-white border-b py-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold">{selectedTicket.subject}</h2>
                                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                                            <span className="font-medium text-gray-900 flex items-center gap-1">
                                                <User className="w-4 h-4" /> {selectedTicket.profiles?.full_name}
                                            </span>
                                            <span>&bull;</span>
                                            <span>{selectedTicket.profiles?.email}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedTicket.status !== 'closed' && (
                                            <Button variant="outline" size="sm" onClick={handleCloseTicket} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                Tutup Tiket
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* User Message */}
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                                        <User className="w-6 h-6 text-gray-500" />
                                    </div>
                                    <div className="bg-white p-4 rounded-r-2xl rounded-bl-2xl shadow-sm border max-w-[85%]">
                                        <p className="whitespace-pre-wrap text-gray-800">{selectedTicket.message}</p>
                                        <span className="text-xs text-gray-400 mt-2 block">
                                            {new Date(selectedTicket.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Admin Reply Display */}
                                {selectedTicket.admin_reply && (
                                    <div className="flex gap-4 flex-row-reverse">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                            <span className="font-bold text-blue-700">A</span>
                                        </div>
                                        <div className="bg-blue-600 text-white p-4 rounded-l-2xl rounded-br-2xl shadow-md max-w-[85%]">
                                            <p className="whitespace-pre-wrap">{selectedTicket.admin_reply}</p>
                                            <div className="flex items-center justify-end gap-2 mt-2">
                                                <span className="text-xs text-blue-200">
                                                    {selectedTicket.updated_at ? new Date(selectedTicket.updated_at).toLocaleString() : ''}
                                                </span>
                                                <CheckCircle className="w-3 h-3 text-blue-200" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Reply Input Area */}
                            <div className="p-4 bg-white border-t mt-auto">
                                <div className="flex gap-4">
                                    <Textarea
                                        placeholder="Tulis balasan anda di sini..."
                                        className="min-h-[80px]"
                                        value={reply}
                                        onChange={(e) => setReply(e.target.value)}
                                        disabled={selectedTicket.status === 'closed'}
                                    />
                                    <Button
                                        className="h-auto bg-blue-600 hover:bg-blue-700"
                                        onClick={handleReply}
                                        disabled={sending || !reply || selectedTicket.status === 'closed'}
                                    >
                                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </Button>
                                </div>
                                {selectedTicket.status === 'closed' && (
                                    <p className="text-center text-xs text-gray-500 mt-2">Tiket ini telah ditutup.</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                            <p>Pilih tiket untuk melihat detail.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

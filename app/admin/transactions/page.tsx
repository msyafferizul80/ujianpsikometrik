"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { createClient } from '@supabase/supabase-js';
import { Loader2, FileText, Download, DollarSign } from "lucide-react";

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        try {
            // Join with profiles to get user email/name
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    profiles:user_id (email, full_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            console.error("Error fetching transactions:", error);
            alert("Gagal mengambil rekod transaksi.");
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (transactions.length === 0) return;

        const headers = ["ID", "User Email", "User Name", "Plan ID", "Amount (RM)", "Status", "Bill ID", "Date"];
        const rows = transactions.map(t => [
            t.id,
            t.profiles?.email || "Unknown",
            t.profiles?.full_name || "Unknown",
            t.plan_id,
            (t.amount / 100).toFixed(2),
            t.status,
            t.bill_id,
            new Date(t.created_at).toLocaleString()
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `transactions_export_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <DollarSign className="h-8 w-8 text-green-600" />
                            Rekod Transaksi
                        </h1>
                        <p className="text-gray-600">Lihat semua pembayaran yang masuk.</p>
                    </div>
                    <Button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700">
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Sejarah Pembayaran ({transactions.length})</CardTitle>
                        <CardDescription>
                            Senarai transaksi terkini dari Billplz.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Pelanggan</TableHead>
                                        <TableHead>Pakej</TableHead>
                                        <TableHead>Jumlah</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Tarikh</TableHead>
                                        <TableHead className="text-right">Bill ID</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((txn) => (
                                        <TableRow key={txn.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{txn.profiles?.full_name || "Tanpa Nama"}</span>
                                                    <span className="text-xs text-gray-500">{txn.profiles?.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {txn.plan_id}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-bold">
                                                RM {(txn.amount / 100).toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={
                                                    txn.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                        txn.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                                }>
                                                    {txn.status.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {new Date(txn.created_at).toLocaleDateString()}
                                                <div className="text-xs">
                                                    {new Date(txn.created_at).toLocaleTimeString()}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-xs font-mono text-gray-400">
                                                {txn.bill_id}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {transactions.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                Tiada transaksi dijumpai.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

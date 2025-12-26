import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PLAN_LABELS: Record<string, string> = {
    'cram_24h': 'Pas Pecutan (24 Jam)',
    'exam_ready': 'Pas Exam-Ready (Sampai Lulus)',
    'addon_ai': 'Add-on: AI Coach',
    'test_rm1': 'Pas Uji Lari (Testing Flow)'
};

export function TransactionsList() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<any>(null);

    // ... (useEffect remains same) ...

    // (Render part)
    // ...


    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                // 1. Fetch Profile for Status Check
                const { data: userProfile } = await supabase
                    .from('profiles')
                    .select('subscription_tier, subscription_end_date')
                    .eq('id', session.user.id)
                    .single();
                setProfile(userProfile);

                // 2. Fetch Transactions
                const { data, error } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setTransactions(data || []);
            } catch (err: any) {
                console.error("Error fetching transactions:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, []);

    if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6 text-gray-400" /></div>;

    if (transactions.length === 0) {
        // Fallback: If no transactions but User IS Subscribed (e.g. earlier legacy or bug), show Status Card
        if (profile && profile.subscription_tier !== 'free') {
            return (
                <div className="space-y-4">
                    <div className="p-4 border border-green-200 bg-green-50 rounded-lg flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-green-800">Langganan Aktif</h4>
                            <p className="text-xs text-green-600">
                                Status: <span className="uppercase">{profile.subscription_tier.replace('_', ' ')}</span>
                            </p>
                            {profile.subscription_end_date && (
                                <p className="text-xs text-green-600 mt-1">
                                    Tamat pada: {format(new Date(profile.subscription_end_date), "dd MMM yyyy")}
                                </p>
                            )}
                        </div>
                        <Badge className="bg-green-600">AKTIF</Badge>
                    </div>
                    <p className="text-xs text-center text-gray-400 mt-2">
                        *Rekod transaksi terdahulu mungkin tidak paparkan di sini.
                    </p>
                </div>
            );
        }

        return (
            <div className="text-center p-6 border rounded-lg bg-gray-50">
                <History className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-gray-500">Tiada rekod transaksi dijumpai.</p>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sejarah Pembayaran</CardTitle>
                <CardDescription>Rekod pembelian pas dan langganan anda.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {transactions.map((txn, idx) => (
                        <div key={txn.id || idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col">
                                <span className="font-semibold text-gray-900">
                                    {txn.description || PLAN_LABELS[txn.plan_id] || "Pembelian"}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {format(new Date(txn.created_at), "dd MMM yyyy, HH:mm")}
                                    {txn.bill_id && <span className="ml-2 font-mono bg-gray-100 px-1 rounded">#{txn.bill_id.slice(0, 8)}</span>}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-medium text-gray-900">
                                    RM {(txn.amount / 100).toFixed(2)}
                                </span>
                                <Badge variant={txn.status === 'paid' ? 'default' : (txn.status === 'failed' ? 'destructive' : 'secondary')}>
                                    {txn.status === 'paid' ? 'BERJAYA' : (txn.status === 'pending' ? 'MENUNGGU' : 'GAGAL')}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

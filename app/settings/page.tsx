"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/DashboardLayout";
import { User, Save, Trash2, AlertTriangle, Moon, Sun } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TransactionsList } from "@/components/TransactionsList";

export default function SettingsPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [saved, setSaved] = useState(false);

    // Import Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setEmail(session.user.email || "");

                // Fetch profile from DB
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', session.user.id)
                    .single();

                if (profile?.full_name) {
                    setName(profile.full_name);
                } else {
                    // Fallback to localStorage
                    const savedName = localStorage.getItem('userName');
                    setName(savedName || (session.user.email?.split('@')[0] || "Calon"));
                }
            }
        };

        fetchUser();
    }, []);

    const handleSave = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert("Sila log masuk semula.");
                return;
            }

            // 1. Try Update via RPC (Server Function) - Safest
            let { error } = await supabase.rpc('update_own_profile_name', {
                p_full_name: name
            });

            // 2. Fallback: Direct Table Update (if RPC not found/failed)
            if (error) {
                console.warn("RPC Update failed:", error);
                const { error: directError } = await supabase
                    .from('profiles')
                    .update({
                        full_name: name,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', session.user.id);

                if (directError) {
                    // Alert the user with the specific error for debugging
                    alert(`Update Failed! \nRPC Error: ${error.message || JSON.stringify(error)}\nDirect Error: ${directError.message || JSON.stringify(directError)}`);
                    console.error("Direct update also failed:", directError);
                    throw directError;
                }
            }

            // 3. Keep localStorage for legacy components/offline fallback
            localStorage.setItem('userName', name);
            window.dispatchEvent(new Event('user-profile-update'));

            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error("Error updating profile:", err);
            alert("Gagal menyimpan profil. Sila cuba lagi.");
        }
    };

    const handleClearData = () => {
        if (confirm("AMARAN: Tindakan ini akan memadamkan SEMUA rekod ujian dan perkembangan anda. Adakah anda pasti?")) {
            localStorage.clear();
            alert("Semua data telah dipadam.");
            window.location.href = '/';
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-3xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Tetapan</h1>
                    <p className="text-gray-600">Urus profil dan data aplikasi anda</p>
                </div>

                {/* Profile Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Profil Pengguna
                        </CardTitle>
                        <CardDescription>
                            Maklumat ini akan dipaparkan di Dashboard dan Laporan.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nama Penuh</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nama anda"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Emel</Label>
                            <Input
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Emel anda"
                                disabled // Mock for now
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="bg-gray-50 border-t p-4 flex justify-end">
                        <Button onClick={handleSave} disabled={saved} className="bg-blue-600 hover:bg-blue-700">
                            {saved ? "Disimpan!" : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Simpan Perubahan
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Subscription History */}
                <div className="space-y-4">
                    <TransactionsList />
                </div>

                {/* Appearance (Placeholder) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sun className="h-5 w-5" />
                            Paparan
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900">Tema Gelap (Dark Mode)</p>
                            <p className="text-sm text-gray-500">Tukar tema aplikasi (Belum tersedia)</p>
                        </div>
                        <Button variant="outline" disabled>Aktifkan</Button>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-red-100">
                    <CardHeader className="bg-red-50/50">
                        <CardTitle className="text-red-900 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            Zon Bahaya
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Alert variant="destructive" className="mb-4 bg-white border-red-200">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Padam Semua Data</AlertTitle>
                            <AlertDescription>
                                Tindakan ini tidak boleh dikembalikan. Semua sejarah ujian dan markah akan hilang.
                            </AlertDescription>
                        </Alert>
                        <Button variant="destructive" onClick={handleClearData} className="w-full sm:w-auto">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Padam Semua Data
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default function AdminLogin() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        // Simple hardcoded check for demo purposes
        // In a real app, this should be an API call to a secure endpoint
        if (password === "admin123") {
            // Set a simple cookie or local storage token
            document.cookie = "admin_session=valid; path=/";
            localStorage.setItem("isAdmin", "true");
            router.push("/admin/dashboard");
        } else {
            setError("Katalaluan salah. Sila cuba lagi.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit">
                        <Lock className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-800">Admin Login</CardTitle>
                    <CardDescription>
                        Sila masukkan katalaluan untuk akses panel admin.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Katalaluan"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="text-center text-lg"
                            />
                            {error && (
                                <p className="text-sm text-red-500 text-center font-medium animate-pulse">
                                    {error}
                                </p>
                            )}
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                            Masuk
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

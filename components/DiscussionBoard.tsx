import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Users, Send, MessageSquare, Loader2, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ms } from "date-fns/locale";

interface Discussion {
    id: string;
    question_id: number;
    anonymous_name: string;
    content: string;
    upvotes: number;
    created_at: string;
}

export function DiscussionBoard({ questionId }: { questionId: number }) {
    const [discussions, setDiscussions] = useState<Discussion[]>([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [newComment, setNewComment] = useState("");

    const fetchDiscussions = async () => {
        setLoading(true);
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { data: { session } } = await supabase.auth.getSession();
            const actualToken = session?.access_token || "";

            const headers: Record<string, string> = {};
            if (actualToken) headers['Authorization'] = `Bearer ${actualToken}`;

            const res = await fetch(`/api/discussions?question_id=${questionId}`, { headers });
            const data = await res.json();
            if (Array.isArray(data)) {
                setDiscussions(data);
            }
        } catch (e) {
            console.error("Failed to load discussions", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (questionId) fetchDiscussions();
    }, [questionId]);

    const handlePost = async () => {
        if (!newComment.trim()) return;
        setPosting(true);
        try {
            // Initialize Supabase client
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            // Get session the standard way
            const { data: { session } } = await supabase.auth.getSession();
            const actualToken = session?.access_token || "";

            if (!actualToken) {
                alert("Sila log masuk untuk memberi komen.");
                setPosting(false);
                return;
            }

            const res = await fetch('/api/discussions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${actualToken}`
                },
                body: JSON.stringify({
                    question_id: questionId,
                    content: newComment.trim()
                })
            });

            if (res.ok) {
                setNewComment("");
                fetchDiscussions(); // Refresh
            } else {
                const err = await res.json();
                alert(err.error || "Gagal menghantar komen.");
            }
        } catch (e) {
            console.error("Post error", e);
            alert("Ralat sistem.");
        } finally {
            setPosting(false);
        }
    };

    return (
        <Card className="shadow-sm border-indigo-100 bg-white/50 backdrop-blur-sm mt-6">
            <CardHeader className="bg-indigo-50/50 pb-3 border-b border-indigo-50 rounded-t-xl">
                <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-600" />
                        <span className="text-gray-800">Forum Calon (Tanpa Nama)</span>
                    </div>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
                        {discussions.length} Perbincangan
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                    </div>
                ) : discussions.length === 0 ? (
                    <div className="text-center p-8 border-2 border-dashed border-gray-100 rounded-xl">
                        <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">Jadilah yang pertama berkongsi pendapat atau cara jawab soalan ini!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {discussions.map(d => (
                            <div key={d.id} className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                                            {d.anonymous_name.charAt(6)}
                                        </div>
                                        <span className="text-sm font-bold text-gray-800">{d.anonymous_name.replace('_', ' ')}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: ms })}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{d.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
            <CardFooter className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-xl gap-3">
                <Textarea
                    placeholder="Bincang cara paling pantas jawab soalan ni..."
                    className="min-h-[50px] resize-none text-sm border-gray-200 focus:border-indigo-400"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handlePost();
                        }
                    }}
                />
                <Button
                    className="bg-indigo-600 hover:bg-indigo-700 h-[50px] w-[50px] p-0 shrink-0 rounded-xl shadow-md"
                    onClick={handlePost}
                    disabled={posting || !newComment.trim()}
                >
                    {posting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
            </CardFooter>
        </Card>
    );
}

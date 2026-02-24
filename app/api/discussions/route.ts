import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

function generateAnonymousName() {
    const roles = ["PTD", "Kastam", "Bomba", "Guru", "Jururawat", "Penasihat", "Kerani", "Inspektor", "Pegawai"];
    const attr = ["Mantap", "Gigih", "Bijak", "Pantas", "Sabar", "Cekap"];
    const num = Math.floor(Math.random() * 999) + 1;

    return `Calon_${roles[Math.floor(Math.random() * roles.length)]}_${attr[Math.floor(Math.random() * attr.length)]}${num}`;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const questionId = searchParams.get('question_id');

        if (!questionId) {
            return NextResponse.json({ error: "question_id required" }, { status: 400 });
        }

        const authHeader = req.headers.get('Authorization') || '';
        const token = authHeader.replace('Bearer ', '');

        // Initialize a Supabase client acting on behalf of the user to satisfy RLS
        // Fallback to anon client if no token (which will return 0 rows under current RLS)
        const client = token ? createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        }) : supabaseAdmin;

        const { data: discussions, error } = await client
            .from('discussions')
            .select('*')
            .eq('question_id', parseInt(questionId))
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(discussions || []);

    } catch (err: any) {
        console.error("Fetch Discussions Error:", err);
        return NextResponse.json({ error: "Gagal memuat turun perbincangan." }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { question_id, content } = await req.json();

        // 1. Auth check
        const authHeader = req.headers.get('Authorization') || '';
        const token = authHeader.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: "Sila log masuk untuk memberi komen." }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: "Sesi tamat." }, { status: 401 });
        }

        // Initialize a Supabase client acting on behalf of the user to satisfy RLS
        const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        });

        // For truly anonymous yet trackable per session, we just generate on insert.
        const anonymousName = generateAnonymousName();

        const { data, error } = await authenticatedClient
            .from('discussions')
            .insert({
                question_id: parseInt(question_id),
                user_id: user.id,
                content: content,
                anonymous_name: anonymousName
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);

    } catch (err: any) {
        console.error("Post Discussion Error:", err);
        return NextResponse.json({ error: "Gagal memuat naik komen." }, { status: 500 });
    }
}

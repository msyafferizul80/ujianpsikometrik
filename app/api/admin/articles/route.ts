import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET — list all articles (admin: all; public: use /learn)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');

    const supabase = getAdmin();
    let query = supabase
        .from('articles')
        .select('id, title, slug, excerpt, content, category, tags, author, cover_emoji, reading_time, published, created_at')
        .order('created_at', { ascending: false });

    if (id) query = query.eq('id', id);
    else if (slug) query = query.eq('slug', slug);
    else {
        // List view — only published by default unless overridden
        if (category && category !== 'all') query = query.eq('category', category);
        query = query.eq('published', true);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ articles: data });
}

// POST — create new article
export async function POST(req: Request) {
    const body = await req.json();
    const { title, slug, excerpt, content, category, tags, author, cover_emoji, reading_time, published } = body;

    if (!title || !slug || !content) {
        return NextResponse.json({ error: 'title, slug, content required' }, { status: 400 });
    }

    const supabase = getAdmin();
    const { data, error } = await supabase
        .from('articles')
        .insert({ title, slug, excerpt, content, category, tags, author, cover_emoji, reading_time, published })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') return NextResponse.json({ error: 'Slug sudah wujud. Guna slug lain.' }, { status: 409 });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ article: data });
}

// PUT — update article
export async function PUT(req: Request) {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = getAdmin();
    const { data, error } = await supabase
        .from('articles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ article: data });
}

// DELETE — delete article
export async function DELETE(req: Request) {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = getAdmin();
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

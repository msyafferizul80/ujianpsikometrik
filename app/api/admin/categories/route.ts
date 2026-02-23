import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET — list all categories (uses rpc to bypass PostgREST schema cache)
export async function GET() {
    const { data, error } = await getAdmin().rpc('get_article_categories');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ categories: data || [] });
}

// POST — add new category
export async function POST(req: Request) {
    const { name, emoji, color_class } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Nama kategori diperlukan.' }, { status: 400 });

    const { data, error } = await getAdmin().rpc('insert_article_category', {
        p_name: name.trim(),
        p_emoji: emoji || '📚',
        p_color_class: color_class || 'bg-gray-100 text-gray-600',
    });

    if (error) {
        if (error.code === '23505' || error.message?.includes('unique')) {
            return NextResponse.json({ error: 'Kategori ini sudah wujud.' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // rpc returns array; grab first row
    const category = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ category });
}

// DELETE — remove a category by id
export async function DELETE(req: Request) {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await getAdmin().rpc('delete_article_category', { p_id: id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET — fetch all tag options
export async function GET() {
    const supabase = getAdmin();
    const { data, error } = await supabase
        .from('job_tag_options')
        .select('id, name, created_at')
        .order('name');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tags: data });
}

// POST — create a new tag
export async function POST(req: Request) {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const supabase = getAdmin();
    const { data, error } = await supabase
        .from('job_tag_options')
        .insert({ name: name.trim() })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') return NextResponse.json({ error: 'Tag sudah wujud' }, { status: 409 });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ tag: data });
}

// DELETE — remove a tag by id
export async function DELETE(req: Request) {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const supabase = getAdmin();
    const { error } = await supabase
        .from('job_tag_options')
        .delete()
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

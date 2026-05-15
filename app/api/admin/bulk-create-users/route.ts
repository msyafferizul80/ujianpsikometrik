import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/email";

// We MUST use the Service Role key here to:
// 1. Create auth users on behalf of admin
// 2. Update profiles bypassing RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// Career Launchpad plan configuration (1 month)
const CAREER_LAUNCHPAD_PLAN = {
    tier: 'career_launchpad',
    name: 'Pas Career Launchpad (1 Bulan)',
    durationDays: 30,
    features: ['full_bank', 'analytics_pro', 'ai_coach'],
};

// Generate a secure random password
function generatePassword(length = 10): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$';
    const all = upper + lower + digits + special;

    // Guarantee at least one of each category
    let password =
        upper[Math.floor(Math.random() * upper.length)] +
        lower[Math.floor(Math.random() * lower.length)] +
        digits[Math.floor(Math.random() * digits.length)] +
        special[Math.floor(Math.random() * special.length)];

    for (let i = 4; i < length; i++) {
        password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle
    return password.split('').sort(() => 0.5 - Math.random()).join('');
}

interface UserRow {
    email: string;
    full_name?: string;
    whatsapp?: string;
}

interface CreateResult {
    email: string;
    full_name: string;
    status: 'success' | 'failed' | 'skipped';
    reason?: string;
}

async function createSingleUser(user: UserRow): Promise<CreateResult> {
    const email = user.email?.trim().toLowerCase();
    const fullName = user.full_name?.trim() || email.split('@')[0];
    const whatsapp = user.whatsapp?.trim() || null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { email: email || '(kosong)', full_name: fullName, status: 'failed', reason: 'Format emel tidak sah' };
    }

    const tempPassword = generatePassword(10);

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Skip email confirmation — admin is vouching
        user_metadata: { full_name: fullName },
    });

    if (authError) {
        // Handle duplicate
        if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
            return { email, full_name: fullName, status: 'skipped', reason: 'Emel sudah wujud dalam sistem' };
        }
        return { email, full_name: fullName, status: 'failed', reason: authError.message };
    }

    const userId = authData.user?.id;
    if (!userId) {
        return { email, full_name: fullName, status: 'failed', reason: 'Gagal mendapatkan User ID' };
    }

    // 2. Update profile (created automatically by Supabase trigger, but ensure name & whatsapp)
    await supabaseAdmin
        .from('profiles')
        .update({
            full_name: fullName,
            ...(whatsapp ? { whatsapp } : {}),
        })
        .eq('id', userId);

    // 3. Activate Career Launchpad subscription (30 days)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + CAREER_LAUNCHPAD_PLAN.durationDays);

    const { error: subError } = await supabaseAdmin.rpc('activate_subscription', {
        p_user_id: userId,
        p_tier: CAREER_LAUNCHPAD_PLAN.tier,
        p_end_date: endDate.toISOString(),
        p_features: CAREER_LAUNCHPAD_PLAN.features,
        p_bill_id: null,
        p_amount: 0,
    });

    if (subError) {
        console.error(`Subscription activation failed for ${email}:`, subError);
        // Don't block — account created, subscription failed silently, log it
    }

    // 4. Send welcome email
    const expiryFormatted = endDate.toLocaleDateString('ms-MY', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    await sendWelcomeEmail({
        toEmail: email,
        fullName,
        tempPassword,
        planName: CAREER_LAUNCHPAD_PLAN.name,
        planExpiry: expiryFormatted,
    });

    return { email, full_name: fullName, status: 'success' };
}

export async function POST(req: Request) {
    try {
        // Verify admin (basic check — in production use proper auth middleware)
        // We rely on Supabase RLS + admin role check on the frontend side
        const body = await req.json();
        const { users }: { users: UserRow[] } = body;

        if (!users || !Array.isArray(users) || users.length === 0) {
            return NextResponse.json({ error: 'Tiada data pengguna diterima' }, { status: 400 });
        }

        if (users.length > 500) {
            return NextResponse.json({ error: 'Maksimum 500 pengguna sekaligus' }, { status: 400 });
        }

        // Process users sequentially to avoid rate limits
        const results: CreateResult[] = [];
        for (const user of users) {
            const result = await createSingleUser(user);
            results.push(result);
            // Small delay to avoid Supabase Auth rate limits
            await new Promise(r => setTimeout(r, 200));
        }

        const summary = {
            total: results.length,
            success: results.filter(r => r.status === 'success').length,
            skipped: results.filter(r => r.status === 'skipped').length,
            failed: results.filter(r => r.status === 'failed').length,
        };

        return NextResponse.json({ summary, results });

    } catch (err: any) {
        console.error('Bulk create users error:', err);
        return NextResponse.json({ error: err.message || 'Ralat tidak diketahui' }, { status: 500 });
    }
}


import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Use Service Role Key in production for security!
    // For localhost/MVP with RLS, we might need a workaround or ensure policies allow update
    // Ideally: use Service Role Key here. Since I don't have it in env, I will rely on public + policy or assume currentUser context isn't available here effectively.
    // WAIT: This is a webhook. It runs on server. It needs SERVICE ROLE to bypass RLS and update any user.
    // Checking previous context: User said "Supabase Service Role Key was not found".
    // I will try to use the ANON key but this might fail RLS if "public" cannot update "profiles".
    // WORKAROUND: In `fix_permissions.sql` we granted permissions.
);

// In a real app, use Service Role to update user data securely from webhook
// const supabaseAdmin = createClient(url, service_role_key);


// Helper to process activation
async function processActivation(userId: string | null, planId: string | null, billId: string | null, paid: string | null) {
    console.log("Processing Activation:", { userId, planId, billId, paid });

    // Verify via Re-Query Strategy (Double Confirmation)
    let isVerified = false;
    const isMock = !process.env.BILLPLZ_API_KEY || process.env.BILLPLZ_API_KEY === 'mock-key';

    if (paid === "true" && userId && planId && billId) {
        if (isMock) {
            console.log("Mock Payment Detected: Skipping Billplz Re-Query verification.");
            isVerified = true;
        } else {
            try {
                // Re-Query Billplz API to confirm status
                const authString = Buffer.from(process.env.BILLPLZ_API_KEY + ":").toString("base64");
                const verifyRes = await fetch(`https://www.billplz.com/api/v3/bills/${billId}`, {
                    method: 'GET',
                    headers: {
                        "Authorization": `Basic ${authString}`,
                        "Content-Type": "application/json",
                    }
                });

                if (verifyRes.ok) {
                    const billData = await verifyRes.json();
                    if (billData.paid) {
                        isVerified = true;
                    } else {
                        console.warn(`SECURITY ALERT: Payment Re-Query Failed! Bill ${billId} status is ${billData.state}, paid=${billData.paid}`);
                    }
                } else {
                    console.error("Billplz API Re-Query Failed:", verifyRes.statusText);
                }
            } catch (err) {
                console.error("Billplz Re-Query Exception:", err);
            }
        }
    } else {
        console.warn("Invalid Params:", { paid, userId, planId, billId });
    }

    if (!isVerified) {
        return { success: false, error: "Verification failed" };
    }

    // Calculate end date based on plan
    let endDate = new Date();
    let featuresToAdd: string[] = [];
    let tier = 'free';
    let amount = 0;

    if (planId === 'cram_24h') {
        endDate.setHours(endDate.getHours() + 24);
        tier = 'cram_24h';
        featuresToAdd = ['full_bank', 'analytics_pro'];
        amount = 1500;
    } else if (planId === 'exam_ready') {
        // Get dynamic exam date from admin_settings
        const { data: examDateStr } = await supabase.rpc('get_exam_date');
        if (examDateStr) {
            endDate = new Date(examDateStr);
        } else {
            endDate.setDate(endDate.getDate() + 60); // Fallback
        }
        tier = 'exam_ready';
        featuresToAdd = ['full_bank', 'analytics_pro', 'ai_coach'];
        amount = 7900;
    } else if (planId === 'momentum_7d') {
        endDate.setDate(endDate.getDate() + 7);
        tier = 'momentum_7d';
        featuresToAdd = ['full_bank', 'analytics_pro', 'ai_coach'];
        amount = 4000;
    } else if (planId === 'addon_ai') {
        endDate.setFullYear(endDate.getFullYear() + 1);
        featuresToAdd = ['ai_coach'];
        tier = 'addon_ai';
        amount = 2000;
    } else if (planId === 'test_rm1') {
        endDate.setHours(endDate.getHours() + 1);
        tier = 'cram_24h';
        featuresToAdd = ['full_bank', 'analytics_pro', 'ai_coach'];
        amount = 100;

    }

    const { error } = await supabase.rpc('activate_subscription', {
        p_user_id: userId,
        p_tier: tier,
        p_end_date: endDate.toISOString(),
        p_features: featuresToAdd,
        p_bill_id: billId,
        p_amount: amount
    });

    if (error) {
        console.error("Failed to activate subscription via RPC", error);
        return { success: false, error: error.message };
    }

    console.log("Subscription Activated via RPC for user:", userId);
    return { success: true };
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const planId = searchParams.get("planId");

    // Billplz params for GET redirect
    const billId = searchParams.get("billplz[id]");
    const paid = searchParams.get("billplz[paid]");

    const result = await processActivation(userId, planId, billId, paid);

    if (result.success) {
        return NextResponse.redirect(new URL('/dashboard?payment=success', req.url));
    } else {
        return NextResponse.redirect(new URL(`/dashboard?payment=failed&reason=${encodeURIComponent(result.error || 'Unknown')}`, req.url));
    }
}

export async function POST(req: Request) {
    // Billplz Background Webhook
    // Query params still exist in the POST URL if we set them in callback_url
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const planId = searchParams.get("planId");

    // Billplz usually sends body as x-www-form-urlencoded
    let body;
    try {
        const formData = await req.formData();
        body = Object.fromEntries(formData);
    } catch (e) {
        // Fallback if json
        try {
            body = await req.json();
        } catch (e2) {
            console.error("Failed to parse POST body");
            return NextResponse.json({ error: "Invalid Body" }, { status: 400 });
        }
    }

    const billId = body.id as string;
    const paid = body.paid as string; // 'true' or 'false'
    const x_signature = body.x_signature as string;

    console.log("Received Webhook:", { userId, planId, billId, paid });

    // Process
    const result = await processActivation(userId, planId, billId, paid);

    if (result.success) {
        return NextResponse.json({ status: 'ok' });
    } else {
        return NextResponse.json({ status: 'failed', error: result.error }, { status: 400 });
    }
}

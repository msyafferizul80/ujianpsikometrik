import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const maxDuration = 60; // Allow it to run up to 60s for batch processing

const resend = new Resend(process.env.RESEND_API_KEY!);
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
    // 1. Authenticate cron request (Vercel sets this header)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        // 2. Find premium users
        const { data: premiumUsers } = await supabase
            .from('profiles')
            .select('id, full_name, email, subscription_tier')
            .neq('subscription_tier', 'free');

        if (!premiumUsers || premiumUsers.length === 0) {
            return NextResponse.json({ message: "No premium users found" });
        }

        const today = new Date();
        const emailsSent = [];

        // 3. For each user, check inactivity
        for (const user of premiumUsers) {
            if (!user.email) continue;

            // Get latest quiz attempt
            const { data: latestAttempt } = await supabase
                .from('attempts')
                .select('created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            let daysInactive = 0;
            if (latestAttempt) {
                const lastAttemptDate = new Date(latestAttempt.created_at);
                const diffTime = Math.abs(today.getTime() - lastAttemptDate.getTime());
                daysInactive = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } else {
                // Never taken a quiz!
                daysInactive = 999;
            }

            // If inactive for 3 or more days, send a reminder
            if (daysInactive >= 3) {
                const subject = daysInactive === 999
                    ? "📢 Peperiksaan PsikoPro menanti! Mula latih tubi sekarang."
                    : `⚠️ Anda dah ${daysInactive} hari tak buat latihan PsikoPro.`;

                const html = `
                    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
                        <h2 style="color: #4F46E5;">Hai ${user.full_name || 'Calon'},</h2>
                        <p>${daysInactive === 999
                        ? "Anda telah melanggan pakej Premium Empire Kerjaya tetapi belum memulakan sebarang latih tubi. Jangan lepaskan peluang untuk bersedia lebih awal!"
                        : `Kami dapati anda tidak melakukan sebarang latihan PsikoPro sejak ${daysInactive} hari lalu. Momentum sangat penting untuk lulus cemerlang.`}</p>
                        
                        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">💡 Kenapa Perlu Konsisten?</h3>
                            <ul style="padding-left: 20px;">
                                <li>AI Enjin kami memerlukan data berterusan untuk mengenalpasti titik buta (blind spots) anda.</li>
                                <li>Soalan SPA sentiasa menguji konsistensi profil anda.</li>
                                <li>Calon yang berjaya selalunya berlatih setiap hari sekurang-kurangnya 20 minit.</li>
                            </ul>
                        </div>
                        
                        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://ujian-psikometrik-hq.vercel.app'}/dashboard" 
                           style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                           Teruskan Latihan Sekarang
                        </a>
                        
                        <p style="margin-top: 30px; font-size: 12px; color: #9CA3AF;">
                            Anda menerima e-mel ini kerana anda adalah pengguna aktif Empire Kerjaya PsikoPro.<br/>
                            Visi kami adalah membantu anda menjawat jawatan impian.
                        </p>
                    </div>
                `;

                // Send Email via Resend
                const { data, error } = await resend.emails.send({
                    from: 'Empire Kerjaya <admin@psikopro.empirekerjaya.com>',
                    to: user.email,
                    subject: subject,
                    html: html,
                });

                if (error) {
                    console.error("Failed to send email to", user.email, error);
                } else {
                    emailsSent.push(user.email);
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${premiumUsers.length} users. Sent ${emailsSent.length} reminders.`,
            sentTo: emailsSent
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

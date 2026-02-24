import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface AdminNotificationParams {
    userId: string | null;
    userName?: string | null;
    userEmail?: string | null;
    planId: string | null;
    amount: number;
    billId: string | null;
}

export async function sendAdminNotification({ userId, userName, userEmail, planId, amount, billId }: AdminNotificationParams) {
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
        console.warn("⚠️ ADMIN_EMAIL is not set. Skipping email notification.");
        return;
    }

    if (!process.env.RESEND_API_KEY) {
        console.warn("⚠️ RESEND_API_KEY is not set. Skipping email notification.");
        return;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'PsikoPro Update <onboarding@resend.dev>', // Use default Resend testing domain or configured domain
            to: [adminEmail],
            subject: `💰 New Purchase: ${planId?.toUpperCase()}`,
            html: `
                <h1>New Purchase Detected!</h1>
                <p>A user has successfully purchased a plan.</p>
                <ul>
                    <li><strong>Plan:</strong> ${planId}</li>
                    <li><strong>Amount:</strong> RM ${(amount / 100).toFixed(2)}</li>
                    <li><strong>User Name:</strong> ${userName || 'N/A'}</li>
                    <li><strong>User Email:</strong> ${userEmail || 'N/A'}</li>
                    <li><strong>User ID:</strong> <span style="color: #888;">${userId}</span></li>
                    <li><strong>Bill ID:</strong> ${billId}</li>
                    <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                </ul>
                <p>Check Supabase dashboard for more details.</p>
            `,
        });

        if (error) {
            console.error("❌ Resend Email Failed:", error);
        } else {
            console.log("✅ Admin notification sent:", data);
        }
    } catch (err) {
        console.error("❌ Error sending admin notification:", err);
    }
}

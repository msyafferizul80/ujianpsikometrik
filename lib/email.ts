import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface WelcomeEmailParams {
    toEmail: string;
    fullName: string;
    tempPassword: string;
    planName: string;
    planExpiry: string;
}

export async function sendWelcomeEmail({ toEmail, fullName, tempPassword, planName, planExpiry }: WelcomeEmailParams) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY not set. Skipping welcome email.');
        return { success: false, error: 'No API key' };
    }

    const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://psikopro.my';

    try {
        const { data, error } = await resend.emails.send({
            from: 'PsikoPro <psikopro@resend.ujianpsikometrikonline.com>',
            to: [toEmail],
            subject: '🎉 Akaun PsikoPro Anda Telah Berjaya Didaftarkan!',
            html: `
<!DOCTYPE html>
<html lang="ms">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2563eb 0%,#4f46e5 100%);padding:40px 32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">PsikoPro</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Sistem Latihan Digital Psikometrik</p>
    </div>
    <!-- Body -->
    <div style="padding:40px 32px;">
      <h2 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 8px;">Selamat Datang, ${fullName}! 👋</h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px;">Akaun PsikoPro anda telah berjaya didaftarkan. Anda kini boleh mula berlatih untuk menghadapi peperiksaan psikometrik.</p>

      <!-- Credentials Box -->
      <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:12px;padding:24px;margin-bottom:28px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#3b82f6;text-transform:uppercase;letter-spacing:1px;">Maklumat Log Masuk</p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:14px;width:130px;">📧 Emel:</td>
            <td style="padding:8px 0;color:#1e293b;font-size:14px;font-weight:600;">${toEmail}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:14px;">🔑 Kata Laluan:</td>
            <td style="padding:8px 0;">
              <span style="background:#e0f2fe;color:#0369a1;font-family:monospace;font-size:15px;font-weight:700;padding:4px 10px;border-radius:6px;letter-spacing:1px;">${tempPassword}</span>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">⚠️ Sila tukar kata laluan anda selepas log masuk pertama.</p>
      </div>

      <!-- Plan Badge -->
      <div style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border:1px solid #86efac;border-radius:12px;padding:20px 24px;margin-bottom:28px;display:flex;align-items:center;gap:12px;">
        <div>
          <p style="margin:0 0 2px;font-size:12px;font-weight:600;color:#16a34a;text-transform:uppercase;letter-spacing:1px;">✅ Langganan Aktif</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#15803d;">${planName}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#4ade80;">Sah sehingga: <strong>${planExpiry}</strong></p>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:32px;">
        <a href="${loginUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 40px;border-radius:10px;letter-spacing:0.3px;">Log Masuk Sekarang →</a>
      </div>

      <p style="color:#94a3b8;font-size:13px;line-height:1.6;text-align:center;">Sekiranya anda menghadapi sebarang masalah, sila hubungi kami melalui emel atau WhatsApp.</p>
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} PsikoPro. Hak Cipta Terpelihara.</p>
    </div>
  </div>
</body>
</html>`,
        });

        if (error) {
            console.error('❌ Welcome email failed:', error);
            return { success: false, error };
        }
        console.log('✅ Welcome email sent to:', toEmail, data);
        return { success: true };
    } catch (err) {
        console.error('❌ Welcome email exception:', err);
        return { success: false, error: err };
    }
}

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
            from: 'PsikoPro Update <psikopro@resend.ujianpsikometrikonline.com>',
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

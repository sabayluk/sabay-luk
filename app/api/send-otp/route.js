import { NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function POST(req) {
  try {
    const { email, otpCode, storeName } = await req.json();

    if (!email || !otpCode) {
      return NextResponse.json({ success: false, error: 'Email and OTP code are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Send via Resend Cloud Mail API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Sabay Luk <onboarding@resend.dev>',
        to: [cleanEmail],
        subject: `🔑 លេខកូដផ្ទៀងផ្ទាត់ Sabay Luk: ${otpCode}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 30px auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 14px; background: linear-gradient(135deg, #ff6a00, #ea580c); color: #ffffff; font-size: 24px; font-weight: 900; margin-bottom: 12px;">🛍️</div>
              <h1 style="color: #0f172a; font-size: 22px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">SABAY LUK POS</h1>
              <p style="color: #ea580c; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin: 4px 0 0 0;">Multi-Store Cloud Platform</p>
            </div>

            <div style="background: #fff7ed; border: 1px solid #ffedd5; border-radius: 18px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="font-size: 13px; font-weight: 700; color: #9a3412; margin: 0 0 12px 0;">
                លេខកូដសម្ងាត់ OTP សម្រាប់ចុះឈ្មោះហាង "${storeName || 'ហាងថ្មី'}" គឺ៖
              </p>
              <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #ea580c; font-family: 'Courier New', Courier, monospace; background: #ffffff; padding: 14px; border-radius: 14px; border: 2px dashed #f97316; display: inline-block;">
                ${otpCode}
              </div>
              <p style="font-size: 11px; color: #c2410c; margin: 12px 0 0 0; font-weight: 600;">
                ⏳ លេខកូដនេះមានសុពលភាពរយៈពេល ១០ នាទី (សូមកុំចែករំលែកវាជាមួយអ្នកដទៃ)
              </p>
            </div>

            <div style="font-size: 12px; color: #64748b; line-height: 1.6; margin-bottom: 24px;">
              <p style="margin: 0 0 8px 0;">សួស្តី! ប្រព័ន្ធបានទទួលសំណើចុះឈ្មោះបង្កើតហាងលើវេទិកា <strong>Sabay Luk POS</strong> ជាមួយនឹងអាសយដ្ឋាន Gmail នេះ។</p>
              <p style="margin: 0;">ប្រសិនបើលោកអ្នកមិនបានស្នើសុំលេខកូដនេះទេ សូមកុំចាប់អារម្មណ៍សារនេះ។</p>
            </div>

            <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                © 2026 Sabay Luk Cloud Platform — ប្រព័ន្ធគ្រប់គ្រងការលក់ និងស្តុកទំនិញកម្ពុជា
              </p>
            </div>
          </div>
        `
      })
    });

    const data = await res.json();

    if (!res.ok) {
      // 403 happens if using test domain on non-owner emails
      return NextResponse.json({
        success: false,
        error: data.message || 'Resend error',
        statusCode: res.status,
        needDomainVerification: res.status === 403 && data.message?.includes('verify a domain')
      }, { status: res.status });
    }

    return NextResponse.json({
      success: true,
      messageId: data.id,
      email: cleanEmail
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal error'
    }, { status: 500 });
  }
}

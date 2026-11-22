import { NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// 🛡️ In-Memory Rate Limiting: Max 3 OTP requests per email per 5 minutes 🛡️
const otpRateLimitMap = new Map();

function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(req) {
  try {
    const { email, otpCode, storeName } = await req.json();

    if (!email || !otpCode) {
      return NextResponse.json({ success: false, error: 'Email and OTP code are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 🛡️ Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 });
    }

    // 🛡️ OTP format validation (digits / alphanumeric 4-8 chars)
    if (!/^[a-zA-Z0-9]{4,8}$/.test(String(otpCode).trim())) {
      return NextResponse.json({ success: false, error: 'Invalid OTP format' }, { status: 400 });
    }

    // 🛡️ Rate limit check
    const now = Date.now();
    const rateRecord = otpRateLimitMap.get(cleanEmail) || { count: 0, firstAttempt: now };
    if (now - rateRecord.firstAttempt > 5 * 60 * 1000) {
      rateRecord.count = 0;
      rateRecord.firstAttempt = now;
    }
    if (rateRecord.count >= 3) {
      return NextResponse.json({ 
        success: false, 
        error: 'Too many OTP requests. Please wait 5 minutes before trying again.' 
      }, { status: 429 });
    }
    rateRecord.count += 1;
    otpRateLimitMap.set(cleanEmail, rateRecord);

    const safeStoreName = escapeHtml(storeName || 'ហាងថ្មី');
    const safeOtpCode = escapeHtml(String(otpCode).trim());

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
        subject: `🔑 លេខកូដផ្ទៀងផ្ទាត់ Sabay Luk: ${safeOtpCode}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 30px auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 14px; background: linear-gradient(135deg, #ff6a00, #ea580c); color: #ffffff; font-size: 24px; font-weight: 900; margin-bottom: 12px;">🛍️</div>
              <h1 style="color: #0f172a; font-size: 22px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">SABAY LUK POS</h1>
              <p style="color: #ea580c; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin: 4px 0 0 0;">Multi-Store Cloud Platform</p>
            </div>

            <div style="background: #fff7ed; border: 1px solid #ffedd5; border-radius: 18px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="font-size: 13px; font-weight: 700; color: #9a3412; margin: 0 0 12px 0;">
                លេខកូដសម្ងាត់ OTP សម្រាប់ចុះឈ្មោះហាង "${safeStoreName}" គឺ៖
              </p>
              <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #ea580c; font-family: 'Courier New', Courier, monospace; background: #ffffff; padding: 14px; border-radius: 14px; border: 2px dashed #f97316; display: inline-block;">
                ${safeOtpCode}
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

import { NextResponse } from 'next/server';
import { supabase } from '../../../supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id') || searchParams.get('product');
    const storeSlug = searchParams.get('store') || 'sabay-luk';

    const origin = request.headers.get('x-forwarded-host') 
      ? `https://${request.headers.get('x-forwarded-host')}` 
      : (request.headers.get('host') 
          ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` 
          : 'https://sabayluk.com');

    const redirectUrl = `${origin}${storeSlug && storeSlug !== 'sabay-luk' ? `/store/${storeSlug}` : ''}?product=${productId || ''}`;

    if (!productId) {
      return NextResponse.redirect(redirectUrl);
    }

    // ទាញយកព័ត៌មានទំនិញពី Supabase Database ដើម្បីបង្កើត OpenGraph Image Preview ស្វ័យប្រវត្តិ
    let product = null;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, retail_discount, image_url, description, category')
        .eq('id', productId)
        .maybeSingle();

      if (!error && data) {
        product = data;
      }
    } catch (e) {
      console.warn('Error fetching product for share:', e);
    }

    if (!product) {
      return NextResponse.redirect(redirectUrl);
    }

    const hasDiscount = Boolean(product.retail_discount && parseFloat(product.retail_discount) > 0);
    const finalPrice = hasDiscount 
      ? (parseFloat(product.price) - parseFloat(product.retail_discount)).toFixed(2)
      : parseFloat(product.price || 0).toFixed(2);

    const priceText = hasDiscount
      ? `$${finalPrice} (ចុះពី $${parseFloat(product.price).toFixed(2)})`
      : `$${finalPrice}`;

    const title = `✨ ${product.name} - តម្លៃត្រឹមតែ $${finalPrice}`;
    const description = `🔥 មើលទំនិញនេះ៖ ${product.name} • តម្លៃ៖ ${priceText} • ដឹកជញ្ជូនរហ័ស ២៥ ខេត្ត/ក្រុង! ចុចទីនេះដើម្បីមើលរូបភាពជាក់ស្តែង & កុម្ម៉ង់ទិញភ្លាមៗ។`;
    
    let imageUrl = product.image_url || `${origin}/icon-512x512.png`;
    if (imageUrl.startsWith('/')) {
      imageUrl = `${origin}${imageUrl}`;
    }

    // ពិនិត្យមើលថាតើជា Bot/Crawler (TelegramBot, Facebook, WhatsApp, Twitter) ឬអ្នកប្រើប្រាស់ពិត
    const userAgent = request.headers.get('user-agent') || '';
    const isCrawler = /bot|crawler|spider|crawling|facebookexternalhit|telegrambot|whatsapp|twitterbot|slackbot|linkedinbot/i.test(userAgent);

    const html = `<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="utf-8" />
  <title>${title} - SABAY LUK</title>
  <meta name="description" content="${description}" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- ⭐️ OpenGraph / Facebook / Telegram / WhatsApp Rich Photo Card ⭐️ -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="SABAY LUK STORE" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${product.name}" />
  <meta property="og:url" content="${redirectUrl}" />

  <!-- ⭐️ Twitter Card with Large Image (Telegram គាំទ្រ Tag នេះផងដែរ) ⭐️ -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />

  ${!isCrawler ? `<!-- Instant Browser Redirect for Real Users -->
  <meta http-equiv="refresh" content="0;url=${redirectUrl}" />` : ''}
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0b0f19; color: #fff; margin: 0; padding: 20px;">
  <div style="text-align: center; max-width: 420px; background: #1e293b; padding: 30px; border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    <div style="margin-bottom: 16px;">
      <img src="${imageUrl}" alt="${product.name}" style="width: 100%; max-height: 260px; object-fit: cover; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);" />
    </div>
    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #fff;">${product.name}</h3>
    <p style="color: #ff6a00; font-weight: 900; font-size: 22px; margin: 0 0 16px 0;">${priceText}</p>
    <p style="font-size: 13px; color: #94a3b8; margin: 0 0 20px 0;">កំពុងបញ្ជូនទៅកាន់ទំព័រទំនិញ...</p>
    <a href="${redirectUrl}" style="display: inline-block; background: #ff6a00; color: #fff; padding: 12px 24px; border-radius: 14px; text-decoration: none; font-weight: bold; font-size: 15px; box-shadow: 0 4px 15px rgba(255,106,0,0.4);">
      ចុចចូលមើលទំនិញភ្លាមៗ ↗
    </a>
  </div>
  ${!isCrawler ? `
  <script>
    window.location.replace("${redirectUrl}");
  </script>` : ''}
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
      }
    });
  } catch (err) {
    console.error('Share route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

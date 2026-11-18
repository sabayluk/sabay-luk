// Helper to guarantee invoices open in a standard Web Browser (Google Chrome / Edge)
// and never get trapped in an installed PWA Desktop App.

export function getInvoiceUrl(orderId) {
  if (!orderId) return '/invoice';
  let origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3000';
  
  // Replace localhost with 127.0.0.1 to escape Chrome PWA App origin capturing
  if (origin.includes('localhost:')) {
    origin = origin.replace('localhost:', '127.0.0.1:');
  }
  return `${origin}/invoice?id=${encodeURIComponent(orderId)}`;
}

export async function openInvoiceInBrowser(orderId, e) {
  if (e && e.preventDefault) {
    e.preventDefault();
  }
  if (!orderId) return;

  const targetUrl = getInvoiceUrl(orderId);

  // 1. Try launching real Chrome / Edge browser window via local backend
  try {
    const res = await fetch('/api/open-chrome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl })
    });
    const data = await res.json();
    if (data && data.success) {
      return; // Successfully opened in browser window via Windows OS
    }
  } catch (_) {
    // ignore
  }

  // 2. Fallback: open via window.open using 127.0.0.1 which avoids PWA app hijacking
  if (typeof window !== 'undefined') {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }
}

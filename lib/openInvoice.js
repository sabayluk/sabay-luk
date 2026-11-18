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

export function openInvoiceInBrowser(orderId, e) {
  if (e && e.preventDefault) {
    e.preventDefault();
  }
  if (!orderId) return;

  const targetUrl = getInvoiceUrl(orderId);

  // 1. Try launching real Chrome / Edge browser window via local backend on Windows
  try {
    fetch('/api/open-chrome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl })
    }).catch(() => {});
  } catch (_) {}

  // 2. Open via window.open using 127.0.0.1 (treats as distinct origin from localhost PWA)
  try {
    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  } catch (_) {}
}

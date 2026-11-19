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

  // Open exactly ONE tab in browser
  try {
    if (typeof window !== 'undefined') {
      const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (win) win.focus();
    }
  } catch (_) {
    if (typeof window !== 'undefined') {
      window.location.href = targetUrl;
    }
  }
}

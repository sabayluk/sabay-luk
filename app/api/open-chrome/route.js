import { spawn } from 'child_process';
import fs from 'fs';

export async function POST(request) {
  try {
    // 🛡️ SECURITY GUARD: Block Remote Process Execution 🛡️
    // Disallow external callers from executing local machine binaries or opening URLs
    const host = (request.headers.get('host') || '').toLowerCase();
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    if (process.env.NODE_ENV === 'production' && !isLocalhost) {
      return Response.json({ success: false, error: 'Endpoint restricted to local machine access only' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    let rawUrl = (body.url || 'http://127.0.0.1:3000').trim();

    // 🛡️ URL Sanitization: Strict protocol and character validation against command injection 🛡️
    if (/[\r\n&|;`$<>"]/.test(rawUrl)) {
      return Response.json({ success: false, error: 'Invalid URL characters detected' }, { status: 400 });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return Response.json({ success: false, error: 'Only http and https protocols are permitted' }, { status: 400 });
      }
    } catch {
      return Response.json({ success: false, error: 'Malformed URL' }, { status: 400 });
    }

    let targetUrl = parsedUrl.toString();

    // ⭐️ Anti-PWA Bypass: Replace localhost with 127.0.0.1 on local environment ⭐️
    // Because Chrome binds installed PWAs strictly to "localhost:3000", opening via 127.0.0.1
    // completely breaks out of Chrome's PWA app capture and forces a normal browser tab!
    if (targetUrl.includes('localhost:')) {
      targetUrl = targetUrl.replace('localhost:', '127.0.0.1:');
    }

    // ⭐️ Find exact Google Chrome or Microsoft Edge executable on Windows ⭐️
    const browserCandidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA || ''}\\Google\\Chrome\\Application\\chrome.exe`,
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];

    const browserExe = browserCandidates.find(p => p && fs.existsSync(p));

    if (browserExe) {
      // ⭐️ Direct spawn with --new-window to guarantee a standard browser window with tabs & address bar ⭐️
      const proc = spawn(browserExe, ['--new-window', targetUrl], { detached: true, stdio: 'ignore' });
      proc.unref();
      return Response.json({ success: true, opened: targetUrl, browser: browserExe });
    } else {
      // Fallback to cmd start
      const proc = spawn('cmd', ['/c', 'start', '""', targetUrl], { detached: true, stdio: 'ignore' });
      proc.unref();
      return Response.json({ success: true, opened: targetUrl, fallback: true });
    }
  } catch (err) {
    return Response.json({ success: false, error: err?.message || 'Failed' }, { status: 500 });
  }
}

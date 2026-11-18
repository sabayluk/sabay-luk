import { spawn } from 'child_process';
import fs from 'fs';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    let targetUrl = (body.url || 'http://localhost:3000').trim();

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

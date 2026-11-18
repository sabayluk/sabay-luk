import { spawn } from 'child_process';
import fs from 'fs';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetUrl = (body.url || 'http://localhost:3000').trim();

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
      // ⭐️ Direct spawn of the exact Chrome/Edge browser binary ⭐️
      const proc = spawn(browserExe, [targetUrl], { detached: true, stdio: 'ignore' });
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

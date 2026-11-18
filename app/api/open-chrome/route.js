import { exec } from 'child_process';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetUrl = (body.url || 'http://localhost:3000').trim();

    // ⭐️ Explicitly open Google Chrome Browser tab (Standard Browser Web Tab, not App) ⭐️
    exec(`cmd /c start chrome "${targetUrl}" || cmd /c start msedge "${targetUrl}" || cmd /c start "" "${targetUrl}"`, (err) => {
      if (err) console.warn('Failed to start browser URL:', err);
    });

    return Response.json({ success: true, opened: targetUrl });
  } catch (err) {
    return Response.json({ success: false, error: err?.message || 'Failed' }, { status: 500 });
  }
}

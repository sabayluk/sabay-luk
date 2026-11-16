import { exec } from 'child_process';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetUrl = (body.url || 'http://localhost:3000').trim();

    // Use Windows ShellExecute via cmd /c start "" "url"
    // This communicates with the running Chrome browser without ProcessSingleton profile collision!
    exec(`cmd /c start "" "${targetUrl}"`, (err) => {
      if (err) console.warn('Failed to start URL:', err);
    });

    return Response.json({ success: true, opened: targetUrl });
  } catch (err) {
    return Response.json({ success: false, error: err?.message || 'Failed' }, { status: 500 });
  }
}

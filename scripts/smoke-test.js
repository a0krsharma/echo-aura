// Lightweight smoke test for local dev server
// Usage: node scripts/smoke-test.js

const HOST = process.env.SMOKE_HOST || 'http://localhost:3000';

async function safeFetch(path, opts) {
  const url = `${HOST}${path}`;
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch(e) {}
    return { ok: true, status: res.status, text, json };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

(async () => {
  console.log('Smoke test host:', HOST);

  const checks = [
    { path: '/listen', method: 'GET' },
    { path: '/hls.html', method: 'GET' },
    { path: '/api/agora/token?channel=test&uid=smoke', method: 'GET' },
    { path: '/api/stream/start', method: 'POST', body: JSON.stringify({ channel: 'smoke' }) },
    { path: '/api/stream/stop', method: 'POST', body: JSON.stringify({ resourceId: 'x', sid: 'y' }) },
  ];

  let failed = false;

  for (const c of checks) {
    console.log(`\nChecking ${c.method} ${c.path}`);
    const opts = { method: c.method, headers: { 'Content-Type': 'application/json' } };
    // Optionally include admin key for protected endpoints
    const adminKey = process.env.SMOKE_ADMIN_KEY || process.env.ADMIN_API_KEY || null;
    if (adminKey) opts.headers['x-admin-key'] = adminKey;
    if (c.body) opts.body = c.body;
    const r = await safeFetch(c.path, opts);
    if (!r.ok) {
      console.error('  ERROR:', r.error);
      failed = true;
      continue;
    }
    console.log('  status:', r.status);
    if (r.json) console.log('  json:', JSON.stringify(r.json).slice(0, 500));
    else console.log('  body length:', r.text?.length || 0);

    // Basic expectations
    if (c.path === '/listen' && (r.status < 200 || r.status >= 400)) {
      console.error('  /listen returned unexpected status'); failed = true;
    }
    if (c.path === '/hls.html' && (r.status < 200 || r.status >= 400)) {
      console.error('  /hls.html returned unexpected status'); failed = true;
    }
    if (c.path === '/api/agora/token' && r.status >= 500) {
      console.error('  /api/agora/token returned server error'); failed = true;
    }
    // For start/stop, accept 200/400/401/500 depending on env
    if ((c.path === '/api/stream/start' || c.path === '/api/stream/stop') && ![200,201,400,401,402,403,404,500,502].includes(r.status)) {
      console.error('  Unexpected status for stream endpoint:', r.status); failed = true;
    }
  }

  if (failed) {
    console.error('\nSmoke test: FAILED');
    process.exit(2);
  }

  console.log('\nSmoke test: PASSED');
  process.exit(0);
})();

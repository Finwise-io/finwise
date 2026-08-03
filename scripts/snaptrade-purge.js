#!/usr/bin/env node
// SnapTrade user purge (founder-run — needs the org keys, which stay in YOUR hands).
// Lists registered users by default; deletes only with --delete-all plus a typed YES.
//   1) npx firebase functions:secrets:access SNAPTRADE_CLIENT_ID --project finwise-app-jj
//   2) npx firebase functions:secrets:access SNAPTRADE_CONSUMER_KEY --project finwise-app-jj
//   3) SNAPTRADE_CLIENT_ID=<paste1> SNAPTRADE_CONSUMER_KEY=<paste2> node scripts/snaptrade-purge.js
//      …review the list, then re-run with --delete-all to remove every user.
const readline = require('readline');
const { sign } = require('../functions/signing.js');

const clientId = process.env.SNAPTRADE_CLIENT_ID;
const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;
if (!clientId || !consumerKey) {
  console.error('Set SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY env vars first (see header).');
  process.exit(1);
}

async function call(method, path, extraQuery = {}) {
  // EXACTLY the relay's recipe (functions/snaptrade.js stFetch): the signature covers the
  // SORTED, URL-ENCODED QUERY STRING — not a query object.
  const q = { ...extraQuery, clientId, timestamp: String(Math.floor(Date.now() / 1000)) };
  const queryString = Object.keys(q).sort().map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(q[k])}`).join('&');
  const sig = sign(consumerKey, { content: null, path, query: queryString });
  const res = await fetch(`https://api.snaptrade.com${path}?${queryString}`, { method, headers: { Signature: sig } });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

(async () => {
  const list = await call('GET', '/api/v1/snapTrade/listUsers');
  if (list.status !== 200) { console.error('listUsers failed:', list.status, list.body); process.exit(1); }
  const users = Array.isArray(list.body) ? list.body : [];
  console.log(`${users.length} registered SnapTrade user(s):`);
  users.forEach((u) => console.log('  -', typeof u === 'string' ? u : JSON.stringify(u)));
  if (!process.argv.includes('--delete-all')) {
    console.log('\nDry run (nothing deleted). Re-run with --delete-all to remove every user above.');
    return;
  }
  if (!users.length) { console.log('Nothing to delete.'); return; }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((r) => rl.question(`Type YES to delete all ${users.length} user(s) and their connections: `, r));
  rl.close();
  if (answer.trim() !== 'YES') { console.log('Aborted — nothing deleted.'); return; }
  for (const u of users) {
    const userId = typeof u === 'string' ? u : u.userId ?? u.id;
    const res = await call('DELETE', '/api/v1/snapTrade/deleteUser', { userId });
    console.log(`  delete ${userId}: ${res.status}`, res.status === 200 ? '✓ queued (SnapTrade finishes it async)' : res.body);
  }
  console.log('Done. Re-run without --delete-all in a minute to confirm the list is empty.');
})();

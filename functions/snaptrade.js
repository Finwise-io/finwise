// SnapTrade relay (design v2 §1, approved 2026-07-18). The app NEVER holds SnapTrade keys:
// this function signs every request with the consumerKey (their docs require server-side signing)
// and keeps each user's SnapTrade userSecret in Firestore (server-only — the client cannot read
// the collection; see firestore.rules). The app calls this with its Firebase ID token; we verify
// it and act only for that uid.
//
// Deploy:
//   firebase functions:secrets:set SNAPTRADE_CLIENT_ID      # from the SnapTrade dashboard
//   firebase functions:secrets:set SNAPTRADE_CONSUMER_KEY   # the SECRET key — server only, forever
//   firebase deploy --only functions
//
// Actions (POST { action, ...params }, Authorization: Bearer <Firebase ID token>):
//   status      → { registered, connections: n }           (cheap health/exists check)
//   loginUrl    → { redirectURI }                          (registers the user on first call;
//                  params: broker?, reconnect?, customRedirect — link EXPIRES IN 5 MINUTES)
//   connections → [{ id, brokerage, disabled, ... }]
//   accounts    → [Account]                                (param: connectionId? — else all)
//   holdings    → { positions, optionPositions, balances } (param: accountId)
//   activities  → { activities }                           (params: accountId, startDate?, endDate?, offset?)
//   disconnect  → removes one connection                   (param: connectionId)
//   deleteUser  → removes the SnapTrade user + our secret  (account deletion / offboarding)
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { sortedJson, sign } = require('./signing');

if (!admin.apps.length) admin.initializeApp();
const db = () => admin.firestore();

const BASE = 'https://api.snaptrade.com';
const SECRETS_COLLECTION = 'snaptrade_users';   // {uid}: { userId, userSecret } — server-only


async function stFetch(method, path, { query = {}, body = null } = {}) {
  const clientId = process.env.SNAPTRADE_CLIENT_ID;
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;
  if (!clientId || !consumerKey) throw new Error('SnapTrade secrets not configured');
  const q = { ...query, clientId, timestamp: String(Math.floor(Date.now() / 1000)) };
  const queryString = Object.keys(q).sort().map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(q[k])}`).join('&');
  const doFetch = () => fetch(`${BASE}${path}?${queryString}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Signature: sign(consumerKey, { content: body, path, query: queryString }),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let res = await doFetch();
  if (res.status === 429) {
    // audit fix: honor their rate-limit Reset once (their docs: wait per header + backoff)
    const wait = Math.min(30, Number(res.headers.get('retry-after') ?? res.headers.get('x-ratelimit-reset') ?? 2));
    await new Promise((r) => setTimeout(r, (wait + Math.random()) * 1000));
    res = await doFetch();
  }
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`SnapTrade ${res.status} on ${path}: ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── per-uid SnapTrade identity (created on demand, secret never leaves the server) ────────────
async function getOrRegisterUser(uid) {
  const ref = db().collection(SECRETS_COLLECTION).doc(uid);
  const snap = await ref.get();
  if (snap.exists) return snap.data();
  const userId = `mk-${uid}`;                       // immutable, not an email (their guidance)
  const reg = await stFetch('POST', '/api/v1/snapTrade/registerUser', { body: { userId } });
  const rec = { userId, userSecret: reg.userSecret, createdAt: new Date().toISOString() };
  await ref.set(rec);
  return rec;
}
async function getUser(uid) {
  const snap = await db().collection(SECRETS_COLLECTION).doc(uid).get();
  return snap.exists ? snap.data() : null;
}
const userQuery = (u) => ({ userId: u.userId, userSecret: u.userSecret });

// ── the relay ─────────────────────────────────────────────────────────────────────────────────
exports.snaptradeRelay = onRequest(
  { secrets: ['SNAPTRADE_CLIENT_ID', 'SNAPTRADE_CONSUMER_KEY'], cors: true, region: 'us-central1' },
  async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    // Only a signed-in MoneyKeel user, acting as themselves.
    let uid;
    try {
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      uid = (await admin.auth().verifyIdToken(token)).uid;
    } catch {
      return res.status(401).json({ error: 'Sign in to connect accounts.' });
    }

    const { action, broker, reconnect, customRedirect, connectionId, accountId, startDate, endDate, offset } = req.body || {};
    try {
      switch (action) {
        case 'status': {
          const u = await getUser(uid);
          if (!u) return res.json({ registered: false, connections: 0 });
          const conns = await stFetch('GET', '/api/v1/authorizations', { query: userQuery(u) });
          return res.json({ registered: true, connections: (conns || []).length });
        }
        case 'loginUrl': {
          const u = await getOrRegisterUser(uid);
          const body = {
            connectionType: 'read',                                   // read-only, always
            ...(broker ? { broker } : {}),
            ...(reconnect ? { reconnect } : {}),
            ...(customRedirect ? { customRedirect, immediateRedirect: true } : {}),
          };
          const out = await stFetch('POST', '/api/v1/snapTrade/login', { query: userQuery(u), body });
          return res.json({ redirectURI: out.redirectURI ?? out.loginRedirectURI ?? null });
        }
        case 'brokerages': {
          // reference data — no user context; powers the picker's maintenance/degraded warnings
          const list = await stFetch('GET', '/api/v1/brokerages');
          return res.json((list || []).map((b) => ({
            slug: b.slug ?? b.id, name: b.name, enabled: b.enabled !== false,
            maintenance: !!b.maintenance_mode, degraded: !!b.is_degraded,
          })));
        }
        case 'connections': {
          const u = await getUser(uid);
          if (!u) return res.json([]);
          return res.json(await stFetch('GET', '/api/v1/authorizations', { query: userQuery(u) }));
        }
        case 'accounts': {
          const u = await getUser(uid);
          if (!u) return res.json([]);
          const accounts = await stFetch('GET', '/api/v1/accounts', { query: userQuery(u) });
          return res.json(connectionId ? (accounts || []).filter((a) => a.brokerage_authorization === connectionId) : accounts);
        }
        case 'holdings': {
          if (!accountId) return res.status(400).json({ error: 'accountId required' });
          const u = await getUser(uid);
          if (!u) return res.status(404).json({ error: 'not connected' });
          const [positions, optionPositions, balances] = await Promise.all([
            stFetch('GET', `/api/v1/accounts/${accountId}/positions`, { query: userQuery(u) }),
            stFetch('GET', `/api/v1/accounts/${accountId}/options`, { query: userQuery(u) }).catch(() => []),
            stFetch('GET', `/api/v1/accounts/${accountId}/balances`, { query: userQuery(u) }),
          ]);
          return res.json({ positions, optionPositions, balances });
        }
        case 'activities': {
          if (!accountId) return res.status(400).json({ error: 'accountId required' });
          const u = await getUser(uid);
          if (!u) return res.status(404).json({ error: 'not connected' });
          const query = { ...userQuery(u), ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}), offset: String(offset ?? 0), limit: '1000' };
          const activities = await stFetch('GET', `/api/v1/accounts/${accountId}/activities`, { query });
          return res.json({ activities });
        }
        case 'disconnect': {
          if (!connectionId) return res.status(400).json({ error: 'connectionId required' });
          const u = await getUser(uid);
          if (!u) return res.status(404).json({ error: 'not connected' });
          await stFetch('DELETE', `/api/v1/authorizations/${connectionId}`, { query: userQuery(u) });
          return res.json({ ok: true });
        }
        case 'deleteUser': {
          const u = await getUser(uid);
          if (u) {
            await stFetch('DELETE', '/api/v1/snapTrade/deleteUser', { query: { userId: u.userId } }).catch(() => {});
            await db().collection(SECRETS_COLLECTION).doc(uid).delete();
          }
          return res.json({ ok: true });
        }
        default:
          return res.status(400).json({ error: `unknown action: ${action}` });
      }
    } catch (e) {
      const status = e.status === 429 ? 429 : 502;
      console.error('snaptradeRelay', action, e.message);
      return res.status(status).json({ error: 'The connection service had a problem. Try again in a moment.' });
    }
  }
);

// exported for unit tests (signing must match their spec exactly)
exports._internal = { sortedJson, sign };   // re-exported from ./signing

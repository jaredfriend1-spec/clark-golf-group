// /api/notify.js — Vercel serverless FCM sender for Clark Golf Group.
// Env vars required (Vercel → Project → Settings → Environment Variables):
//   FIREBASE_SERVICE_ACCOUNT       — full JSON of the PROD project service account
//   FIREBASE_SERVICE_ACCOUNT_TEST  — (optional) same for the test project
//   NOTIFY_KEY                     — shared key the app sends (light abuse guard)
const admin = require('firebase-admin');
const apps = {};
function getApp(project){
  if (apps[project]) return apps[project];
  const raw = project === 'test' ? process.env.FIREBASE_SERVICE_ACCOUNT_TEST : process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  const cred = JSON.parse(raw);
  const dbURL = project === 'test'
    ? 'https://clark-group-test-default-rtdb.firebaseio.com'
    : 'https://clark-group-dd15e-default-rtdb.firebaseio.com';
  apps[project] = admin.initializeApp({ credential: admin.credential.cert(cred), databaseURL: dbURL }, 'app_'+project);
  return apps[project];
}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { key, project = 'prod', audience = 'admins', title, body, url = '/', tag } = req.body || {};
    if (!process.env.NOTIFY_KEY || key !== process.env.NOTIFY_KEY) return res.status(401).json({ error: 'bad key' });
    if (!title) return res.status(400).json({ error: 'title required' });
    const app = getApp(project);
    if (!app) return res.status(501).json({ error: 'no service account for ' + project });
    const snap = await app.database().ref('fcmTokens').once('value');
    const all = snap.val() || {};
    const tokens = [];
    Object.values(all).forEach(u => {
      if (!u || !u.tokens) return;
      if (audience === 'admins' && !u.admin) return;
      Object.keys(u.tokens).forEach(t => tokens.push(t));
    });
    if (!tokens.length) return res.status(200).json({ sent: 0, note: 'no tokens for audience' });
    const msg = { data: { title: String(title), body: String(body || ''), url: String(url), tag: String(tag || '') }, tokens };
    const out = await app.messaging().sendEachForMulticast(msg);
    // prune dead tokens
    const dead = [];
    out.responses.forEach((r, i) => { if (!r.success && r.error && /registration-token-not-registered|invalid-argument/.test(String(r.error.code))) dead.push(tokens[i]); });
    if (dead.length) {
      const ups = {};
      Object.entries(all).forEach(([uid, u]) => { if (u && u.tokens) Object.keys(u.tokens).forEach(t => { if (dead.includes(t)) ups['fcmTokens/' + uid + '/tokens/' + t] = null; }); });
      await app.database().ref().update(ups);
    }
    return res.status(200).json({ sent: out.successCount, failed: out.failureCount, pruned: dead.length });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};

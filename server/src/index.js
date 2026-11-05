import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import admin from 'firebase-admin';
import { z } from 'zod';
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}')) });
const db = admin.database(), auth = admin.auth(), app = express();
app.use(helmet()); app.use(cors({ origin: process.env.CLIENT_ORIGIN })); app.use(express.json());
const countries = ['US', 'GB', 'CA', 'DE', 'AU'];
async function user(req, res, next) { try { const t = (req.headers.authorization || '').replace(/^Bearer /, ''); req.user = await auth.verifyIdToken(t); next() } catch { return res.status(401).json({ error: 'Authentication required' }) } }
function adminOnly(req, res, next) { if (req.user.admin !== true) return res.status(403).json({ error: 'Admin access required' }); next() }
app.get('/api/health', (_, r) => r.json({ ok: true }));
app.get('/api/catalog/countries', (_, r) => r.json({ countries }));
app.get('/api/catalog/inventory', (q, r) => { if (!countries.includes(String(q.query.country || '').toUpperCase())) return r.status(400).json({ error: 'Unsupported country' }); r.json({ inventory: [], live: false, message: 'Connect an approved telecom supplier to show live inventory.' }) });
app.get('/api/wallet', user, async (q, r) => { const s = await db.ref('wallets/' + q.user.uid + '/balance').get(); r.json({ balance: Number(s.val() || 0), currency: 'USD' }) });
app.post('/api/orders/rent', user, async (q, r) => { const p = z.object({ sku: z.string().min(2), country: z.enum(countries), duration: z.enum(['TEMPORARY', 'MONTHLY']) }).safeParse(q.body); if (!p.success) return r.status(400).json({ error: 'Invalid order' }); r.status(503).json({ error: 'Supplier not configured; no charge was made.' }) });
app.get('/api/admin/overview', user, adminOnly, async (_, r) => { const [o, u] = await Promise.all([db.ref('orders').get(), db.ref('profiles').get()]); r.json({ orders: o.numChildren(), customers: u.numChildren() }) });
app.listen(process.env.PORT || 3001, () => console.log('API ready'));

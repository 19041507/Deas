import cors from 'cors';
import admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';

admin.initializeApp();
const db = admin.firestore();
const allowCors = cors({ origin: true });

function withCors(req, res, handler) {
  return allowCors(req, res, () => handler(req, res));
}

// API para seu colega chamar e também para o app consultar.
// Endpoint final: https://REGIAO-PROJETO.cloudfunctions.net/openFinance/sync
export const openFinance = onRequest((req, res) => withCors(req, res, async () => {
  const path = req.path.replace(/^\//, '');
  const token = (req.headers.authorization || '').replace('Bearer ', '');

  if (path === 'health') {
    return res.json({ institution: 'Deas Finance', status: 'online' });
  }

  if (path === 'sync' && req.method === 'POST') {
    if (!token || token.length < 6) return res.status(401).json({ error: 'Token de consentimento inválido.' });
    const { userId, requester } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'Informe userId.' });

    const accountSnap = await db.collection('accounts').doc(userId).get();
    const account = accountSnap.exists ? accountSnap.data() : {};
    await db.collection('openFinanceAccessLogs').add({ userId, requester, createdAt: admin.firestore.FieldValue.serverTimestamp() });

    return res.json({
      institution: 'Deas Finance',
      balance: account.balance || 0,
      creditScore: account.creditScore || 0,
      preApproved: account.preApproved || 0
    });
  }

  return res.status(404).json({ error: 'Rota não encontrada. Use /health ou /sync.' });
}));

import { makeRedis } from './_redis.js';

function isValidCode(c) {
  return typeof c === 'string' && /^[A-Za-z0-9\-]{4,40}$/.test(c);
}

export default async function handler(req, res) {
  try {
    const redis = makeRedis();
    const code = (req.query.code || (req.body && req.body.code) || '').trim();
    if (!isValidCode(code)) {
      res.status(400).json({ error: 'Codigo de hogar no valido' });
      return;
    }
    const key = 'household:' + code;

    if (req.method === 'GET') {
      const data = await redis.get(key);
      res.status(200).json(data || { profiles: {}, meds: [] });
      return;
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const state = {
        profiles: body.profiles || {},
        meds: Array.isArray(body.meds) ? body.meds : []
      };
      await redis.set(key, state);
      await redis.sadd('households', code);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Metodo no permitido' });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
}

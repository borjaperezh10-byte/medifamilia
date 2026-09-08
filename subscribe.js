import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

function isValidCode(c) {
  return typeof c === 'string' && /^[A-Za-z0-9\-]{4,40}$/.test(c);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo no permitido' });
    return;
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const code = (body.code || '').trim();
  if (!isValidCode(code) || !body.subscription || !body.subscription.endpoint) {
    res.status(400).json({ error: 'Datos no validos' });
    return;
  }
  // guardamos una suscripcion por endpoint (evita duplicados si se re-suscribe)
  const key = 'subs:' + code;
  const endpoint = body.subscription.endpoint;
  const existing = (await redis.get(key)) || [];
  const filtered = existing.filter(s => s.subscription.endpoint !== endpoint);
  filtered.push({ subscription: body.subscription });
  await redis.set(key, filtered);
  res.status(200).json({ ok: true });
}

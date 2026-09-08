import { makeRedis } from './_redis.js';
import webpush from 'web-push';

const PROFILE_NAMES = { borja: 'Borja', citla: 'Citla', martina: 'Martina', diego: 'Diego' };

function madridNow() {
  const fmt = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map(x => [x.type, x.value]));
  return { hhmm: `${p.hour}:${p.minute}`, dayKey: `${p.year}-${p.month}-${p.day}` };
}

export default async function handler(req, res) {
  try {
    const auth = req.headers['authorization'] || '';
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ error: 'No autorizado' }); return;
    }
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      res.status(500).json({ error: 'CONFIG: faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en Vercel.' }); return;
    }
    webpush.setVapidDetails('mailto:aviso@medifamilia.local', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

    const redis = makeRedis();
    const { hhmm, dayKey } = madridNow();
    const households = (await redis.smembers('households')) || [];
    let sent = 0;

    for (const code of households) {
      const state = await redis.get('household:' + code);
      if (!state || !Array.isArray(state.meds)) continue;
      const subs = (await redis.get('subs:' + code)) || [];
      if (subs.length === 0) continue;

      for (const m of state.meds) {
        for (const d of (m.doses || [])) {
          if (d.day !== dayKey || d.time !== hhmm) continue;
          if (d.alert === 'none') continue;

          const dedupeKey = `sent:${code}:${m.id}:${d.day}:${d.time}`;
          if (await redis.get(dedupeKey)) continue;
          await redis.set(dedupeKey, 1, { ex: 90000 });

          const profile = PROFILE_NAMES[m.profileId] || m.profileId;
          const payload = JSON.stringify({
            title: `Medicacion: ${profile}`,
            body: `${m.name} — ${m.quantity || ''} (${d.time})`,
            alert: d.alert || 'notify'
          });

          for (const s of subs) {
            try { await webpush.sendNotification(s.subscription, payload); sent++; }
            catch (err) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                const key = 'subs:' + code;
                const list = (await redis.get(key)) || [];
                await redis.set(key, list.filter(x => x.subscription.endpoint !== s.subscription.endpoint));
              }
            }
          }
        }
      }
    }
    res.status(200).json({ ok: true, time: hhmm, day: dayKey, households: households.length, sent });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
}

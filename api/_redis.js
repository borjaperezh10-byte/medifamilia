import { Redis } from '@upstash/redis';

// Crea el cliente Redis aceptando los nombres que pone Upstash directo
// (UPSTASH_REDIS_REST_*) o los que a veces pone Vercel (KV_REST_API_*).
export function makeRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error('CONFIG: faltan las variables de Upstash. Define UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN (o KV_REST_API_URL y KV_REST_API_TOKEN) en Vercel y vuelve a desplegar.');
  }
  return new Redis({ url, token });
}

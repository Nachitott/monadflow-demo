/**
 * Shared-state backend. Uses the Upstash Redis REST API (same endpoint
 * Vercel KV exposes) when KV_REST_API_URL + KV_REST_API_TOKEN are set —
 * that is what makes state consistent across Vercel serverless instances.
 * Without env vars (local dev) we fall back to an in-memory store.
 */

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

export const kvEnabled = (): boolean => Boolean(KV_URL && KV_TOKEN);

async function kvCmd<T>(...args: (string | number)[]): Promise<T> {
  const res = await fetch(KV_URL as string, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`kv ${args[0]} failed: ${res.status}`);
  const data = (await res.json()) as { result: T };
  return data.result;
}

export async function kvGetJson<T>(key: string): Promise<T | null> {
  const raw = await kvCmd<string | null>('GET', key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function kvSetJson(key: string, value: unknown): Promise<void> {
  await kvCmd('SET', key, JSON.stringify(value));
}

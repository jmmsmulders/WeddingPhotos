const DEFAULT_MONTHLY_LIMIT_GB = 9.5;

export async function onRequestGet({ env }) {
  if (!env.WEDDING_BUCKET) {
    return json({ error: "R2 bucket binding WEDDING_BUCKET is not configured." }, 500);
  }

  const now = new Date();
  const limitGb = Number(env.MONTHLY_UPLOAD_LIMIT_GB || DEFAULT_MONTHLY_LIMIT_GB);
  const limitBytes = Math.floor(limitGb * 1024 * 1024 * 1024);
  const key = `usage/${now.toISOString().slice(0, 7)}.json`;
  const usageObject = await env.WEDDING_BUCKET.get(key);
  const usage = usageObject ? await usageObject.json() : {};
  const usedBytes = usageObject ? Number(usage.usedBytes || 0) : await calculateMonthUsedBytes(env, now);

  return json({
    month: now.toISOString().slice(0, 7),
    limitBytes,
    usedBytes,
    remainingBytes: Math.max(0, limitBytes - usedBytes),
    percentUsed: limitBytes ? Math.round((usedBytes / limitBytes) * 1000) / 10 : 0
  });
}

async function calculateMonthUsedBytes(env, now) {
  const monthPrefix = now.toISOString().slice(0, 7);
  const originalBytes = await sumPrefixBytes(env, `originals/${monthPrefix}`);
  const previewBytes = await sumPrefixBytes(env, `previews/${monthPrefix}`);
  return originalBytes + previewBytes;
}

async function sumPrefixBytes(env, prefix) {
  let cursor;
  let total = 0;
  do {
    const listed = await env.WEDDING_BUCKET.list({ prefix, cursor, limit: 1000 });
    total += listed.objects.reduce((sum, object) => sum + Number(object.size || 0), 0);
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return total;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

const MAX_BYTES = 120 * 1024 * 1024;
const DEFAULT_MONTHLY_LIMIT_GB = 9.5;

export async function onRequestPost({ request, env }) {
  if (!env.WEDDING_BUCKET) {
    return json({ error: "R2 bucket binding WEDDING_BUCKET is not configured." }, 500);
  }

  const form = await request.formData();
  const file = form.get("file");
  const preview = form.get("preview");
  const hash = clean(form.get("hash"), 128);
  const guestName = clean(form.get("guestName"), 80);
  const originalName = clean(form.get("originalName") || file?.name, 180);

  if (!file || typeof file === "string") return json({ error: "Missing file." }, 400);
  if (preview && typeof preview === "string") return json({ error: "Invalid preview file." }, 400);
  if (!guestName) return json({ error: "Please enter your name before uploading." }, 400);
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return json({ error: "Only photos and videos are accepted." }, 400);
  if (preview && !preview.type.startsWith("image/")) return json({ error: "Compressed previews must be images." }, 400);
  if (file.size > MAX_BYTES) return json({ error: "That file is too large. Please keep uploads under 120 MB." }, 413);

  const digest = hash || await sha256(await file.arrayBuffer());
  const duplicateKey = `hashes/${digest}.json`;
  const existing = await env.WEDDING_BUCKET.get(duplicateKey);

  if (existing) {
    return json({ duplicate: true, hash: digest });
  }

  const now = new Date();
  const uploadBytes = file.size + (preview?.size || 0) + 2048;
  const quota = await checkMonthlyQuota(env, now, uploadBytes);
  if (!quota.allowed) {
    return json({
      error: `The wedding upload limit has been reached for this month. Please send this file to Joep directly.`,
      quota
    }, 429);
  }

  const extension = extensionFor(file.name, file.type);
  const objectKey = `originals/${now.toISOString().slice(0, 10)}/${now.getTime()}-${digest.slice(0, 12)}${extension}`;
  const previewKey = preview ? `previews/${now.toISOString().slice(0, 10)}/${now.getTime()}-${digest.slice(0, 12)}.jpg` : "";
  const metadata = {
    guestName,
    originalName,
    uploadedAt: now.toISOString(),
    hash: digest,
    type: file.type,
    size: String(file.size),
    previewKey
  };

  await env.WEDDING_BUCKET.put(objectKey, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: metadata
  });
  if (preview) {
    await env.WEDDING_BUCKET.put(previewKey, preview.stream(), {
      httpMetadata: { contentType: preview.type },
      customMetadata: { originalKey: objectKey, hash: digest }
    });
  }
  await env.WEDDING_BUCKET.put(duplicateKey, JSON.stringify({ objectKey, ...metadata }), {
    httpMetadata: { contentType: "application/json" }
  });
  await saveMonthlyUsage(env, quota.key, quota.usedBytes + uploadBytes, quota.limitBytes);

  return json({ duplicate: false, key: objectKey, hash: digest });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function clean(value, maxLength) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength);
}

function extensionFor(name, type) {
  const match = String(name || "").toLowerCase().match(/\.[a-z0-9]{2,5}$/);
  if (match) return match[0];
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/png") return ".png";
  if (type === "image/heic") return ".heic";
  if (type === "video/mp4") return ".mp4";
  return "";
}

async function sha256(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function checkMonthlyQuota(env, now, uploadBytes) {
  const limitGb = Number(env.MONTHLY_UPLOAD_LIMIT_GB || DEFAULT_MONTHLY_LIMIT_GB);
  const limitBytes = Math.floor(limitGb * 1024 * 1024 * 1024);
  const key = `usage/${now.toISOString().slice(0, 7)}.json`;
  const usageObject = await env.WEDDING_BUCKET.get(key);
  const usage = usageObject ? await usageObject.json() : {};
  const usedBytes = usageObject ? Number(usage.usedBytes || 0) : await calculateMonthUsedBytes(env, now);
  const nextUsedBytes = usedBytes + uploadBytes;

  return {
    allowed: nextUsedBytes <= limitBytes,
    key,
    limitBytes,
    usedBytes,
    nextUsedBytes,
    remainingBytes: Math.max(0, limitBytes - usedBytes)
  };
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

async function saveMonthlyUsage(env, key, usedBytes, limitBytes) {
  await env.WEDDING_BUCKET.put(key, JSON.stringify({
    usedBytes,
    limitBytes,
    updatedAt: new Date().toISOString()
  }), {
    httpMetadata: { contentType: "application/json" }
  });
}

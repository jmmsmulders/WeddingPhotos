export async function onRequestGet({ env }) {
  if (!env.WEDDING_BUCKET) {
    return json({ error: "R2 bucket binding WEDDING_BUCKET is not configured." }, 500);
  }

  const listed = await env.WEDDING_BUCKET.list({ prefix: "originals/", limit: 60 });
  const sorted = listed.objects.sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());
  const items = await Promise.all(sorted.map(async (object) => {
      const headed = await env.WEDDING_BUCKET.head(object.key);
      const metadata = headed?.customMetadata || {};
      const mediaKey = metadata.previewKey || object.key;
      return {
        key: object.key,
        url: `/api/file?key=${encodeURIComponent(mediaKey)}`,
        originalUrl: `/api/file?key=${encodeURIComponent(object.key)}`,
        guestName: metadata.guestName || "",
        originalName: metadata.originalName || "",
        uploadedAt: metadata.uploadedAt || object.uploaded,
        type: metadata.type || "image/jpeg"
      };
    }));

  return json({ items });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

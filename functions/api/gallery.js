const PAGE_SIZE = 60;

export async function onRequestGet({ request, env }) {
  if (!env.WEDDING_BUCKET) {
    return json({ error: "R2 bucket binding WEDDING_BUCKET is not configured." }, 500);
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const objects = [];
  let cursor;

  do {
    const listed = await env.WEDDING_BUCKET.list({ prefix: "originals/", cursor, limit: 1000 });
    objects.push(...listed.objects);
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  const sorted = objects.sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());
  const start = (page - 1) * PAGE_SIZE;
  const pageObjects = sorted.slice(start, start + PAGE_SIZE);
  const items = await Promise.all(pageObjects.map(async (object) => {
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

  return json({
    items,
    page,
    pageSize: PAGE_SIZE,
    total: sorted.length,
    hasMore: start + PAGE_SIZE < sorted.length
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

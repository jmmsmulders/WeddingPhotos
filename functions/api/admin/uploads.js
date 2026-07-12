export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_KEY) {
    return json({ error: "ADMIN_KEY is not configured." }, 500);
  }

  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return json({ error: "Invalid admin key." }, 401);
  }

  const listed = await env.WEDDING_BUCKET.list({ prefix: "originals/", limit: 1000 });
  const sorted = listed.objects.sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());
  const items = await Promise.all(sorted.map(async (object) => {
      const headed = await env.WEDDING_BUCKET.head(object.key);
      const metadata = headed?.customMetadata || {};
      return {
        key: object.key,
        url: `/api/file?key=${encodeURIComponent(object.key)}`,
        guestName: metadata.guestName || "",
        originalName: metadata.originalName || "",
        uploadedAt: metadata.uploadedAt || object.uploaded,
        size: Number(metadata.size || object.size || 0),
        type: metadata.type || ""
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

export async function onRequestGet({ request, env }) {
  if (!env.WEDDING_BUCKET) {
    return new Response("R2 bucket binding WEDDING_BUCKET is not configured.", { status: 500 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  if (!key.startsWith("originals/") && !key.startsWith("previews/")) return new Response("Not found", { status: 404 });

  const object = await env.WEDDING_BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=3600");
  return new Response(object.body, { headers });
}

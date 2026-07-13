export async function onRequestGet({ request, env }) {
  if (!env.WEDDING_BUCKET) {
    return new Response("R2 bucket binding WEDDING_BUCKET is not configured.", { status: 500 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  if (!key.startsWith("originals/") && !key.startsWith("previews/")) return new Response("Not found", { status: 404 });

  const head = await env.WEDDING_BUCKET.head(key);
  if (!head) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  head.writeHttpMetadata(headers);
  headers.set("etag", head.httpEtag);
  headers.set("cache-control", "public, max-age=3600");
  headers.set("accept-ranges", "bytes");

  const range = parseByteRange(request.headers.get("range"), head.size);
  if (range?.invalid) {
    headers.set("content-range", `bytes */${head.size}`);
    return new Response(null, { status: 416, headers });
  }

  if (range) {
    const object = await env.WEDDING_BUCKET.get(key, {
      range: { offset: range.start, length: range.length }
    });
    if (!object) return new Response("Not found", { status: 404 });

    headers.set("content-length", String(range.length));
    headers.set("content-range", `bytes ${range.start}-${range.end}/${head.size}`);
    return new Response(object.body, { status: 206, headers });
  }

  const object = await env.WEDDING_BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  headers.set("content-length", String(head.size));
  return new Response(object.body, { headers });
}

function parseByteRange(header, size) {
  if (!header) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || size < 1) return { invalid: true };

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return { invalid: true };

  let start;
  let end;

  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isSafeInteger(suffixLength) || suffixLength < 1) return { invalid: true };
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd ? Number(rawEnd) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return { invalid: true };
    if (start > end || start >= size) return { invalid: true };
    end = Math.min(end, size - 1);
  }

  return { start, end, length: end - start + 1 };
}

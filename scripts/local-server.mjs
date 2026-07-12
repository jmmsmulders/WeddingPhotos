import { createServer } from "node:http";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = normalize(join(fileURLToPath(import.meta.url), "..", ".."));
const publicDir = join(root, "public");
const dataDir = join(root, ".local-uploads");
const originalsDir = join(dataDir, "originals");
const previewsDir = join(dataDir, "previews");
const hashesDir = join(dataDir, "hashes");
const adminKey = process.env.ADMIN_KEY || "local-admin";
const monthlyLimitGb = Number(process.env.MONTHLY_UPLOAD_LIMIT_GB || 9.5);
const port = Number(process.env.PORT || 8788);

await Promise.all([mkdir(originalsDir, { recursive: true }), mkdir(previewsDir, { recursive: true }), mkdir(hashesDir, { recursive: true })]);

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (req.method === "POST" && url.pathname === "/api/upload") return upload(req, res);
    if (req.method === "GET" && url.pathname === "/api/gallery") return gallery(res);
    if (req.method === "GET" && url.pathname === "/api/quota") return quota(res);
    if (req.method === "GET" && url.pathname === "/api/admin/uploads") return admin(req, res);
    if (req.method === "GET" && url.pathname === "/api/file") return file(url, res);
    return staticFile(url, res);
  } catch (error) {
    json(res, { error: error.message || "Local server error." }, 500);
  }
}).listen(port, () => {
  console.log(`WeddingPhotos local server: http://localhost:${port}`);
  console.log(`Admin key for local testing: ${adminKey}`);
});

async function upload(req, res) {
  const request = new Request(`http://localhost:${port}/api/upload`, {
    method: "POST",
    headers: req.headers,
    body: req,
    duplex: "half"
  });
  const form = await request.formData();
  const file = form.get("file");
  const preview = form.get("preview");
  const hash = clean(form.get("hash"), 128);
  const guestName = clean(form.get("guestName"), 80);
  const originalName = clean(form.get("originalName") || file?.name, 180);

  if (!file || typeof file === "string") return json(res, { error: "Missing file." }, 400);
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return json(res, { error: "Only photos and videos are accepted." }, 400);

  const duplicatePath = join(hashesDir, `${hash}.json`);
  try {
    await stat(duplicatePath);
    return json(res, { duplicate: true, hash });
  } catch {}

  const now = new Date();
  const uploadBytes = file.size + (preview?.size || 0) + 2048;
  const usage = await readUsage(now);
  if (usage.usedBytes + uploadBytes > usage.limitBytes) {
    return json(res, {
      error: "The wedding upload limit has been reached for this month. Please send this file to Joep directly.",
      quota: usage
    }, 429);
  }

  const safeBase = `${now.getTime()}-${hash.slice(0, 12)}`;
  const objectName = `${safeBase}${extensionFor(file.name, file.type)}`;
  const previewName = preview && typeof preview !== "string" ? `${safeBase}.jpg` : "";
  const objectPath = join(originalsDir, objectName);

  await writeFile(objectPath, Buffer.from(await file.arrayBuffer()));
  if (previewName) {
    await writeFile(join(previewsDir, previewName), Buffer.from(await preview.arrayBuffer()));
  }

  const metadata = { key: objectName, previewKey: previewName, guestName, originalName, uploadedAt: now.toISOString(), hash, type: file.type, size: file.size };
  await writeFile(`${objectPath}.json`, JSON.stringify(metadata, null, 2));
  await writeFile(duplicatePath, JSON.stringify(metadata, null, 2));
  await saveUsage(now, usage.usedBytes + uploadBytes, usage.limitBytes);
  json(res, { duplicate: false, key: objectName, hash });
}

async function gallery(res) {
  const items = await listMetadata();
  json(res, {
    items: items.slice(0, 60).map((item) => ({
      key: item.key,
      url: `/api/file?key=${encodeURIComponent(item.previewKey ? `previews/${item.previewKey}` : `originals/${item.key}`)}`,
      originalUrl: `/api/file?key=${encodeURIComponent(`originals/${item.key}`)}`,
      guestName: item.guestName,
      originalName: item.originalName,
      uploadedAt: item.uploadedAt,
      type: item.type
    }))
  });
}

async function admin(req, res) {
  if (req.headers["x-admin-key"] !== adminKey) return json(res, { error: "Invalid admin key." }, 401);
  const items = await listMetadata();
  json(res, {
    items: items.map((item) => ({
      ...item,
      url: `/api/file?key=${encodeURIComponent(`originals/${item.key}`)}`
    }))
  });
}

async function quota(res) {
  const usage = await readUsage(new Date());
  json(res, {
    month: usage.month,
    limitBytes: usage.limitBytes,
    usedBytes: usage.usedBytes,
    remainingBytes: Math.max(0, usage.limitBytes - usage.usedBytes),
    percentUsed: usage.limitBytes ? Math.round((usage.usedBytes / usage.limitBytes) * 1000) / 10 : 0
  });
}

async function file(url, res) {
  const key = url.searchParams.get("key") || "";
  const parts = key.split("/");
  if (parts.length !== 2 || !["originals", "previews"].includes(parts[0])) return notFound(res);
  const dir = parts[0] === "originals" ? originalsDir : previewsDir;
  const target = join(dir, parts[1]);
  const info = await stat(target).catch(() => null);
  if (!info?.isFile()) return notFound(res);
  res.writeHead(200, { "content-type": contentType(target), "content-length": info.size, "cache-control": "no-store" });
  createReadStream(target).pipe(res);
}

async function staticFile(url, res) {
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = normalize(join(publicDir, pathname));
  if (!target.startsWith(publicDir)) return notFound(res);
  const info = await stat(target).catch(() => null);
  if (!info?.isFile()) return notFound(res);
  res.writeHead(200, { "content-type": contentType(target), "content-length": info.size });
  createReadStream(target).pipe(res);
}

async function listMetadata() {
  const names = await readdir(originalsDir);
  const metadata = await Promise.all(names.filter((name) => name.endsWith(".json")).map(async (name) => JSON.parse(await readFile(join(originalsDir, name), "utf8"))));
  return metadata.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

async function readUsage(now) {
  const month = now.toISOString().slice(0, 7);
  const limitBytes = Math.floor(monthlyLimitGb * 1024 * 1024 * 1024);
  const usagePath = join(dataDir, `usage-${month}.json`);
  const usage = await readFile(usagePath, "utf8").then(JSON.parse).catch(() => ({}));
  return { month, limitBytes, usedBytes: Number(usage.usedBytes || 0) };
}

async function saveUsage(now, usedBytes, limitBytes) {
  const month = now.toISOString().slice(0, 7);
  const usagePath = join(dataDir, `usage-${month}.json`);
  await writeFile(usagePath, JSON.stringify({ usedBytes, limitBytes, updatedAt: new Date().toISOString() }, null, 2));
}

function json(res, body, status = 200) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function notFound(res) {
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

function clean(value, maxLength) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength);
}

function extensionFor(name, type) {
  const match = String(name || "").toLowerCase().match(/\.[a-z0-9]{2,5}$/);
  if (match) return match[0];
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/png") return ".png";
  if (type === "video/mp4") return ".mp4";
  return ".bin";
}

function contentType(pathname) {
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".heic": "image/heic",
    ".mp4": "video/mp4"
  }[extname(pathname).toLowerCase()] || "application/octet-stream";
}

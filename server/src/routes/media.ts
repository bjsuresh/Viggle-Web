import { Router } from "express";

export const media = Router();

const ALLOWED_HOSTS = [/viggle\.ai$/i, /\.amazonaws\.com$/i, /\.cloudfront\.net$/i, /storage\.googleapis\.com$/i];

/**
 * GET /api/media/proxy?url=<signed viggle url>&filename=clip.mp4
 * Streams signed result files to the app with CORS and a download filename so the
 * web build and Capacitor Filesystem downloads both work.
 */
media.get("/proxy", async (req, res) => {
  const raw = String(req.query.url ?? "");
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return void res.status(400).json({ error: { code: "INVALID_REQUEST", message: "url is required" } });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.some((re) => re.test(target.hostname))) {
    return void res.status(400).json({ error: { code: "INVALID_REQUEST", message: "host not allowed" } });
  }
  const upstream = await fetch(target, { headers: { "User-Agent": "viggle-studio-server/1.0" } });
  res.status(upstream.status);
  for (const h of ["content-type", "content-length", "accept-ranges"]) {
    const v = upstream.headers.get(h);
    if (v) res.setHeader(h, v);
  }
  const filename = String(req.query.filename ?? "").replace(/[^\w.-]/g, "_");
  if (filename) res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  if (!upstream.body) return void res.end();
  const reader = upstream.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
});

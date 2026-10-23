import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";

export interface ViggleError {
  error: {
    code: string;
    message: string;
    retryable?: boolean;
    request_id?: string | null;
    details?: Record<string, unknown>;
    remediation?: { action?: string; retry_after_ms?: number | null };
  };
}

type Files = Record<string, Express.Multer.File[]> | Express.Multer.File[] | undefined;

function authHeaders(req?: Request): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${config.viggleApiKey}`,
    "User-Agent": "viggle-studio-server/1.0",
    "X-Viggle-Source": "viggle-studio-mobile",
    "X-Request-Id": (req?.header("x-request-id") as string | undefined) ?? randomUUID(),
  };
  return h;
}

/** Build a multipart body from parsed text fields + multer files. Arrays become repeated fields. */
export function toFormData(body: Record<string, unknown>, files: Files): FormData {
  const fd = new FormData();
  for (const [key, raw] of Object.entries(body ?? {})) {
    if (raw === undefined || raw === null || raw === "") continue;
    const values = Array.isArray(raw) ? raw : [raw];
    for (const v of values) {
      fd.append(key, typeof v === "object" ? JSON.stringify(v) : String(v));
    }
  }
  const list: Express.Multer.File[] = Array.isArray(files)
    ? files
    : Object.values(files ?? {}).flat();
  for (const f of list) {
    const blob = new Blob([f.buffer as unknown as ArrayBuffer], { type: f.mimetype || "application/octet-stream" });
    fd.append(f.fieldname, blob, f.originalname || f.fieldname);
  }
  return fd;
}

export interface ViggleResult {
  status: number;
  body: unknown;
  requestId: string | null;
}

export async function viggleJson(
  path: string,
  init: { method?: string; body?: BodyInit; headers?: Record<string, string>; query?: Record<string, unknown> } = {},
  req?: Request,
): Promise<ViggleResult> {
  const url = new URL(config.viggleBaseUrl + path);
  for (const [k, v] of Object.entries(init.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: { ...authHeaders(req), ...(init.headers ?? {}) },
    body: init.body,
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: { code: "UPSTREAM_NON_JSON", message: text.slice(0, 500), retryable: res.status >= 500 } };
  }
  return { status: res.status, body, requestId: res.headers.get("x-request-id") };
}

/** Forward a Viggle result to the Express response, preserving status and request id. */
export function send(res: Response, r: ViggleResult): void {
  if (r.requestId) res.setHeader("x-request-id", r.requestId);
  res.status(r.status).json(r.body);
}

/** Convenience: run a Viggle call and send it, converting thrown errors into a 502. */
export async function proxy(res: Response, work: () => Promise<ViggleResult>): Promise<void> {
  try {
    send(res, await work());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: { code: "UPSTREAM_UNREACHABLE", message, retryable: true } });
  }
}

/** Stream an upstream response (SSE or binary) directly to the client. */
export async function pipeUpstream(
  path: string,
  res: Response,
  req: Request,
  extraHeaders: Record<string, string> = {},
): Promise<void> {
  const upstream = await fetch(config.viggleBaseUrl + path, {
    headers: { ...authHeaders(req), ...extraHeaders },
    signal: AbortSignal.any([req.socket ? abortOnClose(req) : new AbortController().signal]),
  });
  res.status(upstream.status);
  for (const h of ["content-type", "cache-control", "x-request-id", "content-length", "content-disposition"]) {
    const v = upstream.headers.get(h);
    if (v) res.setHeader(h, v);
  }
  if (!upstream.body) return void res.end();
  const reader = upstream.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
      if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
        (res as unknown as { flush: () => void }).flush();
      }
    }
  } finally {
    res.end();
  }
}

function abortOnClose(req: Request): AbortSignal {
  const ac = new AbortController();
  req.on("close", () => ac.abort());
  return ac.signal;
}

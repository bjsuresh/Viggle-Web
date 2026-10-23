import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { pipeUpstream, proxy, toFormData, viggleJson } from "../viggle.js";

export const renders = Router();

/**
 * POST /api/renders  (Video Remix / Mix)
 *  character: image | image_url | character_id
 *  motion   : motion_video | motion_video_url | motion_id
 *  options  : background_mode(original|solid|transparent), bg_color "R,G,B", model, mode, character_mapping
 */
renders.post(
  "/",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "motion_video", maxCount: 1 },
  ]),
  (req, res) =>
    proxy(res, () => viggleJson("/renders", { method: "POST", body: toFormData(req.body, req.files as never) }, req)),
);

/** GET /api/renders/:id/events  -> Server-Sent Events passthrough */
renders.get("/:id/events", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  const extra: Record<string, string> = { Accept: "text/event-stream" };
  const last = req.header("last-event-id");
  if (last) extra["Last-Event-ID"] = last;
  try {
    await pipeUpstream(`/renders/${encodeURIComponent(req.params.id)}/events`, res, req, extra);
  } catch (err) {
    if (!res.headersSent) res.status(502);
    const payload = JSON.stringify({ error: { code: "UPSTREAM_UNREACHABLE", message: String(err) } });
    res.end("event: failed\ndata: " + payload + "\n\n");
  }
});

/** GET /api/renders/:id/download -> binary passthrough */
renders.get("/:id/download", async (req, res) => {
  try {
    await pipeUpstream(`/renders/${encodeURIComponent(req.params.id)}/download`, res, req);
  } catch (err) {
    if (!res.headersSent) res.status(502).json({ error: { code: "UPSTREAM_UNREACHABLE", message: String(err) } });
    else res.end();
  }
});

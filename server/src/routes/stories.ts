import { Router } from "express";
import { z } from "zod";
import { resolve, basename } from "node:path";
import { config } from "../config.js";
import { planStory, StoryRequest } from "../services/story.js";
import { stitchAvailable, stitchClips } from "../services/stitch.js";

export const stories = Router();

/** POST /api/stories/plan -> { title, logline, style_guide, scenes[], planner } */
stories.post("/plan", async (req, res) => {
  const parsed = StoryRequest.safeParse(req.body);
  if (!parsed.success) {
    return void res.status(400).json({ error: { code: "INVALID_REQUEST", message: parsed.error.issues[0]?.message, details: parsed.error.flatten() } });
  }
  try {
    res.json(await planStory(parsed.data));
  } catch (err) {
    res.status(500).json({ error: { code: "PLANNER_FAILED", message: String(err), retryable: true } });
  }
});

const StitchBody = z.object({
  clips: z.array(z.string().url()).min(1).max(24),
  aspect_ratio: z.enum(["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"]).default("16:9"),
  resolution: z.enum(["720p", "1080p"]).default("720p"),
});

const SIZES: Record<string, Record<string, [number, number]>> = {
  "720p": { "16:9": [1280, 720], "9:16": [720, 1280], "1:1": [720, 720], "4:3": [960, 720], "3:4": [720, 960], "21:9": [1680, 720] },
  "1080p": { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080], "4:3": [1440, 1080], "3:4": [1080, 1440], "21:9": [2520, 1080] },
};

/** GET /api/stories/stitch/capabilities */
stories.get("/stitch/capabilities", (_req, res) => res.json({ available: stitchAvailable() }));

/** POST /api/stories/stitch { clips: [signed urls], aspect_ratio, resolution } -> { id, url, bytes } */
stories.post("/stitch", async (req, res) => {
  const parsed = StitchBody.safeParse(req.body);
  if (!parsed.success) {
    return void res.status(400).json({ error: { code: "INVALID_REQUEST", message: parsed.error.issues[0]?.message } });
  }
  if (!stitchAvailable()) {
    return void res.status(501).json({ error: { code: "STITCH_UNAVAILABLE", message: "ffmpeg is not available on the server" } });
  }
  try {
    const [width, height] = SIZES[parsed.data.resolution][parsed.data.aspect_ratio];
    const r = await stitchClips({ clips: parsed.data.clips, width, height });
    res.json({ id: r.id, bytes: r.bytes, url: `/api/stories/output/${basename(r.file)}` });
  } catch (err) {
    res.status(500).json({ error: { code: "STITCH_FAILED", message: String(err), retryable: true } });
  }
});

/** GET /api/stories/output/:file -> the stitched mp4 */
stories.get("/output/:file", (req, res) => {
  const name = basename(req.params.file);
  if (!/^story-[\w-]+\.mp4$/.test(name)) return void res.status(404).end();
  res.sendFile(resolve(config.outputDir, name), { headers: { "Content-Type": "video/mp4" } });
});

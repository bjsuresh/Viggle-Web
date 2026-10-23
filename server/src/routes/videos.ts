import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { proxy, toFormData, viggleJson } from "../viggle.js";

export const videos = Router();

const videoFields = upload.fields([
  { name: "first_frame_image", maxCount: 1 },
  { name: "last_frame_image", maxCount: 1 },
  { name: "reference_video", maxCount: 1 },
  { name: "reference_image", maxCount: 4 },
  { name: "driving_video", maxCount: 1 },
  { name: "character_image", maxCount: 10 },
]);

/**
 * POST /api/videos
 * One endpoint, five Viggle modes (selected by the fields present):
 *  - text-to-video            : prompt, quality
 *  - first-frame-to-video     : + first_frame_image | first_frame_image_url
 *  - first-last-frame         : + last_frame_image | last_frame_image_url
 *  - reference-to-video       : + reference_video/_url (max 1), reference_image/_url (max 4)
 *  - character animation      : driving_video/_url + character_image/_url(s), enhance_mode, no quality
 * Common: duration_s, resolution, aspect_ratio, seed, watermark, enhance, priority
 */
videos.post("/", videoFields, (req, res) =>
  proxy(res, () => viggleJson("/videos", { method: "POST", body: toFormData(req.body, req.files as never) }, req)),
);

/** POST /api/videos/super-resolution  (video | video_url, watermark) -> vsr_ id */
videos.post("/super-resolution", upload.single("video"), (req, res) =>
  proxy(res, () =>
    viggleJson(
      "/videos/super-resolution",
      { method: "POST", body: toFormData(req.body, req.file ? [req.file] : []) },
      req,
    ),
  ),
);

/** GET /api/videos?status=&cursor=&limit= */
videos.get("/", (req, res) =>
  proxy(res, () =>
    viggleJson("/videos", { query: { status: req.query.status, cursor: req.query.cursor, limit: req.query.limit } }, req),
  ),
);

/** GET /api/videos/:id  (accepts vid_, anim_, render_, vsr_) */
videos.get("/:id", (req, res) => proxy(res, () => viggleJson(`/videos/${encodeURIComponent(req.params.id)}`, {}, req)));

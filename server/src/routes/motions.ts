import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { proxy, toFormData, viggleJson } from "../viggle.js";

export const motions = Router();

function jsonInit(body: unknown) {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

/**
 * POST /api/motions
 *  multipart: motion_video | motion_video_url, name, type(render|glb|all), model, enable_smoothing, target_fps ...
 *  json     : { text, duration_seconds, guidance_scale, smooth, name }  -> text-to-motion (glb)
 */
motions.post("/", upload.single("motion_video"), (req, res) =>
  proxy(res, () => {
    if (req.is("application/json")) return viggleJson("/motions", jsonInit(req.body), req);
    return viggleJson("/motions", { method: "POST", body: toFormData(req.body, req.file ? [req.file] : []) }, req);
  }),
);

/** POST /api/motions/import { template_id, name, model } */
motions.post("/import", (req, res) => proxy(res, () => viggleJson("/motions/import", jsonInit(req.body), req)));

/** GET /api/motions/templates -> official Viggle motion templates (passthrough of GET /v1/motion-templates) */
motions.get("/templates", (req, res) =>
  proxy(res, () => viggleJson("/motion-templates", { query: req.query as Record<string, unknown> }, req)),
);

motions.get("/", (req, res) => proxy(res, () => viggleJson("/motions", {}, req)));
motions.get("/:id", (req, res) => proxy(res, () => viggleJson(`/motions/${encodeURIComponent(req.params.id)}`, {}, req)));
motions.delete("/:id", (req, res) =>
  proxy(res, () => viggleJson(`/motions/${encodeURIComponent(req.params.id)}`, { method: "DELETE" }, req)),
);
/** GET /api/motions/:id/export?download_type=glb|fbx */
motions.get("/:id/export", (req, res) =>
  proxy(res, () =>
    viggleJson(
      `/motions/${encodeURIComponent(req.params.id)}/export`,
      { query: { download_type: req.query.download_type } },
      req,
    ),
  ),
);

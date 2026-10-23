import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { proxy, toFormData, viggleJson } from "../viggle.js";

export const scenes = Router();

function jsonInit(body: unknown) {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

/** POST /api/scenes/pano  sessionId + (prompt[+referenceImageFiles/quality] | panoramaUri | panorama file) */
scenes.post(
  "/pano",
  upload.fields([
    { name: "panorama", maxCount: 1 },
    { name: "referenceImageFiles", maxCount: 8 },
  ]),
  (req, res) =>
    proxy(res, () => {
      const hasFiles = !!req.files && Object.keys(req.files).length > 0;
      if (!hasFiles) return viggleJson("/scenes/pano", jsonInit(normalizeJson(req.body)), req);
      return viggleJson("/scenes/pano", { method: "POST", body: toFormData(req.body, req.files as never) }, req);
    }),
);

scenes.post("/custom-pano", upload.single("panorama"), (req, res) =>
  proxy(res, () =>
    req.file
      ? viggleJson("/scenes/custom-pano", { method: "POST", body: toFormData(req.body, [req.file]) }, req)
      : viggleJson("/scenes/custom-pano", jsonInit(normalizeJson(req.body)), req),
  ),
);

/** POST /api/scenes/generate  { sessionId, referenceBatchIds[], targetPosition|targetC2w, projection, fov, seed } */
scenes.post("/generate", (req, res) => proxy(res, () => viggleJson("/scenes/generate", jsonInit(req.body), req)));
scenes.post("/reconstruct", (req, res) => proxy(res, () => viggleJson("/scenes/reconstruct", jsonInit(req.body), req)));
scenes.get("/:id", (req, res) => proxy(res, () => viggleJson(`/scenes/${encodeURIComponent(req.params.id)}`, {}, req)));

/** Multipart text fields arrive as strings; coerce the JSON-only shapes Viggle expects. */
function normalizeJson(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body };
  if (typeof out.referenceImages === "string") {
    try {
      out.referenceImages = JSON.parse(out.referenceImages);
    } catch {
      out.referenceImages = [out.referenceImages];
    }
  }
  return out;
}

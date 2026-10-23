import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { proxy, toFormData, viggleJson } from "../viggle.js";

export const images = Router();

/** POST /api/images  prompt, model, aspect_ratio, resolution(1K|2K), n(1-6), seed, reference_image[], reference_image_url[] */
images.post("/", upload.array("reference_image", 8), (req, res) =>
  proxy(res, () => viggleJson("/images", { method: "POST", body: toFormData(req.body, req.files as never) }, req)),
);

images.get("/:id", (req, res) => proxy(res, () => viggleJson(`/images/${encodeURIComponent(req.params.id)}`, {}, req)));

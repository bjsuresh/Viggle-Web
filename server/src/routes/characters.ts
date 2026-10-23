import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { proxy, toFormData, viggleJson } from "../viggle.js";

export const characters = Router();

/** POST /api/characters  image | image_url, name, type(render|vsplat|all), model, enhance, vsplat options */
characters.post("/", upload.single("image"), (req, res) =>
  proxy(res, () =>
    viggleJson("/characters", { method: "POST", body: toFormData(req.body, req.file ? [req.file] : []) }, req),
  ),
);
characters.get("/", (req, res) => proxy(res, () => viggleJson("/characters", {}, req)));
characters.get("/:id", (req, res) =>
  proxy(res, () => viggleJson(`/characters/${encodeURIComponent(req.params.id)}`, {}, req)),
);
characters.delete("/:id", (req, res) =>
  proxy(res, () => viggleJson(`/characters/${encodeURIComponent(req.params.id)}`, { method: "DELETE" }, req)),
);
/** GET /api/characters/:id/export?download_type=vsplat */
characters.get("/:id/export", (req, res) =>
  proxy(res, () =>
    viggleJson(
      `/characters/${encodeURIComponent(req.params.id)}/export`,
      { query: { download_type: req.query.download_type } },
      req,
    ),
  ),
);

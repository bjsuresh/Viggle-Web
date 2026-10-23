import multer from "multer";
import { config } from "../config.js";

/** Memory storage: files are forwarded straight to Viggle, never written to disk. */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 24 },
});

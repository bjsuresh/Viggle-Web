import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { appAuth } from "./middleware/auth.js";
import { videos } from "./routes/videos.js";
import { images } from "./routes/images.js";
import { characters } from "./routes/characters.js";
import { motions } from "./routes/motions.js";
import { renders } from "./routes/renders.js";
import { scenes } from "./routes/scenes.js";
import { credits } from "./routes/credits.js";
import { media } from "./routes/media.js";
import { stories } from "./routes/stories.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: config.corsOrigins.includes("*") ? true : config.corsOrigins,
    exposedHeaders: ["x-request-id", "content-disposition"],
  }),
);
app.use(morgan("tiny"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => res.json({ ok: true, viggleKey: !!config.viggleApiKey, storyAi: !!config.anthropicApiKey }));

const api = express.Router();
api.use(appAuth);
api.use("/videos", videos);
api.use("/images", images);
api.use("/characters", characters);
api.use("/motions", motions);
api.use("/renders", renders);
api.use("/scenes", scenes);
api.use("/credits", credits);
api.use("/media", media);
api.use("/stories", stories);
app.use("/api", api);

app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Unknown route" } }));
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const e = err as { code?: string; message?: string; status?: number };
  if (e.code === "LIMIT_FILE_SIZE") {
    return void res.status(413).json({ error: { code: "VIDEO_TOO_LARGE", message: "Upload exceeds the server limit" } });
  }
  console.error("[server]", err);
  res.status(e.status ?? 500).json({ error: { code: "INTERNAL_ERROR", message: e.message ?? "Unexpected error", retryable: true } });
});

app.listen(config.port, () => {
  console.log(`Viggle Studio server listening on http://localhost:${config.port}`);
});

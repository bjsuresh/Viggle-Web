import "dotenv/config";

function num(v: string | undefined, d: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
}

export const config = {
  port: num(process.env.PORT, 3000),
  viggleApiKey: process.env.VIGGLE_API_KEY ?? "",
  viggleBaseUrl: (process.env.VIGGLE_BASE_URL ?? "https://apis.viggle.ai/v1").replace(/\/+$/, ""),
  appAccessToken: process.env.APP_ACCESS_TOKEN ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  corsOrigins: (process.env.CORS_ORIGINS ?? "*").split(",").map((s) => s.trim()).filter(Boolean),
  maxUploadBytes: num(process.env.MAX_UPLOAD_MIB, 100) * 1024 * 1024,
  outputDir: process.env.OUTPUT_DIR ?? "./output",
};

if (!config.viggleApiKey) {
  console.warn("[config] VIGGLE_API_KEY is not set. Every Viggle call will fail with 401.");
}
if (!config.appAccessToken) {
  console.warn("[config] APP_ACCESS_TOKEN is empty. The API is open to anyone who can reach it.");
}

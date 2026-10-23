import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

/** Simple shared-secret gate between the mobile app and this server. */
export function appAuth(req: Request, res: Response, next: NextFunction): void {
  if (!config.appAccessToken) return next();
  const token = req.header("x-app-token") ?? (req.query.token as string | undefined);
  if (token === config.appAccessToken) return next();
  res.status(401).json({
    error: { code: "APP_UNAUTHENTICATED", message: "Missing or invalid x-app-token header", retryable: false },
  });
}

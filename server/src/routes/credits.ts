import { Router } from "express";
import { proxy, viggleJson } from "../viggle.js";

export const credits = Router();
credits.get("/", (req, res) => proxy(res, () => viggleJson("/credits", {}, req)));

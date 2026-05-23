import type { Express, Request } from "express";
import { ENV } from "./env";
import { getProjectById } from "../db.js";
import { verifyToken } from "../services/auth.js";

async function assertStorageAccess(req: Request, key: string): Promise<boolean> {
  const projectMatch = key.match(/^projects\/(\d+)\//);
  if (!projectMatch) return true;

  const token = req.cookies?.cm_auth ?? req.headers.authorization?.replace("Bearer ", "");
  if (!token) return false;

  const payload = await verifyToken(token);
  if (!payload) return false;

  const project = await getProjectById(Number(projectMatch[1]));
  return Boolean(project && project.userId === payload.userId);
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!(await assertStorageAccess(req, key))) {
      res.status(403).send("Forbidden");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "private, no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

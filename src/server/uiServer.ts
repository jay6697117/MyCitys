import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runSimulation } from "../cli/run.js";
import type { Difficulty } from "../domain/types.js";
import { evaluateOutcome } from "../sim/victory.js";
import { GameSession } from "../sim/gameSession.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DIR = join(__dirname, "../../public");

const sessions = new Map<string, GameSession>();

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

const DIFFICULTIES: Difficulty[] = ["newbie", "easy", "standard", "hard"];

function hasErrnoCode(error: unknown, code: string): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  return Reflect.get(error, "code") === code;
}

function json(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function getSessionIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/api\/session\/([^/]+)(?:\/.*)?$/);
  return match ? decodeURIComponent(match[1] ?? "") : null;
}

function getDifficulty(value: unknown): Difficulty {
  if (typeof value === "string" && DIFFICULTIES.includes(value as Difficulty)) {
    return value as Difficulty;
  }
  return "standard";
}

function getNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }
  return parsed as Record<string, unknown>;
}

function heartbeatSessions(): void {
  for (const session of sessions.values()) {
    session.advanceWallClock(1);
  }
}

setInterval(heartbeatSessions, 1000).unref();

const server = createServer(async (req, res) => {
  try {
    const host = req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/", `http://${host}`);
    const method = req.method ?? "GET";

    if (url.pathname === "/api/simulate" && method === "GET") {
      const seed = getNumber(url.searchParams.get("seed"), 42);
      const ticks = getNumber(url.searchParams.get("ticks"), 1);
      const state = runSimulation(seed, ticks);
      const outcome = evaluateOutcome({
        annexedCities: state.annexedCities,
        capitalLost: state.capitalLost,
        cv: state.governance.cv
      });
      json(res, 200, {
        tick: state.tick,
        annexedCities: state.annexedCities,
        cv: state.governance.cv,
        outcome,
        fullState: state
      });
      return;
    }

    if (url.pathname === "/api/session/new" && method === "POST") {
      const body = await readJsonBody(req);
      const seed = getNumber(body.seed, 42);
      const difficulty = getDifficulty(body.difficulty);
      const sessionId = randomUUID();
      const session = new GameSession(seed, difficulty);
      sessions.set(sessionId, session);
      json(res, 200, {
        ok: true,
        sessionId,
        snapshot: session.getSnapshot()
      });
      return;
    }

    if (url.pathname.startsWith("/api/session/")) {
      const sessionId = getSessionIdFromPath(url.pathname);
      if (!sessionId) {
        json(res, 400, { ok: false, message: "无效会话路径。" });
        return;
      }

      const session = sessions.get(sessionId);
      if (!session) {
        json(res, 404, { ok: false, message: "会话不存在或已过期。" });
        return;
      }

      if (url.pathname === `/api/session/${sessionId}` && method === "GET") {
        json(res, 200, { ok: true, sessionId, snapshot: session.getSnapshot() });
        return;
      }

      if (url.pathname === `/api/session/${sessionId}/control` && method === "POST") {
        const body = await readJsonBody(req);
        const responses: string[] = [];

        if (Object.prototype.hasOwnProperty.call(body, "paused")) {
          const result = session.setPaused(Boolean(body.paused));
          responses.push(result.message);
          if (!result.ok) {
            json(res, 400, { ok: false, message: result.message, snapshot: session.getSnapshot() });
            return;
          }
        }

        if (Object.prototype.hasOwnProperty.call(body, "timeScale")) {
          const result = session.setTimeScale(getNumber(body.timeScale, 1));
          responses.push(result.message);
          if (!result.ok) {
            json(res, 400, { ok: false, message: result.message, snapshot: session.getSnapshot() });
            return;
          }
        }

        if (Object.prototype.hasOwnProperty.call(body, "stepTick") && body.stepTick) {
          const result = session.manualAdvanceTick();
          responses.push(result.message);
          if (!result.ok) {
            json(res, 400, { ok: false, message: result.message, snapshot: session.getSnapshot() });
            return;
          }
        }

        json(res, 200, {
          ok: true,
          message: responses.length > 0 ? responses.join("; ") : "控制参数已处理。",
          snapshot: session.getSnapshot()
        });
        return;
      }

      if (url.pathname === `/api/session/${sessionId}/action` && method === "POST") {
        const body = await readJsonBody(req);
        const type = typeof body.type === "string" ? body.type : "";

        if (type === "annex") {
          const lane = typeof body.lane === "string" ? body.lane : "";
          const cityName = typeof body.cityName === "string" ? body.cityName : "";
          if ((lane !== "economic" && lane !== "diplomatic" && lane !== "war") || cityName.length === 0) {
            json(res, 400, { ok: false, message: "吞并参数无效。", snapshot: session.getSnapshot() });
            return;
          }
          const result = session.performAnnexAction(lane, cityName);
          json(res, result.ok ? 200 : 400, {
            ok: result.ok,
            message: result.message,
            snapshot: session.getSnapshot()
          });
          return;
        }

        if (type === "event") {
          const choiceId = typeof body.choiceId === "string" ? body.choiceId : "";
          const result = session.resolveEvent(choiceId);
          json(res, result.ok ? 200 : 400, {
            ok: result.ok,
            message: result.message,
            snapshot: session.getSnapshot()
          });
          return;
        }

        if (type === "save") {
          const result = session.manualSave();
          json(res, result.ok ? 200 : 400, {
            ok: result.ok,
            message: result.message,
            snapshot: session.getSnapshot()
          });
          return;
        }

        json(res, 400, { ok: false, message: "未知动作类型。", snapshot: session.getSnapshot() });
        return;
      }

      json(res, 404, { ok: false, message: "会话接口不存在。" });
      return;
    }

    const reqPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = join(PUBLIC_DIR, reqPath);

    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      const content = await readFile(filePath);
      const ext = extname(filePath);
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "text/plain" });
      res.end(content);
    } catch (error: unknown) {
      if (hasErrnoCode(error, "ENOENT")) {
        res.writeHead(404);
        res.end("Not Found");
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end("Internal Server Error");
  }
});

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
server.listen(PORT, () => {
  console.log(`\n🌆 可玩版城池模拟已启动: http://localhost:${PORT}\n`);
  console.log("按 Ctrl+C 停止服务。\n");
});

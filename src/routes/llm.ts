import express from "express";
import OpenAI from "openai";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import redis from "../helpers/redis";
import {
  get_user_llm_usage,
  init_user_llm_usage,
  get_llm_model_config,
} from "../hasura/llm";

const router = express.Router();

// Configuration
const PUBLIC_KEY_PATH =
  process.env.LLM_PUBLIC_KEY_PATH ||
  path.join(__dirname, "../../public_key.pem");
const JWT_SECRET = process.env.LLM_JWT_SECRET || "eesast_llm_session_secret";
const SESSION_EXPIRY = "12h"; // Session token expiry

// Helper to get global quota dynamically
const getGlobalQuota = async () => {
  try {
    const redisDefault = await redis.get("llm_global_limit");
    if (redisDefault) return parseInt(redisDefault);
  } catch (e) {
    console.error("Failed to get global limit from Redis", e);
  }
  return parseInt(process.env.LLM_DEFAULT_LIMIT || "500000");
};

// Helper to read public key
const getPublicKey = () => {
  try {
    if (process.env.LLM_PUBLIC_KEY) {
      return process.env.LLM_PUBLIC_KEY.replace(/\\n/g, "\n");
    }
    if (fs.existsSync(PUBLIC_KEY_PATH)) {
      return fs.readFileSync(PUBLIC_KEY_PATH, "utf8");
    }
    console.warn("LLM Public Key not found at " + PUBLIC_KEY_PATH);
    return null;
  } catch (e) {
    console.error("Error reading public key:", e);
    return null;
  }
};

// Middleware to verify LLM Session Token
const verifySession = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const studentNo = decoded.sub;
    const iat = decoded.iat;

    // Check if token is invalidated by a newer login
    const minIat = await redis.get(`llm_min_iat:${studentNo}`);
    if (minIat && iat && iat < parseInt(minIat)) {
      return res
        .status(401)
        .json({ error: "Session expired (logged in elsewhere)" });
    }

    // Attach user info to request
    (req as any).llmUser = {
      studentNo: studentNo,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid session token" });
  }
};

// 1. Verify Access Key and Exchange for Session Token
router.post("/verify", async (req, res) => {
  const { accessKey } = req.body;

  if (!accessKey) {
    return res.status(400).json({ error: "Access Key is required" });
  }

  const publicKey = getPublicKey();
  if (!publicKey) {
    return res
      .status(500)
      .json({ error: "Server configuration error (Public Key missing)" });
  }

  try {
    // Verify RSA signature
    const decoded = jwt.verify(accessKey, publicKey, {
      algorithms: ["RS256"],
    }) as any;
    const { sub: studentNo, jti, exp, email, quota } = decoded;

    // Check Replay Attack (Redis)
    const isUsed = await redis.get(`used_key:${jti}`);
    if (isUsed) {
      return res
        .status(403)
        .json({ error: "Access Key has already been used" });
    }

    // Mark Key as used (expire at key's expiration time)
    const ttl = exp ? exp - Math.floor(Date.now() / 1000) : 3600 * 24 * 7;
    if (ttl > 0) {
      await redis.set(`used_key:${jti}`, "1", "EX", ttl);
    }

    // Invalidate old sessions
    const now = Math.floor(Date.now() / 1000);
    await redis.set(`llm_min_iat:${studentNo}`, now);

    // Initialize Quota if not exists
    // We use '0' in DB to indicate "Follow Global Limit"

    // Try to get from DB first
    let dbUser = await get_user_llm_usage(studentNo);

    if (!dbUser) {
      // Create in DB if not exists
      // If Access Key has specific quota, use it. Otherwise use 0 (Global).
      const limit = quota || 0;
      dbUser = await init_user_llm_usage(studentNo, limit);
    }

    // Sync DB limit to Redis
    // If DB limit is > 0, it's a custom limit -> Set Redis key
    // If DB limit is 0, it's global -> Delete Redis key (so /chat falls back to global)
    const dbLimit = dbUser?.token_limit || 0;

    if (dbLimit > 0) {
      await redis.set(`llm_limit:${studentNo}`, dbLimit);
    } else {
      // If quota was provided in Access Key but DB update failed/race condition, use quota
      if (quota && quota > 0) {
        await redis.set(`llm_limit:${studentNo}`, quota);
      } else {
        await redis.del(`llm_limit:${studentNo}`);
      }
    }

    // Sync usage from DB to Redis if Redis is empty (e.g. after restart)
    const currentUsage = await redis.get(`llm_usage:${studentNo}`);
    if (!currentUsage && dbUser) {
      await redis.set(`llm_usage:${studentNo}`, dbUser.total_tokens_used);
    }

    // Issue Session Token
    const sessionToken = jwt.sign(
      {
        sub: studentNo,
        email: email,
        role: "student",
        type: "llm_session",
      },
      JWT_SECRET,
      { expiresIn: SESSION_EXPIRY },
    );

    res.json({
      token: sessionToken,
      user: {
        studentNo,
        email,
      },
    });
  } catch (err) {
    console.error("Access Key Verification Failed:", err);
    return res.status(403).json({ error: "Invalid or expired Access Key" });
  }
});

// 2. Chat Endpoint
router.post("/chat", verifySession, async (req, res) => {
  const { messages, model } = req.body;
  const user = (req as any).llmUser;
  const studentNo = user.studentNo;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  // Concurrency Control
  const activeKey = `llm_active:${studentNo}`;
  const activeCount = await redis.incr(activeKey);

  // Set TTL for safety (e.g., 5 mins)
  if (activeCount === 1) {
    await redis.expire(activeKey, 300);
  }

  if (activeCount > 1) {
    await redis.decr(activeKey);
    return res.status(429).json({
      error:
        "Too many concurrent requests. Please wait for the previous request to finish.",
    });
  }

  // Rate Limiting (e.g., 1 request per 3 seconds)
  const rateLimitKey = `llm_rate_limit:${studentNo}`;
  const isRateLimited = await redis.get(rateLimitKey);
  if (isRateLimited) {
    await redis.decr(activeKey); // Release concurrency lock
    return res
      .status(429)
      .json({ error: "Request too frequent. Please wait a few seconds." });
  }
  // Set rate limit flag for 3 seconds
  await redis.set(rateLimitKey, "1", "EX", 3);

  // Setup AbortController for client disconnect
  const controller = new AbortController();
  req.on("close", () => {
    controller.abort();
  });

  try {
    // Quota Check
    const usageKey = `llm_usage:${studentNo}`;
    const limitKey = `llm_limit:${studentNo}`;

    const [usageStr, limitStr] = await Promise.all([
      redis.get(usageKey),
      redis.get(limitKey),
    ]);

    const usage = parseInt(usageStr || "0");
    let limit = parseInt(limitStr || "0");

    // If no custom limit in Redis, use Global Limit
    if (!limitStr) {
      limit = await getGlobalQuota();
    }

    if (usage >= limit) {
      throw new Error("QUOTA_EXCEEDED");
    }

    let apiKey = process.env.LLM_API_KEY;
    let baseURL = process.env.LLM_API_URL;

    // Special configuration for Qwen3-Max
    if (model === "Qwen3-Max") {
      if (process.env.QWEN_API_KEY) {
        apiKey = process.env.QWEN_API_KEY;
        if (process.env.QWEN_API_URL) {
          baseURL = process.env.QWEN_API_URL;
        }
      }
    }

    if (!apiKey) {
      // Mock response for testing
      res.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Mock: Backend configured but no API Key.",
            },
          },
        ],
      });
      return;
    }

    // Check for deep thinking configuration
    let enableThinking = false;
    try {
      const modelConfig = await get_llm_model_config(model || "gpt-3.5-turbo");
      if (modelConfig && modelConfig.deepthinkingmodel === "enabled") {
        enableThinking = true;
      }
    } catch (e) {
      console.warn("Failed to fetch model config:", e);
    }

    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });

    const requestOptions: any = {
      model: model || "gpt-3.5-turbo",
      messages: messages,
      stream: true,
      stream_options: { include_usage: true }, // Request usage stats
    };

    if (enableThinking) {
      requestOptions.enable_thinking = true;
    }

    const stream = (await client.chat.completions.create(requestOptions, {
      signal: controller.signal,
    })) as any;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let totalTokens = 0;

    for await (const chunk of stream) {
      // Handle usage if provided in the last chunk
      if (chunk.usage) {
        totalTokens = chunk.usage.total_tokens;
      }

      const delta = chunk.choices[0]?.delta;
      if (delta) {
        const reasoning = delta.reasoning_content;
        const content = delta.content;
        if (content || reasoning) {
          res.write(`data: ${JSON.stringify({ content, reasoning })}\n\n`);
        }
      }
    }

    // If usage was not returned by stream (some providers don't), estimate it
    if (totalTokens === 0) {
      // Rough estimation: 1 char ~= 0.5 token (very rough, but better than nothing)
      // In production, use a tokenizer library like tiktoken
      const inputLen = messages.reduce(
        (acc: number, m: any) => acc + (m.content?.length || 0),
        0,
      );
      // We don't have the full output content easily here without buffering,
      // but we can assume some average or just count input for now if stream usage is missing.
      // For now, let's just count input * 1.5 as a fallback
      totalTokens = Math.ceil(inputLen * 0.7);
    }

    // Update Usage in Redis
    if (totalTokens > 0) {
      await redis.incrby(usageKey, totalTokens);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    if (error.message === "QUOTA_EXCEEDED") {
      res
        .status(402)
        .json({ error: "Token quota exceeded. Please contact admin." });
    } else {
      console.error("LLM API Error:", error);
      // If headers sent, we can't send JSON error, just end stream
      if (res.headersSent) {
        res.write(
          `data: ${JSON.stringify({ error: "Internal Server Error" })}\n\n`,
        );
        res.end();
      } else {
        res.status(500).json({
          error: "Failed to fetch from LLM provider",
          details: error.message,
        });
      }
    }
  } finally {
    // Release Concurrency Lock
    await redis.decr(activeKey);
  }
});

export default router;
